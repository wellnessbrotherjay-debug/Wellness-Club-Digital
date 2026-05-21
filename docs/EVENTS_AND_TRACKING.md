# Events and Tracking

## Current Event Implementation

### Browser Events
No external analytics libraries (GA4, GTM, Meta Pixel) are currently implemented. The system relies on basic data collection through the application.

### Custom Event Tracking
No custom event tracking system is implemented in the current codebase.

## Events That Should Be Tracked

### Page View Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `page_view` | Page load | `{ page, timestamp, user_agent }` | GA4, Custom analytics | - | ❌ |
| `admin_page_view` | Admin dashboard access | `{ page, user_role, timestamp }` | GA4, Internal logs | - | ❌ |

### Form Interactions
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `form_start` | Form initiation | `{ form_type, page, timestamp }` | GA4, Custom analytics | - | ❌ |
| `form_submit` | Form completion | `{ form_type, success, time_spent, errors }` | GA4, Custom analytics | - | ❌ |
| `form_error` | Form validation error | `{ field, error_type, form_type }` | GA4, Error tracking | - | ❌ |

### Voucher Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `voucher_issued` | Voucher creation | `{ voucher_code, guest_name, room_number, source, campaign_id }` | GA4, CRM, Custom analytics | apps/web/src/VoucherPage.tsx | ✅ |
| `voucher_viewed` | Voucher page visit | `{ voucher_code, source, timestamp }` | GA4, Custom analytics | - | ❌ |
| `voucher_expired` | Voucher expiration | `{ voucher_code, days_active }` | GA4, Analytics dashboard | - | ❌ |

### Redemption Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `redemption_initiated` | Redemption start | `{ voucher_code, service_type, staff_id }` | GA4, Custom analytics | - | ❌ |
| `redemption_completed` | Successful redemption | `{ voucher_code, service_type, amount, weather, staff_id }` | GA4, Custom analytics | apps/api/src/routes/redeem.ts | ✅ |
| `redemption_failed` | Failed redemption | `{ voucher_code, reason, error_type }` | GA4, Error tracking | - | ❌ |

### QR Code Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `qr_scan_initiated` | QR scanner activated | `{ device_type, location, timestamp }` | GA4, Custom analytics | apps/web/src/QRScanner.tsx | ✅ |
| `qr_scan_success` | QR code scanned | `{ qr_code_type, location, time_to_scan }` | GA4, Custom analytics | apps/web/src/QRScanner.tsx | ✅ |
| `qr_scan_failed` | QR scan failed | `{ error_type, reason }` | GA4, Error tracking | apps/web/src/QRScanner.tsx | ✅ |

### WhatsApp Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `whatsapp_opened` | WhatsApp message opened | `{ message_id, timestamp }` | WhatsApp API, Custom analytics | - | ❌ |
| `whatsapp_clicked` | WhatsApp link clicked | `{ link_type, campaign_id, timestamp }` | GA4, Custom analytics | - | ❌ |
| `whatsapp_reply` | WhatsApp reply received | `{ message, timestamp }` | WhatsApp API, Custom analytics | - | ❌ |

### Booking Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `booking_requested` | Booking request submitted | `{ service_id, date, pax, source }` | GA4, Custom analytics | - | ❌ |
| `booking_confirmed` | Booking confirmed | `{ booking_id, service_id, timestamp }` | GA4, Custom analytics | - | ❌ |
| `booking_cancelled` | Booking cancelled | `{ booking_id, reason, timestamp }` | GA4, Custom analytics | - | ❌ |
| `booking_completed` | Booking completed | `{ booking_id, satisfaction, timestamp }` | GA4, Custom analytics | - | ❌ |

### Email Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `email_sent` | Email notification sent | `{ recipient, template_id, timestamp }` | Resend, GA4 | apps/api/src/routes/redeem.ts | ✅ |
| `email_delivered` | Email delivered | `{ email_id, timestamp }` | Resend, Custom analytics | - | ❌ |
| `email_opened` | Email opened | `{ email_id, timestamp }` | Resend, GA4 | - | ❌ |
| `email_clicked` | Email link clicked | `{ email_id, link, timestamp }` | Resend, GA4 | - | ❌ |

### Analytics Dashboard Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `dashboard_viewed` | Admin dashboard accessed | `{ section, user_role, timestamp }` | GA4, Internal logs | apps/web/src/pages/AdminAnalytics.tsx | ✅ |
| `report_generated` | Report generated | `{ report_type, date_range, format }` | GA4, Custom analytics | - | ❌ |
| `data_exported` | Data exported | `{ export_type, records_count }` | GA4, Custom analytics | - | ❌ |

