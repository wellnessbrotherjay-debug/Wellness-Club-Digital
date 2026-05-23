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
  private isInitializing: boolean = false;
  private initRetries: number = 0;
  private maxRetries: number = 3;
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
    if (this.isInitializing) {
      return new Promise((resolve) => {
        const checkInit = setInterval(() => {
          if (!this.isInitializing) {
            clearInterval(checkInit);
            resolve(this.dbPromise);
          }
        }, 100);
      });
    }

    this.isInitializing = true;
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
      this.initRetries = 0;

      // Listen for connection close and reinitialize
      db.addEventListener("close", () => {
        console.log("[SyncService] Database connection closed, will reinitialize on next use");
        this.dbInstance = null;
        this.dbPromise = this.initializeDatabase();
      });

      return db;
    } catch (error) {
      console.error("[SyncService] Database initialization failed:", error);
      if (this.initRetries < this.maxRetries) {
        this.initRetries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * this.initRetries));
        return this.initializeDatabase();
      }
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async getDb(): Promise<IDBPDatabase<WellnessDB>> {
    // Check if current instance is still valid, reinitialize if closed
    if (!this.dbInstance) {
      this.dbPromise = this.initializeDatabase();
    }
    return this.dbPromise;
  }

  public async saveVoucherLocally(
    voucher: Omit<LocalVoucher, "sync_status">,
  ): Promise<void> {
    try {
      const db = await this.getDb();

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

      // Ensure put operation completes before syncing
      await db.put("vouchers", localVoucher);

      // Trigger sync attempt immediately (if online, it will go through)
      if (typeof navigator !== "undefined" && navigator.onLine) {
        this.syncPendingVouchers().catch((err) => console.error("[SyncService] Background sync failed:", err));
      }
    } catch (error) {
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
