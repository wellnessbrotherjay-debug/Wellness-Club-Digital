import React, { useState, useMemo, useCallback } from 'react';
import {
    BarChart,
    TrendingUp,
    Users,
    Zap,
    ChevronDown,
    Download,
    Mail,
    Send,
    ArrowRight,
    Search,
    Calendar,
    RefreshCw,
    Info,
    CheckCircle2,
    Clock,
    Tag,
    Lock
} from 'lucide-react';

interface VoucherData {
    id: string;
    guestName: string;
    roomNumber: string;
    status: string;
    serviceType: string;
    created_at?: string;
    redeemed_at?: string;
    pax?: number;
    checkIn?: string;
    checkOut?: string;
    expires_at?: string;
    redeemed_service?: string;
    category?: string;
    is_test?: string;
}

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
    roomNumber: string;
    isManual?: boolean;
    category?: string;
}

interface AnalyticsDashboardProps {
    vouchers: VoucherData[];
    redemptions: RedemptionData[];
    onViewVoucher?: (id: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ vouchers, redemptions, onViewVoucher }) => {
    // --- State ---
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month' | 'launch' | 'custom'>('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');
    const [sendReportStatus, setSendReportStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [showSendMenu, setShowSendMenu] = useState(false);

    // Activity Log filters
    const [logTimeRange, setLogTimeRange] = useState<'all' | 'week' | 'month' | 'custom'>('all');
    const [logStartDate, setLogStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Drill-down states
    const [selectedSpeedCategory, setSelectedSpeedCategory] = useState<string | null>(null);
    const [drillDownType, setDrillDownType] = useState<'digital' | 'fashion' | 'hair' | 'wellness' | 'guests' | 'issued' | 'unredeemed' | null>(null);

    const EXCLUDE_NAMES = useMemo(() => [
        'jay', 'sam', 'sammy', 'idc prodons', 'wellness brother',
        'test', 'test weather', 'fix verification', 'diag test', 'agent diagnostic'
    ], []);

    const isTestAccount = useCallback((name: string, code: string) => {
        const n = String(name || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        if (c.startsWith('test-')) return true;
        return EXCLUDE_NAMES.some(tn => n.includes(tn));
    }, [EXCLUDE_NAMES]);

    // Unified manual entry detection (Simplified per user request)
    const checkIsManual = useCallback(() => {
        return false;
    }, []);

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
                .filter(v => v.status === 'Redeemed')
                .map(v => ({
                    timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                    voucherCode: v.id,
                    guestName: v.guestName || 'Unknown Guest',
                    serviceType: v.redeemed_service || v.serviceType || '',
                    roomNumber: v.roomNumber || '',
                    isManual: false,
                    is_test: (v as any).is_test === 'TRUE' || isTestAccount(v.guestName || '', v.id || ''),
                    explicitCategory: (v as any).category
                }));

        // Filter out tests
        const realData = baseData.filter(r => !r.is_test);

        // Deduplicate: Allow 1 redemption PER CATEGORY per voucher in a 5-min window
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
                    isManual: checkIsManual(),
                    derivedCategory: cat
                });
            }
        }
        return final;
    }, [redemptions, vouchers, isTestAccount, getCategoryStrict, checkIsManual]);

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

        // 1. Time Range Filtering
        let currentRedemptions = effectiveRedemptions;
        if (timeRange === 'week') {
            currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp) && parseDate(r.timestamp)! >= oneWeekAgo);
        } else if (timeRange === 'month') {
            currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp) && parseDate(r.timestamp)! >= oneMonthAgo);
        } else if (timeRange === 'launch') {
            currentRedemptions = currentRedemptions.filter(r => parseDate(r.timestamp) && parseDate(r.timestamp)! >= launchDate);
        } else if (timeRange === 'custom') {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= start && d <= end;
            });
        }

        // Apply Category Filter for the main list/stats
        let filteredRedemptions = currentRedemptions;
        if (serviceCategory !== 'all') {
            filteredRedemptions = currentRedemptions.filter(r =>
                getCategoryStrict(r.serviceType, (r as any).explicitCategory) === serviceCategory
            );
        }

        // Shop Breakdown Totals
        const shopTotals = {
            fashion: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'fashion').length,
            hair: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'hair').length,
            wellness: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'wellness').length
        };

        const shopGuests = {
            fashion: new Set(currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'fashion').map(r => r.guestName)).size,
            hair: new Set(currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'hair').map(r => r.guestName)).size,
            wellness: new Set(currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'wellness').map(r => r.guestName)).size
        };

        const serviceCounts: Record<string, number> = {};
        const dailyCounts: Record<string, number> = {};

        filteredRedemptions.forEach(r => {
            serviceCounts[r.serviceType] = (serviceCounts[r.serviceType] || 0) + 1;
            const d = parseDate(r.timestamp);
            if (d) {
                const key = d.toISOString().split('T')[0];
                dailyCounts[key] = (dailyCounts[key] || 0) + 1;
            }
        });

        // --- Daily Issued Counts ---
        const dailyIssuedCounts: Record<string, number> = {};
        vouchers.forEach(v => {
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

        const redeemedPax = filteredRedemptions.reduce((sum, r) => {
            const voucher = vouchers.find(v => v.id === r.voucherCode);
            return sum + (voucher?.pax || 1);
        }, 0);

        const validRedemptionsForSpeed = filteredRedemptions
            .map(r => vouchers.find(v => v.id === r.voucherCode))
            .filter(v => v && v.status === 'Redeemed' && v.created_at && v.redeemed_at)
            .filter(v => {
                const createdDate = new Date(v!.created_at!);
                const redeemedDate = new Date(v!.redeemed_at!);
                return !isNaN(createdDate.getTime()) && !isNaN(redeemedDate.getTime());
            });

        const redemptionSpeedData = validRedemptionsForSpeed.map(v => {
            const createdDate = new Date(v!.created_at!);
            const redeemedDate = new Date(v!.redeemed_at!);
            const normalizedCreated = new Date(createdDate);
            normalizedCreated.setHours(0, 0, 0, 0);
            const normalizedRedeemed = new Date(redeemedDate);
            normalizedRedeemed.setHours(0, 0, 0, 0);
            const daysToRedeem = Math.max(0, Math.floor((normalizedRedeemed.getTime() - normalizedCreated.getTime()) / (1000 * 60 * 60 * 24)));
            const stayDuration = v!.checkOut ? Math.max(1, Math.round((new Date(v!.checkOut).getTime() - new Date(v!.checkIn || v!.created_at!).getTime()) / (1000 * 60 * 60 * 24))) : 0;

            return {
                voucherCode: v!.id,
                guestName: v!.guestName || '',
                roomNumber: v!.roomNumber,
                daysToRedeem,
                stayDuration,
                redeemedAt: v!.redeemed_at || '',
                issuedAt: v!.created_at || '',
                category: daysToRedeem === 0 ? 'Same Day' : daysToRedeem === 1 ? '1 Day' : daysToRedeem === 2 ? '2 Days' : daysToRedeem === 3 ? '3 Days' : '4+ Days'
            };
        });

        const redemptionSpeedBreakdown = {
            sameDay: redemptionSpeedData.filter(r => r.category === 'Same Day').length,
            oneDay: redemptionSpeedData.filter(r => r.category === '1 Day').length,
            twoDays: redemptionSpeedData.filter(r => r.category === '2 Days').length,
            threeDays: redemptionSpeedData.filter(r => r.category === '3 Days').length,
            fourPlusDays: redemptionSpeedData.filter(r => r.category === '4+ Days').length,
            total: redemptionSpeedData.length
        };

        let unredeemedVouchers = vouchers.filter(v => v.status !== 'Redeemed');
        if (timeRange === 'week') { unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= oneWeekAgo); }
        else if (timeRange === 'month') { unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= oneMonthAgo); }
        else if (timeRange === 'launch') { unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= launchDate); }
        else if (timeRange === 'custom') {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            unredeemedVouchers = unredeemedVouchers.filter(v => {
                const d = parseDate(v.created_at || '');
                return d && d >= start && d <= end;
            });
        }

        let filteredUnredeemed = unredeemedVouchers;
        if (serviceCategory !== 'all') {
            filteredUnredeemed = unredeemedVouchers.filter(v => getCategoryStrict(v.serviceType || '') === serviceCategory);
        }

        const totalIssuedInPeriod = filteredRedemptions.length + filteredUnredeemed.length;
        const finalIssuedTotal = (timeRange === 'all' && serviceCategory === 'all')
            ? vouchers.filter(v => v.id && !(v as any).is_test).length
            : totalIssuedInPeriod;

        const shopIssued = {
            fashion: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'fashion').length +
                unredeemedVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'fashion').length,
            hair: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'hair').length +
                unredeemedVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'hair').length,
            wellness: currentRedemptions.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === 'wellness').length +
                unredeemedVouchers.filter(v => getCategoryStrict(v.serviceType || '', (v as any).category) === 'wellness').length
        };

        const redemptionRate = finalIssuedTotal > 0 ? Math.round((filteredRedemptions.length / finalIssuedTotal) * 100) : 0;

        return {
            totalRedemptions: filteredRedemptions.length,
            totalRedeemedPax: redeemedPax,
            totalIssuedInPeriod: finalIssuedTotal,
            redemptionRate,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            serviceCounts,
            shopTotals,
            shopIssued,
            shopGuests,
            dailyCounts: Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0])),
            dailyIssuedCounts,
            recentActivity: [...filteredRedemptions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            allFilteredRedemptions: filteredRedemptions,
            totalUnredeemedInPeriod: filteredUnredeemed.filter(v => {
                const hasName = v.guestName && v.guestName !== 'Unknown Guest';
                const expiryDate = v.checkOut ? new Date(v.checkOut) : (v.expires_at ? new Date(v.expires_at) : null);
                const isExpired = expiryDate ? (expiryDate.getTime() < (new Date().setHours(0, 0, 0, 0))) : false;
                return hasName && !isExpired;
            }).length,
            filteredUnredeemed,
            redemptionSpeedBreakdown,
            redemptionSpeedData
        };
    }, [redemptions, vouchers, timeRange, startDate, endDate, serviceCategory, getCategoryStrict, effectiveRedemptions]);

    const logData = useMemo(() => {
        let data = effectiveRedemptions;
        if (serviceCategory !== 'all') { data = data.filter(r => getCategoryStrict(r.serviceType, (r as any).explicitCategory) === serviceCategory); }
        // Simple sorting for log
        return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [effectiveRedemptions, serviceCategory, getCategoryStrict]);

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

    const downloadReport = () => {
        const reportContent = `Digital Wellness Voucher Report - ${new Date().toLocaleDateString()}\nTotal Issued: ${stats.totalIssuedInPeriod}\nTotal Redeemed: ${stats.totalRedemptions}\nRedemption Rate: ${stats.redemptionRate}%`;
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Voucher_Report_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="bg-gray-900 text-green-400 p-4 rounded-2xl font-mono text-xs">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white">🔍 Data Debug Panel</h4>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-400 mb-1">Vouchers from Sheet: {vouchers.length}</p>
                            <p className="text-gray-400 mb-1">Redemptions from Sheet: {redemptions.length}</p>
                            <p className="text-cyan-400 font-bold mt-2">📊 Analytics Base: Digital Flow Only</p>
                        </div>
                        <div>
                            <p className="text-gray-400 mb-1">Launch Date: Feb 4, 2026</p>
                            <p className="text-gray-400 mb-1">Current Filter: {timeRange}</p>
                            <p className="text-gray-400 mb-1">Service Filter: {serviceCategory}</p>
                            <p className="text-amber-400 mb-1 font-bold">Redemption Rate: {stats.redemptionRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm gap-4">
                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 text-gray-400">
                        <BarChart size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Performance Config</span>
                    </div>
                    {timeRange === 'custom' && (
                        <div className="flex items-center gap-4 animate-scale-in">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">From</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">To</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="bg-gray-50 border rounded-lg px-4 py-2 text-xs font-bold uppercase">
                        <option value="all">All Time</option>
                        <option value="launch">Since Launch</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                    </select>
                    <select value={serviceCategory} onChange={e => setServiceCategory(e.target.value as any)} className="bg-gray-50 border rounded-lg px-4 py-2 text-xs font-bold uppercase">
                        <option value="all">All Units</option>
                        <option value="wellness">Wellness</option>
                        <option value="fashion">T Store</option>
                        <option value="hair">Hair Salon</option>
                    </select>
                    <button onClick={exportToCSV} className="bg-gray-100 px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2"><Download size={15} /> CSV</button>
                    <button onClick={downloadReport} className="bg-[#c5a572] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase">Download Report</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'fashion', label: 'T Store', emoji: '🛍️', sub: 'Fashion Redemptions', color: 'text-pink-400' },
                    { id: 'wellness', label: 'No.1 Wellness', emoji: '💆', sub: 'Massage Redemptions', color: 'text-green-400' },
                    { id: 'hair', label: 'TS Hair Salon', emoji: '✂️', sub: 'Hair & Beauty', color: 'text-purple-400' }
                ].map(shop => (
                    <div key={shop.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">{shop.label}</h3>
                                <p className="text-[10px] text-gray-400 font-medium">{shop.sub}</p>
                            </div>
                            <span className="text-xl">{shop.emoji}</span>
                        </div>
                        <div className="flex items-baseline gap-4 mt-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold">{(stats as any).shopIssued[shop.id]}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Issued</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold text-[#c5a572]">{(stats as any).shopTotals[shop.id]}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Redeemed</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center text-[10px] font-bold uppercase text-gray-400">
                            <span>Unique Guests</span>
                            <span className="text-[#2c2420]">{(stats as any).shopGuests[shop.id]}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div onClick={() => setDrillDownType('digital')} className="bg-white p-6 rounded-2xl shadow-sm border text-center cursor-pointer">
                    <TrendingUp size={24} className="mx-auto mb-4 text-green-600" />
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Redeemed</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.totalRedemptions}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                    <Clock size={24} className="mx-auto mb-4 text-amber-600" />
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Avg. Conversion</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.redemptionRate}%</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                    <Tag size={24} className="mx-auto mb-4 text-blue-600" />
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Issued Total</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.totalIssuedInPeriod}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
                    <Users size={24} className="mx-auto mb-4 text-purple-600" />
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Unique Guests</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.uniqueGuests}</h3>
                </div>
            </div>

            {/* Redemption Speed Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                    <Zap className="text-amber-500" size={20} />
                    <h3 className="font-serif font-bold text-lg">Redemption Speed Analysis</h3>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    {[
                        { label: 'Same Day', count: stats.redemptionSpeedBreakdown.sameDay, color: 'bg-green-500' },
                        { label: '1 Day', count: stats.redemptionSpeedBreakdown.oneDay, color: 'bg-blue-500' },
                        { label: '2 Days', count: stats.redemptionSpeedBreakdown.twoDays, color: 'bg-yellow-500' },
                        { label: '3 Days', count: stats.redemptionSpeedBreakdown.threeDays, color: 'bg-orange-500' },
                        { label: '4+ Days', count: stats.redemptionSpeedBreakdown.fourPlusDays, color: 'bg-red-500' },
                    ].map(item => {
                        const pct = stats.redemptionSpeedBreakdown.total > 0 ? Math.round((item.count / stats.redemptionSpeedBreakdown.total) * 100) : 0;
                        return (
                            <div key={item.label} className="text-center">
                                <div className="text-2xl font-bold mb-1">{item.count}</div>
                                <div className="text-[10px] font-bold uppercase text-gray-400 mb-2">{item.label}</div>
                                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{pct}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-serif font-bold text-lg">Redemption Activity</h3>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{logData.length} Live Records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                <th className="px-6 py-4">Guest / Room</th>
                                <th className="px-6 py-4">Voucher</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logData.slice(0, 50).map((r, i) => (
                                <tr key={i} className="hover:bg-amber-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{r.guestName}</div>
                                        <div className="text-[10px] text-gray-400">Room {r.roomNumber}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => onViewVoucher?.(r.voucherCode)}
                                            className="text-xs font-mono font-bold text-amber-600 hover:underline"
                                        >
                                            {r.voucherCode}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded font-medium text-gray-700">{r.serviceType}</span>
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
