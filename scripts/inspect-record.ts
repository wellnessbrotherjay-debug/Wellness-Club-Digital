import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFirstRecord() {
    const { data, error } = await supabase.from('vouchers').select('*').limit(1);
    if (error) {
        console.error('Error fetching vouchers:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('First record data:', data[0]);
    } else {
        console.log('No data found in vouchers table.');
    }
}

inspectFirstRecord().catch(console.error);
