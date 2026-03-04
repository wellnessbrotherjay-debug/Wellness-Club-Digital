const url = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';
const sheetsToTry = [
    'Vouchers', 'Stays', 'Pax', 'Redemptions', 'Treatments',
    'voucher', 'VoucherCodes', 'Sheet1', 'insights', 'daily_occupancy', 'pos_transactions'
];

async function explore() {
    console.log(`Exploring all sheets in GAS script...\n`);
    for (const sheetName of sheetsToTry) {
        process.stdout.write(`Checking ${sheetName}... `);
        try {
            const res = await fetch(`${url}?sheet=${sheetName}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                console.log(`OK (${data.length} entries)`);
                if (data.length > 0) {
                    const last3 = data.slice(-3).reverse();
                    last3.forEach((e, i) => {
                        console.log(`  [${data.length - i}] ${JSON.stringify(e).substring(0, 150)}`);
                    });
                }
            } else {
                console.log(`Not an array: ${JSON.stringify(data).substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

explore();
