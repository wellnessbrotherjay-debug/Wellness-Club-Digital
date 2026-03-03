import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Fetching last 10 redemptions...');
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) console.error(error);
  else data.forEach(r => console.log(`[${r.timestamp}] ${r.voucher_code} - ${r.service_type}`));
}
check();
