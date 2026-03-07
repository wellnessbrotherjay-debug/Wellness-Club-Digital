
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycyXz99TO6iGntmyuRw55yxpD9Clu6k69CWf3-dHip6cV80TxGoHodpI-NvXkZY0Ld/exec';

async function hardClearRedeemed() {
    console.log("Hard clearing redeemed_at and redeemed_service for NW-TZL6XR...");

    // Using manual update via Code.gs to force empty string
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'manual', // or 'create', either works as an update in Code.gs
            voucherCode: 'NW-TZL6XR',
            status: 'Created' // Just keeping it Created
        })
    });

    console.log("Update result:", await res.text());
}

hardClearRedeemed();
