const fs = require('fs');
const path = require('path');

const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');
const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));

const redeemed = data.filter(v => v.status === 'Redeemed');

const detailed = {
    onlyFashion: 0,
    onlyHair: 0,
    onlyWellness: 0,
    multi: 0,
    unknown: 0
};

redeemed.forEach(v => {
    const s = (v.services || '' + ' ' + v.serviceType || '').toLowerCase();
    const hasFashion = s.includes('shopping') || s.includes('t store') || s.includes('fashion');
    const hasHair = s.includes('salon') || s.includes('hair') || s.includes('beauty');
    const hasWellness = s.includes('massage') || s.includes('spa') || s.includes('wellness') || s.includes('yoga') || s.includes('pilates') || s.includes('stretching') || s.includes('zumba') || s.includes('recovery') || s.includes('infusion');

    const count = (hasFashion ? 1 : 0) + (hasHair ? 1 : 0) + (hasWellness ? 1 : 0);

    if (count > 1) detailed.multi++;
    else if (hasFashion) detailed.onlyFashion++;
    else if (hasHair) detailed.onlyHair++;
    else if (hasWellness) detailed.onlyWellness++;
    else detailed.unknown++;
});

console.log('--- Detailed REDEEMED voucher breakdown ---');
console.log(detailed);

console.log('\n--- Examples of "multi" vouchers ---');
redeemed.filter(v => {
    const s = (v.services || '' + ' ' + v.serviceType || '').toLowerCase();
    const hasFashion = s.includes('shopping') || s.includes('t store') || s.includes('fashion');
    const hasHair = s.includes('salon') || s.includes('hair') || s.includes('beauty');
    const hasWellness = s.includes('massage') || s.includes('spa') || s.includes('wellness') || s.includes('yoga') || s.includes('pilates') || s.includes('stretching') || s.includes('zumba') || s.includes('recovery') || s.includes('infusion');
    return (hasFashion ? 1 : 0) + (hasHair ? 1 : 0) + (hasWellness ? 1 : 0) > 1;
}).slice(0, 5).forEach(v => {
    console.log(`- [${v.voucherCode}] services: ${v.services}, type: ${v.serviceType}`);
});
