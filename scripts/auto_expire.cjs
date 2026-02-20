const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';

async function autoExpire() {
    console.log('--- Running Auto-Expiration Process ---');
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const toExpire = data.filter(v => {
            const status = (v.status || v.Status || '').toLowerCase();
            if (status === 'redeemed' || status === 'expired') return false;

            const checkOutRaw = v.checkOut || v.checkout || v.expires_at;
            if (!checkOutRaw) return false;

            const expiry = new Date(checkOutRaw);
            expiry.setHours(0, 0, 0, 0);

            return expiry < today;
        });

        console.log(`Found ${toExpire.length} vouchers to expire.`);

        for (const v of toExpire) {
            console.log(`Expiring: ${v.voucherCode} (Valid until ${v.checkOut})`);

            // We use the 'manual' action or similar to update status if possible, 
            // but doPost 'redeem' doesn't support setting status to 'Expired'.
            // I'll use a generic 'update' action if I add it to Code.gs, 
            // or I can just use 'action: manual' with status: 'Expired'.

            try {
                const res = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'manual',
                        voucherCode: v.voucherCode,
                        status: 'Expired',
                        emailStatus: 'Auto Expired'
                    })
                });
                const result = await res.json();
                console.log(`   Result: ${result.status}`);
            } catch (err) {
                console.error(`   Failed to expire ${v.voucherCode}:`, err.message);
            }

            await new Promise(r => setTimeout(r, 200));
        }

        console.log('--- Process Complete ---');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

autoExpire();
