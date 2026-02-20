
async function test() {
    const urls = [
        'https://script.google.com/macros/s/AKfycbznPz0TtNSRwcuqGEzvDLqNNyJld_doqOxZvafnfz65IyW4ysXIzUC613JPDWT5nY-0/exec',
        'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec',
        'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec'
    ];

    for (const url of urls) {
        console.log(`\nTesting URL: ${url}`);
        try {
            const res = await fetch(`${url}?sheet=Vouchers&callback=test`);
            const text = await res.text();
            console.log(`Response starts with: ${text.substring(0, 100)}...`);
            if (text.includes('test(')) {
                console.log('✅ JSONP Supported');
            } else {
                console.log('❌ JSONP NOT Supported or Error');
            }
        } catch (e) {
            console.error(`❌ Fetch failed: ${e.message}`);
        }
    }
}
test();
