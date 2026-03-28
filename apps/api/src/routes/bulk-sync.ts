import { Hono } from 'hono';
import { z } from 'zod';
import { supabaseAdmin } from '../db.js';

const app = new Hono();

const APPS_SCRIPT_URL =
    process.env.APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbycyXz99TO6iGntmyuRw55yxpD9Clu6k69CWf3-dHip6cV80TxGoHodpI-NvXkZY0Ld/exec';

// --- Validation Schemas ---
const VoucherSchema = z.object({
  voucher_code: z.string().min(4), // Changed from id to voucher_code
  guestName: z.string().optional().default('Walk-in Guest'),
  roomNumber: z.string().optional().default('N/A'),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  pax: z.number().int().min(1).default(1),
  email: z.string().email().optional().nullable().or(z.literal('')),
  whatsapp: z.string().optional().nullable().or(z.literal('')),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')), // Allowing empty string
  isTest: z.boolean().optional().default(false),
  qr_source_location: z.string().optional().nullable(),
  marketing_consent: z.boolean().optional().default(false),
  created_at: z.string().optional().default(() => new Date().toISOString()),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const BulkSyncSchema = z.object({
  vouchers: z.array(VoucherSchema),
});

/** Non-blocking mirror to Google Sheets (Compatible with Cloudflare & Node) */
async function mirrorToGoogleSheets(payload: Record<string, unknown>, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
              console.log(`[Mirror] Success for ${payload.description || 'vouchers'}`);
              return;
            }
            console.warn(`[Mirror] Attempt ${i + 1} failed: ${res.status}`);
        } catch (e: any) {
            console.warn(`[Mirror] Attempt ${i + 1} error: ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, 2000 * (i + 1))); // Exponential backoff simulation
    }
}

app.post('/', async (c) => {
    try {
        let rawBody: any;
        try {
            rawBody = await c.req.json();
        } catch {
            return c.json({ error: 'Invalid JSON body' }, 400);
        }

        // 1. Zod Validation (Production Stress Test Requirement)
        const result = BulkSyncSchema.safeParse(rawBody);
        if (!result.success) {
            console.error('[Bulk Sync] Validation failed:', result.error.format());
            return c.json({ 
              error: 'Validation failed', 
              details: result.error.issues.map(e => `${e.path?.join('.') || 'root'}: ${e.message}`)
            }, 400);
        }

        const { vouchers } = result.data;
        if (vouchers.length === 0) {
            return c.json({ status: 'success', synced: 0 });
        }

        console.log(`[POST /api/vouchers/bulk-sync] Syncing ${vouchers.length} validated vouchers`);

        const inserts = vouchers.map((v) => {
            const servicesStr = v.services.join(', ');
            return {
                voucher_code: v.voucher_code, // Updated to use v.voucher_code from schema
                guest_name: v.guestName,
                room_number: v.roomNumber,
                check_in: v.checkIn ? new Date(v.checkIn) : null,
                check_out: v.checkOut ? new Date(v.checkOut) : null,
                services: servicesStr,
                pax: v.pax,
                email: v.email,
                whatsapp: v.whatsapp,
                image_url: v.imageUrl,
                is_test: v.isTest,
                qr_source_location: v.qr_source_location,
                marketing_consent: v.marketing_consent,
                created_at: v.created_at ? new Date(v.created_at) : new Date(),
                sync_status: 'synced',
                metadata: v.metadata,
            };
        });

        // 2. Primary Write to Supabase (Blocking)
        const { error: dbError } = await supabaseAdmin.from('vouchers').upsert(inserts, { onConflict: 'voucher_code' });
        if (dbError) {
            console.error('[Bulk Sync] Supabase upsert failed:', dbError.message);
            return c.json({ error: 'Database synchronization failed', message: dbError.message }, 500);
        }

        // 3. Mirroring to Google Sheets (Non-Blocking / waitUntil)
        vouchers.forEach(v => {
            const gsPayload = {
                action: 'create',
                date: v.voucher_code,
                description: v.guestName,
                category: 'Synced',
                roomNumber: v.roomNumber,
                type: v.checkIn,
                checkout: v.checkOut,
                imageurl: v.imageUrl,
                services: v.services.join(', '),
                created_at: v.created_at,
                pax: v.pax,
                email: v.email,
                whatsapp: v.whatsapp,
                is_test: v.isTest ? 'TRUE' : 'FALSE',
                qr_source_location: v.qr_source_location,
                marketing_consent: v.marketing_consent,
            };

            const backgroundTask = mirrorToGoogleSheets(gsPayload);
            if (c.executionCtx && c.executionCtx.waitUntil) {
                c.executionCtx.waitUntil(backgroundTask);
            } else {
                backgroundTask.catch(err => console.error('[Background Task] Failed:', err));
            }
        });

        return c.json({ 
            status: 'success', 
            synced: vouchers.length,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        console.error('[Bulk Sync] UNEXPECTED FATAL ERROR:', err);
        return c.json({ error: 'Internal Server Error', message: err.message }, 500);
    }
});

export default app;
