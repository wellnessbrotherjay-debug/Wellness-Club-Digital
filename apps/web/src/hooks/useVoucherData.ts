import { useState, useEffect, useCallback } from 'react';
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

    const mapVoucher = (item: any): VoucherData => {
        const safeDate = (dateStr: any) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
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
            pax: item.pax ? parseInt(item.pax as any) : 1,
            secondGuestName: String(item.secondGuestName || ''),
            email: String(item.email || ''),
            whatsapp: String(item.whatsapp || ''),
            weather: String(item.weather || ''),
            deviceId: String(item.deviceId || item.device_id || ''),
            ipAddress: String(item.ipAddress || item.ip_address || ''),
            userAgent: String(item.userAgent || item.user_agent || '')
        };
    };

    const mapRedemption = (item: any): RedemptionData => ({
        timestamp: item.timestamp || item.created_at || item.redeemed_at || new Date().toISOString(),
        voucherCode: item.voucher_code || item.voucherCode || item.code || item.id || '',
        guestName: item.guest_name || item.guestName || item.name || '',
        serviceType: item.service_type || item.serviceType || item.servicetype || '',
        roomNumber: item.room_number || item.roomNumber || item.room || '',
        inputPath: item.inputPath || item.inputpath || '',
        emailStatus: item.emailStatus || item.emailstatus || '',
        weather: item.weather || '',
        ipAddress: item.ipAddress || item.ip_address || '',
        deviceId: item.deviceId || item.device_id || '',
        userAgent: item.userAgent || item.user_agent || ''
    });

    const fetchData = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsFetching(true);
        setFetchError(false);

        try {
            console.log('🚀 [useVoucherData] Fetching from Hono API...');

            const [vResponse, rResponse] = await Promise.all([
                fetch(`/api/data?sheet=vouchers&t=${Date.now()}`),
                fetch(`/api/data?sheet=redemptions&t=${Date.now()}`)
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
        const poll = setInterval(() => fetchData(true), 15000); // Poll every 15s for lower impact
        return () => clearInterval(poll);
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

