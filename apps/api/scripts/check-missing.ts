import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function checkVouchers() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .in('voucher_code', ['NW-4JFAEW', 'NW-TPC852']);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- FOUND VOUCHERS ---');
  console.log(JSON.stringify(data, null, 2));
}

checkVouchers();
