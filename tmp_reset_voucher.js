
// Script to reset NW-TZL6XR voucher to "Created"
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyLCafm3ltwnO1pNhEocaWYABSjV4Yxvn1yfXkOKohBv_JTxYu2buWRq51vjhPBX1JL/exec';

async function resetVoucher() {
    console.log("1. Deleting the mistakenly redeemed voucher row...");
    const deleteRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'deleteVoucher',
            voucherCode: 'NW-TZL6XR'
        })
    });
    console.log("Delete result:", await deleteRes.text());

    console.log("2. Re-creating the voucher exactly as before but with 'Created' status...");
    const createRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'create',
            voucherCode: 'NW-TZL6XR',
            guestName: 'Liubov Bazyleva',
            roomNumber: 247,
            checkIn: '2026-03-05T16:00:00.000Z',
            checkOut: '2026-03-10T16:00:00.000Z',
            created_at: '2026-03-05T23:31:06.467Z',
            status: 'Created',
            pax: 1
        })
    });
    console.log("Create result:", await createRes.text());
}

resetVoucher();
