import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { useMarketingSummary } from '../hooks/useMarketingSummary';
import VoucherAuditView from './VoucherAuditView';

interface AnalyticsDashboardProps {
    onViewVoucher?: (voucherCode: string) => void;
}

type ActiveTab = 'overview' | 'pax' | 'venues' | 'issuance' | 'redemptions';
type TimeRange = 'all' | 'week' | 'month' | 'launch';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onViewVoucher }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
    const { summary, isLoading, error } = useMarketingSummary(timeRange);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-[#c5a572] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-xs">Architecting Data...</p>
        </div>
    );

    if (error) return (
        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-700">
            <AlertCircle size={24} />
            <div>
                <h3 className="font-bold">Analytics Synchronization Failed</h3>
                <p className="text-sm opacity-80">{error}</p>
            </div>
        </div>
    );

    if (!summary) return null;

    const downloadReport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(summary, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `wellness_report_${timeRange}_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Unified Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-gray-100">
                <div className="space-y-1">
                    <h1 className="text-3xl font-serif font-bold text-[#2c2420]">Business Analytics</h1>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {['overview', 'pax', 'venues', 'issuance', 'redemptions'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as ActiveTab)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                    ? 'bg-[#c5a572] text-white shadow-sm' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                            >
                                {tab === 'pax' ? 'Pax Throughput' : tab === 'venues' ? 'Redemption Venues' : tab === 'issuance' ? 'Issuance Tracker' : tab === 'redemptions' ? 'Redemptions Tracker' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'month', label: '30D' },
                            { id: 'week', label: '7D' },
                            { id: 'launch', label: 'Launch' }
                        ].map((range) => (
                            <button
                                key={range.id}
                                onClick={() => setTimeRange(range.id as TimeRange)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    timeRange === range.id 
                                    ? 'bg-white text-[#c5a572] shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={downloadReport}
                        className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-[#c5a572] hover:shadow-md transition-all active:scale-95"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Primary Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard 
                            label="Live Vouchers" 
                            value={summary.audit_stats?.live_vouchers || 0}
                            trend="+12%"
                            positive={true}
                            icon={<CheckCircle2 className="text-emerald-500" />}
                            subtitle="Non-Test Verified"
                        />
                        <KPICard 
                            label="Total Redeemed" 
                            value={summary.performance.redemption_rate.redeemed}
                            trend={`${summary.performance.redemption_rate.percentage}%`}
                            positive={true}
                            icon={<TrendingUp className="text-[#c5a572]" />}
                            subtitle="Redemption Rate"
                        />
                        <KPICard 
                            label="PAX Throughput" 
                            value={summary.pax_performance.total_pax}
                            trend="+8.4%"
                            positive={true}
                            icon={<Users className="text-blue-500" />}
                            subtitle="Total Guests Seen"
                        />
                        <KPICard 
                            label="Top Venue" 
                            value={summary.top_venue?.name || 'N/A'}
                            trend={(summary.top_venue?.count || 0).toString()}
                            positive={true}
                            icon={<MapPin className="text-rose-500" />}
                            subtitle="Most Active Place"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Secondary Analytics */}
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-[#2c2420]">Conversion Funnel</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Issuance to Redemption</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            
                            <div className="space-y-5">
                                <ProgressBar 
                                    label="Live Vouchers Issued" 
                                    value={summary.audit_stats.live_vouchers} 
                                    total={summary.audit_stats.live_vouchers} 
                                    color="bg-gray-100" 
                                />
                                <ProgressBar 
                                    label="Redeemed Vouchers" 
                                    value={summary.performance.redemption_rate.redeemed} 
                                    total={summary.audit_stats.live_vouchers} 
                                    color="bg-[#c5a572]" 
                                />
                                <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                                    <div>
                                        <span className="text-3xl font-bold text-[#2c2420]">{summary.performance.redemption_rate.percentage}%</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a572]">Success Rate</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-gray-400">{summary.performance.redemption_rate.pending} Pending</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-[#2c2420]">PAX Distribution</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Throughput by Voucher size</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                    <Users size={20} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {summary.pax_performance?.distribution && Object.entries(summary.pax_performance.distribution).map(([pax, count]) => (
                                    <div key={pax} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-[#c5a572]/30 transition-all">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#c5a572]">{pax} PAX</p>
                                        <p className="text-2xl font-bold text-[#2c2420]">{count as React.ReactNode}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pax' && (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden animate-slide-up">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-serif font-bold text-[#2c2420]">Pax Throughput Details</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Granular Guest volume breakdown</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-[#c5a572]">{summary.pax_performance.total_pax}</p>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Guests</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">
                                    <th className="px-8 py-5">Voucher Type</th>
                                    <th className="px-8 py-5 text-center">Count</th>
                                    <th className="px-8 py-5 text-center">Pax Ratio</th>
                                    <th className="px-8 py-5 text-right">Total Pax</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {summary.pax_details?.map((detail: { type: string; count: number; pax: number; total_pax: number }, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-5 font-bold text-[#2c2420]">{detail.type}</td>
                                        <td className="px-8 py-5 text-center font-bold text-gray-500">{detail.count}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">
                                                {detail.pax} PAX / Voucher
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-[#c5a572]">{detail.total_pax}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'venues' && (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden animate-slide-up">
                    <div className="p-8 border-b border-gray-50">
                        <h3 className="text-2xl font-serif font-bold text-[#2c2420]">Redemption Venues Audit</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Live tracking across all partner locations</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">
                                    <th className="px-8 py-5">Venue Name</th>
                                    <th className="px-8 py-5 text-center">Redemptions</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Last Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {summary.venue_details?.map((venue: { name: string; count: number; last_redemption: string }) => (
                                    <tr key={venue.name} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#2c2420]">{venue.name}</span>
                                                <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Verified Partner</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-gray-600">{venue.count}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">ACTIVE</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 text-gray-400 group-hover:text-[#c5a572] transition-colors">
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{venue.last_redemption ? new Date(venue.last_redemption).toLocaleDateString() : 'N/A'}</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'issuance' && (
                <VoucherAuditView 
                    summary={summary}
                    mode="issuance"
                    onViewVoucher={onViewVoucher}
                />
            )}

            {activeTab === 'redemptions' && (
                <VoucherAuditView 
                    summary={summary}
                    mode="redemption"
                    onViewVoucher={onViewVoucher}
                />
            )}
        </div>
    );
};

/* Internal UI Components */

interface KPICardProps {
    label: string;
    value: string | number;
    trend: string;
    positive: boolean;
    icon: React.ReactNode;
    subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, trend, positive, icon, subtitle }) => (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-white group-hover:scale-110 transition-all border border-transparent group-hover:border-gray-100">
                {icon}
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {trend}
            </div>
        </div>
        <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</h4>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#2c2420]">{value}</span>
                {subtitle && <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{subtitle}</span>}
            </div>
        </div>
    </div>
);

interface ProgressBarProps {
    label: string;
    value: number;
    total: number;
    color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-400">{label}</span>
                <span className="text-[#2c2420]">{value}</span>
            </div>
            <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
