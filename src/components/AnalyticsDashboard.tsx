import React, { useState, useMemo, useCallback } from 'react';
import {
    BarChart,
    TrendingUp,
    Users,
    Zap,
    Download,
    Tag
} from 'lucide-react';
import type { VoucherData, RedemptionData } from '../VoucherPage';

interface AnalyticsDashboardProps {
    vouchers: VoucherData[];
    redemptions: RedemptionData[];
    onViewVoucher?: (id: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ vouchers, redemptions, onViewVoucher }) => {
    // --- State ---
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'launch' | 'custom'>('all');
    const [startDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');

    const EXCLUDE_NAMES = useMemo(() => [
        'test', 'test weather', 'fix verification', 'diag test', 'agent diagnostic'
    ], []);

    const isTestAccount = useCallback((name: string, code: string) => {
        const n = String(name || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        if (c.startsWith('test-')) return true;
        return EXCLUDE_NAMES.some(tn => n.includes(tn));
    }, [EXCLUDE_NAMES]);

    // Precise Category Matching
    const getCategoryStrict = useCallback((serviceStr: string, explicitCategory?: string) => {
        if (explicitCategory && explicitCategory !== 'other') return explicitCategory;

        const s = String(serviceStr || '').toLowerCase().trim();
        if (s.includes('t store') || s.includes('shopping')) return 'fashion';
        if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'hair';
        return 'wellness';
    }, []);

    // --- Core Analytics Logic ---
    const effectiveRedemptions = useMemo(() => {
        const voucherMap = new Map(vouchers.map(v => [v.id?.toUpperCase(), v]));

        // 1. Build Base Redemptions from either redemptions array or vouchers with status "Redeemed"
        const baseData = redemptions.length > 0
            ? redemptions.map(r => {
                const v = voucherMap.get(r.voucherCode?.toUpperCase());
                const timestamp = v?.redeemed_at || r.timestamp;
                return {
                    ...r,
                    timestamp,
                    is_test: (v as any)?.is_test === 'TRUE' || isTestAccount(r.guestName || (v as any)?.guestName || '', r.voucherCode || ''),
                    explicitCategory: (r as any).category || (v as any)?.category
                };
            })
            : vouchers
                .filter(v => v.status === 'Redeemed' || v.redeemed_at)
                .map(v => ({
                    timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                    voucherCode: v.id,
                    guestName: v.guestName || 'Unknown Guest',
                    serviceType: v.redeemed_service || v.serviceType || '',
                    roomNumber: v.roomNumber || '',
                    is_test: (v as any).is_test === 'TRUE' || isTestAccount(v.guestName || '', v.id || ''),
                    explicitCategory: (v as any).category
                }));

        // 2. Filter out test records
        const realData = baseData.filter(r => !r.is_test);

        // 3. Deduplicate: Allow 1 redemption PER CATEGORY per voucher in a 5-min window
        const seen = new Set<string>();
        const final = [];
        for (const r of realData) {
            const time = new Date(r.timestamp).getTime();
            const timeBucket = Math.floor(time / (60000 * 5));
            const cat = getCategoryStrict(r.serviceType, r.explicitCategory);
            const key = `${r.voucherCode?.toUpperCase()}|${cat}|${timeBucket}`;

            if (!seen.has(key)) {
                seen.add(key);
                final.push({
                    ...r,
                    derivedCategory: cat
                });
            }
        }
        return final;
    }, [redemptions, vouchers, isTestAccount, getCategoryStrict]);

    const stats = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const launchDate = new Date('2026-02-04');

        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        // 1. Time Range Filtering for Redemptions
        let currentRedemptions = effectiveRedemptions;
        if (timeRange === 'week') currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp)! >= oneWeekAgo);
        else if (timeRange === 'month') currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp)! >= oneMonthAgo);
        else if (timeRange === 'launch') currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp)! >= launchDate);
        else if (timeRange === 'custom') {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= start && d <= end;
            });
        }

        // Apply Category Filter for the main list
        let filteredRedemptions = currentRedemptions;
        if (serviceCategory !== 'all') {
            filteredRedemptions = currentRedemptions.filter(r =>
                getCategoryStrict(r.serviceType, (r as any).explicitCategory) === serviceCategory
            );
        }

        // 2. Issued Vouchers Pool (The total number of vouchers ever created in this category)
        const realVouchers = vouchers.filter(v =>
            (v as any).is_test !== 'TRUE' &&
            !isTestAccount(v.guestName || '', v.id || '')
        );

        const shopIssued = {
            fashion: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'fashion').length,
            hair: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'hair').length,
            wellness: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'wellness').length
        };

        // If time range is NOT 'all', we might want to filter Issued by creation date too?
        // But the user said "192 issued", so they clearly want the total Pool.
        const totalVouchersPool = realVouchers.length;

        // Shop Redeemed Totals (Subset of Issued)
        const shopTotals = {
            fashion: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'fashion').length,
            hair: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'hair').length,
            wellness: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'wellness').length
        };

        // --- Daily Redemptions ---
        const dailyCounts: Record<string, number> = {};
        filteredRedemptions.forEach(r => {
            const d = parseDate(r.timestamp);
            if (d) {
                const key = d.toISOString().split('T')[0];
                dailyCounts[key] = (dailyCounts[key] || 0) + 1;
            }
        });

        // --- Daily Issued Counts ---
        const dailyIssuedCounts: Record<string, number> = {};
        realVouchers.forEach(v => {
            const d = parseDate(v.created_at || '');
            if (!d) return;
            if (timeRange === 'week' && d < oneWeekAgo) return;
            if (timeRange === 'month' && d < oneMonthAgo) return;
            if (timeRange === 'launch' && d < launchDate) return;
            if (timeRange === 'custom') {
                const start = new Date(startDate); start.setHours(0, 0, 0, 0);
                const end = new Date(endDate); end.setHours(23, 59, 59, 999);
                if (d < start || d > end) return;
            }
            const key = d.toISOString().split('T')[0];
            dailyIssuedCounts[key] = (dailyIssuedCounts[key] || 0) + 1;
        });

        // --- Service Counts ---
        const serviceCounts: Record<string, number> = {};
        filteredRedemptions.forEach(r => {
            const svc = r.serviceType || 'Voucher';
            serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
        });

        const redemptionRate = totalVouchersPool > 0 ? Math.round((effectiveRedemptions.length / totalVouchersPool) * 100) : 0;

        return {
            totalRedemptions: filteredRedemptions.length,
            totalIssuedPool: totalVouchersPool,
            redemptionRate,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            shopTotals,
            shopIssued,
            serviceCounts,
            dailyCounts: Object.entries(dailyCounts).sort((a, b) => b[0].localeCompare(a[0])),
            dailyIssuedCounts,
            recentActivity: [...filteredRedemptions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        };
    }, [vouchers, timeRange, startDate, endDate, serviceCategory, getCategoryStrict, effectiveRedemptions, isTestAccount]);

    const downloadReport = () => {
        const today = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const { dailyIssuedCounts, dailyCounts, serviceCounts, totalRedemptions, totalIssuedPool, redemptionRate } = stats;
        const redeemedMap = Object.fromEntries(dailyCounts);
        const allDates = [...new Set([...Object.keys(dailyIssuedCounts), ...dailyCounts.map(([d]) => d)])].sort((a, b) => b.localeCompare(a));

        const dailyRows = allDates.map(date => {
            const issued = dailyIssuedCounts[date] || 0;
            const redeemed = redeemedMap[date] || 0;
            const rate = issued > 0 ? Math.round((redeemed / issued) * 100) : 0;
            const d = new Date(date + 'T00:00:00');
            const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            return `<tr><td>${label}</td><td style="color:#9a7a52;font-weight:bold;text-align:center">${issued}</td><td style="color:#1a7a4a;font-weight:bold;text-align:center">${redeemed}</td><td style="text-align:center;color:${rate >= 50 ? '#1a7a4a' : '#cc8800'}">${issued > 0 ? rate + '%' : '—'}</td></tr>`;
        }).join('');

        const serviceRows = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).map(([svc, count]) =>
            `<tr><td>${svc}</td><td style="text-align:right;font-weight:bold;color:#1a7a4a">${count}</td></tr>`
        ).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Wellness Voucher Report — ${today}</title>
