import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/api';
import { supabase } from '../utils/supabase';
import type { VoucherData } from '../VoucherPage';

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
    roomNumber: string;
    inputPath?: string;
    emailStatus?: string;
    weather?: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
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
            if (isNaN(d.getTime())) {
                // Try parsing DD/MM/YYYY if standard fails
                const parts = String(dateStr).split('/');
                if (parts.length === 3) {
                    const nd = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    if (!isNaN(nd.getTime())) return nd.toISOString().split('T')[0];
                }
                return '';
            }
            return d.toISOString().split('T')[0];
        };

        // Robust Service Parsing
        let servicesArr: string[] = [];
        const rawServices = item.services || item.service || item.Services || '';
        if (Array.isArray(rawServices)) {
            servicesArr = rawServices.map(String);
        } else if (rawServices) {
            servicesArr = String(rawServices).split(',').map(s => s.trim()).filter(Boolean);
        }

        return {
            id: String(item.voucher_code || item.voucherCode || item.code || item.id || item.voucherid || item.date || ''),
            guestName: String(item.guest_name || item.guestName || item.userName || item.name || item.description || ''),
            roomNumber: String(item.room_number || item.roomNumber || item.room || item.amount || ''),
            checkIn: safeDate(item.check_in || item.checkIn || item.checkin || item.CheckIn || item.type),
            checkOut: safeDate(item.check_out || item.checkOut || item.checkout || item.CheckOut),
            status: String(item.status || item.category || ''),
            created_at: String(item.created_at || item.createdAt || item.timestamp || ''),
            redeemed_at: String(item.redeemed_at || item.redeemedAt || ''),
            imageUrl: String(item.imageUrl || item.imageurl || ''),
            services: servicesArr,
            serviceType: String(item.service_type || item.serviceType || item.servicetype || ''),
            redeemed_service: String(item.redeemed_service || item.redeemedService || ''),
            redemptions: [],
            pax: item.pax ? parseInt(String(item.pax), 10) : 1,
            secondGuestName: String(item.secondGuestName || ''),
            email: String(item.email || ''),
            whatsapp: String(item.whatsapp || ''),
            weather: String(item.weather || ''),
            deviceId: String(item.deviceId || item.device_id || ''),
            ipAddress: String(item.ipAddress || item.ip_address || ''),
            userAgent: String(item.userAgent || item.user_agent || '')
        };
    };

    const mapRedemption = (item: Record<string, unknown>): RedemptionData => ({
        timestamp: String(item.timestamp || item.created_at || item.redeemed_at || new Date().toISOString()),
        voucherCode: String(item.voucher_code || item.voucherCode || item.code || item.id || ''),
        guestName: String(item.guest_name || item.guestName || item.name || ''),
        serviceType: String(item.service_type || item.serviceType || item.servicetype || ''),
        roomNumber: String(item.room_number || item.roomNumber || item.room || ''),
        inputPath: String(item.inputPath || item.inputpath || ''),
        emailStatus: String(item.emailStatus || item.emailstatus || ''),
        weather: String(item.weather || ''),
        ipAddress: String(item.ipAddress || item.ip_address || ''),
        deviceId: String(item.deviceId || item.device_id || ''),
        userAgent: String(item.userAgent || item.user_agent || '')
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
        refresh: () => fetchData(false)
    };
};

