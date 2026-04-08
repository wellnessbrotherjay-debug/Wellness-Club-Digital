import React from 'react';
import { 
    BarChart3, 
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const AdminAnalytics: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#fcfaf7]">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            to="/" 
                            className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-[#c5a572]"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="h-6 w-px bg-gray-100 mx-2" />
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#c5a572]/10 rounded-xl text-[#c5a572]">
                                <BarChart3 size={20} />
                            </div>
                            <span className="font-serif font-bold text-lg text-[#2c2420]">Admin Portal</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-8 py-10">
                <div className="mb-10 animate-slide-up">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-serif font-bold text-[#2c2420]">
                                Analytics Board
                            </h1>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">
                                Real-time Redemption Insights
                            </p>
                        </div>
                    </div>
                </div>

                <AnalyticsDashboard 
                    onViewVoucher={(code) => {
                        console.log('Viewing voucher:', code);
                    }}
                />
            </main>
        </div>
    );
};

export default AdminAnalytics;
