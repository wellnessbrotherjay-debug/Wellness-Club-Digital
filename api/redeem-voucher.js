import { Resend } from 'resend';
import { supabase } from './supabase.js';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

// Fire-and-forget to Google Sheets for mirroring
async function mirrorToGoogleSheets(payload) {
    try {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
        }).catch(err => console.warn('[Mirror] Google Sheets error:', err.message));
    } catch (e) {
        console.warn('[Mirror] Failed to send to Sheets:', e.message);
    }
}

const AUDIT_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/audit-log`
    : 'https://wellness-club-digital.vercel.app/api/audit-log';

async function writeAuditEvent(payload) {
    try {
        await fetch(AUDIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.warn('[AuditLog] Fire-and-forget failed:', e.message);
    }
}

async function getWeatherCondition() {
    try {
        const apiKey = 'd90d116d89814419220bd3000d9eb498';
        const lat = '-8.6478'; // Canggu, Bali
        const lon = '115.1385'; // Canggu, Bali
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for weather

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.weather && data.weather.length > 0) {
                return data.weather[0].main;
            }
        }
    } catch (e) {
        console.warn("[Weather] Fetch failed or timed out:", e.message);
    }
    return '';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 0. Robust Body Parsing (Vercel sometimes passes body as string if content-type mismatch)
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error('[API] Failed to parse body string:', e.message);
                return res.status(400).json({ error: 'Invalid JSON body' });
            }
        }

        const action = body.action || (body.status === 'Redeemed' ? 'redeem' : '');
        console.log('[API] Action:', action, 'Payload:', JSON.stringify(body).substring(0, 200));

        if (!action) {
            return res.status(400).json({ error: 'Missing action in request body' });
        }

        let resultData = null;
        let finalError = null;

        // 1. Primary Logic: Supabase
        // 1. Primary Logic: Google Sheets Only (Mirroring)
        // We bypass all Supabase upserts/inserts to resolve "Invalid API key" errors.

        const redeemedAt = body.redeemedAt || new Date().toISOString();
        if (action === 'redeem') {
            try {
                body.weather = await getWeatherCondition();
            } catch (e) {
                body.weather = '';
            }
            body.redeemedAt = redeemedAt;
        }

        // 2. Execute Mirroring to Google Sheets (Now the Primary Action)
        await mirrorToGoogleSheets(body);

        // 3. Audit Log - keep as fire-and-forget
        if (action === 'redeem') {
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            writeAuditEvent({
                action: 'REDEEMED',
                voucherCode: body.voucherCode,
                guestName: body.guestName,
                serviceType: body.serviceType || body.redeemed_service || '',
                roomNumber: body.roomNumber,
                source: 'DIGITAL_REDEMPTION_SHEETS_ONLY',
                inputPath: body.inputPath || '/',
                deviceId: body.deviceId || req.headers['x-device-id'] || 'unknown',
                sessionId: body.sessionId || '',
                userAgent: body.userAgent || req.headers['user-agent'] || '',
                ipAddress: ip,
            }).catch(e => console.warn('[AuditLog] Deferred error:', e.message));
        }

        // 3. Audit Log - keep as fire-and-forget
        if (action === 'redeem') {
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            writeAuditEvent({
                action: 'REDEEMED',
                voucherCode: body.voucherCode,
                guestName: body.guestName,
                serviceType: body.serviceType || body.redeemed_service || '',
                roomNumber: body.roomNumber,
                source: 'DIGITAL_REDEMPTION',
                inputPath: body.inputPath || '/',
                deviceId: body.deviceId || req.headers['x-device-id'] || 'unknown',
                sessionId: body.sessionId || '',
                userAgent: body.userAgent || req.headers['user-agent'] || '',
                ipAddress: ip,
            }).catch(e => console.warn('[AuditLog] Deferred error:', e.message));
        }

        // 4. Email Notification
        if (req.body.action === 'redeem' && process.env.RESEND_API_KEY) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const { voucherCode, serviceType, guestName, inputPath } = {
                    voucherCode: (req.body.voucherCode || req.body.code || req.body.date || req.body.id || '').toUpperCase(),
                    serviceType: req.body.serviceType || req.body.services || '',
                    guestName: req.body.guestName || req.body.userName || req.body.description || req.body.name || 'Unknown',
                    inputPath: req.body.inputPath || '/'
                };
                await resend.emails.send({
                    from: 'No.1 Wellness <notifications@resend.dev>',
                    to: ['wellnessbrotherjay@gmail.com'],
                    subject: `Voucher Redeemed: ${guestName} (${voucherCode})`,
                    html: `
                        <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                            <h2 style="border-bottom: 2px solid #c5a572; padding-bottom: 10px;">New Voucher Redemption (Supabase)</h2>
                            <p><strong>Guest Name:</strong> ${guestName || 'Unknown'}</p>
                            <p><strong>Voucher Code:</strong> ${voucherCode}</p>
                            <p><strong>Service Redeemed:</strong> <span style="color: #c5a572; font-weight: bold;">${serviceType || 'General Use'}</span></p>
                            <p><strong>Redemption Path:</strong> <code>${inputPath || '/'}</code></p>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Error sending notification:', emailError);
            }
        }

        return res.status(200).json({ status: 'success', message: 'Action completed successfully' });

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
}
