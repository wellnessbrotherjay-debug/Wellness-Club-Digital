/**
 * Wellness Club Digital - Google Apps Script
 * Combined script for fetching data AND handling actions
 */

const SHEET_ID = '1oWXJW6jl6Q-32TsG3v_kD9SpK8kW8Hjhv6B0l5wgBoI'; // Verified from user text
const SHEET_ID_ALT = '1oWXJW6jl6Q-32TsG3v_kD9SpK8kW8Hjhv6B0l5wgBoI'; // Variation with lowercase L

/**
 * Normalizes headers to match frontend keys.
 * Maps: "Service Type", "REDEEMED_SERVICE", "Redeemed Service" -> "serviceType"
 * Maps: "code", "Voucher Code" -> "voucherCode"
 */
function normalizeHeaders(headers) {
    const map = {
        'date': 'voucherCode',
        'code': 'voucherCode',
        'vouchercode': 'voucherCode',
        'voucher code': 'voucherCode',
        'id': 'voucherCode',
        'description': 'guestName',
        'guestname': 'guestName',
        'guest name': 'guestName',
        'username': 'guestName',
        'name': 'guestName',
        'category': 'status',
        'roomnumber': 'roomNumber',
        'room number': 'roomNumber',
        'room': 'roomNumber',
        'amount': 'roomNumber',
        'checkin': 'checkIn',
        'check in': 'checkIn',
        'checked in': 'checkIn',
        'type': 'checkIn',
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
        'guest email': 'email',
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
        'expires_at': 'checkOut',
        'pax': 'pax',
        'guests': 'pax'
    };

    return headers.map(h => {
        const normalized = String(h).toLowerCase().trim();
        return map[normalized] || normalized;
    });
}

