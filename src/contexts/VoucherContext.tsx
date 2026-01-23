import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface VoucherData {
    id: string;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    services: string[];
}

interface VoucherContextType {
    isDiscountActive: boolean;
    voucher: VoucherData | null;
    activateVoucher: (encodedData: string) => void;
    deactivateVoucher: () => void;
    getWhatsAppSuffix: () => string;
}

const VoucherContext = createContext<VoucherContextType | undefined>(undefined);

export const VoucherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [voucher, setVoucher] = useState<VoucherData | null>(null);
    const [isDiscountActive, setIsDiscountActive] = useState(false);

    const activateVoucher = (encodedData: string) => {
        try {
            const decoded = JSON.parse(atob(encodedData));
            setVoucher(decoded);
            setIsDiscountActive(true);
        } catch (e) {
            console.error('Failed to activate voucher:', e);
        }
    };

    const deactivateVoucher = () => {
        setVoucher(null);
        setIsDiscountActive(false);
    };

    const getWhatsAppSuffix = (): string => {
        if (isDiscountActive && voucher) {
            return `\n\n*Guest Pass Applied*\nPass ID: ${voucher.id}\nGuest: ${voucher.guestName}\n15% Discount Activated`;
        }
        return '';
    };

    return (
        <VoucherContext.Provider value={{ isDiscountActive, voucher, activateVoucher, deactivateVoucher, getWhatsAppSuffix }}>
            {children}
        </VoucherContext.Provider>
    );
};

export const useVoucher = () => {
    const context = useContext(VoucherContext);
    if (!context) {
        throw new Error('useVoucher must be used within a VoucherProvider');
    }
    return context;
};
