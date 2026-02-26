import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getWeatherCondition() {
    try {
        const apiKey = 'd90d116d89814419220bd3000d9eb498';
        const lat = '-8.697276';
        const lon = '115.171634';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        
        console.log('Fetching weather from OpenWeather API...');
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ OpenWeather API Status: Connected');
            console.log('✅ Raw Weather Data:', JSON.stringify(data.weather, null, 2));
            if (data && data.weather && data.weather.length > 0) {
                return data.weather[0].main; 
            }
        } else {
            console.warn(`Weather API returned ${response.status}: ` + await response.text());
        }
    } catch (e) {
        console.error("Weather fetch error: " + e.message);
    }
    return '';
}

async function testWeatherAndSupabase() {
    console.log('--- STARTING WEATHER & SUPABASE INTEGRATION TEST ---');
    
    // 1. Fetch Weather
    const weather = await getWeatherCondition();
    console.log(`\n🎯 Parsed Weather Condition: "${weather}"\n`);
    
    if (!weather) {
        console.error('❌ Failed to fetch weather. Cannot test Supabase storage.');
        return;
    }

    // 2. Test Supabase Storage
    const testCode = 'WEATHER-TEST-' + Date.now();
    console.log(`Testing storage in Supabase (Voucher: ${testCode})...`);
    
    // Create voucher first to satisfy foreign key constraint
    const { error: createVoucherError } = await supabase.from('vouchers').insert({
        voucher_code: testCode,
        status: 'Created',
        guest_name: 'Weather API Test'
    });

    if (createVoucherError) {
        console.error('❌ Supabase Voucher Create Error:', createVoucherError);
        return;
    }

    // Insert redemption with weather
    const { data: redemptionData, error: redemptionError } = await supabase.from('redemptions').insert({
        voucher_code: testCode,
        weather: weather,
        timestamp: new Date().toISOString(),
        guest_name: 'Weather API Test'
    }).select();
    
    if (redemptionError) {
        console.error('❌ Supabase Redemption Insert Error:', redemptionError);
    } else {
        console.log('✅ Successfully stored in Supabase redemptions table!');
        console.log('Stored Record:', redemptionData[0]);
    }
    
    // 3. Cleanup
    console.log('\nCleaning up test records...');
    await supabase.from('vouchers').delete().eq('voucher_code', testCode);
    console.log('✅ Cleanup complete.');
    console.log('--- TEST FINISHED ---');
}

testWeatherAndSupabase();
