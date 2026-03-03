const fs = require('fs');
const path = require('path');

const TMP_RED = path.join(__dirname, '../tmp_red.json');
const data = JSON.parse(fs.readFileSync(TMP_RED, 'utf-8'));

const counts = {};
data.forEach(r => {
    const s = r.servicetype || r.serviceType || 'EMPTY';
    counts[s] = (counts[s] || 0) + 1;
});

console.log(counts);
