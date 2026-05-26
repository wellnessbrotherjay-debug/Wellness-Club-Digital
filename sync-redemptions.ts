import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bwndbccgzjdgtcyornwn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function syncRedemptions() {
    console.log('Starting sync for redemptions...');
    const csvPath = 'voucher - Redemptions (1).csv';
    const csvData = fs.readFileSync(csvPath, 'utf8');

    const rows = csvData.trim().split('\n').filter(Boolean);
    
    // timestamp,voucherCode,guestName,serviceType,roomNumber,email,phoneNumber,weather
    const csvRedemptions = rows.slice(1).map(row => {
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
            timestamp: cols[0]?.trim(),
            voucher_code: cols[1]?.trim() || '',
            guest_name: cols[2]?.trim() || '',
            service_type: cols[3]?.trim() || '',
            room_number: cols[4]?.trim() || '',
            email: cols[5]?.trim() || '',
            whatsapp: cols[6]?.trim() || '',
            weather: cols[7]?.trim() || ''
        };
    }).filter(v => !!v.voucher_code);

    console.log(`Loaded ${csvRedemptions.length} redemptions from CSV`);

    const { data: dbRedemptions, error: errRedemptions } = await supabase.from('redemptions').select('voucher_code, timestamp');
    if (errRedemptions) {
         console.error('Failed to fetch redemptions from DB:', errRedemptions);
         return;
    }
    
    // Create a set of composite keys to avoid duplicate inserts of the same voucher if it was redeemed multiple times (highly unlikely but just in case)
    // Actually, just checking by voucher_code is safer because timestamps might differ slightly (like ms vs no ms)
    // We'll just check by voucher_code
    const dbRedemptionVoucherCodes = new Set(dbRedemptions.map(v => v.voucher_code));
    
    const missingRedemptions = csvRedemptions.filter(v => !dbRedemptionVoucherCodes.has(v.voucher_code));
    
    console.log(`Found ${missingRedemptions.length} missing redemptions in Supabase`);
    if (missingRedemptions.length > 0) {
        
        // 1. Check if these vouchers exist in the vouchers table
        const missingVoucherCodes = [...new Set(missingRedemptions.map(r => r.voucher_code))];
        const { data: existingVouchers, error: evError } = await supabase
            .from('vouchers')
            .select('voucher_code')
            .in('voucher_code', missingVoucherCodes);
            
        if (evError) console.error('Failed to check existing vouchers', evError);
        
        const existingVoucherSet = new Set(existingVouchers?.map(v => v.voucher_code) || []);
        const toInsertVouchers = missingRedemptions
            .filter(r => !existingVoucherSet.has(r.voucher_code))
            // Only take the first appearance to insert as a skeleton voucher
            .filter((v, i, a) => a.findIndex(x => x.voucher_code === v.voucher_code) === i)
            .map(r => ({
                voucher_code: r.voucher_code,
                guest_name: r.guest_name,
                email: r.email,
                whatsapp: r.whatsapp,
                status: 'Redeemed',
                room_number: r.room_number,
                created_at: r.timestamp,
                redeemed_at: r.timestamp,
                service_type: r.service_type,
                pax: 1
            }));
            
        if (toInsertVouchers.length > 0) {
            console.log(`Inserting ${toInsertVouchers.length} missing skeleton vouchers for redemptions`);
            const { error: vInsertError } = await supabase.from('vouchers').insert(toInsertVouchers);
            if (vInsertError) console.error('Error inserting skeleton vouchers:', vInsertError);
        }

        const missingChunked = [];
        for (let i = 0; i < missingRedemptions.length; i += 50) {
            missingChunked.push(missingRedemptions.slice(i, i + 50));
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

syncRedemptions().catch(console.error);
