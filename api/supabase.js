import { createClient } from '@supabase/supabase-js';

// Server-side API needs non-VITE prefixed env vars
// VITE_ prefixed vars are only available on the client side
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing URL or Key. Check Vercel environment variables:', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasViteUrl: !!process.env.VITE_SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_ANON_KEY,
    hasViteKey: !!process.env.VITE_SUPABASE_ANON_KEY
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://iwkhqmonkmvyeemlihlz.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I'
);
