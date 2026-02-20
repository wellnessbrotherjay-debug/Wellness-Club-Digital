const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';

async function auditRedemptions() {
    console.log('--- Auditing Redemptions for Incomplete Data ---');
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Vouchers`);
        const text = await response.text();

        let data;
        const start = text.indexOf('(') + 1;
        const end = text.lastIndexOf(')');
        if (start > 0 && end > 0) {
            data = JSON.parse(text.substring(start, end));
        } else {
            data = JSON.parse(text);
        }

        const redeemed = data.filter(v => (v.status || '').toLowerCase() === 'redeemed');

        const incomplete = redeemed.filter(v => {
            const hasService = v.serviceType && v.serviceType.toLowerCase() !== 'unknown' && v.serviceType.trim() !== '';
            const hasRedeemedAt = v.redeemed_at;
            const hasCreatedAt = v.created_at;
            return !hasService || !hasRedeemedAt || !hasCreatedAt;
        });

        console.log(`Found ${incomplete.length} incomplete redemptions.`);

        incomplete.forEach(v => {
            const issues = [];
            if (!v.serviceType || v.serviceType.toLowerCase() === 'unknown') issues.push('MISSING SERVICE');
            if (!v.redeemed_at) issues.push('MISSING REDEEMED_AT');
            if (!v.created_at) issues.push('MISSING CREATED_AT');

            console.log(`[ISSUE] ${v.voucherCode} | ${v.guestName} | Issues: ${issues.join(', ')}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

auditRedemptions();
