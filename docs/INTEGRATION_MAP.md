# Integration Map

## This Repo's Role
- **✓ Voucher Layer**: Handles digital voucher creation, QR code generation, and redemption tracking
- **✓ Analytics Hub**: Provides redemption analytics and reporting
- **✓ Guest Services**: Interface for guests to access wellness services
- **✓ Integration Bridge**: Connects to various external systems

## Sends Data To
| Destination System | Data Sent | Method | Status |
|-------------------|-----------|--------|--------|
| **Google Sheets** | Voucher and redemption data | POST (background) | ✅ |
| **Resend** | Email notifications | API calls | ✅ |
| **WhatsApp** | Booking confirmations | HTTP webhooks | ✅ (limited) |
| **OpenWeather** | Weather data | API calls | ✅ (optional) |
| **Supabase** | Primary data storage | Direct writes | ✅ |

## Receives Data From
| Source System | Data Received | Method | Status |
|---------------|---------------|--------|--------|
| **Supabase** | Configuration, data reads | Direct queries | ✅ |
| **QR Scanner** | Voucher codes | POST requests | ✅ |
| **POS Systems** | Transaction data | POST requests | ✅ |
| **WhatsApp** | User messages | Webhooks | ❌ |
| **Google Sheets** | Legacy data | Mirror only | ❌ (read-only) |

## Shared IDs Needed
| ID | Present? | Notes |
|----|----------|-------|
| **venue_id** | ❌ | Critical for multi-property support |
| **department_id** | ❌ | Needed for department categorization |
| **contact_id** | ❌ | Required for CRM integration |
| **lead_id** | ❌ | Missing lead tracking |
| **booking_id** | ❌ | Should reference booking system |
| **voucher_id** | ✅ (as voucher_code) | Present but inconsistent naming |
| **campaign_id** | ❌ | No marketing attribution |
| **app_user_id** | ❌ | No user identification system |

## Current ID Flow
```
Voucher Creation:
├── voucher_code (generated locally)
├── room_number (manual entry)
├── guest_name (manual entry)
└── qr_source_location (dropdown)

Redemption:
├── voucher_code (scanned/entered)
├── service_type (manual selection)
├── weather (auto-fetched)
└── ip_address (auto-collected)
```

## Recommended ID Architecture
```
Guest Journey:
├── contact_id (global guest identifier)
├── lead_id (lead tracking)
├── booking_id (booking reference)
└── voucher_id (voucher code)

Analytics:
├── venue_id (property)
├── department_id (service category)
├── campaign_id (marketing source)
├── utm_source, utm_medium, utm_campaign (attribution)
└── landing_page (referral source)
```

## Ecosystem Connections

### Connection to TS Residence Website
- **Current**: None
- **Recommended**: 
  - Share guest contact database
  - Connect booking references
  - Sync availability data
  - Forward leads from website

### Connection to No.1 Wellness Website
- **Current**: None
- **Recommended**:
  - Share service catalog
  - Connect booking systems
  - Sync availability
  - Cross-promotion tracking

### Connection to Schedule System
- **Current**: None
- **Recommended**:
  - Share staff schedules
  - Sync availability
  - Connect booking references
  - Track service capacity

### Connection to Voucher System
- **Current**: This is the voucher system
- **Integration**: Self-contained but needs:
  - Multi-property support
  - Campaign attribution
  - Lead integration

### Connection to Chatbot
- **Current**: Limited WhatsApp support
- **Recommended**:
  - Full webhook integration
  - Share guest history
  - Sync booking status
  - Route chats to staff

### Connection to Guest App
- **Current**: None
- **Recommended**:
  - Share loyalty points
  - Connect user accounts
  - Sync redemption history
  - Push notifications

### Connection to Owner Command Center
- **Current**: Basic analytics dashboard
- **Recommended**:
  - Real-time data feeds
  - Financial integration
  - Staff performance tracking
  - Revenue reports

### Connection to POS/VHP Bridge
- **Current**: POS parsing endpoint exists
- **Recommended**:
  - Real-time transaction sync
  - Revenue tracking
  - Inventory integration
  - Payment method tracking

