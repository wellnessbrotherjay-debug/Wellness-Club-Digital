const urls = [
    'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec',
    'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec',
    'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec'
];

const sheets = ['Vouchers', 'Stays', 'Pax', 'Redemptions', 'Treatments'];

async function checkAll() {
    console.log(`Listing last 5 entries from all known scripts and sheets...\n`);
    for (const url of urls) {
        for (const sheet of sheets) {
            console.log(`\n--- URL: ${url.substring(0, 50)}... | Sheet: ${sheet} ---`);
            try {
                const res = await fetch(`${url}?sheet=${sheet}`);
                const text = await res.text();

                let data;
                try {
                    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                        data = JSON.parse(text);
                    } else if (text.includes('(') && text.includes(')')) {
                        const start = text.indexOf('(') + 1;
                        const end = text.lastIndexOf(')');
                        data = JSON.parse(text.substring(start, end));
                    } else {
                        console.log(`Failed (Non-JSON)`);
                        continue;
                    }
                } catch (pErr) {
                    console.log(`Failed (Parse Error)`);
                    continue;
                }

                if (!Array.isArray(data)) {
                    console.log(`Failed (Not Array)`);
                    continue;
                }

                console.log(`Total entries: ${data.length}`);
                if (data.length > 0) {
                    const last5 = data.slice(-5).reverse();
                    last5.forEach((e, i) => {
                        console.log(`  [${data.length - i}] ${e.voucherCode || e.code || e.date || 'N/A'} | ${e.guestName || e.description || 'N/A'} | ${e.created_at || e.timestamp || 'N/A'}`);
                    });
                } else {
                    console.log('  (Empty)');
                }
            } catch (e) {
                console.log(`Failed (Fetch Error: ${e.message})`);
            }
        }
    }
}

checkAll();
