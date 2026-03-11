import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

/**
 * GET  /api/audit-log — query audit history
 * POST /api/audit-log — write one audit event
 */

app.get('/', async (c) => {
    const voucher = c.req.query('voucher');
    const action = c.req.query('action');
    const limit = parseInt(c.req.query('limit') || '200');
    const skip = parseInt(c.req.query('skip') || '0');

    try {
        let query = supabaseAdmin
            .from('audit_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(skip, skip + limit - 1);

        if (voucher) query = query.eq('voucher_code', voucher.toUpperCase());
        if (action) query = query.eq('action', action.toUpperCase());

        const { data, error } = await query;
        if (error) throw error;

        return c.json({ events: data ?? [] });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/', async (c) => {
    const body = await c.req.json();
    const {
        action,
        voucherCode,
        guestName,
        serviceType,
        roomNumber,
        source,
        inputPath,
        deviceId,
        sessionId,
        userAgent: bodyUA,
        ipAddress: bodyIp,
        billAmount,
        tax,
        serviceCharge,
        total,
    } = body;

    if (!action || !voucherCode) {
        return c.json({ error: 'action and voucherCode are required' }, 400);
    }

    const ip = bodyIp || c.req.header('x-forwarded-for')?.split(',')[0].trim() || '';
    const userAgent = bodyUA || c.req.header('user-agent') || '';
    const timestamp = new Date().toISOString();
    const timestampBali = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Makassar',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const event = {
        action: action.toUpperCase(),
        voucher_code: (voucherCode || '').toUpperCase(),
        guest_name: guestName || '',
        service_type: serviceType || '',
        room_number: roomNumber || '',
        source: source || 'UNKNOWN',
        input_path: inputPath || '',
        device_id: deviceId || c.req.header('x-device-id') || 'unknown',
        session_id: sessionId || c.req.header('x-session-id') || '',
        user_agent: userAgent,
        ip_address: ip,
        timestamp,
        timestamp_bali: timestampBali,
        bill_amount: billAmount || null,
        tax: tax || null,
        service_charge: serviceCharge || null,
        total: total || null,
    };

    try {
        const { error } = await supabaseAdmin.from('audit_log').insert(event);
        if (error) throw error;

        // Track per-voucher redemption count
        if (['REDEEMED', 'DUPLICATE_ATTEMPT'].includes(event.action)) {
            const { data: stat, error: upsertError } = await supabaseAdmin
                .from('voucher_stats')
                .upsert(
                    {
                        voucher_code: event.voucher_code,
                        last_redeemed_at: timestamp,
                        last_device_id: event.device_id,
                        last_ip: ip,
                    },
                    { onConflict: 'voucher_code', ignoreDuplicates: false }
                )
                .select()
                .single();

            // If it's a genuine REDEEMED event and redemption_count > 1, flag as duplicate
            const { data: statRow } = await supabaseAdmin
                .from('voucher_stats')
                .select('redemption_count')
                .eq('voucher_code', event.voucher_code)
                .single();

            if (statRow && statRow.redemption_count > 1 && event.action === 'REDEEMED') {
                await supabaseAdmin.from('audit_log').insert({
                    ...event,
                    action: 'DUPLICATE_ATTEMPT',
                    note: `Voucher ${event.voucher_code} has been redeemed ${statRow.redemption_count} times`,
                });
                return c.json({ ok: true, warning: 'DUPLICATE', redemptionCount: statRow.redemption_count });
            }
        }

        return c.json({ ok: true });
    } catch (err: any) {
        console.error('[AuditLog] Write failed:', err.message);
        return c.json({ ok: false, error: err.message });
    }
});

export default app;
