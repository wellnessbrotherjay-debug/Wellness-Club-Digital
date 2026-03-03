const fs = require('fs');
const path = require('path');

const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');
const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));

const redeemed = data.filter(v => v.status === 'Redeemed');

console.log('--- Redeemed Vouchers with T Store/Salon but EMPTY serviceType ---');
redeemed.filter(v => {
    const s = (v.services || '').toLowerCase();
    const type = (v.serviceType || '').toLowerCase();
    const hasTStore = s.includes('t store') || s.includes('shopping');
    const hasSalon = s.includes('salon') || s.includes('hair');
    return (hasTStore || hasSalon) && type === '';
}).forEach(v => {
    console.log(`- [${v.voucherCode}] services: ${v.services}`);
});
