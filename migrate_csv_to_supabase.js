require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Export your Google Sheet as a CSV file.
// 2. Install csv-parser: `npm install csv-parser`
// 3. Put the CSV file in the same directory as this script.
// 4. Update the filename below.
const CSV_FILE = 'vouchers.csv'; 

async function migrateData() {
  const parse = require('csv-parser');
  const results = [];

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`Please place your exported Excel data as a CSV file named '${CSV_FILE}' in the project root.`);
    return;
  }

  console.log(`Reading ${CSV_FILE}...`);
  fs.createReadStream(CSV_FILE)
    .pipe(parse())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Parsed ${results.length} rows. Migrating to Supabase...`);

      for (const row of results) {
        // --- MAP YOUR EXCEL COLUMNS TO SUPABASE COLUMNS ---
        // Let's assume your CSV has exact matching names or similar names. Adjust these map keys.
        const mappedRow = {
          voucher_code: row['Voucher Code'] || row['voucher_code'],
          guest_name: row['Guest Name'] || row['guest_name'],
          room_number: row['Room Number'] || row['room_number'] || null,
          service_type: row['Service Type'] || row['service_type'],
          status: row['Status'] || row['status'],
          created_at: new Date(row['Timestamp'] || row['created_at'] || Date.now()).toISOString(),
          // Add other required fields manually if necessary...
        };

        const { error } = await supabase.from('vouchers').upsert(mappedRow, { onConflict: 'voucher_code' });
        
        if (error) {
          console.error(`❌ Failed to insert voucher ${mappedRow.voucher_code}:`, error.message);
        } else {
          console.log(`✅ Inserted ${mappedRow.voucher_code}`);
        }
      }

      console.log('Migration complete!');
    });
}

migrateData();
