const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

const EXCLUDE_NAMES = [
    'test', 'samual', 'jay', 'diag', 'agent', 'fix'
];

function isTestAccount(name, code) {
    const n = String(name || '').toLowerCase();
    const c = String(code || '').toLowerCase();
    if (c.startsWith('test-')) return true;
    return EXCLUDE_NAMES.some(tn => n.includes(tn));
}

async function auditExclusions() {
    console.log('Auditing exclusions based on "Golden Rule"...');
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Vouchers`);
        const vouchers = await response.json();

        const excluded = [];
        const valid = [];

        vouchers.forEach(v => {
            const isTest = (v.is_test === 'TRUE') || isTestAccount(v.guestName, v.voucherCode);
            if (isTest) {
                excluded.push(v);
            } else {
                valid.push(v);
            }
        });

        console.log('\n--- EXCLUDED VOUCHERS ---');
        excluded.forEach(v => console.log(`- ${v.voucherCode}: "${v.guestName}"`));

        console.log('\n--- SUMMARY ---');
        console.log('Total in Sheet:', vouchers.length);
        console.log('Excluded (Test):', excluded.length);
        console.log('Valid (Real):', valid.length);

    } catch (e) {
        console.error('Audit failed:', e.message);
    }
}

auditExclusions();
