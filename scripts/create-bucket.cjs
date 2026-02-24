
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log('Attempting to create "pos-reports" bucket...');

    const { data, error } = await supabase.storage.createBucket('pos-reports', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "pos-reports" already exists.');
        } else {
            console.error('Error creating bucket:', error.message);
        }
    } else {
        console.log('Bucket "pos-reports" created successfully!');
    }
}

createBucket();
