/**
 * run-migration.mjs
 * Runs schema migration via Supabase REST API (rpc or management api).
 * Usage: node run-migration.mjs
 */

const SUPABASE_URL = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const key = SERVICE_ROLE_KEY || ANON_KEY;

const SQL = `
ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS qr_source_location TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS metadata JSONB;
`;

async function run() {
  console.log('[Migration] Attempting to run DDL via Supabase REST...');
  console.log('[Migration] Key type:', SERVICE_ROLE_KEY ? 'service_role ✅' : 'anon (may not have DDL permissions) ⚠️');

  // Try via the SQL endpoint (requires service_role key)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log('[Migration] ✅ Success via exec_sql RPC:', data);
    return;
  }

  console.log(`[Migration] exec_sql failed (${res.status}). Trying /pg endpoint...`);

  // Try the Postgres direct endpoint (supabase v2 management api requires access token, not API key)
  const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (res2.ok) {
    const data = await res2.json();
    console.log('[Migration] ✅ Success via /pg/query:', data);
    return;
  }

  console.error(`[Migration] ❌ Both attempts failed.`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`ACTION REQUIRED: Please run this SQL in the Supabase SQL Editor:`);
  console.log(`https://supabase.com/dashboard/project/iwkhqmonkmvyeemlihlz/sql/new`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(SQL);
}

run().catch(console.error);
