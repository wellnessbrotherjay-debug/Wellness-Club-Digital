const urls = [
    'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec',
    'https://script.google.com/macros/s/AKfycbzJz0fsw03Bc0I82KPf4xEmzCXJ7PAT3yWK_B526--ffxQTf0rI-aLXDFmIECrZLPYZ/exec',
    'https://script.google.com/macros/s/AKfycbwCreEUlIhlfesvLzrX-E0NoeeIiBNTreFisv067n2hHYfze1c9exXkyOFhPSUB5a72/exec'
];

const sheets = [
    'Vouchers', 'Stays', 'Pax', 'Redemptions', 'Treatments',
    'voucher', 'VoucherCodes', 'Sheet1', 'insights', 'NonIssuanceLogs'
];

const targetDate = '2026-03-04';
const targetName = 'Christine';

async function search() {
    console.log(`Deep search for "${targetName}" and date "${targetDate}"...\n`);
    for (const url of urls) {
        for (const sheet of sheets) {
            process.stdout.write(`URL: ${url.substring(30, 50)}... | Sheet: ${sheet} | `);
            try {
                const res = await fetch(`${url}?sheet=${sheet}`);
                const text = await res.text();

                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    process.stdout.write(`Non-JSON\n`);
                    continue;
                }

                if (!Array.isArray(data)) {
                    process.stdout.write(`Not Array\n`);
                    continue;
                }

                process.stdout.write(`${data.length} rows | `);

                const matches = data.filter(row => {
                    const rowStr = JSON.stringify(row);
                    return rowStr.includes(targetDate) ||
                        rowStr.toLowerCase().includes(targetName.toLowerCase()) ||
                        rowStr.includes('04/03/26');
                });

                if (matches.length > 0) {
                    console.log(`\n✅ FOUND ${matches.length} MATCHES in ${sheet}!`);
                    console.log(JSON.stringify(matches, null, 2));
                } else {
                    process.stdout.write(`No match\n`);
                }
            } catch (e) {
                process.stdout.write(`Error: ${e.message}\n`);
            }
        }
    }
}

search();
