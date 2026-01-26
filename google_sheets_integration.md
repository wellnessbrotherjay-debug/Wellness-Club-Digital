# Google Sheets API Integration System

This guide provides the complete code and setup instructions to connect your React application to Google Sheets. This system allows you to use Google Sheets as a free, real-time database/CMS for your booking page, staff management, or any other data.

## 1. Google Apps Script (The Backend)
This script runs on Google's servers. It acts as an API, receiving data from your website and reading/writing to your Google Sheet.

### **Instructions:**
1.  Open your Google Sheet.
2.  Go to **Extensions > Apps Script**.
3.  Delete any existing code and paste the code below.
4.  **Save** the project.
5.  Click **Deploy > New deployment**.
6.  Select type: **Web app**.
7.  Description: "API v1".
8.  Execute as: **Me**.
9.  Who has access: **Anyone** (Critical for public website access).
10. Click **Deploy** and copy the **Web app URL**.

### **Code to Copy:**
/**
 * GOOGLE APPS SCRIPT - HTF Solutions Backend
 * Handles data for: Vouchers, Bookings, Staff
 */

// CONFIGURATION - Sheet names
const SHEET_NAMES = {
  VOUCHERS: "Vouchers",
  BOOKINGS: "Bookings",
  STAFF: "Staff",
  SCHEDULES: "Schedules",
  REDEMPTIONS: "Redemptions"
};

/**
 * Handles GET requests (Reading data via JSONP)
 */
