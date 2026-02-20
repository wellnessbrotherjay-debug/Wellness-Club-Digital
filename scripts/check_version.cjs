const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQfLGomln4OdkhSheHF_IJGTtYKHZi8IJT8YfzzvNHODysLm75B-YtC6bfLo2FR4Y5/exec';

async function checkVersion() {
    console.log('--- Checking Script Version ---');
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'ping' })
        });
        const text = await response.text();
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkVersion();
