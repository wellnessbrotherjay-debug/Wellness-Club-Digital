const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';

async function debugVoucher(code) {
    if (!code) {
        console.error('Usage: node debug_voucher.js <VOUCHER_CODE>');
        return;
    }

    console.log(`--- Debugging Voucher: ${code} ---`);

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Vouchers`);
        const text = await response.text();

        let data;
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            data = JSON.parse(text);
        } else {
            const start = text.indexOf('(') + 1;
            const end = text.lastIndexOf(')');
            data = JSON.parse(text.substring(start, end));
        }

        const voucher = data.find(v => {
            const vCode = v.voucherCode || v.code || v.VoucherCode || '';
            return vCode.toUpperCase() === code.toUpperCase();
        });

        if (!voucher) {
            console.log('Voucher not found in Google Sheets.');
            return;
        }

        // These are for debugging purposes, not directly used in the logic below
        // const voucherCodeCol = voucher.voucherCode || voucher.code || voucher.VoucherCode || '';
        const checkOutRaw = voucher.checkOut || voucher.checkout || voucher.expires_at;

        console.log('Fields from Google Sheets:');
        console.log(JSON.stringify(voucher, null, 2));

        // Expiration status check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = checkOutRaw ? new Date(checkOutRaw) : null;
        if (expiry) expiry.setHours(0, 0, 0, 0);

        console.log('\nCalculated Status:');
        const status = (voucher.status || '').toLowerCase();
        if (status === 'redeemed') {
            console.log('Status: REDEEMED');
        } else if (expiry && expiry < today) {
            console.log('Status: EXPIRED');
        } else {
            console.log('Status: VALID');
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

const code = process.argv[2];
debugVoucher(code);