### Error Events
| Event Name | Trigger | Parameters | Destination | File | Status |
|------------|---------|------------|-------------|------|--------|
| `api_error` | API call failed | `{ endpoint, status_code, error_message }` | Error tracking, GA4 | - | ❌ |
| `validation_error` | Form validation failed | `{ field, error_type, form_name }` | Error tracking, GA4 | - | ❌ |
| `network_error` | Network request failed | `{ endpoint, attempt_number }` | Error tracking, GA4 | - | ❌ |

## Missing Events

### UTM and Attribution Events
```typescript
// Should track for every page view
{
  "event": "utm_view",
  "parameters": {
    "utm_source": string,
    "utm_medium": string,
    "utm_campaign": string,
    "utm_content": string,
    "utm_term": string,
    "landing_page": string,
    "referrer": string
  }
}
```

### User Journey Events
```typescript
// Complete guest journey tracking
{
  "event": "guest_journey_step",
  "parameters": {
    "journey_id": string,
    "step_number": number,
    "step_name": string,
    "previous_step": string,
    "timestamp": string
  }
}
```

### Performance Events
```typescript
// Core web vitals
{
  "event": "web_vitals",
  "parameters": {
    "page_load_time": number,
    "time_to_interactive": number,
    "first_contentful_paint": number,
    "largest_contentful_paint": number
  }
}
```

### Commerce Events
```typescript
// E-commerce style tracking
{
  "event": "view_item",
  "parameters": {
    "item_id": string,
    "item_name": string,
    "price": number,
    "currency": string
  }
}
{
  "event": "add_to_cart",
  "parameters": {
    "item_id": string,
    "quantity": number,
    "price": number
  }
}
{
  "event": "begin_checkout",
  "parameters": {
    "cart_value": number,
    "items": Array
  }
}
```

## Recommended Implementation

### 1. GA4 Integration
```typescript
// apps/web/src/utils/analytics.ts
class Analytics {
  private gtag: ((command: string, ...args: any[]) => void) | null = null;
  
  init() {
    if (typeof window !== 'undefined') {
      this.gtag = window.gtag;
    }
  }
  
  event(name: string, params?: any) {
    if (this.gtag) {
      this.gtag('event', name, params);
    }
  }
  
  pageview(path: string) {
    this.event('page_view', {
      page_path: path,
      page_title: document.title
    });
  }
}
```

### 2. Custom Event System
```typescript
// apps/web/src/utils/events.ts
interface EventData {
  event: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  metadata?: any;
}

class EventTracker {
  sessionId: string;
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }
  
  track(event: string, metadata?: any) {
    const eventData: EventData = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metadata
    };
    
    // Send to analytics service
    this.sendEvent(eventData);
    
    // Store in localStorage for offline resilience
    this.storeOffline(eventData);
  }
  
  private sendEvent(eventData: EventData) {
    // Implement sending to your analytics endpoint
  }
}
```

### 3. Event Context Enhancement
```typescript
// Automatically add context to all events
const enhanceEvent = (event: string, params: any = {}) => {
  return {
    ...params,
    app_version: process.env.VITE_APP_VERSION,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    referrer: document.referrer,
    utm_source: getUTMParameter('utm_source'),
    utm_medium: getUTMParameter('utm_medium'),
    utm_campaign: getUTMParameter('utm_campaign')
  };
};
```

## Event Tracking Integration Points

### 1. Voucher Creation Flow
```typescript
// In apps/web/src/VoucherPage.tsx
onSubmit() {
  analytics.event('voucher_issued', {
    guest_name,
    room_number,
    service_type,
    source: 'web_form',
    campaign_id: getCampaignId()
  });
}
```

### 2. Redemption Flow
```typescript
// In apps/api/src/routes/redeem.ts
await supabaseAdmin.from('redemptions').insert([{
  voucher_code,
  guest_name,
  service_type
}]);

analytics.event('redemption_completed', {
  voucher_code,
  service_type,
  amount: body.billAmount,
  weather: body.weather,
  staff_id: body.staffId
});
```

### 3. QR Code Scanning
```typescript
// In apps/web/src/QRScanner.tsx
onScanSuccess(result) {
  analytics.event('qr_scan_success', {
    qr_code_type: 'voucher',
    location: qr_source_location,
    time_to_scan: Date.now() - scanStartTime
  });
}
```