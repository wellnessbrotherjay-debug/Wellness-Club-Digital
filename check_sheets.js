
async function checkSheets() {
    const urls = {
        'AKfycbzJ': 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec',
        'AKfycbwC': 'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec'
    };

    for (const [name, url] of Object.entries(urls)) {
        for (const sheet of ['Vouchers', 'Redemptions']) {
            console.log(`Checking ${name} - ${sheet}...`);
            try {
                const res = await fetch(`${url}?sheet=${sheet}&callback=cb`);
                const text = await res.text();
                if (text.startsWith('cb(')) {
                    console.log(`✅ ${name} - ${sheet}: SUCCESS`);
                } else {
                    console.log(`❌ ${name} - ${sheet}: FAIL (Response: ${text.substring(0, 50)})`);
                }
            } catch (e) {
                console.error(`Error: ${e.message}`);
            }
        }
    }
}
checkSheets();
