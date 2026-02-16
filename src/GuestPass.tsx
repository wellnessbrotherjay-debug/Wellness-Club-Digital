import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { CheckCircle, Calendar, Key, ExternalLink, ImageIcon, XCircle, Loader2, Download, Share2, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Helmet } from 'react-helmet-async';

// Main site URL - dynamic for local development
const MAIN_SITE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://www.no1wellness.com';
import { APPS_SCRIPT_URL } from './constants/config';

const GuestPass: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<any>(null);
    const passRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'redeemed' | 'error'>('loading');
    const [statusMessage, setStatusMessage] = useState('');
    const [redemptions, setRedemptions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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

        (window as any)[callbackName] = (items: any) => {
            if (!Array.isArray(items)) {
                setStatus('error');
                setStatusMessage('System error: Invalid data format');
                return;
            }
            const currentItem = items.find((i: any) =>
                String(i.voucherCode || i.code || i.id || i.voucherid).toUpperCase() === voucherId.toUpperCase()
            );

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
                        services: currentItem.services ? String(currentItem.services).split(/,\s+(?![^()]*\))/g) : [],
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
            (window as any)[vCallback] = (items: any) => {
                if (!Array.isArray(items)) return;
                const currentItem = items.find((i: any) =>
                    String(i.voucherCode || i.code || i.id || i.voucherid).toUpperCase() === id.toUpperCase()
                );

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
            (window as any)[rCallback] = (items: any) => {
                if (Array.isArray(items)) {
                    setRedemptions(items.filter(i => i.voucherCode === id));
                }
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
    // If we land via short URL (no ?d=), we re-encode the data for the main site
    const promoToken = searchParams.get('d') || (data ? (() => {
        const payload = JSON.stringify({
            id: id,
            guestName: data.guestName,
            roomNumber: data.roomNumber,
            checkIn: data.checkIn || '',
            checkOut: data.checkOut,
            services: data.services,
            email: data.email || '',
            whatsapp: data.whatsapp || ''
        });
        const bytes = new TextEncoder().encode(payload);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    })() : '');

    const handleSavePass = async () => {
        if (passRef.current === null) return;

        setIsSaving(true);

        try {
            // Higher quality settings for better mobile display
            const dataUrl = await toPng(passRef.current, {
                cacheBust: true,
                quality: 1,
                pixelRatio: 2, // Higher resolution for retina displays
                backgroundColor: '#2c2420'
            });

            // Create download link
            const link = document.createElement('a');
            const fileName = `No1-Wellness-Pass-${data.guestName.replace(/\s+/g, '-')}.png`;
            link.download = fileName;
            link.href = dataUrl;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success feedback
            alert('✓ Pass saved! Check your Downloads folder or Photos app.');

        } catch (err) {
            console.error('Save error:', err);

            // More helpful error message for mobile users
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                alert('💡 Tip: Take a screenshot instead!\n\niPhone: Press Side + Volume Up\nAndroid: Press Power + Volume Down\n\nOr use your browser\'s "Save as Image" feature.');
            } else {
                alert('Could not save image. Please try:\n1. Taking a screenshot\n2. Right-click and "Save image as..."\n3. Using a different browser');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSharePass = async () => {
        if (passRef.current === null) return;

        setIsSaving(true);

        try {
            // Generate the image
            const dataUrl = await toPng(passRef.current, {
                cacheBust: true,
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#2c2420'
            });

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            // Create file from blob
            const file = new File([blob], `No1-Wellness-Pass-${data.guestName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

            // Check if Web Share API is available and supports files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'No.1 Wellness Club Pass',
                    text: `Digital wellness pass for ${data.guestName}`
                });
            } else {
                // Fallback to download if share not available
                handleSavePass();
            }

        } catch (err: any) {
            // User cancelled share or error occurred
            if (err.name !== 'AbortError') {
                console.error('Share error:', err);
                // Fallback to download
                handleSavePass();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const discountLink = `${MAIN_SITE_URL}?promo=${encodeURIComponent(promoToken)}`;

    return (
        <div className="min-h-screen bg-[#2c2420] flex items-center justify-center p-4 relative">
            <Helmet>
                <title>Guest Pass | {data.guestName}</title>
            </Helmet>


            {/* Pass Container */}
            <div ref={passRef} className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/10">
                {/* Header - Styled like your website */}
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

                {/* VIP DISCOUNT BANNER */}
                {status === 'valid' && data.services?.some((s: string) => s.includes('15%')) && (
                    <div className="px-6 -mt-6 relative z-10">
                        <div className="bg-[#c5a572] p-8 rounded-[2rem] text-white shadow-xl text-center border-4 border-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-90">VIP Benefit Activated</p>
                            <h2 className="text-3xl font-serif font-bold leading-tight">15% SAVINGS</h2>
                            {data.services?.some((s: string) => s.includes('Salon')) && (
                                <a
                                    href="https://www.christophe-c.com/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#c5a572] rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-gray-50 transition-all border border-white active:scale-95"
                                >
                                    Book Hair Appointment
                                    <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    </div>
                )}

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
                <div className="px-8 pt-6 pb-2">
                    {(() => {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        const hasShareAPI = typeof navigator.share !== 'undefined';
                        const useShare = isMobile && hasShareAPI;

                        return (
                            <button
                                onClick={useShare ? handleSharePass : handleSavePass}
                                disabled={isSaving}
                                className="w-full mb-3 flex items-center justify-center gap-2 bg-[#c5a572] text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#b08d55] transition-all shadow-lg border border-[#c5a572]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Preparing Image...
                                    </>
                                ) : (
                                    <>
                                        {useShare ? <Share2 size={16} /> : <Download size={16} />}
                                        {useShare ? 'Save & Share Pass' : 'Save Pass to Photos'}
                                    </>
                                )}
                            </button>
                        );
                    })()}
                    <a
                        href={discountLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex flex-col items-center justify-center gap-1 bg-[#1a1a1a] text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl border border-white/10 group"
                    >
                        <span className="flex items-center gap-2">
                            {data.services?.some((s: string) => s.includes('15%')) ? 'Book with 15% Savings' : 'Visit Club Website'}
                            <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </span>
                        <span className="text-[8px] opacity-40 font-normal">Opens in new window</span>
                    </a>
                </div>

                {/* Staff Redemption QR Section - ALWAYS show for multi-use */}
                <div className="p-8 pt-0 flex flex-col items-center justify-center border-t border-dashed border-gray-100 mt-4 pt-8 animate-fade-in">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mb-4 text-center">Staff Scan to Redeem Treatments</p>
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 relative group">
                        <QRCode
                            value={`${window.location.origin}/v/${id}?scan=redeem`}
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
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pass Holder(s)</p>
                        <div className="space-y-1">
                            {data.guestName.split(' & ').map((name: string, i: number) => (
                                <p key={i} className="text-xl font-serif text-[#1a1a1a] font-bold italic">{name}</p>
                            ))}
                        </div>
                    </div>

                    <div className="text-center p-3 bg-[#fafafa] rounded-2xl border border-gray-50 col-span-2">
                        <Clock size={16} className="text-[#c5a572] mx-auto mb-2" />
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Issued On</p>
                        <p className="font-bold text-[#1a1a1a]">{data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Active'}</p>
                    </div>
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

                    <div className="border-t border-dashed border-gray-200 pt-6">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Included Benefits</p>
                        <div className="space-y-3">
                            {data.services && data.services.map((s: string) => {
                                const isDiscount = s.includes('15%');
                                const isFacility = s.includes('Sauna') || s.includes('Facility');

                                return (
                                    <div key={s} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDiscount ? 'bg-[#c5a572]/10 border border-[#c5a572]/20' :
                                        isFacility ? 'bg-blue-500/5 border border-blue-500/10' :
                                            'bg-gray-50 border border-gray-100'
                                        }`}>
                                        <div className={`p-1 rounded-full ${isDiscount ? 'bg-[#c5a572] text-white' :
                                            isFacility ? 'bg-blue-500 text-white' :
                                                'bg-gray-200 text-gray-400'
                                            }`}>
                                            <CheckCircle size={10} strokeWidth={4} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold uppercase tracking-tight ${isDiscount ? 'text-[#c5a572]' :
                                                isFacility ? 'text-blue-600' :
                                                    'text-[#1a1a1a]'
                                                }`}>
                                                {s}
                                            </span>
                                            {s.includes('Salon') && (
                                                <a
                                                    href="https://www.christophe-c.com/"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-[#c5a572] underline font-bold mt-1"
                                                >
                                                    Book Online Now
                                                </a>
                                            )}
                                        </div>
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
