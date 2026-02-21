import { useState, useEffect, useCallback } from 'react';
import type { VoucherData } from '../VoucherPage';
import { VoucherCache } from '../utils/voucherCache';

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
    roomNumber: string;
    inputPath?: string;
    emailStatus?: string;
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
            id: String(item.voucherCode || item.code || item.id || item.voucherid || item.date || ''),
            guestName: String(item.guestName || item.userName || item.name || item.description || ''),
            roomNumber: String(item.roomNumber || item.room || item.amount || ''),
            checkIn: safeDate(item.checkIn || item.checkin || item.check_in || item.CheckIn || item.type),
            checkOut: safeDate(item.checkOut || item.checkout || item.check_out || item.CheckOut),
            status: String(item.status || item.category || ''),
            created_at: String(item.created_at || item.createdAt || item.timestamp || ''),
            redeemed_at: String(item.redeemed_at || item.redeemedAt || ''),
            imageUrl: String(item.imageUrl || item.imageurl || ''),
            services: servicesArr,
            serviceType: String(item.serviceType || item.service_type || ''),
            redeemed_service: String(item.redeemed_service || item.redeemedService || ''),
            redemptions: [],
            pax: item.pax ? parseInt(item.pax as any) : 1,
            secondGuestName: String(item.secondGuestName || ''),
            email: String(item.email || ''),
            whatsapp: String(item.whatsapp || '')
        };
    };

    const mapRedemption = (item: any): RedemptionData => ({
        timestamp: item.timestamp || item.created_at || item.redeemed_at || new Date().toISOString(),
        voucherCode: item.voucherCode || item.code || item.id || '',
        guestName: item.guestName || item.name || '',
        serviceType: item.serviceType || item.service_type || '',
        roomNumber: item.roomNumber || item.room || '',
        inputPath: item.inputPath || item.inputpath || '',
        emailStatus: item.emailStatus || item.emailstatus || ''
    });

    const fetchData = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsFetching(true);
        setFetchError(false);

        try {
            console.log('🚀 [useVoucherData v2.7] Fetching via Proxy API...');

            const [vResponse, rResponse] = await Promise.all([
                fetch('/api/get-data?sheet=Vouchers'),
                fetch('/api/get-data?sheet=Redemptions')
            ]);

            const vData = await vResponse.json();
            const rData = await rResponse.json();

            // Handling Apps Script Errors
            if (vData && vData.status === 'error') {
                console.error('GAS Error (Vouchers):', vData.message);
                setFetchError(true);
                return;
            }

            if (Array.isArray(vData)) {
                const mappedVouchers = vData.map(mapVoucher).reverse().filter(v => v.id);
                setRecentVouchers(VoucherCache.merge(mappedVouchers));
            }

            if (Array.isArray(rData)) {
                setRedemptions(rData.map(mapRedemption).reverse());
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