function doGet(e) {
    const callback = e.parameter ? e.parameter.callback : null;
    const sheetType = e.parameter ? e.parameter.sheet || 'Vouchers' : 'Vouchers';
    try {
        let ss;
        try {
            ss = SpreadsheetApp.getActiveSpreadsheet();
            if (!ss) ss = SpreadsheetApp.openById(SHEET_ID);
        } catch (e) {
            try {
                ss = SpreadsheetApp.openById(SHEET_ID_ALT);
            } catch (e2) {
                return returnJson(callback, { 
                    status: "error", 
                    message: "Spreadsheet Access Error. Ensure the script is deployed as 'Me' and 'Anyone' has access.",
                    details: e2.toString(),
                    triedIds: [SHEET_ID, SHEET_ID_ALT]
                });
            }
        }

        const isRedemptions = sheetType === 'Redemptions';
        const sheet = isRedemptions
            ? (ss.getSheetByName('Redemptions') || ss.getSheetByName('redemptions'))
            : (ss.getSheetByName('voucher') ||
               ss.getSheetByName('Vouchers') ||
               ss.getSheetByName('VoucherCodes') ||
               ss.getSheetByName('Sheet1') ||
               ss.getSheets()[0]);
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

// Consolidated Return JSON function
function returnJson(callback, data) {
    // Handle single-argument calls (from doPost or internal helpers)
    if (arguments.length === 1) {
        data = callback;
        callback = null;
    }
    
    try {
        const jsonString = JSON.stringify(data);
        if (callback) {
            const jsonp = `${callback}(${jsonString})`;
            return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
            return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
        }
    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "JSON Serialization Error",
            details: e.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'ping') return returnJson({ status: "success", message: "pong" });
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

    // --- REDEEM VOUCHER ---
    if (data.action === 'redeem' || data.status === 'Redeemed' || data.category === 'Redeemed') {
        const voucherCode = (data.voucherCode || data.code || data.date || '').trim().toUpperCase();
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        
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
                // VALIDATE: Check if redemption is within valid stay period
                const checkInCol = normalizedHeaders.indexOf('checkIn');
                const checkOutCol = normalizedHeaders.indexOf('checkOut');

                if (checkInCol >= 0 && checkOutCol >= 0) {
                    const checkInValue = values[i][checkInCol];
                    const checkOutValue = values[i][checkOutCol];

                    // Only validate if both dates exist
                    if (checkInValue && checkOutValue) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const checkInDate = new Date(checkInValue);
                        checkInDate.setHours(0, 0, 0, 0);

                        const checkOutDate = new Date(checkOutValue);
                        checkOutDate.setHours(0, 0, 0, 0);

                        // Block redemption if outside valid stay period
                        if (today < checkInDate) {
                            return returnJson({
                                status: "error",
                                message: "REJECTED: Voucher not yet valid. (Valid from " + checkInValue + ")"
                            });
                        }
                        if (today > checkOutDate) {
                            return returnJson({
                                status: "error",
                                message: "REJECTED: Voucher EXPIRED. (Valid until " + checkOutValue + ")"
                            });
                        }
                    }
                }

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

    // --- CREATE NEW (OR MANUAL UPDATE) ---
    if (data.action === 'create' || data.action === 'manual' || data.voucherCode) {
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes') || ss.insertSheet('voucher');
        
        // Ensure header row exists
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['voucherCode', 'guestName', 'status', 'roomNumber', 'checkIn', 'checkOut', 'services', 'serviceType', 'emailStatus', 'inputPath', 'created_at', 'redeemed_at', 'pax', 'email', 'whatsapp']);
        }
        
        const dataRange = sheet.getDataRange().getValues();
        const rawHeaders = dataRange[0];
        const headers = normalizeHeaders(rawHeaders);
        
        const voucherCode = data.voucherCode || data.code || data.date || '';
        let targetRow = -1;
        
        // Search for existing voucher
        if (voucherCode) {
            const codeIdx = headers.indexOf('voucherCode');
            for (let i = 1; i < dataRange.length; i++) {
                if (String(dataRange[i][codeIdx]).trim().toUpperCase() === voucherCode.toUpperCase()) {
                    targetRow = i + 1;
                    break;
                }
            }
        }

        // Helper to find or add column
        const getColumnIndex = (name) => {
            let idx = headers.indexOf(name);
            if (idx === -1) {
                const prettyMap = {
                    'voucherCode': 'Date',
                    'guestName': 'Description',
                    'status': 'Category',
                    'roomNumber': 'Amount',
                    'checkIn': 'Type',
                    'checkOut': 'checkOut',
                    'services': 'services',
                    'pax': 'Pax',
                    'email': 'Email',
                    'whatsapp': 'WhatsApp',
                    'created_at': 'created_at',
                    'redeemed_at': 'redeemed_at',
                    'serviceType': 'ServiceType',
                    'emailStatus': 'EmailStatus',
                    'inputPath': 'InputPath'
                };
                const prettyName = prettyMap[name] || name;
                sheet.getRange(1, rawHeaders.length + 1).setValue(prettyName);
                headers.push(name);
                rawHeaders.push(prettyName);
                return rawHeaders.length;
            }
            return idx + 1;
        };

        const finalRow = targetRow !== -1 ? targetRow : sheet.getLastRow() + 1;
        
        // Set values (only update provided fields if updating, or all if creating)
        const setVal = (name, val) => {
            if (val !== undefined && val !== null) {
                sheet.getRange(finalRow, getColumnIndex(name)).setValue(val);
            }
        };

        setVal('voucherCode', voucherCode);
        setVal('guestName', data.userName || data.guestName || data.description || (targetRow !== -1 ? undefined : ''));
        setVal('status', data.status || data.category || (targetRow !== -1 ? undefined : 'Created'));
        setVal('roomNumber', data.roomNumber || data.amount || (targetRow !== -1 ? undefined : ''));
        setVal('checkIn', data.checkIn || data.type || (targetRow !== -1 ? undefined : ''));
        setVal('checkOut', data.checkOut || data.checkout || (targetRow !== -1 ? undefined : ''));
        setVal('services', data.services || (targetRow !== -1 ? undefined : ''));
        setVal('pax', data.pax || (targetRow !== -1 ? undefined : 1));
        setVal('email', data.email || data.emailAddress || (targetRow !== -1 ? undefined : ''));
        setVal('whatsapp', data.whatsapp || data.phone || data.phoneNumber || (targetRow !== -1 ? undefined : ''));
        
        if (targetRow === -1) {
            setVal('created_at', data.created_at || data.createdAt || new Date().toISOString());
        }

        if (data.status === 'Redeemed') {
            const redeemedAt = data.redeemed_at || data.redeemedAt || new Date().toISOString();
            setVal('redeemed_at', redeemedAt);
            setVal('serviceType', data.serviceType || '');
            
            logToRedemptions(ss, {
                timestamp: redeemedAt,
                voucherCode: voucherCode,
                guestName: data.userName || data.guestName || (targetRow !== -1 ? dataRange[targetRow-1][headers.indexOf('guestName')] : ''),
                serviceType: data.serviceType || '',
                roomNumber: data.roomNumber || (targetRow !== -1 ? dataRange[targetRow-1][headers.indexOf('roomNumber')] : ''),
                emailStatus: data.emailStatus || 'Sent'
            });
        } else if (data.status === 'Expired') {
            setVal('redeemed_at', ''); // Clear redeemed date if marking expired
            setVal('serviceType', '');
        }
        
        return returnJson({ status: "success", message: targetRow !== -1 ? "Updated Successfully" : "Created Successfully" });
    }

    // --- CLEANUP DUPLICATES ---
    if (data.action === 'cleanupDuplicates') {
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        if (!sheet) return returnJson({ status: "error", message: "Sheet not found" });
        const values = sheet.getDataRange().getValues();
        const headers = normalizeHeaders(values[0]);
        const codeIdx = headers.indexOf('voucherCode');
        const statusIdx = headers.indexOf('status');
        
        const map = {}; // code -> { rowIndex, statusPriority }
        const statusPriority = { 'Redeemed': 3, 'Expired': 2, 'Created': 1, '': 0 };
        
        const toDelete = [];
        for (let i = 1; i < values.length; i++) {
            const code = String(values[i][codeIdx]).trim().toUpperCase();
            const status = String(values[i][statusIdx]).trim();
            const priority = statusPriority[status] || 0;
            
            if (!code) continue;
            
            if (map[code]) {
                if (priority > map[code].priority) {
                    // Current row is better, delete the old one
                    toDelete.push(map[code].rowIndex);
                    map[code] = { rowIndex: i + 1, priority: priority };
                } else {
                    // Old row is better or same, delete current one
                    toDelete.push(i + 1);
                }
            } else {
                map[code] = { rowIndex: i + 1, priority: priority };
            }
        }
        
        // Sort toDelete descending to prevent shifting issues
        toDelete.sort((a, b) => b - a);
        
        let deletedCount = 0;
        for (const row of toDelete) {
            sheet.deleteRow(row);
            deletedCount++;
        }
        
        return returnJson({ status: "success", deleted: deletedCount });
    }

    // --- DELETE VOUCHER ---
    if (data.action === 'deleteVoucher') {
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        if (!sheet) return returnJson({ status: "error", message: "Sheet not found" });
        const values = sheet.getDataRange().getValues();
        const headers = normalizeHeaders(values[0]);
        const codeIdx = headers.indexOf('voucherCode');
        const codeToDelete = (data.voucherCode || '').trim().toUpperCase();
        
        let deletedCount = 0;
        for (let i = values.length - 1; i >= 1; i--) {
            if (String(values[i][codeIdx]).trim().toUpperCase() === codeToDelete) {
                sheet.deleteRow(i + 1);
                deletedCount++;
            }
        }
        return returnJson({ status: "success", deleted: deletedCount });
    }

    // --- DELETE TEST VOUCHERS ---
    if (data.action === 'deleteTests') {
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        if (!sheet) return returnJson({ status: "error", message: "Sheet not found" });

        const values = sheet.getDataRange().getValues();
        if (values.length <= 1) return returnJson({ status: "success", deleted: 0, message: "No data to delete" });

        const rawHeaders = values[0];
        const normalizedHeaders = normalizeHeaders(rawHeaders);

        const voucherCodeCol = normalizedHeaders.indexOf('voucherCode');
        const guestNameCol = normalizedHeaders.indexOf('guestName');
        const emailCol = normalizedHeaders.indexOf('email');

        if (voucherCodeCol === -1) return returnJson({ status: "error", message: "voucherCode column missing" });

        let deletedCount = 0;
        const rowsToDelete = [];

        // Find rows to delete (start from index 1 since 0 is header)
        for (let i = 1; i < values.length; i++) {
            const shouldDelete = false;

            // Check voucher code contains "test" (case insensitive)
            if (voucherCodeCol >= 0) {
                const voucherCode = String(values[i][voucherCodeCol] || '').toLowerCase();
                if (voucherCode.includes('test')) {
                    rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
                    continue;
                }
            }

            // Check email contains sbodyfit or wellnessbrotherjay
            if (emailCol >= 0) {
                const email = String(values[i][emailCol] || '').toLowerCase();
                if (email.includes('sbodyfit') || email.includes('wellnessbrotherjay')) {
                    rowsToDelete.push(i + 1);
                    continue;
                }
            }

            // Check guest name contains "test"
            if (guestNameCol >= 0) {
                const guestName = String(values[i][guestNameCol] || '').toLowerCase();
                if (guestName.includes('test')) {
                    rowsToDelete.push(i + 1);
                    continue;
                }
            }
        }

        // Delete rows in reverse order to avoid index shifting
        rowsToDelete.reverse().forEach(rowIndex => {
            sheet.deleteRow(rowIndex);
            deletedCount++;
        });

        return returnJson({
            status: "success",
            deleted: deletedCount,
            message: "Deleted " + deletedCount + " test vouchers"
        });
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

function setupStandardHeaders() {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
    if (!sheet) {
        Logger.log('Sheet not found');
        return;
    }
    
    const required = [
        ['voucherCode', 'Date'],
        ['guestName', 'Description'],
        ['status', 'Category'],
        ['roomNumber', 'Amount'],
        ['checkIn', 'Type'],
        ['checkOut', 'checkOut'],
        ['services', 'services'],
        ['pax', 'Pax'],
        ['email', 'Email'],
        ['whatsapp', 'WhatsApp'],
        ['created_at', 'created_at'],
        ['redeemed_at', 'redeemed_at'],
        ['serviceType', 'ServiceType'],
        ['emailStatus', 'EmailStatus'],
        ['inputPath', 'InputPath']
    ];
    
    const values = sheet.getDataRange().getValues();
    const rawHeaders = values[0];
    const headers = normalizeHeaders(rawHeaders);
    
    required.forEach(req => {
        const [internal, pretty] = req;
        if (headers.indexOf(internal) === -1) {
            sheet.getRange(1, sheet.getLastColumn() + 1).setValue(pretty);
            headers.push(internal);
            Logger.log('Added column: ' + pretty);
        }
    });
    
    Logger.log('Sheet headers synchronization complete.');
}

// Function deleted to avoid duplicate conflicts

function doOptions(e) {
    return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
