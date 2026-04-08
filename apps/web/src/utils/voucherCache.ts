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
            cache[voucher.voucher_code] = {
                ...voucher,
                // Ensure we capture critical fields even if backend loses them
                email: voucher.email || '',
                whatsapp: voucher.whatsapp || '',
                pax: voucher.pax || 1,
                check_in: voucher.check_in || '',
                check_out: voucher.check_out || '',
                status: voucher.status || 'Created'
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            console.log(`Cached voucher ${voucher.voucher_code} locally.`);
        } catch (e) {
            console.error('Failed to save voucher to cache', e);
        }
    },

    merge: (fetchedVouchers: VoucherData[]): VoucherData[] => {
        const cache = VoucherCache.getAll();
        const fetchedIds = new Set(fetchedVouchers.map(v => v.voucher_code));

        // 1. Process fetched vouchers and merge with cached data
        const merged = fetchedVouchers.map(v => {
            const cached = cache[v.voucher_code];
            if (!cached) return v;

            return {
                ...v,
                email: v.email || cached.email || '',
                whatsapp: v.whatsapp || cached.whatsapp || '',
                pax: v.pax || cached.pax || 1,
                check_in: v.check_in || cached.check_in || '',
                check_out: v.check_out || cached.check_out || '',
                status: (v.status && v.status !== 'Created') ? v.status : (cached.status || v.status),
            };
        });

        // 2. Add vouchers from cache that are NOT in the fetched list yet
        // (This happens between creation and first backend success)
        const pending = Object.values(cache).filter(cached => !fetchedIds.has(cached.voucher_code));

        // Return combined list, pending first for immediate visibility
        return [...pending, ...merged];
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
