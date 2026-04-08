require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
    console.log('🚀 Starting Database Audit...');
    
    const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('guest_name, voucher_code, is_test');

    if (error) {
        console.error('❌ Error fetching vouchers:', error.message);
        return;
    }

    const total = vouchers.length;
    console.log(`📊 Total Vouchers in DB: ${total}`);

    const EXCLUDE_NAMES = ['test', 'samual', 'jay', 'diag', 'agent', 'fix'];
    
    const isTest = (name, code) => {
        const n = String(name || '').toLowerCase();
        const c = String(code || '').toLowerCase();
        if (c.startsWith('test-')) return true;
        return EXCLUDE_NAMES.some(tn => {
            if (tn === 'jay' || tn === 'samual') {
                const regex = new RegExp(`\\b${tn}\\b`, 'i');
                return regex.test(n);
            }
            return n.includes(tn);
        });
    };

    let invalidNames = 0;
    let explicitTest = 0;
    let nameTestMatches = 0;
    let codeTestMatches = 0;
    let realVouchers = [];

    vouchers.forEach(v => {
        const isUnknown = !v.guest_name || v.guest_name === 'Unknown Guest' || v.guest_name.trim() === '';
        const name = String(v.guest_name || '').toLowerCase();
        const code = String(v.voucher_code || '').toLowerCase();
        
        let filtered = false;

        if (isUnknown) {
            invalidNames++;
            filtered = true;
        }
        
        if (v.is_test) {
            explicitTest++;
            filtered = true;
        }

        if (!filtered && code.startsWith('test-')) {
            codeTestMatches++;
            filtered = true;
        }

        if (!filtered && EXCLUDE_NAMES.some(tn => {
            if (tn === 'jay' || tn === 'samual') {
                const regex = new RegExp(`\\b${tn}\\b`, 'i');
                return regex.test(name);
            }
            return name.includes(tn);
        })) {
            nameTestMatches++;
            filtered = true;
        }

        if (!filtered) {
            realVouchers.push(v);
        }
    });

    console.log('--- Breakdown ---');
    console.log(`❌ Unknown/Empty Names: ${invalidNames}`);
    console.log(`❌ Explicit is_test=true: ${explicitTest}`);
    console.log(`❌ Code starts with "TEST-": ${codeTestMatches}`);
    console.log(`❌ Name matches EXCLUDE_NAMES (test, samual, jay...): ${nameTestMatches}`);
    console.log('-----------------');
    console.log(`✅ TOTAL REAL VOUCHERS: ${realVouchers.length}`);
    
    if (total === 1000 && realVouchers.length === 674) {
        console.log('\n✨ CONFIRMED: Logic matches. Filtered out ' + (total - realVouchers.length) + ' vouchers.');
    } else {
        console.log('\n⚠️ WARNING: Numbers do not match expected discrepancy (1000 vs 674).');
    }
}

audit();
