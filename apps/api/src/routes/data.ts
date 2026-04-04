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
        const { data: vouchers, error: vError } = await supabaseAdmin.from('vouchers').select('qr_source_location, marketing_consent, status, guest_name, voucher_code, is_test');
        const { data: redemptions, error: rError } = await supabaseAdmin.from('redemptions').select('voucher_code, guest_name, service_type');

        if (vError || rError) throw vError || rError;

        const EXCLUDE_NAMES = ['test', 'samual', 'jay', 'diag', 'agent', 'fix'];
        const isTest = (name: string, code: string) => {
            const n = String(name || '').toLowerCase();
            const c = String(code || '').toLowerCase();
            return c.startsWith('test-') || EXCLUDE_NAMES.some(tn => n.includes(tn));
        };

        // Filter Real Vouchers
        const realVouchers = (vouchers || []).filter(v => {
            if (!v.guest_name || v.guest_name === 'Unknown Guest') return false;
            if (v.is_test || isTest(v.guest_name, v.voucher_code)) return false;
            return true;
        });

        // Filter Real Redemptions & Deduplicate
        const voucherMap = new Map(vouchers?.map(v => [v.voucher_code?.toUpperCase(), v]));
        const seenVouchers = new Set<string>();
        const realRedemptions = (redemptions || []).filter(r => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            const n = r.guest_name || (v ? v.guest_name : '');
            if (isTest(n, r.voucher_code) || n === 'Unknown Guest') return false;
            if (v && v.is_test) return false;
            
            // Deduplicate: only count each voucher once for the top-level metric
            if (seenVouchers.has(r.voucher_code)) return false;
            seenVouchers.add(r.voucher_code);
            return true;
        });

        const totalIssued = realVouchers.length;
        const totalRedeemed = realRedemptions.length;
        
        // Venue Leaderboard (based on REAL issued vouchers)
        const locations: Record<string, number> = {};
        realVouchers.forEach(v => {
            const loc = v.qr_source_location || 'unknown';
            locations[loc] = (locations[loc] || 0) + 1;
        });
        const leaderboard = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Marketing Consent
        const consentCount = realVouchers.filter(v => v.marketing_consent).length;
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
