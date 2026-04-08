import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { supabase } from '../utils/supabase';
import type { VoucherData } from '../VoucherPage';

interface RedemptionData {
    timestamp: string;
    voucherCode: string; // Internal/Google Sheets compatibility
    voucherId?: string;  // Explicitly requested name
    guestName: string;
    serviceType: string;
    roomNumber: string;
    inputPath?: string;
    emailStatus?: string;
    weather?: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
    Pax?: number;
    IsTest?: boolean;
    Category?: string;
}

export const useVoucherData = () => {
    const [recentVouchers, setRecentVouchers] = useState<VoucherData[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionData[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

    const mapVoucher = (item: Record<string, unknown>): VoucherData => {
        const safeDate = (dateStr: unknown) => {
            if (!dateStr) return '';
            const d = new Date(dateStr as string);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        let servicesArr: string[] = [];
        const rawServices = item.services || '';
        if (Array.isArray(rawServices)) {
            servicesArr = rawServices.map(String);
        } else if (rawServices) {
            servicesArr = String(rawServices).split(',').map(s => s.trim()).filter(Boolean);
        }

        return {
            voucher_code: String(item.voucher_code || ''),
            guest_name: String(item.guest_name || ''),
            room_number: String(item.room_number || ''),
            check_in: safeDate(item.check_in),
            check_out: safeDate(item.check_out),
            status: String(item.status || 'Created'),
            qr_source_location: String(item.qr_source_location || 'reception'),
            created_at: String(item.created_at || ''),
            redeemed_at: item.redeemed_at ? String(item.redeemed_at) : undefined,
            image_url: String(item.image_url || ''),
            services: servicesArr,
            pax: parseInt(String(item.pax || '1'), 10),
            email: String(item.email || ''),
            whatsapp: String(item.whatsapp || ''),
            weather: String(item.weather || ''),
            device_id: String(item.device_id || ''),
            ip_address: String(item.ip_address || ''),
            user_agent: String(item.user_agent || ''),
            is_test: !!item.is_test,
            marketing_consent: !!item.marketing_consent,
        };
    };

    const mapRedemption = (item: Record<string, unknown>): RedemptionData => ({
        timestamp: String(item.timestamp || new Date().toISOString()),
        voucher_code: String(item.voucher_code || ''),
        guest_name: String(item.guest_name || ''),
        service_type: String(item.service_type || ''),
        room_number: String(item.room_number || ''),
        email: String(item.email || ''),
        whatsapp: String(item.whatsapp || ''),
        weather: String(item.weather || ''),
    });

    const fetchData = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsFetching(true);
        setFetchError(false);

        try {
            console.log('🚀 [useVoucherData] Fetching from Hono API...');

            const [vResponse, rResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/data?sheet=vouchers&t=${Date.now()}`),
                fetch(`${API_BASE_URL}/api/data?sheet=redemptions&t=${Date.now()}`)
            ]);

            const [vData, rData] = [
                vResponse.ok ? await vResponse.json() : [],
                rResponse.ok ? await rResponse.json() : []
            ];

            if (Array.isArray(vData)) {
                // The Hono backend brings snake_case data directly from Supabase.
                // mapVoucher is mostly tolerant, but let's make sure things like voucher_code map.
                const mappedVouchers = vData.map(mapVoucher).filter(v => v.id);
                setRecentVouchers(mappedVouchers);
            }

            if (Array.isArray(rData)) {
                setRedemptions(rData.map(mapRedemption));
            }

            setHasInitialLoaded(true);
        } catch (error) {
            console.error('❌ [useVoucherData v2.7] Fetch Error:', error);
            setFetchError(true);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes across vouchers and redemptions
        const channel = supabase
            .channel('voucher-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vouchers' },
                (payload) => {
                    console.log('🔥 [Realtime] Voucher change:', payload);
                    fetchData(true); // Silent background refresh
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'redemptions' },
                (payload) => {
                    console.log('🔥 [Realtime] Redemption change:', payload);
                    fetchData(true); // Silent background refresh
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    return {
        vouchers: recentVouchers,
        setVouchers: setRecentVouchers,
        redemptions,
        isFetching,
        hasLoaded: hasInitialLoaded,
        error: fetchError,
        refresh: () => fetchData(false),
        mutate: () => {
            localStorage.removeItem('pending_vouchers');
            localStorage.removeItem('pending_redemptions');
            return fetchData(false);
        }
    };
};

