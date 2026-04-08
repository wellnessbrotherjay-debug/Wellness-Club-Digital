import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const codes = ['NW-S43D5U', 'NW-AYARAJ', 'NW-UTB4FR'];
    console.log('Verifying vouchers:', codes);
    
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .in('voucher_code', codes);
    
    if (error) {
        console.error('Error verifying vouchers:', error.message);
    } else {
        console.log(`Found ${data?.length} vouchers.`);
        data?.forEach(v => {
            console.log(`- ${v.voucher_code}: ${v.guest_name} (Room ${v.room_number})`);
        });
    }
}

verify().catch(console.error);
