/**
 * Wellness Club Digital - Google Apps Script
 * Combined script for fetching data AND handling actions
 */

// TODO: Replace with your actual Google Sheet ID
// Find it in your sheet URL: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// If using the active spreadsheet (bound script), you can use:
// const ss = SpreadsheetApp.getActiveSpreadsheet();
// Otherwise, open by ID:
// const ss = SpreadsheetApp.openById(SHEET_ID);

/**
 * Handle GET requests - Fetch Vouchers or Redemptions data
 */
function doGet(e) {
    const callback = e.parameter.callback;
    const sheet = e.parameter.sheet || 'Vouchers';

    let data;

    try {
        // Use active spreadsheet if bound, otherwise open by ID
        const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

        if (sheet === 'Vouchers') {
            data = getVouchersData(ss);
        } else if (sheet === 'Redemptions') {
            data = getRedemptionsData(ss);
        } else {
            data = [];
        }

        // Return as JSONP for cross-origin requests
        const jsonp = `${callback}(${JSON.stringify(data)})`;
        return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);

    } catch (error) {
        console.error('Error in doGet:', error);
        const errorResponse = `${callback}([])`;
        return ContentService.createTextOutput(errorResponse).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
}

/**
 * Fetch all data from Vouchers sheet
 */
function getVouchersData(ss) {
    const sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
    if (!sheet) {
        console.log('Vouchers sheet not found');
        return [];
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined && row[index] !== null ? row[index] : '';
        });
        return obj;
    });
}

/**
 * Fetch all data from Redemptions sheet
 */
function getRedemptionsData(ss) {
    const sheet = ss.getSheetByName('Redemptions');
    if (!sheet) {
        console.log('Redemptions sheet not found');
        return [];
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined && row[index] !== null ? row[index] : '';
        });
        return obj;
    });
}

/**
 * Handle POST requests - Actions (log non-issuance, delete, redeem, etc.)
 */
function doPost(e) {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

    // --- LOG NON-ISSUANCE (Insights) ---
    if (data.action === 'log_non_issuance') {
        var sheet = ss.getSheetByName('NonIssuanceLogs') || ss.insertSheet('NonIssuanceLogs');

        // Setup headers if the sheet is empty
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Timestamp', 'Room Number', 'Duration (Nights)', 'Reason/Feedback']);
            sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');
        }

        // Add the log entry
        sheet.appendRow([
            new Date(),
            data.roomNumber,
            data.duration,
            data.reason
        ]);

        return ContentService.createTextOutput("Logged Successfully").setMimeType(ContentService.MimeType.TEXT);
    }

    // --- DELETE VOUCHER ---
    if (data.action === 'delete') {
        var sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        var rows = sheet.getDataRange().getValues();
        var codesToDelete = Array.isArray(data.voucherCode) ? data.voucherCode : [data.voucherCode];

        var deletedCount = 0;
        // Work backwards when deleting rows
        for (var i = rows.length - 1; i >= 1; i--) {
            if (codesToDelete.indexOf(rows[i][0]) !== -1) {
                sheet.deleteRow(i + 1);
                deletedCount++;
            }
        }
        return ContentService.createTextOutput(deletedCount + " Deleted").setMimeType(ContentService.MimeType.TEXT);
    }

    // --- REDEEM VOUCHER ---
    if (data.action === 'redeem' || data.status === 'Redeemed') {
        var sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        var rows = sheet.getDataRange().getValues();
        var voucherCode = data.voucherCode || data.code;
        var headers = rows[0];

        // Find the voucher row
        for (var i = 1; i < rows.length; i++) {
            if (rows[i][0] === voucherCode) {
                // Update status column
                var statusCol = headers.indexOf('status') + 1;
                var redeemedAtCol = headers.indexOf('redeemed_at') + 1;

                if (statusCol > 0) {
                    sheet.getRange(i + 1, statusCol).setValue('Redeemed');
                }
                if (redeemedAtCol > 0) {
                    sheet.getRange(i + 1, redeemedAtCol).setValue(new Date().toISOString());
                }

                // Also log to Redemptions sheet if it exists
                var redemptionsSheet = ss.getSheetByName('Redemptions');
                if (redemptionsSheet) {
                    redemptionsSheet.appendRow([
                        new Date().toISOString(),  // timestamp
                        voucherCode,                // voucherCode
                        data.userName || data.guestName || rows[i][headers.indexOf('guestName')] || '',  // guestName
                        data.services || rows[i][headers.indexOf('services')] || '',  // serviceType
                        data.roomNumber || rows[i][headers.indexOf('roomNumber')] || ''  // roomNumber
                    ]);
                }

                return ContentService.createTextOutput("Redeemed Successfully").setMimeType(ContentService.MimeType.TEXT);
            }
        }

        return ContentService.createTextOutput("Voucher not found").setMimeType(ContentService.MimeType.TEXT);
    }

    // --- CREATE NEW VOUCHER (Manual Entry) ---
    if (data.action === 'create' || data.voucherCode) {
        var sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        // Build row data based on headers
        var rowData = headers.map(header => {
            switch(header) {
                case 'code': return data.voucherCode || data.code || '';
                case 'guestName': return data.userName || data.guestName || '';
                case 'status': return data.status || 'Redeemed';
                case 'roomNumber': return data.roomNumber || '';
                case 'checkIn': return data.checkIn || '';
                case 'checkOut': return data.checkOut || '';
                case 'services': return data.services || '';
                case 'created_at': return data.created_at || new Date().toISOString();
                case 'redeemed_at': return data.redeemed_at || new Date().toISOString();
                case 'imageUrl': return data.imageUrl || '';
                case 'secondGuestName': return data.secondGuestName || '';
                case 'pax': return data.pax || 1;
                default: return '';
            }
        });

        sheet.appendRow(rowData);

        // Also log to Redemptions sheet
        var redemptionsSheet = ss.getSheetByName('Redemptions');
        if (redemptionsSheet) {
            redemptionsSheet.appendRow([
                data.redeemed_at || new Date().toISOString(),
                data.voucherCode || data.code || '',
                data.userName || data.guestName || '',
                data.services || '',
                data.roomNumber || ''
            ]);
        }

        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput("Unknown action").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle OPTIONS requests for CORS
 */
function doOptions(e) {
    return ContentService.createTextOutput("")
        .setMimeType(ContentService.MimeType.TEXT);
}
