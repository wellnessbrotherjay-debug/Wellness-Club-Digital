# 🌿 Wellness Club Digital (HMS)

**A professional, local-first Hotel Management System (HMS) for voucher issuance, redemption, and marketing analytics.**

Built for high-resilience in resort environments with unstable connectivity, using a local-first sync engine and automated disaster recovery.

---

## 🏗 Architecture Overview

The system is a TypeScript monorepo consisting of:
- **`apps/web`**: React + Vite frontend with **IndexedDB** for offline-first resilience.
- **`apps/api`**: Hono + Node.js backend providing Zod-hardened sync endpoints and marketing analytics.
- **Database**: Supabase (PostgreSQL) as the single source of truth.
- **Disaster Recovery**: Automated daily backups to local JSON and non-blocking Google Sheets mirroring.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project

### 2. Environment Setup
Create `.env` files in both `apps/api` and `apps/web` using the provided `.env.example` files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Installation & Development
```bash
npm install
npm run dev
```

---

## 🛡 Key Features

### 🔄 Local-First Sync Engine
Vouchers are saved instantly to the guest's browser (IndexedDB) and synchronized to the cloud in the background. If the connection fails, the system retries automatically, ensuring 0% data loss for Guest Relations Officers (GROs).

### 📊 Marketing Insights Dashboard
Custom analytics suite tracking:
- **Conversion Rate**: Issued vs. Redeemed vouchers.
- **Venue Leaderboard**: Tracking marketing attribution by location (Reception, Spa, Pool Bar).
- **Consent Tracker**: Monitoring guest marketing opt-in rates for CRM growth.

### 💾 Automated Disaster Recovery
The API runs an internal CRON task every night at **00:00 (Midnight)** to:
1. Export all voucher and redemption records.
2. Archive them to timestamped JSON files in `/backups`.
3. Ensure 100% data recoverability in case of cloud service interruptions.

---

## 🛠 Tech Stack
- **Frontend**: React, Tailwind CSS, TanStack Table, Lucide Icons.
- **Backend**: Hono, Zod, Supabase-JS, Resend (Email).
- **Storage**: IndexedDB (Browser), PostgreSQL (Cloud).

---

## 📖 Production Hardening
This repository has undergone a 360-degree audit, including:
- **Zod Validation**: All API inputs are strictly typed and validated.
- **Security**: `.gitignore` prevents leakage of backups and environment keys.
- **Performance**: Non-blocking `waitUntil` logic for secondary integrations (Google Sheets).

---
**Maintained by**: Lead Systems Architect & Senior DevOps Engineer.
