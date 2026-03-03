const fs = require('fs');
const path = require('path');

const vouchersPath = path.join(__dirname, '../public/data/vouchers.json');
const redemptionsPath = path.join(__dirname, '../public/data/redemptions_history.json');

const vouchers = JSON.parse(fs.readFileSync(vouchersPath, 'utf8'));
const redemptions = JSON.parse(fs.readFileSync(redemptionsPath, 'utf8'));

console.log(`--- RAW DATA ---`);
console.log(`Total Vouchers: ${vouchers.length}`);
console.log(`Total Redemptions: ${redemptions.length}`);

const EXCLUDE_NAMES = [
    'jay', 'sam', 'sammy', 'idc prodons', 'wellness brother',
    'test', 'test weather', 'fix verification', 'diag test', 'agent diagnostic'
];

const isTest = (name, code) => {
    const n = String(name || '').toLowerCase();
    const c = String(code || '').toLowerCase();
    if (c.startsWith('test-')) return true;
    return EXCLUDE_NAMES.some(tn => n.includes(tn));
};

const realVouchers = vouchers.filter(v => !isTest(v.guestName, v.id));
const realRedemptions = redemptions.filter(r => !isTest(r.guestName, r.voucherCode));

console.log(`\n--- FILTERED (Non-Test) ---`);
console.log(`Real Vouchers: ${realVouchers.length}`);
console.log(`Real Redemptions: ${realRedemptions.length}`);

const redeemedVouchers = realVouchers.filter(v => v.status === 'Redeemed');
const unredeemedVouchers = realVouchers.filter(v => v.status !== 'Redeemed');

console.log(`\n--- VOUCHER STATUS ---`);
console.log(`Redeemed (Status): ${redeemedVouchers.length}`);
console.log(`Unredeemed (Status): ${unredeemedVouchers.length}`);
console.log(`Total: ${redeemedVouchers.length + unredeemedVouchers.length}`);

// Check for redemptions without vouchers
const voucherIds = new Set(realVouchers.map(v => v.id.toUpperCase()));
const orphanedRedemptions = realRedemptions.filter(r => !voucherIds.has(r.voucherCode.toUpperCase()));

console.log(`\n--- REDEMPTIONS ---`);
console.log(`Orphaned Redemptions (no voucher match): ${orphanedRedemptions.length}`);

// Categorization
const getCategory = (s) => {
    s = s.toLowerCase();
    if (s.includes('t store') || s.includes('shopping')) return 'fashion';
    if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'hair';
    return 'wellness';
};

const wellnessRed = realRedemptions.filter(r => getCategory(r.serviceType) === 'wellness');
const fashionRed = realRedemptions.filter(r => getCategory(r.serviceType) === 'fashion');
const hairRed = realRedemptions.filter(r => getCategory(r.serviceType) === 'hair');

console.log(`\n--- CATEGORY REDEMPTIONS ---`);
console.log(`Wellness: ${wellnessRed.length}`);
console.log(`Fashion: ${fashionRed.length}`);
console.log(`Hair: ${hairRed.length}`);
