import React, { useState } from 'react';
import {
    BarChart,
    TrendingUp,
    Users,
    Zap,
    Download,
    MapPin,
    ArrowUpRight,
    Loader2,
    CheckCircle
} from 'lucide-react';
import type { VoucherData, RedemptionData } from '../VoucherPage';
import { useMarketingSummary } from '../hooks/useMarketingSummary';

interface AnalyticsDashboardProps {
    vouchers: VoucherData[];
    redemptions: RedemptionData[];
    onViewVoucher?: (voucher_code: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
    // --- State ---
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'launch'>('all');
    const { summary, isLoading, error } = useMarketingSummary();

    const downloadReport = () => {
        if (!summary) return;
        const now = new Date();
        const today = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const dailyRows = summary.daily_stats.map(s => {
            const rate = s.issued > 0 ? Math.round((s.redeemed / s.issued) * 100) : 0;
            const d = new Date(s.date + 'T00:00:00');
            const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            return `<tr><td>${label}</td><td style="color:#9a7a52;font-weight:bold;text-align:center">${s.issued}</td><td style="color:#1a7a4a;font-weight:bold;text-align:center">${s.redeemed}</td><td style="text-align:center;color:${rate >= 50 ? '#1a7a4a' : '#cc8800'}">${s.issued > 0 ? rate + '%' : '—'}</td></tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Wellness Voucher Report — ${today}</title>
<style>body{font-family:Arial,sans-serif;color:#222;max-width:800px;margin:40px auto;padding:0 24px}
h1{color:#c5a572;border-bottom:3px solid #c5a572;padding-bottom:8px}
h2{color:#2c2420;font-size:15px;margin-top:28px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888}
td{padding:7px 12px;border-bottom:1px solid #f0f0f0}
.kpi{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.kpi-box{flex:1;min-width:140px;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center}
.kpi-label{font-size:9px;font-weight:bold;text-transform:uppercase;color:#888;margin:0}
.kpi-val{font-size:24px;font-weight:bold;margin:4px 0 0}
@media print{button{display:none}}
</style></head><body>
<h1>📊 No.1 Wellness Voucher Report</h1>
<p style="color:#888;font-size:13px">Generated: ${today} &nbsp;·&nbsp; Filter: ${timeRange}</p>
<div class="kpi">
  <div class="kpi-box"><p class="kpi-label">Vouchers Issued</p><p class="kpi-val" style="color:#9a7a52">${summary.total_issued}</p></div>
  <div class="kpi-box"><p class="kpi-label">Vouchers Redeemed</p><p class="kpi-val" style="color:#1a7a4a">${summary.total_redeemed}</p></div>
  <div class="kpi-box"><p class="kpi-label">Voucher Conv. Rate</p><p class="kpi-val" style="color:#4444bb">${summary.conversion_rate}%</p></div>
</div>
<div class="kpi">
  <div class="kpi-box"><p class="kpi-label">Total Pax Issued</p><p class="kpi-val" style="color:#9a7a52">${summary.total_pax_pool}</p></div>
  <div class="kpi-box"><p class="kpi-label">Total Pax Redeemed</p><p class="kpi-val" style="color:#1a7a4a">${summary.total_pax_redeemed}</p></div>
  <div class="kpi-box"><p class="kpi-label">Pax Conv. Rate</p><p class="kpi-val" style="color:#4444bb">${summary.pax_redemption_rate}%</p></div>
</div>
<h2>📅 Daily Breakdown</h2>
<table><thead><tr><th>Date</th><th style="text-align:center">Issued</th><th style="text-align:center">Redeemed</th><th style="text-align:center">Rate</th></tr></thead>
<tbody>${dailyRows || '<tr><td colspan="4" style="text-align:center;color:#aaa">No data</td></tr>'}</tbody>
</table>
<p style="text-align:center;margin-top:40px"><button onclick="window.print()" style="background:#c5a572;color:white;border:none;padding:10px 28px;border-radius:6px;font-size:14px;cursor:pointer">🖨 Print / Save as PDF</button></p>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `wellness_report_${new Date().toISOString().split('T')[0]}.html`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <Loader2 className="w-12 h-12 text-[#c5a572] animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Syncing Live Analytics...</p>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
                <p className="text-red-600 text-sm font-bold">Failed to load analytics: {error || 'No data'}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Unified Debug Info */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-2xl font-mono text-xs">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-white">🔍 Analytics Pipeline v5.0</h4>
                    <span className="text-[10px] text-gray-500">Mode: Supabase (Snake Case)</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <p className="text-gray-400">Total Vouchers: {summary.total_issued}</p>
                        <p className="text-gray-400">Total Pax Pool: {summary.total_pax_pool}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-cyan-400">Sync: Production Live</p>
                        <p className="text-amber-400">Deduplication: 5-Min Category window</p>
                    </div>
                </div>
            </div>

            {/* Performance Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Conversion Metric */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={64} className="text-[#c5a572]" />
                    </div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Conversion Rate</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-serif font-bold text-[#2c2420]">{summary.conversion_rate}%</span>
                        <span className="text-xs font-bold text-green-500 flex items-center gap-0.5">
                            <ArrowUpRight size={14} /> Issuance to Redemption
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Total Issued</p>
                            <p className="text-lg font-bold">{summary.total_issued}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Total Redeemed</p>
                            <p className="text-lg font-bold">{summary.total_redeemed}</p>
                        </div>
                    </div>
                </div>

                {/* Marketing Consent */}
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

                {/* Pax Performance */}
                <div className="bg-[#2c2420] p-6 rounded-3xl shadow-xl text-white">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c5a572] mb-4">Pax Throughput</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-4xl font-serif font-bold">{summary.pax_redemption_rate}%</span>
                        <span className="text-[10px] font-bold text-[#c5a572]">PAX REDEMPTION</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                            <span>Total Pax Grouped</span>
                            <span>{summary.total_pax_pool}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#c5a572]">
                            <span>Pax Redeemed</span>
                            <span>{summary.total_pax_redeemed}</span>
                        </div>
                        <button 
                            onClick={downloadReport}
                            className="w-full mt-4 py-3 bg-[#c5a572] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#b08d55] transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={14} /> Download PDF Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[#c5a572] mr-4">
                        <BarChart size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Category Breakdown</span>
                    </div>

                    <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-all focus:ring-2 focus:ring-[#c5a572]/20">
                        <option value="all">Global Performance</option>
                        <option value="launch">Since Launch</option>
                        <option value="month">Trailing 30 Days</option>
                        <option value="week">Trailing 7 Days</option>
                    </select>
                </div>
                
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Source of Truth: Supabase Production
                </div>
            </div>

            {/* Shop Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'fashion' as const, label: 'T Store', emoji: '🛍️', sub: 'Fashion Unit' },
                    { id: 'wellness' as const, label: 'No.1 Wellness', emoji: '💆', sub: 'Massage Unit' },
                    { id: 'hair' as const, label: 'TS Hair Salon', emoji: '✂️', sub: 'Beauty Unit' }
                ].map(shop => (
                    <div key={shop.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-[#c5a572]/30 transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c5a572] mb-1">{shop.label}</h3>
                                <p className="text-[9px] text-gray-400 font-medium">{shop.sub}</p>
                            </div>
                            <span className="text-2xl">{shop.emoji}</span>
                        </div>
                        <div className="flex items-end gap-6">
                            <div>
                                <span className="text-4xl font-serif font-bold text-[#2c2420]">{summary.performance[shop.id]}</span>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Total Redeemed</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Venue Leaderboard & Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin size={18} className="text-[#c5a572]" />
                            <h3 className="font-serif font-bold text-gray-900">Venue Leaderboard</h3>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Issuance Source</span>
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
                                        style={{ width: `${(item.count / summary.total_issued) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#fcfaf7] p-8 rounded-3xl border border-[#c5a572]/10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#c5a572] shadow-sm">
                            <Zap size={20} />
                        </div>
                        <h4 className="font-serif font-bold text-[#2c2420] text-xl">Operational Insight</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Currently tracking <b>{summary.total_issued}</b> guest lifecycles with a <b>{summary.conversion_rate}%</b> conversion rate. 
                        <b> {summary.leaderboard[0]?.name ? summary.leaderboard[0].name.replace(/-/g, ' ') : 'Reception'}</b> is your peak driver. 
                        Multi-category deduplication is active ensuring data integrity of <b>{summary.total_redeemed}</b> unique service redemptions.
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#c5a572]">Avg Daily Issue</span>
                            <p className="text-xl font-bold text-[#2c2420]">{Math.round(summary.total_issued / (summary.daily_stats.length || 30))}</p>
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                            <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Sync Status</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <CheckCircle size={14} className="text-green-500" />
                                <span className="text-[10px] font-bold text-[#2c2420]">LIVE Supabase</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
