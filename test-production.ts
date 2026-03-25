import { z } from 'zod';

const API_BASE = 'http://localhost:3001';
const BULK_SYNC_URL = `${API_BASE}/api/vouchers/bulk-sync`;
const REDEEM_URL = `${API_BASE}/api/redeem`;

async function runTest() {
    console.log('\n--- 🚀 Starting Production-Grade Stress & Audit Test ---\n');

    // 1. E2E Flow: Offline Creation -> Sync Handshake -> Database Check
    console.log('Step 1: Simulating Offline Creation & Sync Handshake');
    const mockVoucher = {
        id: `TEST-${Math.random().toString(36).substring(7).toUpperCase()}`,
        guestName: 'Production Stress Test Guest',
        roomNumber: 'ST-505',
        checkIn: new Date().toISOString(),
        checkOut: new Date(Date.now() + 86400000).toISOString(),
        services: ['Gym', 'Spa'],
        pax: 2,
        email: 'stress-test@example.com',
        whatsapp: '+1234567890',
        imageUrl: 'https://example.com/guest.jpg',
        isTest: true,
        qr_source_location: 'test-script',
        marketing_consent: true,
        created_at: new Date().toISOString(),
        metadata: { source: 'automated-test' }
    };

    try {
        const syncResponse = await fetch(BULK_SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vouchers: [mockVoucher] })
        });

        const syncData: any = await syncResponse.json();
        if (syncResponse.ok && syncData.synced === 1) {
            console.log('✅ Sync Handshake Successful');
        } else {
            console.error('❌ Sync Handshake Failed:', syncData);
        }
    } catch (err: any) {
        console.error('❌ Sync API Unreachable:', err.message);
    }

    // 2. Concurrency Test: 50 GROs simultaneously
    console.log('\nStep 2: Concurrency Test (50 Simultaneous Sync Requests)');
    const concurrentRequests = Array.from({ length: 50 }).map((_, i) => {
        const v = { ...mockVoucher, id: `CONC-${i}-${Date.now()}` };
        return fetch(BULK_SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vouchers: [v] })
        });
    });

    const startTime = Date.now();
    const results = await Promise.all(concurrentRequests);
    const endTime = Date.now();
    const successCount = results.filter(r => r.ok).length;
    console.log(`📊 Concurrency Result: ${successCount}/50 successful requests`);
    console.log(`⏱️ Total Latency: ${endTime - startTime}ms (Avg: ${(endTime - startTime) / 50}ms per request)`);

    // 3. Payload Integrity: Malicious/Corrupt data
    console.log('\nStep 3: Payload Integrity (Zod Validation Test)');
    const maliciousPayload = {
        vouchers: [{
            id: 'S', // too short (min 4)
            guestName: 123, // should be string
            email: 'not-an-email',
            pax: -5, // should be >= 1
            isTest: "yes" // should be boolean
        }]
    };

    const badResponse = await fetch(BULK_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
    });

    if (badResponse.status === 400) {
        const badData: any = await badResponse.json();
        console.log('✅ Zod caught malicious data correctly');
        // console.log('   Error Details:', JSON.stringify(badData.details));
    } else {
        const text = await badResponse.text();
        console.error(`❌ Server failed to block malicious data (Status: ${badResponse.status})`);
        console.error('   Response:', text);
    }

    // 4. Redemption Check
    console.log('\nStep 4: Redemption Verification');
    const redeemPayload = {
        action: 'redeem', // Fixed: was missing
        voucher_code: mockVoucher.id,
        service_type: 'Gym',
        venue: 'Main Gym'
    };

    const redeemResponse = await fetch(REDEEM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(redeemPayload)
    });

    if (redeemResponse.ok) {
        console.log('✅ Redemption Successful');
    } else {
        const redeemData: any = await redeemResponse.json();
        console.error('❌ Redemption Failed:', redeemData);
    }

    console.log('\n--- 🏁 Stress Test Completed ---\n');
}

runTest().catch(console.error);
