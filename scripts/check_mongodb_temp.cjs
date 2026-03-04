const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://wellness:jayden123@wellnesscluster.0mvkj.mongodb.net/?retryWrites=true&w=majority&appName=wellnesscluster";
const client = new MongoClient(uri);

async function checkAudit(code) {
    try {
        await client.connect();
        const db = client.db('test'); // Vercel usually defaults to 'test' if not specified, let's check collections

        console.log(`Checking MongoDB for voucher: ${code}`);

        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name).join(', '));

        const auditLog = db.collection('audit_log');
        const stats = db.collection('voucher_stats');

        const events = await auditLog.find({
            $or: [
                { voucherCode: code.toUpperCase() },
                { guestName: { $regex: code, $options: 'i' } }
            ]
        }).toArray();

        if (events.length > 0) {
            console.log(`✅ FOUND ${events.length} events in audit_log!`);
            console.log(JSON.stringify(events, null, 2));
        } else {
            console.log('❌ No events found in audit_log.');
        }

        const stat = await stats.findOne({ voucherCode: code.toUpperCase() });
        if (stat) {
            console.log('✅ FOUND stats entry!');
            console.log(JSON.stringify(stat, null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.close();
    }
}

const code = 'NW-AYQ8AU';
checkAudit(code);
