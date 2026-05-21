# System Scope

## Public Routes
| Route | Purpose | Main component | Data source | Status |
|-------|---------|----------------|-------------|--------|
| `/` | Main voucher issuance interface | VoucherPage | Local → Supabase | ✅ |
| `/v/:id` | Guest pass validation page | GuestPass | Supabase | ✅ |
| `/help` | Help and instructions | HelpSection | Static | ✅ |
| `/admin/analytics` | Admin analytics dashboard | AdminAnalytics | Supabase summary | ✅ |
| `/analytics` | Redirect to analytics | Navigate component | - | ✅ |
| `/reconciliation` | Reconciliation dashboard | ReconciliationDashboard | Supabase | ✅ |
| `*` | Catch-all redirect | Navigate component | - | ✅ |

## Admin Routes
| Route | Purpose | Main component | Data source | Status |
|-------|---------|----------------|-------------|--------|
| `/admin/analytics` | Analytics dashboard with charts and metrics | AdminAnalytics | Supabase | ✅ |
| `/admin/reconciliation` | Financial reconciliation interface | ReconciliationDashboard | Supabase | ✅ |

## API Routes
| Route | Method | Purpose | Input | Output | Auth | Status |
|-------|--------|---------|-------|--------|------|--------|
| `/api/data` | GET | Query table data | `sheet=vouchers\|redemptions\|insights` | Array of records | None | ✅ |
| `/api/data/summary` | GET | Analytics summary | `range=all\|week\|month` | Aggregated metrics | None | ✅ |
| `/api/redeem` | POST | Log redemption | JSON payload | Success message | None | ✅ |
| `/api/parse-pos` | POST | Parse POS data | POS data | Parsed result | None | ✅ |
| `/api/reconcile` | POST | Reconciliation | Transaction data | Reconciliation ID | None | ✅ |
| `/api/send-whatsapp` | POST | Send WhatsApp | Message data | Send result | None | ✅ |
| `/api/send-report` | POST | Send email report | Report config | Email result | None | ✅ |
| `/api/vouchers/bulk-sync` | POST | Bulk voucher sync | Batch data | Sync result | Rate limited | ✅ |
| `/api/audit-log` | POST | Log audit event | Event data | Log ID | None | ✅ |
| `/api/admin/backups` | GET | List backups | None | Backup files | None | ✅ |
| `/api/cron/daily-backup` | GET | Daily backup trigger | None | Success message | None | ✅ |
| `/api/cron/weekly-report` | GET | Weekly report trigger | None | Success message | None | ✅ |
| `/` (API) | GET | Health check | None | Status JSON | None | ✅ |
| `/health` (API) | GET | Health check | None | Status JSON | None | ✅ |

## Main User Flows

### Lead Capture Flow
1. Guest visits hotel/wellness center
2. Front desk staff scans QR code or manually enters voucher
3. System creates voucher with guest details
4. Voucher saved to IndexedDB (offline resilience)
5. Syncs to Supabase when online
6. Guest receives voucher confirmation

### Voucher Issue Flow
1. Staff accesses main interface (`/`)
2. Enters guest name, room number, check-in/out dates
3. Selects services/categories
4. System generates unique voucher code
5. Creates QR code for voucher
6. Saves voucher to database and local storage
7. Optionally captures guest photo

### Voucher Redemption Flow
1. Guest presents voucher at redemption point
2. Staff scans QR code or enters voucher code
3. System validates voucher (not expired, valid room)
4. Staff selects service for redemption
5. System logs redemption with:
   - Guest name and room
   - Service type and timestamp
   - Weather conditions
   - Device/IP tracking
   - Bill amount (if applicable)
6. Sends notification email
7. Mirrors to Google Sheets (background)

### Booking Flow
1. Guest expresses interest in services
2. Staff creates tentative booking
3. System generates booking reference
4. Sends confirmation via WhatsApp/email
5. Updates guest status in system

### Schedule Flow
1. Staff manages service availability
2. System tracks room/ therapist availability
3. Handles booking conflicts
4. Sends reminders to guests
5. Updates in real-time

### Chatbot Flow
1. Guest initiates chat via WhatsApp
2. System routes to appropriate department
3. Handles booking inquiries
4. Sends vouchers via chat
5. Tracks chat interactions

### Owner Dashboard Flow
1. Owner accesses admin interface (`/admin/analytics`)
2. Views real-time analytics:
   - Conversion rates
   - Popular services
   - Revenue tracking
   - Guest satisfaction
3. Exports reports for stakeholders
4. Monitors staff performance

### Rewards Flow
1. Guest accumulates points via service usage
2. System tracks loyalty points
3. Guest redeems rewards
4. Updates balance in real-time
5. Sends reward notifications