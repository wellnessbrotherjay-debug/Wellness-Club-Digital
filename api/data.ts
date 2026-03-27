import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const sheet = (req.query.sheet as string) || '';
  const id = req.query.id as string | undefined;

  if (!sheet) {
    return res.status(400).json({ error: 'sheet query param is required (vouchers | redemptions | insights)' });
  }

  const tableMap: Record<string, string> = {
    vouchers: 'vouchers',
    Vouchers: 'vouchers',
    redemptions: 'redemptions',
    Redemptions: 'redemptions',
    insights: 'insights',
    Insights: 'insights',
  };

  const table = tableMap[sheet];
  if (!table) {
    return res.status(400).json({ error: `Unknown sheet "${sheet}". Valid: vouchers, redemptions, insights` });
  }

  try {
    const orderCol = table === 'redemptions' ? 'timestamp' : 'created_at';
    let query = supabase.from(table).select('*');

    // Try ordering, fallback if column doesn't exist
    const { data, error } = await query.order(orderCol, { ascending: false });

    if (error) {
      if (error.message.includes('does not exist')) {
        const retry = await supabase.from(table).select('*');
        if (retry.error) throw retry.error;
        return res.status(200).json(retry.data ?? []);
      }
      throw error;
    }

    return res.status(200).json(data ?? []);
  } catch (err: any) {
    console.error(`[api/data] Error fetching ${table}:`, err.message);
    return res.status(502).json({ error: `Failed to fetch ${sheet}`, details: err.message });
  }
}
