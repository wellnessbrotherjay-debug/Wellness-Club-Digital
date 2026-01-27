import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { CheckCircle, Calendar, Key, ExternalLink, ImageIcon, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

// Mock main site URL - replace with actual deployed URL later
const MAIN_SITE_URL = 'https://www.no1wellness.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec';

const GuestPass: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<any>(null);
    const passRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'redeemed' | 'error'>('loading');
    const [statusMessage, setStatusMessage] = useState('');
    const [redemptions, setRedemptions] = useState<any[]>([]);

    useEffect(() => {
        const encodedData = searchParams.get('d');
        if (encodedData && id) {
            try {
                const parsed = JSON.parse(atob(encodedData));
                setData(parsed);
                checkStatus(id);
            } catch (e) {
                console.error("Failed to parse voucher data");
                setStatus('error');
            }
        } else if (id) {
            // No encoded data? Fetch from sheet!
            checkStatus(id, true);
        } else {
            setStatus('error');
        }
    }, [searchParams, id]);

    const checkStatus = (voucherId: string, needsHydration: boolean = false) => {
        // 1. Fetch current status from Sheet
        const script = document.createElement('script');
        // Define a unique callback name 
        const callbackName = `checkItems_${Date.now()}`;

        (window as any)[callbackName] = (items: any[]) => {
            const currentItem = items.find((i: any) => i.code === voucherId);

            if (!currentItem) {
                setStatus('error');
                setStatusMessage('Voucher not found in system.');
            } else {
                // Determine status based on DATE ONLY (Multi-use support)
                const today = new Date().toISOString().split('T')[0];
                // Assuming checkOut is YYYY-MM-DD. If currentItem.checkOut is ISO, split it.
                // If the checkOut date is valid, the voucher is active.

                let isExpired = false;
                if (currentItem.checkOut) {
                    const expiry = currentItem.checkOut.split('T')[0];
                    if (expiry < today) {
                        isExpired = true;
                    }
                }

                if (isExpired) {
                    setStatus('redeemed'); // Re-using 'redeemed' state for 'expired/inactive' visually if needed, or better to have specific 'expired'
                    // Actually, the component handles 'redeemed' as red. Let's stick to that or 'error'?
                    // The UI has "Redeemed / Used" for 'redeemed' status. 
                    // Let's map 'expired' to 'redeemed' UI state for now, but update the text in the UI later?
                    // Better: The UI (lines 142+) checks count === 'redeemed'. 
                    // Let's force it to 'valid' if NOT expired, regardless of sheet status.
                } else {
                    setStatus('valid');
                }

                // Hydrate data if needed (for short URLs)
                if (needsHydration) {
                    setData({
                        guestName: currentItem.guestName,
                        roomNumber: currentItem.roomNumber,
                        // Handle date format differences if necessary
                        checkOut: currentItem.checkOut ? new Date(currentItem.checkOut).toISOString().split('T')[0] : '',
                        services: currentItem.services ? currentItem.services.split(', ') : [],
                        imageUrl: currentItem.imageUrl || ''
                    });
                }
            }
            delete (window as any)[callbackName];
            document.body.removeChild(script);
        };

        script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=Vouchers`;
        script.onerror = () => setStatus('error');
        document.body.appendChild(script);
    };

    // Background polling for real-time status updates (both Vouchers and Redemptions)
    useEffect(() => {
        if (!id || status === 'loading') return;

        const pollInterval = setInterval(() => {
            // 1. Poll Vouchers
            const vScript = document.createElement('script');
            const vCallback = `v_poll_${Date.now()}`;
            (window as any)[vCallback] = (items: any[]) => {
                const currentItem = items.find((i: any) => i.code === id);

                // MULTI-USE Logic: Only switch to 'redeemed' (Expired) if DATE has passed.
                // Ignore 'Redeemed' string from sheet.
                if (currentItem) {
                    const today = new Date().toISOString().split('T')[0];
                    if (currentItem.checkOut && currentItem.checkOut.split('T')[0] < today) {
                        if (status !== 'redeemed') setStatus('redeemed');
                    }
                }

                delete (window as any)[vCallback];
                document.body.removeChild(vScript);
            };
            vScript.src = `${APPS_SCRIPT_URL}?callback=${vCallback}&sheet=Vouchers&t=${Date.now()}`;
            document.body.appendChild(vScript);

            // 2. Poll Redemptions
            const rScript = document.createElement('script');
            const rCallback = `r_poll_${Date.now()}`;
            (window as any)[rCallback] = (items: any[]) => {
                setRedemptions(items.filter(i => i.voucherCode === id));
                delete (window as any)[rCallback];
                document.body.removeChild(rScript);
            };
            rScript.src = `${APPS_SCRIPT_URL}?callback=${rCallback}&sheet=Redemptions&t=${Date.now()}`;
            document.body.appendChild(rScript);

        }, 5000);

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

    // Pass the ENCODED data to the main site so it can validate expiration
    const discountLink = `${MAIN_SITE_URL}?promo=${searchParams.get('d')}`;

    return (
        <div className="min-h-screen bg-[#2c2420] flex items-center justify-center p-4 relative">
            <Helmet>
                <title>Guest Pass | {data.guestName}</title>
            </Helmet>


            {/* Pass Container */}
            <div ref={passRef} className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl relative">
                {/* Gold Status Bar */}
                <div className="bg-[#c5a572] h-2"></div>

                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="inline-block px-3 py-1 bg-[#1a1a1a] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                        No.1 Wellness Club
                    </div>
                    <h1 className="text-2xl font-serif text-[#1a1a1a] italic mb-1">Guest Access Pass</h1>

                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className={`flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full ${status === 'redeemed' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {status === 'redeemed' ? (
                                <>
                                    <AlertTriangle size={12} />
                                    Voucher Expired
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={12} strokeWidth={3} />
                                    Active Pass
                                </>
                            )}
                        </div>

                        {/* 15% OFF VIP BANNER */}
                        {status === 'valid' && data.services?.some((s: string) => s.includes('15%')) && (
                            <div className="mt-4 w-full bg-[#c5a572] p-4 rounded-2xl text-white shadow-lg animate-pulse">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">VIP Benefit Revealed</p>
                                <h2 className="text-2xl font-serif font-bold leading-tight">15% SAVINGS ACTIVE</h2>
                                <p className="text-[10px] mt-2 font-medium bg-black/10 py-1 rounded-lg">Applied to all Wellness treatments & Dining</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Optional Image */}
                {data.imageUrl && (
                    <div className="px-6 mb-4">
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 relative">
                            <img
                                src={data.imageUrl}
                                alt="Inclusive"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none -z-10">
                                <ImageIcon size={24} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="px-8 pb-2">
                    <a
                        href={discountLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg border border-white/10"
                    >
                        {data.services?.some((s: string) => s.includes('15%')) ? 'Redeem 15% Off Now' : 'Visit Website'}
                        <ExternalLink size={14} />
                    </a>
                </div>

                {/* Staff Redemption QR Section - ALWAYS show for multi-use */}
                <div className="p-8 pt-0 flex flex-col items-center justify-center border-t border-dashed border-gray-100 mt-4 pt-8 animate-fade-in">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mb-4 text-center">Staff Scan to Redeem Treatments</p>
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 relative group">
                        <QRCode
                            value={JSON.stringify({ type: 'voucher-redemption', id: id })}
                            size={140}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                        <div className="absolute inset-0 border-2 border-[#c5a572]/0 group-hover:border-[#c5a572]/20 rounded-2xl transition-all"></div>
                    </div>
                    <p className="mt-3 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                        Ref: {id}
                    </p>
                    {redemptions.length > 0 && (
                        <div className="mt-6 w-full bg-green-500/5 rounded-2xl p-4 border border-green-500/10">
                            <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CheckCircle size={12} /> Usage History
                            </p>
                            <div className="space-y-2">
                                {redemptions.map((redeem, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                        <span className="text-[#1a1a1a] font-bold">{redeem.serviceType}</span>
                                        <span className="text-gray-400">{new Date(redeem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="p-8 pt-0 space-y-6">
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pass Holder</p>
                        <p className="text-xl font-serif text-[#1a1a1a] font-bold italic">{data.guestName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50">
                            <Key size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Room</p>
                            <p className="font-bold text-[#1a1a1a]">{data.roomNumber}</p>
                        </div>
                        <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50">
                            <Calendar size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Expiry</p>
                            <p className="font-bold text-[#1a1a1a]">{data.checkOut}</p>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-6">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Included Benefits</p>
                        <div className="space-y-3">
                            {data.services && data.services.map((s: string) => {
                                const isDiscount = s.includes('15%');
                                return (
                                    <div key={s} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDiscount ? 'bg-[#c5a572]/10 border border-[#c5a572]/20' : 'bg-gray-50 border border-gray-100'}`}>
                                        <div className={`p-1 rounded-full ${isDiscount ? 'bg-[#c5a572] text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            <CheckCircle size={10} strokeWidth={4} />
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-tight ${isDiscount ? 'text-[#c5a572]' : 'text-[#1a1a1a]'}`}>
                                            {s}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#f8f8f8] p-4 text-center text-[10px] text-gray-400 uppercase tracking-widest">
                    ID: {id}
                </div>
            </div>
        </div>
    );
};

export default GuestPass;
