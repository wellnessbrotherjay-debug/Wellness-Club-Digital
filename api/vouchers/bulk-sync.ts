import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SUPABASE_URL = 'https://iwkhqmonkmvyeemlihlz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2hxbW9ua212eWVlbWxpaGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTAzMjYsImV4cCI6MjA3Nzg2NjMyNn0.M4EbBns51gkgjcfgvVuAzMb9JNOvZdsZ2ePySULGm2I';

const getSupabaseKey = () => {
  const candidate = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!candidate) {
    return SUPABASE_ANON_KEY;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(candidate.split('.')[1] || '', 'base64').toString('utf8'),
    ) as { ref?: string };

    return payload.ref === 'iwkhqmonkmvyeemlihlz'
      ? candidate
      : SUPABASE_ANON_KEY;
  } catch {
    return SUPABASE_ANON_KEY;
  }
};

const supabase = createClient(SUPABASE_URL, getSupabaseKey());

const VoucherSchema = z.object({
  voucher_code: z.string().min(4),
  guest_name: z.string().optional().default('Walk-in Guest'),
  room_number: z.string().optional().default('N/A'),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  pax: z.coerce.number().int().min(1).default(1),
  email: z.string().trim().email('Email is required and must be valid'),
  whatsapp: z.string().optional().nullable().or(z.literal('')),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  is_test: z.boolean().optional().default(false),
  qr_source_location: z.string().optional().nullable(),
  marketing_consent: z.boolean().optional().default(false),
  created_at: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const BulkSyncSchema = z.object({
  vouchers: z.array(VoucherSchema),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
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
    let rawBody: any;
    try {
      rawBody = req.body || {};
      if (typeof rawBody === 'string') {
        rawBody = JSON.parse(rawBody);
      }
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Validate input
    const result = BulkSyncSchema.safeParse(rawBody);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map(
          (e) => `${e.path?.join('.') || 'root'}: ${e.message}`
        ),
      });
    }

    const { vouchers } = result.data;
    if (vouchers.length === 0) {
      return res.status(200).json({ status: 'success', synced: 0 });
    }
    // Prepare insert data
    const inserts = vouchers.map((v) => {
      let resolvedGuestName = v.guest_name || 'Hotel Guest';
      if (!resolvedGuestName || resolvedGuestName.toLowerCase().includes('walk-in') || resolvedGuestName.toLowerCase().includes('unknown')) {
        resolvedGuestName = 'Hotel Guest';
      }

      let resolvedRoomNumber = v.room_number || 'Hotel Room';
      if (!resolvedRoomNumber || resolvedRoomNumber === 'N/A' || resolvedRoomNumber.toLowerCase() === 'n/a') {
        resolvedRoomNumber = 'Hotel Room';
      }

      const nameParts = resolvedGuestName.split(' ');
      const firstName = nameParts[0] || 'Hotel';
      const lastName = nameParts.slice(1).join(' ') || 'Guest';

      return {
        voucher_code: v.voucher_code,
        guest_name: resolvedGuestName,
        room_number: resolvedRoomNumber,
        check_in: v.check_in ? v.check_in.split('T')[0] : null,
        check_out: v.check_out ? v.check_out.split('T')[0] : null,
        pax: v.pax,
        email: v.email,
        whatsapp: v.whatsapp || null,
        image_url: v.image_url || null,
        is_test: v.is_test,
        qr_source_location: v.qr_source_location || null,
        marketing_consent: v.marketing_consent,
        service_type: Array.isArray(v.services) ? v.services.join(', ') : String(v.services || ''),
        status: 'Created',
        sync_status: 'synced',
        metadata: {
          ...(v.metadata || {}),
          first_name: firstName,
          last_name: lastName,
        },
        created_at: v.created_at || new Date().toISOString(),
      };
    });    // Upsert to Supabase
    const { data, error } = await supabase
      .from('vouchers')
      .upsert(inserts, { onConflict: 'voucher_code' })
      .select();

    if (error) {
      console.error('[bulk-sync] Supabase error:', error);
      return res.status(400).json({
        error: 'Database error',
        details: error.message,
      });
    }

    console.log(`[bulk-sync] Successfully synced ${data?.length || 0} vouchers`);

    return res.status(200).json({
      status: 'success',
      synced: data?.length || 0,
      vouchers: data || [],
    });
  } catch (err: any) {
    console.error('[bulk-sync] Error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err?.message,
    });
  }
}
