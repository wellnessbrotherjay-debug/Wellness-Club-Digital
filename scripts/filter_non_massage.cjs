const fs = require('fs');
const path = require('path');

const TMP_RED = path.join(__dirname, '../tmp_red.json');
const data = JSON.parse(fs.readFileSync(TMP_RED, 'utf-8'));

const EXCLUDE_NAMES = ['jay', 'sam', 'test', 'weather', 'wellness brother', 'j ', 's '];

const filtered = data.filter(r => {
    const name = (r.guestName || '').toLowerCase();
    const isTest = EXCLUDE_NAMES.some(n => name.includes(n));
    if (isTest) return false;

    const svc = (r.servicetype || r.serviceType || '').toLowerCase();
    return !svc.includes('massage');
});

console.log('--- RELEVANT NON-MASSAGE REDEMPTIONS ---');
filtered.forEach(r => {
    console.log(`- ${r.timestamp} | ${r.voucherCode} | ${r.guestName} | ${r.servicetype || r.serviceType}`);
});
