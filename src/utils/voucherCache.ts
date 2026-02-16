import type { VoucherData } from '../VoucherPage';

const CACHE_KEY = 'reception_vouchers_cache';

export const VoucherCache = {
    getAll: (): Record<string, VoucherData> => {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Failed to parse voucher cache', e);
            return {};
        }
    },

    save: (voucher: VoucherData) => {
        try {
            const cache = VoucherCache.getAll();
            cache[voucher.id] = {
                ...voucher,
                // Ensure we capture critical fields even if backend loses them
                email: voucher.email || '',
                whatsapp: voucher.whatsapp || '',
                pax: voucher.pax || 1,
                checkIn: voucher.checkIn || '',
                checkOut: voucher.checkOut || '',
                status: voucher.status || 'Created'
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            console.log(`Cached voucher ${voucher.id} locally.`);
        } catch (e) {
            console.error('Failed to save voucher to cache', e);
        }
    },

    merge: (fetchedVouchers: VoucherData[]): VoucherData[] => {
        const cache = VoucherCache.getAll();

        return fetchedVouchers.map(v => {
            const cached = cache[v.id];
            if (!cached) return v;

            // Merge: If fetched is missing critical fields but cache has them, use cache.
            // But prefer fetched for status/redemption updates.
            return {
                ...v,
                email: v.email || cached.email || '',
                whatsapp: v.whatsapp || cached.whatsapp || '',
                pax: v.pax || cached.pax || 1,
                checkIn: v.checkIn || cached.checkIn || '',
                checkOut: v.checkOut || cached.checkOut || '',
                // Keep status from backend if it exists and is updated (e.g. Redeemed)
                // If backend status is missing/empty, fallback to cache
                status: (v.status && v.status !== 'Created') ? v.status : (cached.status || v.status),
                // Merge services list if one is fuller? Maybe just trust backend for that.
                // Critical contact info wins from cache if backend is empty.
            };
        });
    },

    delete: (id: string | string[]) => {
        const cache = VoucherCache.getAll();
        const ids = Array.isArray(id) ? id : [id];
        ids.forEach(i => delete cache[i]);
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    },

    clear: () => {
        localStorage.removeItem(CACHE_KEY);
    }
};
