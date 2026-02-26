import { supabase } from './supabase.js';

export default async function handler(req, res) {
    const { sheet } = req.query;
    const SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';

    if (!sheet) {
        return res.status(400).json({ error: 'Sheet name is required' });
    }

    try {
        console.log(`[Proxy GET] Fetching ${sheet} from Supabase...`);

        // Map sheet names to table names
        let tableName = 'vouchers';
        if (sheet.toLowerCase() === 'redemptions') {
            tableName = 'redemptions';
        }

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            // Optionally, order by created_at or timestamp descending to get newest first
            .order(tableName === 'redemptions' ? 'timestamp' : 'created_at', { ascending: false });

        if (error) {
            console.error('[Supabase GET] Error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch data from Supabase.',
                details: error.message
            });
        }

        // Return empty array if no data
        if (!data || !Array.isArray(data)) {
            return res.status(200).json([]);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(`[Proxy GET Error] ${sheet}:`, error);
        return res.status(502).json({
            status: 'error',
            message: `Failed to fetch ${sheet}. Check deployment permissions.`,
            details: error.message
        });
    }
}
