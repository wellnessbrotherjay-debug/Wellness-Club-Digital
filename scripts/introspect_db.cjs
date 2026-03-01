const { createClient } = require('@supabase/supabase-js');

const project = {
    name: 'Hardcoded (bwndbccgzjdgtcyornwn)',
    url: 'https://bwndbccgzjdgtcyornwn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bmRiY2NnempkZ3RjeW9ybnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzk2MDYsImV4cCI6MjA3NTk1NTYwNn0.KBhWWrstu0_NTOJ38sQQNTqhhIno5iEQC-kFXd34ao4'
};

async function introspect() {
    console.log(`Introspecting project: ${project.name}\n`);
    const supabase = createClient(project.url, project.key);

    try {
        // Get one row to see columns
        const { data, error } = await supabase
            .from('vouchers')
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Error: ${error.message}`);
            if (error.message.includes('does not exist')) {
                console.log('Table might not exist or schema is different.');
            }
        } else if (data && data.length > 0) {
            console.log('Columns found:');
            console.log(Object.keys(data[0]).join(', '));
            console.log('\nSample data:');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('Table is empty, trying to get columns via RPC or metadata...');
            // If table is empty, we can't easily see columns with select *
            // Let's try to insert a dummy row? No, too risky.
            // Try to query a non-existent column to see if it lists available ones? 
            // Some DBs do that in error messages.
            const { error: schemaError } = await supabase
                .from('vouchers')
                .select('non_existent_column')
                .limit(1);
            console.log('Schema error hint:');
            console.log(schemaError.message);
        }
    } catch (e) {
        console.error(`Execution error: ${e.message}`);
    }
}

introspect();
