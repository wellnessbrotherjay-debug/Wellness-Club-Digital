import React from 'react';
import { Helmet } from 'react-helmet-async';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { useVoucherData } from '../hooks/useVoucherData';
import { Loader2 } from 'lucide-react';

const AdminAnalytics: React.FC = () => {
    const { vouchers, redemptions, isFetching, hasLoaded } = useVoucherData();

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Analytics Board | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-3">
                            <span role="img" aria-label="chart">📊</span>
                            Analytics Board
                        </h1>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">
                            Real-time Redemption Insights
                        </p>
                    </div>
                    {isFetching && (
                        <div className="flex items-center gap-2 text-[#c5a572] animate-pulse">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Refreshing Data...</span>
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnalyticsDashboard
                    vouchers={vouchers}
                    redemptions={redemptions}
                />
            </main>
        </div>
    );
};

export default AdminAnalytics;
