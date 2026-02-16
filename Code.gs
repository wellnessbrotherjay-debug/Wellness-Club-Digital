/**
 * Wellness Club Digital - Google Apps Script
 * Combined script for fetching data AND handling actions
 */

const SHEET_ID = '1oWXJW6jl6Q-32TsG3v_kD9SpK8w8Hjhv6B0l5wgBol';

/**
 * Normalizes headers to match frontend keys.
 * Maps: "Service Type", "REDEEMED_SERVICE", "Redeemed Service" -> "serviceType"
 * Maps: "code", "Voucher Code" -> "voucherCode"
 */
function normalizeHeaders(headers) {
    const map = {
        'code': 'voucherCode',
        'vouchercode': 'voucherCode',
        'voucher code': 'voucherCode',
        'guestname': 'guestName',
        'guest name': 'guestName',
        'username': 'guestName',
        'name': 'guestName',
        'roomnumber': 'roomNumber',
        'room number': 'roomNumber',
        'checkin': 'checkIn',
        'check in': 'checkIn',
        'checked in': 'checkIn',
        'checkout': 'checkOut',
        'check out': 'checkOut',
        'checked out': 'checkOut',
        'servicetype': 'serviceType',
        'service type': 'serviceType',
        'redeemed_service': 'serviceType',
        'redeemed service': 'serviceType',
        'email_sent': 'emailStatus',
        'email': 'email',
        'email address': 'email',
        'whatsapp': 'whatsapp',
        'phone': 'whatsapp',
        'phone number': 'whatsapp',
        'whatsapp number': 'whatsapp',
        'email status': 'emailStatus',
        'input_path': 'inputPath',
        'input path': 'inputPath',
        'services': 'services',
        'status': 'status',
        'created_at': 'created_at',
        'redeemed_at': 'redeemed_at',
        'pax': 'pax'
    };

    return headers.map(h => {
        const normalized = String(h).toLowerCase().trim();
        return map[normalized] || normalized;
    });
}

function doGet(e) {
    const callback = e.parameter ? e.parameter.callback : null;
    const sheetType = e.parameter ? e.parameter.sheet || 'Vouchers' : 'Vouchers';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    try {
        const sheet = ss.getSheetByName(sheetType === 'Redemptions' ? 'Redemptions' : 'Vouchers') || ss.getSheetByName('VoucherCodes');
        if (!sheet) return returnJson(callback, { status: "error", message: "Sheet not found: " + sheetType });

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return returnJson(callback, []);

        const rawHeaders = data[0];
        const normalizedHeaders = normalizeHeaders(rawHeaders);
        const rows = data.slice(1);

        const result = rows.map(row => {
            const obj = {};
            normalizedHeaders.forEach((header, index) => {
                obj[header] = row[index] !== undefined && row[index] !== null ? row[index] : '';
            });
            return obj;
        });

        return returnJson(callback, result);
    } catch (error) {
        return returnJson(callback, { status: "error", message: error.toString() });
    }
}

