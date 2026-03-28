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
        const id = c.req.query('id');
        const orderCol = table === 'redemptions' ? 'timestamp' : 'created_at';
        
        let query = supabaseAdmin
            .from(table)
            .select('*');

        if (id) {
            // Support filtering by voucher_code (vouchers table) or voucher_code (redemptions table)
            query = query.eq('voucher_code', id.trim().toUpperCase());
        } else {
            query = query.order(orderCol, { ascending: false });
        }

        const { data, error } = await query;

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

/**
 * GET /api/data/summary
 * High-performance aggregation for the "Insights" tab.
 */
app.get('/summary', async (c) => {
    try {
        const { data: vouchers, error: vError } = await supabaseAdmin.from('vouchers').select('qr_source_location, marketing_consent, status');
        const { count: redeemedCount, error: rError } = await supabaseAdmin.from('redemptions').select('*', { count: 'exact', head: true });

        if (vError || rError) throw vError || rError;

        const totalIssued = vouchers?.length || 0;
        const totalRedeemed = redeemedCount || 0;
        
        // Venue Leaderboard
        const locations: Record<string, number> = {};
        vouchers?.forEach(v => {
            const loc = v.qr_source_location || 'unknown';
            locations[loc] = (locations[loc] || 0) + 1;
        });
        const leaderboard = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Marketing Consent
        const consentCount = vouchers?.filter(v => v.marketing_consent).length || 0;
        const consentRate = totalIssued > 0 ? Math.round((consentCount / totalIssued) * 100) : 0;

        return c.json({
            totalIssued,
            totalRedeemed,
            conversionRate: totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0,
            leaderboard,
            marketing: {
                count: consentCount,
                rate: consentRate
            }
        });
    } catch (err: any) {
        console.error('[GET /api/data/summary] Error:', err.message);
        return c.json({ error: 'Failed to fetch summary' }, 500);
    }
});

export default app;
