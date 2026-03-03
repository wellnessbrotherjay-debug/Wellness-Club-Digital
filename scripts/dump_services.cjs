const fs = require('fs');
const path = require('path');

const VOUCHERS_CSV = path.join(__dirname, '../voucher - Vouchers.csv');
const REDEMPTIONS_CSV = path.join(__dirname, '../voucher - Redemptions.csv');

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

function getUniqueServices(filePath, columnHeader) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = parseLine(lines[0]);
    const colIdx = headers.indexOf(columnHeader);
    if (colIdx === -1) return {};

    const counts = {};
    lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const values = parseLine(line);
        const svc = values[colIdx] || 'EMPTY';
        counts[svc] = (counts[svc] || 0) + 1;
    });
    return counts;
}

console.log('--- Services in Vouchers.csv (redeemedService) ---');
console.log(getUniqueServices(VOUCHERS_CSV, 'redeemedService'));

console.log('\n--- Services in Redemptions.csv (serviceType) ---');
console.log(getUniqueServices(REDEMPTIONS_CSV, 'serviceType'));
