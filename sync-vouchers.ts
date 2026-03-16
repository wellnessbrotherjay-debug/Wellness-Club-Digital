import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function sync() {
    console.log('Starting sync...');
    const csvPath = 'voucher - Vouchers (1).csv';
    const csvData = fs.readFileSync(csvPath, 'utf8');

    const rows = csvData.trim().split('\n').filter(Boolean);
    
    const csvVouchers = rows.slice(1).map(row => {
        const cols = [];
        let inQuotes = false;
        let buf = '';
        for(let i = 0; i < row.length; i++) {
            if(row[i] === '"') inQuotes = !inQuotes;
            else if(row[i] === ',' && !inQuotes) { cols.push(buf); buf = ''; }
            else buf += row[i];
        }
        cols.push(buf);

        return {
            voucher_code: cols[0]?.trim(),
            guest_name: cols[1]?.trim() || '',
            email: cols[2]?.trim() || '',
            whatsapp: cols[3]?.trim() || '',
            status: cols[4]?.trim() || '',
            room_number: cols[5]?.trim() || '',
            check_in: cols[6]?.trim() || null,
            check_out: cols[7]?.trim() || null,
            created_at: cols[8]?.trim() || new Date().toISOString(),
            redeemed_at: cols[9]?.trim() || null,
            service_type: cols[10]?.trim() || '', // redeemedService
            pax: parseInt(cols[12]?.trim() || '1') || 1
        };
    }).filter(v => !!v.voucher_code);

    console.log(`Loaded ${csvVouchers.length} vouchers from CSV`);

    const { data: dbVouchers, error } = await supabase.from('vouchers').select('voucher_code');
    if (error) {
        console.error('Failed to fetch vouchers from DB:', error);
        return;
    }

    const dbVoucherIds = new Set(dbVouchers.map(v => v.voucher_code));
    console.log(`Found ${dbVoucherIds.size} vouchers in Supabase 'vouchers' table`);

    const missing = csvVouchers.filter(v => !dbVoucherIds.has(v.voucher_code));
    console.log(`Found ${missing.length} missing vouchers in Supabase`);

    if (missing.length > 0) {
        console.log('Inserting missing vouchers into Supabase...');
        const missingChunked = [];
        for (let i = 0; i < missing.length; i += 50) {
            missingChunked.push(missing.slice(i, i + 50));
        }

        let totalInserted = 0;
        for (const chunk of missingChunked) {
             const { error: insertError } = await supabase.from('vouchers').insert(chunk);
             if (insertError) {
                 console.error('Insert error for chunk:', insertError);
             } else {
                 totalInserted += chunk.length;
             }
        }
        console.log(`Successfully inserted ${totalInserted} vouchers!`);
    }

    // Now for redemptions
    const { data: dbRedemptions, error: errRedemptions } = await supabase.from('redemptions').select('voucher_code');
    if (errRedemptions) {
         console.error('Failed to fetch redemptions from DB:', errRedemptions);
         return;
    }
    const dbRedemptionIds = new Set(dbRedemptions.map(v => v.voucher_code));
    
    const csvRedeemed = csvVouchers.filter(v => v.status === 'Redeemed' || v.status === 'redeemed');
    const missingRedemptions = csvRedeemed.filter(v => !dbRedemptionIds.has(v.voucher_code));
    
    console.log(`Found ${missingRedemptions.length} missing redemptions in Supabase`);
    if (missingRedemptions.length > 0) {
        // Redemptions table schema: ['id', 'timestamp', 'voucher_code', 'guest_name', 'service_type', 'room_number', 'email', 'whatsapp', 'weather']
        const csvRows = rows.slice(1);
        const redemptionInserts = missingRedemptions.map(v => {
            const originalRow = csvRows.find(r => r.startsWith(v.voucher_code)) || '';
            const weatherVal = originalRow.split(',')[11] || '';
            return {
                voucher_code: v.voucher_code,
                guest_name: v.guest_name,
                service_type: v.service_type,
                room_number: v.room_number,
                timestamp: v.redeemed_at || new Date().toISOString(),
                email: v.email,
                whatsapp: v.whatsapp,
                weather: weatherVal
            };
        });

        const missingChunked = [];
        for (let i = 0; i < redemptionInserts.length; i += 50) {
            missingChunked.push(redemptionInserts.slice(i, i + 50));
        }

        let totalReds = 0;
        for (const chunk of missingChunked) {
             const { error: insertError } = await supabase.from('redemptions').insert(chunk);
             if (insertError) {
                 console.error('Insert error for redemption chunk:', insertError);
             } else {
                 totalReds += chunk.length;
             }
        }
        console.log(`Successfully inserted ${totalReds} redemptions!`);
    }

    console.log('Sync complete.');
}

sync().catch(console.error);
