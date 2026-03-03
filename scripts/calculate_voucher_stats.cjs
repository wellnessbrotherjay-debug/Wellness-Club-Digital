const fs = require('fs');
const path = require('path');

const VOUCHERS_CSV = path.join(__dirname, '../voucher - Vouchers.csv');
const REDEMPTIONS_CSV = path.join(__dirname, '../voucher - Redemptions.csv');
const VOUCHERS_JSON = path.join(__dirname, '../vouchers_raw.json');

function parseCSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = parseLine(lines[0]);

    return lines.slice(1).filter(line => line.trim()).map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

const normalize = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// Vouchers to EXCLUDE from Issued total (test names)
const EXCLUDE_NAMES = [
    'jay', 'sam', 'sammy', 'idc prodons', 'wellness brother',
    'test', 'test weather', 'fix verification', 'diag test', 'agent diagnostic'
];

const isTestAccount = (name) => {
    const n = normalize(name);
    return EXCLUDE_NAMES.some(testName => n.includes(testName));
};

// Precise category matching based on specific button press strings
const getCategoryStrict = (serviceStr) => {
    const s = normalize(serviceStr);

    // T Store (priority keywords)
    if (s.includes('t store') || s.includes('shopping')) return 'T Store';

    // Hair Salon
    if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'Hair Salon';

    // Special case: All Services (could be any of the three)
    if (s.includes('all services')) return 'All Services (Inclusive)';

    // Wellness / Spa
    if (s.includes('massage') || s.includes('wellness') || s.includes('yoga') || s.includes('pilates') || s.includes('stretching') || s.includes('zumba') || s.includes('recovery') || s.includes('infusion')) {
        return 'Spa';
    }

    return 'Other';
};

// 1. Collect all unique voucher codes
const allVouchers = new Map();

// Load from JSON (primary source)
if (fs.existsSync(VOUCHERS_JSON)) {
    const data = JSON.parse(fs.readFileSync(VOUCHERS_JSON, 'utf-8'));
    data.forEach(v => {
        const code = (v.voucherCode || v.id || '').toUpperCase();
        if (code) {
            const guestName = v.guestName || '';
            if (!isTestAccount(guestName)) {
                allVouchers.set(code, { ...v, code });
            }
        }
    });
}

// Supplement from CSV
parseCSV(VOUCHERS_CSV).forEach(v => {
    const code = (v.voucherId || v.id || '').toUpperCase();
    if (code && !allVouchers.has(code)) {
        const guestName = v.guestName || '';
        if (!isTestAccount(guestName)) {
            allVouchers.set(code, { ...v, code });
        }
    }
});

// 2. Identify REDEMPTIONS
const redemptionEvents = [];

// From Redemptions.csv
parseCSV(REDEMPTIONS_CSV).forEach(r => {
    const code = (r.voucherCode || '').toUpperCase();
    // Use the voucher data (if exists) to check if it's a test account
    const v = allVouchers.get(code);
    const guestName = r.guestName || v?.guestName || '';

    if (isTestAccount(guestName)) return;

    const cat = getCategoryStrict(r.serviceType);
    if (cat) {
        redemptionEvents.push({
            code,
            service: r.serviceType,
            timestamp: r.timestamp,
            cat
        });
    }
});

// 3. Deduplicate events (same voucher, same category, same 5-minute window)
const seenEvents = new Set();
const finalEvents = redemptionEvents.filter(e => {
    const time = new Date(e.timestamp).getTime();
    if (isNaN(time)) return false;
    const timeBucket = Math.floor(time / (60000 * 5));
    const key = `${e.code}|${e.cat}|${timeBucket}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
});

// counts
const stats = {
    totalIssued: allVouchers.size,
    totalRedeemedVouchers: new Set(finalEvents.map(e => e.code)).size,
    totalRedemptionEvents: finalEvents.length,
    breakdown: {
        'T Store': 0,
        'Hair Salon': 0,
        'Spa': 0,
        'All Services (Inclusive)': 0,
        'Other': 0
    }
};

finalEvents.forEach(e => {
    stats.breakdown[e.cat]++;
});

console.log('--- FINAL AUDITED VOUCHER STATISTICS ---');
console.log(`Total Vouchers Issued (Excluding Test Accounts): ${stats.totalIssued}`);
console.log(`Total Unique Vouchers Used: ${stats.totalRedeemedVouchers}`);
console.log(`\n--- REDEMPTION BREAKDOWN (Actual Button Presses) ---`);
Object.entries(stats.breakdown).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`${cat.padEnd(25)}: ${count}`);
});
console.log('---');

// List the non-Spa redemptions for validation
console.log('\nT Store Redemptions:');
finalEvents.filter(e => e.cat === 'T Store').forEach(e => console.log(`- ${e.timestamp} | ${e.code} | ${e.service}`));

console.log('\nHair Salon Redemptions:');
finalEvents.filter(e => e.cat === 'Hair Salon').forEach(e => console.log(`- ${e.timestamp} | ${e.code} | ${e.service}`));
