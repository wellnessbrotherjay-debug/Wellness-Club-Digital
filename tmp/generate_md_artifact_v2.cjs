const fs = require('fs');
const path = require('path');

const jsonPath = 'c:\\Users\\user\\Documents\\Software-Developer\\htf\\Wellness-Club-Digital\\unknown_vouchers.json';
const artifactPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\1563992d-7de2-42c2-88a1-a3861b83ed96\\unknown_vouchers_list.md';

try {
    if (!fs.existsSync(jsonPath)) {
        throw new Error('Source JSON not found at ' + jsonPath);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('Read ' + data.length + ' records from JSON.');
    
    let md = '# Audit: Unknown/Empty Vouchers (290 Total)\n\n';
    md += 'This list contains vouchers that were filtered out of the Analytics Dashboard because they lack a guest name or are placeholder entries.\n\n';
    md += '| # | Voucher Code | Created At | Room | Guest Name |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    
    data.forEach((v, i) => {
        const date = v.created_at ? new Date(v.created_at).toLocaleString() : 'N/A';
        const name = v.guest_name ? `\`${v.guest_name}\`` : '*empty*';
        md += `| ${i + 1} | \`${v.voucher_code}\` | ${date} | ${v.room_number || 'N/A'} | ${name} |\n`;
    });

    fs.writeFileSync(artifactPath, md);
    console.log('✅ Successfully created artifact at: ' + artifactPath);
    console.log('File size: ' + fs.statSync(artifactPath).size + ' bytes');
} catch (e) {
    console.error('❌ Failed: ' + e.message);
}
