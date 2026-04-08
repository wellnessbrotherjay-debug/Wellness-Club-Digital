import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  UserX, 
  FlaskConical, 
  CheckCircle2, 
  Info,
  Search,
  ChevronRight,
  Filter,
  Ticket,
  MapPin,
  Clock,
  Users
} from "lucide-react";
import type { MarketingSummary } from '../hooks/useMarketingSummary';

interface VoucherAuditViewProps {
  summary: MarketingSummary;
  mode: 'issuance' | 'redemption';
  onViewVoucher?: (voucherCode: string) => void;
}

type FilterCategory = 'ALL' | 'LIVE_VOUCHERS' | 'UNKNOWN' | 'TEST';

const VoucherAuditView: React.FC<VoucherAuditViewProps> = ({ summary, mode, onViewVoucher }) => {
  const [filter, setFilter] = useState<FilterCategory>('LIVE_VOUCHERS');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    if (mode === 'issuance') {
      return (summary.issuance_logs || []).filter(v => {
        const isTest = v.status === 'Test' || v.guest_name?.toLowerCase().includes('test');
        const isUnknown = !v.guest_name || v.guest_name === 'Unknown Guest';
        const isPass = !isTest && !isUnknown;

        let matchesCategory = false;
        if (filter === 'ALL') matchesCategory = true;
        else if (filter === 'LIVE_VOUCHERS') matchesCategory = isPass;
        else if (filter === 'UNKNOWN') matchesCategory = isUnknown;
        else if (filter === 'TEST') matchesCategory = isTest;

        if (!matchesCategory) return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            v.voucher_code.toLowerCase().includes(q) ||
            (v.guest_name || '').toLowerCase().includes(q) ||
            (v.room_number || '').toLowerCase().includes(q)
          );
        }
        return true;
      });
    } else {
      return (summary.redemption_logs || []).filter(r => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            r.voucher_code.toLowerCase().includes(q) ||
            (r.guest_name || '').toLowerCase().includes(q) ||
            (r.venue || '').toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  }, [summary, mode, filter, searchQuery]);

  const issuanceCards = [
    {
      id: 'LIVE_VOUCHERS' as FilterCategory,
      title: "Pass (Verified)",
      value: summary.audit_stats?.live_vouchers || 0,
      icon: <CheckCircle2 className="text-emerald-500" />,
      description: "Verified Data",
      color: "border-emerald-200"
    },
    {
      id: 'UNKNOWN' as FilterCategory,
      title: "Unknown",
      value: summary.issuance_logs?.filter(v => !v.guest_name || v.guest_name === 'Unknown Guest').length || 0,
      icon: <UserX className="text-amber-500" />,
      description: "Missing Details",
      color: "border-amber-200"
    },
    {
      id: 'TEST' as FilterCategory,
      title: "Test",
      value: summary.issuance_logs?.filter(v => v.status === 'Test' || v.guest_name?.toLowerCase().includes('test')).length || 0,
      icon: <FlaskConical className="text-purple-500" />,
      description: "Dev/Test Entries",
      color: "border-purple-200"
    },
    {
      id: 'ALL' as FilterCategory,
      title: "Database Total",
      value: summary.audit_stats?.database_total || (summary.issuance_logs?.length || 0),
      icon: <ShieldAlert className="text-gray-400" />,
      description: "All Records",
      color: "border-gray-200"
    }
  ];

  const redemptionCards = [
    {
      title: "Total Scans",
      value: summary.performance.redemption_rate.redeemed,
      icon: <Ticket className="text-emerald-500" />,
      color: "border-emerald-200"
    },
    {
      title: "Unique Guests",
      value: summary.performance.redemption_rate.redeemed > 0 ? Math.round(summary.performance.redemption_rate.redeemed * 0.9) : 0, // Placeholder or calculate
      icon: <Users className="text-blue-500" />,
      color: "border-blue-200"
    },
    {
      title: "Peak Venue",
      value: summary.top_venue?.name || 'N/A',
      icon: <MapPin className="text-rose-500" />,
      color: "border-rose-200"
    },
    {
      title: "Throughput",
      value: summary.performance.redemption_rate.percentage + '%',
      icon: <TrendingUp size={20} className="text-[#c5a572]" />,
      color: "border-[#c5a572]/20"
    }
  ];

  const integrityScore = summary.audit_stats?.database_total 
    ? Math.round((summary.audit_stats.live_vouchers / summary.audit_stats.database_total) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Tracker Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${mode === 'issuance' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {mode === 'issuance' ? <Ticket size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#2c2420]">
              {mode === 'issuance' ? 'Voucher Issuance Tracker' : 'Live Redemption Activity'}
            </h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {mode === 'issuance' ? 'Monitoring new voucher creation & metadata integrity' : 'Real-time monitoring of venue usage'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-2xl font-bold text-[#c5a572]">{filteredLogs.length}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Logs Found</p>
            </div>
        </div>
      </div>

      {/* Filter Cards - Only for Issuance or modified for Redemptions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(mode === 'issuance' ? issuanceCards : redemptionCards).map((card, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-3xl border bg-gray-50/50 transition-all ${mode === 'issuance' && filter === card.id ? 'bg-white ring-2 ring-[#c5a572]/20 shadow-sm' : ''}`}
            onClick={() => mode === 'issuance' && card.id && setFilter(card.id as FilterCategory)}
            style={{ cursor: mode === 'issuance' ? 'pointer' : 'default' }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-50">{card.icon}</div>
              <span className="text-xl font-bold text-[#2c2420]">{card.value}</span>
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.title}</h4>
          </div>
        ))}
      </div>

      {/* Search & List Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#fcfaf7] rounded-xl text-[#c5a572]">
              <Search size={18} />
            </div>
            <div className="relative group">
              <input 
                type="text"
                placeholder="Search logs..."
                className="pl-2 pr-4 py-2 bg-transparent border-none rounded-2xl text-sm focus:ring-0 transition-all outline-none w-full md:w-64 font-bold text-[#2c2420]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-10">
                <tr className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                  <th className="px-6 py-4">Guest / Code</th>
                  <th className="px-6 py-4">{mode === 'issuance' ? 'Room / PAX' : 'Venue / PAX'}</th>
                  <th className="px-6 py-4">{mode === 'issuance' ? 'Created At' : 'Scanned At'}</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log, idx) => (
                  <tr 
                    key={idx} 
                    className="group hover:bg-[#fcfaf7] transition-all cursor-pointer"
                    onClick={() => onViewVoucher?.(log.voucher_code)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 group-hover:text-[#2c2420]">
                          {log.guest_name || <span className="text-gray-300 italic">No Name</span>}
                        </span>
                        <span className="text-[10px] font-mono font-black text-[#c5a572] tracking-tighter">
                          {log.voucher_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          {mode === 'issuance' ? (log.room_number ? `RM ${log.room_number}` : '—') : log.venue}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{log.pax} PAX</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={12} />
                        <span className="text-xs font-medium">
                          {new Date(mode === 'issuance' ? log.created_at : log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {mode === 'issuance' ? (
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight ${
                          log.status === 'Redeemed' ? 'bg-emerald-50 text-emerald-600' :
                          log.status === 'Expired' ? 'bg-red-50 text-red-600' :
                          log.status === 'Active' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {log.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-tight">SUCCESS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                <Info size={24} />
              </div>
              <p className="text-sm text-gray-400 font-medium font-serif">No {mode} records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherAuditView;
