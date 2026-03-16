import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const s = createClient(supabaseUrl, supabaseKey!);

async function run() {
    const {data:all, error} = await s.from('vouchers').select('voucher_code, room_number, created_at, guest_name');
    if (error || !all) {
        console.error("DB Error:", error);
        process.exit(1);
    }
    const unk = all.filter(v => (!v.guest_name || v.guest_name.trim() === '' || v.guest_name === 'Unknown Guest') && !v.voucher_code.toLowerCase().startsWith('test-'));
    console.log('Total unknowns:', unk.length);
    if(unk.length > 0) {
        console.log('Sample of unknowns:', unk.slice(0, 5));
    }
    process.exit(0);
}
run();
