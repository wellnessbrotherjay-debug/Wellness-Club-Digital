import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

if (!supabaseUrl) throw new Error('[DB] SUPABASE_URL or VITE_SUPABASE_URL is required');
if (!supabaseServiceKey) throw new Error('[DB] SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY is required');

console.log(`[DB] Initializing Supabase client for ${supabaseUrl}`);
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[DB] Using SERVICE_ROLE_KEY (RLS Bypass enabled)');
} else {
    console.log('[DB] WARNING: Using ANON_KEY (RLS will be enforced). Add SUPABASE_SERVICE_ROLE_KEY to Vercel env for full access.');
}


/**
 * Service role client — bypasses RLS. Use only on the server for trusted operations.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Anon client — respects RLS. Use for read-only public queries.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
