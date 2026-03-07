import { Resend } from 'resend';
import { supabase } from './supabase.js';

// Use actual env var or fallback (ensure URL is correctly quoted and ends in /exec)
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbycyXz99TO6iGntmyuRw55yxpD9Clu6k69CWf3-dHip6cV80TxGoHodpI-NvXkZY0Ld/exec';

// Hardcoded bypass - We strictly use REST calls to Google Apps Script now
const FORCE_REST_MODE = true;

async function mirrorToGoogleSheets(payload, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (response.ok) return true;
            console.warn(`[Mirror] Attempt ${i + 1} failed: ${response.status}`);
        } catch (e) {
            console.warn(`[Mirror] Attempt ${i + 1} error: ${e.message}`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
    return false;
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
        console.warn('[AuditLog] Write failed:', e.message);
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

            // Capture IP tracking info
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            body.ipAddress = ip;
            // Ensure deviceId and userAgent are passed through if provided by frontend
            body.deviceId = body.deviceId || req.headers['x-device-id'] || 'unknown';
            body.userAgent = body.userAgent || req.headers['user-agent'] || '';

            // 1.1 Financial Calculations (PPN 11%, Service 10%)
            if (body.billAmount && !isNaN(body.billAmount)) {
                const amount = parseFloat(body.billAmount);
                body.tax = Math.round(amount * 0.11);
                body.serviceCharge = Math.round(amount * 0.10);
                body.total = amount + body.tax + body.serviceCharge;
            }
        }

        // 2. Execute Mirroring to Google Sheets (Primary Action)
        const mirrored = await mirrorToGoogleSheets(body);

        // 3. Fail-safe: If Sheets failed, we MUST log to Audit Log (which stores in MongoDB/Supabase)
        // Ensure audit log is always awaited even if Sheets fails
        if (action === 'redeem' || !mirrored) {
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            await writeAuditEvent({
                action: action === 'redeem' ? 'REDEEMED' : 'CREATED_FAILSAFE',
                voucherCode: body.voucherCode,
                guestName: body.guestName,
                serviceType: body.serviceType || body.redeemed_service || '',
                roomNumber: body.roomNumber,
                source: mirrored ? 'DIGITAL_APP' : 'FAILSAFE_SHEETS_OFFLINE',
                inputPath: body.inputPath || '/',
                deviceId: body.deviceId || req.headers['x-device-id'] || 'unknown',
                sessionId: body.sessionId || '',
                userAgent: body.userAgent || req.headers['user-agent'] || '',
                ipAddress: ip,
                billAmount: body.billAmount,
                tax: body.tax,
                serviceCharge: body.serviceCharge,
                total: body.total
            });
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
                            <h2 style="border-bottom: 2px solid #c5a572; padding-bottom: 10px;">New Voucher Redemption</h2>
                            <p><strong>Guest Name:</strong> ${guestName || 'Unknown'}</p>
                            <p><strong>Voucher Code:</strong> ${voucherCode}</p>
                            <p><strong>Service Redeemed:</strong> <span style="color: #c5a572; font-weight: bold;">${serviceType || 'General Use'}</span></p>
                            <p><strong>Redemption Path:</strong> <code>${inputPath || '/'}</code></p>
                            
                            <div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 12px; color: #666;">
                                <p style="margin: 0; font-weight: bold; color: #c5a572; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Security & Audit Info</p>
                                <p style="margin: 2px 0;"><strong>IP Address:</strong> ${req.body.ipAddress || 'Unknown'}</p>
                                <p style="margin: 2px 0;"><strong>Device ID:</strong> <code style="font-size: 11px;">${req.body.deviceId || 'Unknown'}</code></p>
                                <p style="margin: 2px 0;"><strong>User Agent:</strong> <span style="font-size: 10px;">${req.body.userAgent || 'Unknown'}</span></p>
                            </div>
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
