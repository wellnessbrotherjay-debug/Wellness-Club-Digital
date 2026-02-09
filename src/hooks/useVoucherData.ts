import { useState, useEffect, useCallback } from 'react';
import { APPS_SCRIPT_URL } from '../constants/config';
import type { VoucherData } from '../VoucherPage';

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
}

export const useVoucherData = () => {
    const [recentVouchers, setRecentVouchers] = useState<VoucherData[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionData[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

    // Extend window for JSONP callbacks
    useEffect(() => {
        (window as any).loadVouchers = (data: any) => {
            setIsFetchingHistory(false);
            setFetchError(false);

            if (!Array.isArray(data)) {
                setRecentVouchers([]);
                setRedemptions([]);
                setHasInitialLoaded(true);
                return;
            }

            const mapped = data.map(item => {
                const safeDate = (dateStr: any) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                };

                return {
                    id: item.code ? String(item.code) : '',
                    guestName: item.guestName ? String(item.guestName) : '',
                    roomNumber: item.roomNumber ? String(item.roomNumber) : '',
                    checkIn: safeDate(item.checkIn),
                    checkOut: safeDate(item.checkOut),
                    status: item.status ? String(item.status) : '',
                    created_at: item.created_at || item.timestamp || '',
                    redeemed_at: item.redeemed_at || '',
                    imageUrl: item.imageUrl || '',
                    services: item.services ? String(item.services).split(', ') : [],
                    redemptions: [],
                    pax: item.pax ? parseInt(item.pax as any) : 1,
                    secondGuestName: item.secondGuestName || ''
                };
            }).reverse();

            setRecentVouchers(mapped);

            // Derive redemptions from vouchers
            const derivedRedemptions: RedemptionData[] = mapped
                .filter(v => v.status === 'Redeemed')
                .map(v => ({
                    timestamp: v.redeemed_at || v.created_at, // Fallback to created_at if redeemed_at is missing
                    voucherCode: v.id,
                    guestName: v.guestName,
                    serviceType: v.services && v.services.length > 0 ? v.services[0] : 'General Admission'
                }));

            setRedemptions(derivedRedemptions);
            setHasInitialLoaded(true);
        };
    }, []);

    const fetchData = useCallback((isSilent: boolean = false) => {
        if (!isSilent) setIsFetchingHistory(true);
        setFetchError(false);

        // Fetch Vouchers
        const vScript = document.createElement('script');
        vScript.src = `${APPS_SCRIPT_URL}?callback=loadVouchers&sheet=Vouchers&t=${Date.now()}`;
        document.body.appendChild(vScript);
        vScript.onload = () => document.body.removeChild(vScript);

        vScript.onerror = () => {
            setIsFetchingHistory(false);
            setFetchError(true);
        };
    }, []);

    // Polling setup
    useEffect(() => {
        fetchData(); // Initial load

        const pollInterval = setInterval(() => {
            fetchData(true);
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [fetchData]);

    return {
        vouchers: recentVouchers,
        setVouchers: setRecentVouchers, // Exposed for manual updates (e.g. after creation)
        redemptions,
        isFetching: isFetchingHistory,
        hasLoaded: hasInitialLoaded,
        error: fetchError,
        refresh: fetchData
    };
};
