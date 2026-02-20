const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQfLGomln4OdkhSheHF_IJGTtYKHZi8IJT8YfzzvNHODysLm75B-YtC6bfLo2FR4Y5/exec';

async function runCleanup() {
    console.log('--- Running Master Cleanup ---');
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'cleanupDuplicates' })
        });
        const data = await response.json();
        console.log('Result:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

runCleanup();
