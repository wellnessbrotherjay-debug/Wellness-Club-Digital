const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

async function applyFixes() {
    if (!APPS_SCRIPT_URL) {
        console.error('Error: APPS_SCRIPT_URL is not set.');
        return;
    }

    const dataPath = path.join(__dirname, 'reconcile_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Error: reconcile_data.json not found. Run reconciliation first.');
        return;
    }

    const fixes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`--- Applying ${fixes.length} Fixes ---`);

    for (const fix of fixes) {
        console.log(`Applying: ${fix.guest} (${fix.voucherCode}) -> ${fix.newService}`);
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeem',
                    voucherCode: fix.voucherCode,
                    serviceType: fix.newService,
                    guestName: fix.guest,
                    redeemedAt: new Date(fix.date + 'T12:00:00Z').toISOString(), // Set to noon of POS date
                    emailStatus: 'History Reconciled',
                    inputPath: '/admin/reconcile'
                })
            });
            const result = await response.json();
            console.log(`   Result: ${result.status} - ${result.message || ''}`);
        } catch (error) {
            console.error(`   Failed to apply fix for ${fix.voucherCode}:`, error.message);
        }
        // Small delay to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n--- All fixes processed ---');
}

applyFixes();
