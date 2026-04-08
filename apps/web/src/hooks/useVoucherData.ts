import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { supabase } from '../utils/supabase';
import type { VoucherData } from '../VoucherPage';

export interface RedemptionData {
    timestamp: string;
    voucher_code: string;
    guest_name: string;
    service_type: string;
    room_number: string;
    email?: string;
    whatsapp?: string;
    weather?: string;
    total?: number;
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
        const rawServices = item.services || item.service_type || '';
        if (Array.isArray(rawServices)) {
            servicesArr = rawServices.map(String);
        } else if (rawServices) {
            servicesArr = String(rawServices).split(',').map(s => s.trim()).filter(Boolean);
        }

        return {
            voucher_code: String(item.voucher_code || item.voucherCode || item.code || item.id || ''),
            guest_name: String(item.guest_name || item.guestName || item.guest || ''),
            room_number: String(item.room_number || item.roomNumber || item.room || ''),
            check_in: safeDate(item.check_in || item.checkIn || ''),
            check_out: safeDate(item.check_out || item.checkOut || item.checkout || ''),
            status: String(item.status || 'Created'),
            qr_source_location: String(item.qr_source_location || item.qrSourceLocation || item.category || 'reception'),
            created_at: String(item.created_at || item.createdAt || ''),
            redeemed_at: item.redeemed_at ? String(item.redeemed_at) : (item.redeemedAt ? String(item.redeemedAt) : undefined),
            image_url: String(item.image_url || item.imageUrl || ''),
            services: servicesArr,
            pax: parseInt(String(item.pax || item.Pax || '1'), 10),
            email: String(item.email || ''),
            whatsapp: String(item.whatsapp || item.phone || ''),
            weather: String(item.weather || ''),
            device_id: String(item.device_id || item.deviceId || ''),
            ip_address: String(item.ip_address || item.ipAddress || ''),
            user_agent: String(item.user_agent || item.userAgent || ''),
            is_test: !!(item.is_test || item.isTest || item.IsTest),
            marketing_consent: !!(item.marketing_consent || item.marketingConsent),
        };
    };

    const mapRedemption = (item: Record<string, unknown>): RedemptionData => ({
        timestamp: String(item.timestamp || new Date().toISOString()),
        voucher_code: String(item.voucher_code || item.voucherCode || ''),
        guest_name: String(item.guest_name || item.guestName || ''),
        service_type: String(item.service_type || item.serviceType || ''),
        room_number: String(item.room_number || item.roomNumber || ''),
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
                const mappedVouchers = vData.map(mapVoucher).filter(v => v.voucher_code);
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

