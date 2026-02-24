
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSetup() {
    console.log('Checking Supabase Connectivity...');

    // 1. Check Tables
    const { data: stays, error: staysError } = await supabase.from('stays').select('id').limit(1);
    if (staysError) console.log('Stays Table Error:', staysError.message);
    else console.log('Stays Table: OK');

    const { data: pos, error: posError } = await supabase.from('pos_transactions').select('id').limit(1);
    if (posError) console.log('POS Transactions Table Error:', posError.message);
    else console.log('POS Transactions Table: OK');

    // 2. Check Storage Buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.log('Storage Bucket Error:', bucketError.message);
    } else {
        const exists = buckets.find(b => b.name === 'pos-reports');
        if (exists) console.log('Storage Bucket "pos-reports": OK');
        else console.log('Storage Bucket "pos-reports": MISSING (Please create it in Supabase Dashboard)');
    }
}

checkSetup();
