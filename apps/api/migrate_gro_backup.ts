import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';
import { supabaseAdmin } from './src/db.js';

const safeParseDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
        // format usually dd/mm/yyyy
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(Date.UTC(year, month, day));
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    return null;
};

async function readCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const results: any[] = [];
        fs.createReadStream(filePath)
            .pipe(parse({ columns: true, skip_empty_lines: true }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

async function main() {
    console.log('Migrating Backup Vouchers...');
    const data = await readCSV(path.join(process.cwd(), '../../voucher - Front Data back up- GRO only .csv'));
    console.log(`Read ${data.length} rows from CSV`);
    
    // Extract valid vouchers from both the ID column and the Link column
    const processedRows = data.map((r, i) => {
        let vId = r.voucherId?.trim();
        const link = r['Link Voucher No. 1 Wellness'];
        
        // Try getting it from the link
        if (!vId && link) {
            const match = link.match(/\/v\/(NW-[A-Z0-9]+)/i);
            if (match) {
                vId = match[1];
            }
        }
        
        // If still no ID, generate a deterministic one based on exactly this row's data
        // to prevent duplicate inserts if the script runs multiple times.
        if (!vId || !vId.startsWith('NW-')) {
            const hashInput = `${r['Guest Name']}-${r['Room Number']}-${r['Arrival']}-${r['Depart']}-${i}`;
            const hash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 6).toUpperCase();
            vId = `NW-${hash}`;
        }
        
        return { ...r, extractedVoucherId: vId };
    }).filter(r => r.extractedVoucherId);
    
    console.log(`Processing all ${processedRows.length} rows (including generated IDs for missing links)`);

    const { data: existingVouchers } = await supabaseAdmin.from('vouchers').select('voucher_code');
    const existingSet = new Set(existingVouchers?.map(v => v.voucher_code) || []);

    const missingRows = processedRows.filter(r => !existingSet.has(r.extractedVoucherId));
    console.log(`Found ${missingRows.length} vouchers completely MISSING from Supabase.`);

    if (missingRows.length === 0) {
        console.log('No missing vouchers to migrate.');
        return;
    }

    // Deduplicate missing rows by voucher code
    const uniqueMissingMap = new Map();
    for (const r of missingRows) {
        if (!uniqueMissingMap.has(r.extractedVoucherId)) {
            uniqueMissingMap.set(r.extractedVoucherId, r);
        }
    }
    const uniqueMissing = Array.from(uniqueMissingMap.values());
    console.log(`Deduplicated to ${uniqueMissing.length} unique missing vouchers to insert.`);

    const formattedToInsert = uniqueMissing.map(item => {
        const paxNumber = (parseInt(item.Adult) || 0) + (parseInt(item.Child) || 0) + (parseInt(item.Compliment) || 0);
        const actualPax = paxNumber > 0 ? paxNumber : 1;
        
        // Use 'Issued Date' or 'Voucher created date ' depending on header parsing
        const createdDateStr = item['Issued Date'] || item['Voucher created date '];

        return {
            voucher_code: item.extractedVoucherId,
            guest_name: item['Guest Name'] || '',
            room_number: item['Room Number'] || '',
            check_in: safeParseDate(item['Arrival']),
            check_out: safeParseDate(item['Depart']),
            created_at: safeParseDate(createdDateStr) || new Date().toISOString(), // Fallback to now if not provided
            status: 'Created',
            pax: actualPax
        };
    });

    console.log('Inserting into Supabase...');
    for (let i = 0; i < formattedToInsert.length; i += 100) {
        const chunk = formattedToInsert.slice(i, i + 100);
        const { error } = await supabaseAdmin
            .from('vouchers')
            .insert(chunk);

        if (error) {
            console.error('Error inserting vouchers chunk:', error.message);
        } else {
            console.log(`Inserted ${i} to ${i + chunk.length}`);
        }
    }
    console.log('Done!');
}

main().catch(console.error);