<style>body{font-family:Arial,sans-serif;color:#222;max-width:800px;margin:40px auto;padding:0 24px}
h1{color:#c5a572;border-bottom:3px solid #c5a572;padding-bottom:8px}
h2{color:#2c2420;font-size:15px;margin-top:28px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888}
td{padding:7px 12px;border-bottom:1px solid #f0f0f0}
.kpi{display:flex;gap:16px;margin:20px 0}
.kpi-box{flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:16px;text-align:center}
.kpi-label{font-size:11px;font-weight:bold;text-transform:uppercase;color:#888;margin:0}
.kpi-val{font-size:36px;font-weight:bold;margin:6px 0 0}
@media print{button{display:none}}
</style></head><body>
<h1>📊 No.1 Wellness Voucher Report</h1>
<p style="color:#888;font-size:13px">Generated: ${today} &nbsp;·&nbsp; Filter: {timeRange}</p>
<div class="kpi">
  <div class="kpi-box"><p class="kpi-label">Total Issued (Selected Period)</p><p class="kpi-val" style="color:#9a7a52">${totalIssuedPool}</p></div>
  <div class="kpi-box"><p class="kpi-label">Total Redeemed</p><p class="kpi-val" style="color:#1a7a4a">${totalRedemptions}</p></div>
  <div class="kpi-box"><p class="kpi-label">Conversion Rate</p><p class="kpi-val" style="color:#4444bb">${redemptionRate}%</p></div>
</div>
<h2>📅 Daily Breakdown</h2>
<table><thead><tr><th>Date</th><th style="text-align:center">Issued</th><th style="text-align:center">Redeemed</th><th style="text-align:center">Rate</th></tr></thead>
<tbody>${dailyRows || '<tr><td colspan="4" style="text-align:center;color:#aaa">No data</td></tr>'}</tbody>
</table>
<h2>✨ Services Breakdown</h2>
<table><thead><tr><th>Service</th><th style="text-align:right">Count</th></tr></thead>
<tbody>${serviceRows || '<tr><td colspan="2" style="text-align:center;color:#aaa">No data</td></tr>'}</tbody>
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

    const exportToCSV = () => {
        const headers = ['Voucher Code', 'Guest Name', 'Room', 'Date', 'Type'];
        const csvRows = effectiveRedemptions.map(r => [
            r.voucherCode,
            `"${r.guestName || ''}"`,
            r.roomNumber || '',
            r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
            getCategoryStrict(r.serviceType, (r as any).explicitCategory)
        ].join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redemptions-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Unified Debug Info */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-2xl font-mono text-xs">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-white">🔍 Analytics Pipeline v3.5</h4>
                    <span className="text-[10px] text-gray-500">Mode: Typed Digital Flow</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <p className="text-gray-400">Total Vouchers (Real): {stats.totalIssuedPool}</p>
                        <p className="text-gray-400">Total Redemptions (Real): {effectiveRedemptions.length}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-cyan-400">Filter: {timeRange} | {serviceCategory}</p>
                        <p className="text-amber-400">Global Rate: {stats.redemptionRate}%</p>
                    </div>
                </div>
            </div>

            {/* Performance Config */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[#c5a572] mr-4">
                        <BarChart size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Performance</span>
                    </div>

                    <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-bold uppercase">
                        <option value="all">All Time</option>
                        <option value="launch">Since Launch</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                    </select>

                    <select value={serviceCategory} onChange={e => setServiceCategory(e.target.value as any)} className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-bold uppercase">
                        <option value="all">All Units</option>
                        <option value="wellness">Wellness</option>
                        <option value="fashion">T Store</option>
                        <option value="hair">Hair Salon</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={exportToCSV} className="bg-gray-100 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-gray-200 transition-colors">
                        <Download size={14} /> CSV
                    </button>
                    <button onClick={downloadReport} className="bg-[#c5a572] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-[#b09465] transition-all shadow-md">
                        <Download size={14} /> PDF Report
                    </button>
                </div>
            </div>

            {/* Shop Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'fashion', label: 'T Store', emoji: '🛍️', sub: 'Fashion Redemptions' },
                    { id: 'wellness', label: 'No.1 Wellness', emoji: '💆', sub: 'Massage Redemptions' },
                    { id: 'hair', label: 'TS Hair Salon', emoji: '✂️', sub: 'Hair & Beauty' }
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
                                <span className="text-4xl font-serif font-bold text-[#2c2420]">{(stats as any).shopIssued[shop.id]}</span>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Total Issued</p>
                            </div>
                            <div className="pb-1">
                                <span className="text-2xl font-serif font-bold text-[#c5a572]">{(stats as any).shopTotals[shop.id]}</span>
                                <p className="text-[9px] text-[#c5a572] font-bold uppercase mt-0.5">Redeemed</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                    <TrendingUp size={20} className="mx-auto mb-3 text-green-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total Redeemed</p>
                    <h3 className="text-2xl font-serif font-bold">{stats.totalRedemptions}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                    <Zap size={20} className="mx-auto mb-3 text-orange-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Conv. Rate</p>
                    <h3 className="text-2xl font-serif font-bold">{stats.redemptionRate}%</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                    <Tag size={20} className="mx-auto mb-3 text-blue-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total Pool</p>
                    <h3 className="text-2xl font-serif font-bold">{stats.totalIssuedPool}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
                    <Users size={20} className="mx-auto mb-3 text-purple-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Unique Guests</p>
                    <h3 className="text-2xl font-serif font-bold">{stats.uniqueGuests}</h3>
                </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-serif font-bold text-gray-900">Recent Activity</h3>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{stats.recentActivity.length} Records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-[9px] font-bold uppercase tracking-widest text-gray-400 border-b">
                                <th className="px-6 py-4">Guest / Room</th>
                                <th className="px-6 py-4">Voucher</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {stats.recentActivity.slice(0, 20).map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 text-xs">{r.guestName}</div>
                                        <div className="text-[10px] text-gray-400">Room {r.roomNumber}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => onViewVoucher?.(r.voucherCode)} className="text-xs font-mono font-bold text-[#c5a572] hover:underline uppercase">
                                            {r.voucherCode}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] border border-gray-200 px-2 py-0.5 rounded font-bold uppercase text-gray-500">{r.serviceType}</span>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-400">
                                        {new Date(r.timestamp).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
