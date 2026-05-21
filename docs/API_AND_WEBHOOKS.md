# API and Webhooks

## API Endpoints

| Endpoint | Method | Purpose | Input Payload | Output | Auth | Reads From | Writes To | Triggered By | Status |
|----------|--------|---------|---------------|--------|------|------------|-----------|--------------|--------|
| `/api/data` | GET | Query table data | `{ sheet: string, id?: string }` | Array of records | None | Supabase | - | Manual/Automation | ✅ |
| `/api/data/summary` | GET | Analytics summary | `{ range?: 'all'\|'week'\|'month' }` | Aggregated metrics | None | Supabase | - | Dashboard requests | ✅ |
| `/api/redeem` | POST | Log redemption | `{ voucher_code, guest_name, service_type, pax, metadata? }` | Success message | None | - | redemptions | Staff/Scanner | ✅ |
| `/api/parse-pos` | POST | Parse POS data | POS transaction data | Parsed result | None | - | - | POS systems | ✅ |
| `/api/reconcile` | POST | Reconciliation | Transaction data | Reconciliation ID | None | - | - | Financial system | ✅ |
| `/api/send-whatsapp` | POST | Send WhatsApp | `{ message, recipient, template? }` | Send result | None | - | - | Manual/Scheduled | ✅ |
| `/api/send-report` | POST | Send email report | `{ type, range, format? }` | Email result | None | - | - | Scheduled/Manual | ✅ |
| `/api/vouchers/bulk-sync` | POST | Bulk voucher sync | `{ vouchers: Array<{}> }` | Sync result | Rate limited | - | vouchers | Manual imports | ✅ |
| `/api/audit-log` | POST | Log audit event | `{ action, user, resource, changes }` | Log ID | None | - | - | All actions | ✅ |
| `/api/admin/backups` | GET | List backups | None | Backup files | None | - | - | Manual | ✅ |
| `/api/cron/daily-backup` | GET | Daily backup trigger | None | Success message | None | - | - | Scheduled (00:00) | ✅ |
| `/api/cron/weekly-report` | GET | Weekly report trigger | None | Success message | None | - | - | Scheduled | ✅ |
| `/` (API) | GET | Health check | None | `{ status: 'ok' }` | None | - | - | Monitoring | ✅ |
| `/health` (API) | GET | Health check | None | `{ status: 'ok' }` | None | - | - | Monitoring | ✅ |

## Webhook Endpoints

### Outgoing Webhooks
| Destination | Data Sent | Method | Status |
|-------------|-----------|--------|--------|
| Google Sheets | Voucher and redemption data | POST (background) | ✅ |
| Resend Email | Redemption notifications | POST | ✅ |
| WhatsApp | Booking confirmations | POST | ✅ |

### Incoming Webhooks
| Source | Data Received | Method | Status |
|--------|---------------|--------|--------|
| QR Scanner | Voucher codes | POST | ✅ |
| POS Systems | Transaction data | POST | ✅ |
| WhatsApp | User messages | POST | ❌ |

## API Details

### `/api/redeem`
- **Rate Limit**: None (except in middleware)
- **Validation**: Basic JSON validation
- **Security**: IP logging, device ID tracking
- **Features**:
  - Weather data collection
  - Duplicate prevention (5-minute window)
  - Email notifications
  - Google Sheets mirroring
  - Bill calculation (tax + service charge)

### `/api/data`
- **Supports**: vouchers, redemptions, insights tables
- **Filtering**: By voucher_code or get all
- **Ordering**: By created_at (vouchers) or timestamp (redemptions)
- **Error Handling**: Graceful fallback for missing columns

### `/api/data/summary`
- **Analytics Engine**: Complex aggregation with filtering
- **Features**:
  - Conversion rate calculation
  - Venue leaderboard
  - Daily breakdowns
  - Pax categorization
  - Test voucher exclusion
  - Marketing consent tracking
  - Performance analysis

## Recommended API Contracts Needed

### 1. Lead Capture API
```typescript
POST /api/leads
{
  "guest_name": string,
  "email": string,
  "phone": string,
  "room_number": string,
  "source": string,
  "campaign_id": string,
  "utm_source": string,
  "utm_medium": string,
  "utm_campaign": string,
  "lead_type": string
}
```

### 2. Booking Management API
```typescript
POST /api/bookings
{
  "lead_id": string,
  "service_id": string,
  "staff_id": string,
  "scheduled_at": string,
  "duration": number,
  "pax": number,
  "status": string
}
```

### 3. Schedule Management API
```typescript
GET /api/schedules/availability
{
  "service_id": string,
  "date": string,
  "staff_id?": string
}

POST /api/schedules
{
  "service_id": string,
  "staff_id": string,
  "scheduled_at": string,
  "available": boolean
}
```

### 4. CRM Sync API
```typescript
POST /api/crm/sync
{
  "action": "create_contact" | "update_contact",
  "contact_id": string,
  "data": {
    "name": string,
    "email": string,
    "phone": string,
    "tags": string[],
    "preferences": object
  }
}
```

### 5. Analytics Event API
```typescript
POST /api/events
{
  "event": "page_view" | "cta_click" | "form_submit",
  "user_id": string,
  "page": string,
  "element": string,
  "metadata": object,
  "timestamp": string
}
```

### 6. Multi-Property API
```typescript
GET /api/venues
GET /api/venues/:id/properties
GET /api/venues/:id/analytics
```

## Webhook Recommendations

### 1. GA4 Integration Webhook
```typescript
POST /webhooks/ga4
{
  "client_id": string,
  "events": [
    {
      "name": string,
      "params": object
    }
  ]
}
```

### 2. CRM Webhook
```typescript
POST /webhooks/crm
{
  "event": string,
  "data": object,
  "timestamp": string
}
```

### 3. Notification Webhook
```typescript
POST /webhooks/notifications
{
  "channel": "email" | "whatsapp" | "sms",
  "recipient": string,
  "template": string,
  "data": object
}
```

## Error Handling Patterns
```typescript
// Standard response format
{
  "success": boolean,
  "data?: any,
  "error?: {
    "code": string,
    "message": string,
    "details?: any
  },
  "metadata?: {
    "timestamp": string,
    "request_id": string
  }
}
```

## Authentication Requirements
Currently all APIs are public - need to implement:
- API key authentication
- User authentication for admin routes
- Role-based access control
- JWT tokens for authenticated sessions

## Rate Limiting
Currently only implemented for `/api/vouchers/bulk-sync`:
- 50 requests per 15 minutes per IP
- Should be expanded to all endpoints