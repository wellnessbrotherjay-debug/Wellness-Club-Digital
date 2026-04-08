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
        const range = c.req.query('range') || 'all';
        
        // Initial queries
        let vQuery = supabaseAdmin
            .from('vouchers')
            .select('qr_source_location, marketing_consent, status, guest_name, voucher_code, is_test, pax, created_at, check_out, room_number, email');
        
        let rQuery = supabaseAdmin
            .from('redemptions')
            .select('voucher_code, guest_name, service_type, timestamp');

        if (range !== 'all' && range !== 'launch') {
            const days = range === 'week' ? 7 : 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const cutoffIso = cutoff.toISOString();

            vQuery = vQuery.gte('created_at', cutoffIso);
            rQuery = rQuery.gte('timestamp', cutoffIso);
        }

        const { data: vouchers, error: vError } = await vQuery;
        const { data: redemptions, error: rError } = await rQuery;

        if (vError || rError) throw vError || rError;

        const EXCLUDE_NAMES = ['test', 'samual', 'sammy', 'jay', 'diag', 'agent', 'fix'];
        const EXCLUDE_EMAILS = ['wellnessbrother', 'idcproddance', 'xqtech', 'sbodyfit'];
        
        const isTestVoucher = (name: string, code: string, email: string) => {
            const n = String(name || '').toLowerCase();
            const c = String(code || '').toLowerCase();
            const e = String(email || '').toLowerCase();
            
            if (c.startsWith('test-')) return true;
            if (EXCLUDE_EMAILS.some(domain => e.includes(domain))) return true;
            
            return EXCLUDE_NAMES.some(tn => {
                const regex = new RegExp(`\\b${tn}\\b`, 'i');
                return regex.test(n);
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
            if (!n || n === 'unknown guest') return (pax && !isNaN(p) && p > 0) ? p : 1;

            const plusMatch = n.match(/\+\s*(\d+)/) || n.match(/and\s*(\d+)\s*others/);
            if (plusMatch) {
                return 1 + parseInt(plusMatch[1], 10);
            }

            const segments = n.split(/&| and | \+ | \/ /).filter(s => s.trim().length > 0);
            if (segments.length > 1) return segments.length;

            return (pax && !isNaN(p) && p > 0) ? p : 1;
        };

        // 1. Filter Real Vouchers (Exclude Tests)
        const realVouchers = (vouchers || []).filter(v => {
            if (v.is_test || isTestVoucher(v.guest_name, v.voucher_code, v.email)) return false;
            return true;
        });

        // 2. Filter Real Redemptions & Deduplicate
        const voucherMap = new Map(vouchers?.map(v => [v.voucher_code?.toUpperCase(), v]));
        const seenVouchers = new Set<string>(); 
        const seenUniqueRedemptions = new Set<string>(); 
        
        const realRedemptions = (redemptions || []).filter(r => {
            const v = voucherMap.get(r.voucher_code?.toUpperCase());
            const n = r.guest_name || (v ? v.guest_name : '');
            const email = v ? v.email : '';
            if (isTestVoucher(n, r.voucher_code, email) || v?.is_test) return false;
            return true;
        });

        const uniqueRedeemedVoucherCodes = new Set(realRedemptions.map(r => r.voucher_code?.toUpperCase()));
        
        let guestRedeemedCount = 0;
        let totalServiceRedemptions = 0;

        realRedemptions.forEach(r => {
            if (!seenVouchers.has(r.voucher_code)) {
                seenVouchers.add(r.voucher_code);
                guestRedeemedCount++;
            }

            const serviceKey = `${r.voucher_code?.toUpperCase()}|${r.service_type || 'wellness'}`;
            if (!seenUniqueRedemptions.has(serviceKey)) {
                seenUniqueRedemptions.add(serviceKey);
                totalServiceRedemptions++;
            }
        });

        const totalIssued = realVouchers.length;
        const totalRedeemed = totalServiceRedemptions; 
        const total_pax_pool = realVouchers.reduce((sum, v) => sum + smartPax(v.pax, v.guest_name), 0);
        const total_pax_redeemed = Array.from(uniqueRedeemedVoucherCodes).reduce((sum, code) => {
            const v = voucherMap.get(code);
            return sum + (v ? smartPax(v.pax, v.guest_name) : 1);
        }, 0);

        // Leaderboards
        const locations: Record<string, number> = {};
        realVouchers.forEach(v => {
            const loc = v.qr_source_location || 'unknown';
            locations[loc] = (locations[loc] || 0) + 1;
        });
        const leaderboard = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

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

        // Daily Breakdown
        const daily_issued: Record<string, number> = {};
        const daily_redeemed: Record<string, number> = {};
        
        realVouchers.forEach(v => {
            const day = new Date(v.created_at).toISOString().split('T')[0];
            daily_issued[day] = (daily_issued[day] || 0) + 1;
        });
        
        const seenDailyRedemptions = new Set<string>();
        realRedemptions.forEach(r => {
            const day = new Date(r.timestamp).toISOString().split('T')[0];
            const dailyKey = `${day}|${r.voucher_code?.toUpperCase()}`;
            if (!seenDailyRedemptions.has(dailyKey)) {
                daily_redeemed[day] = (daily_redeemed[day] || 0) + 1;
                seenDailyRedemptions.add(dailyKey);
            }
        });

        const daily_stats = Array.from(new Set([...Object.keys(daily_issued), ...Object.keys(daily_redeemed)]))
            .sort()
            .map(date => ({
                date,
                issued: daily_issued[date] || 0,
                redeemed: daily_redeemed[date] || 0
            }));

        const venueNameMap: Record<string, string> = {
            wellness: 'No.1 Wellness',
            hair: 'TS Hair Salon',
            fashion: 'T Store'
        };

        const performance = { fashion: 0, hair: 0, wellness: 0 };
        realRedemptions.forEach(r => {
            const cat = getCategory(r.service_type) as keyof typeof performance;
            performance[cat]++;
        });

        const topVenueEntry = Object.entries(performance).sort((a,b) => b[1] - a[1])[0];
        const top_venue_id = topVenueEntry ? topVenueEntry[0] : 'wellness';
        const top_venue = venueNameMap[top_venue_id] || top_venue_id;

        // Marketing
        const consentCount = realVouchers.filter(v => v.marketing_consent).length;
        const consentRate = totalIssued > 0 ? Math.round((consentCount / totalIssued) * 100) : 0;

        return c.json({
            totalIssued,
            totalRedeemed,
            uniqueGuestsRedeemed: guestRedeemedCount,
            rawTotalCount: vouchers?.length || 0,
            conversionRate: totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0,
            leaderboard,
            redemption_leaderboard,
            daily_stats,
            unique_conversion_rate: totalIssued > 0 ? Math.round((uniqueRedeemedVoucherCodes.size / totalIssued) * 100) : 0,
            top_venue,
            venue_details: realRedemptions.map(r => {
                const v = voucherMap.get(r.voucher_code?.toUpperCase());
                return {
                    voucher_code: r.voucher_code,
                    guest_name: r.guest_name || v?.guest_name || 'Guest',
                    venue: venueNameMap[getCategory(r.service_type)] || r.service_type,
                    category: getCategory(r.service_type),
                    timestamp: r.timestamp
                };
            }),
            pax_details: Array.from(new Set(realVouchers.map(v => smartPax(v.pax, v.guest_name))))
                .sort((a,b) => a-b)
                .map(p => {
                    const group = realVouchers.filter(v => smartPax(v.pax, v.guest_name) === p);
                    return {
                        pax: p,
                        type: p === 1 ? 'Single Guest' : p === 2 ? 'Couple/Duo' : 'Group (3+)',
                        count: group.length,
                        total_pax: group.length * p
                    };
                }),
            audit_stats: {
                database_total: (vouchers || []).length,
                live_vouchers: realVouchers.length,
                unknown_guest_count: (vouchers || []).filter(v => !v.guest_name || v.guest_name === 'Unknown Guest' || v.guest_name.trim() === '').length,
                test_voucher_count: (vouchers || []).filter(v => v.is_test || isTestVoucher(v.guest_name, v.voucher_code, v.email)).length
            },
            marketing: {
                count: consentCount,
                rate: consentRate
            },
            issuance_logs: realVouchers.slice(0, 100).map(v => ({
                voucher_code: v.voucher_code,
                guest_name: v.guest_name,
                room_number: v.room_number,
                created_at: v.created_at,
                pax: smartPax(v.pax, v.guest_name),
                status: uniqueRedeemedVoucherCodes.has(v.voucher_code?.toUpperCase()) ? 'Redeemed' : (isVoucherExpired(v.check_out) ? 'Expired' : 'Active')
            })),
            redemption_logs: realRedemptions.slice(0, 100).map(r => ({
                voucher_code: r.voucher_code,
                guest_name: r.guest_name,
                venue: r.service_type,
                timestamp: r.timestamp,
                pax: (voucherMap.get(r.voucher_code?.toUpperCase())) ? smartPax(voucherMap.get(r.voucher_code?.toUpperCase())!.pax, voucherMap.get(r.voucher_code?.toUpperCase())!.guest_name) : 1
            }))
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

// Helper for expiration check
function isVoucherExpired(checkOut: string | null) {
    if (!checkOut) return false;
    const checkoutDate = new Date(checkOut);
    checkoutDate.setHours(23, 59, 59, 999);
    return new Date() > checkoutDate;
}

export default app;
