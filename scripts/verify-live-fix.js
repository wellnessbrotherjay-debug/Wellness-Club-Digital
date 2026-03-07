import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/redeem-voucher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// New Live URL from user's screenshot
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';
const TEST_VOUCHER = 'VERIFY-' + Math.random().toString(36).substring(2, 6).toUpperCase();

async function verifyLiveFix() {
    const voucherId = 'LIVE-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    console.log(`\n--- Live Verification Start: [${voucherId}] ---`);

    // 1. Create a voucher
    console.log('1. Creating test voucher on LIVE script...');
    const createPayload = {
        voucherCode: voucherId,
        userName: 'Live Fix Verification',
        status: 'Created',
        roomNumber: 'L-22',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        services: 'Signature Massage, Wellness Access',
        created_at: new Date().toISOString(),
        pax: 1
    };

    try {
        const createRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(createPayload)
        });
        const createText = await createRes.text();
        console.log('Creation Raw Response:', createText.substring(0, 500));

        try {
            const createData = JSON.parse(createText);
            console.log('Creation Parsed:', JSON.stringify(createData));
        } catch (jsonErr) {
            console.error('Failed to parse creation response as JSON');
        }
    } catch (e) {
        console.error('Creation failed:', e);
        return;
    }

    console.log('Waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    // 2. Redeem the voucher
    console.log('2. Redeeming via API handler (Proxy to LIVE)...');
    const req = {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.1' }, // Added headers to prevent crash
        body: {
            action: 'redeem',
            voucherCode: voucherId,
            serviceType: 'Signature Massage',
            guestName: 'Live Fix Verification',
            redeemedAt: new Date().toISOString()
        }
    };

    let responseData = null;
    const res = {
        setHeader: () => { },
        status: (code) => ({
            json: (data) => {
                responseData = data;
                console.log(`Response [${code}]:`, JSON.stringify(data, null, 2));
            },
            end: () => console.log(`Response [${code}]: End`)
        })
    };

    try {
        await handler(req, res);

        if (responseData && responseData.status === 'success') {
            console.log('\n✅ LIVE VERIFICATION SUCCESSFUL: Script is returning JSON and record saved.');
        } else {
            console.error('\n❌ LIVE VERIFICATION FAILED: Still not getting JSON success.');
            console.log('Actual Response:', JSON.stringify(responseData));
        }
    } catch (err) {
        console.error('\n❌ LIVE VERIFICATION FAILED: Error occurred.', err);
    }
}

verifyLiveFix();
