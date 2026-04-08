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
        const { data: vouchers, error: vError } = await supabaseAdmin
            .from('vouchers')
            .select('qr_source_location, marketing_consent, status, guest_name, voucher_code, is_test, pax, created_at');
        const { data: redemptions, error: rError } = await supabaseAdmin
            .from('redemptions')
            .select('voucher_code, guest_name, service_type, timestamp');

        if (vError || rError) throw vError || rError;

        const EXCLUDE_NAMES = ['test', 'samual', 'jay', 'diag', 'agent', 'fix'];
        const isTest = (name: string, code: string) => {
            const n = String(name || '').toLowerCase();
            const c = String(code || '').toLowerCase();
            if (c.startsWith('test-')) return true;
            return EXCLUDE_NAMES.some(tn => {
                if (tn === 'jay' || tn === 'samual') {
                    const regex = new RegExp(`\\b${tn}\\b`, 'i');
                    return regex.test(n);
                }
                return n.includes(tn);
            });
        };

        const getCategory = (service: string) => {
            const s = String(service || '').toLowerCase().trim();
            if (s.includes('t store') || s.includes('shopping')) return 'fashion';
            if (s.includes('salon') || s.includes('hair') || s.includes('mani') || s.includes('pedi') || s.includes('facial')) return 'hair';
            return 'wellness';
        };

        const smartPax = (pax: number | null, name: string) => {
            const p = Number(pax);
            if (pax && !isNaN(p) && p > 1) return p;
            const n = String(name || '').toLowerCase().trim();
            if (!n) return (pax && !isNaN(p) && p > 0) ? p : 1;
            const segments = n.split(/&| and | \+ | \/ /).filter(s => s.trim().length > 0);
            if (segments.length > 1) return segments.length;
            return (pax && !isNaN(p) && p > 0) ? p : 1;
        };

        // 1. Filter Real Vouchers
        const realVouchers = (vouchers || []).filter(v => {
            if (!v.guest_name || v.guest_name === 'Unknown Guest' || v.guest_name.trim() === '') return false;
            if (v.is_test || isTest(v.guest_name, v.voucher_code)) return false;
            return true;
        });

        const total_pax_pool = realVouchers.reduce((sum, v) => sum + smartPax(v.pax, v.guest_name), 0);

        // 2. Filter & Deduplicate Redemptions (5-min window per category)
        const voucherMap = new Map(vouchers?.map(v => [v.voucher_code?.toUpperCase(), v]));
        const seenBuckets = new Set<string>();
        
        const realRedemptions = (redemptions || []).filter(r => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            const n = r.guest_name || (v ? v.guest_name : '');
            if (isTest(n, r.voucher_code) || n === 'Unknown Guest' || n.trim() === '') return false;
            if (v && v.is_test) return false;

            const time = new Date(r.timestamp).getTime();
            const bucket = Math.floor(time / (60000 * 5));
            const cat = getCategory(r.service_type);
            const key = `${r.voucher_code?.toUpperCase()}|${cat}|${bucket}`;

            if (seenBuckets.has(key)) return false;
            seenBuckets.add(key);
            return true;
        });

        // 3. Aggregate Stats
        const total_issued = realVouchers.length;
        const total_redeemed = realRedemptions.length;
        
        // Count total pax redeemed by matching redemptions back to voucher's pax
        const total_pax_redeemed = realRedemptions.reduce((sum, r) => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            return sum + (v ? smartPax(v.pax, v.guest_name) : 1);
        }, 0);

        // Performance by category
        const performance = { fashion: 0, hair: 0, wellness: 0 };
        const issued_by_category = { fashion: 0, hair: 0, wellness: 0 };

        realRedemptions.forEach(r => {
            const cat = getCategory(r.service_type) as keyof typeof performance;
            performance[cat]++;
        });

        realVouchers.forEach(v => {
            // Usually, we determine category from whatever the voucher was intended for, 
            // but for simplicity, we treat the pool as global or try to infer.
            // Since our system currently issues "Universal" vouchers, let's just use redemptions for cat breakdown.
        });

        // Use a set of voucher codes to count unique redemptions for the conversion rate
        const uniqueRedeemedVouchers = new Set(realRedemptions.map(r => r.voucher_code?.toUpperCase()));
        const conversion_rate = total_issued > 0 ? Math.round((uniqueRedeemedVouchers.size / total_issued) * 100) : 0;
        const pax_redemption_rate = total_pax_pool > 0 ? Math.round((total_pax_redeemed / total_pax_pool) * 100) : 0;

        // Daily Breakdown
        const daily_issued: Record<string, number> = {};
        const daily_redeemed: Record<string, number> = {};
        
        realVouchers.forEach(v => {
            const day = new Date(v.created_at).toISOString().split('T')[0];
            daily_issued[day] = (daily_issued[day] || 0) + 1;
        });
        
        realRedemptions.forEach(r => {
            const day = new Date(r.timestamp).toISOString().split('T')[0];
            daily_redeemed[day] = (daily_redeemed[day] || 0) + 1;
        });

        const daily_stats = Array.from(new Set([...Object.keys(daily_issued), ...Object.keys(daily_redeemed)]))
            .sort()
            .map(date => ({
                date,
                issued: daily_issued[date] || 0,
                redeemed: daily_redeemed[date] || 0
            }));

        // 4. Issuance Leaderboard
        const locations: Record<string, number> = {};
        realVouchers.forEach(v => {
            const loc = v.qr_source_location || 'reception';
            locations[loc] = (locations[loc] || 0) + 1;
        });

        const leaderboard = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // 5. Redemption Leaderboard (Source of redeemed vouchers)
        const redLocations: Record<string, number> = {};
        realRedemptions.forEach(r => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            const loc = v?.qr_source_location || 'reception';
            redLocations[loc] = (redLocations[loc] || 0) + 1;
        });
        const redemption_leaderboard = Object.entries(redLocations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // 6. Audit Stats
        const audit_stats = {
            total_raw: (vouchers || []).length,
            total_real: realVouchers.length,
            unknown_count: (vouchers || []).filter(v => !v.guest_name || v.guest_name === 'Unknown Guest' || v.guest_name.trim() === '').length,
            test_count: (vouchers || []).filter(v => v.is_test || isTest(v.guest_name || '', v.voucher_code || '')).length
        };

        // Marketing
        const consent_count = realVouchers.filter(v => v.marketing_consent).length;

        return c.json({
            total_issued,
            total_redeemed,
            total_pax_pool,
            total_pax_redeemed,
            conversion_rate,
            pax_redemption_rate,
            performance,
            unique_guests: new Set(realRedemptions.map(r => r.guest_name)).size,
            marketing: {
                count: consent_count,
                rate: total_issued > 0 ? Math.round((consent_count / total_issued) * 100) : 0
            },
            leaderboard,
            redemption_leaderboard,
            daily_stats,
            audit_stats
        });
    } catch (err: any) {
        console.error('[GET /api/data/summary] Error:', err.message);
        return c.json({ error: 'Failed to fetch summary' }, 500);
    }
});

export default app;
