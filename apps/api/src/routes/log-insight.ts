import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

const APPS_SCRIPT_URL =
    process.env.APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbyLCafm3ltwnO1pNhEocaWYABSjV4Yxvn1yfXkOKohBv_JTxYu2buWRq51vjhPBX1JL/exec';

async function mirrorToGoogleSheets(payload: Record<string, unknown>): Promise<boolean> {
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.ok;
    } catch (e: any) {
        console.warn('[Mirror] log-insight failed:', e.message);
        return false;
    }
}

/**
 * POST /api/log-insight
 */
app.post('/', async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { room_number, duration, reason, custom_reason, timestamp } = body;
    const finalReason = reason === 'Custom' && custom_reason ? custom_reason : reason;

    const { error } = await supabaseAdmin.from('insights').insert([{
        room_number: room_number,
        duration: duration || null,
        reason: finalReason,
        timestamp: timestamp || new Date().toISOString(),
    }]);

    if (error) {
        console.error('[log-insight] Supabase insert error:', error.message);
        return c.json({ error: 'Failed to log insight', details: error.message }, 500);
    }

    // Mirror to Google Sheets in background
    mirrorToGoogleSheets({
        action: 'log_insight',
        room_number,
        duration,
        reason: finalReason,
        timestamp: timestamp || new Date().toISOString(),
    });

    return c.json({ status: 'success', message: 'Insight logged successfully' });
});

export default app;
