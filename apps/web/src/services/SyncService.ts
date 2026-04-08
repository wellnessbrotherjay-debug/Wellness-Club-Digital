import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { API_BASE_URL } from "../utils/api";

export interface LocalVoucher {
  id?: string;
  voucher_code: string;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  status: string;
  services: string[];
  image_url: string;
  pax: number;
  email: string;
  whatsapp: string;
  is_test: boolean;
  qr_source_location: string;
  marketing_consent: boolean;
  created_at: string;
  sync_status: "pending" | "synced" | "failed";
  metadata?: Record<string, unknown>;
  redeemed_at?: string;
  weather?: string;
}

interface WellnessDB extends DBSchema {
  vouchers: {
    key: string;
    value: LocalVoucher;
    indexes: { "by-sync-status": string };
  };
}

class SyncService {
  private dbPromise: Promise<IDBPDatabase<WellnessDB>>;

  constructor() {
    this.dbPromise = openDB<WellnessDB>("wellness_vouchers_db", 1, {
      upgrade(db) {
        const store = db.createObjectStore("vouchers", { keyPath: "voucher_code" });
        store.createIndex("by-sync-status", "sync_status");
      },
    });

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[SyncService] Online event detected. Triggering sync...");
        this.syncPendingVouchers();
      });
    }
  }

  public async saveVoucherLocally(
    voucher: Omit<LocalVoucher, "sync_status">,
  ): Promise<void> {
    const db = await this.dbPromise;

    // Backward compatibility: some existing browsers still have an older
    // IndexedDB schema keyed by `id` instead of `voucher_code`.
    const resolvedVoucherCode = String(voucher.voucher_code || voucher.id || "").trim();
    if (!resolvedVoucherCode) {
      throw new Error("Invalid voucher payload: missing voucher_code");
    }

    const localVoucher: LocalVoucher = {
      ...voucher,
      id: voucher.id || resolvedVoucherCode,
      voucher_code: resolvedVoucherCode,
      sync_status: "pending",
    };
    await db.put("vouchers", localVoucher);

    // Trigger sync attempt immediately (if online, it will go through)
    if (typeof navigator !== "undefined" && navigator.onLine) {
      this.syncPendingVouchers().catch((err) => console.error(err));
    }
  }

  public async getPendingVouchers(): Promise<LocalVoucher[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex("vouchers", "by-sync-status", "pending");
  }

  public async syncPendingVouchers(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const pending = await this.getPendingVouchers();
    if (pending.length === 0) return;

    console.log(
      `[SyncService] Attempting to sync ${pending.length} vouchers...`,
    );

    try {
      // Transformation step: Map data and ensure strings are not null/undefined
      const mappedVouchers = pending.map(v => ({
        ...v,
        email: v.email || "",
        whatsapp: v.whatsapp || "",
        image_url: v.image_url || "",
      }));

      const response = await fetch(`${API_BASE_URL}/api/vouchers/bulk-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vouchers: mappedVouchers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to bulk sync");
      }

      const db = await this.dbPromise;
      const tx = db.transaction("vouchers", "readwrite");
      for (const v of pending) {
        v.sync_status = "synced";
        tx.store.put(v);
      }
      await tx.done;

      // Dispatch custom event to update UI
      window.dispatchEvent(new Event("vouchersSynced"));
      console.log("[SyncService] Sync successful");
    } catch (error) {
      console.error("[SyncService] Sync failed:", error);
      throw error; // Rethrow to allow manual trigger to catch
    }
  }

  /**
   * Manual trigger for synchronization
   */
  public async syncNow(): Promise<boolean> {
    try {
      await this.syncPendingVouchers();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const syncService = new SyncService();
