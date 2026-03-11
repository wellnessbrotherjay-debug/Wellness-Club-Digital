import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

/**
 * GET /api/data?sheet=vouchers|redemptions|insights
 * Queries Supabase directly (replaces the old Google Sheets proxy).
 */
app.get('/', async (c) => {
    const sheet = c.req.query('sheet');

    if (!sheet) {
        return c.json({ error: 'sheet query param is required (vouchers | redemptions | insights)' }, 400);
    }

    // Map sheet names to Supabase tables
    const tableMap: Record<string, string> = {
        vouchers: 'vouchers',
        Vouchers: 'vouchers',
        redemptions: 'redemptions',
        Redemptions: 'redemptions',
        insights: 'insights',
        Insights: 'insights',
        'Non-Issuance Logs': 'non_issuance_logs',
        'NonIssuanceLogs': 'non_issuance_logs',
    };

    const table = tableMap[sheet];
    if (!table) {
        return c.json({ error: `Unknown sheet "${sheet}". Valid options: vouchers, redemptions, insights` }, 400);
    }

    try {
        const orderCol = table === 'redemptions' ? 'timestamp' : 'created_at';
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .order(orderCol, { ascending: false });

        if (error) {
            // Some tables might not have the timestamp column, fallback to no order
            if (error.message.includes('does not exist')) {
                const retry = await supabaseAdmin.from(table).select('*');
                if (retry.error) throw retry.error;
                return c.json(retry.data ?? []);
            }
            throw error;
        }

        console.log(`[GET /api/data] ${table}: ${data?.length ?? 0} rows`);
        return c.json(data ?? []);
    } catch (err: any) {
        console.error(`[GET /api/data] Error fetching ${table}:`, err.message);
        return c.json({ error: `Failed to fetch ${sheet}`, details: err.message }, 502);
    }
});

export default app;
