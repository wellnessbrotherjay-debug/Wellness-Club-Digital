const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('vouchers').select('marketing_consent');
  if (error) { console.error(error); return; }
  
  const total = data.length;
  const optedIn = data.filter(v => v.marketing_consent === true).length;
  const nulls = data.filter(v => v.marketing_consent === null).length;
  
  console.log(`Total Vouchers: ${total}`);
  console.log(`Opted In (true): ${optedIn}`);
  console.log(`Nulls: ${nulls}`);
  console.log(`False: ${total - optedIn - nulls}`);
}

run();
