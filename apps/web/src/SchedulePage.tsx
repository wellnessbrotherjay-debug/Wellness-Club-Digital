import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Users, MessageCircle, CheckCircle, ExternalLink, Zap } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ClassScheduleModal from './components/ClassScheduleModal';
import { WHATSAPP_NUMBER } from './constants';
import { useVoucher } from './contexts/VoucherContext';

const SchedulePage: React.FC = () => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const { isDiscountActive, voucher, activateVoucher, activateFromParams } = useVoucher();

    useEffect(() => {
        const d = searchParams.get('d');
        const coupon = searchParams.get('coupon') || searchParams.get('ref');
        const name = searchParams.get('name');

        if (d) {
            activateVoucher(d);
        } else if (coupon && name) {
            activateFromParams(coupon, name);
        }
    }, [searchParams, activateVoucher, activateFromParams]);

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
            <Helmet>
                <title>Schedule Hub | Nº1 Wellness Club</title>
            </Helmet>

            {/* Premium Header */}
            <div className="bg-[#1a1a1a] border-b border-white/5 sticky top-0 z-30 backdrop-blur-md bg-opacity-90">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-[#c5a572] font-serif text-3xl leading-none font-light">Nº1</span>
                            <span className="text-[8px] text-white/40 uppercase tracking-[0.4em] font-bold mt-1">Wellness Club</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isDiscountActive && (
                            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-[#c5a572]/10 border border-[#c5a572]/20 rounded-full">
                                <span className="text-[#c5a572] text-[9px] font-black uppercase tracking-widest">15% Discount Active</span>
                            </div>
                        )}
                        <a
                            href={`https://wa.me/${WHATSAPP_NUMBER}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full hover:bg-[#1ebd5e] transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            <MessageCircle size={16} />
                            <span>Inquiry</span>
                        </a>
                    </div>
                </div>
            </div>

            <main className="relative">
                {/* VIP DISCOUNT BANNER (MOBILE/STUCK) */}
                {isDiscountActive && (
                    <div className="bg-[#c5a572] py-3 text-center animate-pulse relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center justify-center gap-2">
                            <Zap size={14} fill="white" /> 15% VIP Discount Applied
                        </p>
                    </div>
                )}

                {/* Website-Style Hero */}
                <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                    {/* Background Image - Styled like your screenshot (Plants/Luxury) */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920&q=80"
                            alt="Wellness Club"
                            className="w-full h-full object-cover opacity-50 contrast-125"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/20 via-transparent to-[#1a1a1a]" />
                    </div>

                    <div className="relative z-10 text-center px-6 max-w-4xl">
                        <h2 className="text-[#c5a572] text-[10px] md:text-xs font-black uppercase tracking-[0.5em] mb-6 animate-fade-in">
                            Recovery • Rejuvenate • Activity
                        </h2>
                        <h1 className="text-5xl md:text-8xl font-serif font-bold mb-4 tracking-tight">
                            YOU ARE OUR <span className="text-[#c5a572]">Nº1</span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                            {isDiscountActive
                                ? "Exclusive Guest Privilege Activated. Enjoy 15% off all sessions."
                                : "Join our expert-led fitness and wellness sessions in a luxury environment."}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="w-full sm:w-auto bg-white text-[#1a1a1a] px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-[#c5a572] hover:text-white transition-all shadow-2xl"
                            >
                                View Live Schedule
                            </button>
                            <button
                                onClick={() => window.open('https://www.no1wellness.com', '_blank')}
                                className="w-full sm:w-auto bg-white/5 border border-white/20 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                Club Website <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto p-6 -mt-10 relative z-10">
                    {/* Status Note */}
                    {isDiscountActive && (
                        <div className="mb-10 bg-white/5 border border-[#c5a572]/30 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 backdrop-blur-xl">
                            <div className="w-16 h-16 bg-[#c5a572] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#c5a572]/20">
                                <CheckCircle size={32} className="text-white" />
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <h3 className="text-xl font-serif font-bold text-white mb-1">15% Savings Active</h3>
                                <div className="text-white/40 text-xs space-y-1">
                                    <p>A special {voucher?.guestName} discount has been applied to this session.</p>
                                    {voucher?.roomNumber && voucher.roomNumber !== 'N/A' && (
                                        <p className="text-[#c5a572]">Room: {voucher.roomNumber} • Click book to message our team.</p>
                                    )}
                                    {(!voucher?.roomNumber || voucher.roomNumber === 'N/A') && (
                                        <p>Click book to message our team.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 group hover:border-[#c5a572]/30 transition-all">
                            <div className="w-14 h-14 bg-[#c5a572]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Calendar className="text-[#c5a572]" size={28} />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-3 tracking-wide">Elite Programming</h3>
                            <p className="text-white/40 text-sm leading-relaxed font-light">Curated multi-modality sessions designed for recovery and functional performance.</p>
                        </div>

                        <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 group hover:border-[#c5a572]/30 transition-all">
                            <div className="w-14 h-14 bg-[#c5a572]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Clock className="text-[#c5a572]" size={28} />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-3 tracking-wide">Curated Timing</h3>
                            <p className="text-white/40 text-sm leading-relaxed font-light">Morning, sunset, and evening slots optimized for the island rhythm.</p>
                        </div>

                        <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 group hover:border-[#c5a572]/30 transition-all">
                            <div className="w-14 h-14 bg-[#c5a572]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="text-[#c5a572]" size={28} />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-3 tracking-wide">Expert Mentors</h3>
                            <p className="text-white/40 text-sm leading-relaxed font-light">Certified elite coaches dedicated to your personal wellness progression.</p>
                        </div>
                    </div>

                    {/* Quick Selection */}
                    <div className="bg-[#1a1a1a] p-10 rounded-[3rem] border border-white/5 shadow-2xl mb-20">
                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-serif font-bold tracking-tight mb-2">Reserve Your Space</h3>
                            <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold">Select a discipline to proceed</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {['Pilates', 'Yoga', 'Reformer Pilates', 'Kickboxing', 'Zumba', 'Stretching', 'Sensual Flow'].map((className) => (
                                <button
                                    key={className}
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="p-6 bg-white/5 hover:bg-[#c5a572]/10 border border-white/5 hover:border-[#c5a572] rounded-2xl transition-all text-center group"
                                >
                                    <span className="font-bold text-xs uppercase tracking-widest block mb-1 group-hover:text-[#c5a572] transition-colors">{className}</span>
                                    {isDiscountActive && <span className="text-[8px] text-[#c5a572] font-black uppercase tracking-widest">15% Off Apply</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Schedule Modal */}
            {isScheduleModalOpen && (
                <ClassScheduleModal
                    onClose={() => setIsScheduleModalOpen(false)}
                    initialClass={null}
                    initialCoach={null}
                />
            )}

            {/* Footer */}
            <div className="bg-black py-16 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex flex-col items-center md:items-start">
                        <h2 className="text-[#c5a572] font-serif text-4xl leading-none font-light mb-2">Nº1</h2>
                        <span className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-bold">Wellness Club Hub</span>
                    </div>
                    <div className="flex items-center gap-10 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">
                        <a href="https://www.no1wellness.com" className="hover:text-white transition-colors">Privacy</a>
                        <a href="https://www.no1wellness.com" className="hover:text-white transition-colors">Contact</a>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Cloud Verified</span>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-12 text-[8px] uppercase tracking-[0.8em] text-white/10">
                    Your Wellbeing Is Our Number One
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
