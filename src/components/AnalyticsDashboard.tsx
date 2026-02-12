import React, { useMemo, useState } from 'react';
import {
    BarChart, TrendingUp, Users, Ticket,
    CheckCircle, Clock, PlusCircle, X, Save, Download
} from 'lucide-react';
import { useVoucherData } from '../hooks/useVoucherData';
import { APPS_SCRIPT_URL } from '../constants/config';
import { SERVICE_GROUPS } from '../constants/services';

const AnalyticsDashboard: React.FC = () => {
    const {
        vouchers,
        redemptions,
        // isFetching, // Removed unused variables
        // hasLoaded
    } = useVoucherData();

    const [timeRange, setTimeRange] = useState<'launch' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default to last 7 days
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceCategory, setServiceCategory] = useState<'all' | 'fashion' | 'hair' | 'wellness'>('all');
    const [posCount, setPosCount] = useState<number | ''>('');

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

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload,
            });

            // Close and reset
            setShowManualInput(false);
            setManualForm({
                store: 'No.1 Wellness',
                service: '',
                roomNumber: '',
                guestName: '',
                date: new Date().toISOString().split('T')[0]
            });
            // Trigger refresh via window reload or hook if possible, 
            // but hook polling will pick it up eventually. 
            // For now, let's just alert or let polling handle it.
            alert('Manual entry logged. It may take a few moments to appear.');

        } catch (error) {
            console.error("Error logging manual entry:", error);
            alert('Failed to log entry.');
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

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        const now = new Date();
        const launchDate = new Date(2026, 0, 1); // Jan 1, 2026

        // Build a lookup map from SERVICE_GROUPS for accurate categorization
        const serviceToCategoryMap = new Map<string, string>();
        SERVICE_GROUPS.forEach(group => {
            const category = group.label.includes('Shopping') || group.label.includes('T Store') ? 'fashion'
                : group.label.includes('Salon') || group.label.includes('Hair') ? 'hair'
                : 'wellness';
            group.items.forEach(item => {
                serviceToCategoryMap.set(item.value, category);
                serviceToCategoryMap.set(item.label, category);
            });
        });

        // Helper to map service string to category using the lookup map
        const getServiceCategory = (service: string): string => {
            if (!service) return 'wellness';

            // Try exact match first (trimmed)
            const trimmed = service.trim();
            if (serviceToCategoryMap.has(trimmed)) {
                return serviceToCategoryMap.get(trimmed)!;
            }

            // Try case-insensitive match
            const lowerKey = trimmed.toLowerCase();
            for (const [key, value] of serviceToCategoryMap.entries()) {
                if (key.toLowerCase() === lowerKey) {
                    return value;
                }
            }

            // Try partial match (check if any key contains the service name)
            for (const [key, value] of serviceToCategoryMap.entries()) {
                if (key.toLowerCase().includes(lowerKey) || lowerKey.includes(key.toLowerCase())) {
                    return value;
                }
            }

            // Fallback keyword matching based on actual Google Sheets entitlement names
            const s = lowerKey;

            // Fashion (T Store) - check for t store shopping entitlement
            if (s.includes('t store shopping') || s.includes('shopping') && s.includes('15%')) {
                return 'fashion';
            }

            // Hair (TS Salon) - check for salon services entitlement
            if (s.includes('ts salon') || s.includes('salon services') || s.includes('hair') ||
                s.includes('manicure') || s.includes('pedicure') || s.includes('facial')) {
                return 'hair';
            }

            // Wellness (No.1) - most entitlements fall here
            // Includes: 15% off All Services @ No.1, Welcome Drink, Breakfast, etc.
            if (s.includes('no.1') || s.includes('wellness') || s.includes('massage') || s.includes('spa') ||
                s.includes('iv ') || s.includes('yoga') || s.includes('pilates') || s.includes('fitness') ||
                s.includes('breakfast') || s.includes('drink') || s.includes('class') || s.includes('f&b') ||
                s.includes('food') || s.includes('all services')) {
                return 'wellness';
            }

            // Apparel/accessories for fashion
            if (s.includes('apparel') || s.includes('accessories') || s.includes('clothing')) {
                return 'fashion';
            }

            // Default to wellness for anything else (most entitlements are wellness)
            return 'wellness';
        };

        // Use Redemptions data (actual services used) if available
        // Fall back to voucher entitlements if no redemption data exists
        const effectiveRedemptions = redemptions.length > 0 ? redemptions : vouchers
            .filter(v => v.status === 'Redeemed')
            .map(v => ({
                timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                voucherCode: v.id,
                guestName: v.guestName,
                serviceType: (v.services && v.services.length > 0) ? v.services[0] : 'General Admission',
                roomNumber: v.roomNumber || ''
            }));

        // Show warning if using fallback data
        if (redemptions.length === 0 && effectiveRedemptions.length > 0) {
            console.warn('⚠️ No redemption data found. Using voucher entitlements as fallback.');
            console.warn('Staff should use "Log Manual Entry" to record actual services used.');
        }

        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let currentRedemptions = effectiveRedemptions;

        if (timeRange === 'week') {
            currentRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneWeekAgo;
            });
        } else if (timeRange === 'month') {
            currentRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneMonthAgo;
            });
        } else if (timeRange === 'launch') {
            currentRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= launchDate;
            });
        } else if (timeRange === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            currentRedemptions = effectiveRedemptions.filter(r => {
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

        const manualRedemptions = filteredRedemptions.filter(r =>
            (r.roomNumber && r.roomNumber.toLowerCase().includes('tss'))
        ).length;

        // Calculate Redeemed Pax
        const redeemedPax = filteredRedemptions.reduce((sum, r) => {
            const voucher = vouchers.find(v => v.id === r.voucherCode);
            return sum + (voucher?.pax || 1);
        }, 0);

        // Calculate redemption speed breakdown
        const speedBreakdown = redemptionSpeed.reduce((acc: Record<string, number>, r) => {
            if (!r) return acc;
            acc[r.category] = (acc[r.category] || 0) + 1;
            return acc;
        }, { 'Same Day': 0, '1 Day': 0, '2 Days': 0, '3 Days': 0, '4+ Days': 0 });

        // Ensure we always have a valid object (even if empty data)
        const safeSpeedBreakdown = Object.keys(speedBreakdown).length > 0 ? speedBreakdown : { 'Same Day': 0, '1 Day': 0, '2 Days': 0 };

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
            redemptionSpeed: safeSpeedBreakdown
        };
    }, [redemptions, vouchers, timeRange, startDate, endDate, serviceCategory]);

    // Active Vouchers - count both vouchers AND pax
    const activeVouchers = vouchers.filter(v => !v.status || v.status !== 'Redeemed');
    const activeVouchersCount = activeVouchers.length;
    const activeVouchersPax = activeVouchers.reduce((sum, v) => sum + (v.pax || 1), 0);

    // Total Vouchers Issued - all vouchers ever created
    const totalVouchersIssued = vouchers.length;
    const totalPaxIssued = vouchers.reduce((sum, v) => sum + (v.pax || 1), 0);

    // Time to Redeem Analysis - track guest habits
    const redeemedVouchers = vouchers.filter(v => v.status === 'Redeemed' && v.created_at && v.redeemed_at);
    const validRedemptions = redeemedVouchers.filter(v => {
        if (!v.created_at || !v.redeemed_at) return false;
        const createdDate = new Date(v.created_at || '');
        const redeemedDate = new Date(v.redeemed_at || '');
        return !isNaN(createdDate.getTime()) && !isNaN(redeemedDate.getTime());
    });

    const redemptionSpeed = validRedemptions.map(v => {
        const createdDate = new Date(v.created_at!);
        const redeemedDate = new Date(v.redeemed_at!);
        const daysToRedeem = Math.floor((redeemedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
            voucherCode: v.id,
            guestName: v.guestName || '',
            daysToRedeem,
            category: daysToRedeem === 0 ? 'Same Day' :
                       daysToRedeem === 1 ? '1 Day' :
                       daysToRedeem === 2 ? '2 Days' :
                       daysToRedeem === 3 ? '3 Days' : '4+ Days'
        };
    });

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
            {/* Debug Panel - Show data source */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-xs">
                <p className="font-bold text-blue-800 mb-2">📊 Data Source Status</p>
                {redemptions.length > 0 ? (
                    <div className="bg-green-100 p-3 rounded border border-green-300 mb-3">
                        <p className="font-bold text-green-800">✅ Using Redemption Data (Actual Services)</p>
                        <p className="text-green-700 text-[10px]">Showing real services guests used.</p>
                    </div>
                ) : (
                    <div className="bg-orange-100 p-3 rounded border border-orange-300 mb-3">
                        <p className="font-bold text-orange-800">⚠️ Using Fallback: Voucher Entitlements</p>
                        <p className="text-orange-700 text-[10px]">
                            No redemption data found. Showing voucher entitlements instead.
                            <br />
                            <strong>Staff should use "Log Manual Entry" to record actual services used.</strong>
                        </p>
                    </div>
                )}
                <div className="bg-white p-3 rounded border border-blue-200 font-mono text-[10px]">
                    <p className="font-bold mb-2">Services in current data:</p>
                    <pre className="whitespace-pre-wrap">
                        {JSON.stringify(
                            [...new Set((redemptions.length > 0 ? redemptions : vouchers.filter(v => v.status === 'Redeemed'))
                                .map((r: any) => r.serviceType || (r.services && r.services.length > 0 ? r.services[0] : 'No service')))],
                            null, 2
                        )}
                    </pre>
                </div>
                <div className="mt-4 bg-yellow-100 p-3 rounded border border-yellow-300">
                    <p className="font-bold text-yellow-800 mb-2">Workflow:</p>
                    <ul className="text-yellow-900 text-[10px] space-y-1">
                        <li>1. Guest has voucher with entitlements (discounts they CAN use)</li>
                        <li>2. When guest uses a service, staff clicks "Log Manual Entry"</li>
                        <li>3. Select actual service used (e.g., "Signature Massage")</li>
                        <li>4. Analytics tracks real usage, not just entitlements</li>
                    </ul>
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

                    <button
                        onClick={exportToCSV}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#c5a572] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#b09465] transition-all shadow-md group"
                    >
                        <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        Export Data
                    </button>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Ticket size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Issued</p>
                    <h3 className="text-4xl font-serif font-bold">{totalPaxIssued}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">{totalVouchersIssued} vouchers</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Redeemed</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.totalRedeemedPax}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">{stats.totalRedemptions} vouchers</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                        <Ticket size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Active</p>
                    <h3 className="text-4xl font-serif font-bold">{activeVouchersPax}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">{activeVouchersCount} vouchers</p>
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
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Users size={24} />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Unique Guests</p>
                    <h3 className="text-4xl font-serif font-bold">{stats.uniqueGuests}</h3>
                </div>

                {/* Redemption Speed Analysis */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-cyan-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif font-bold text-lg text-cyan-900">⏱️ Redemption Speed</h3>
                        <p className="text-xs text-cyan-700">How quickly guests use vouchers</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(stats.redemptionSpeed || {}).map(([category, count]) => (
                            <div key={category} className="bg-white/80 p-4 rounded-xl border border-cyan-200 text-center">
                                <p className="text-2xl font-bold text-cyan-900">{count}</p>
                                <p className="text-xs text-cyan-700 font-bold uppercase tracking-wider">{category}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-cyan-800 mt-4 italic">
                        📊 Based on {redemptionSpeed.reduce((sum: number, item) => sum + (item?.daysToRedeem || 0), 0)} vouchers with valid dates
                    </p>
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
                                        .filter(r => r.roomNumber && r.roomNumber.toLowerCase().includes('tss'))
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
                                            {r.roomNumber && r.roomNumber.toLowerCase().includes('tss') && (
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
                                            <span className={`font-mono text-xs ${r.roomNumber && r.roomNumber.toLowerCase().includes('tss') ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
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
