const fs = require('fs');
const path = require('path');

const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');
const REDEMPTIONS_CSV = path.join(__dirname, '../voucher - Redemptions.csv');

const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));

const normalize = (s) => String(s || '').toLowerCase().trim();

const isTStore = (s) => {
    const lo = normalize(s);
    return lo.includes('t store') || lo.includes('shopping') || lo.includes('fashion') || lo.includes('boutique');
};

const isHair = (s) => {
    const lo = normalize(s);
    return lo.includes('hair') || lo.includes('salon') || lo.includes('beauty') || lo.includes('mani') || lo.includes('pedi');
};

// Check ALL redeemed vouchers in the master JSON
const redeemedVouchers = data.filter(v => v.status === 'Redeemed');

console.log(`Total Redeemed Vouchers (Master): ${redeemedVouchers.length}`);

let tStoreCount = 0;
let hairCount = 0;

redeemedVouchers.forEach(v => {
    const serviceStr = (v.services || '') + (v.serviceType || '');
    if (isTStore(serviceStr)) tStoreCount++;
    if (isHair(serviceStr)) hairCount++;
});

console.log(`Vouchers that mention T Store in benefit/use: ${tStoreCount}`);
console.log(`Vouchers that mention Hair in benefit/use: ${hairCount}`);

// Now check the log specifically for EXPLICIT T Store redemptions
const content = fs.readFileSync(REDEMPTIONS_CSV, 'utf-8');
const lines = content.split('\n').slice(1);
let explicitTStore = 0;
lines.forEach(line => {
    if (isTStore(line)) explicitTStore++;
});

console.log(`Explicit redemptions matching "T Store" in Redemptions Log: ${explicitTStore}`);
