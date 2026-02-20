
const FETCH_URL = 'https://wellness-club-digital.vercel.app/api/get-data';
const REPAIR_URL = 'https://wellness-club-digital.vercel.app/api/redeem-voucher';

async function repair() {
    console.log("🚀 Starting Data Repair...");

    try {
        // 1. Fetch all redemptions
        const res = await fetch(`${FETCH_URL}?sheet=Redemptions`);
        const redemptions = await res.json();

        // 2. Fetch all vouchers
        const vRes = await fetch(`${FETCH_URL}?sheet=Vouchers`);
        const vouchers = await vRes.json();

        // Target vouchers from user's screenshot
        const targets = ['NW-ZQVLSE', 'NW-49ZKC8', 'NW-WKYP8X', 'NW-P6EPWF'];

        for (const code of targets) {
            const v = vouchers.find(x => x.voucherCode === code);
            if (!v) {
                console.log(`❌ Voucher ${code} not found in Vouchers sheet.`);
                continue;
            }

            console.log(`🔧 Repairing ${code} (${v.guestName})...`);

            const payload = {
                action: 'redeem',
                voucherCode: code,
                serviceType: "15% off T Store Shopping", // The correct category
                guestName: v.guestName,
                roomNumber: v.roomNumber,
                redeemedAt: v.redeemed_at || new Date().toISOString()
            };

            const repairRes = await fetch(REPAIR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await repairRes.json();
            console.log(`✅ Result for ${code}:`, result);
        }

        console.log("✨ Repair Complete.");
    } catch (e) {
        console.error("ERROR during repair:", e);
    }
}

repair();
