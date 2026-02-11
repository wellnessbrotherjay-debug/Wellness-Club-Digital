import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    BarChart, TrendingUp, Users,
    Activity, CheckCircle, Clock, Download
} from 'lucide-react';
import { useVoucherData } from '../hooks/useVoucherData';

const AdminAnalytics: React.FC = () => {
    const {
        vouchers,
        redemptions
    } = useVoucherData();

    const [timeRange, setTimeRange] = useState<'launch' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        const now = new Date();
        const launchDate = new Date('2026-02-04T00:00:00'); // User requested Feb 4th as launch
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Derive redemptions directly from vouchers if the hook state is empty/sync issue
        const effectiveRedemptions = redemptions.length > 0 ? redemptions : vouchers
            .filter(v => v.status === 'Redeemed')
            .map(v => ({
                timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
                voucherCode: v.id,
                guestName: v.guestName,
                serviceType: (v.services && v.services.length > 0) ? v.services[0] : 'General Admission',
                roomNumber: v.roomNumber || ''
            }));

        const parseDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        let filteredRedemptions = effectiveRedemptions;
        if (timeRange === 'week') {
            filteredRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneWeekAgo;
            });
        } else if (timeRange === 'month') {
            filteredRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= oneMonthAgo;
            });
        } else if (timeRange === 'launch') {
            filteredRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= launchDate;
            });
        } else if (timeRange === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredRedemptions = effectiveRedemptions.filter(r => {
                const d = parseDate(r.timestamp);
                return d && d >= start && d <= end;
            });
        }

        // Service Breakdown
        const serviceCounts: Record<string, number> = {};
        filteredRedemptions.forEach(r => {
            const service = r.serviceType || 'Unknown';
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });

        // Daily Activity (Last 7 days for chart simulation)
        const dailyCounts: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyCounts[key] = 0;
        }
        filteredRedemptions.forEach(r => {
            const dateKey = new Date(r.timestamp).toISOString().split('T')[0];
            if (dailyCounts[dateKey] !== undefined) {
                dailyCounts[dateKey]++;
            }
        });

        return {
            totalRedemptions: filteredRedemptions.length,
            uniqueGuests: new Set(filteredRedemptions.map(r => r.guestName)).size,
            serviceCounts,
            dailyCounts: Object.entries(dailyCounts).reverse(), // Oldest to newest
            recentActivity: [...filteredRedemptions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10),
            allFilteredRedemptions: filteredRedemptions
        };
    }, [redemptions, vouchers, timeRange, startDate, endDate]);

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
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Analytics Board | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-serif font-bold flex items-center gap-3">
                            <BarChart className="text-[#c5a572]" />
                            Analytics Board
                        </h1>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">
                            Real-time Redemption Insights
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {timeRange === 'custom' && (
                            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg animate-scale-in">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">From</span>
                                    <input
                                        type="date"
                                        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">To</span>
                                    <input
                                        type="date"
                                        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(['launch', 'week', 'month', 'all', 'custom'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${timeRange === range
                                        ? 'bg-white text-[#c5a572] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {range === 'all' ? 'All Time' : range === 'launch' ? 'Since Launch' : range === 'custom' ? 'Custom' : `This ${range}`}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-[#c5a572] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#b09465] transition-all shadow-md"
                        >
                            <Download size={14} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Redemptions ({timeRange})</p>
                        <h3 className="text-4xl font-serif font-bold">{stats.totalRedemptions}</h3>
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
                            <button
                                onClick={() => window.location.reload()} // Simple refresh
                                className="text-xs font-bold uppercase tracking-widest text-[#c5a572]"
                            >
                                Refresh
                            </button>
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
                                            <td className="py-4 font-bold">{r.guestName}</td>
                                            <td className="py-4">
                                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-green-100">
                                                    {r.serviceType}
                                                </span>
                                            </td>
                                            <td className="py-4 font-mono text-xs text-gray-400">{r.voucherCode}</td>
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

            </main>
        </div>
    );
};

export default AdminAnalytics;
