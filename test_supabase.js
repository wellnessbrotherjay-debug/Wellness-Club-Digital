import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- STARTING SUPABASE TESTS ---');
  const testVoucherCode = 'TEST-VOUCHER-' + Date.now();
  console.log(`Using Test Voucher Code: ${testVoucherCode}`);

  try {
    // 1. Create a Voucher
    console.log('\\n1. Testing Voucher Creation...');
    const { error: createError } = await supabase.from('vouchers').upsert({
        voucher_code: testVoucherCode,
        guest_name: 'Test Automation Guest',
        status: 'Created',
        room_number: '999',
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000).toISOString(),
        service_type: 'Test Service',
        email: 'test@example.com',
        whatsapp: '1234567890',
        pax: 2
    }, { onConflict: 'voucher_code' });

    if (createError) {
        console.error('❌ Failed to create voucher:', createError);
        return;
    }
    console.log('✅ Voucher created successfully.');

    // 2. Fetch Vouchers (get-data equivalent)
    console.log('\\n2. Testing Fetching Vouchers...');
    const { data: vouchers, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (fetchError) {
        console.error('❌ Failed to fetch vouchers:', fetchError);
        return;
    }
    console.log(`✅ Successfully fetched ${vouchers.length} vouchers. Most recent:`, vouchers[0].voucher_code);

    // 3. Redeem Voucher
    console.log('\\n3. Testing Voucher Redemption...');
    const redeemedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from('vouchers')
        .update({ 
            status: 'Redeemed', 
            redeemed_at: redeemedAt,
            redeemed_service: 'Test Service Redeemed'
        })
        .eq('voucher_code', testVoucherCode);
    
    if (updateError) {
        console.error('❌ Failed to update voucher status:', updateError);
        return;
    }

    const { error: insertError } = await supabase.from('redemptions').insert({
        timestamp: redeemedAt,
        voucher_code: testVoucherCode,
        guest_name: 'Test Automation Guest',
        service_type: 'Test Service Redeemed',
        room_number: '999',
        weather: 'Sunny'
    });

    if (insertError) {
        console.error('❌ Failed to insert redemption log:', insertError);
        return;
    }
    console.log('✅ Voucher redeemed successfully.');

    // 4. Fetch Redemptions
    console.log('\\n4. Testing Fetching Redemptions...');
    const { data: readRedemptions, error: fetchRedemptionsError } = await supabase
        .from('redemptions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

    if (fetchRedemptionsError) {
        console.error('❌ Failed to fetch redemptions:', fetchRedemptionsError);
        return;
    }
    console.log(`✅ Successfully fetched ${readRedemptions.length} redemptions. Most recent:`, readRedemptions[0].voucher_code);

    // 5. Delete Test Voucher
    console.log('\\n5. Testing Voucher Deletion Cleanup...');
    const { error: deleteError } = await supabase.from('vouchers')
        .delete()
        .eq('voucher_code', testVoucherCode);
        
    if (deleteError) {
        console.error('❌ Failed to clean up test voucher:', deleteError);
    } else {
        console.log('✅ Clean up successful. Test voucher deleted.');
    }

    console.log('\\n--- ALL TESTS PASSED SUCCESSFULLY! ---');

  } catch (err) {
    console.error('❌ Unexpected Error during tests:', err);
  }
}

runTests();
