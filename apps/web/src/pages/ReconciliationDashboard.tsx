import React from 'react';
import { Helmet } from 'react-helmet-async';
import RevenueReconciliation from '../components/RevenueReconciliation';
import { ReceiptText, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReconciliationDashboard: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Revenue Engine | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400">
                            <Home size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-serif font-bold flex items-center gap-3">
                                <ReceiptText size={28} className="text-[#c5a572]" />
                                Revenue Engine
                            </h1>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">
                                Financial Reconciliation & POS Audit
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-100">
                            Live Audit Mode
                        </span>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <RevenueReconciliation />
            </main>

            {/* Footer Tip */}
            <div className="max-w-7xl mx-auto px-6 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest border-t border-gray-100 pt-8">
                    Confidential Financial Data • Admin Only Access
                </p>
            </div>
        </div>
    );
};

export default ReconciliationDashboard;
