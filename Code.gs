/**
 * Wellness Club Digital - Google Apps Script
 * Combined script for fetching data AND handling actions
 */

const SHEET_ID = '1oWXJW6jl6Q-32TsG3v_kD9SpK8kW8Hjhv6B0I5wgBoI'; // Updated with correct sheet ID
const SHEET_ID_ALT = '1oWXJW6jl6Q-32TsG3v_kD9SpK8kW8Hjhv6B0I5wgBoI'; // Backup with same ID
const REPORT_EMAIL = 'wellnessbrotherjay@gmail.com'; // Report email recipient

/**
 * Normalizes headers to match frontend keys.
 * Maps: "Service Type", "REDEEMED_SERVICE", "Redeemed Service" -> "serviceType"
 * Maps: "code", "Voucher Code" -> "voucherCode"
 */
function normalizeHeaders(headers) {
    const map = {
        // Date column -> voucherCode
        'date': 'voucherCode',
        'code': 'voucherCode',
        'vouchercode': 'voucherCode',
        'voucher code': 'voucherCode',
        'id': 'voucherCode',
        // Description -> guestName
        'description': 'guestName',
        'guestname': 'guestName',
        'guest name': 'guestName',
        'name': 'guestName',
        // Category -> status
        'category': 'status',
        // Amount -> roomNumber
        'amount': 'roomNumber',
        'roomnumber': 'roomNumber',
        'room number': 'roomNumber',
        'room': 'roomNumber',
        // Type -> checkIn (not used but mapped)
        'type': 'checkIn',
        // checkOut -> checkOut
        'checkout': 'checkOut',
        'check out': 'checkOut',
        // Email -> email
        'email': 'email',
        'email address': 'email',
        // Phone number -> whatsapp
        'phone': 'whatsapp',
        'phone number': 'whatsapp',
        'whatsapp': 'whatsapp',
        // Status -> status
        'status': 'status',
        // Created -> created_at
        'created': 'created_at',
        'created_at': 'created_at',
        // Redeemed -> redeemed_at
        'redeemed': 'redeemed_at',
        'redeemed_at': 'redeemed_at',
        'redeem date': 'redeemed_at',
        // Redeemed service -> redeemed_service
        'redeemed_service': 'redeemed_service',
        'redeemed service': 'redeemed_service',
        'service redeemed': 'redeemed_service',
        // Pax -> pax
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

    // --- SEND REPORT ON DEMAND ---
    if (data.action === 'sendReport') {
        const period = data.period || 'daily';
        try {
            if (period === 'weekly') {
                sendWeeklyReport();
            } else {
                sendDailyReport();
            }
            return returnJson({ status: 'success', message: 'Report sent to ' + REPORT_EMAIL });
        } catch (err) {
            return returnJson({ status: 'error', message: err.toString() });
        }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

    // --- REDEEM VOUCHER ---
    if (data.action === 'redeem' || data.status === 'Redeemed' || data.category === 'Redeemed') {
        const voucherCode = (data.voucherCode || data.code || data.date || '').trim().toUpperCase();
        const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers') || ss.getSheetByName('VoucherCodes');
        
        if (!sheet) return returnJson({ status: "error", message: "Sheet not found" });

        const values = sheet.getDataRange().getValues();
        const rawHeaders = values[0];
        const normalizedHeaders = normalizeHeaders(rawHeaders);
        
        // Map column indices to exact column letters
        const statusCol = normalizedHeaders.indexOf('status') + 1;
        const redeemedAtCol = normalizedHeaders.indexOf('redeemed_at') + 1;
        const redeemedServiceCol = normalizedHeaders.indexOf('redeemed_service') + 1;
        const emailCol = normalizedHeaders.indexOf('email') + 1;
        const phoneCol = normalizedHeaders.indexOf('whatsapp') + 1;
        const codeCol = normalizedHeaders.indexOf('voucherCode') + 1;

        // Validate required columns exist
        if (codeCol === 0) return returnJson({ status: "error", message: "Missing 'Date' column (voucherCode)" });
        if (statusCol === 0) return returnJson({ status: "error", message: "Missing 'Category' column (status)" });
        if (redeemedServiceCol === 0) return returnJson({ status: "error", message: "Missing 'redeemed_service' column" });

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
                const serviceValue = data.serviceType || '';

                // Update ONLY the columns that exist in your sheet
                sheet.getRange(i + 1, statusCol).setValue('Redeemed');
                if (redeemedAtCol > 0) sheet.getRange(i + 1, redeemedAtCol).setValue(redeemedAtValue);
                if (redeemedServiceCol > 0) sheet.getRange(i + 1, redeemedServiceCol).setValue(serviceValue);
                if (emailCol > 0 && data.email) sheet.getRange(i + 1, emailCol).setValue(data.email);
                if (phoneCol > 0 && data.phone) sheet.getRange(i + 1, phoneCol).setValue(data.phone);

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
            sheet.appendRow(['voucherCode', 'guestName', 'status', 'roomNumber', 'checkIn', 'checkOut', 'serviceType', 'emailStatus', 'inputPath', 'created_at', 'redeemed_at', 'redeemed_service', 'pax', 'email', 'whatsapp']);
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
                    'pax': 'Pax',
                    'email': 'Email',
                    'whatsapp': 'WhatsApp',
                    'created_at': 'created_at',
                    'redeemed_at': 'redeemed_at',
                    'redeemed_service': 'redeemed_service',
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
        // services column removed — redeemed_service (col J) is the canonical field
        setVal('pax', data.pax || (targetRow !== -1 ? undefined : 1));
        setVal('email', data.email || data.emailAddress || (targetRow !== -1 ? undefined : ''));
        setVal('whatsapp', data.whatsapp || data.phone || data.phoneNumber || (targetRow !== -1 ? undefined : ''));
        
        if (targetRow === -1) {
            setVal('created_at', data.created_at || data.createdAt || new Date().toISOString());
        }

        if (data.status === 'Redeemed') {
            const redeemedAt = data.redeemed_at || data.redeemedAt || new Date().toISOString();
            setVal('redeemed_at', redeemedAt);
            setVal('redeemed_service', data.serviceType || data.redeemed_service || '');
            
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
        ['redeemed_service', 'redeemed_service'],
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

// ============================================================
// REPORT FUNCTIONS
// ============================================================

/**
 * Reads voucher sheet and returns report data for the last `days` days.
 * @param {number} days - Number of days to look back (1 = today only, 7 = week)
 */
function buildReportData(days) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('voucher') || ss.getSheetByName('Vouchers');
    if (!sheet) throw new Error('Voucher sheet not found');

    const values = sheet.getDataRange().getValues();
    const rawHeaders = values[0];
    const headers = normalizeHeaders(rawHeaders);

    const now = new Date();
    // Cutoff: midnight (SGT) N days ago. Apps Script runs in script timezone.
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);

    const todayCutoff = new Date(now);
    todayCutoff.setHours(0, 0, 0, 0);

    const allRows = values.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    }).filter(r => r.voucherCode && r.guestName);

    // Issued in period
    const issuedInPeriod = allRows.filter(r => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        return !isNaN(d.getTime()) && d >= cutoff;
    });

    // Redeemed in period
    const redeemedInPeriod = allRows.filter(r => {
        if (r.status !== 'Redeemed' || !r.redeemed_at) return false;
        const d = new Date(r.redeemed_at);
        return !isNaN(d.getTime()) && d >= cutoff;
    });

    // Service breakdown of redeemed - use redeemed_service as primary source
    const services = {};
    redeemedInPeriod.forEach(r => {
        const svc = r.redeemed_service || r.serviceType || r.services || 'General';
        services[svc] = (services[svc] || 0) + 1;
    });
    const serviceRows = Object.entries(services)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    // Daily issued breakdown
    const dailyIssued = {};
    issuedInPeriod.forEach(r => {
        const d = new Date(r.created_at);
        const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        dailyIssued[key] = (dailyIssued[key] || 0) + 1;
    });

    // Daily redeemed breakdown
    const dailyRedeemed = {};
    redeemedInPeriod.forEach(r => {
        const d = new Date(r.redeemed_at);
        const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        dailyRedeemed[key] = (dailyRedeemed[key] || 0) + 1;
    });

    // Merge all dates
    const allDates = [...new Set([...Object.keys(dailyIssued), ...Object.keys(dailyRedeemed)])]
        .sort((a, b) => b.localeCompare(a));

    const dailyRows = allDates.map(date => ({
        date,
        issued: dailyIssued[date] || 0,
        redeemed: dailyRedeemed[date] || 0
    }));

    return {
        period: days === 1 ? 'Daily' : 'Weekly',
        days,
        totalIssued: issuedInPeriod.length,
        totalRedeemed: redeemedInPeriod.length,
        conversionRate: issuedInPeriod.length > 0
            ? Math.round((redeemedInPeriod.length / issuedInPeriod.length) * 100)
            : 0,
        serviceRows,
        dailyRows,
        recentRedemptions: redeemedInPeriod.slice(-10).reverse()
    };
}

