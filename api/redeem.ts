import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bwndbccgzjdgtcyornwn.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bmRiY2NnempkZ3RjeW9ybnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzk2MDYsImV4cCI6MjA3NTk1NTYwNn0.KBhWWrstu0_NTOJ38sQQNTqhhIno5iEQC-kFXd34ao4';

const getSupabaseKey = () => {
  const candidate = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!candidate) {
    return SUPABASE_ANON_KEY;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(candidate.split('.')[1] || '', 'base64').toString('utf8'),
    ) as { ref?: string };

    return payload.ref === 'bwndbccgzjdgtcyornwn'
      ? candidate
      : SUPABASE_ANON_KEY;
  } catch {
    return SUPABASE_ANON_KEY;
  }
};

const supabase = createClient(SUPABASE_URL, getSupabaseKey());

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body: any = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { voucher_code, service_type, guest_name, staff_id, notes } = body;

    if (!voucher_code || !service_type) {
      return res.status(400).json({
        error: 'Missing required fields: voucher_code, service_type',
      });
    }

    // Log redemption
    const { data, error } = await supabase
      .from('redemptions')
      .insert([
        {
          voucher_code: voucher_code.trim().toUpperCase(),
          service_type: service_type.trim(),
          guest_name: guest_name || null,
          staff_id: staff_id || null,
          timestamp: new Date().toISOString(),
          notes: notes || null,
        },
      ])
      .select();

    if (error) {
      console.error('[redeem] Supabase insert error:', error);
      return res.status(400).json({
        error: 'Failed to log redemption',
        details: error.message,
      });
    }

    // Update voucher status
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ status: 'Redeemed' })
      .eq('voucher_code', voucher_code.trim().toUpperCase());

    if (updateError) {
      console.error('[redeem] Supabase update error:', updateError);
    }

    console.log(`[redeem] Voucher ${voucher_code} redeemed for ${service_type}`);

    return res.status(200).json({
      status: 'success',
      message: 'Voucher redeemed successfully',
      redemption: data?.[0] || {},
    });
  } catch (err: any) {
    console.error('[redeem] Error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err?.message,
    });
  }
}
