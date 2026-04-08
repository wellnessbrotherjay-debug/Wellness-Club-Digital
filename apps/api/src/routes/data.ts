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
        const { data: vouchers, error: vError } = await supabaseAdmin.from('vouchers').select('qr_source_location, marketing_consent, status, guest_name, voucher_code, is_test, room_number, email');
        const { data: redemptions, error: rError } = await supabaseAdmin.from('redemptions').select('voucher_code, guest_name, service_type');

        if (vError || rError) throw vError || rError;

        const EXCLUDE_NAMES = ['test', 'samual', 'sammy', 'jay', 'diag', 'agent', 'fix'];
        const EXCLUDE_EMAILS = ['wellnessbrother', 'idcproddance', 'xqtech', 'sbodyfit'];
        
        const isTestVoucher = (name: string, code: string, email: string) => {
            const n = String(name || '').toLowerCase();
            const c = String(code || '').toLowerCase();
            const e = String(email || '').toLowerCase();
            
            // Check for explicit "test-" prefix in code
            if (c.startsWith('test-')) return true;
            
            // Check for test emails
            if (EXCLUDE_EMAILS.some(domain => e.includes(domain))) return true;
            
            // Whole-word Name Check
            return EXCLUDE_NAMES.some(tn => {
                const regex = new RegExp(`\\b${tn}\\b`, 'i');
                return regex.test(n);
            });
        };

        // Filter Real Vouchers: Only exclude explicit tests. Include blanks.
        const realVouchers = (vouchers || []).filter(v => {
            if (v.is_test || isTestVoucher(v.guest_name, v.voucher_code, v.email)) return false;
            return true;
        });

        // Filter Real Redemptions & Deduplicate
        const voucherMap = new Map(vouchers?.map(v => [v.voucher_code?.toUpperCase(), v]));
        const seenVouchers = new Set<string>(); // For unique GUESTS
        const seenUniqueRedemptions = new Set<string>(); // For unique SERVICE-GUEST pairs (matching Performance)
        
        let guestRedeemedCount = 0;
        let totalServiceRedemptions = 0;

        (redemptions || []).forEach(r => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            const n = r.guest_name || (v ? v.guest_name : '');
            const email = v ? v.email : '';
            if (isTestVoucher(n, r.voucher_code, email) || v?.is_test) return;
            
            // 1. Guest-based deduplication (for unique people)
            if (!seenVouchers.has(r.voucher_code)) {
                seenVouchers.add(r.voucher_code);
                guestRedeemedCount++;
            }

            // 2. Service-based deduplication (matching Performance dashboard's 85 vs 79 logic)
            // Deduplicate by voucher + service_type to allow 1 per shop
            const serviceKey = `${r.voucher_code?.toUpperCase()}|${r.service_type || 'wellness'}`;
            if (!seenUniqueRedemptions.has(serviceKey)) {
                seenUniqueRedemptions.add(serviceKey);
                totalServiceRedemptions++;
            }
        });

        const totalIssued = realVouchers.length;
        // Use totalServiceRedemptions to match Performance Tab
        const totalRedeemed = totalServiceRedemptions; 
        
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
            uniqueGuestsRedeemed: guestRedeemedCount,
            rawTotalCount: vouchers?.length || 0,
            conversionRate: totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0,
            leaderboard,
            marketing: {
                count: consentCount,
                rate: consentRate
            }
        });
    } catch (err: any) {
        console.error('[GET /api/data/summary] Internal Catch:', err.message || err);
        return c.json({ 
            error: 'Failed to fetch summary', 
            details: err.message || 'Unknown database error',
            hint: 'Check if Supabase columns exist'
        }, 500);
    }
});

export default app;
