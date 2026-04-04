import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();



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

    const { roomNumber, duration, reason, customReason, timestamp } = body;
    const finalReason = reason === 'Custom' && customReason ? customReason : reason;

    const { error } = await supabaseAdmin.from('insights').insert([{
        room_number: roomNumber,
        duration: duration || null,
        reason: finalReason,
        timestamp: timestamp || new Date().toISOString(),
    }]);

    if (error) {
        console.error('[log-insight] Supabase insert error:', error.message);
        return c.json({ error: 'Failed to log insight', details: error.message }, 500);
    }


    return c.json({ status: 'success', message: 'Insight logged successfully' });
});

export default app;
