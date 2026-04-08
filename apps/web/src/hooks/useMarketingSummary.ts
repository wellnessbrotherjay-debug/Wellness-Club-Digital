import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';
import { supabase } from '../utils/supabase';

export interface MarketingSummary {
    pax_performance: {
        total_pax: number;
        distribution: Record<string, number>;
    };
    venue_details: {
        name: string;
        count: number;
        last_redemption: string;
    }[];
    pax_details: {
        type: string;
        count: number;
        pax: number;
        total_pax: number;
    }[];
    performance: {
        redemption_rate: {
            redeemed: number;
            total: number;
            percentage: number;
            pending: number;
        };
    };
    audit_stats: {
        live_vouchers: number;
        database_total: number;
    };
    top_venue: {
        name: string;
        count: number;
    };
    issuance_logs: {
        voucher_code: string;
        guest_name: string;
        room_number: string;
        created_at: string;
        pax: number;
        status: string;
    }[];
    redemption_logs: {
        voucher_code: string;
        guest_name: string;
        venue: string;
        timestamp: string;
        pax: number;
    }[];
}

export const useMarketingSummary = (range: string = 'all') => {
    const [summary, setSummary] = useState<MarketingSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/summary?range=${range}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to fetch summary');
            }
            const data = await response.json();
            setSummary(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();

        // Subscribe to real-time changes to refresh KPIs instantly
        // Using a unique channel name to avoid "after subscribe" errors if multiple components use this hook
        const channelId = `marketing-summary-${Math.random().toString(36).slice(2, 9)}`;
        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vouchers' },
                () => fetchSummary()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'redemptions' },
                () => fetchSummary()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [range]);

    return { summary, isLoading, error, refresh: fetchSummary };
};
