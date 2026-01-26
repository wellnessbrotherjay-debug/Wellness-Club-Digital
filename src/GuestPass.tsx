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
        } else {
            setStatus('error');
        }
    }, [searchParams, id]);

    const checkStatus = (voucherId: string) => {
        // 1. Fetch current status from Sheet
        const script = document.createElement('script');
        // Define a unique callback name 
        const callbackName = `checkItems_${Date.now()}`;

        (window as any)[callbackName] = (items: any[]) => {
            const currentItem = items.find((i: any) => i.code === voucherId);

            if (!currentItem) {
                setStatus('error');
                setStatusMessage('Voucher not found in system.');
            } else if (currentItem.status === 'Redeemed') {
                setStatus('redeemed');
            } else {
                // Voucher is Active - just show it!
                setStatus('valid');
            }
            delete (window as any)[callbackName];
            document.body.removeChild(script);
        };

        script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=Vouchers`;
        script.onerror = () => setStatus('error');
        document.body.appendChild(script);
    };

    // Background polling for real-time status updates
    useEffect(() => {
        if (!id || status === 'loading') return;

        const pollInterval = setInterval(() => {
            const script = document.createElement('script');
            const callbackName = `poll_${id.replace(/-/g, '')}_${Date.now()}`;

            (window as any)[callbackName] = (items: any[]) => {
                const currentItem = items.find((i: any) => i.code === id);
                if (currentItem && currentItem.status === 'Redeemed' && status !== 'redeemed') {
                    setStatus('redeemed');
                }
                delete (window as any)[callbackName];
                document.body.removeChild(script);
            };

            script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=Vouchers&t=${Date.now()}`;
            document.body.appendChild(script);
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
                        No.1 Wellness
                    </div>
                    <h1 className="text-2xl font-serif text-[#1a1a1a] italic mb-1">Guest Access Pass</h1>
                    <div className={`flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-widest mt-2 ${status === 'redeemed' ? 'text-red-500' : 'text-green-600'}`}>
                        {status === 'redeemed' ? (
                            <>
                                <AlertTriangle size={12} />
                                Redeemed / Used
                            </>
                        ) : (
                            <>
                                <CheckCircle size={12} />
                                Active
                            </>
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

                {/* Action Button - Excluded from download if you want, but html2canvas captures visible DOM. 
                    Links won't click in an image, so it's fine. */}
                <div className="px-8 pb-2">
                    <a
                        href={discountLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                        data-html2canvas-ignore // Use this if you don't want the button in the image, but users might want the visual "click here" cue even in a saved image? 
                    // Actually, better to keep it so it looks like the pass.
                    >
                        Book with 15% Off
                        <ExternalLink size={14} />
                    </a>
                </div>

                {/* Staff Redemption QR Section */}
                {status !== 'redeemed' && (
                    <div className="p-8 pt-0 flex flex-col items-center justify-center border-t border-dashed border-gray-100 mt-4 pt-8 animate-fade-in">
                        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mb-4 text-center">Staff Use Only: Scan to Redeem</p>
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-50">
                            <QRCode
                                value={JSON.stringify({ type: 'voucher-redemption', id: id })}
                                size={140}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                        <p className="mt-3 text-[10px] font-mono text-gray-200 uppercase tracking-widest">
                            Pass ID: {id}
                        </p>
                    </div>
                )}

                {/* Details */}
                <div className="p-8 pt-0 space-y-6">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Guest Name</p>
                        <p className="text-xl font-serif text-[#1a1a1a]">{data.guestName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-[#fafafa] rounded-lg">
                            <Key size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Room</p>
                            <p className="font-bold text-[#1a1a1a]">{data.roomNumber}</p>
                        </div>
                        <div className="text-center p-3 bg-[#fafafa] rounded-lg">
                            <Calendar size={16} className="text-[#c5a572] mx-auto mb-2" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Valid Until</p>
                            <p className="font-bold text-[#1a1a1a]">{data.checkOut}</p>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-6">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">Included Services</p>
                        <div className="space-y-2">
                            {data.services && data.services.map((s: string) => (
                                <div key={s} className="flex items-center gap-2 text-sm text-[#1a1a1a]">
                                    <CheckCircle size={14} className="text-[#c5a572]" />
                                    {s}
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
        </div>
    );
};

export default GuestPass;
