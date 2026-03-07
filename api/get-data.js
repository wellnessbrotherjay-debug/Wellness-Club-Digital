import { supabase } from './supabase.js';

export default async function handler(req, res) {
    const { sheet } = req.query;

    if (!sheet) {
        return res.status(400).json({ error: 'Sheet name is required' });
    }

    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        console.log(`[Proxy GET] Fetching ${sheet} DIRECTLY from Google Sheets...`);

        const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyLCafm3ltwnO1pNhEocaWYABSjV4Yxvn1yfXkOKohBv_JTxYu2buWRq51vjhPBX1JL/exec';
        const response = await fetch(`${APPS_SCRIPT_URL}?sheet=${sheet}`);

        if (!response.ok) throw new Error(`Sheets API responded with ${response.status}`);

        const data = await response.json();
        console.log(`[GET] Success from Sheets: ${data.length || 0} items.`);
        return res.status(200).json(data);

    } catch (error) {
        console.error(`[Proxy GET Error] ${sheet}:`, error);
        return res.status(502).json({
            status: 'error',
            message: `Failed to fetch ${sheet} from Google Sheets.`,
            details: error.message
        });
    }
}
