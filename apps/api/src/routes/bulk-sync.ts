import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../db.js";

const app = new Hono();

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbycyXz99TO6iGntmyuRw55yxpD9Clu6k69CWf3-dHip6cV80TxGoHodpI-NvXkZY0Ld/exec";

// --- Validation Schemas ---
const VoucherSchema = z.object({
  voucher_code: z.string().min(4),
  guestName: z.string().optional(),
  guest_name: z.string().optional(),
  firstName: z.string().optional(),
  first_name: z.string().optional(),
  lastName: z.string().optional(),
  last_name: z.string().optional(),
  roomNumber: z.string().optional(),
  room_number: z.string().optional(),
  checkIn: z.string().optional(),
  check_in: z.string().optional(),
  checkOut: z.string().optional(),
  check_out: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  pax: z.coerce.number().int().min(1).default(1),
  email: z.string().email().optional().nullable().or(z.literal("")),
  whatsapp: z.string().optional().nullable().or(z.literal("")),
  image_url: z.string().url().optional().nullable().or(z.literal("")), // Allowing empty string
  isTest: z.boolean().optional(),
  is_test: z.boolean().optional(),
  qr_source_location: z.string().optional().nullable(),
  marketing_consent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  created_at: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

const BulkSyncSchema = z.object({
  vouchers: z.array(VoucherSchema),
});

/** Non-blocking mirror to Google Sheets (Compatible with Cloudflare & Node) */
async function mirrorToGoogleSheets(
  payload: Record<string, unknown>,
  retries = 3,
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log(
          `[Mirror] Success for ${payload.description || "vouchers"}`,
        );
        return;
      }
      console.warn(`[Mirror] Attempt ${i + 1} failed: ${res.status}`);
    } catch (e: any) {
      console.warn(`[Mirror] Attempt ${i + 1} error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1))); // Exponential backoff simulation
  }
}

app.post("/", async (c) => {
  try {
    let rawBody: any;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    // 1. Zod Validation (Production Stress Test Requirement)
    const result = BulkSyncSchema.safeParse(rawBody);
    if (!result.success) {
      console.error("[Bulk Sync] Validation failed:", result.error.format());
      return c.json(
        {
          error: "Validation failed",
          details: result.error.issues.map(
            (e) => `${e.path?.join(".") || "root"}: ${e.message}`,
          ),
        },
        400,
      );
    }

    const { vouchers } = result.data;
    if (vouchers.length === 0) {
      return c.json({ status: "success", synced: 0 });
    }

    console.log(
      `[POST /api/vouchers/bulk-sync] Syncing ${vouchers.length} validated vouchers`,
    );

    const inserts = vouchers.map((v) => {
      let guestName = v.guestName || v.guest_name || "Hotel Guest";
      if (!guestName || guestName.toLowerCase().includes("walk-in") || guestName.toLowerCase().includes("unknown")) {
        guestName = "Hotel Guest";
      }
      
      let firstName = v.firstName || v.first_name || "";
      let lastName = v.lastName || v.last_name || "";
      if (guestName === "Hotel Guest") {
        firstName = "Hotel";
        lastName = "Guest";
      }

      let roomNumber = v.roomNumber || v.room_number || "Hotel Room";
      if (!roomNumber || roomNumber === "N/A" || roomNumber.toLowerCase() === "n/a") {
        roomNumber = "Hotel Room";
      }

      const checkIn = v.checkIn || v.check_in || null;
      const checkOut = v.checkOut || v.check_out || null;
      const isTest = v.isTest !== undefined ? v.isTest : (v.is_test !== undefined ? v.is_test : false);
      const marketingConsent = v.marketing_consent !== undefined ? v.marketing_consent : (v.marketingConsent !== undefined ? v.marketingConsent : false);

      const metadata = { ...(v.metadata || {}) } as Record<string, any>;
      if (!metadata.guests || !Array.isArray(metadata.guests)) {
        const cleanName = guestName.replace(/\[TEST\]/gi, "").trim();
        const parts = cleanName ? cleanName.split(/\s+(?:&|and|\/)\s+|\s*,\s*/gi).map(p => p.trim()).filter(Boolean) : [];
        metadata.guests = parts.map((part, idx) => {
          const subParts = part.split(/\s+/).filter(Boolean);
          const fName = subParts[0] || "Guest";
          const lName = subParts.length > 1 ? subParts.slice(1).join(" ") : "-";
          return {
            id: `guest-${idx + 1}-${Math.random().toString(36).substr(2, 9)}`,
            first_name: fName,
            last_name: lName,
          };
        });
      }

      const firstGuest = metadata.guests[0];
      const finalFirstName = firstGuest ? firstGuest.first_name : firstName;
      const finalLastName = firstGuest ? firstGuest.last_name : lastName;

      return {
        voucher_code: v.voucher_code,
        guest_name: guestName,
        room_number: roomNumber,
        check_in: checkIn ? checkIn.split("T")[0] : null, // YYYY-MM-DD
        check_out: checkOut ? checkOut.split("T")[0] : null, // YYYY-MM-DD
        pax: Number(v.pax) || 1,
        email: v.email || null,
        whatsapp: v.whatsapp || null,
        image_url: v.image_url || null,
        is_test: isTest,
        qr_source_location: v.qr_source_location,
        marketing_consent: marketingConsent,
        service_type: v.services.join(", "), // Added service_type
        sync_status: "synced",
        traffic_source: "TS suites", // Always tag as TS suites
        metadata: {
          ...metadata,
          first_name: finalFirstName,
          last_name: finalLastName,
        },
      };
    });

    // 2. Primary Write to Supabase (Blocking)
    console.log("SENDING TO DB:", JSON.stringify(inserts, null, 2));
    const { error: dbError } = await supabaseAdmin
      .from("vouchers")
      .upsert(inserts, { onConflict: "voucher_code" });
    if (dbError) {
      console.error("SUPABASE FULL ERROR:", JSON.stringify(dbError, null, 2));
      return c.json(
        { error: "Database synchronization failed", message: dbError.message },
        500,
      );
    }

    // 3. Mirroring to Google Sheets (Non-Blocking / waitUntil)
    vouchers.forEach((v) => {
      const gsPayload = {
        action: "create",
        date: v.voucher_code,
        description: v.guestName,
        category: "Synced",
        roomNumber: v.roomNumber,
        type: v.checkIn,
        checkout: v.checkOut,
        image_url: v.image_url,
        serviceType: v.services.join(", "),
        created_at: v.created_at,
        pax: v.pax,
        email: v.email,
        whatsapp: v.whatsapp,
        is_test: v.isTest ? "TRUE" : "FALSE",
        qr_source_location: v.qr_source_location,
        marketing_consent: v.marketing_consent,
      };

      mirrorToGoogleSheets(gsPayload).catch((err) =>
        console.error("[Background Task] Mirroring Failed:", err),
      );
    });

    return c.json({
      status: "success",
      synced: vouchers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Bulk Sync] UNEXPECTED FATAL ERROR:", err);
    return c.json(
      { error: "Internal Server Error", message: err.message },
      500,
    );
  }
});

export default app;
