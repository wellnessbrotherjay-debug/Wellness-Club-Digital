import { Hono } from 'hono';
import { supabaseAdmin } from '../../db.js';

const app = new Hono();

app.get('/', async (c) => {
    const authHeader = c.req.header('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
        console.warn('[sheets-export] APPS_SCRIPT_URL not set — skipping');
        return c.json({ success: true, skipped: true });
    }

    const [{ data: vouchers }, { data: redemptions }] = await Promise.all([
        supabaseAdmin.from('vouchers').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('redemptions').select('*').order('timestamp', { ascending: false }),
    ]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        await fetch(appsScriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'bulk_export', vouchers, redemptions }),
            signal: controller.signal,
        });
    } catch (e: any) {
        console.warn('[sheets-export] Export failed (non-critical):', e.message);
    } finally {
        clearTimeout(timeout);
    }

    return c.json({
        success: true,
        vouchersExported: vouchers?.length ?? 0,
        redemptionsExported: redemptions?.length ?? 0,
    });
});

export default app;
