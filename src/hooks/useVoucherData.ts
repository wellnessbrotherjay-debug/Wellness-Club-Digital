import { useState, useEffect, useCallback } from 'react';
import { APPS_SCRIPT_URL } from '../constants/config';
import type { VoucherData } from '../VoucherPage';

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
    roomNumber: string;
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
            // setIsFetchingHistory(false); // Only set false when both are done or in loadRedemptions
            setFetchError(false);

            if (!Array.isArray(data)) {
                setRecentVouchers([]);
                // setRedemptions([]);
                return;
            }

            const mapped = data.map(item => {
                const safeDate = (dateStr: any) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                };

                return {
                    id: (item.voucherCode || item.code || item.id || item.voucherid) ? String(item.voucherCode || item.code || item.id || item.voucherid) : '',
                    guestName: item.guestName ? String(item.guestName) : '',
                    roomNumber: item.roomNumber ? String(item.roomNumber) : '',
                    checkIn: safeDate(item.checkIn),
                    checkOut: safeDate(item.checkOut),
                    status: item.status ? String(item.status) : '',
                    created_at: item.created_at || item.timestamp || '',
                    redeemed_at: item.redeemed_at || '',
                    imageUrl: item.imageUrl || '',
                    services: item.services ? String(item.services).split(', ') : [],
                    serviceType: item.serviceType || '', // Read serviceType column from backend
                    redeemed_service: item.redeemed_service || '', // Capture specific redemption service
                    redemptions: [],
                    pax: item.pax ? parseInt(item.pax as any) : 1,
                    secondGuestName: item.secondGuestName || ''
                };
            }).reverse();

            setRecentVouchers(mapped);
        };

        (window as any).loadRedemptions = (data: any) => {
            setIsFetchingHistory(false);
            setFetchError(false);
            setHasInitialLoaded(true);

            if (!Array.isArray(data)) {
                setRedemptions([]);
                return;
            }

            const mapped: RedemptionData[] = data.map(item => ({
                timestamp: item.timestamp || item.created_at || new Date().toISOString(),
                voucherCode: item.voucherCode || item.code || '',
                guestName: item.guestName || '',
                serviceType: item.serviceType || 'General Admission',
                roomNumber: item.roomNumber || ''
            })).reverse();

            setRedemptions(mapped);
        };
    }, []);

    const fetchData = useCallback((isSilent: boolean = false) => {
        if (!isSilent) setIsFetchingHistory(true);
        setFetchError(false);
        console.log('DEBUG: fetchData calling APPS_SCRIPT_URL:', APPS_SCRIPT_URL);

        const handleError = () => {
            setIsFetchingHistory(false);
            setFetchError(true);
        };

        // Fetch Vouchers
        const vScript = document.createElement('script');
        vScript.src = `${APPS_SCRIPT_URL}?callback=loadVouchers&sheet=Vouchers&t=${Date.now()}`;
        vScript.onerror = handleError;
        vScript.onload = () => document.body.removeChild(vScript);
        document.body.appendChild(vScript);

        // Fetch Redemptions
        const rScript = document.createElement('script');
        rScript.src = `${APPS_SCRIPT_URL}?callback=loadRedemptions&sheet=Redemptions&t=${Date.now()}`;
        rScript.onerror = handleError;
        rScript.onload = () => document.body.removeChild(rScript);
        document.body.appendChild(rScript);
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
