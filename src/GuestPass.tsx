import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { CheckCircle, Calendar, Key, XCircle, Loader2, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';


const GuestPass: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<any>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'redeemed' | 'expired' | 'error'>('loading');
    const [statusMessage, setStatusMessage] = useState('');
    const [redemptions, setRedemptions] = useState<any[]>([]);

    useEffect(() => {
        const encodedData = searchParams.get('d');
        if (encodedData && id) {
            try {
                // Normalize URL-safe base64 back to standard base64
                let base64 = encodedData
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                // Re-pad if needed
                while (base64.length % 4) base64 += '=';

                const parsed = JSON.parse(atob(base64));
                setData(parsed);
                checkStatus(id);
            } catch (e) {
                console.error("Failed to parse voucher data", e);
                // Fall back to fetching data from the sheet
                checkStatus(id, true);
            }
        } else if (id) {
            // No encoded data? Fetch from sheet!
            checkStatus(id, true);
        } else {
            setStatus('error');
        }
    }, [searchParams, id]);

    const checkStatus = async (voucherId: string, needsHydration: boolean = false) => {
        try {
            const response = await fetch(`/api/get-data?sheet=Vouchers`);
            if (!response.ok) throw new Error('Failed to fetch vouchers');
            const items = await response.json();

            if (!Array.isArray(items)) {
                setStatus('error');
                setStatusMessage('System error: Invalid data format');
                return;
            }

            const currentItem = items.find((i: any) =>
                String(i.voucher_code || i.date || i.voucherCode || i.code || i.id || i.voucherid || '').toUpperCase() === voucherId.toUpperCase()
            );

            if (!currentItem) {
                setStatus('error');
                setStatusMessage('Voucher not found in system.');
            } else {
                // Support both Supabase (snake_case) and Sheet (camelCase/descriptive)
                const checkOut = currentItem.check_out || currentItem.checkout || currentItem.checkOut || '';
                const guestName = currentItem.guest_name || currentItem.description || currentItem.guestName || '';
                const roomNumber = currentItem.room_number || currentItem.amount || currentItem.roomNumber || '';
                const servicesRaw = currentItem.service_type || currentItem.services || '';
                const imageUrl = currentItem.image_url || currentItem.imageurl || currentItem.imageUrl || '';
                const createdAt = currentItem.created_at || '';

                const today = new Date().toISOString().split('T')[0];
                let isExpired = false;
                if (checkOut) {
                    const expiry = String(checkOut).split('T')[0];
                    if (expiry < today) isExpired = true;
                }

                if (isExpired) {
                    setStatus('expired');
                } else {
                    setStatus('valid');
                }

                if (needsHydration) {
                    setData({
                        guestName,
                        roomNumber,
                        checkOut: checkOut || '',
                        services: servicesRaw ? String(servicesRaw).split(/,\s*/g) : [],
                        imageUrl,
                        created_at: createdAt
                    });
                }
            }
        } catch (e) {
            console.error('GuestPass: Failed to fetch voucher data', e);
            setStatus('error');
            setStatusMessage('Could not connect to server. Please try again.');
        }
    };

    // Background polling for real-time status updates (both Vouchers and Redemptions)
    useEffect(() => {
        if (!id || status === 'loading') return;

        const pollInterval = setInterval(async () => {
            try {
                // 1. Poll Vouchers for expiry
                const vRes = await fetch(`/api/get-data?sheet=Vouchers`);
                if (vRes.ok) {
                    const items = await vRes.json();
                    if (Array.isArray(items)) {
                        const currentItem = items.find((i: any) =>
                            String(i.voucher_code || i.date || i.voucherCode || i.code || i.id || i.voucherid || '').toUpperCase() === id.toUpperCase()
                        );
                        if (currentItem) {
                            const today = new Date().toISOString().split('T')[0];
                            const checkOut = currentItem.check_out || currentItem.checkout || currentItem.checkOut || '';
                            if (checkOut && String(checkOut).split('T')[0] < today) {
                                if (status !== 'expired') setStatus('expired');
                            }
                        }
                    }
                }

                // 2. Poll Redemptions
                const rRes = await fetch(`/api/get-data?sheet=Redemptions`);
                if (rRes.ok) {
                    const items = await rRes.json();
                    if (Array.isArray(items)) {
                        setRedemptions(items.filter((i: any) => i.voucherCode === id));
                    }
                }
            } catch (e) {
                // Silently ignore polling errors
            }
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [id, status]);


    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#2c2420] text-white flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-[#c5a572]" size={48} />
                <p className="text-xs font-bold uppercase tracking-widest">Verifying Pass...</p>
            </div>
        );
    }

    if (status === 'error' || !data) {
        return (
            <div className="min-h-screen bg-[#2c2420] text-white flex items-center justify-center p-6">
                <div className="text-center">
                    <XCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <p>Invalid or Missing Pass Data</p>
                    {statusMessage && <p className="text-xs text-gray-400 mt-2">{statusMessage}</p>}
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-[#2c2420] flex items-center justify-center p-4 relative">
            <Helmet>
                <title>Guest Pass | {data.guestName}</title>
            </Helmet>

            {/* Pass Container */}
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/10">

                {/* EXPIRATION BANNER */}
                {status === 'expired' && (
                    <div className="px-6 -mt-6 relative z-30">
                        <div className="bg-red-600 p-8 rounded-[2rem] text-white shadow-xl text-center border-4 border-white animate-pulse">
                            <XCircle className="mx-auto mb-2" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-90">Access Expired</p>
                            <h2 className="text-2xl font-serif font-bold leading-tight">PASS NO LONGER VALID</h2>
                            <p className="text-[10px] mt-2 opacity-80 uppercase tracking-widest font-bold">Valid Until: {data?.checkOut}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-[#1a1a1a] p-12 pb-10 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#c5a572]"></div>
                    <div className="flex flex-col items-center mb-8">
                        <div className="text-[#c5a572] font-serif text-5xl leading-none mb-2 font-light">Nº1</div>
                        <div className="text-white font-serif tracking-[0.4em] text-[10px] uppercase font-bold opacity-80 border-t border-white/10 pt-2 px-4">Wellness Club</div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                            <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">Guest Digital Access</span>
                        </div>
                    </div>
                </div>

                {/* VIP DISCOUNT BANNER - Always show for valid passes */}
                {status === 'valid' && (
                    <div className="px-6 -mt-6 relative z-10">
                        <div className="bg-[#c5a572] p-8 rounded-[2rem] text-white shadow-xl text-center border-4 border-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-90">VIP Benefit Activated</p>
                            <h2 className="text-3xl font-serif font-bold leading-tight">15% SAVINGS</h2>
                            <p className="text-xs mt-2 opacity-90">Exclusive discount for {data.guestName}</p>
                        </div>
                    </div>
                )}

                {/* Optional Image */}
                {data.imageUrl && (
                    <div className="px-6 mb-4 mt-6">
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 relative">
                            <img src={data.imageUrl} alt="Inclusive" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}

                {/* VIP Benefits Display for Guest */}
                <div className="p-8 pt-6 flex flex-col items-center justify-center border-b border-dashed border-gray-100">
                    {status === 'expired' ? (
                        <div className="text-center py-4">
                            <XCircle size={48} className="text-red-400 mx-auto mb-2 opacity-50" />
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Pass Expired</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-4">
                                <p className="text-[11px] text-[#c5a572] font-bold uppercase tracking-widest mb-2">✨ Your Exclusive Benefits ✨</p>
                                <p className="text-[9px] text-gray-400">Show this pass to reception to redeem your treatments</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 relative">
                                <QRCode value={`${window.location.origin}/v/${id}`} size={140} />
                            </div>
                            <p className="mt-3 text-[10px] font-mono text-gray-300 uppercase tracking-widest">Pass ID: {id}</p>
                        </>
                    )}

                    {redemptions.length > 0 && (
                        <div className="mt-6 w-full bg-green-500/5 rounded-2xl p-4 border border-green-500/10 text-left">
                            <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CheckCircle size={12} /> Usage History
                            </p>
                            <div className="space-y-3">
                                {redemptions.map((redeem, idx) => (
                                    <div key={idx} className="border-b border-green-500/10 last:border-0 pb-2 last:pb-0">
                                        <div className="flex justify-between items-start text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-[#1a1a1a] font-bold">{redeem.serviceType}</span>
                                                {redeem.total && (
                                                    <span className="text-[9px] text-[#c5a572] font-black uppercase tracking-tighter mt-0.5">
                                                        Total: {Number(redeem.total).toLocaleString()} IDR (Inc. Tax & Service)
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-gray-400 text-[9px] whitespace-nowrap pt-0.5 uppercase font-bold tracking-tighter">
                                                {new Date(redeem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {redeem.weather && redeem.weather.length < 50 && <span className="ml-1">• {redeem.weather}</span>}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pass Holder</p>
                        <h4 className="text-xl font-serif text-[#1a1a1a] font-bold italic">{data.guestName}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50">
                            <Clock size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Issued On</p>
                            <p className="font-bold text-[#1a1a1a] text-xs">{data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Active'}</p>
                        </div>
                        <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50">
                            <Key size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Room</p>
                            <p className="font-bold text-[#1a1a1a]">{data.roomNumber}</p>
                        </div>
                    </div>

                    <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50">
                        <Calendar size={16} className="text-red-500 mx-auto mb-2" />
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Valid Until</p>
                        <p className="font-bold text-red-600 underline">{data.checkOut}</p>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-6">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Included Benefits</p>
                        <div className="space-y-3">
                            {data.services && data.services.map((s: string) => (
                                <div key={s} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="p-1 rounded-full bg-gray-200 text-gray-400">
                                        <CheckCircle size={10} strokeWidth={4} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-tight text-[#1a1a1a]">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#f8f8f8] p-4 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                    ID: {id}
                </div>
            </div>

            {/* Float Action for Guest */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
                <a
                    href={`https://no1wellness.com/?promo=${btoa(unescape(encodeURIComponent(JSON.stringify({
                        id: id,
                        guestName: data.guestName,
                        expiry: data.checkOut
                    })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#c5a572] to-[#b08d55] text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all border-2 border-white"
                >
                    Click to Claim Your 15% Discount
                </a>
            </div>
        </div >
    );
};

export default GuestPass;
