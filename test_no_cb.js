
async function testNoCallback() {
    const url = 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec';
    console.log('Testing without callback...');
    try {
        const res = await fetch(`${url}?sheet=Vouchers`);
        const text = await res.text();
        console.log(`Response starts with: ${text.substring(0, 50)}`);
        try {
            JSON.parse(text);
            console.log('✅ Returns clean JSON');
        } catch (e) {
            console.log('❌ Does NOT return clean JSON');
        }
    } catch (e) {
        console.error(e);
    }
}
testNoCallback();
