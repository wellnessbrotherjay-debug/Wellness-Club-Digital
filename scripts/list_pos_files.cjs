const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bwndbccgzjdgtcyornwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bmRiY2NnempkZ3RjeW9ybnduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3OTYwNiwiZXhwIjoyMDc1OTU1NjA2fQ.S_aDftaqmLd0m44PIlA4SkmLIElMuMohUaWb7xqMRlM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles() {
    console.log('Listing files in pos-reports bucket...');
    const { data, error } = await supabase.storage.from('pos-reports').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
    });

    if (error) {
        console.error('Error listing files:', error);
        return;
    }

    console.log('Files found:', data.length);
    data.forEach(f => {
        const size = f.metadata ? f.metadata.size : 'N/A';
        console.log(`- ${f.name} (Created: ${f.created_at}, Size: ${size})`);
    });
}

listFiles();
