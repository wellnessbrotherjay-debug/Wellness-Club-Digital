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

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ vouchers, redemptions }) => {
    // --- State ---
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'launch' | 'custom'>('all');
    const [startDate] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');

    const EXCLUDE_NAMES = useMemo(() => [
        'test', 'samual', 'jay', 'diag', 'agent', 'fix'
    ], []);

    const isTestAccount = useCallback((name: string, code: string) => {
        const n = String(name || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        if (c.startsWith('test-')) return true;

        // Exact whole-word matching for 'jay' and 'samual' to avoid matching 'Wijaya'
        return EXCLUDE_NAMES.some(tn => {
            if (tn === 'jay' || tn === 'samual') {
                const regex = new RegExp(`\\b${tn}\\b`, 'i');
                return regex.test(n);
            }
            return n.includes(tn);
        });
    }, [EXCLUDE_NAMES]);

    // Precise Category Matching
    const getCategoryStrict = useCallback((serviceStr: string, explicitCategory?: string) => {
        if (explicitCategory && explicitCategory !== 'other') return explicitCategory;

        const s = String(serviceStr || '').toLowerCase().trim();
        if (s.includes('t store') || s.includes('shopping')) return 'fashion';
        if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'hair';
        return 'wellness';
    }, []);

    const smartPax = useCallback((pax: string | number | undefined, name: string) => {
        const p = Number(pax);
        // If explicit pax is > 1, we trust it (e.g. 12 Pax for Mrs Sanlie Dewi)
        if (pax && !isNaN(p) && p > 1) return p;

        // If pax is missing or 1, we count guests in the name string
        const n = String(name || '').toLowerCase().trim();
        if (!n) return (pax && !isNaN(p) && p > 0) ? p : 1;

        // Split by common separators and count valid segments
        const segments = n.split(/&| and | \+ | \/ /).filter(s => s.trim().length > 0);
        if (segments.length > 1) return segments.length;

        // Fallback to the numeric value if provided, or 1
        return (pax && !isNaN(p) && p > 0) ? p : 1;
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
                    is_test: (v as unknown as Record<string, unknown>)?.is_test === 'TRUE' || isTestAccount(r.guestName || (v as unknown as Record<string, unknown>)?.guestName as string || '', r.voucherCode || ''),
                    explicitCategory: (r as unknown as Record<string, unknown>).category as string || (v as unknown as Record<string, unknown>)?.category as string
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
                    is_test: (v as unknown as Record<string, unknown>).is_test === 'TRUE' || isTestAccount(v.guestName || '', v.id || ''),
                    explicitCategory: (v as unknown as Record<string, unknown>).category as string
                }));

        // 2. Filter out test records and Unknown Guests
        const realData = baseData.filter(r => !r.is_test && r.guestName !== 'Unknown Guest');

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
        const launchDate = new Date('2026-02-01');

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
                getCategoryStrict(r.serviceType, (r as Record<string, unknown>).explicitCategory as string) === serviceCategory
            );
        }

        const voucherMap = new Map(vouchers.map(v => [v.id?.toUpperCase(), v]));

        // 2. Issued Vouchers Pool (The total number of vouchers ever created in this category)
        const realVouchers = vouchers.filter(v => {
            if (!v.guestName || v.guestName === 'Unknown Guest') return false;
            if ((v as unknown as Record<string, unknown>).is_test === 'TRUE' || isTestAccount(v.guestName || '', v.id || '')) return false;
            return true;
        });

        const shopIssued = {
            fashion: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as unknown as Record<string, unknown>).category as string) === 'fashion').length,
            hair: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as unknown as Record<string, unknown>).category as string) === 'hair').length,
            wellness: realVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as unknown as Record<string, unknown>).category as string) === 'wellness').length
        };

        const totalVouchersPool = realVouchers.length;
        const totalPaxPool = realVouchers.reduce((sum, v) => sum + smartPax(v.pax, v.guestName), 0);

        // Map for looking up Pax during redemptions
        const voucherPaxMap = new Map(realVouchers.map(v => [v.id, smartPax(v.pax, v.guestName)]));

        // Shop Redeemed Totals (Subset of Issued)
        const shopTotals = {
            fashion: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as unknown as Record<string, unknown>).explicitCategory as string) === 'fashion').length,
            hair: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as unknown as Record<string, unknown>).explicitCategory as string) === 'hair').length,
            wellness: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as unknown as Record<string, unknown>).explicitCategory as string) === 'wellness').length
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

        const totalRedemptions = filteredRedemptions.length;
        const totalPaxRedeemed = filteredRedemptions.reduce((sum, r) => {
            const v = voucherMap.get(r.voucherCode?.toUpperCase());
            return sum + (voucherPaxMap.get(r.voucherCode) || smartPax((r as unknown as Record<string, unknown>).pax as string | number, r.guestName || (v as unknown as Record<string, unknown>)?.guestName as string || ''));
        }, 0);
        const redemptionRate = totalVouchersPool > 0 ? Math.round((totalRedemptions / totalVouchersPool) * 100) : 0;
        const paxRedemptionRate = totalPaxPool > 0 ? Math.round((totalPaxRedeemed / totalPaxPool) * 100) : 0;

        return {
            totalRedemptions,
            totalPaxRedeemed,
            totalVouchersPool,
            totalPaxPool,
            redemptionRate,
            paxRedemptionRate,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            shopTotals,
            shopIssued,
            serviceCounts,
            dailyCounts: Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0])),
            dailyIssuedCounts: Object.entries(dailyIssuedCounts).sort((a, b) => a[0].localeCompare(b[0])), // Renamed from dailyCreatedCounts to match existing variable
            recentActivity: filteredRedemptions.slice(0, 10).map(r => ({
                id: r.voucherCode,
                guest: r.guestName,
                service: r.serviceType,
                time: r.timestamp,
                room: r.roomNumber
            }))
        };
    }, [vouchers, timeRange, startDate, endDate, serviceCategory, getCategoryStrict, smartPax, effectiveRedemptions, isTestAccount]);

    const downloadReport = () => {
        const now = new Date();
        const today = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const { dailyIssuedCounts, dailyCounts, serviceCounts, totalRedemptions, totalPaxRedeemed, totalVouchersPool, totalPaxPool, redemptionRate, paxRedemptionRate } = stats;
        const issuedMap = Object.fromEntries(dailyIssuedCounts);
        const redeemedMap = Object.fromEntries(dailyCounts);
        const allDates = [...new Set([...Object.keys(issuedMap), ...Object.keys(redeemedMap)])].sort((a, b) => b.localeCompare(a));

        const dailyRows = allDates.map(date => {
            const issued = (issuedMap as Record<string, number>)[date] || 0;
            const redeemed = (redeemedMap as Record<string, number>)[date] || 0;
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
.kpi{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.kpi-box{flex:1;min-width:140px;border:1px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center}
.kpi-label{font-size:9px;font-weight:bold;text-transform:uppercase;color:#888;margin:0}
.kpi-val{font-size:24px;font-weight:bold;margin:4px 0 0}
@media print{button{display:none}}
</style></head><body>
<h1>📊 No.1 Wellness Voucher Report</h1>
<p style="color:#888;font-size:13px">Generated: ${today} &nbsp;·&nbsp; Filter: ${timeRange}</p>
<div class="kpi">
  <div class="kpi-box"><p class="kpi-label">Vouchers Issued</p><p class="kpi-val" style="color:#9a7a52">${totalVouchersPool}</p></div>
  <div class="kpi-box"><p class="kpi-label">Vouchers Redeemed</p><p class="kpi-val" style="color:#1a7a4a">${totalRedemptions}</p></div>
  <div class="kpi-box"><p class="kpi-label">Voucher Conv. Rate</p><p class="kpi-val" style="color:#4444bb">${redemptionRate}%</p></div>
</div>
<div class="kpi">
  <div class="kpi-box"><p class="kpi-label">Total Pax Issued</p><p class="kpi-val" style="color:#9a7a52">${totalPaxPool}</p></div>
  <div class="kpi-box"><p class="kpi-label">Total Pax Redeemed</p><p class="kpi-val" style="color:#1a7a4a">${totalPaxRedeemed}</p></div>
  <div class="kpi-box"><p class="kpi-label">Pax Conv. Rate</p><p class="kpi-val" style="color:#4444bb">${paxRedemptionRate}%</p></div>
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
            getCategoryStrict(r.serviceType, (r as Record<string, unknown>).explicitCategory as string)
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
                    <h4 className="font-bold text-white">🔍 Analytics Pipeline v4.9</h4>
                    <span className="text-[10px] text-gray-500">Mode: Google Sheets Only</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <p className="text-gray-400">Total Vouchers: {stats.totalVouchersPool}</p>
                        <p className="text-gray-400">Total Pax Issued: {stats.totalPaxPool}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-cyan-400">Filter: {timeRange} | {serviceCategory}</p>
                        <p className="text-amber-400">Pax Rate: {stats.paxRedemptionRate}%</p>
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

                    <select value={timeRange} onChange={e => setTimeRange(e.target.value as 'all' | 'launch' | 'month' | 'week')} className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-all focus:ring-2 focus:ring-[#c5a572]/20">
                        <option value="all">All Time</option>
                        <option value="launch">Since Launch</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                    </select>

                    <select value={serviceCategory} onChange={e => setServiceCategory(e.target.value as 'all' | 'wellness' | 'fashion' | 'hair')} className="bg-gray-50 border rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-all focus:ring-2 focus:ring-[#c5a572]/20">
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
                                <span className="text-4xl font-serif font-bold text-[#2c2420]">{stats.shopIssued[shop.id as keyof typeof stats.shopIssued]}</span>
                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Total Issued</p>
                            </div>
                            <div className="pb-1">
                                <span className="text-2xl font-serif font-bold text-[#c5a572]">{stats.shopTotals[shop.id as keyof typeof stats.shopTotals]}</span>
                                <p className="text-[9px] text-[#c5a572] font-bold uppercase mt-0.5">Redeemed</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Global Stats - Updated with Pax */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <TrendingUp size={20} className="mx-auto mb-3 text-green-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total Redeemed</p>
                    <h3 className="text-2xl font-serif font-bold text-gray-900">{stats.totalRedemptions}</h3>
                    <p className="text-[10px] text-green-600 font-bold mt-1">{stats.totalPaxRedeemed} Pax</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <Zap size={20} className="mx-auto mb-3 text-orange-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Voucher Rate</p>
                    <h3 className="text-2xl font-serif font-bold text-gray-900">{stats.redemptionRate}%</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <Tag size={20} className="mx-auto mb-3 text-blue-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Total Pool</p>
                    <h3 className="text-2xl font-serif font-bold text-gray-900">{stats.totalVouchersPool}</h3>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">{stats.totalPaxPool} Pax Issued</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <Users size={20} className="mx-auto mb-3 text-purple-500" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Pax Conv. Rate</p>
                    <h3 className="text-2xl font-serif font-bold text-gray-900">{stats.paxRedemptionRate}%</h3>
                    <p className="text-[10px] text-purple-600 font-bold mt-1">{stats.uniqueGuests} Unique</p>
                </div>
            </div>

            {/* Recent Activity Table removed (Obsolete per request) */}
        </div>
    );
};

export default AnalyticsDashboard;
