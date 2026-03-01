const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

async function checkSheets(code) {
    console.log(`Checking Google Sheets for voucher: ${code}\n`);

    try {
        const response = await fetch(`${SCRIPT_URL}?sheet=Vouchers`);
        const data = await response.json();

        console.log(`Total Vouchers: ${data.length}`);

        const voucher = data.find(v => {
            // The Sheets API might return date/voucherCode/code
            const vCode = v.voucherCode || v.code || v.date || v.id || '';
            return String(vCode).toUpperCase() === code.toUpperCase();
        });

        if (voucher) {
            console.log('FOUND in Sheets!');
            console.log(JSON.stringify(voucher, null, 2));
        } else {
            console.log('Not found in Sheets.');
            console.log('\nLast 3 vouchers in Sheets:');
            console.table(data.slice(-3).map(v => ({
                code: v.voucherCode || v.code || v.date || v.id || 'N/A',
                guest: v.guestName || v.name || v.description || 'N/A',
                created: v.created_at || v.timestamp || 'N/A'
            })));
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

const code = process.argv[2] || 'NW-R9ETGR';
checkSheets(code);
