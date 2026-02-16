const fs = require('fs');
const path = require('path');

// Configuration - User should provide the new URL
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

async function fetchSheetData(type) {
    if (!APPS_SCRIPT_URL) {
        console.error('Error: APPS_SCRIPT_URL is not set.');
        return [];
    }

    const separator = APPS_SCRIPT_URL.includes('?') ? '&' : '?';
    const url = `${APPS_SCRIPT_URL}${separator}sheet=${type}`;

    try {
        const response = await fetch(url);
        const text = await response.text();

        // Check if it's JSON or JSONP
        let data;
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            data = JSON.parse(text);
        } else {
            // Handle JSONP fallback
            const start = text.indexOf('(') + 1;
            const end = text.lastIndexOf(')');
            const jsonStr = text.substring(start, end);
            data = JSON.parse(jsonStr);
        }
        return data;
    } catch (error) {
        console.error(`Failed to fetch ${type}:`, error.message);
        return [];
    }
}

function parsePOSDate(dateStr) {
    // Format: DD/MM/YY
    const [day, month, year] = dateStr.split('/');
    return `20${year}-${month}-${day}`;
}

function normalizeName(name) {
    if (!name) return '';
    // Remove titles, non-alpha, and extra spaces
    return name.toLowerCase()
        .replace(/mrs\.|mr\.|ms\./g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}

function nameSimilarity(name1, name2) {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    if (!n1 || !n2) return 0;

    // Exact or containment
    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;

    // Levenshtein-based score
    const maxLen = Math.max(n1.length, n2.length);
    const dist = levenshtein(n1, n2);
    const score = 1 - (dist / maxLen);
    if (score > 0.7) return score;

    // Word-based score
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    const intersection = words1.filter(w => words2.includes(w));
    const wordScore = intersection.length / Math.max(words1.length, words2.length);

    return Math.max(score, wordScore);
}

const SERVICE_MAP = [
    { keywords: ['mass', 'wellness'], result: 'Signature Massage' },
    { keywords: ['stret', 'strec'], result: 'Stretching Session' },
    { keywords: ['refo'], result: 'Reformer Pilates' },
    { keywords: ['yoga'], result: 'Yoga Session' },
    { keywords: ['zum'], result: 'Zumba' },
    { keywords: ['pilat'], result: 'Pilates' },
    { keywords: ['infus'], result: 'Infusion Service' },
];

function mapService(description) {
    if (!description) return 'Wellness Service';
    const desc = description.toLowerCase();
    for (const mapping of SERVICE_MAP) {
        if (mapping.keywords.some(k => desc.includes(k))) {
            return mapping.result;
        }
    }
    return 'Wellness Service';
}

async function reconcile() {
    console.log('--- Starting Reconciliation ---');

    // 1. Load POS Data
    const csvPath = path.join(__dirname, 'pos_history.csv');
    const posContent = fs.readFileSync(csvPath, 'utf8');
    const posLines = posContent.split('\n').filter(l => l.trim() && !l.startsWith('"Date"'));

    const posEntries = posLines.map(line => {
        // Basic CSV split - this might need refinement if fields have commas
        const cols = line.split('","').map(c => c.replace(/"/g, ''));
        return {
            date: parsePOSDate(cols[0]),
            guest: cols[8]?.replace(/,/g, '').trim(),
            description: cols[15],
            serviceGoal: mapService(cols[15])
        };
    });

    console.log(`Loaded ${posEntries.length} POS entries.`);

    // 2. Fetch Vouchers
    const vouchers = await fetchSheetData('Vouchers');
    const redemptions = await fetchSheetData('Redemptions');

    const redeemedVouchers = vouchers.filter(v => v.status === 'Redeemed' || v.status === 'redeemed');
    console.log(`Found ${redeemedVouchers.length} redeemed vouchers in Google Sheets.`);

    // 3. Match
    const fixes = [];
    const processedRedemptions = new Set();
    const vouchersWithFixes = new Set();

    posEntries.forEach(pos => {
        // Skip non-completed bookings
        if (pos.status === 'Cancel' || pos.status === 'Open') return;

        // Find matching redemption
        const bestMatch = redeemedVouchers
            .filter(v => !processedRedemptions.has(v.voucherCode)) // CRITICAL: Skip already matched
            .map(v => {
                const vDate = v.redeemed_at ? v.redeemed_at.split('T')[0] : (v.created_at ? v.created_at.split('T')[0] : '');
                const score = nameSimilarity(v.guestName, pos.guest);

                const today = '2026-02-13';
                const isToday = (vDate === today);

                // Date flexibility: check same day, prev day, or next day
                const posDate = new Date(pos.date);
                const sheetDate = new Date(vDate);
                const diffDays = Math.abs(posDate - sheetDate) / (1000 * 60 * 60 * 24);

                // Match if date is close OR if name match is high enough to restore dates
                // Allowing higher leeway for "Today" (Feb 13) redemptions
                const dateMatch = (diffDays <= 1.1) || (isToday && score > 0.45);

                // Final match criteria
                let isMatch = false;
                let reason = '';
                if (diffDays <= 1.1 && score > 0.4) { isMatch = true; reason = 'Date Match'; }
                if (isToday && score > 0.45) { isMatch = true; reason = 'Today Restoration'; }
                if (score > 0.85) { isMatch = true; reason = 'High Confidence Name'; }

                return { v, score, isMatch, vDate, reason };
            })
            .filter(m => m.isMatch)
            .sort((a, b) => b.score - a.score)[0];

        if (bestMatch) {
            const v = bestMatch.v;
            processedRedemptions.add(v.voucherCode);
            const currentService = v.serviceType || v.redeemed_service || 'Unknown';
            const vDate = bestMatch.vDate; // Use the vDate from bestMatch

            // Check for service mismatch OR date mismatch (more than 1 day difference)
            if (currentService !== pos.serviceGoal || (vDate !== pos.date && Math.abs(new Date(vDate) - new Date(pos.date)) > 86400000)) {
                if (!vouchersWithFixes.has(v.voucherCode)) { // Ensure only one fix per voucher
                    fixes.push({
                        voucherCode: v.voucherCode,
                        guest: v.guestName,
                        posGuest: pos.guest,
                        date: pos.date, // Use POS date for correction
                        oldService: currentService,
                        oldDate: vDate, // New field
                        newService: pos.serviceGoal,
                        description: pos.description
                    });
                    vouchersWithFixes.add(v.voucherCode);
                }
            }
        }
    });

    console.log(`\n--- Reconciled Results ---`);
    console.log(`Matched and Fixed: ${fixes.length}`);
    console.log(`Total Redemptions in Sheet: ${redeemedVouchers.length}`);
    console.log(`Redemptions without POS Match: ${redeemedVouchers.length - processedRedemptions.size}`);

    fixes.forEach(f => {
        console.log(`[FIX] Code: ${f.voucherCode} | Guest: ${f.guest} (POS: ${f.posGuest})`);
        console.log(`      Change: "${f.oldService}" -> "${f.newService}"`);
        console.log(`      Reason: "${f.description}"`);
        console.log(`---`);
    });

    console.log(`\n--- Redemptions without POS Match ---`);
    redeemedVouchers.forEach(v => {
        if (!processedRedemptions.has(v.voucherCode)) {
            const vDate = v.redeemed_at ? v.redeemed_at.split('T')[0] : (v.created_at ? v.created_at.split('T')[0] : '');
            console.log(`[UNMATCHED] Code: ${v.voucherCode} | Guest: ${v.guestName} | Date: ${vDate} | Service: ${v.serviceType || v.redeemed_service || 'Unknown'}`);
        }
    });

    // Output JSON for the apply script
    fs.writeFileSync(path.join(__dirname, 'reconcile_data.json'), JSON.stringify(fixes, null, 2));
}

reconcile();
