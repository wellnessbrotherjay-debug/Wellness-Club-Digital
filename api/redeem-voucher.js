import { Resend } from 'resend';

const AUDIT_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/audit-log`
    : 'https://wellness-club-digital.vercel.app/api/audit-log';

/**
 * Fire-and-forget POST to the audit log. Never throws.
 */
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

/**
 * Fetches the current weather condition using OpenWeather API.
 */
async function getWeatherCondition() {
    try {
        const apiKey = 'd90d116d89814419220bd3000d9eb498';
        const lat = '-8.697276';
        const lon = '115.171634';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.weather && data.weather.length > 0) {
                return data.weather[0].main; // e.g., 'Rain', 'Clouds', 'Clear'
            }
        } else {
            console.warn(`Weather API returned ${response.status}: ` + await response.text());
        }
    } catch (e) {
        console.error("Weather fetch error: " + e.message);
    }
    return '';
}

export default async function handler(req, res) {
    // Enable CORS for all origins (or restrict to your domain) to allow mobile browser access
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

    const SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwOsXYyakNm75T_RXAl-ZNepfEd9fmH3MrWGEdVUlAY_kTzYmAesqcZ_fXYj5XThhuR/exec';

    let scriptResponseText = '';
    let scriptData = null;

    try {
        // Fetch weather before sending to GAS if action is redeem
        if (req.body.action === 'redeem') {
            req.body.weather = await getWeatherCondition();
        }

        console.log('Redeeming voucher (Payload):', req.body);

        // Fetch weather here to bypass Apps Script authorization limits
        try {
            if (req.body.action === 'redeem') {
                const weatherRes = await fetch('https://api.openweathermap.org/data/2.5/weather?lat=-8.697276&lon=115.171634&appid=d90d116d89814419220bd3000d9eb498');
                if (weatherRes.ok) {
                    const weatherData = await weatherRes.json();
                    if (weatherData && weatherData.weather && weatherData.weather.length > 0) {
                        req.body.weather = weatherData.weather[0].main;
                        console.log('Weather attached:', req.body.weather);
                    }
                }
            }
        } catch (wErr) {
            console.warn('Failed to fetch weather from Vercel:', wErr.message);
        }

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'application/plain' },
            body: JSON.stringify(req.body)
        });

        scriptResponseText = await response.text();
        console.log('Script Raw Response:', scriptResponseText);

        try {
            scriptData = JSON.parse(scriptResponseText);
        } catch (e) {
            console.warn('Script response was not JSON, treating as success if text exists.');
            scriptData = { status: scriptResponseText ? 'success' : 'error', message: scriptResponseText };
        }

        // ── AUDIT LOG (fire-and-forget, always runs for redeem actions) ─────
        if (req.body.action === 'redeem') {
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            writeAuditEvent({
                action: scriptData?.status === 'error' ? 'REDEEM_FAILED' : 'REDEEMED',
                voucherCode: req.body.voucherCode,
                guestName: req.body.guestName,
                serviceType: req.body.serviceType || req.body.redeemed_service || '',
                roomNumber: req.body.roomNumber,
                source: 'DIGITAL_REDEMPTION',
                inputPath: req.body.inputPath || '/',
                deviceId: req.body.deviceId || req.headers['x-device-id'] || 'unknown',
                sessionId: req.body.sessionId || '',
                userAgent: req.body.userAgent || req.headers['user-agent'] || '',
                ipAddress: ip,
            });
        }

        // --- EMAIL NOTIFICATION LOGIC (Only for redemptions) ---
        if (req.body.action === 'redeem' && scriptData.status !== 'error' && process.env.RESEND_API_KEY) {
            let emailStatus = 'Sent';
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const { voucherCode, serviceType, guestName, inputPath } = req.body;

                const emailResult = await resend.emails.send({
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
                            <p><strong>Time:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Makassar' })} (WITA)</p>
                            <hr style="border: none; border-top: 1px dashed #ddd; margin: 20px 0;" />
                            <p style="text-align: center;"><a href="https://wellness-club-digital.vercel.app/admin/analytics" style="background: #2c2420; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Analytics Board</a></p>
                        </div>
                    `
                });

                if (emailResult.error) {
                    console.error('Resend API Error:', emailResult.error);
                    emailStatus = 'Failed: ' + emailResult.error.message;
                } else {
                    console.log('Notification email sent successfully:', voucherCode);
                }
            } catch (emailError) {
                console.error('Critical Error sending notification:', emailError);
                emailStatus = 'Error: ' + emailError.message;
            }

            // Update email status in the background if it's not 'Sent'
            // In a real prod env, we'd update the sheet again with the failure if needed
            req.body.emailStatus = emailStatus;
        }

        return res.status(200).json(scriptData);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to redeem voucher', details: error.message });
    }
}
