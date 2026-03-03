import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const ids = ['NW-MFVAPF', 'NW-7MUC8P'];
  console.log('Checking IDs:', ids);
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .in('voucher_code', ids);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found:', data.length, 'vouchers');
    data.forEach(v => console.log(' - ', v.voucher_code, v.guest_name, v.status));
  }
}

check();
