# 📘 Voucher System Documentation & HMS Roadmap

## 1\. System Overview (Current State)

The current system is a lightweight **Vite + Hono** application designed for generating and redeeming guest vouchers. It uses **Supabase** as the primary database and a **Google Spreadsheet** (via Apps Script) as a manual operational log for Guest Relations Officers (GRO).

### 🛰️ Architectural Flow (Current)

The diagram below illustrates the current "Split Truth" architecture where the frontend controls the generation logic.

Code snippet

```
sequenceDiagram
    participant G as Guest/GRO (Vite)
    participant H as Hono Backend
    participant S as Supabase DB
    participant GS as Google Sheets (Code.gs)

    G->>G: Generate ID (NW-XXXXXX) in Browser
    G->>H: POST /api/redeem-voucher {action: 'create'}
    H->>GS: Trigger Mirroring (Non-blocking .then)
    GS-->>H: OK (Row added to Sheet)
    H-->>G: Return 200 OK
    Note over S: Logic Gap: Supabase Write is skipped during 'create'
    Note over G: ID saved to LocalStorage only

```

---

## 2\. Problem Analysis: The "Ghost Voucher" Leak

Based on data audits, approximately **25% of vouchers** (76 records) exist in the GRO Spreadsheet but are missing from the Supabase database.

### 🔴 The Root Causes

1.  **Client-Side "Brain":** The `voucherId` is generated in the browser. If the network drops or the tab closes after generation but before the API call finishes, the record is lost to the server but kept by the GRO.

2.  **Missing Atomicity:** The backend `action: 'create'` logic triggers the Google Sheet script but does not perform a Supabase `INSERT`.

3.  **The "Success" Illusion:** The system returns a success message to the GRO even if the database write never happened, leading to vouchers that work "offline" but don't exist in the system of record.

---

## 3\. The Urgent Fix: Atomic Server-Side Truth

To resolve the data discrepancy immediately, we must move the logic "Brain" from the client to the server.

### 🟢 Refactored Logic Flow

Code snippet

```
graph TD
    A[GRO Clicks Generate] --> B[Vite: Sends Guest Info to Backend]
    B --> C[Hono: Generates NW-XXXXXX ID]
    C --> D{Supabase Write}
    D -- Success --> E[Hono: Trigger Async Sync to Google Sheets]
    D -- Fail --> F[Return Error to UI]
    E --> G[Return Voucher ID to UI]
    G --> H[Vite: Update Dashboard]

```

### 🛠️ Technical Implementation

- **Server-Side Generation:** Move the ID generation logic into a Hono POST route.

- **Guaranteed DB Entry:** The API will not return a voucher code to the user unless the Supabase write is confirmed.

- **Non-Blocking Mirroring:** Use `c.executionCtx.waitUntil()` to update Google Sheets in the background so the GRO doesn't experience lag.

---

## 4\. HMS Upgrade: The Marketing & CRM Pillar

This upgrade transforms the system from a simple tool into a robust **Marketing Engine** that serves as the foundation for a full Hotel Management System.

### 🚀 Key Features

1.  **Local-First Sync Engine:** Uses IndexedDB to allow GROs to work during Wi-Fi outages. Data is pushed to the cloud automatically when the connection returns.

2.  **Marketing Attribution:** Tracks `qr_source_location` (e.g., "Pool Bar", "Gym", "Reception") to measure which hotel areas drive the most revenue.

3.  **Audit Dashboard:** A professional filterable UI (Shadcn/UI + TanStack Table) that replaces the spreadsheet entirely.

4.  **Tertiary Local Backup:** A Daily Cron job at 00:00 that exports all data to a local JSON file on the server for emergency recovery.

### 📊 Future HMS Architecture

Code snippet

```
graph LR
    subgraph "Frontend (PWA)"
    A[Sync Engine] --> B[IndexedDB]
    A --> C[Admin Dashboard]
    end

    subgraph "Backend (Hono/HMS)"
    D[API Gateway] --> E[Voucher Module]
    E --> F[CRM / Guest Profiles]
    end

    subgraph "Storage Layer"
    G[(Supabase Cloud)]
    H[(Daily Local Disk Backup)]
    end

    B <--> D
    E <--> G
    E --> H

```

### 📋 Marketing Data Schema Extensions

| **Field**            | **Type** | **Purpose**                                       |
| -------------------- | -------- | ------------------------------------------------- |
| `qr_source_location` | String   | Attribution (Where was the scan?)                 |
| `marketing_consent`  | Boolean  | GDPR Compliance for email marketing.              |
| `lead_status`        | Enum     | Funnel tracking (Prospect -> Issued -> Redeemed). |
| `sync_status`        | String   | Sync Engine state (Pending/Synced).               |

### 🛠️ Execution Roadmap

- [ ] **Phase 1:** Move ID generation to Hono; enforce Supabase write on creation.

- [ ] **Phase 2:** Implement `SyncService.ts` for offline-capable creation.

- [ ] **Phase 3:** Build the Management Dashboard with Date/Venue filters.

- [ ] **Phase 4:** Setup `00:00` Daily Cron job for local server backups.

- [ ] **Phase 5:** Sunset Google Sheets once data integrity is verified at 100%.

---

**Document Prepared By:** Clement Hansel

**Document Status:** Finalized for Implementation

**Date:** 24 March 2026

**Confidentiality:** Internal HMS Project Module
