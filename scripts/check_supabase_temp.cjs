const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVoucher(code) {
    console.log(`Checking Supabase for voucher: ${code}`);

    // List of potential tables
    const tables = ['vouchers', 'stays', 'redemptions', 'pos_transactions'];

    for (const table of tables) {
        console.log(`Searching in table: ${table}...`);
        try {
            // First, try to list columns to build a dynamic query
            const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: table });

            // If RPC is not available, just try common columns
            const queryColumns = ['voucher_code', 'code', 'voucherCode', 'voucher_id', 'id', 'guest_name', 'description'];

            const orFilters = queryColumns.map(col => `${col}.ilike.${code}`).join(',');

            const { data, error } = await supabase
                .from(table)
                .select('*')
                .or(orFilters);

            if (error) {
                // Fallback: fetch all and filter in JS if table is small, or try just searching one column
                // console.log(`Error with OR filter on ${table}: ${error.message}. Trying simple search.`);
                const { data: data2, error: error2 } = await supabase
                    .from(table)
                    .select('*')
                    .limit(100); // Just a peek

                if (!error2 && data2) {
                    const found = data2.filter(row => JSON.stringify(row).includes(code));
                    if (found.length > 0) {
                        console.log(`FOUND in table ${table} via partial search!`);
                        console.log(JSON.stringify(found, null, 2));
                    }
                }
            } else if (data && data.length > 0) {
                console.log(`FOUND in table ${table}!`);
                console.log(JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.error(`Error searching table ${table}: ${e.message}`);
        }
    }
}

checkVoucher('NW-AYQ8AU');
