import { Resend } from 'resend';
import { supabase } from './supabase.js';

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
        const lat = '-8.697276';
        const lon = '115.171634';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;

        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.weather && data.weather.length > 0) {
                return data.weather[0].main;
            }
        }
    } catch (e) {
        console.error("Weather fetch error: " + e.message);
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
        console.log('Action received:', req.body.action, 'Payload:', req.body);
        let supabaseError = null;

        // 1. Primary Logic: Supabase
        if (req.body.action === 'create' || req.body.action === 'manual') {
            const { error } = await supabase.from('vouchers').upsert({
                voucher_code: req.body.voucherCode?.toUpperCase(),
                guest_name: req.body.guestName || req.body.userName,
                status: req.body.status || 'Created',
                room_number: req.body.roomNumber,
                check_in: req.body.checkIn,
                check_out: req.body.checkOut,
                service_type: req.body.serviceType,
                email: req.body.email,
                whatsapp: req.body.whatsapp || req.body.phone,
                pax: req.body.pax || 1,
                created_at: req.body.created_at || new Date().toISOString()
            }, { onConflict: 'voucher_code' });
            supabaseError = error;
        }
        else if (req.body.action === 'redeem') {
            // Fetch voucher from Supabase to validate dates
            const { data: voucherData, error: fetchError } = await supabase
                .from('vouchers')
                .select('check_in, check_out, status')
                .eq('voucher_code', req.body.voucherCode?.toUpperCase())
                .single();

            if (fetchError || !voucherData) {
                return res.status(400).json({ status: 'error', message: 'Voucher not found in Supabase' });
            }

            if (voucherData.status === 'Redeemed') {
                return res.status(400).json({ status: 'error', message: 'Voucher already redeemed' });
            }

            // Date validation
            if (voucherData.check_in && voucherData.check_out) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const checkInDate = new Date(voucherData.check_in);
                checkInDate.setHours(0, 0, 0, 0);

                const checkOutDate = new Date(voucherData.check_out);
                checkOutDate.setHours(0, 0, 0, 0);

                if (today < checkInDate) {
                    return res.status(400).json({ status: "error", message: "REJECTED: Voucher not yet valid. (Valid from " + voucherData.check_in + ")" });
                }
                if (today > checkOutDate) {
                    return res.status(400).json({ status: "error", message: "REJECTED: Voucher EXPIRED. (Valid until " + voucherData.check_out + ")" });
                }
            }

            req.body.weather = await getWeatherCondition();
            const redeemedAt = req.body.redeemedAt || new Date().toISOString();

            // Update Voucher
            const { error: updateError } = await supabase.from('vouchers')
                .update({
                    status: 'Redeemed',
                    redeemed_at: redeemedAt,
                    redeemed_service: req.body.serviceType,
                    email: req.body.email,
                    whatsapp: req.body.whatsapp || req.body.phone
                })
                .eq('voucher_code', req.body.voucherCode?.toUpperCase());

            // Insert Redemption Log
            if (!updateError) {
                const { error: insertError } = await supabase.from('redemptions').insert({
                    timestamp: redeemedAt,
                    voucher_code: req.body.voucherCode?.toUpperCase(),
                    guest_name: req.body.guestName || req.body.userName,
                    service_type: req.body.serviceType,
                    room_number: req.body.roomNumber,
                    email: req.body.email,
                    whatsapp: req.body.whatsapp || req.body.phone,
                    weather: req.body.weather
                });
                supabaseError = insertError;
            } else {
                supabaseError = updateError;
            }
        }
        else if (req.body.action === 'deleteVoucher') {
            const { error } = await supabase.from('vouchers')
                .delete()
                .eq('voucher_code', req.body.voucherCode?.toUpperCase());
            supabaseError = error;
        }
        else if (req.body.action === 'deleteTests') {
            // Soft-match deletion using ilike
            const { error } = await supabase.from('vouchers')
                .delete()
                .or('voucher_code.ilike.%test%,guest_name.ilike.%test%,email.ilike.%sbodyfit%,email.ilike.%wellnessbrotherjay%');
            supabaseError = error;
        }

        if (supabaseError) {
            console.error('Supabase Error:', supabaseError);
            return res.status(500).json({ status: 'error', message: 'Database operation failed', details: supabaseError.message });
        }

        // 3. Audit Log
        if (req.body.action === 'redeem') {
            const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
            writeAuditEvent({
                action: 'REDEEMED',
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

        // 4. Email Notification
        if (req.body.action === 'redeem' && process.env.RESEND_API_KEY) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const { voucherCode, serviceType, guestName, inputPath } = req.body;
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
