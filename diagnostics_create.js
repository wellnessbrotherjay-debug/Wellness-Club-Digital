import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testId = 'DIAG-' + Math.random().toString(36).substring(7).toUpperCase();
  console.log('Testing create for:', testId);
  
  const payload = {
    voucher_code: testId,
    guest_name: 'Diagnostic User',
    status: 'Created',
    room_number: '123',
    check_in: new Date().toISOString(),
    check_out: new Date(Date.now() + 86400000).toISOString(),
    service_type: 'Test Service',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('vouchers').upsert(payload, { onConflict: 'voucher_code' });

  if (error) {
    console.error('❌ Supabase Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Success:', data);
  }
}

run();
