import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';
import { supabase } from '../utils/supabase';

export interface MarketingSummary {
    total_issued: number;
    total_redeemed: number;
    total_pax_pool: number;
    total_pax_redeemed: number;
    conversion_rate: number;
    pax_redemption_rate: number;
    unique_guests: number;
    performance: {
        fashion: number;
        hair: number;
        wellness: number;
    };
    leaderboard: { name: string, count: number }[];
    marketing: {
        count: number;
        rate: number;
    };
    daily_stats: {
        date: string;
        issued: number;
        redeemed: number;
    }[];
}

export const useMarketingSummary = () => {
    const [summary, setSummary] = useState<MarketingSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/data/summary`);
            if (!response.ok) throw new Error('Failed to fetch summary');
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
        const channel = supabase
            .channel('marketing-summary-updates')
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
    }, []);

    return { summary, isLoading, error, refresh: fetchSummary };
};
