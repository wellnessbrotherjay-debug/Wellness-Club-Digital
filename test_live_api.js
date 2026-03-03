async function testProxy() {
    console.log('Testing /api/get-data?sheet=Vouchers...');
    try {
        const res = await fetch('https://wellness-club-digital.vercel.app/api/get-data?sheet=Vouchers');
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Data count:', data.length || 0);
        if (data.error) console.log('Error details:', data);
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testProxy();
