const url = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

const payload = {
    action: 'create',
    voucherCode: 'TEST-' + Math.random().toString(36).substring(7).toUpperCase(),
    guestName: 'Diagnostic Test',
    status: 'Created',
    created_at: new Date().toISOString()
};

async function testPost() {
    console.log('Testing POST to GAS:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response body:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.log('Could not parse as JSON');
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testPost();
