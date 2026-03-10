
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
        await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
export const fetchBookings = async (): Promise<any[]> => {
    try {
        const res = await fetch('/api/bookings');
        if (!res.ok) throw new Error('Failed to fetch bookings');
        return await res.json();
    } catch (error) {
        console.error('Fetch bookings error:', error);
        return [];
    }
};

/**
 * Fetch staff from Google Sheets
 */
export const fetchStaff = async (): Promise<any[]> => {
    try {
        const res = await fetch('/api/staff');
        if (!res.ok) throw new Error('Failed to fetch staff');
        return await res.json();
    } catch (error) {
        console.error('Fetch staff error:', error);
        return [];
    }
};
