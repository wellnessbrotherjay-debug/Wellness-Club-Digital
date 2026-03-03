async function testCreate() {
    console.log('Testing /api/redeem-voucher with action: create...');
    const payload = {
        action: 'create',
        date: 'TEST-' + Date.now(),
        description: 'DIAGNOSTIC TEST',
        category: 'Created',
        roomNumber: '999',
        type: new Date().toISOString().split('T')[0],
        checkout: new Date().toISOString().split('T')[0],
        imageurl: '',
        services: 'Test Service',
        pax: 1
    };

    try {
        const res = await fetch('https://wellness-club-digital.vercel.app/api/redeem-voucher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testCreate();
