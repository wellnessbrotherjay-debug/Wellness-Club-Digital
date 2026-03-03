const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

async function check() {
  console.log('Fetching from Google Sheets...');
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?sheet=Vouchers`);
    const data = await response.json();
    console.log('Total found in Sheets:', data.length);
    // Sort by date/id or just show last 10
    const last10 = data.slice(-10);
    last10.forEach(v => {
      console.log(`[${v.created_at || v.timestamp || '?'}] ${v.voucherCode || v.date || v.id} - ${v.guestName || v.description} (${v.status || v.category})`);
    });
  } catch (e) {
    console.error('Error fetching from Sheets:', e.message);
  }
}

check();
