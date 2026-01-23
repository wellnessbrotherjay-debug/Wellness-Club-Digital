import { APPS_SCRIPT_URL } from '../constants';

/**
 * Submit a class booking to Google Sheets
 */
export const submitBooking = async (bookingData: {
    className: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    timeSlot: string;
    day: string;
    coach: string;
    numPeople: number;
    guestDetails?: any[];
}) => {
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const payload = {
        action: 'create',
        bookingType: 'class',
        bookingId,
        className: bookingData.className,
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        timeSlot: bookingData.timeSlot,
        day: bookingData.day,
        coach: bookingData.coach,
        numPeople: bookingData.numPeople,
        status: 'Pending',
        guestDetails: bookingData.guestDetails ? JSON.stringify(bookingData.guestDetails) : ''
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true, bookingId };
    } catch (error) {
        console.error('Failed to submit booking:', error);
        return { success: false, error };
    }
};

/**
 * Submit staff member to Google Sheets
 */
export const submitStaff = async (staffData: {
    staffName: string;
    role: string;
    email: string;
    phone: string;
}) => {
    const staffId = `STF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const payload = {
        action: 'create',
        staffId,
        staffName: staffData.staffName,
        role: staffData.role,
        email: staffData.email,
        phone: staffData.phone,
        status: 'Active'
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return { success: true, staffId };
    } catch (error) {
        console.error('Failed to submit staff:', error);
        return { success: false, error };
    }
};

/**
 * Fetch bookings from Google Sheets
 */
export const fetchBookings = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const callbackName = `loadBookings${Date.now()}`;

        (window as any)[callbackName] = (data: any) => {
            delete (window as any)[callbackName];
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=Bookings&t=${Date.now()}`;
        document.body.appendChild(script);

        script.onerror = () => {
            document.body.removeChild(script);
            delete (window as any)[callbackName];
            reject(new Error('Failed to fetch bookings'));
        };

        script.onload = () => {
            document.body.removeChild(script);
        };
    });
};

/**
 * Fetch staff from Google Sheets
 */
export const fetchStaff = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const callbackName = `loadStaff${Date.now()}`;

        (window as any)[callbackName] = (data: any) => {
            delete (window as any)[callbackName];
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&sheet=Staff&t=${Date.now()}`;
        document.body.appendChild(script);

        script.onerror = () => {
            document.body.removeChild(script);
            delete (window as any)[callbackName];
            reject(new Error('Failed to fetch staff'));
        };

        script.onload = () => {
            document.body.removeChild(script);
        };
    });
};
