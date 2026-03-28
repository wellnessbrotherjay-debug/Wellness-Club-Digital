import { Hono } from 'hono';
import { Resend } from 'resend';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

const APPS_SCRIPT_URL =
    process.env.APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbycyXz99TO6iGntmyuRw55yxpD9Clu6k69CWf3-dHip6cV80TxGoHodpI-NvXkZY0Ld/exec';

/** Fire-and-forget mirror to Google Sheets (background, non-blocking) */
async function mirrorToGoogleSheets(payload: Record<string, unknown>, retries = 3): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (res.ok) return true;
            console.warn(`[Mirror] Attempt ${i + 1} failed: ${res.status}`);
        } catch (e: any) {
            console.warn(`[Mirror] Attempt ${i + 1} error: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    return false;
}

async function getWeatherCondition(): Promise<string> {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY || 'd90d116d89814419220bd3000d9eb498';
        const lat = '-8.6478';
        const lon = '115.1385';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data: any = await response.json();
            if (data?.weather?.length > 0) return data.weather[0].main;
        }
    } catch (e: any) {
        console.warn('[Weather] Fetch failed:', e.message);
    }
    return '';
}

/**
 * POST /api/redeem
 * Primary action: write to Supabase. Mirror to Google Sheets as background task.
 */
app.post('/', async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const action: string = body.action || (body.status === 'Redeemed' ? 'redeem' : '');
    if (!action) {
        return c.json({ error: 'Missing action in request body' }, 400);
    }

    console.log('[POST /api/redeem] Action:', action, '| Payload:', JSON.stringify(body).substring(0, 200));

    const redeemedAt = body.redeemedAt || new Date().toISOString();

    if (action === 'redeem') {
        body.weather = await getWeatherCondition().catch(() => '');
        body.redeemedAt = redeemedAt;

        const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || '';
        body.ipAddress = ip;
        body.deviceId = body.deviceId || c.req.header('x-device-id') || 'unknown';
        body.userAgent = body.userAgent || c.req.header('user-agent') || '';

        if (body.billAmount && !isNaN(body.billAmount)) {
            const amount = parseFloat(body.billAmount);
            body.tax = Math.round(amount * 0.11);
            body.serviceCharge = Math.round(amount * 0.10);
            body.total = amount + body.tax + body.serviceCharge;
        }
    }

    // 1. Write to Supabase (primary)
    if (action === 'redeem') {
        const { error: dbError } = await supabaseAdmin
            .from("redemptions")
            .insert([{
                voucher_code: body.voucher_code || body.voucherCode || body.code,
                guest_name: body.guestName || body.userName || body.name,
                service_type: body.serviceType || body.redeemed_service || body.services,
                pax: body.pax || 1,
                metadata: body.metadata || {}
            }]);

        if (dbError) {
            console.error("Redemption DB Error:", dbError);
            return c.json({ error: "Failed to save redemption to database" }, 500);
        }
    }

    // 2. Mirror to Google Sheets (background, fire-and-forget)
    mirrorToGoogleSheets(body).catch((err) => {
        console.error('[Background Task] Mirroring Failed for:', body.voucherCode, err);
    });

    // 3. Email notification
    if (action === 'redeem' && process.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const voucherCode = (body.voucherCode || body.code || '').toUpperCase();
            const serviceType = body.serviceType || body.services || '';
            const guestName = body.guestName || body.userName || body.name || 'Unknown';
            const inputPath = body.inputPath || '/';

            await resend.emails.send({
                from: 'No.1 Wellness <notifications@resend.dev>',
                to: ['wellnessbrotherjay@gmail.com'],
                subject: `Voucher Redeemed: ${guestName} (${voucherCode})`,
                html: `
                    <div style="font-family: sans-serif; color: #2c2420; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                        <h2 style="border-bottom: 2px solid #c5a572; padding-bottom: 10px;">New Voucher Redemption</h2>
                        <p><strong>Guest Name:</strong> ${guestName}</p>
                        <p><strong>Voucher Code:</strong> ${voucherCode}</p>
                        <p><strong>Service:</strong> <span style="color: #c5a572; font-weight: bold;">${serviceType || 'General Use'}</span></p>
                        <p><strong>Path:</strong> <code>${inputPath}</code></p>
                        <div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 12px; color: #666;">
                            <p style="margin: 0; font-weight: bold; color: #c5a572; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Security & Audit Info</p>
                            <p style="margin: 2px 0;"><strong>IP:</strong> ${body.ipAddress || 'Unknown'}</p>
                            <p style="margin: 2px 0;"><strong>Device ID:</strong> <code style="font-size: 11px;">${body.deviceId || 'Unknown'}</code></p>
                            <p style="margin: 2px 0;"><strong>Weather:</strong> ${body.weather || 'N/A'}</p>
                        </div>
                    </div>
                `,
            });
        } catch (emailError: any) {
            console.error('[Redeem] Email notification failed:', emailError.message);
        }
    }

    return c.json({ status: 'success', message: 'Action completed successfully' });
});

export default app;