## Integration Risks

### 1. Duplicated Contacts
- **Risk**: Same guest tracked multiple times
- **Evidence**: No unique guest identifier
- **Impact**: CRM chaos, duplicate communications
- **Mitigation**: Implement contact_id with deduplication logic

### 2. Missing Shared IDs
- **Risk**: Data silos, broken relationships
- **Evidence**: No venue_id, booking_id, lead_id
- **Impact**: Cannot cross-reference data between systems
- **Mitigation**: Implement standardized ID system

### 3. Missing Webhook Logs
- **Risk**: Failed integrations unnoticed
- **Evidence**: No webhook logging in current system
- **Impact**: Silent failures in external systems
- **Mitigation**: Add webhook log table and monitoring

### 4. No Retries
- **Risk**: Data loss during failures
- **Evidence**: Mirror to Google Sheets has simple retry
- **Impact**: Incomplete data in external systems
- **Mitigation**: Implement exponential backoff retry system

### 5. Weak Authentication
- **Risk**: Unauthorized API access
- **Evidence**: All APIs are public
- **Impact**: Data tampering, abuse
- **Mitigation**: Implement API key authentication

### 6. Inconsistent Event Names
- **Risk**: Analytics fragmentation
- **Evidence**: No standardized event naming
- **Impact**: Inconsistent reporting across systems
- **Mitigation**: Define event naming conventions

### 7. Missing UTM Persistence
- **Risk**: Lost marketing attribution
- **Evidence**: No UTM tracking in current system
- **Impact**: Cannot track campaign effectiveness
- **Mitigation**: Implement UTM persistence throughout user journey

### 8. No Dashboard Rollups
- **Risk**: Inconsistent reporting
- **Evidence**: Each system has its own analytics
- **Impact**: Cannot get unified view
- **Mitigation**: Create centralized rollup service

## Data Flow Recommendations

### 1. Guest Journey Flow
```
Website Landing → Lead Capture → Voucher Issuance → Redemption → Feedback
     ↓              ↓             ↓             ↓           ↓
   venue_id      contact_id    voucher_id    redemption_id    rating
   utm_*         lead_id       booking_id    service_id       campaign_id
```

### 2. Data Consistency
```typescript
// Centralized ID generation
const generateJourneyId = () => {
  return `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const trackGuest = async (guestData) => {
  // Check if guest exists
  const existing = await supabase
    .from('contacts')
    .select('id')
    .eq('email', guestData.email)
    .single();
  
  return existing?.id || createGuest(guestData);
};
```

### 3. Webhook Reliability
```typescript
const reliableWebhook = async (url, data, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        await logWebhookSuccess(url, data);
        return true;
      }
    } catch (error) {
      await logWebhookFailure(url, data, error, i + 1);
      if (i < retries - 1) {
        await exponentialBackoff(i + 1);
      }
    }
  }
  return false;
};
```

## Monitoring Integration Health

### 1. Health Checks
```typescript
// Monitor external service health
const checkIntegrationHealth = async () => {
  const services = {
    google_sheets: checkGoogleSheets(),
    resend: checkResend(),
    whatsapp: checkWhatsApp(),
    supabase: checkSupabase()
  };
  
  return Promise.all(Object.values(services));
};
```

### 2. Data Synchronization
```typescript
// Ensure data consistency
const syncDataIntegrations = async () => {
  // Check for missing records in external systems
  const missingVouchers = await findMissingInGoogleSheets();
  const missingRedemptions = await findMissingInCRM();
  
  // Perform synchronization
  await syncToGoogleSheets(missingVouchers);
  await syncToCRM(missingRedemptions);
};
```

### 3. Error Alerting
```typescript
// Alert on integration failures
const alertOnIntegrationFailure = (service, error) => {
  if (error.isCritical) {
    sendSlackAlert(`Critical failure in ${service}: ${error.message}`);
    sendEmailAlert('admin@example.com', `Integration Alert`, error.message);
  }
  
  logError(service, error);
  incrementErrorCounter(service);
};
```