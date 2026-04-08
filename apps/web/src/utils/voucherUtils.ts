import type { VoucherData } from '../VoucherPage';

/**
 * Checks if a voucher is expired based on the 10 PM (22:00) cut-off rule.
 * Vouchers are valid until 10 PM on their checkOut or expires_at date.
 */
export const isVoucherExpired = (voucher: Partial<VoucherData>): boolean => {
    const expiryStr = voucher.check_out;
    if (!expiryStr) return false;

    const expiryDate = new Date(expiryStr);
    if (isNaN(expiryDate.getTime())) return false;

    // Set expiration to 10 PM (22:00) on the target date
    // Note: If the date string is 'YYYY-MM-DD', new Date() parses it as UTC midnight.
    // We want local 10 PM on that day.
    const expirationTime = new Date(
        expiryDate.getFullYear(),
        expiryDate.getMonth(),
        expiryDate.getDate(),
        22, 0, 0, 0
    );

    return Date.now() > expirationTime.getTime();
};

/**
 * Returns the expiration Date object for a voucher (at 10 PM on the expiry day).
 */
export const getVoucherExpirationDate = (voucher: Partial<VoucherData>): Date | null => {
    const expiryStr = voucher.check_out;
    if (!expiryStr) return null;

    const expiryDate = new Date(expiryStr);
    if (isNaN(expiryDate.getTime())) return null;

    return new Date(
        expiryDate.getFullYear(),
        expiryDate.getMonth(),
        expiryDate.getDate(),
        22, 0, 0, 0
    );
};
