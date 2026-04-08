import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const vouchersToInsert = [
    {
        voucher_code: 'NW-S43D5U',
        guest_name: 'HUSIN MAKMUR',
        whatsapp: '+6287887183355',
        room_number: '160',
        check_in: '2026-04-03T00:00:00Z',
        check_out: '2026-04-06T00:00:00Z',
        status: 'Created',
        service_type: '15% off T Store Shopping, 15% off TS Salon Services, 15% off All Services @ No.1 Wellness',
        pax: 1,
        created_at: new Date().toISOString(),
        sync_status: 'synced',
        is_test: false
    },
    {
        voucher_code: 'NW-AYARAJ',
        guest_name: 'Rizky Arief Dwi Prakoso',
        whatsapp: '+628156201601',
        room_number: '234',
        check_in: '2026-04-03T00:00:00Z',
        check_out: '2026-04-05T00:00:00Z',
        status: 'Created',
        service_type: '15% off T Store Shopping, 15% off TS Salon Services, 15% off All Services @ No.1 Wellness',
        pax: 1,
        created_at: new Date().toISOString(),
        sync_status: 'synced',
        is_test: false
    },
    {
        voucher_code: 'NW-UTB4FR',
        guest_name: 'Mrs. Serap Carpino & Mr. Mario Carpino',
        whatsapp: '+19053300355',
        room_number: '137',
        check_in: '2026-04-03T00:00:00Z',
        check_out: '2026-04-05T00:00:00Z',
        status: 'Created',
        service_type: '15% off T Store Shopping, 15% off TS Salon Services, 15% off All Services @ No.1 Wellness',
        pax: 2,
        created_at: new Date().toISOString(),
        sync_status: 'synced',
        is_test: false
    }
];

async function insertVouchers() {
    console.log('Inserting failed vouchers (using service_type column)...');
    
    for (const voucher of vouchersToInsert) {
        console.log(`Inserting ${voucher.voucher_code} for ${voucher.guest_name}...`);
        
        // We use upsert on voucher_code. 
        // Note: Supabase upsert needs the column to have a unique constraint or primary key.
        // In our DB, voucher_code might not be the PK (id is), so we might need to check if it exists first or use a specific syntax.
        // Since voucher_code is likely unique, let's try upsert with onConflict.
        
        const { data, error } = await supabase
            .from('vouchers')
            .upsert(voucher, { onConflict: 'voucher_code' });
        
        if (error) {
            console.error(`Error inserting ${voucher.voucher_code}:`, error.message);
        } else {
            console.log(`Successfully inserted/updated ${voucher.voucher_code}`);
        }
    }
    
    console.log('Done.');
}

insertVouchers().catch(console.error);
