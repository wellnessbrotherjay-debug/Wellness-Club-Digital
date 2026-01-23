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
```javascript
// CONFIGURATION
const SHEET_NAMES = {
  VOUCHERS: "Vouchers",
  STAFF: "Staff",
  BOOKINGS: "Bookings"
};

/**
 * Handles GET requests (Reading data)
 * Uses JSONP to bypass CORS restrictions for reading data
 */
function doGet(e) {
  const params = e.parameter;
  const callback = params.callback;
  const sheetName = params.sheet || SHEET_NAMES.VOUCHERS; // Default to Vouchers

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  // If sheet doesn't exist, return error
  if (!sheet) {
    return ContentService.createTextOutput(
      callback + "(" + JSON.stringify({ error: "Sheet not found" }) + ")"
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // Read all data
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Convert header to camelCase if needed, or keep simple
      obj[header] = row[index];
    });
    return obj;
  });

  // Return data wrapped in callback function
  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify(data) + ")"
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Handles POST requests (Writing data)
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const postData = JSON.parse(e.postData.contents);
    const sheetName = postData.sheet || SHEET_NAMES.VOUCHERS;
    
    // Get or Create Sheet
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // If sheet doesn't exist, create it and add headers based on first data item
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // You might want to define fixed headers here if strict schema is needed
      const headers = Object.keys(postData.data);
      sheet.appendRow(headers);
    }
    
    // Append the row
    // Note: This simple version assumes the columns are in the same order as the object keys.
    // For production, you should match keys to header column indices.
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => {
      return postData.data[header] || ""; // Fill empty string if data missing for that column
    });
    
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
