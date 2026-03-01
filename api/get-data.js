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

        const { data, error } = await query;

        // Fallback to Google Sheets if Supabase is empty, fails, or returns error
        if (error || !data || data.length === 0) {
            if (error) console.error('[Supabase GET] Error:', error);
            console.warn(`[Supabase GET] ${error ? 'Error' : 'No data'}. Falling back to Google Sheets...`);

            try {
                // Constants like SCRIPT_URL should be defined or available in scope. 
                // Assuming it's defined elsewhere or we keep it as is if it was working.
                const fallbackResponse = await fetch(`${process.env.SCRIPT_URL}?sheet=${sheet}`);
                const fallbackData = await fallbackResponse.json();
                return res.status(200).json(fallbackData);
            } catch (fallbackError) {
                console.error('[Fallback] Google Sheets also failed:', fallbackError);

                if (error) {
                    const clientUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "fallback";
                    const envKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "none";
                    const keyPrefix = envKey.substring(0, 15);

                    return res.status(502).json({
                        status: 'error',
                        message: 'Failed to fetch from Supabase and Fallback.',
                        details: error.message,
                        diagnosticUrl: clientUrl,
                        diagnosticKeyPrefix: keyPrefix
                    });
                }
                return res.status(200).json(data || []);
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
