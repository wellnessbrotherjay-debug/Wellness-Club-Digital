import { createClient } from '@supabase/supabase-js';

// Known broken project to avoid
const BROKEN_PROJECT_REF = 'bwndbccgzjdgtcyornwn';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

export const supabase = createClient(supabaseUrl, supabaseKey);
