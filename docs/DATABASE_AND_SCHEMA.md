# Database and Schema

## Core Tables

| Table / Model | Purpose | Key Fields | Relationships | Used By | Notes |
|---------------|---------|------------|--------------|---------|-------|
| **vouchers** | Guest voucher details | voucher_code (PK), guest_name, room_number, check_in, check_out, status, pax, image_url, is_test, marketing_consent, qr_source_location, sync_status, metadata | 1:N with redemptions | API, Web App, Admin | Primary voucher storage |
| **redemptions** | Redemption logs | id (PK), voucher_code, guest_name, service_type, room_number, email, whatsapp, weather, timestamp, metadata | N:1 with vouchers | API, Web App | Tracks each service redemption |
| **insights** | Usage analytics | id (PK), room_number, duration, reason | - | API, Analytics Dashboard | General usage insights |
| **non_issuance_logs** | Vouchers not issued | id (PK), voucher_code, reason, timestamp | - | API, Admin | Logs failed voucher creation |

## Field Descriptions

### vouchers Table
- **voucher_code**: Unique identifier for each voucher (TEXT, PRIMARY KEY)
- **guest_name**: Guest's full name (TEXT)
- **email**: Guest's email address (TEXT)
- **whatsapp**: Guest's WhatsApp number (TEXT)
- **status**: Current voucher status (TEXT: 'Created', 'Redeemed', 'Expired')
- **room_number**: Hotel room number (TEXT)
- **check_in**: Check-in date (TIMESTAMPTZ)
- **check_out**: Check-out date (TIMESTAMPTZ)
- **created_at**: Voucher creation timestamp (TIMESTAMPTZ)
- **redeemed_at**: Redemption timestamp (TIMESTAMPTZ)
- **service_type**: Primary service category (TEXT)
- **services**: Array of services (TEXT)
- **pax**: Number of people (INT, default 1)
- **image_url**: Guest photo URL (TEXT)
- **is_test**: Test flag (BOOLEAN, default FALSE)
- **marketing_consent**: Marketing opt-in (BOOLEAN, default FALSE)
- **qr_source_location**: Where QR was scanned (TEXT: 'reception', 'spa', etc.)
- **sync_status**: Sync status (TEXT: 'pending', 'synced', 'failed')
- **metadata**: JSON field for additional data (JSONB)

### redemptions Table
- **id**: Auto-incrementing ID (BIGSERIAL, PRIMARY KEY)
- **voucher_code**: Reference to voucher (TEXT)
- **guest_name**: Guest name at redemption (TEXT)
- **service_type**: Service redeemed (TEXT)
- **room_number**: Room number (TEXT)
- **email**: Email (TEXT)
- **whatsapp**: WhatsApp (TEXT)
- **weather**: Weather conditions (TEXT)
- **timestamp**: Redemption timestamp (TIMESTAMPTZ)
- **metadata**: Additional redemption data (JSONB)

### insights Table
- **id**: Auto-incrementing ID (BIGSERIAL, PRIMARY KEY)
- **room_number**: Room number (TEXT)
- **duration**: Usage duration (TEXT)
- **reason**: Insight reason (TEXT)
- **timestamp**: Insight timestamp (TIMESTAMPTZ)

### non_issuance_logs Table
- **id**: Auto-incrementing ID (BIGSERIAL, PRIMARY KEY)
- **voucher_code**: Voucher code not issued (TEXT)
- **reason**: Reason for non-issuance (TEXT)
- **timestamp**: Log timestamp (TIMESTAMPTZ)

## Missing Shared Fields

### Present Fields
- ✅ **venue_id**: Not present - should be added for multi-property support
- ✅ **department_id**: Not present - should be added for department tracking
- ✅ **contact_id**: Not present - should be added for CRM integration
- ❌ **lead_id**: Not present - missing lead tracking
- ✅ **booking_id**: Not present - missing booking reference
- ✅ **voucher_id**: Present (as voucher_code)
- ❌ **campaign_id**: Not present - missing campaign attribution
- ✅ **source**: Partially via qr_source_location
- ❌ **medium**: Not present - missing UTM medium
- ❌ **campaign**: Not present - missing UTM campaign
- ❌ **landing_page**: Not present - missing landing page tracking
- ✅ **referrer**: Not present - missing referrer tracking
- ✅ **status**: Present
- ✅ **created_at**: Present
- ✅ **updated_at**: Not present - should be added

### Recommended New Fields

#### vouchers table should add:
- `venue_id` (TEXT) - For multi-property support
- `department_id` (TEXT) - For department categorization
- `lead_id` (TEXT) - Lead reference
- `booking_id` (TEXT) - Booking reference
- `campaign_id` (TEXT) - Marketing campaign ID
- `utm_source` (TEXT) - UTM source
- `utm_medium` (TEXT) - UTM medium
- `utm_campaign` (TEXT) - UTM campaign
- `utm_content` (TEXT) - UTM content
- `utm_term` (TEXT) - UTM term
- `landing_page` (TEXT) - Landing page URL
- `referrer` (TEXT) - Referring URL
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

#### redemptions table should add:
- `venue_id` (TEXT) - For multi-property support
- `booking_id` (TEXT) - Reference to booking
- `campaign_id` (TEXT) - Campaign attribution
- `staff_id` (TEXT) - Staff member handling redemption
- `payment_method` (TEXT) - Payment method used
- `revenue_amount` (DECIMAL) - Revenue generated
- `service_revenue` (DECIMAL) - Service-specific revenue

#### New tables needed:
- **contacts**: Guest contact details for CRM
- **leads**: Lead tracking and attribution
- **bookings**: Booking management system
- **venues**: Multi-property management
- **departments**: Department categorization
- **campaigns**: Marketing campaign tracking
- **staff**: Staff management
- **services**: Service catalog
- **resources**: Resource availability
- **schedules**: Staff schedules
- **loyalty**: Loyalty program
- **notifications**: Notification logs

## RLS (Row Level Security) Policies
All tables have public read/write access currently, which is:
- ✅ Easy for development
- ❌ Insecure for production
- ❌ Violates least privilege principle

## Indexes
Current indexes:
- Primary keys on all tables
- Foreign key relationship on redemptions.voucher_code

Recommended indexes:
- `vouchers(room_number)` - For room-based queries
- `vouchers(created_at)` - For time-based analytics
- `redemptions(timestamp)` - For redemption analytics
- `redemptions(voucher_code)` - For redemption lookups
- `redemptions(service_type)` - For service analytics
- `redemptions(room_number)` - For room analytics