/**
 * Builds and sends a beautiful HTML report email.
 */
function sendEmailReport(data) {
    const dateLabel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEE, MMM d, yyyy');
    const subject = `📊 ${data.period} Wellness Voucher Report — ${dateLabel}`;

    const serviceTableRows = data.serviceRows.map(s =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${s.name}</td>
         <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold;color:#1a7a4a">${s.count}</td></tr>`
    ).join('');

    const dailyTableRows = data.dailyRows.map(row => {
        const rate = row.issued > 0 ? Math.round((row.redeemed / row.issued) * 100) : 0;
        const dateObj = new Date(row.date + 'T00:00:00');
        const formatted = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'EEE, MMM d');
        return `<tr>
          <td style="padding:7px 12px;border-bottom:1px solid #f5f5f5;font-family:monospace;font-size:13px">${formatted}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f5f5f5;text-align:center;font-weight:bold;color:#9a7a52">${row.issued}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f5f5f5;text-align:center;font-weight:bold;color:#1a7a4a">${row.redeemed}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f5f5f5;text-align:center;color:${rate>=50?'#1a7a4a':'#cc8800'}">${row.issued > 0 ? rate + '%' : '—'}</td>
        </tr>`;
    }).join('');

    const recentRows = data.recentRedemptions.map(r =>
        `<tr><td style="padding:5px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${r.guestName || '—'}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${r.roomNumber || '—'}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #f5f5f5;font-size:12px;color:#1a7a4a">${r.serviceType || r.services || 'General'}</td>
         <td style="padding:5px 10px;border-bottom:1px solid #f5f5f5;font-size:11px;font-family:monospace;color:#aaa">${r.voucherCode || '—'}</td></tr>`
    ).join('');

    const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f5f3;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
  <div style="background:#2c2420;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center">
    <h1 style="color:#c5a572;margin:0;font-size:22px;letter-spacing:1px">No.1 Wellness Club</h1>
    <p style="color:#ffffff99;margin:6px 0 0;font-size:13px">${data.period} Voucher Report &bull; ${dateLabel}</p>
  </div>
  <div style="background:white;padding:28px 32px">
    <!-- KPI Row -->
    <div style="display:flex;gap:16px;margin-bottom:28px">
      <div style="flex:1;background:#fdf8f0;border:1px solid #e8d5b5;border-radius:10px;padding:18px;text-align:center">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#9a7a52;text-transform:uppercase;letter-spacing:1px">Issued</p>
        <p style="margin:8px 0 0;font-size:40px;font-weight:bold;color:#2c2420">${data.totalIssued}</p>
      </div>
      <div style="flex:1;background:#f0f9f4;border:1px solid #9de0bc;border-radius:10px;padding:18px;text-align:center">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#1a7a4a;text-transform:uppercase;letter-spacing:1px">Redeemed</p>
        <p style="margin:8px 0 0;font-size:40px;font-weight:bold;color:#1a7a4a">${data.totalRedeemed}</p>
      </div>
      <div style="flex:1;background:#f5f5ff;border:1px solid #c0c0f0;border-radius:10px;padding:18px;text-align:center">
        <p style="margin:0;font-size:12px;font-weight:bold;color:#555;text-transform:uppercase;letter-spacing:1px">Rate</p>
        <p style="margin:8px 0 0;font-size:40px;font-weight:bold;color:#4444bb">${data.conversionRate}%</p>
      </div>
    </div>

    <!-- Daily Table -->
    <h3 style="margin:0 0 12px;font-size:14px;color:#2c2420;font-weight:bold">📅 Day-by-Day Breakdown</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888">Date</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#9a7a52">Issued</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#1a7a4a">Redeemed</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888">Rate</th>
      </tr></thead>
      <tbody>${dailyTableRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#aaa">No data for this period</td></tr>'}</tbody>
    </table>

    <!-- Service Breakdown -->
    <h3 style="margin:0 0 12px;font-size:14px;color:#2c2420;font-weight:bold">✨ Services Redeemed</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888">Service</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888">Count</th>
      </tr></thead>
      <tbody>${serviceTableRows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#aaa">No redemptions</td></tr>'}</tbody>
    </table>

    <!-- Recent Redemptions -->
    ${data.recentRedemptions.length > 0 ? `
    <h3 style="margin:0 0 12px;font-size:14px;color:#2c2420;font-weight:bold">🕐 Recent Redemptions</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f5f5f5">
        <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#888">Guest</th>
        <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#888">Room</th>
        <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#888">Service</th>
        <th style="padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#888">Code</th>
      </tr></thead>
      <tbody>${recentRows}</tbody>
    </table>` : ''}
  </div>
  <div style="background:#f7f5f3;padding:16px 32px;text-align:center;border-radius:0 0 12px 12px">
    <p style="margin:0;font-size:11px;color:#aaa">This is an automated report from your Wellness Club Dashboard.</p>
  </div>
</div>
</body></html>`;

    MailApp.sendEmail({
        to: REPORT_EMAIL,
        subject: subject,
        htmlBody: html
    });
    Logger.log('Report sent to ' + REPORT_EMAIL);
}

/** Sends daily report (today only) */
function sendDailyReport() {
    const data = buildReportData(1);
    data.period = 'Daily';
    sendEmailReport(data);
}

/** Sends weekly report (last 7 days) */
function sendWeeklyReport() {
    const data = buildReportData(7);
    data.period = 'Weekly';
    sendEmailReport(data);
}

/**
 * Run this ONCE from the Apps Script editor to set up automated triggers.
 * Daily report: every day at 10pm (script timezone = SGT if configured)
 * Weekly report: every Monday at 10pm
 */
function setupReportTriggers() {
    // Remove existing report triggers first to avoid duplicates
    ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getHandlerFunction() === 'sendDailyReport' ||
            trigger.getHandlerFunction() === 'sendWeeklyReport') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    // Daily at 10pm
    ScriptApp.newTrigger('sendDailyReport')
        .timeBased()
        .everyDays(1)
        .atHour(22)
        .create();

    // Weekly on Monday at 10pm
    ScriptApp.newTrigger('sendWeeklyReport')
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(22)
        .create();

    Logger.log('✅ Report triggers created: Daily 10pm + Weekly Monday 10pm');
}

function doOptions(e) {
    return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
