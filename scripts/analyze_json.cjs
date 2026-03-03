const fs = require('fs');
const path = require('path');

const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');

const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));

console.log(`Total vouchers in JSON: ${data.length}`);

const redeemed = data.filter(v => v.status === 'Redeemed');
console.log(`Total Redeemed vouchers in JSON: ${redeemed.length}`);

const categories = {
    fashion: 0,
    hair: 0,
    wellness: 0,
    unknown: 0
};

redeemed.forEach(v => {
    const s = (v.services || '' + ' ' + v.serviceType || '').toLowerCase();
    let matched = false;
    if (s.includes('shopping') || s.includes('t store') || s.includes('fashion')) {
        categories.fashion++;
        matched = true;
    }
    if (s.includes('salon') || s.includes('hair') || s.includes('beauty')) {
        categories.hair++;
        matched = true;
    }
    if (s.includes('massage') || s.includes('spa') || s.includes('wellness') || s.includes('yoga') || s.includes('pilates')) {
        categories.wellness++;
        matched = true;
    }

    if (!matched) categories.unknown++;
});

console.log('\n--- Breakdown of REDEEMED vouchers by potential service (based on "services" + "serviceType") ---');
console.log(categories);

console.log('\n--- Unique Locations ---');
const locations = new Set();
data.forEach(v => {
    const match = (v.services || '').match(/@ No\.\d+/g);
    if (match) match.forEach(m => locations.add(m));
});
console.log(Array.from(locations));
