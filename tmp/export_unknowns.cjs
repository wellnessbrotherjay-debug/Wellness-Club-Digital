require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportUnknowns() {
    console.log('🚀 Exporting Unknown/Empty Vouchers...');
    
    // Fetch all for local filtering (matching your production logic)
    const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('guest_name, voucher_code, created_at, room_number, is_test');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    const unknowns = vouchers.filter(v => 
        !v.guest_name || 
        v.guest_name === 'Unknown Guest' || 
        v.guest_name.trim() === ''
    );

    console.log(`📊 Found ${unknowns.length} unknown entries.`);
    
    fs.writeFileSync('unknown_vouchers.json', JSON.stringify(unknowns, null, 2));
    console.log('✅ Exported to unknown_vouchers.json');
}

exportUnknowns();
