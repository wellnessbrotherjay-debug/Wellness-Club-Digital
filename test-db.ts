import { createClient } from '@supabase/supabase-js';

async function migrate() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Migration] Applying schema updates...');
    const query = `
        ALTER TABLE vouchers 
        ADD COLUMN IF NOT EXISTS qr_source_location TEXT,
        ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS metadata JSONB;
    `;

    // Try executing raw SQL via rpc if we have one defined, else we can't easily run arbitrary SQL via the pure JS client.
    // Given Supabase js client doesn't support raw SQL execution directly except via RPC, 
    // we'll instruct the user or assume they ran it. 
    // I will use a simple query to check if columns exist by trying to select them.

    const { error } = await supabase.from('vouchers').select('qr_source_location').limit(1);
    if (error && error.message.includes("does not exist")) {
        console.log("==> SQL Required: Please run the following in your Supabase SQL Editor:");
        console.log(query);
    } else {
        console.log('[Migration] Columns appear to exist or DB is not throwing "does not exist" error.');
    }
}

migrate();
