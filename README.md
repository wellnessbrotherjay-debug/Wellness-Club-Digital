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
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM, Lucide Icons
- **Backend**: Hono.js, Node.js, TypeScript
- **Database**: Supabase with PostgreSQL
- **Storage**: IndexedDB (browser), Supabase Storage (cloud)
- **Authentication**: None (public access with RLS policies)
- **Email**: Resend (for notifications)
- **Analytics**: Custom implementation (no external analytics detected)
- **QR Codes**: react-qr-code, html5-qrcode
- **Build Tools**: Vite, ESLint

---

## 🌍 Business Role in HTF / TS Group Ecosystem
- **Voucher Layer**: Handles digital voucher creation, QR code generation, and redemption tracking
- **Guest Services**: Provides self-service interface for guests to access wellness services
- **Analytics Hub**: Tracks voucher usage, redemption patterns, and service performance
- **Integration Bridge**: Connects hotel management systems with wellness service providers

---

## 📱 Current Features
- **Voucher Issuance**: Create wellness vouchers with guest details, room numbers, and services
- **QR Code Generation**: Dynamic QR codes for voucher validation
- **Redemption Tracking**: Real-time redemption logging with weather and device tracking
- **Admin Dashboard**: Analytics dashboard with issuance/redemption statistics
- **Multi-language Support**: Basic internationalization framework
- **Responsive Design**: Mobile-first approach for guest kiosks
- **Photo Upload**: Guest photo capture for vouchers
- **Local Storage**: IndexedDB for offline resilience

---

## 🛣 Routes
- `/` - Main voucher issuance interface
- `/v/:id` - Guest pass validation page
- `/help` - Help and instructions
- `/admin/analytics` - Admin analytics dashboard
- `/reconciliation` - Reconciliation dashboard

---

## 🔌 API Routes
- `GET /api/data` - Query vouchers, redemptions, insights data
- `GET /api/data/summary` - Analytics summary endpoint
- `POST /api/redeem` - Log voucher redemptions
- `POST /api/parse-pos` - Parse POS data
- `POST /api/reconcile` - Reconciliation operations
- `POST /api/send-whatsapp` - Send WhatsApp notifications
- `POST /api/send-report` - Send email reports
- `POST /api/vouchers/bulk-sync` - Bulk voucher operations
- `POST /api/audit-log` - Log audit events
- `GET /api/admin/backups` - Manage database backups
- `GET /health` - Health check endpoint

---

## 🗄️ Data Model
### Core Tables
- **vouchers**: Guest voucher details with QR codes and metadata
- **redemptions**: Redemption logs with service details and context
- **insights**: Usage insights and analytics data
- **non_issuance_logs**: Logs for vouchers not issued

### Key Relationships
- Vouchers → Redemptions (one-to-many)
- Vouchers → Insights (usage tracking)
- All tables use RLS policies for security

---

## 🔗 Integrations
- **Supabase**: Primary database and authentication
- **Google Sheets**: Data mirroring via Apps Script
- **WhatsApp**: Notifications via HTTP webhook
- **Resend**: Email notifications
- **OpenWeather**: Weather data for analytics
- **POS Systems**: Integration for service redemption

---

## 🔑 Environment Variables
| Env Name | Purpose | Required? | Secret? | Notes |
|----------|---------|-----------|---------|-------|
| SUPABASE_URL | Supabase project URL | Yes | No | Public endpoint |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin key | Yes | Yes | Bypasses RLS |
| VITE_SUPABASE_URL | Frontend Supabase URL | Yes | No | Public env var |
| VITE_SUPABASE_ANON_KEY | Frontend Supabase key | Yes | No | Public env var |
| RESEND_API_KEY | Resend email service | Yes | Yes | For notifications |
| APPS_SCRIPT_URL | Google Sheets mirror | No | No | Optional mirroring |
| OPENWEATHER_API_KEY | Weather service | No | No | Optional analytics |
| PORT | API server port | No | No | Defaults to 3001 |

---

## 📊 Current Status
- ✅ Core voucher issuance and redemption
- ✅ QR code generation and scanning
- ✅ Basic analytics dashboard
- ✅ Admin reconciliation interface
- ✅ Email notifications
- ✅ Local-first sync with IndexedDB
- ✅ Automated daily backups
- ❌ Advanced analytics (GA4/Meta Pixel)
- ❌ User authentication system
- ❌ Multi-property support
- ❌ Advanced reporting features
- ❌ Mobile app integration

---

## 🎯 Next Priorities
1. Implement proper user authentication
2. Add comprehensive event tracking (GA4, Meta Pixel)
3. Develop multi-property management
4. Create advanced reporting exports
5. Implement API rate limiting and security improvements
6. Add webhook logging for audit trails

---

## 🔒 Security Notes
- Uses Supabase RLS (Row Level Security) for data protection
- Public read/write access on all tables (needs tightening)
- No authentication implemented (security concern)
- API endpoints lack rate limiting except for bulk sync
- Environment secrets properly managed
- CORS configured for web app
- Daily backups for disaster recovery

---

**Maintained by**: Lead Systems Architect & Senior DevOps Engineer.
