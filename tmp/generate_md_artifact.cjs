const fs = require('fs');
const path = require('path');

try {
    const data = JSON.parse(fs.readFileSync('unknown_vouchers.json', 'utf8'));
    
    let md = '# Audit: Unknown/Empty Vouchers (290 Total)\n\n';
    md += 'This list contains vouchers that were filtered out of the Analytics Dashboard because they lack a guest name or are placeholder entries.\n\n';
    md += '| # | Voucher Code | Created At | Room | Guest Name |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    
    data.forEach((v, i) => {
        const date = v.created_at ? new Date(v.created_at).toLocaleString() : 'N/A';
        const name = v.guest_name ? `\`${v.guest_name}\`` : '*empty*';
        md += `| ${i + 1} | \`${v.voucher_code}\` | ${date} | ${v.room_number || 'N/A'} | ${name} |\n`;
    });

    const artifactPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\1563992d-7de2-42c2-88a1-a3861b83ed96\\unknown_vouchers_list.md';
    fs.writeFileSync(artifactPath, md);
    console.log('✅ Successfully created artifact at: ' + artifactPath);
} catch (e) {
    console.error('❌ Failed to generate artifact: ' + e.message);
}