function returnJson(callback, data) {
    const jsonString = JSON.stringify(data);
    if (callback) {
        const jsonp = `${callback}(${jsonString})`;
        return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
        return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

    // --- REDEEM VOUCHER ---
    if (data.action === 'redeem' || data.status === 'Redeemed') {
        const voucherCode = (data.voucherCode || data.code || '').trim().toUpperCase();
        const sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        
        if (!sheet) return returnJson({ status: "error", message: "Sheet not found" });

        const values = sheet.getDataRange().getValues();
        const rawHeaders = values[0];
        const normalizedHeaders = normalizeHeaders(rawHeaders);
        
        // Find or create 'redeemed_service' and other critical columns
        const ensureColumn = (name) => {
            let idx = normalizedHeaders.indexOf(name);
            if (idx === -1) {
                sheet.getRange(1, rawHeaders.length + 1).setValue(name);
                rawHeaders.push(name);
                normalizedHeaders.push(name);
                idx = rawHeaders.length - 1;
            }
            return idx + 1;
        };

        const statusCol = ensureColumn('status');
        const redeemedAtCol = ensureColumn('redeemed_at');
        const serviceTypeCol = ensureColumn('serviceType');
        const emailStatusCol = ensureColumn('emailStatus');
        const inputPathCol = ensureColumn('inputPath');
        const codeCol = normalizedHeaders.indexOf('voucherCode') + 1;

        if (codeCol === 0) return returnJson({ status: "error", message: "Code column missing" });

        for (let i = 1; i < values.length; i++) {
            if (String(values[i][codeCol - 1]).toUpperCase() === voucherCode) {
                const redeemedAtValue = data.redeemedAt || new Date().toISOString();
                sheet.getRange(i + 1, statusCol).setValue('Redeemed');
                sheet.getRange(i + 1, redeemedAtCol).setValue(redeemedAtValue);
                sheet.getRange(i + 1, serviceTypeCol).setValue(data.serviceType || '');
                sheet.getRange(i + 1, emailStatusCol).setValue(data.emailStatus || 'Sent');
                sheet.getRange(i + 1, inputPathCol).setValue(data.inputPath || '');

                logToRedemptions(ss, {
                    timestamp: redeemedAtValue,
                    voucherCode: voucherCode,
                    guestName: data.userName || data.guestName || values[i][normalizedHeaders.indexOf('guestName')] || '',
                    serviceType: data.serviceType || '',
                    roomNumber: data.roomNumber || values[i][normalizedHeaders.indexOf('roomNumber')] || '',
                    emailStatus: data.emailStatus || 'Sent',
                    inputPath: data.inputPath || ''
                });

                return returnJson({ status: "success", message: "Redeemed Successfully" });
            }
        }
        return returnJson({ status: "error", message: "Voucher not found" });
    }

    // --- CREATE NEW (OR MANUAL) ---
    if (data.action === 'create' || data.action === 'manual' || data.voucherCode) {
        const sheet = ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes') || ss.insertSheet('Vouchers');
        
        // Ensure header row exists
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['voucherCode', 'guestName', 'status', 'roomNumber', 'checkIn', 'checkOut', 'services', 'serviceType', 'emailStatus', 'inputPath', 'created_at', 'redeemed_at', 'pax', 'email', 'whatsapp']);
        }
        
        const rawHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const headers = normalizeHeaders(rawHeaders);

        // Helper to find or add column
        const getColumnIndex = (name) => {
            let idx = headers.indexOf(name);
            if (idx === -1) {
                sheet.getRange(1, rawHeaders.length + 1).setValue(name);
                headers.push(name);
                rawHeaders.push(name);
                return rawHeaders.length;
            }
            return idx + 1;
        };

        const nextRow = sheet.getLastRow() + 1;
        
        // Explicitly set each value to ensure mapping correctness
        sheet.getRange(nextRow, getColumnIndex('voucherCode')).setValue(data.voucherCode || data.code || '');
        sheet.getRange(nextRow, getColumnIndex('guestName')).setValue(data.userName || data.guestName || '');
        sheet.getRange(nextRow, getColumnIndex('status')).setValue(data.status || 'Created');
        sheet.getRange(nextRow, getColumnIndex('roomNumber')).setValue(data.roomNumber || '');
        sheet.getRange(nextRow, getColumnIndex('checkIn')).setValue(data.checkIn || '');
        sheet.getRange(nextRow, getColumnIndex('checkOut')).setValue(data.checkOut || '');
        sheet.getRange(nextRow, getColumnIndex('services')).setValue(data.services || '');
        sheet.getRange(nextRow, getColumnIndex('created_at')).setValue(data.created_at || data.createdAt || new Date().toISOString());
        sheet.getRange(nextRow, getColumnIndex('pax')).setValue(data.pax || 1);
        sheet.getRange(nextRow, getColumnIndex('email')).setValue(data.email || '');
        sheet.getRange(nextRow, getColumnIndex('whatsapp')).setValue(data.whatsapp || '');

        if (data.status === 'Redeemed') {
            const redeemedAt = data.redeemed_at || data.redeemedAt || new Date().toISOString();
            sheet.getRange(nextRow, getColumnIndex('redeemed_at')).setValue(redeemedAt);
            sheet.getRange(nextRow, getColumnIndex('serviceType')).setValue(data.serviceType || '');
            
            logToRedemptions(ss, {
                timestamp: redeemedAt,
                voucherCode: data.voucherCode || data.code || '',
                guestName: data.userName || data.guestName || '',
                serviceType: data.serviceType || '',
                roomNumber: data.roomNumber || '',
                emailStatus: data.emailStatus || 'Sent'
            });
        }
        
        return returnJson({ status: "success" });
    }

    return returnJson({ status: "error", message: "Unknown action" });
}

function logToRedemptions(ss, entry) {
    let sheet = ss.getSheetByName('Redemptions');
    if (!sheet) {
        sheet = ss.insertSheet('Redemptions');
        sheet.appendRow(['timestamp', 'voucherCode', 'guestName', 'serviceType', 'roomNumber', 'emailStatus', 'inputPath']);
    }
    
    const values = sheet.getDataRange().getValues();
    const headers = normalizeHeaders(values[0]);
    const codeCol = headers.indexOf('voucherCode');
    
    if (codeCol !== -1) {
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][codeCol]).trim().toUpperCase() === String(entry.voucherCode).trim().toUpperCase()) {
                // Update existing row
                const rowRange = sheet.getRange(i + 1, 1, 1, headers.length);
                const updatedRowData = headers.map(h => {
                    switch(h) {
                        case 'timestamp': return entry.timestamp;
                        case 'voucherCode': return entry.voucherCode;
                        case 'guestName': return entry.guestName;
                        case 'serviceType': return entry.serviceType;
                        case 'roomNumber': return entry.roomNumber;
                        case 'emailStatus': return entry.emailStatus;
                        case 'inputPath': return entry.inputPath;
                        default: return values[i][headers.indexOf(h)];
                    }
                });
                rowRange.setValues([updatedRowData]);
                return;
            }
        }
    }
    
    // Not found, append new
    sheet.appendRow([entry.timestamp, entry.voucherCode, entry.guestName, entry.serviceType, entry.roomNumber, entry.emailStatus, entry.inputPath]);
}

function returnJson(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
    return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
