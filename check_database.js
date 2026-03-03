import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Fetching last 50 vouchers...');
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total found in top 50:', data.length);
    data.forEach(v => {
      console.log(`[${v.created_at}] ${v.voucher_code} - ${v.guest_name} (${v.status})`);
    });
  }
}

check();
