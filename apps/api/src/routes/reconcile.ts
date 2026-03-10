import { Hono } from 'hono';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

/**
 * GET /api/reconcile?date=YYYY-MM-DD
 */
app.get('/', async (c) => {
    const date = c.req.query('date');
    if (!date) {
        return c.json({ error: 'date query param is required (YYYY-MM-DD)' }, 400);
    }

    try {
        const { data: transactions, error: txError } = await supabaseAdmin
            .from('pos_transactions')
            .select('*, stays(voucher_id)')
            .eq('transaction_date', date);

        if (txError) throw txError;

        const { data: occupancy } = await supabaseAdmin
            .from('daily_occupancy')
            .select('occupied_rooms')
            .eq('date', date)
            .single();

        const metrics = calculateMetrics(transactions ?? [], occupancy?.occupied_rooms ?? 0);
        return c.json(metrics);
    } catch (err: any) {
        console.error('[reconcile] Error:', err.message);
        return c.json({ error: err.message }, 500);
    }
});

function calculateMetrics(transactions: any[], occupiedRooms: number) {
    let total_pos_revenue = 0;
    let total_voucher_related_revenue = 0;
    const voucher_linked_stays = new Set<string>();

    for (const tx of transactions) {
        const amount = parseFloat(tx.gross_amount);
        total_pos_revenue += amount;

        if (tx.source === 'TSS' || (tx.stay_id && tx.stays?.voucher_id)) {
            total_voucher_related_revenue += amount;
            if (tx.stay_id && tx.stays?.voucher_id) {
                voucher_linked_stays.add(tx.stays.voucher_id);
            }
        }
    }

    const total_non_voucher_revenue = total_pos_revenue - total_voucher_related_revenue;
    const total_discount_exposure = total_voucher_related_revenue * 0.15;
    const net_revenue_after_discount = total_pos_revenue - total_discount_exposure;
    const voucher_activation_count = voucher_linked_stays.size;
    const percentage_revenue_from_voucher_channel =
        total_pos_revenue > 0 ? (total_voucher_related_revenue / total_pos_revenue) * 100 : 0;
    const revenue_per_occupied_room = occupiedRooms > 0 ? total_pos_revenue / occupiedRooms : 0;

    return {
        total_pos_revenue,
        total_voucher_related_revenue,
        total_non_voucher_revenue,
        voucher_activation_count,
        total_discount_exposure,
        net_revenue_after_discount,
        revenue_per_occupied_room,
        percentage_revenue_from_voucher_channel,
        occupied_rooms: occupiedRooms,
    };
}

export default app;
