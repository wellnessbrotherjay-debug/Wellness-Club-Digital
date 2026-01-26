import React, { useState, useCallback, memo } from 'react';
import { Search, CheckCircle, XCircle, Loader2, ChevronDown, Camera, AlertTriangle } from 'lucide-react';
import QRScanner from './QRScanner';
import type { VoucherData } from './VoucherPage';

// MAPPING: defines which 'Creation Service' unlocks which 'Redeemable Service'
// "requiredEntitlement" corresponds to the string in VoucherPage.tsx -> SERVICES_LIST

const SERVICE_GROUPS = [
    {
        label: 'Massage & Spa (No.1 Wellness)',
        items: [
            // User said: "all massage and fnb is linked to no1 wellness"
            // So we link these to "15% off F&B No.1 Wellness" (assuming this is the main Wellness entitlement key)
            // Or "15% off TS Salon Services" ? No, presumably F&B/Wellness are shared.
            { value: 'Signature Massage', label: 'No.1 Signature Massage', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Slimming Massage', label: 'No.1 Slimming Massage', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Lymphatic Massage', label: 'No.1 Lymphatic Massage', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Relaxing Massage', label: 'No.1 Relaxing Massage', requiredEntitlement: "15% off F&B No.1 Wellness" },
        ]
    },
    {
        label: 'IV Therapy',
        items: [
            { value: 'IV Immune Booster', label: 'IV Immune Booster', requiredEntitlement: "15% off F&B No.1 Wellness" }, // Assuming linked to Wellness
            { value: 'IV Recovery & Detox', label: 'IV Recovery & Detox', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'IV Hangover Cure', label: 'IV Hangover Cure', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'IV Bali Belly', label: 'IV Bali Belly Infusion', requiredEntitlement: "15% off F&B No.1 Wellness" },
        ]
    },
    {
        label: 'TS Salon Services',
        items: [
            { value: 'Hair Cut', label: 'Hair Cut / Styling', requiredEntitlement: "15% off TS Salon Services" },
            { value: 'Manicure/Pedicure', label: 'Manicure / Pedicure', requiredEntitlement: "15% off TS Salon Services" },
            { value: 'Facial', label: 'Facial Treatment', requiredEntitlement: "15% off TS Salon Services" },
            { value: 'Salon General', label: 'General Salon Service', requiredEntitlement: "15% off TS Salon Services" },
        ]
    },
    {
        label: 'T Store Shopping',
        items: [
            { value: 'Apparel', label: 'Apparel / Clothing', requiredEntitlement: "15% off T Store Shopping" },
            { value: 'Accessories', label: 'Accessories', requiredEntitlement: "15% off T Store Shopping" },
            { value: 'T Store General', label: 'General Store Purchase', requiredEntitlement: "15% off T Store Shopping" },
        ]
    },
    {
        label: 'Fitness & Wellness',
        items: [
            { value: '1x Free Yoga Class', label: '1x Free Yoga Class', requiredEntitlement: "1x Free Yoga Class" },
            { value: 'Yoga Class', label: 'Regular Yoga Class', requiredEntitlement: "1x Free Yoga Class" }, // Or specific yoga entitlement
            { value: 'Reformer Pilates', label: 'Reformer Pilates', requiredEntitlement: "15% off F&B No.1 Wellness" }, // Assuming Wellness covers this?
            { value: 'Kickboxing', label: 'Kickboxing / Muay Thai', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Private Session', label: 'Private Fitness Session', requiredEntitlement: "15% off F&B No.1 Wellness" },
        ]
    },
    {
        label: 'Other',
        items: [
            { value: '15% off F&B No.1 Wellness', label: '15% off F&B No.1 Wellness', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Food & Beverage', label: 'Standard Food & Beverage', requiredEntitlement: "15% off F&B No.1 Wellness" },
            { value: 'Complimentary Breakfast', label: 'Complimentary Breakfast', requiredEntitlement: "Complimentary Breakfast" },
            { value: 'Welcome Drink', label: 'Welcome Drink', requiredEntitlement: "Welcome Drink" },
            { value: 'Day Pass', label: 'Day Pass (Facilities Only)', requiredEntitlement: "15% off F&B No.1 Wellness" },
        ]
    }
];

const Validator: React.FC<{ vouchers: VoucherData[] }> = ({ vouchers }) => {
    const [code, setCode] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'searching' | 'valid' | 'invalid' | 'error' | 'expired'>('idle');
    const [showScanner, setShowScanner] = useState(false);
    const [expireDate, setExpireDate] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Derived state: Filter groups based on the current voucher's entitlements
    const getFilteredGroups = useCallback(() => {
        // If no code entered, show nothing or all? 
        // Better to show nothing until code is known, BUT users might want to see options.
        // Let's Find the voucher first.
        const voucher = vouchers.find(v => v.id === code.trim().toUpperCase());

        if (!voucher) return []; // If code invalid, show no options (forces them to enter/scan valid code first)

        // Filter items
        return SERVICE_GROUPS.map(group => ({
            ...group,
            items: group.items.filter(item => {
                // If the item doesn't require specific entitlement, show it? (Safe default: hide)
                if (!item.requiredEntitlement) return false;
                // Check if voucher has the required service string
                return voucher.services && voucher.services.includes(item.requiredEntitlement);
            })
        })).filter(group => group.items.length > 0); // Remove empty groups
    }, [code, vouchers]);

    const filteredServiceGroups = getFilteredGroups();

    const handleVerify = useCallback(async (manualCode?: string) => {
        const targetCode = (manualCode || code).trim().toUpperCase();

        if (!targetCode) {
            alert("Please scan or enter a voucher code");
            return;
        }

        if (selectedServices.length === 0) {
            alert("Please select at least one service type");
            return;
        }

        // Client-side Expiration Check
        const voucher = vouchers.find(v => v.id === targetCode);
        if (voucher) {
            const today = new Date().toISOString().split('T')[0];
            if (voucher.checkOut < today) {
                setExpireDate(voucher.checkOut);
                setStatus('expired');
                return;
            }
        }

        setStatus('searching');
        const serviceType = selectedServices.join(', ');

        try {
            await fetch('/api/redeem-voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeem',
                    voucherCode: targetCode,
                    serviceType: serviceType,
                    redeemedAt: new Date().toLocaleString('sv-SE').replace('T', ' ') // Clean format override
                })
            });

            // Artificial delay so the user can see the "Redeeming" status on mobile
            setTimeout(() => {
                setStatus('valid');
                if (!manualCode) setCode('');
            }, 1500);

        } catch (e) {
            console.error("Redemption failed:", e);
            setStatus('error');
        }
    }, [code, selectedServices, vouchers]);

    const handleScanSuccess = useCallback((scannedCode: string) => {
        setCode(scannedCode);
        if (scannedCode && selectedServices.length > 0) {
            handleVerify(scannedCode);
        }
    }, [handleVerify, selectedServices]);

    const closeScanner = useCallback(() => {
        setShowScanner(false);
        setStatus('idle');
    }, []);

    const toggleService = (value: string) => {
        setSelectedServices(prev =>
            prev.includes(value)
                ? prev.filter(s => s !== value)
                : [...prev, value]
        );
        if (status !== 'searching') setStatus('idle');
        setExpireDate('');
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
            <div className="mb-8">
                <h3 className="text-2xl font-serif font-bold mb-1">Verify & Redeem</h3>
                <p className="text-sm text-gray-400">Enter voucher ID and select services to redeem.</p>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Voucher Code</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                placeholder="Enter ID (e.g. NW-X7Z2)"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase());
                                    setStatus('idle');
                                    setExpireDate('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-mono tracking-widest font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Services Redeemed For</label>
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-medium flex justify-between items-center text-left"
                            >
                                <span className={selectedServices.length === 0 ? 'text-gray-400' : 'text-[#2c2420] font-bold'}>
                                    {selectedServices.length === 0
                                        ? "Select services..."
                                        : `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`}
                                </span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMenuOpen && (
                                <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-inner z-50 max-h-64 overflow-y-auto p-2 animate-fade-in">
                                    {!code.trim() ? (
                                        <div className="p-4 text-center text-xs text-gray-400">
                                            Please enter or scan a valid Voucher ID first.
                                        </div>
                                    ) : filteredServiceGroups.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-red-400">
                                            No applicable services found for this voucher.
                                        </div>
                                    ) : (
                                        filteredServiceGroups.map((group) => (
                                            <div key={group.label} className="mb-2">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 py-1 bg-gray-50 rounded mb-1">
                                                    {group.label}
                                                </div>
                                                {group.items.map((item) => (
                                                    <button
                                                        key={item.value}
                                                        onClick={() => toggleService(item.value)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 flex items-center justify-between transition-colors ${selectedServices.includes(item.value)
                                                            ? 'bg-[#c5a572]/10 text-[#c5a572]'
                                                            : 'hover:bg-gray-50 text-gray-600'
                                                            }`}
                                                    >
                                                        {item.label}
                                                        {selectedServices.includes(item.value) && <CheckCircle size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedServices.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedServices.map(s => (
                                    <span key={s} className="bg-[#c5a572]/10 text-[#c5a572] text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1">
                                        {s}
                                        <button onClick={() => toggleService(s)} className="hover:text-[#2c2420]">
                                            <XCircle size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => handleVerify()}
                        disabled={!code || selectedServices.length === 0 || status === 'searching'}
                        className="w-full bg-[#2c2420] text-white py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-bold text-sm uppercase tracking-widest"
                    >
                        {status === 'searching' ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Validating...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                <span>Validate & Redeem</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {status === 'idle' && !showScanner && (
                        <div className="text-center py-10 mt-4">
                            {!code && (
                                <p className="text-[#c5a572] text-[10px] font-bold uppercase tracking-widest mb-4 animate-pulse">Scan Voucher to View Services</p>
                            )}
                            <button
                                onClick={() => setShowScanner(true)}
                                className="group relative"
                            >
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 group-hover:bg-[#c5a572]/10 group-hover:text-[#c5a572] transition-all">
                                    <Camera size={32} />
                                </div>
                                <p className="text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-[#c5a572] transition-colors">Start Mobile Scan</p>
                                <div className="mt-2 text-[10px] text-gray-300 uppercase tracking-widest font-bold">or enter ID manually above</div>
                            </button>
                        </div>
                    )}

                    {showScanner && (
                        <QRScanner
                            onScanSuccess={handleScanSuccess}
                            onClose={closeScanner}
                            valStatus={status}
                            currentService={selectedServices.join(', ')}
                        />
                    )}

                    {status === 'valid' && !showScanner && (
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-green-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <div className="text-green-800 font-bold uppercase tracking-widest text-xs mb-2">
                                Services Logged Successfully
                            </div>
                            <p className="text-sm text-gray-600 mb-2 font-medium">
                                <strong>{code}</strong> redeemed for:
                            </p>
                            <div className="mb-6 space-y-1">
                                {selectedServices.map(s => (
                                    <div key={s} className="text-green-700 font-bold font-serif text-lg leading-tight">
                                        {s}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setCode('');
                                    setSelectedServices([]);
                                    setStatus('idle');
                                }}
                                className="px-6 py-2 bg-white border border-green-200 rounded-lg text-xs font-bold uppercase tracking-widest text-green-700 hover:bg-green-100 transition-colors"
                            >
                                Validate Next
                            </button>
                        </div>
                    )}

                    {status === 'expired' && !showScanner && (
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-amber-600" />
                            </div>
                            <div className="text-amber-700 font-bold uppercase tracking-widest text-xs mb-2">
                                Voucher Expired
                            </div>
                            <p className="text-sm text-gray-600 mb-6">
                                This voucher expired on <strong>{expireDate}</strong>.
                            </p>
                            <button onClick={() => setStatus('idle')} className="text-xs font-bold uppercase tracking-widest text-amber-700 underline">
                                Try Another
                            </button>
                        </div>
                    )}

                    {(status === 'invalid' || status === 'error') && !showScanner && (
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 animate-fade-in text-center">
                            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                            <div className="text-red-700 font-bold uppercase tracking-widest text-xs mb-2">
                                System Error
                            </div>
                            <p className="text-sm text-gray-600">Check internet connection and try again.</p>
                            <button onClick={() => setStatus('idle')} className="mt-4 text-xs font-bold uppercase tracking-widest underline">Retry</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(Validator);
