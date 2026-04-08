import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle, 
  ArrowUpRight,
  PieChart,
  Layout
} from 'lucide-react';
import { useMarketingSummary } from '../hooks/useMarketingSummary';
import AnalyticsDashboard from './AnalyticsDashboard';
import type { VoucherData, RedemptionData } from '../VoucherPage';

interface AdminDashboardProps {
    vouchers: VoucherData[];
    redemptions: RedemptionData[];
    onViewVoucher?: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ vouchers, redemptions, onViewVoucher }) => {
    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#2c2420]">Admin Dashboard</h2>
                    <p className="text-sm text-gray-400">Unified performance & conversion analytics.</p>
                </div>
            </div>

            <AnalyticsDashboard 
                vouchers={vouchers} 
                redemptions={redemptions} 
                onViewVoucher={onViewVoucher} 
            />
        </div>
    );
};};

export default AdminDashboard;
