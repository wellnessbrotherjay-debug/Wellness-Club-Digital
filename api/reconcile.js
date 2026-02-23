import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    try {
        // 1. Fetch POS transactions for the date
        const { data: transactions, error: txError } = await supabase
            .from('pos_transactions')
            .select('*, stays(voucher_id)')
            .eq('transaction_date', date);

        if (txError) throw txError;

        // 2. Fetch occupancy for the date
        const { data: occupancy, error: occError } = await supabase
            .from('daily_occupancy')
            .select('occupied_rooms')
            .eq('date', date)
            .single();

        // 3. Calculate Metrics
        const metrics = calculateMetrics(transactions, occupancy?.occupied_rooms || 0);

        return res.status(200).json(metrics);

    } catch (error) {
        console.error('[Reconcile Error]:', error);
        return res.status(500).json({ error: error.message });
    }
}

function calculateMetrics(transactions, occupiedRooms) {
    let total_pos_revenue = 0;
    let total_voucher_related_revenue = 0;
    let voucher_linked_stays = new Set();

    transactions.forEach(tx => {
        const amount = parseFloat(tx.gross_amount);
        total_pos_revenue += amount;

        // Check if it's voucher related (source = 'TSS' or has stay_id with voucher_id)
        if (tx.source === 'TSS' || (tx.stay_id && tx.stays?.voucher_id)) {
            total_voucher_related_revenue += amount;
            if (tx.stay_id && tx.stays?.voucher_id) {
                voucher_linked_stays.add(tx.stays.voucher_id);
            }
        }
    });

    const total_non_voucher_revenue = total_pos_revenue - total_voucher_related_revenue;
    const total_discount_exposure = total_voucher_related_revenue * 0.15;
    const net_revenue_after_discount = total_pos_revenue - total_discount_exposure;
    const voucher_activation_count = voucher_linked_stays.size;
    const percentage_revenue_from_voucher_channel = total_pos_revenue > 0
        ? (total_voucher_related_revenue / total_pos_revenue) * 100
        : 0;
    const revenue_per_occupied_room = occupiedRooms > 0
        ? total_pos_revenue / occupiedRooms
        : 0;

    return {
        total_pos_revenue,
        total_voucher_related_revenue,
        total_non_voucher_revenue,
        voucher_activation_count,
        total_discount_exposure,
        net_revenue_after_discount,
        revenue_per_occupied_room,
        percentage_revenue_from_voucher_channel,
        occupied_rooms: occupiedRooms
    };
}
