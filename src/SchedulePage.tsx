import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Users, MessageCircle } from 'lucide-react';
import ClassScheduleModal from './components/ClassScheduleModal';
import { WHATSAPP_NUMBER } from './constants';

const SchedulePage: React.FC = () => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans">
            <Helmet>
                <title>Schedule Hub | HTF Solutions</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/htf-logo.png" alt="HTF Solutions" className="h-20 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-serif font-bold">Schedule Hub</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Class Booking & Management</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href={`https://wa.me/${WHATSAPP_NUMBER}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl hover:bg-[#1ebd5e] transition-all text-sm font-bold"
                        >
                            <MessageCircle size={18} />
                            <span className="hidden md:inline">Contact</span>
                        </a>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-6 mt-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-[#c5a572] to-[#2c2420] p-12 rounded-3xl shadow-xl text-white mb-8">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">Wellness Classes</h2>
                        <p className="text-lg opacity-90 mb-8">Join our expert-led fitness and wellness sessions. Book your spot today.</p>
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="bg-white text-[#2c2420] px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-100 transition-all shadow-lg"
                        >
                            View Schedule & Book
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-[#c5a572]/10 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="text-[#c5a572]" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Weekly Schedule</h3>
                        <p className="text-gray-600 text-sm">View all available classes throughout the week with coach assignments.</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-[#c5a572]/10 rounded-full flex items-center justify-center mb-4">
                            <Clock className="text-[#c5a572]" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Flexible Times</h3>
                        <p className="text-gray-600 text-sm">Multiple time slots available daily to fit your schedule.</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-[#c5a572]/10 rounded-full flex items-center justify-center mb-4">
                            <Users className="text-[#c5a572]" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Expert Coaches</h3>
                        <p className="text-gray-600 text-sm">Learn from certified professionals dedicated to your wellness journey.</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-2xl font-serif font-bold mb-6">Available Classes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Pilates', 'Yoga', 'Reformer Pilates', 'Kickboxing', 'Zumba', 'Stretching', 'Sensual Flow'].map((className) => (
                            <button
                                key={className}
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="p-4 bg-[#f8f8f8] hover:bg-[#c5a572]/10 border border-transparent hover:border-[#c5a572] rounded-xl transition-all text-left"
                            >
                                <span className="font-bold text-sm">{className}</span>
                            </button>
                        ))}
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
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 py-3 px-6 z-30">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    <div>HTF Solutions • Schedule Hub</div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span>Systems Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
