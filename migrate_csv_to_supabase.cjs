require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const parse = require('csv-parser');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Error] Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(parse())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function migrateData() {
  console.log('--- Starting Migration ---');

  // 1. Migrate Vouchers
  const vouchersFile = 'voucher - Vouchers.csv';
  if (fs.existsSync(vouchersFile)) {
    console.log(`\\nMigrating ${vouchersFile}...`);
    const vouchersData = await parseCSV(vouchersFile);
    let successCount = 0;
    
    for (const row of vouchersData) {
      if (!row['voucherId']) continue; // skip empties
      
      const mappedRow = {
        voucher_code: row['voucherId'],
        guest_name: row['guestName'],
        email: row['email'] || null,
        whatsapp: row['phone'] || null,
        status: row['status'],
        room_number: String(row['roomNumber']),
        check_in: row['checkIn'] ? new Date(row['checkIn']).toISOString() : null,
        check_out: row['checkOut'] ? new Date(row['checkOut']).toISOString() : null,
        created_at: row['created_at'] ? new Date(row['created_at']).toISOString() : new Date().toISOString(),
        redeemed_at: row['redeemed_at'] ? new Date(row['redeemed_at']).toISOString() : null,
        redeemed_service: row['redeemedService'] || null,
        pax: row['Pax'] ? parseInt(row['Pax'], 10) : 1
      };

      const { error } = await supabase.from('vouchers').upsert(mappedRow, { onConflict: 'voucher_code' });
      if (error) {
        console.error(`Failed voucher ${mappedRow.voucher_code}:`, error.message);
      } else {
        successCount++;
      }
    }
    console.log(`✅ Migrated ${successCount}/${vouchersData.length} Vouchers.`);
  }

  // 2. Migrate Redemptions
  const redemptionsFile = 'voucher - Redemptions.csv';
  if (fs.existsSync(redemptionsFile)) {
    console.log(`\\nMigrating ${redemptionsFile}...`);
    const data = await parseCSV(redemptionsFile);
    let successCount = 0;
    
    for (const row of data) {
      if (!row['voucherCode']) continue;
      
      const mappedRow = {
        timestamp: row['timestamp'] ? new Date(row['timestamp']).toISOString() : new Date().toISOString(),
        voucher_code: row['voucherCode'],
        guest_name: row['guestName'],
        service_type: row['serviceType'],
        room_number: String(row['roomNumber']),
        weather: row['weather'] || null
      };

      const { error } = await supabase.from('redemptions').insert(mappedRow);
      if (error) {
         // Supabase might throw an error if the voucher doesn't exist depending on Foreign Key constraints
         console.error(`Failed redemption ${mappedRow.voucher_code}:`, error.message);
      } else {
         successCount++;
      }
    }
    console.log(`✅ Migrated ${successCount}/${data.length} Redemptions.`);
  }

  // 3. Migrate Insights / Non-Issuance Logs
  const insightsFile = 'voucher - NonIssuanceLogs.csv';
  if (fs.existsSync(insightsFile)) {
    console.log(`\\nMigrating ${insightsFile}...`);
    const data = await parseCSV(insightsFile);
    let successCount = 0;
    
    for (const row of data) {
      if (!row['Room Number']) continue;
      
      // Usually Dates in sheets are mm/dd/yyyy hh:mm:ss, Date() parses it mostly ok if formatted well
      const dateStr = row['Timestamp'];
      let timestamp = new Date().toISOString();
      if (dateStr) {
          timestamp = new Date(dateStr).toISOString();
      }

      const mappedRow = {
        timestamp: timestamp,
        room_number: String(row['Room Number']),
        duration: row['Duration (Nights)'],
        reason: row['Reason/Feedback']
      };

      const { error } = await supabase.from('insights').insert(mappedRow);
      if (error) {
         console.error(`Failed insight RM ${mappedRow.room_number}:`, error.message);
      } else {
         successCount++;
      }
    }
    console.log(`✅ Migrated ${successCount}/${data.length} Insights.`);
  }

  console.log('\\n--- Migration Finished! ---');
}

migrateData();
