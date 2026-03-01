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
        }
        
        const { data, error } = await query;
        if (error) {
            console.error('[Supabase GET] Error:', error);
            
            // Extract diagnostic info from client if possible
            const clientUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "fallback";
            // Get just the first and last 5 characters of the key used to verify if it's the right one
            const envKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "none";
            const keyPrefix = envKey.substring(0, 15);
            
            return res.status(502).json({
                status: 'error',
                message: 'Failed to fetch from Supabase.',
                details: error.message,
                diagnosticUrl: clientUrl,
                diagnosticKeyPrefix: keyPrefix
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
