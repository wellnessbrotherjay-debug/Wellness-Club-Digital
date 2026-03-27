import React, { useState, useCallback, memo } from 'react';
import { Search, CheckCircle, XCircle, Loader2, ChevronDown, Camera, AlertTriangle } from 'lucide-react';
import QRScanner from './QRScanner';
import type { VoucherData } from './VoucherPage';

// MAPPING: defines which 'Creation Service' unlocks which 'Redeemable Service'
// "requiredEntitlement" corresponds to the string in VoucherPage.tsx -> SERVICES_LIST

import { SERVICE_GROUPS } from './constants/services';
import { isVoucherExpired } from './utils/voucherUtils';
import { getDeviceId } from './utils/deviceId';
import { API_BASE_URL } from './utils/api';

const Validator: React.FC<{ vouchers: VoucherData[]; onRefresh?: () => void }> = ({ vouchers, onRefresh }) => {
    const [code, setCode] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'searching' | 'valid' | 'invalid' | 'error' | 'expired'>('idle');
    const [showScanner, setShowScanner] = useState(false);
    const [expireDate, setExpireDate] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [billAmount, setBillAmount] = useState('');


    const [isSyncing, setIsSyncing] = useState(false);

    // Reset selection when code changes (either via scan or typing)
    // This prevents "stale" services from one voucher leaking into the next
    React.useEffect(() => {
        setSelectedServices([]);
        setIsSyncing(false);
    }, [code]);

    // Auto-sync if scanned code is not found
    React.useEffect(() => {
        if (!code) return;
        const exists = vouchers.find(v => v.id === code.trim().toUpperCase());
        if (!exists && onRefresh && !isSyncing) {
            setIsSyncing(true);
            onRefresh();
            // Timeout to stop syncing state if not found after 5s
            const timer = setTimeout(() => setIsSyncing(false), 5000);
            return () => clearTimeout(timer);
        } else if (exists) {
            setIsSyncing(false);
        }
    }, [code, vouchers, onRefresh, isSyncing]);

    // Derived state: Filter groups based on the current voucher's entitlements
    const getFilteredGroups = useCallback(() => {
        // If no code entered, show nothing (forces them to enter/scan valid code first)
        const voucher = vouchers.find(v => v.id === code.trim().toUpperCase());

        if (!voucher) return [];

        // UNIVERSAL RULE: All vouchers get 15% off everything
        // No entitlement checking needed - just return all service groups
        return SERVICE_GROUPS;
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
        if (voucher && isVoucherExpired(voucher)) {
            setExpireDate(voucher.checkOut || voucher.expires_at || 'unknown');
            setStatus('expired');
            return;
        }

        setStatus('searching');
        const redeemedAt = new Date().toISOString();

        try {
            const voucher = vouchers.find(v => v.id === targetCode);
            const serviceType = selectedServices.join(', ');

            // Calculate primary category based on the first selected service's group
            let primaryCategory = 'other';
            for (const group of SERVICE_GROUPS) {
                if (group.items.some(item => selectedServices.includes(item.value))) {
                    primaryCategory = (group as unknown as Record<string, unknown>).category as string || 'other';
                    break;
                }
            }

            const transactionId = `${targetCode}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

            // Use our own API proxy to handle Email Notifications + Google Sheet Update
            const response = await fetch(`${API_BASE_URL}/api/redeem-voucher`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeem',
                    voucherCode: targetCode,
                    serviceType: serviceType,
                    category: primaryCategory,
                    transactionId: transactionId,
                    guestName: voucher?.guestName || 'Unknown Guest',
                    roomNumber: voucher?.roomNumber || '',
                    email: voucher?.email || '',
                    whatsapp: voucher?.whatsapp || '',
                    redeemedAt: redeemedAt,
                    deviceId: getDeviceId(),
                    userAgent: navigator.userAgent,
                    inputPath: window.location.pathname,
                    billAmount: billAmount || undefined
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Artificial delay so the user can see the "Redeeming" status on mobile
            setTimeout(() => {
                setStatus('valid');

                setSelectedServices([]); // RESET SELECTION
                setBillAmount(''); // RESET BILL
                if (!manualCode) setCode('');
                if (onRefresh) onRefresh(); // REFRESH DATA TO SHOW REDEEMED STATUS
            }, 1000);

        } catch {
            setStatus('error');
        }
    }, [code, selectedServices, vouchers, billAmount, onRefresh]);

    const handleScanSuccess = useCallback((scannedCode: string) => {
        let cleanCode = scannedCode;

        // 1. Try JSON (Guest Pass QR)
        try {
            const parsed = JSON.parse(scannedCode);
            if (parsed.id) cleanCode = parsed.id;
        } catch {
            // Not JSON
        }

        // 2. Try URL (Dashboard Link)
        if (cleanCode.includes('/v/')) {
            const parts = cleanCode.split('/v/');
            if (parts[1]) {
                cleanCode = parts[1].split('?')[0];
            }
        }

        setCode(cleanCode);
        setSelectedServices([]);
        setBillAmount('');
    }, []);

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
                            {!showManual ? (
                                <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-xl px-12 py-4 h-[58px] flex items-center justify-between">
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Scanner Active</span>
                                    <button
                                        onClick={() => setShowManual(true)}
                                        className="text-[10px] font-bold text-[#c5a572] underline uppercase tracking-widest"
                                    >
                                        Enter Manually
                                    </button>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Enter ID (e.g. NW-X7Z2)"
                                    autoFocus
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.toUpperCase());
                                        setStatus('idle');
                                        setExpireDate('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                    className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-mono tracking-widest font-bold"
                                />
                            )}
                        </div>
                        {vouchers.find(v => v.id === code.trim().toUpperCase()) && (
                            <div className="mt-3 bg-[#c5a572]/10 border border-[#c5a572]/20 rounded-lg p-4 flex flex-col gap-2 animate-fade-in">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-[#c5a572] mb-1">
                                    Voucher: {vouchers.find(v => v.id === code.trim().toUpperCase())?.id}
                                </div>
                                <div className="flex justify-between items-center text-[#2c2420]">
                                    <span className="text-sm font-serif font-bold">
                                        {vouchers.find(v => v.id === code.trim().toUpperCase())?.guestName}
                                    </span>
                                    <span className="px-2 py-0.5 bg-[#c5a572] text-white text-[9px] font-bold rounded uppercase">
                                        Room {vouchers.find(v => v.id === code.trim().toUpperCase())?.roomNumber}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[#c5a572]">
                                    <span className="flex items-center gap-1">
                                        Voucher Valid for Digital Redemption
                                    </span>
                                </div>
                                {vouchers.find(v => v.id === code.trim().toUpperCase())?.status === 'Redeemed' && (
                                    <div className="mt-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest p-2 rounded flex items-center gap-2 animate-pulse">
                                        <AlertTriangle size={14} />
                                        Warning: This voucher is already marked as redeemed
                                    </div>
                                )}
                            </div>
                        )}
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
                                            {isSyncing ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    <span>Syncing with database...</span>
                                                </div>
                                            ) : (
                                                "No verifiable services found (or voucher not in database)"
                                            )}
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

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                            Bill Amount (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="Enter amount (IDR)"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-medium"
                            />
                            {billAmount && !isNaN(parseFloat(billAmount)) && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <div className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">PPN (11%)</div>
                                        <div className="text-[10px] font-bold text-[#c5a572]">{Math.round(parseFloat(billAmount) * 0.11).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <div className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Service (10%)</div>
                                        <div className="text-[10px] font-bold text-[#c5a572]">{Math.round(parseFloat(billAmount) * 0.10).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <div className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Total</div>
                                        <div className="text-[10px] font-bold text-[#2c2420]">{(Math.round(parseFloat(billAmount) * 1.21)).toLocaleString()}</div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                            serviceGroups={filteredServiceGroups}
                            selectedServices={selectedServices}
                            toggleService={toggleService}
                            onRedeem={() => handleVerify()}
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
