import { Hono } from 'hono';

const app = new Hono();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';

/**
 * POST /api/send-whatsapp
 */
app.post('/', async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!WHATSAPP_API_URL) {
        console.warn('[send-whatsapp] WHATSAPP_API_URL not set, skipping.');
        return c.json({ status: 'skipped', message: 'WhatsApp API not configured' });
    }

    try {
        const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${WHATSAPP_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`WhatsApp API responded with ${response.status}`);
        }

        const result = await response.json();
        return c.json({ status: 'success', result });
    } catch (err: any) {
        console.error('[send-whatsapp] Error:', err.message);
        return c.json({ status: 'error', error: err.message }, 502);
    }
});

export default app;
