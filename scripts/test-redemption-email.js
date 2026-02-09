import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/redeem-voucher.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec';
const RESEND_KEY = process.env.RESEND_API_KEY;

console.log('Testing Flow with Key:', RESEND_KEY ? 'Present' : 'Missing');

if (!RESEND_KEY) {
    console.error('ERROR: RESEND_API_KEY is missing in .env.local');
    process.exit(1);
}

// Helper to generate a random ID
const generateId = () => 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase();

async function runTest() {
    const voucherId = generateId();
    console.log(`\n--- Step 1: Creating Test Voucher [${voucherId}] ---`);

    // 1. Create Voucher via Google Script
    const createPayload = {
        voucherCode: voucherId,
        userName: 'Test User Agent',
        status: 'Created',
        roomNumber: '999',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        imageUrl: '',
        services: 'Test Service, Wellness Access',
        created_at: new Date().toISOString(),
        pax: 1
    };

    try {
        const createRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(createPayload) // The script expects raw body for creation? Or JSON?
            // In VoucherPage.tsx: body: params (which is stringified JSON)
            // But wait, the script handles JSON.parse(e.postData.contents).
            // Let's check VoucherPage.tsx again. It sends: body: payload (stringified)
        });

        // Google Script usually returns a redirect or text.
        // We don't strictly need to parse the response as long as it succeeds.
        const createText = await createRes.text();
        console.log('Creation Response:', createText.substring(0, 100) + '...');

        // Wait a moment for consistency
        await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
        console.error('Creation Failed:', e);
        return;
    }

    console.log(`\n--- Step 2: Redeeming Voucher [${voucherId}] ---`);

    // 2. Redeem via our Local Handler (which sends the email)
    const req = {
        method: 'POST',
        body: {
            action: 'redeem',
            voucherCode: voucherId,
            serviceType: 'Test Email Trigger',
            guestName: 'Test User Agent', // This forces the email name
            redeemedAt: new Date().toISOString()
        }
    };

    const res = {
        setHeader: () => { },
        status: (code) => ({
            json: (data) => console.log(`Redemption Response [${code}]:`, JSON.stringify(data, null, 2)),
            end: () => console.log(`Redemption Response [${code}]: End`)
        })
    };

    try {
        await handler(req, res);
        console.log('\n--- Test Completed ---');
        console.log('Check your email (wellnessbrotherjay@gmail.com) for the notification.');
    } catch (err) {
        console.error('Handler Error:', err);
    }
}

runTest();
