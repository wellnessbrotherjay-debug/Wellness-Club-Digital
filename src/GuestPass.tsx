import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { CheckCircle, Calendar, Key, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

// Mock main site URL - replace with actual deployed URL later
const MAIN_SITE_URL = 'https://www.no1wellness.com';

const GuestPass: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const encodedData = searchParams.get('d');
        if (encodedData) {
            try {
                setData(JSON.parse(atob(encodedData)));
            } catch (e) {
                console.error("Failed to parse voucher data");
            }
        }
    }, [searchParams]);

    if (!data) return <div className="min-h-screen bg-[#2c2420] text-white flex items-center justify-center">Loading Pass...</div>;

    // Pass the ENCODED data to the main site so it can validate expiration
    const discountLink = `${MAIN_SITE_URL}?promo=${searchParams.get('d')}`;

    return (
        <div className="min-h-screen bg-[#2c2420] flex items-center justify-center p-4">
            <Helmet>
                <title>Guest Pass | {data.guestName}</title>
            </Helmet>

            <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl relative">
                {/* Gold Status Bar */}
                <div className="bg-[#c5a572] h-2"></div>

                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="inline-block px-3 py-1 bg-[#1a1a1a] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                        No.1 Wellness
                    </div>
                    <h1 className="text-2xl font-serif text-[#1a1a1a] italic mb-1">Guest Access Pass</h1>
                    <div className="flex items-center justify-center gap-1 text-green-600 text-xs font-bold uppercase tracking-widest mt-2">
                        <CheckCircle size={12} />
                        Active
                    </div>
                </div>

                {/* Action Button */}
                <div className="px-8 pb-2">
                    <a
                        href={discountLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg"
                    >
                        Book with 15% Off
                        <ExternalLink size={14} />
                    </a>
                </div>

                {/* QR Section (Smaller now) */}
                <div className="p-6 flex justify-center opacity-50 scale-75 h-32 overflow-hidden">
                    <div className="bg-white p-2 border border-gray-100">
                        <QRCode value={`https://wellness-club.com/v/${id}`} size={100} />
                    </div>
                </div>

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
                            {data.services.map((s: string) => (
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
