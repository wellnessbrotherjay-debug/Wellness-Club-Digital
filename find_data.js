
async function findVoucher(code) {
    const urls = {
        'AKfycbzn': 'https://script.google.com/macros/s/AKfycbznPz0TtNSRwcuqGEzvDLqNNyJld_doqOxZvafnfz65IyW4ysXIzUC613JPDWT5nY-0/exec',
        'AKfycbzJ': 'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec',
        'AKfycbwC': 'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec'
    };

    for (const [name, url] of Object.entries(urls)) {
        console.log(`Checking ${name}...`);
        try {
            const res = await fetch(`${url}?sheet=Vouchers&callback=cb`);
            const text = await res.text();
            if (text.includes(code)) {
                console.log(`✅ FOUND in ${name}`);
            } else {
                console.log(`❌ NOT found in ${name}`);
            }
        } catch (e) {
            console.error(`Error checking ${name}: ${e.message}`);
        }
    }
}
findVoucher('NW-VLR2LA');
