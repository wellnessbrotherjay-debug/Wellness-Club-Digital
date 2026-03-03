import { supabase } from './supabase.js';

export default async function handler(req, res) {
    const { sheet } = req.query;

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

        const query = supabase.from(tableName).select('*');
        if (tableName === 'redemptions') {
            query.order('timestamp', { ascending: false });
        } else {
            query.order('created_at', { ascending: false });
        }

        // Primary source: Supabase
        const { data, error } = await query;

        // Smart fallback to Google Sheets
        // We fall back if:
        // 1. Supabase returns an error
        // 2. Data is empty (and it's not redemptions, where empty might be valid)
        // 3. User explicitly asks for sync (future-proofing)
        const shouldFallback = error || !data || data.length === 0;

        if (shouldFallback) {
            if (error) console.error(`[GET] Supabase Error (${tableName}):`, error);
            console.warn(`[GET] Falling back to Google Sheets for ${sheet}...`);

            try {
                const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx3PFjH_lGbHRYqFoYjrx_67-sD71XgwaxMJreNWTJuIGTcjCgja95Ny7TsZ2RJCVfC/exec';
                const fallbackResponse = await fetch(`${APPS_SCRIPT_URL}?sheet=${sheet}`);

                if (!fallbackResponse.ok) throw new Error(`Sheets API responded with ${fallbackResponse.status}`);

                const fallbackData = await fallbackResponse.json();
                console.log(`[GET] Success from Sheets: ${fallbackData.length || 0} items.`);
                return res.status(200).json(fallbackData);
            } catch (fallbackError) {
                console.error('[GET] Fallback also failed:', fallbackError.message);
                return res.status(502).json({
                    status: 'error',
                    message: 'All data sources failed',
                    error: fallbackError.message,
                    supabaseError: error?.message
                });
            }
        }

        console.log(`[GET] Success from Supabase (${tableName}): ${data.length} items.`);
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
