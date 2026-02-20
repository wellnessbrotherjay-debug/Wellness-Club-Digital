import React, { useMemo, useState } from 'react';
import {
    BarChart, TrendingUp, Users,
    Activity, CheckCircle, Clock, X, Download, Zap, ChevronDown
} from 'lucide-react';
import { useVoucherData } from '../hooks/useVoucherData';

import type { VoucherData } from '../VoucherPage';

interface AnalyticsDashboardProps {
    onViewVoucher?: (voucher: VoucherData) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onViewVoucher }) => {
    const {
        vouchers,
        redemptions,
        refresh,
        // isFetching, // Removed unused variables
        // hasLoaded
    } = useVoucherData();

    const [timeRange, setTimeRange] = useState<'launch' | 'week' | 'month' | 'latest' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default to last 7 days
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');
    const [showDebug, setShowDebug] = useState(false);
    const [showHotelVouchers, setShowHotelVouchers] = useState(true); // Default to show ALL redemptions (hotel + POS)

    // --- Local Activity Log Filter State ---
    const [logTimeRange, setLogTimeRange] = useState<'week' | 'month' | 'all' | 'custom'>('all');
    const [logStartDate, setLogStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [logEndDate, setLogEndDate] = useState(new Date().toISOString().split('T')[0]);

    // --- Redemption Speed Detail State ---
    const [selectedSpeedCategory, setSelectedSpeedCategory] = useState<string | null>(null);

    // --- KPI Drill-down State ---
    const [drillDownType, setDrillDownType] = useState<'digital' | 'manual' | 'active' | 'unique' | null>(null);

    // Service categorization with typo tolerance
    const normalizeServiceName = (service: string): string => {
        return String(service || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')  // Remove extra spaces
            .replace(/pilates/g, 'pilates')  // Fix common typo
            .replace(/yoga/g, 'yoga');  // Fix common typo
    };

    // Unified Service Categorization
    const getServiceCategory = (service: string): string => {
        const s = normalizeServiceName(service);
        // T Store / Fashion
        if (s.includes('shopping') || s.includes('t store') || s.includes('fashion') || s.includes('apparel') || s.includes('boutique')) return 'fashion';

        // Hair Salon
        if (s.includes('salon') || s.includes('hair') || s.includes('pedi') || s.includes('mani') || s.includes('facial') || s.includes('beauty') || s.includes('waxing')) return 'hair';

        // Default to Wellness (Massage, Yoga, etc)
        return 'wellness';
    };

    // Unified manual entry detection
    const checkIsManual = (room: string, code: string) => {
        const r = String(room || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        // If code is empty or doesn't start with NW- or TEST-, it's POS/Manual
        if (!c || (!c.startsWith('nw-') && !c.startsWith('test-'))) return true;
        // Legacy/explicit manual tags OR currency symbol in room field
        return r.includes('tss') || r.includes('$') || c.startsWith('manual-');
    };

    // Calculate effective redemptions at component level
    const effectiveRedemptions = useMemo(() => {
        const baseData = redemptions.length > 0 ? redemptions : vouchers
            .filter(v => v.status === 'Redeemed')
            .map(v => ({
                timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                voucherCode: v.id,
                guestName: v.guestName || 'Unknown Guest',
                // CRITICAL: Prioritize serviceType (new entries) > redeemed_service > services column (manual entries)
                // Exclude generic "15% off" text from services array
                // CRITICAL FIX: Do not ignore services with "15%" in the name. 
                // Many valid T-Store/Salon redemptions contain "15%".
                serviceType: v.serviceType || v.redeemed_service || (v.services && v.services.length > 0 ? v.services[0] : 'Wellness Service'),
                roomNumber: v.roomNumber || '',
                isManual: false,
                inputPath: ''
            }));

        return baseData.map(r => ({
            ...r,
            isManual: checkIsManual(r.roomNumber, r.voucherCode)
        }));
    }, [redemptions, vouchers]);

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        const now = new Date();
        const launchDate = new Date(2026, 1, 4); // Feb 4, 2026 - actual launch date
        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let currentRedemptions = effectiveRedemptions;

        // Filter: Show ONLY manual POS entries if showHotelVouchers is false
        if (!showHotelVouchers) {
            currentRedemptions = currentRedemptions.filter((r: any) => r.isManual);
        }

        if (timeRange === 'week') {
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneWeekAgo;
            });
        } else if (timeRange === 'month') {
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneMonthAgo;
            });
        } else if (timeRange === 'launch') {
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= launchDate;
            });
        } else if (timeRange === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            currentRedemptions = currentRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= start && d <= end;
            });
        } else if (timeRange === 'latest') {
            // No date filter for latest, we just slice later
        }

        // Apply Category Filter for the main list/stats
        let filteredRedemptions = currentRedemptions;
        if (serviceCategory !== 'all') {
            filteredRedemptions = currentRedemptions.filter(r =>
                getServiceCategory(r.serviceType) === serviceCategory
            );
        }

        // Shop Breakdown Totals
        const shopTotals = {
            fashion: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'fashion').length,
            hair: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'hair').length,
            wellness: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'wellness').length
        };

        const shopGuests = {
            fashion: new Set(currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'fashion').map(r => r.guestName)).size,
            hair: new Set(currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'hair').map(r => r.guestName)).size,
            wellness: new Set(currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'wellness').map(r => r.guestName)).size
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

        const manualRedemptions = filteredRedemptions.filter(r => r.isManual).length;

        // Calculate Redeemed Pax
        const redeemedPax = filteredRedemptions.reduce((sum, r) => {
            const voucher = vouchers.find(v => v.id === r.voucherCode);
            return sum + (voucher?.pax || 1);
        }, 0);

        // Calculate Redemption Speed (days from issuance (created_at) to redemption)
        // Use filteredRedemptions to respect the selected filters (Service Category & Time Range)
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

            // Normalize both dates to midnight to calculate pure calendar days
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

        // UNIFIED STATS RECONCILIATION:
        // Total Issued = (Redemptions in period) + (Active Vouchers created in period)
        // This ensures Issued = Redeemed + Active.

        // 1. Get Unredeemed Vouchers for the period
        let unredeemedVouchers = vouchers.filter(v => !v.status || v.status !== 'Redeemed');
        if (timeRange === 'week') {
            unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= oneWeekAgo);
        } else if (timeRange === 'month') {
            unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= oneMonthAgo);
        } else if (timeRange === 'launch') {
            unredeemedVouchers = unredeemedVouchers.filter(v => parseDate(v.created_at || '') && parseDate(v.created_at || '')! >= launchDate);
        } else if (timeRange === 'custom') {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            unredeemedVouchers = unredeemedVouchers.filter(v => {
                const d = parseDate(v.created_at || '');
                return d && d >= start && d <= end;
            });
        }

        // Apply Category Filter to Unredeemed Vouchers
        let filteredUnredeemed = unredeemedVouchers;
        if (serviceCategory !== 'all') {
            filteredUnredeemed = unredeemedVouchers.filter(v => getServiceCategory(v.serviceType || '') === serviceCategory);
        }

        const totalIssuedInPeriod = filteredRedemptions.length + filteredUnredeemed.length;

        // Categorize Issued Vouchers for Shop Breakdown
        const shopIssued = {
            fashion: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'fashion').length +
                unredeemedVouchers.filter(v => getServiceCategory(v.serviceType || '') === 'fashion').length,
            hair: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'hair').length +
                unredeemedVouchers.filter(v => getServiceCategory(v.serviceType || '') === 'hair').length,
            wellness: currentRedemptions.filter(r => getServiceCategory(r.serviceType) === 'wellness').length +
                unredeemedVouchers.filter(v => getServiceCategory(v.serviceType || '') === 'wellness').length
        };

        const redemptionRate = totalIssuedInPeriod > 0
            ? Math.round((filteredRedemptions.length / totalIssuedInPeriod) * 100)
            : 0;

        const systemRedemptions = filteredRedemptions.length - manualRedemptions;

        return {
            totalRedemptions: filteredRedemptions.length,
            totalRedeemedPax: redeemedPax,
            manualRedemptions,
            systemRedemptions,
            totalIssuedInPeriod,
            redemptionRate,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            serviceCounts,
            shopTotals, // Existing Redeemed counts
            shopIssued, // New Issued counts
            shopGuests,
            dailyCounts: Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0])),
            recentActivity: [...filteredRedemptions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            allFilteredRedemptions: filteredRedemptions,
            totalUnredeemedInPeriod: filteredUnredeemed.length,
            filteredUnredeemed, // List for drill-down
            redemptionSpeedBreakdown,
            redemptionSpeedData
        };
    }, [redemptions, vouchers, timeRange, startDate, endDate, serviceCategory, showHotelVouchers]);


    // --- Independent Activity Log Data ---
    const logData = useMemo(() => {
        let data = effectiveRedemptions;

        // 1. Apply Global Unit/Type Filters (to keep consistency with what user is looking at contextually)
        if (!showHotelVouchers) {
            data = data.filter((r: any) => r.isManual);
        }
        if (serviceCategory !== 'all') {
            data = data.filter(r => getServiceCategory(r.serviceType) === serviceCategory);
        }

        // 2. Apply Local Time Filter
        const now = new Date();
        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        if (logTimeRange === 'week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            data = data.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneWeekAgo;
            });
        } else if (logTimeRange === 'month') {
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            data = data.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneMonthAgo;
            });
        } else if (logTimeRange === 'custom') {
            const start = new Date(logStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(logEndDate);
            end.setHours(23, 59, 59, 999);
            data = data.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= start && d <= end;
            });
        }

        // Always sort new to old
        return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [effectiveRedemptions, showHotelVouchers, serviceCategory, logTimeRange, logStartDate, logEndDate]);


    const exportToCSV = () => {
        const headers = ["Timestamp", "Voucher Code", "Guest Name", "Room Number", "Service Type"];
        const rows = stats.allFilteredRedemptions.map(r => {
            const guest = String(r.guestName || "Guest").replace(/"/g, '""');
            const service = String(r.serviceType || "Service").replace(/"/g, '""');
            return [
                new Date(r.timestamp).toLocaleString(),
                r.voucherCode,
                `"${guest}"`,
                r.roomNumber || 'N/A',
                `"${service}"`
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `voucher_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* Debug Panel */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-2xl font-mono text-xs">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white">🔍 Data Debug Panel</h4>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                    >
                        {showDebug ? 'Hide' : 'Show'}
                    </button>
                </div>
                {showDebug && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 mb-1">Vouchers from Sheet: {vouchers.length}</p>
                                <p className="text-gray-400 mb-1">Redemptions from Sheet: {redemptions.length}</p>
                                <p className="text-gray-400 mb-1">Using: {redemptions.length > 0 ? 'Redemptions array' : 'Vouchers (Redeemed)'}</p>
                                <p className="text-cyan-400 font-bold mt-2">📊 Show Hotel Vouchers: {showHotelVouchers ? 'YES' : 'NO (POS only)'}</p>
                                <p className="text-orange-400 text-[10px]">Manual POS entries: {
                                    effectiveRedemptions.filter((r: any) => r.isManual).length
                                } | Total: {effectiveRedemptions.length}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Launch Date: Feb 4, 2026</p>
                                <p className="text-gray-400 mb-1">Current Filter: {timeRange}</p>
                                <p className="text-gray-400 mb-1">Service Filter: {serviceCategory}</p>
                                <p className="text-amber-400 mb-1 font-bold">Redemption Rate: {stats.redemptionRate}%</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-yellow-400 font-bold mb-2">Raw Data (Last 5 entries):</p>
                            <div className="space-y-1 max-h-40 overflow-auto">
                                {effectiveRedemptions
                                    .slice(0, 5)
                                    .map((r: any, i) => (
                                        <div key={i} className={`bg-gray-800 p-2 rounded border-l-4 ${r.isManual ? 'border-cyan-500' : 'border-gray-700'}`}>
                                            <p>Service: <span className="text-yellow-300">{r.serviceType || 'N/A'}</span></p>
                                            <p>Guest: {r.guestName || 'N/A'}</p>
                                            <p>Room: {r.roomNumber || 'N/A'}</p>
                                            <p>Date: {r.timestamp || 'N/A'}</p>
                                            <p className={`text-[10px] font-bold ${r.isManual ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                {r.isManual ? '✓ MANUAL POS ENTRY' : 'HOTEL VOUCHER'}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-yellow-400 font-bold mb-2">Service Categorization Test:</p>
                            <div className="space-y-1">
                                {['Signature Massage', 'Hair Cut', 'Manicure/Pedicure', '15% off T Store Shopping', 'IV Therapy'].map(s => {
                                    const cat = getServiceCategory(s);
                                    return (
                                        <p key={s}>"{s}" → <span className={cat === 'fashion' ? 'text-pink-400' : cat === 'hair' ? 'text-purple-400' : 'text-green-400'}>{cat}</span></p>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
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
                                <input
                                    type="date"
                                    className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#c5a572]"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">To</label>
                                <input
                                    type="date"
                                    className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#c5a572]"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Time Range Dropdown */}
                    <div className="relative">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-[#c5a572] hover:bg-white transition-all cursor-pointer shadow-sm"
                        >
                            <option value="launch">Since Launch</option>
                            <option value="month">This Month</option>
                            <option value="week">This Week</option>
                            <option value="latest">Latest 10</option>
                            <option value="all">All Time</option>
                            <option value="custom">Custom Date</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Service Category Dropdown */}
                    <div className="relative">
                        <select
                            value={serviceCategory}
                            onChange={(e) => setServiceCategory(e.target.value as any)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-[#c5a572] hover:bg-white transition-all cursor-pointer shadow-sm"
                        >
                            <option value="all">All Units</option>
                            <option value="fashion">Fashion (T Store)</option>
                            <option value="hair">Hair & Beauty</option>
                            <option value="wellness">Wellness Only</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* View Mode Dropdown */}
                    <div className="relative">
                        <select
                            value={showHotelVouchers ? 'all' : 'pos'}
                            onChange={(e) => setShowHotelVouchers(e.target.value === 'all')}
                            className={`appearance-none border text-xs font-bold uppercase tracking-widest rounded-lg px-4 py-2.5 pr-8 focus:outline-none transition-all cursor-pointer shadow-sm ${showHotelVouchers
                                ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
                                }`}
                        >
                            <option value="all">All Vouchers (Hotel + POS)</option>
                            <option value="pos">POS Manual Only</option>
                        </select>
                        <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${showHotelVouchers ? 'text-purple-400' : 'text-gray-400'}`} />
                    </div>

                    <button
                        onClick={exportToCSV}
                        className="flex-1 md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#c5a572] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#b09465] transition-all shadow-md group"
                    >
                        <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        Export
                    </button>
                </div>
            </div>

            {/* Shop Breakdown - Side by Side */}
            <div className={`grid grid-cols-1 ${serviceCategory === 'all' ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-sm'} gap-6`}>
                {(serviceCategory === 'all' || serviceCategory === 'fashion') && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">T Store</h3>
                                <p className="text-[10px] text-gray-400 font-medium">Fashion Redemptions</p>
                            </div>
                            <span className="text-xl">🛍️</span>
                        </div>
                        <div className="flex items-baseline gap-4 mt-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold">{stats.shopIssued.fashion}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Issued</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold text-[#c5a572]">{stats.shopTotals.fashion}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Redeemed</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <span>Unique Guests</span>
                            <span className="text-[#2c2420]">{stats.shopGuests.fashion}</span>
                        </div>
                    </div>
                )}

                {(serviceCategory === 'all' || serviceCategory === 'wellness') && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">No.1 Wellness</h3>
                                <p className="text-[10px] text-gray-400 font-medium">Massage Redemptions</p>
                            </div>
                            <span className="text-xl">💆</span>
                        </div>
                        <div className="flex items-baseline gap-4 mt-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold">{stats.shopIssued.wellness}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Issued</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold text-[#c5a572]">{stats.shopTotals.wellness}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Redeemed</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <span>Unique Guests</span>
                            <span className="text-[#2c2420]">{stats.shopGuests.wellness}</span>
                        </div>
                    </div>
                )}

                {(serviceCategory === 'all' || serviceCategory === 'hair') && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group animate-fade-in">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">TS Hair Salon</h3>
                                <p className="text-[10px] text-gray-400 font-medium">Hair & Beauty</p>
                            </div>
                            <span className="text-xl">✂️</span>
                        </div>
                        <div className="flex items-baseline gap-4 mt-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold">{stats.shopIssued.hair}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Issued</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-serif font-bold text-[#c5a572]">{stats.shopTotals.hair}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Redeemed</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <span>Unique Guests</span>
                            <span className="text-[#2c2420]">{stats.shopGuests.hair}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Redemption Speed Analysis */}
            {
                stats.redemptionSpeedBreakdown.total > 0 && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap className="text-amber-500" size={20} />
                            <h3 className="font-serif font-bold text-lg">Redemption Speed Analysis</h3>
                            <p className="text-xs text-gray-400 ml-2">How quickly guests redeem after check-in</p>
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                            {[
                                { label: 'Same Day', count: stats.redemptionSpeedBreakdown.sameDay, color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
                                { label: '1 Day', count: stats.redemptionSpeedBreakdown.oneDay, color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
                                { label: '2 Days', count: stats.redemptionSpeedBreakdown.twoDays, color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50' },
                                { label: '3 Days', count: stats.redemptionSpeedBreakdown.threeDays, color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50' },
                                { label: '4+ Days', count: stats.redemptionSpeedBreakdown.fourPlusDays, color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' },
                            ].map((stat) => {
                                const percentage = stats.redemptionSpeedBreakdown.total > 0
                                    ? Math.round((stat.count / stats.redemptionSpeedBreakdown.total) * 100)
                                    : 0;
                                return (
                                    <div
                                        key={stat.label}
                                        className="text-center cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition-all hover:scale-105 active:scale-95"
                                        onClick={() => setSelectedSpeedCategory(stat.label)}
                                    >
                                        <div className={`w-16 h-16 ${stat.bgLight} rounded-full flex items-center justify-center mx-auto mb-2`}>
                                            <span className={`text-2xl font-bold ${stat.textColor}`}>{stat.count}</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-600 mb-1">{stat.label}</p>
                                        <p className="text-[10px] text-gray-400">{percentage}%</p>
                                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${stat.color}`} style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div
                    onClick={() => setDrillDownType('digital')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center cursor-pointer hover:border-green-200 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Digital Redemptions</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.systemRedemptions}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">{stats.totalRedeemedPax} Guests Served</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                        <Zap size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Redemption Rate</p>
                    <h3 className="text-4xl font-serif font-bold text-amber-600">{stats.redemptionRate}%</h3>
                    <p className="text-[10px] text-gray-400 mt-2">of {stats.totalIssuedInPeriod} Total Issued</p>
                </div>

                <div
                    onClick={() => setDrillDownType('manual')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center cursor-pointer hover:border-purple-200 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                        <CheckCircle size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Manual Input</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.manualRedemptions}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">POS / Manual Entries</p>
                </div>

                <div
                    onClick={() => setDrillDownType('unique')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                        <Users size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Unique Guests</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.uniqueGuests}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">Active Participants</p>
                </div>

                <div
                    onClick={() => setDrillDownType('active')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center cursor-pointer hover:border-orange-200 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600 group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Active Vouchers</p>
                    <h3 className="text-4xl font-serif font-bold text-orange-600">{stats.totalUnredeemedInPeriod}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">Available to Redeem</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Service Breakdown */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-serif font-bold text-lg mb-6 flex items-center gap-2">
                        <CheckCircle size={18} className="text-[#c5a572]" />
                        Top Services
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.serviceCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([service, count], idx) => {
                                const percentage = Math.round((count / stats.totalRedemptions) * 100) || 0;
                                return (
                                    <div key={service} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                                            <span>{service}</span>
                                            <span>{count} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#c5a572]"
                                                style={{ width: `${percentage}%`, opacity: 1 - (idx * 0.15) }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        {Object.keys(stats.serviceCounts).length === 0 && (
                            <p className="text-sm text-gray-400 italic">No redemptions yet.</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                            <Clock size={18} className="text-[#c5a572]" />
                            Recent Activity Log
                            <button
                                onClick={() => refresh()}
                                className="ml-2 text-[10px] text-[#c5a572] hover:text-[#2c2420] transition-colors border border-[#c5a572]/20 px-2 py-0.5 rounded-full"
                            >
                                REFRESH
                            </button>
                        </h3>
                        <div className="flex items-center gap-4">
                            {logTimeRange === 'custom' && (
                                <div className="flex items-center gap-2 animate-scale-in">
                                    <input
                                        type="date"
                                        className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#c5a572]"
                                        value={logStartDate}
                                        onChange={e => setLogStartDate(e.target.value)}
                                    />
                                    <span className="text-gray-300">-</span>
                                    <input
                                        type="date"
                                        className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#c5a572]"
                                        value={logEndDate}
                                        onChange={e => setLogEndDate(e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="relative">
                                <select
                                    value={logTimeRange}
                                    onChange={(e) => setLogTimeRange(e.target.value as any)}
                                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5 pr-6 focus:outline-none focus:border-[#c5a572] hover:bg-white transition-all cursor-pointer"
                                >
                                    <option value="all">Unfiltered View</option>
                                    <option value="week">Past 7 Days</option>
                                    <option value="month">Past 30 Days</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                                    <th className="pb-3 pl-4">Time</th>
                                    <th className="pb-3">Guest</th>
                                    <th className="pb-3">Service</th>
                                    <th className="pb-3">Voucher</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {logData.map((r, idx) => {
                                    const voucher = vouchers.find(v => v.id === r.voucherCode);

                                    return (
                                        <tr
                                            key={idx}
                                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${onViewVoucher && voucher ? 'cursor-pointer hover:bg-amber-50/20' : ''}`}
                                            onClick={() => {
                                                if (onViewVoucher && voucher) onViewVoucher(voucher);
                                            }}
                                        >
                                            <td className="py-4 pl-4 font-mono text-gray-500 text-xs">
                                                {new Date(r.timestamp).toLocaleString([], {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-4 font-bold">
                                                <div className="flex flex-col">
                                                    <span>{r.guestName}</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {r.isManual ? (
                                                            <div className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-purple-100">
                                                                #POS Entry (No System)
                                                            </div>
                                                        ) : (
                                                            <div className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-green-100">
                                                                #Digital Redemption
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-green-100">
                                                        {r.serviceType}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className={`font-mono text-xs ${r.isManual ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                                                    {r.voucherCode}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {logData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                            No recent activity found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Speed Category Detail Modal */}
            {selectedSpeedCategory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                                    <Zap size={20} className="text-amber-500" />
                                    Redemption Speed: {selectedSpeedCategory}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Guests who redeemed within {selectedSpeedCategory} of check-in
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSpeedCategory(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-0">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                                        <th className="py-3 pl-6">Guest Name</th>
                                        <th className="py-3 text-center">Room</th>
                                        <th className="py-3 text-center">Stay Duration</th>
                                        <th className="py-3 text-right pr-6">Redeemed On</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-50">
                                    {stats.redemptionSpeedData
                                        .filter(d => d.category === selectedSpeedCategory)
                                        .sort((a: any, b: any) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
                                        .map((item, idx) => {
                                            const isLate = item.stayDuration > 0 && item.daysToRedeem > item.stayDuration;
                                            return (
                                                <tr
                                                    key={idx}
                                                    className="hover:bg-amber-50/30 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                                                    onClick={() => {
                                                        const voucher = vouchers.find(v => v.id === item.voucherCode);
                                                        if (onViewVoucher && voucher) onViewVoucher(voucher);
                                                    }}
                                                >
                                                    <td className="py-4 pl-6">
                                                        <p className="font-bold text-gray-900">{item.guestName}</p>
                                                        <p className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">{item.voucherCode}</p>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500">{item.roomNumber || '-'}</span>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <p className="text-xs font-bold text-gray-600">
                                                            {item.stayDuration} Day{item.stayDuration === 1 ? '' : 's'}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 uppercase font-medium">Scheduled Stay</p>
                                                    </td>
                                                    <td className="py-4 text-right pr-6">
                                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${isLate
                                                            ? 'bg-red-50 text-red-700 border-red-100'
                                                            : 'bg-green-50 text-green-700 border-green-100'
                                                            }`}>
                                                            Day {item.daysToRedeem === 0 ? '0 (Arrival)' : item.daysToRedeem}
                                                            {isLate && ' • LATE'}
                                                        </span>
                                                        <p className="text-[9px] text-gray-400 mt-1 uppercase font-medium">Post-Check-in</p>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {stats.redemptionSpeedData.filter(d => d.category === selectedSpeedCategory).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                                No vouchers found in this category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setSelectedSpeedCategory(null)}
                                className="text-xs font-bold text-gray-500 hover:text-gray-800 uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drill-down Modal */}
            {drillDownType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                                    {drillDownType === 'digital' && <TrendingUp size={20} className="text-green-500" />}
                                    {drillDownType === 'manual' && <CheckCircle size={20} className="text-purple-500" />}
                                    {drillDownType === 'active' && <Activity size={20} className="text-orange-500" />}
                                    {drillDownType === 'unique' && <Users size={20} className="text-blue-500" />}
                                    {drillDownType === 'digital' ? 'Digital Redemptions' :
                                        drillDownType === 'manual' ? 'Manual POS Entries' :
                                            drillDownType === 'active' ? 'Active Non-Redeemed Vouchers' :
                                                'Unique Participants List'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    {drillDownType === 'active'
                                        ? 'Vouchers issued but not yet used'
                                        : `Detailed breakdown for the selected ${timeRange} period`}
                                </p>
                            </div>
                            <button
                                onClick={() => setDrillDownType(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0 z-20">
                                    <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                                        <th className="py-3 pl-6">Guest</th>
                                        <th className="py-3">Type/Service</th>
                                        <th className="py-3">Reference</th>
                                        <th className="py-3 pr-6 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-50">
                                    {(drillDownType === 'digital' || drillDownType === 'manual' ?
                                        stats.allFilteredRedemptions.filter(r => drillDownType === 'manual' ? r.isManual : !r.isManual) :
                                        drillDownType === 'active' ?
                                            stats.filteredUnredeemed :
                                            [] // Unique handled below
                                    ).map((item: any, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 pl-6">
                                                <p className="font-bold text-gray-900">{item.guestName || 'Unknown'}</p>
                                                <p className="text-[10px] text-gray-400">{item.roomNumber || 'No Room'}</p>
                                            </td>
                                            <td className="py-4">
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tight ${drillDownType === 'active' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {item.serviceType || 'Voucher'}
                                                </span>
                                            </td>
                                            <td className="py-4 font-mono text-[10px]">
                                                {item.voucherCode || item.id}
                                            </td>
                                            <td className="py-4 pr-6 text-right text-gray-500 font-mono text-[10px]">
                                                {new Date((item.timestamp || item.created_at || new Date().toISOString())).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}

                                    {drillDownType === 'unique' && (
                                        Array.from(new Set(stats.allFilteredRedemptions.map(r => r.guestName))).map((name, idx) => {
                                            const lastActivity = stats.allFilteredRedemptions.find(r => r.guestName === name);
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 pl-6 font-bold text-gray-900">{name}</td>
                                                    <td className="py-4">
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">
                                                            Last: {lastActivity?.serviceType}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 font-mono text-[10px]">{lastActivity?.voucherCode}</td>
                                                    <td className="py-4 pr-6 text-right text-gray-500 font-mono text-[10px]">
                                                        {new Date((lastActivity?.timestamp || new Date().toISOString())).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Total entries: {
                                    drillDownType === 'digital' ? stats.systemRedemptions :
                                        drillDownType === 'manual' ? stats.manualRedemptions :
                                            drillDownType === 'active' ? stats.totalUnredeemedInPeriod :
                                                stats.uniqueGuests
                                }
                            </span>
                            <button
                                onClick={() => setDrillDownType(null)}
                                className="px-4 py-2 bg-[#2c2420] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
