// Verification script for voucher expiration logic
// Run with: node scripts/verify_voucher_logic.js

const isVoucherExpiredLegacy = (checkOut) => {
    if (!checkOut) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(checkOut);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
};

const isVoucherExpiredNew = (checkOut, currentTime) => {
    if (!checkOut) return false;
    const expiryDate = new Date(checkOut);
    const expirationTime = new Date(
        expiryDate.getFullYear(),
        expiryDate.getMonth(),
        expiryDate.getDate(),
        22, 0, 0, 0
    );
    return currentTime.getTime() > expirationTime.getTime();
};

const testScenarios = [
    {
        name: "Expiring Today - Before 10 PM",
        checkOut: "2026-03-07",
        currentTime: new Date("2026-03-07T14:00:00+08:00"),
        expectedNew: false,
        expectedLegacy: false // Legacy would also be false today
    },
    {
        name: "Expiring Today - After 10 PM",
        checkOut: "2026-03-07",
        currentTime: new Date("2026-03-07T22:30:00+08:00"),
        expectedNew: true,
        expectedLegacy: false // Legacy would incorrectly be false until midnight
    },
    {
        name: "Expired Yesterday",
        checkOut: "2026-03-06",
        currentTime: new Date("2026-03-07T09:00:00+08:00"),
        expectedNew: true,
        expectedLegacy: true
    },
    {
        name: "Expiring Tomorrow",
        checkOut: "2026-03-08",
        currentTime: new Date("2026-03-07T12:00:00+08:00"),
        expectedNew: false,
        expectedLegacy: false
    }
];

console.log("--- Voucher Expiration Logic Verification ---");
let allPassed = true;

testScenarios.forEach(s => {
    const resultNew = isVoucherExpiredNew(s.checkOut, s.currentTime);
    const passed = resultNew === s.expectedNew;
    if (!passed) allPassed = false;

    console.log(`\nScenario: ${s.name}`);
    console.log(`  Checkout: ${s.checkOut} | Now: ${s.currentTime.toLocaleString()}`);
    console.log(`  Expected: ${s.expectedNew} | Result: ${resultNew} | ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (s.expectedNew !== s.expectedLegacy) {
        console.log(`  [Note] Logic change detected: Legacy would have returned ${s.expectedLegacy}`);
    }
});

console.log("\n-------------------------------------------");
if (allPassed) {
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY");
} else {
    console.log("❌ SOME TESTS FAILED");
    process.exit(1);
}
