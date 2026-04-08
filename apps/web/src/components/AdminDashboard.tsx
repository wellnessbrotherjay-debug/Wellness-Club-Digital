import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import VoucherAuditView from './VoucherAuditView';
import { useMarketingSummary } from '../hooks/useMarketingSummary';
import { BarChart3, ClipboardList, Loader2 } from 'lucide-react';

interface AdminDashboardProps {
    onViewVoucher?: (voucherCode: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewVoucher }) => {
    const [subTab, setSubTab] = useState<'performance' | 'vouchers'>('performance');
    const { summary, isLoading } = useMarketingSummary();

    if (isLoading || !summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-[#c5a572] opacity-20" />
                  <Loader2 className="w-12 h-12 animate-spin text-[#c5a572] absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
                </div>
                <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-[10px]">Loading Analytics...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Sub-navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#2c2420]">Admin Dashboard</h2>
                    <p className="text-sm text-gray-400 mt-1">Monitor performance and audit data integrity.</p>
                </div>
                
                <div className="flex bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl self-start shadow-inner border border-gray-100">
                    <button
                        onClick={() => setSubTab('performance')}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            subTab === 'performance' 
                            ? 'bg-white text-[#2c2420] shadow-md scale-[1.02]' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                        }`}
                    >
                        <BarChart3 size={16} />
                        Performance
                    </button>
                    <button
                        onClick={() => setSubTab('vouchers')}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            subTab === 'vouchers' 
                            ? 'bg-white text-[#2c2420] shadow-md scale-[1.02]' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                        }`}
                    >
                        <ClipboardList size={16} />
                        Vouchers Audit
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="min-h-[500px]">
                {subTab === 'performance' ? (
                    <AnalyticsDashboard 
                        onViewVoucher={onViewVoucher} 
                    />
                ) : (
                    <VoucherAuditView 
                        summary={summary} 
                        mode="issuance"
                        onViewVoucher={onViewVoucher}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
