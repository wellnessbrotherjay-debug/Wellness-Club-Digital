const url = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

const vouchers = [
    {
        action: 'create',
        voucherCode: 'NW-AYQ8AU',
        guestName: 'NICHOLAS BRUCE DALY & NICOLE AIMEE WADDOUPS & WILLIAM THOMAS HENRY DALY & LEWIS CHARLTON NICHOLAS DALY',
        roomNumber: 'N/A',
        pax: 4,
        checkIn: '2026-03-04',
        checkOut: '2026-03-05',
        whatsapp: '',
        email: '',
        status: 'Created',
        created_at: new Date().toISOString()
    },
    {
        action: 'create',
        voucherCode: 'NW-AYQ162', // Using room as part of code if needed, or keeping it distinct
        guestName: 'Mrs. Christine Peta Gay Lewis',
        roomNumber: '162',
        pax: 1,
        checkIn: '2026-03-01',
        checkOut: '2026-03-07',
        whatsapp: '+15195882855',
        email: 'christine.pglewis@gmail.com',
        status: 'Created',
        created_at: new Date().toISOString()
    }
];

async function recreate() {
    console.log('--- Recreating Missing Vouchers ---');
    for (const v of vouchers) {
        process.stdout.write(`Creating ${v.voucherCode} (${v.guestName})... `);
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(v)
            });
            const data = await res.json();
            if (data.status === 'success') {
                console.log('✅ Success');
            } else {
                console.log('❌ Failed:', data.message);
            }
        } catch (e) {
            console.log('❌ Error:', e.message);
        }
    }
}

recreate();
