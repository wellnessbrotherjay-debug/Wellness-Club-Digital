import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from monorepo root
config({ path: path.join(process.cwd(), '.env') });

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Utilities ---
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return null;
  
  // Handle ISO format
  if (dateStr.includes('T')) return dateStr;

  // Handle DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

async function seed() {
  console.log('🚀 Starting Database Seeding...');

  const vouchersMap = new Map<string, any>();

  // 1. Process "voucher - Vouchers (1).csv" (Basic Data)
  console.log('📄 Processing Basic Vouchers CSV...');
  const basicPath = path.join(process.cwd(), 'voucher - Vouchers (1).csv');
  if (fs.existsSync(basicPath)) {
    const content = fs.readFileSync(basicPath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    
    for (const row of records) {
      const code = row.voucherId?.trim();
      if (!code) continue;
      
      vouchersMap.set(code, {
        voucher_code: code,
        guest_name: row.guestName || '',
        email: row.email || '',
        room_number: row.roomNum || '',
        status: row.status || 'Active',
        created_at: new Date().toISOString()
      });
    }
  }

  // 2. Process "voucher - Front Data back up- GRO only .csv" (Detailed Data)
  console.log('📄 Processing Detailed GRO Backup CSV...');
  const detailedPath = path.join(process.cwd(), 'voucher - Front Data back up- GRO only .csv');
  if (fs.existsSync(detailedPath)) {
    const content = fs.readFileSync(detailedPath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    
    for (const row of records) {
      const code = row['Voucher Ref']?.trim() || row['Voucher ID']?.trim();
      if (!code) continue;

      const existing = vouchersMap.get(code) || {};
      
      vouchersMap.set(code, {
        ...existing,
        voucher_code: code,
        guest_name: row['Guest Name'] || existing.guest_name,
        room_number: row['Villas No'] || existing.room_number,
        check_in: parseDate(row['Arrival']) || existing.check_in,
        check_out: parseDate(row['Depart']) || existing.check_out,
        pax: parseInt(row['Total Adults'], 10) || existing.pax || 1,
        marketing_consent: String(row['Marketing Opt-in']).toUpperCase() === 'TRUE',
        created_at: parseDate(row['Voucher created date ']) || existing.created_at,
        sync_status: 'synced'
      });
    }
  }

  // 3. Upsert Vouchers
  const voucherArray = Array.from(vouchersMap.values());
  console.log(`⬆️ Upserting ${voucherArray.length} vouchers to Supabase...`);
  
  // Batch in 100s
  for (let i = 0; i < voucherArray.length; i += 100) {
    const batch = voucherArray.slice(i, i + 100);
    const { error } = await supabase.from('vouchers').upsert(batch, { onConflict: 'voucher_code' });
    if (error) {
      console.error(`❌ Batch ${i / 100 + 1} failed:`, error.message);
    } else {
      console.log(`✅ Batch ${i / 100 + 1} (${batch.length} records) synced.`);
    }
  }

  // 4. Process "voucher - Redemptions (1).csv"
  console.log('📄 Processing Redemptions CSV...');
  const redPath = path.join(process.cwd(), 'voucher - Redemptions (1).csv');
  if (fs.existsSync(redPath)) {
    const content = fs.readFileSync(redPath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    
    const redemptionArray = records.map((row: any) => ({
      timestamp: parseDate(row.timestamp) || new Date().toISOString(),
      voucher_code: row.voucherCode?.trim(),
      guest_name: row.guestName || '',
      service_type: row.serviceType || '',
      room_number: row.roomNumber || '',
      weather: row.weather || ''
    })).filter((r: any) => r.voucher_code);

    console.log(`⬆️ Upserting ${redemptionArray.length} redemptions to Supabase...`);
    
    // For redemptions, we don't have a unique key other than (voucher_code, redeemed_at)
    // But we'll just upsert and hope for the best, or use ID if available
    for (let i = 0; i < redemptionArray.length; i += 100) {
      const batch = redemptionArray.slice(i, i + 100);
      const { error } = await supabase.from('redemptions').upsert(batch);
      if (error) {
        console.error(`❌ Redemption batch ${i / 100 + 1} failed:`, error.message);
      } else {
        console.log(`✅ Redemption batch ${i / 100 + 1} (${batch.length} records) synced.`);
      }
    }
  }

  console.log('🎉 Seeding Complete!');
}

seed().catch(console.error);
