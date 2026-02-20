const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';

async function checkSheet() {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Vouchers`);
        const text = await response.text();
        const start = text.indexOf('(') + 1;
        const end = text.lastIndexOf(')');
        const data = JSON.parse(text.substring(start, end));

        const codes = ['NW-7AUBPZ', 'NW-TZEFKC', 'NW-4AAX7H'];
        codes.forEach(code => {
            const matches = data.filter(v => (v.voucherCode || '').toUpperCase() === code);
            console.log(`Code: ${code} - Found ${matches.length} rows`);
            matches.forEach((m, idx) => {
                console.log(`  Row ${idx + 1}: Status: ${m.status}, RedeemedAt: ${m.redeemed_at}`);
            });
        });

    } catch (e) { console.error(e); }
}

checkSheet();
