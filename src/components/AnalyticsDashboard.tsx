import React, { useMemo, useState } from 'react';
import {
    BarChart, TrendingUp, Users,
    Activity, CheckCircle, Clock, PlusCircle, X, Save, Download, Zap
} from 'lucide-react';
import { useVoucherData } from '../hooks/useVoucherData';
import { APPS_SCRIPT_URL } from '../constants/config';
import { SERVICE_GROUPS } from '../constants/services';

const AnalyticsDashboard: React.FC = () => {
    const {
        vouchers,
        redemptions,
        refresh,
        // isFetching, // Removed unused variables
        // hasLoaded
    } = useVoucherData();

    const [timeRange, setTimeRange] = useState<'launch' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default to last 7 days
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');
    const [posCount, setPosCount] = useState<number | ''>('');
    const [showDebug, setShowDebug] = useState(false);
    const [showHotelVouchers, setShowHotelVouchers] = useState(true); // Default to show ALL redemptions (hotel + POS)

    const [showManualInput, setShowManualInput] = useState(false);
    const [manualForm, setManualForm] = useState({
        store: 'No.1 Wellness',
        service: '',
        roomNumber: '',
        guestName: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleManualSubmit = async () => {
        setIsSubmitting(true);

        // Tag room with TSS# if not present
        const roomTag = manualForm.roomNumber.toLowerCase().includes('tss')
            ? manualForm.roomNumber
            : `TSS #${manualForm.roomNumber}`;

        const payload = JSON.stringify({
            action: 'create',  // CRITICAL: This tells Apps Script to CREATE entry, not just lookup voucher!
            voucherCode: `MANUAL-${Math.floor(Math.random() * 10000)}`,
            userName: manualForm.guestName,
            status: 'Redeemed',
            roomNumber: roomTag,
            checkIn: manualForm.date,
            checkOut: manualForm.date,
            services: manualForm.service,
            created_at: new Date(manualForm.date).toISOString(),
            redeemed_at: new Date(manualForm.date).toISOString(),
            pax: 1
        });

        console.log('📤 SENDING MANUAL ENTRY:', {
            store: manualForm.store,
            service: manualForm.service,
            roomNumber: manualForm.roomNumber,
            finalTag: roomTag,
            payload: payload
        });

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload,
            });

            console.log('✅ Response status:', response.status);
            console.log('✅ Response ok:', response.ok);

            // Reset form but keep modal open for rapid data entry
            setManualForm({
                ...manualForm,
                service: '',
                roomNumber: '',
                guestName: ''
            });

            alert(`✅ Manual entry saved!\n\nStore: ${manualForm.store}\nService: ${manualForm.service}\nRoom: ${roomTag}\n\nForm is ready for next entry. Continue or close to finish.`);

        } catch (error) {
            console.error("❌ Error logging manual entry:", error);
            alert(`❌ Failed to save entry!\n\nError: ${error}\n\nPlease:\n1. Check browser console (F12)\n2. Try again or contact support`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter services based on selected store
    const availableServices = useMemo(() => {
        const storeMap: Record<string, string[]> = {
            'No.1 Wellness': ['Massage & Spa (No.1 Wellness)', 'IV Therapy', 'Fitness & Wellness', 'Other'],
            'T Store': ['T Store Shopping'],
            'Hair & Salon': ['TS Salon Services']
        };

        const relevantGroups = storeMap[manualForm.store] || [];

        return SERVICE_GROUPS
            .filter(g => relevantGroups.includes(g.label))
            .flatMap(g => g.items.map(({ value, label }) => ({ value, label })));
    }, [manualForm.store]);

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
        if (s.includes('shopping') || s.includes('t store') || s.includes('fashion') || s.includes('apparel') || s.includes('boutique')) return 'fashion';
        if (s.includes('salon') || s.includes('hair') || s.includes('pedi') || s.includes('mani') || s.includes('facial') || s.includes('beauty')) return 'hair';
        return 'wellness';
    };

    // Unified manual entry detection
    const checkIsManual = (room: string, code: string) => {
        const r = String(room || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        // If code is empty or doesn't start with NW- or TEST-, it's POS/Manual
        if (!c || (!c.startsWith('nw-') && !c.startsWith('test-'))) return true;
        // Legacy/explicit manual tags
        return r.includes('tss') || c.startsWith('manual-');
    };

    // Calculate effective redemptions at component level
    const effectiveRedemptions = useMemo(() => {
        const baseData = redemptions.length > 0 ? redemptions : vouchers
            .filter(v => v.status === 'Redeemed')
            .map(v => ({
                timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                voucherCode: v.id,
                guestName: v.guestName || 'Unknown Guest',
                // CRITICAL: Prioritize serviceType (where all services are stored) to avoid fallback to generic "15% off..." entitlements
                serviceType: v.serviceType || v.redeemed_service || (v.services && v.services.length > 0 && !v.services[0].includes('15%') ? v.services[0] : 'Wellness Service'),
                roomNumber: v.roomNumber || '',
                isManual: false
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

        // Filter: Show ONLY manual POS entries by default (hotel vouchers excluded)
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

        // Calculate Redemption Speed (only for vouchers with both created_at and redeemed_at)
        const redeemedVouchers = vouchers.filter(v => v.status === 'Redeemed' && v.created_at && v.redeemed_at);
        const validRedemptionsForSpeed = redeemedVouchers.filter(v => {
            const createdDate = new Date(v.created_at!);
            const redeemedDate = new Date(v.redeemed_at!);
            return !isNaN(createdDate.getTime()) && !isNaN(redeemedDate.getTime());
        });

        const redemptionSpeedData = validRedemptionsForSpeed.map(v => {
            const createdDate = new Date(v.created_at!);
            const redeemedDate = new Date(v.redeemed_at!);
            const daysToRedeem = Math.floor((redeemedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
                voucherCode: v.id,
                guestName: v.guestName || '',
                daysToRedeem,
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

        return {
            totalRedemptions: filteredRedemptions.length,
            totalRedeemedPax: redeemedPax,
            manualRedemptions,
            systemRedemptions: filteredRedemptions.length - manualRedemptions,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            serviceCounts,
            shopTotals,
            shopGuests,
            dailyCounts: Object.entries(dailyCounts).sort((a, b) => a[0].localeCompare(b[0])),
            recentActivity: [...filteredRedemptions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10),
            allFilteredRedemptions: filteredRedemptions,
            redemptionSpeedBreakdown
        };
    }, [redemptions, vouchers, timeRange, startDate, endDate, serviceCategory]);

    const activeVouchersCount = vouchers.filter(v => !v.status || v.status !== 'Redeemed').length;

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
                    <div className="flex bg-gray-50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                        {(['launch', 'week', 'month', 'all', 'custom'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${timeRange === range
                                    ? 'bg-white text-[#c5a572] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {range === 'all' ? 'All Time' : range === 'launch' ? 'Since Launch' : range === 'custom' ? 'Custom Date' : `This ${range}`}
                            </button>
                        ))}
                    </div>

                    <div className="flex bg-gray-50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                        {(['all', 'fashion', 'hair', 'wellness'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setServiceCategory(cat)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${serviceCategory === cat
                                    ? 'bg-white text-[#c5a572] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {cat === 'all' ? 'All Units' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setShowHotelVouchers(!showHotelVouchers)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${showHotelVouchers
                                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                        >
                            <span>{showHotelVouchers ? 'All Vouchers' : 'POS Only'}</span>
                            <span className="text-[9px] normal-case">{showHotelVouchers ? '(includes hotel)' : '(manual entries only)'}</span>
                        </button>

                        <button
                            onClick={exportToCSV}
                            className="flex-1 md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#c5a572] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#b09465] transition-all shadow-md group"
                        >
                            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                            Export Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Shop Breakdown - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">T Store</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Fashion Redemptions</p>
                        </div>
                        <span className="text-xl">🛍️</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-4">
                        <span className="text-4xl font-serif font-bold">{stats.shopTotals.fashion}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Unique Guests</span>
                        <span className="text-[#2c2420]">{stats.shopGuests.fashion}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">No.1 Wellness</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Massage Redemptions</p>
                        </div>
                        <span className="text-xl">💆</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-4">
                        <span className="text-4xl font-serif font-bold">{stats.shopTotals.wellness}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Unique Guests</span>
                        <span className="text-[#2c2420]">{stats.shopGuests.wellness}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c5a572]/20 relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-1">TS Hair Salon</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Hair & Beauty</p>
                        </div>
                        <span className="text-xl">✂️</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-4">
                        <span className="text-4xl font-serif font-bold">{stats.shopTotals.hair}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Unique Guests</span>
                        <span className="text-[#2c2420]">{stats.shopGuests.hair}</span>
                    </div>
                </div>
            </div>

            {/* Redemption Speed Analysis */}
            {stats.redemptionSpeedBreakdown.total > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="text-amber-500" size={20} />
                        <h3 className="font-serif font-bold text-lg">Redemption Speed Analysis</h3>
                        <p className="text-xs text-gray-400 ml-2">How quickly guests redeem after voucher creation</p>
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
                                <div key={stat.label} className="text-center">
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
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Redemptions</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.totalRedemptions}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">{stats.totalRedeemedPax} Guests Served</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                        <CheckCircle size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Manual Input</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.manualRedemptions}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">vs {stats.systemRedemptions} System</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Users size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Unique Guests</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.uniqueGuests}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                        <Activity size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Active Vouchers</p>
                    <h3 className="text-4xl font-serif font-bold">{activeVouchersCount}</h3>
                </div>
            </div>

            {/* Manual Vouchers Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="font-serif font-bold text-lg flex items-center gap-2 text-purple-900">
                            <CheckCircle size={18} className="text-purple-600" />
                            POS Reconciliation & Manual Entry
                        </h3>
                        <button
                            onClick={() => setShowManualInput(true)}
                            className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <PlusCircle size={12} /> Log Manual Entry
                        </button>
                    </div>

                    <div className="flex items-center gap-4 bg-purple-50 p-2 rounded-xl border border-purple-100">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">System Recorded</p>
                            <p className="text-xl font-bold text-purple-900 leading-none">{stats.manualRedemptions}</p>
                        </div>
                        <div className="h-8 w-px bg-purple-200"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Actual POS Count</p>
                            <input
                                type="number"
                                className="w-16 bg-white border border-purple-200 rounded px-1 py-0.5 text-right font-bold text-purple-900 text-lg leading-none focus:outline-none focus:border-purple-400"
                                value={posCount}
                                onChange={(e) => setPosCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                            />
                        </div>

                        {posCount !== '' && (
                            <>
                                <div className="h-8 w-px bg-purple-200"></div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</p>
                                    {(() => {
                                        const diff = (posCount as number) - stats.manualRedemptions;
                                        if (diff > 0) return <p className="text-sm font-bold text-red-500 leading-none">Missing {diff}</p>;
                                        if (diff < 0) return <p className="text-sm font-bold text-orange-500 leading-none">Excess {Math.abs(diff)}</p>;
                                        return <p className="text-sm font-bold text-green-500 leading-none">Synced</p>;
                                    })()}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {stats.manualRedemptions > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['No.1 Wellness', 'T Store', 'Hair & Salon'].map((store) => (
                            <div key={store} className="bg-purple-50/30 rounded-xl p-4 border border-purple-50">
                                <h4 className="font-bold text-sm text-purple-900 mb-3 uppercase tracking-wide border-b border-purple-100 pb-2">{store}</h4>
                                <div className="space-y-3">
                                    {stats.recentActivity
                                        .filter(r => r.isManual)
                                        .filter(r => {
                                            const s = r.serviceType || '';
                                            if (store === 'T Store') return s.includes('Shopping') || s.includes('T Store') || s.includes('Apparel') || s.includes('Accessories');
                                            if (store === 'Hair & Salon') return s.includes('Salon') || s.includes('Hair') || s.includes('Manicure') || s.includes('Facial');
                                            return !(s.includes('Shopping') || s.includes('T Store') || s.includes('Apparel') || s.includes('Accessories') || s.includes('Salon') || s.includes('Hair') || s.includes('Manicure') || s.includes('Facial'));
                                        })
                                        .map((r, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-purple-50 flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-xs text-purple-900">{r.guestName}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(r.timestamp).toLocaleDateString()}</div>
                                                    <div className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded inline-block mt-1 font-bold uppercase">{r.roomNumber}</div>
                                                </div>
                                                <div className="text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-[80px] text-right font-medium truncate">
                                                    {r.serviceType}
                                                </div>
                                            </div>
                                        ))}
                                    {stats.recentActivity
                                        .filter(r => r.roomNumber && r.roomNumber.toLowerCase().includes('tss'))
                                        .filter(r => {
                                            const s = r.serviceType || '';
                                            if (store === 'T Store') return s.includes('Shopping') || s.includes('T Store') || s.includes('Apparel') || s.includes('Accessories');
                                            if (store === 'Hair & Salon') return s.includes('Salon') || s.includes('Hair') || s.includes('Manicure') || s.includes('Facial');
                                            return !(s.includes('Shopping') || s.includes('T Store') || s.includes('Apparel') || s.includes('Accessories') || s.includes('Salon') || s.includes('Hair') || s.includes('Manicure') || s.includes('Facial'));
                                        }).length === 0 && (
                                            <p className="text-[10px] text-gray-400 italic text-center py-4">No data.</p>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-purple-50/20 rounded-xl border border-dashed border-purple-100">
                        <p className="text-sm text-purple-800 font-medium">No manual POS vouchers logged yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Use the button above to add entries from the POS manually.</p>
                    </div>
                )}
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
                                onClick={() => refresh(false)}
                                className="ml-2 text-[10px] text-[#c5a572] hover:text-[#2c2420] transition-colors border border-[#c5a572]/20 px-2 py-0.5 rounded-full"
                            >
                                REFRESH
                            </button>
                        </h3>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            Latest 10
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
                                {stats.recentActivity.map((r, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4 font-mono text-gray-500 text-xs">
                                            {new Date(r.timestamp).toLocaleString([], {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-4 font-bold">
                                            {r.guestName}
                                            {r.isManual && (
                                                <div className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mt-1">
                                                    #Manual Input (No System)
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4">
                                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-green-100">
                                                {r.serviceType}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`font-mono text-xs ${r.isManual ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                                                {r.voucherCode}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentActivity.length === 0 && (
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
            {/* Manual Entry Modal */}
            {showManualInput && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-purple-50 p-6 border-b border-purple-100 flex justify-between items-center">
                            <h3 className="font-serif font-bold text-lg text-purple-900 flex items-center gap-2">
                                <PlusCircle size={20} className="text-purple-600" />
                                Log Manual POS Voucher
                            </h3>
                            <button
                                onClick={() => setShowManualInput(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Store / Department</label>
                                <div className="flex bg-gray-50 p-1 rounded-lg">
                                    {['No.1 Wellness', 'T Store', 'Hair & Salon'].map(store => (
                                        <button
                                            key={store}
                                            onClick={() => setManualForm({ ...manualForm, store, service: '' })}
                                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${manualForm.store === store
                                                ? 'bg-white text-purple-600 shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {store}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                        value={manualForm.date}
                                        onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">POS Room #</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 101"
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                        value={manualForm.roomNumber}
                                        onChange={e => setManualForm({ ...manualForm, roomNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guest Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Guest Name"
                                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                    value={manualForm.guestName}
                                    onChange={e => setManualForm({ ...manualForm, guestName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Service Redeemed</label>
                                <select
                                    className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                                    value={manualForm.service}
                                    onChange={e => setManualForm({ ...manualForm, service: e.target.value })}
                                >
                                    <option value="">Select Service...</option>
                                    {availableServices.map((item, idx) => (
                                        <option key={idx} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleManualSubmit}
                                disabled={isSubmitting || !manualForm.roomNumber || !manualForm.service}
                                className="w-full bg-purple-600 text-white font-bold uppercase tracking-widest text-xs py-4 rounded-xl mt-4 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <span>Saving...</span>
                                ) : (
                                    <>
                                        <Save size={16} /> Save Record
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
