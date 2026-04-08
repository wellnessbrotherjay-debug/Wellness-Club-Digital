import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  UserX, 
  FlaskConical, 
  CheckCircle2, 
  Info,
  Search,
  ChevronRight,
  Filter
} from "lucide-react";
import type { MarketingSummary } from '../hooks/useMarketingSummary';
import type { VoucherData } from '../VoucherPage';

interface VoucherAuditViewProps {
  summary: MarketingSummary;
  allVouchers: VoucherData[];
  onViewVoucher?: (voucherCode: string) => void;
}

type FilterCategory = 'ALL' | 'PRODUCTION' | 'UNKNOWN' | 'TEST';

const VoucherAuditView: React.FC<VoucherAuditViewProps> = ({ summary, allVouchers, onViewVoucher }) => {
  const { audit_stats } = summary;
  const [filter, setFilter] = useState<FilterCategory>('PRODUCTION');
  const [searchQuery, setSearchQuery] = useState('');

  // Utility to match backend filtering logic for consistency
  const isTest = (name: string, code: string) => {
    const n = name.toLowerCase();
    const c = code.toLowerCase();
    return n.includes('test') || n.includes('jay') || n.includes('samual') || c.startsWith('test-');
  };

  const isUnknown = (name: string) => {
    return !name || name === 'Unknown Guest' || name.trim() === '';
  };

  const filteredVouchers = useMemo(() => {
    return allVouchers.filter(v => {
      const test = v.is_test || isTest(v.guest_name || '', v.voucher_code || '');
      const unknown = isUnknown(v.guest_name || '');
      const production = !test && !unknown;

      let matchesCategory = false;
      if (filter === 'ALL') matchesCategory = true;
      else if (filter === 'PRODUCTION') matchesCategory = production;
      else if (filter === 'UNKNOWN') matchesCategory = unknown;
      else if (filter === 'TEST') matchesCategory = test;

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
  }, [allVouchers, filter, searchQuery]);

  const cards = [
    {
      id: 'PRODUCTION' as FilterCategory,
      title: "Production",
      value: audit_stats?.total_real || 0,
      icon: <CheckCircle2 className="text-emerald-500" />,
      description: "Verified Data",
      color: "border-emerald-200"
    },
    {
      id: 'UNKNOWN' as FilterCategory,
      title: "Unknown",
      value: audit_stats?.unknown_count || 0,
      icon: <UserX className="text-amber-500" />,
      description: "Missing Details",
      color: "border-amber-200"
    },
    {
      id: 'TEST' as FilterCategory,
      title: "Test",
      value: audit_stats?.test_count || 0,
      icon: <FlaskConical className="text-purple-500" />,
      description: "Dev/Test Entries",
      color: "border-purple-200"
    },
    {
      id: 'ALL' as FilterCategory,
      title: "Total Raw",
      value: audit_stats?.total_raw || allVouchers.length,
      icon: <ShieldAlert className="text-gray-400" />,
      description: "All Records",
      color: "border-gray-200"
    }
  ];

  const integrityScore = audit_stats?.total_raw 
    ? Math.round((audit_stats.total_real / audit_stats.total_raw) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Integrity Score Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-gray-100"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={175.9}
                strokeDashoffset={175.9 * (1 - integrityScore / 100)}
                className="text-[#c5a572] transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-sm font-bold text-[#2c2420]">{integrityScore}%</span>
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#2c2420]">Data Integrity Score</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Overall Database Health</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 italic text-[11px] text-gray-500 max-w-xs text-center md:text-right">
            System identifies "Unknown" records as those missing guest names or derived from generic imports.
          </div>
        </div>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => setFilter(card.id)}
            className={`p-5 rounded-3xl border text-left transition-all hover:shadow-md active:scale-95 ${
              filter === card.id 
              ? `${card.color} bg-white ring-2 ring-[#c5a572]/20 shadow-sm` 
              : 'border-transparent bg-gray-50/50 hover:bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-50">{card.icon}</div>
              <span className="text-xl font-bold text-[#2c2420]">{card.value}</span>
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.title}</h4>
          </button>
        ))}
      </div>

      {/* Search & List Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#fcfaf7] rounded-xl text-[#c5a572]">
              <Filter size={18} />
            </div>
            <div>
              <h3 className="text-md font-bold text-[#2c2420] capitalize">{filter.toLowerCase()} Vouchers</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Showing {filteredVouchers.length} records</p>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#c5a572] transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search by name or code..."
              className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#c5a572]/20 transition-all outline-none w-full md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredVouchers.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm z-10">
                <tr className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                  <th className="px-6 py-4">Voucher Info</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVouchers.map((v) => {
                  const test = v.is_test || isTest(v.guest_name || '', v.voucher_code || '');
                  const unknown = isUnknown(v.guest_name || '');
                  
                  return (
                    <tr 
                      key={v.voucher_code} 
                      className="group hover:bg-[#fcfaf7] transition-all cursor-pointer"
                      onClick={() => onViewVoucher?.(v.voucher_code)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800 group-hover:text-[#2c2420]">
                            {v.guest_name || <span className="text-gray-300 italic">No Name</span>}
                          </span>
                          <span className="text-[10px] font-mono font-black text-[#c5a572] tracking-tighter">
                            {v.voucher_code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          {v.room_number ? `RM ${v.room_number}` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {test ? (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold uppercase tracking-tight">Test</span>
                        ) : unknown ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-tight">Unknown</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-tight">Pass</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-[#c5a572] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <span className="text-[10px] font-bold uppercase">Details</span>
                          <ChevronRight size={14} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                <Info size={24} />
              </div>
              <p className="text-sm text-gray-400 font-medium font-serif">No records found for this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherAuditView;
