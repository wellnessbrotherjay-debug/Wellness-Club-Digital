import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { API_BASE_URL } from "../utils/api";

export interface LocalVoucher {
  id?: string;
  voucher_code: string;
  guest_name?: string;
  first_name?: string;
  last_name?: string;
  room_number?: string;
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
  private dbPromise: Promise<IDBPDatabase<WellnessDB>> | null = null;
  private dbInstance: IDBPDatabase<WellnessDB> | null = null;

  constructor() {
    this.dbPromise = this.initializeDatabase();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[SyncService] Online event detected. Triggering sync...");
        this.syncPendingVouchers().catch(err => console.error("[SyncService] Sync error:", err));
      });
    }
  }

  private async initializeDatabase(): Promise<IDBPDatabase<WellnessDB>> {
    try {
      const db = await openDB<WellnessDB>("wellness_vouchers_db", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("vouchers")) {
            const store = db.createObjectStore("vouchers", { keyPath: "voucher_code" });
            store.createIndex("by-sync-status", "sync_status");
          }
        },
      });

      this.dbInstance = db;

      // Listen for connection close and reset
      db.addEventListener("close", () => {
        console.log("[SyncService] Database connection closed, will reinitialize on next use");
        this.dbInstance = null;
        this.dbPromise = null;
      });

      return db;
    } catch (error) {
      console.error("[SyncService] Database initialization failed:", error);
      this.dbPromise = null; // Reset so next call will retry
      throw error;
    }
  }

  private async getDb(): Promise<IDBPDatabase<WellnessDB>> {
    if (!this.dbPromise) {
      this.dbPromise = this.initializeDatabase();
    }
    return this.dbPromise;
  }

  public async saveVoucherLocally(
    voucher: Omit<LocalVoucher, "sync_status">,
    retryCount = 0
  ): Promise<void> {
    try {
      const db = await Promise.race([
        this.getDb(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database initialization timed out")), 5000))
      ]);

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

      // Ensure put operation completes before syncing, with a 3 second timeout in case IDB hangs
      await Promise.race([
        db.put("vouchers", localVoucher),
        new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB operation timed out")), 3000))
      ]);

      // Trigger sync attempt immediately (if online, it will go through)
      if (typeof navigator !== "undefined" && navigator.onLine) {
        this.syncPendingVouchers().catch((err) => console.error("[SyncService] Background sync failed:", err));
      }
    } catch (error: any) {
      if (error?.name === "InvalidStateError" && retryCount < 2) {
        console.warn("[SyncService] Database closed. Reinitializing and retrying saveVoucherLocally...", error);
        this.dbInstance = null;
        this.dbPromise = null;
        return this.saveVoucherLocally(voucher, retryCount + 1);
      }
      console.error("[SyncService] Failed to save voucher locally:", error);
      throw error;
    }
  }

  public async getPendingVouchers(): Promise<LocalVoucher[]> {
    const db = await this.getDb();
    return db.getAllFromIndex("vouchers", "by-sync-status", "pending");
  }

  public async syncPendingVouchers(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    try {
      const pending = await this.getPendingVouchers();
      if (pending.length === 0) return;

      console.log(
        `[SyncService] Attempting to sync ${pending.length} vouchers...`,
      );

      // Transformation step: send BOTH snake_case and camelCase keys.
      // The live voucher.htf.solutions backend only reads snake_case
      // (room_number/guest_name/is_test); newer backends also accept camelCase.
      // Sending both makes the sync correct regardless of which backend is deployed,
      // so room number / guest name / test flag are never dropped to defaults.
      const mappedVouchers = pending.map(v => ({
        voucher_code: v.voucher_code,
        // snake_case (read by the live backend)
        guest_name: v.guest_name,
        first_name: v.first_name,
        last_name: v.last_name,
        room_number: v.room_number,
        check_in: v.check_in,
        check_out: v.check_out,
        is_test: v.is_test,
        // camelCase (read by the repo/newer backend)
        guestName: v.guest_name,
        firstName: v.first_name,
        lastName: v.last_name,
        roomNumber: v.room_number,
        checkIn: v.check_in,
        checkOut: v.check_out,
        isTest: v.is_test,
        // identical keys in both schemas
        pax: v.pax,
        services: v.services,
        qr_source_location: v.qr_source_location,
        marketing_consent: v.marketing_consent,
        created_at: v.created_at,
        email: v.email || "",
        whatsapp: v.whatsapp || "",
        image_url: v.image_url || "",
        metadata: {},
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

      // Update sync status in database
      try {
        const db = await this.getDb();
        const tx = db.transaction("vouchers", "readwrite");
        for (const v of pending) {
          v.sync_status = "synced";
          tx.store.put(v);
        }
        await tx.done;
      } catch (dbError) {
        console.warn("[SyncService] Failed to update local sync status (DB may be closing), but cloud sync succeeded:", dbError);
        // Trigger reinitialization on next use
        this.dbInstance = null;
        // Don't throw - the API sync succeeded even if local update failed
      }

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
