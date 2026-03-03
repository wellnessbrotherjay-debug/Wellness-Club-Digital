const fs = require('fs');
const path = require('path');

const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');
const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));

const redeemed = data.filter(v => v.status === 'Redeemed');

const types = {};
redeemed.forEach(v => {
    const s = v.redeemed_service || v.serviceType || 'EMPTY';
    types[s] = (types[s] || 0) + 1;
});

console.log('--- serviceType/redeemed_service in Vouchers JSON (Total Redeemed: ' + redeemed.length + ') ---');
console.log(types);
