const { createClient } = require('@supabase/supabase-js');

const project = {
    name: '.env (iwkhqmonkmvyeemlihlz)',
    url: 'https://iwkhqmonkmvyeemlihlz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I'
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