function doGet(e) {
  const params = e.parameter;
  const callback = params.callback || 'callback';
  const sheetName = params.sheet || SHEET_NAMES.VOUCHERS;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // If sheet doesn't exist, return error
  if (!sheet) {
    return ContentService.createTextOutput(
      callback + "(" + JSON.stringify({ error: "Sheet not found: " + sheetName }) + ")"
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // Read all data
  const rows = sheet.getDataRange().getValues();
  if (rows.length === 0) {
    return ContentService.createTextOutput(
      callback + "(" + JSON.stringify([]) + ")"
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify(data) + ")"
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Handles POST requests (Writing data)
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action || 'create';
    
    if (action === 'create') {
      return handleCreate(postData);
    } else if (action === 'redeem') {
      return handleRedeem(postData);
    }
    
    return createResponse({ status: "error", message: "Unknown action" });
  } catch (error) {
    return createResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Handle creating new records (Vouchers, Bookings, Staff, Schedules)
 */
function handleCreate(postData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Determine which sheet based on data structure
  let sheetName;
  if (postData.voucherCode) {
    sheetName = SHEET_NAMES.VOUCHERS;
  } else if (postData.className || postData.bookingType === 'class') {
    sheetName = SHEET_NAMES.BOOKINGS;
  } else if (postData.sheetType === 'schedule' || postData.shift) {
    sheetName = SHEET_NAMES.SCHEDULES;
  } else if (postData.staffName || postData.role) {
    sheetName = SHEET_NAMES.STAFF;
  } else {
    return createResponse({ status: "error", message: "Cannot determine sheet type" });
  }
  
  let sheet = ss.getSheetByName(sheetName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Add headers based on sheet type
    if (sheetName === SHEET_NAMES.VOUCHERS) {
      sheet.appendRow(['code', 'guestName', 'status', 'roomNumber', 'checkIn', 'checkOut', 'imageUrl', 'services', 'created_at', 'redeemed_at']);
    } else if (sheetName === SHEET_NAMES.BOOKINGS) {
      sheet.appendRow(['bookingId', 'className', 'customerName', 'customerEmail', 'customerPhone', 'timeSlot', 'day', 'coach', 'numPeople', 'status', 'timestamp']);
    } else if (sheetName === SHEET_NAMES.STAFF) {
      sheet.appendRow(['staffId', 'staffName', 'role', 'email', 'phone', 'status', 'timestamp']);
    } else if (sheetName === SHEET_NAMES.SCHEDULES) {
      sheet.appendRow(['scheduleId', 'staffId', 'staffName', 'date', 'shift', 'status', 'timestamp']);
    }
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const timestamp = new Date().toISOString();
  
  // Build row based on headers
  const row = headers.map(header => {
    // Map frontend keys to backend headers
    if (header === 'created_at' || header === 'timestamp') return timestamp;
    if (header === 'code') return postData.voucherCode; 
    if (header === 'guestName') return postData.guestName || postData.userName; 
    
    if (header === 'roomNumber') return postData.roomNumber || "";
    if (header === 'checkIn') return postData.checkIn || "";
    if (header === 'checkOut') return postData.checkOut || "";
    if (header === 'imageUrl') return postData.imageUrl || "";
    if (header === 'services') return postData.services || "";
    
    return postData[header] || "";
  });
  
  sheet.appendRow(row);
  
  return createResponse({ status: "success", message: "Record created" });
}

/**
 * Handle redeeming vouchers (Log a new use for a specific service)
 */
function handleRedeem(postData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const voucherSheet = ss.getSheetByName(SHEET_NAMES.VOUCHERS);
  
  if (!voucherSheet) {
    return createResponse({ status: "error", message: "Vouchers sheet not found" });
  }
  
  const voucherCode = postData.voucherCode;
  const serviceType = postData.serviceType || "General Use";
  
  // 1. Verify Voucher Exists and get Guest Name
  const voucherData = voucherSheet.getDataRange().getValues();
  const voucherHeaders = voucherData[0];
  const codeIndex = voucherHeaders.indexOf('code');
  const guestNameIndex = voucherHeaders.indexOf('guestName');
  const statusIndex = voucherHeaders.indexOf('status');
  const redeemedAtIndex = voucherHeaders.indexOf('redeemed_at');
  
  let guestName = "Unknown";
  let found = false;
  for (let i = 1; i < voucherData.length; i++) {
    if (voucherData[i][codeIndex] === voucherCode) {
      guestName = voucherData[i][guestNameIndex];
      found = true;
      
      // Update the main voucher status to reflect last use
      voucherSheet.getRange(i + 1, statusIndex + 1).setValue('Redeemed (' + serviceType + ')');
      if (redeemedAtIndex !== -1) {
        voucherSheet.getRange(i + 1, redeemedAtIndex + 1).setValue(new Date().toISOString());
      }
      break;
    }
  }
  
  if (!found) {
    return createResponse({ status: "error", message: "Voucher not found" });
  }

  // 2. Log entry in the Redemptions history sheet
  let redeemSheet = ss.getSheetByName(SHEET_NAMES.REDEMPTIONS);
  if (!redeemSheet) {
    redeemSheet = ss.insertSheet(SHEET_NAMES.REDEMPTIONS);
    redeemSheet.appendRow(['timestamp', 'voucherCode', 'guestName', 'serviceType']);
  }
  
  redeemSheet.appendRow([new Date().toISOString(), voucherCode, guestName, serviceType]);
  
  return createResponse({ status: "success", message: "Redemption logged for: " + serviceType });
}

/**
 * Helper to create JSON response
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 2. React Frontend Code (The Client)
This code interacts with the script above.

### **Helper Hook (`useSheetData.ts`)**
Create this file to make fetching data easy across your app.

```typescript
import { useState, useEffect } from 'react';

// Replace with your actual deployment URL
const APPS_SCRIPT_URL = 'YOUR_DEPLOYMENT_URL_HERE';

export function useSheetData(sheetName: string) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        const callbackName = `load${sheetName}${Date.now()}`;
        
        // Define global callback
        (window as any)[callbackName] = (response: any) => {
            setData(response);
            setLoading(false);
            // Cleanup matches the dynamic name
            delete (window as any)[callbackName];
        };

        const script = document.createElement('script');
        script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=${sheetName}`;
        document.body.appendChild(script);

        script.onerror = () => {
            setError(true);
            setLoading(false);
        };

        return () => {
            document.body.removeChild(script);
        };
    }, [sheetName]);

    const addRow = async (newData: any) => {
        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for Google Apps Script
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    sheet: sheetName,
                    data: newData
                })
            });
            // Opimistically update UI or re-fetch
            setData(prev => [...prev, newData]);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    return { data, loading, error, addRow };
}
```

### **Usage Example**
How to use it in your Booking Page.

```tsx
import { useSheetData } from './useSheetData';

export default function BookingPage() {
    // Connects to "Bookings" sheet automatically
    const { data, loading, addRow } = useSheetData('Bookings');

    const handleNewBooking = () => {
        addRow({
            Name: "John Doe",
            Date: "2026-02-01",
            Staff: "Sarah",
            Status: "Confirmed"
        });
    };

    if (loading) return <div>Loading bookings...</div>;

    return (
        <div>
            <button onClick={handleNewBooking}>Add Test Booking</button>
            {data.map((booking, i) => (
                <div key={i}>{booking.Name} - {booking.Date}</div>
            ))}
        </div>
    );
}
```

## 3. Important Tips
*   **Case Sensitivity**: The keys in your JSON object (e.g., `Name`, `Date`) must EXACTLY match the header row in your Google Sheet (Row 1).
*   **Security**: Anyone with the URL can add data. For a simple internal tool, this is fine. For a public app, you might want to add a simple "password" field to the data or check for a specific logic in the script.
*   **Cache**: The JSONP fetch has a timestamp cache buster built-in to the hook example (`Date.now()`) to ensure you always get fresh data.
