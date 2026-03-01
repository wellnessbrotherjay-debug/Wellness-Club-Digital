import { createClient } from '@supabase/supabase-js';

// Known broken project to avoid
const BROKEN_PROJECT_REF = 'bwndbccgzjdgtcyornwn';

const getClientUrl = () => {
  const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (envUrl && envUrl.includes(BROKEN_PROJECT_REF)) {
    console.warn('[Supabase] Ignoring broken project in env:', envUrl);
    return null;
  }
  return envUrl;
};

const getClientKey = () => {
  const envKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return envKey;
};

const supabaseUrl = getClientUrl() || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = getClientKey() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

export const supabase = createClient(supabaseUrl, supabaseKey);
