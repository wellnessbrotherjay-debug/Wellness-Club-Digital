
// Mocking the calculation logic from api/redeem-voucher.js to verify it locally
function calculateGst(body) {
    if (body.billAmount && !isNaN(body.billAmount)) {
        const amount = parseFloat(body.billAmount);
        body.tax = Math.round(amount * 0.11);
        body.serviceCharge = Math.round(amount * 0.10);
        body.total = amount + body.tax + body.serviceCharge;
    }
    return body;
}

const testBody = {
    action: 'redeem',
    billAmount: 1000000 // 1,000,000 IDR
};

console.log('--- Input ---');
console.log(testBody);

const result = calculateGst(testBody);

console.log('--- Result ---');
console.log(result);

if (result.tax === 110000 && result.serviceCharge === 100000 && result.total === 1210000) {
    console.log('✅ Calculation Correct!');
} else {
    console.log('❌ Calculation Incorrect!');
    process.exit(1);
}
