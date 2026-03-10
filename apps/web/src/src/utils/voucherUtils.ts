import type { VoucherData } from '../VoucherPage';

/**
 * Parses a date string and returns a Date object properly shifted to represent midnight
 * on that calendar day in UTC+8.
 * Then we add 22 hours to represent 10 PM UTC+8.
 */
const getExpirationInUTC = (dateString: string): number => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 0;

    // Convert the given date to a UTC+8 calendar day.
    // If date is '2026-03-06T16:00:00.000Z', the UTC time is 16:00. Adding 8 hours gives 24:00 (Midnight March 7th).
    // Let's get the absolute UTC time of the date
    const utcTime = d.getTime();
    
    // Add 8 hours to get the UTC+8 representation of whatever time it is
    const utc8Time = new Date(utcTime + (8 * 60 * 60 * 1000));
    
    // We want 10 PM (22:00) on that UTC+8 day.
    // Let's construct a UTC date that matches 10 PM UTC+8 (which is 14:00 UTC) on the same calendar day.
    const year = utc8Time.getUTCFullYear();
    const month = utc8Time.getUTCMonth();
    const date = utc8Time.getUTCDate();
    
    // 14:00 UTC is exactly 22:00 (10 PM) UTC+8.
    const expirationUTC = new Date(Date.UTC(year, month, date, 14, 0, 0, 0));
    
    return expirationUTC.getTime();
};

/**
 * Checks if a voucher is expired based on the 10 PM (22:00) cut-off rule in UTC+8.
 * Vouchers are valid until 10 PM on their checkOut or expires_at date.
 */
export const isVoucherExpired = (voucher: VoucherData | any): boolean => {
    const expiryStr = voucher.checkOut || voucher.checkout || voucher.check_out || voucher.expires_at;
    if (!expiryStr) return false;

    const expirationTimeMs = getExpirationInUTC(expiryStr);
    if (!expirationTimeMs) return false;

    return Date.now() > expirationTimeMs;
};

/**
 * Returns the expiration Date object for a voucher (at 10 PM on the expiry day).
 */
export const getVoucherExpirationDate = (voucher: VoucherData | any): Date | null => {
    const expiryStr = voucher.checkOut || voucher.checkout || voucher.check_out || voucher.expires_at;
    if (!expiryStr) return null;

    const expirationTimeMs = getExpirationInUTC(expiryStr);
    if (!expirationTimeMs) return null;

    return new Date(expirationTimeMs);
};
