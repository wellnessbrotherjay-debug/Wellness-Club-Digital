const { createClient } = require('@supabase/supabase-js');

const projects = [
    {
        name: 'Hardcoded (bwndbccgzjdgtcyornwn)',
        url: 'https://bwndbccgzjdgtcyornwn.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bmRiY2NnempkZ3RjeW9ybnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzk2MDYsImV4cCI6MjA3NTk1NTYwNn0.KBhWWrstu0_NTOJ38sQQNTqhhIno5iEQC-kFXd34ao4'
    },
    {
        name: '.env (iwkhqmonkmvyeemlihlz)',
        url: 'https://iwkhqmonkmvyeemlihlz.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I'
    }
];

async function checkVoucher(code) {
    console.log(`Checking for voucher: ${code}\n`);

    for (const project of projects) {
        console.log(`--- Project: ${project.name} ---`);
        try {
            const supabase = createClient(project.url, project.key);

            console.log('Querying for specific code...');
            const { data, error } = await supabase
                .from('vouchers')
                .select('*')
                .ilike('voucher_code', code);

            if (error) {
                console.error(`Error: ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`FOUND! Count: ${data.length}`);
                console.log(JSON.stringify(data[0], null, 2));
            } else {
                console.log('Specific code not found.');
            }

            console.log('\nQuerying for most recent 5 vouchers...');
            const { data: recent, error: recentError } = await supabase
                .from('vouchers')
                .select('voucher_code, guest_name, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentError) {
                console.error(`Recent Error: ${recentError.message}`);
            } else if (recent && recent.length > 0) {
                console.table(recent);
            } else {
                console.log('No vouchers found in this project.');
            }
        } catch (e) {
            console.error(`Execution error: ${e.message}`);
        }
        console.log('\n');
    }
}

const code = process.argv[2] || 'NW-R9ETGR';
checkVoucher(code);
