/**
 * getDeviceId — returns a stable UUID for this browser, persisted in localStorage.
 * Used to track which device performed each redemption for audit purposes.
 */
export function getDeviceId(): string {
    const KEY = 'nw_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        localStorage.setItem(KEY, id);
    }
    return id;
}

/**
 * postAuditEvent — fire-and-forget call to /api/audit-log.
 * Never throws — audit failure must never block the main flow.
 */
export async function postAuditEvent(payload: {
    action: string;
    voucherCode: string;
    guestName?: string;
    serviceType?: string;
    roomNumber?: string | number;
    source?: string;
    inputPath?: string;
    sessionId?: string;
}): Promise<void> {
    try {
        const deviceId = getDeviceId();
        await fetch(`${API_BASE_URL}/api/audit-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                deviceId,
                userAgent: navigator.userAgent,
            }),
        });
    } catch {
        // Silent — audit is non-critical
    }
}
