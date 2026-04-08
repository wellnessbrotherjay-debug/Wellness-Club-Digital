import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  UserX, 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Search,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { MarketingSummary } from '../hooks/useMarketingSummary';
import { VoucherData } from '../VoucherPage';

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

  // Utility to match backend filtering logic
  const isTest = (name: string, code: string) => {
    const n = name.toLowerCase();
    const c = code.toLowerCase();
    return n.includes('test') || n.includes('jay') || n.includes('samual') || c.startsWith('test-');
  };

  const isUnknown = (name: string) => {
    return !name || name === 'Unknown Guest' || name.trim() === '';
  };

  const stats = audit_stats || {
    total_raw: allVouchers.length,
    total_real: 0, // Will recalculate if needed
    unknown_count: 0,
    test_count: 0
  };

  const filteredVouchers = useMemo(() => {
    return allVouchers.filter(v => {
      let matchesCategory = false;
      const test = v.is_test || isTest(v.guest_name || '', v.voucher_code || '');
      const unknown = isUnknown(v.guest_name || '');
      const production = !test && !unknown;

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
      id: 'ALL' as FilterCategory,
      title: "Total Records",
      value: stats.total_raw,
      icon: <ShieldAlert className="text-gray-400" />,
      description: "Complete Database",
      color: "border-gray-200"
    },
    {
      id: 'PRODUCTION' as FilterCategory,
      title: "Production",
      value: stats.total_real,
      icon: <CheckCircle2 className="text-emerald-500" />,
      description: "Verified Data",
      color: "border-emerald-200 bg-emerald-50/30"
    },
    {
      id: 'UNKNOWN' as FilterCategory,
      title: "Unknown",
      value: stats.unknown_count,
      icon: <UserX className="text-amber-500" />,
      description: "Missing Details",
      color: "border-amber-200"
    },
    {
      id: 'TEST' as FilterCategory,
      title: "Test",
      value: stats.test_count,
      icon: <FlaskConical className="text-purple-500" />,
      description: "Dev/Test Entries",
      color: "border-purple-200"
    }
  ];

  const integrityScore = stats.total_raw > 0 
    ? Math.round((stats.total_real / stats.total_raw) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div 
            key={card.id} 
            onClick={() => setFilter(card.id)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] ${
                filter === card.id 
                ? `${card.color} ring-2 ring-offset-2 ring-[#c5a572]/20 shadow-md` 
                : 'border-gray-100 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-50">{card.icon}</div>
              <span className="text-2xl font-bold text-[#2c2420]">{card.value}</span>
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</h3>
            <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#2c2420]">
                {filter === 'PRODUCTION' ? 'Production Voucher' : 
                 filter === 'UNKNOWN' ? 'Unknown/Empty guest' : 
                 filter === 'TEST' ? 'Test Entries' : 'All Database'} Audit
              </h3>
              <p className="text-sm text-gray-500">Managing {filteredVouchers.length} records in this category.</p>
            </div>
            
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Search audit list..."
                        className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#c5a572]/20 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  <th className="px-4 pb-2">Status</th>
                  <th className="px-4 pb-2">Voucher Code</th>
                  <th className="px-4 pb-2">Guest Name</th>
                  <th className="px-4 pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.slice(0, 50).map((v) => {
                  const test = v.is_test || isTest(v.guest_name || '', v.voucher_code || '');
                  const unknown = isUnknown(v.guest_name || '');
                  
                  return (
                    <tr 
                      key={v.voucher_code} 
                      className="group bg-white hover:bg-[#fcfaf7] transition-all cursor-pointer"
                      onClick={() => onViewVoucher?.(v.voucher_code)}
                    >
                      <td className="px-4 py-4 rounded-l-2xl border-y border-l border-gray-50 group-hover:border-[#c5a572]/20">
                        {test ? (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-[9px] font-bold uppercase">Test</span>
                        ) : unknown ? (
                          <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[9px] font-bold uppercase">Unknown</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">Pass</span>
                        )}
                      </td>
                      <td className="px-4 py-4 border-y border-gray-50 group-hover:border-[#c5a572]/20">
                        <span className="font-mono text-xs font-bold text-[#c5a572]">{v.voucher_code}</span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-50 group-hover:border-[#c5a572]/20">
                        <span className="text-sm font-medium text-gray-700">
                          {v.guest_name || <em className="text-gray-300 italic">No name provided</em>}
                        </span>
                        {v.room_number && (
                          <span className="ml-2 text-[10px] text-gray-400">Rm {v.room_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 rounded-r-2xl border-y border-r border-gray-50 group-hover:border-[#c5a572]/20 text-right">
                        <div className="flex items-center justify-end gap-2 text-[#c5a572] opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold uppercase">View Detail</span>
                            <ChevronRight size={14} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredVouchers.length > 50 && (
                <p className="text-center text-[10px] text-gray-400 mt-4 uppercase font-bold tracking-widest">
                  Showing first 50 of {filteredVouchers.length} records. Use search to find specific vouchers.
                </p>
            )}
            {filteredVouchers.length === 0 && (
                <div className="py-20 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                        <Info size={24} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No results found matching your search or filter.</p>
                </div>
            )}
          </div>
        </div>

        {/* Audit Meta Footer */}
        <div className="p-6 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-[#c5a572] shadow-sm">
                    <ShieldAlert size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">Database Health Score: {integrityScore}%</p>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Audit reflects full database synchronization.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                  className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
                  onClick={() => window.open('https://docs.google.com/spreadsheets/d/1iwkhqmonkmvyeemlihlz/edit', '_blank')}
                >
                    <ExternalLink size={14} />
                    RAW SPREADSHEET
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherAuditView;
