const VERCEL_API = 'https://wellness-club-digital.vercel.app/api/redeem-voucher';

async function testCreate() {
    const payload = {
        action: 'create',
        voucherCode: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        guestName: 'Agent Diagnostic Test',
        status: 'Created',
        roomNumber: '999',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        created_at: new Date().toISOString()
    };

    console.log('Creating voucher:', payload.voucherCode);

    try {
        const response = await fetch(VERCEL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Result:', result);

        if (result.status === 'success') {
            console.log('SUCCESS! Waiting 2 seconds then checking if it exists in data...');
            await new Promise(r => setTimeout(r, 2000));

            const checkRes = await fetch('https://wellness-club-digital.vercel.app/api/get-data?sheet=Vouchers');
            const data = await checkRes.json();
            const found = data.find(v => (v.voucher_code || v.voucherCode || v.date || v.id || '').toUpperCase() === payload.voucherCode);

            if (found) {
                console.log('FOUND IN SYNCED DATA!');
                console.log(JSON.stringify(found, null, 2));
            } else {
                console.log('NOT FOUND in synced data. Sync is broken.');
                console.log('Last voucher in data:', data[0]?.voucherCode || data[0]?.date || 'None');
            }
        } else {
            console.error('API Error:', result);
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testCreate();
