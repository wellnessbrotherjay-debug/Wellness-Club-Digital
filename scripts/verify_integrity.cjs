const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';

async function verifyIntegrity() {
    console.log('--- Verifying Data Integrity ---');
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

        const invalidRedemptions = data.filter(v => {
            if (v.status !== 'Redeemed' || !v.redeemed_at || !v.checkOut) return false;

            const redeemed = new Date(v.redeemed_at);
            const expiry = new Date(v.checkOut);
            expiry.setHours(23, 59, 59, 999); // End of the day

            return redeemed > expiry;
        });

        console.log(`Found ${invalidRedemptions.length} invalid redemptions (Redeemed after Expiry).`);

        invalidRedemptions.forEach(v => {
            console.log(`[INVALID] ${v.voucherCode} | Guest: ${v.guestName} | Expiry: ${v.checkOut} | Redeemed: ${v.redeemed_at}`);
        });

        if (invalidRedemptions.length > 0) {
            console.log('\nSuggested Action: These should be marked as "Expired" and redeemed_at nullified.');
            console.log('Run: node scripts/nullify_invalid.cjs');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyIntegrity();
