import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { API_BASE_URL } from '../utils/api';
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, DollarSign, Percent, BarChart2, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface ReconciliationMetrics {
    total_pos_revenue: number;
    total_voucher_related_revenue: number;
    total_non_voucher_revenue: number;
    voucher_activation_count: number;
    total_discount_exposure: number;
    net_revenue_after_discount: number;
    revenue_per_occupied_room: number;
    percentage_revenue_from_voucher_channel: number;
    occupied_rooms: number;
}

interface POSTransaction {
    bill_number: string;
    room_number: string;
    guest_name: string;
    venue: string;
    gross_amount: number;
    source: string;
}

interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle: string;
    importance?: 'normal' | 'high';
}

const RevenueReconciliation: React.FC = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isReconciling, setIsReconciling] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [parsedTransactions, setParsedTransactions] = useState<POSTransaction[]>([]);
    const [metrics, setMetrics] = useState<ReconciliationMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedDate}-${Math.random()}.${fileExt}`;
            const filePath = `pos-reports/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('pos-reports')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Trigger Parsing
            setIsProcessing(true);
            const res = await fetch(`${API_BASE_URL}/api/parse-pos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: data.path, date: selectedDate }),
            });

            // Handle potential non-JSON error pages (like 404s from wrong dev server)
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                throw new Error(res.status === 404
                    ? "Backend API not found. If running locally, please use 'vercel dev' instead of 'npm run dev'."
                    : `Server returned non-JSON response: ${text?.substring(0, 100)}...`);
            }

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Unknown server error');

            setParsedTransactions(result.transactions as POSTransaction[]);
            setIsProcessing(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message === 'Unexpected end of JSON input'
                ? "Server returned an empty response. Ensure you are using 'vercel dev' for local backend testing."
                : message);
            console.error(err);
        } finally {
            setIsUploading(false);
            setIsProcessing(false);
        }
    };

    const runReconciliation = async () => {
        setIsReconciling(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/reconcile?date=${selectedDate}`);

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Backend API not found. Please ensure you are running 'vercel dev'.");
            }

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Reconciliation failed');

            setMetrics(result as ReconciliationMetrics);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsReconciling(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                        <RefreshCw size={24} className="text-[#c5a572]" />
                        Revenue Reconciliation
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">Reconcile Daily POS Reports with Voucher Data</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c5a572] transition-colors"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <label className={`
            flex items-center gap-2 px-4 py-2 bg-[#2c2420] text-white text-xs font-bold uppercase tracking-widest rounded-lg cursor-pointer hover:bg-black transition-all shadow-md
            ${(isUploading || isProcessing) ? 'opacity-50 cursor-wait' : ''}
          `}>
                        <Upload size={16} />
                        {isUploading ? 'Uploading...' : isProcessing ? 'Parsing PDF...' : 'Upload POS PDF'}
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading || isProcessing} />
                    </label>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Metrics Grid */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Revenue"
                        value={formatCurrency(metrics.total_pos_revenue)}
                        icon={<DollarSign size={20} className="text-blue-500" />}
                        subtitle={`Net: ${formatCurrency(metrics.net_revenue_after_discount)}`}
                    />
                    <MetricCard
                        title="Voucher Revenue"
                        value={formatCurrency(metrics.total_voucher_related_revenue)}
                        icon={<BarChart2 size={20} className="text-[#c5a572]" />}
                        subtitle={`${metrics.percentage_revenue_from_voucher_channel.toFixed(1)}% of total`}
                    />
                    <MetricCard
                        title="Discount Exposure"
                        value={formatCurrency(metrics.total_discount_exposure)}
                        icon={<Percent size={20} className="text-orange-500" />}
                        subtitle="15% of voucher gross"
                        importance="high"
                    />
                    <MetricCard
                        title="Voucher Activations"
                        value={metrics.voucher_activation_count.toString()}
                        icon={<CheckCircle size={20} className="text-green-500" />}
                        subtitle={`${(metrics.voucher_activation_count / (metrics.occupied_rooms || 1) * 100).toFixed(1)}% penetration`}
                    />
                </div>
            )}

            {/* Transactions Table & Reconcile Button */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <FileText size={16} />
                        Parsed Transactions Preview
                    </h3>
                    <button
                        onClick={runReconciliation}
                        disabled={parsedTransactions.length === 0 || isReconciling}
                        className={`
              flex items-center gap-2 px-6 py-2 bg-[#c5a572] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-md
              ${(parsedTransactions.length === 0 || isReconciling) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#b09465]'}
            `}
                    >
                        {isReconciling ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                        Run Reconciliation
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 uppercase tracking-tighter">
                                <th className="px-6 py-4 font-bold">Bill #</th>
                                <th className="px-6 py-4 font-bold">Room</th>
                                <th className="px-6 py-4 font-bold">Guest</th>
                                <th className="px-6 py-4 font-bold">Venue</th>
                                <th className="px-6 py-4 font-bold text-right">Gross Amount</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {parsedTransactions.length > 0 ? (
                                parsedTransactions.map((tx, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-500">{tx.bill_number}</td>
                                        <td className="px-6 py-4 font-bold">{tx.room_number || '—'}</td>
                                        <td className="px-6 py-4 font-medium">{tx.guest_name || '—'}</td>
                                        <td className="px-6 py-4 capitalize">{tx.venue}</td>
                                        <td className="px-6 py-4 text-right font-bold">{formatCurrency(tx.gross_amount)}</td>
                                        <td className="px-6 py-4">
                                            {tx.source === 'unmatched_room_transaction' ? (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] uppercase font-bold">Unmatched</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] uppercase font-bold flex items-center gap-1 w-fit">
                                                    <CheckCircle size={10} /> Matched
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-300 italic">
                                        Upload a POS report to see transactions...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon, subtitle, importance = 'normal' }: MetricCardProps) => (
    <div className={`p-6 bg-white rounded-2xl border ${importance === 'high' ? 'border-orange-100 shadow-orange-50' : 'border-gray-100'} shadow-sm relative group hover:shadow-md transition-all`}>
        <div className="flex justify-between items-start border-b border-gray-50 pb-4 mb-4">
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{title}</h3>
                <p className="text-2xl font-serif font-bold">{value}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl group-hover:scale-110 transition-transform">
                {icon}
            </div>
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            {subtitle}
        </div>
    </div>
);

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);
};

export default RevenueReconciliation;
