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
            .order(tableName === 'redemptions' ? 'timestamp' : 'created_at', { ascending: false });

        // Fallback to Google Sheets if Supabase is empty, fails, or returns error
        if (error || !data || data.length === 0) {
            if (error) console.error('[Supabase GET] Error:', error);
            console.warn(`[Supabase GET] ${error ? 'Error' : 'No data'}. Falling back to Google Sheets...`);
            try {
                const fallbackResponse = await fetch(`${SCRIPT_URL}?sheet=${sheet}`);
                const fallbackData = await fallbackResponse.json();
                return res.status(200).json(fallbackData);
            } catch (fallbackError) {
                console.error('[Fallback] Google Sheets also failed:', fallbackError);
                // If even fallback fails, return the original Supabase error or empty data
                return res.status(error ? 500 : 200).json(data || []);
            }
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
