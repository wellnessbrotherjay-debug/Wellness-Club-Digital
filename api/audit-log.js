import { getDb } from './db.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, X-Session-Id'
};

export default async function handler(req, res) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') return res.status(200).end();

    const db = await getDb();

    // ── GET — read audit history ─────────────────────────────────────────────
    if (req.method === 'GET') {
        if (!db) return res.status(200).json({ events: [], disabled: true });

        const { voucher, action, limit = '200', skip = '0' } = req.query;
        const filter = {};
        if (voucher) filter.voucherCode = voucher.toUpperCase();
        if (action) filter.action = action.toUpperCase();

        try {
            const events = await db.collection('audit_log')
                .find(filter)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip))
                .toArray();

            return res.status(200).json({ events });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ── POST — write one audit event ─────────────────────────────────────────
    if (req.method === 'POST') {
        const {
            action,        // REDEEMED | CREATED | VIEWED | DUPLICATE_ATTEMPT | UPDATED
            voucherCode,
            guestName,
            serviceType,
            roomNumber,
            source,        // APPS_SCRIPT | DIGITAL_REDEMPTION | ADMIN
            inputPath,
            deviceId,
            sessionId,
            userAgent: bodyUA,
        } = req.body || {};

        if (!action || !voucherCode) {
            return res.status(400).json({ error: 'action and voucherCode are required' });
        }

        // Capture server-side context
        const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
        const userAgent = bodyUA || req.headers['user-agent'] || '';
        const timestamp = new Date();

        // Formatted Bali time for human-readable display
        const timestampBali = timestamp.toLocaleString('en-GB', {
            timeZone: 'Asia/Makassar',
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const event = {
            action: action.toUpperCase(),
            voucherCode: (voucherCode || '').toUpperCase(),
            guestName: guestName || '',
            serviceType: serviceType || '',
            roomNumber: roomNumber || '',
            source: source || 'UNKNOWN',
            inputPath: inputPath || '',
            deviceId: deviceId || req.headers['x-device-id'] || 'unknown',
            sessionId: sessionId || req.headers['x-session-id'] || '',
            userAgent,
            ipAddress: ip,
            timestamp,         // UTC Date — stored as ISODate in MongoDB
            timestampBali,     // Human-readable Bali time string
        };

        if (!db) {
            // MongoDB not configured yet — still return success so nothing breaks
            console.warn('[AuditLog] MongoDB not connected. Event dropped:', JSON.stringify(event));
            return res.status(200).json({ ok: true, disabled: true });
        }

        try {
            // 1. Insert the event
            await db.collection('audit_log').insertOne(event);

            // 2. Track per-voucher redemption count
            if (action.toUpperCase() === 'REDEEMED' || action.toUpperCase() === 'DUPLICATE_ATTEMPT') {
                const stats = db.collection('voucher_stats');
                await stats.updateOne(
                    { voucherCode: event.voucherCode },
                    {
                        $inc: { redemptionCount: 1 },
                        $set: { lastRedeemedAt: timestamp, lastDeviceId: event.deviceId, lastIp: ip },
                        $setOnInsert: { firstRedeemedAt: timestamp }
                    },
                    { upsert: true }
                );

                // 3. Check if this is a duplicate (count > 1 after incrementing)
                const stat = await stats.findOne({ voucherCode: event.voucherCode });
                if (stat && stat.redemptionCount > 1) {
                    // Log a DUPLICATE_ATTEMPT event as a warning
                    if (action.toUpperCase() === 'REDEEMED') {
                        await db.collection('audit_log').insertOne({
                            ...event,
                            action: 'DUPLICATE_ATTEMPT',
                            redemptionCount: stat.redemptionCount,
                            note: `Voucher ${event.voucherCode} has now been redeemed ${stat.redemptionCount} times`
                        });
                    }
                    return res.status(200).json({
                        ok: true,
                        warning: 'DUPLICATE',
                        redemptionCount: stat.redemptionCount
                    });
                }
            }

            return res.status(200).json({ ok: true });
        } catch (err) {
            console.error('[AuditLog] Write failed:', err.message);
            // Non-fatal — don't block the main flow if audit fails
            return res.status(200).json({ ok: false, error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
