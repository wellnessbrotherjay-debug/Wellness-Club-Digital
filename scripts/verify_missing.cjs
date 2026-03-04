const url = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';
const codes = ['NW-AYQ8AU', 'NW-WZUYTU', 'TEST-WJ4U6G'];
const sheets = ['Vouchers', 'voucher'];

async function verify() {
    for (const sheet of sheets) {
        console.log(`\n--- Sheet: ${sheet} ---`);
        try {
            const res = await fetch(`${url}?sheet=${sheet}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                console.log(`Total: ${data.length}`);
                const found = data.filter(row => {
                    const rowStr = JSON.stringify(row).toUpperCase();
                    return codes.some(c => rowStr.includes(c.toUpperCase()));
                });
                if (found.length > 0) {
                    console.log(`✅ FOUND ${found.length} matches:`);
                    console.log(JSON.stringify(found, null, 2));
                } else {
                    console.log(`❌ None of the codes found.`);
                    if (data.length > 0) {
                        console.log(`Last 2:`, JSON.stringify(data.slice(-2), null, 2));
                    }
                }
            } else {
                console.log(`Invalid data:`, data);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

verify();
