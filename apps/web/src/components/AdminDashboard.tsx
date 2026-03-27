import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle, 
  ArrowUpRight,
  PieChart,
  Layout
} from 'lucide-react';
import { useMarketingSummary } from '../hooks/useMarketingSummary';
import AnalyticsDashboard from './AnalyticsDashboard';
import type { VoucherData, RedemptionData } from '../VoucherPage';

interface AdminDashboardProps {
    vouchers: VoucherData[];
    redemptions: RedemptionData[];
    onViewVoucher?: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ vouchers, redemptions, onViewVoucher }) => {
    const [activeView, setActiveView] = useState<'insights' | 'performance'>('insights');
    const { summary, isLoading, error } = useMarketingSummary();

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header / Tabs */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#2c2420]">Admin Dashboard</h2>
                    <p className="text-sm text-gray-400">High-level marketing & conversion overview.</p>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                    <button 
                        onClick={() => setActiveView('insights')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'insights' ? 'bg-[#c5a572] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Insights
                    </button>
                    <button 
                        onClick={() => setActiveView('performance')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'performance' ? 'bg-[#c5a572] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Performance
                    </button>
                </div>
            </div>

            {activeView === 'performance' && (
                <div className="space-y-6">
                    <button 
                        onClick={() => setActiveView('insights')}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#c5a572] hover:underline"
                    >
                        ← Back to Insights
                    </button>
                    <AnalyticsDashboard 
                        vouchers={vouchers} 
                        redemptions={redemptions} 
                        onViewVoucher={onViewVoucher} 
                    />
                </div>
            )}

            {activeView === 'insights' && (
            <>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 border-4 border-[#c5a572]/20 border-t-[#c5a572] rounded-full animate-spin mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Marketing Data...</p>
                </div>
            ) : error ? (
                <div className="p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
                    <p className="text-red-600 text-sm font-bold">Failed to load insights: {error}</p>
                </div>
            ) : summary ? (
                <div className="space-y-8">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Issued vs Redeemed Card */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                                <TrendingUp size={64} className="text-[#c5a572]" />
                           </div>
                           <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Conversion Metric</h3>
                           <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-serif font-bold text-[#2c2420]">{summary.conversionRate}%</span>
                                <span className="text-xs font-bold text-green-500 flex items-center gap-0.5">
                                    <ArrowUpRight size={14} /> Issued vs Redeemed
                                </span>
                           </div>
                           <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Total Issued</p>
                                    <p className="text-lg font-bold">{summary.totalIssued}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Total Redeemed</p>
                                    <p className="text-lg font-bold">{summary.totalRedeemed}</p>
                                </div>
                           </div>
                        </div>

                        {/* Marketing Consent Tracker */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Marketing Consent</h3>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-3xl font-serif font-bold text-[#2c2420]">{summary.marketing.rate}%</span>
                                <Users size={24} className="text-[#c5a572] opacity-20" />
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#c5a572] transition-all duration-1000" 
                                    style={{ width: `${summary.marketing.rate}%` }}
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 mt-3 font-medium">
                                <b>{summary.marketing.count}</b> guests opted-in for promotional updates.
                            </p>
                        </div>

                        {/* Quick View - System Status */}
                        <div className="bg-[#2c2420] p-6 rounded-3xl shadow-xl text-white">
                           <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c5a572] mb-4">Data Persistence</h3>
                           <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium opacity-60">Supabase Sync</span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                                        <CheckCircle size={12} /> ACTIVE
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium opacity-60">Daily Backup</span>
                                    <span className="text-[10px] font-bold text-blue-400">AUTOMATED (00:00)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium opacity-60">UI Refresh</span>
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">60s Polling</span>
                                </div>
                                <button 
                                    onClick={() => setActiveView('performance')}
                                    className="w-full mt-2 py-2 bg-[#c5a572] text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#b08d55] transition-all"
                                >
                                    View Full Performance
                                </button>
                           </div>
                        </div>
                    </div>

                    {/* Venue Leaderboard & Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Venue Leaderboard */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin size={18} className="text-[#c5a572]" />
                                    <h3 className="font-serif font-bold text-gray-900">Venue Leaderboard</h3>
                                </div>
                                <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Top 5 Performer</span>
                            </div>
                            <div className="p-6 space-y-4">
                                {summary.leaderboard.map((item, i) => (
                                    <div key={item.name} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-gray-700 capitalize">
                                                {i + 1}. {item.name.replace(/-/g, ' ')}
                                            </span>
                                            <span className="font-mono font-bold text-[#c5a572]">{item.count} Vouchers</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#c5a572]/40 rounded-full" 
                                                style={{ width: `${(item.count / summary.totalIssued) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {summary.leaderboard.length === 0 && (
                                    <p className="text-gray-400 text-xs italic text-center py-4">No venue data available yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Insights Quick Actions */}
                        <div className="space-y-6">
                             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                        <PieChart size={20} />
                                    </div>
                                    <h4 className="font-bold text-[#2c2420]">Analytic Strategy</h4>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Our system currently tracks <b>{summary.totalIssued}</b> guest lifecycles. 
                                    <b> {summary.leaderboard[0]?.name ? summary.leaderboard[0].name.replace(/-/g, ' ') : 'Reception'}</b> remains the primary driver. 
                                    We recommend increasing signage in <b>Pool Bar</b> areas to boost engagement.
                                </p>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <Layout size={16} className="text-gray-400 mb-2" />
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Avg Daily Issued</p>
                                    <p className="text-xl font-bold">{Math.round(summary.totalIssued / 30)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <ArrowUpRight size={16} className="text-green-500 mb-2" />
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Redemption Target</p>
                                    <p className="text-xl font-bold">45%</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                    No summary data found.
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default AdminDashboard;
