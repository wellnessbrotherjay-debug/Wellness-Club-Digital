import React, { useState, useCallback, memo } from 'react';
import { Search, CheckCircle, XCircle, Loader2, ChevronDown, Camera, AlertTriangle } from 'lucide-react';
import QRScanner from './QRScanner';
import type { VoucherData } from './VoucherPage';

const Validator: React.FC<{ scriptUrl: string; vouchers: VoucherData[] }> = ({ scriptUrl, vouchers }) => {
    const [code, setCode] = useState('');
    const [serviceType, setServiceType] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'searching' | 'valid' | 'invalid' | 'error' | 'expired'>('idle');
    const [showScanner, setShowScanner] = useState(false);
    const [expireDate, setExpireDate] = useState('');

    const handleVerify = useCallback(async (manualCode?: string) => {
        const targetCode = (manualCode || code).trim().toUpperCase();

        if (!targetCode) {
            alert("Please scan or enter a voucher code");
            return;
        }

        if (!serviceType) {
            alert("Please select a service type first");
            return;
        }

        // Client-side Expiration Check
        const voucher = vouchers.find(v => v.id === targetCode);
        if (voucher) {
            const today = new Date().toISOString().split('T')[0];
            // If checkOut date (Valid Until) is LESS than today, it is expired.
            // e.g. Valid until 25th. Today is 26th. 25 < 26. Expired.
            if (voucher.checkOut < today) {
                setExpireDate(voucher.checkOut);
                setStatus('expired');
                return;
            }
        }

        setStatus('searching');

        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'redeem',
                    voucherCode: targetCode,
                    serviceType: serviceType
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
    }, [code, serviceType, scriptUrl]);

    const handleScanSuccess = useCallback((scannedCode: string) => {
        setCode(scannedCode);
        if (scannedCode && serviceType) {
            handleVerify(scannedCode);
        }
    }, [handleVerify, serviceType]);

    const closeScanner = useCallback(() => {
        setShowScanner(false);
        setStatus('idle');
    }, []);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
            <div className="mb-8">
                <h3 className="text-2xl font-serif font-bold mb-1">Verify & Redeem</h3>
                <p className="text-sm text-gray-400">Enter voucher ID and select service type to mark as used.</p>
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
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Service Redeemed For</label>
                        <div className="relative">
                            <select
                                value={serviceType}
                                onChange={(e) => {
                                    setServiceType(e.target.value);
                                    if (status !== 'searching') setStatus('idle');
                                    setExpireDate('');
                                }}
                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-medium appearance-none cursor-pointer"
                            >
                                <option value="">Select specific service...</option>

                                <optgroup label="Massage & Spa">
                                    <option value="Signature Massage">No.1 Signature Massage</option>
                                    <option value="Slimming Massage">No.1 Slimming Massage</option>
                                    <option value="Lymphatic Massage">No.1 Lymphatic Massage</option>
                                    <option value="Relaxing Massage">No.1 Relaxing Massage</option>
                                </optgroup>

                                <optgroup label="IV Therapy">
                                    <option value="IV Immune Booster">IV Immune Booster</option>
                                    <option value="IV Recovery & Detox">IV Recovery & Detox</option>
                                    <option value="IV Hangover Cure">IV Hangover Cure</option>
                                    <option value="IV Bali Belly">IV Bali Belly Infusion</option>
                                </optgroup>

                                <optgroup label="Fitness & Wellness">
                                    <option value="1x Free Yoga Class">1x Free Yoga Class</option>
                                    <option value="Yoga Class">Regular Yoga Class</option>
                                    <option value="Reformer Pilates">Reformer Pilates</option>
                                    <option value="Pilates + GUIDED Recovery">Pilates + Guided Recovery</option>
                                    <option value="Kickboxing">Kickboxing / Muay Thai</option>
                                    <option value="Zumba">Zumba</option>
                                    <option value="Private Session">Private Fitness Session</option>
                                </optgroup>

                                <optgroup label="Other">
                                    <option value="15% off F&B No.1 Wellness">15% off F&B No.1 Wellness</option>
                                    <option value="Food & Beverage">Standard Food & Beverage</option>
                                    <option value="Day Pass">Day Pass (Facilities Only)</option>
                                    <option value="Event Access">Event Access</option>
                                </optgroup>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => handleVerify()}
                        disabled={!code || !serviceType || status === 'searching'}
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
                        <div className="text-center py-10">
                            {!serviceType && (
                                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-4 animate-pulse">Select service type to unlock scanner</p>
                            )}
                            <button
                                onClick={() => {
                                    if (!serviceType) {
                                        alert("Please select a service type first");
                                        return;
                                    }
                                    setShowScanner(true);
                                }}
                                className={`group relative ${!serviceType ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
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
                            currentService={serviceType}
                        />
                    )}

                    {status === 'valid' && !showScanner && (
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-green-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <div className="text-green-800 font-bold uppercase tracking-widest text-xs mb-2">
                                Service Logged Successfully
                            </div>
                            <p className="text-sm text-gray-600 mb-2 font-medium">
                                <strong>{code}</strong> redeemed for:
                            </p>
                            <p className="text-xl text-green-700 mb-6 font-serif">
                                {serviceType}
                            </p>
                            <button
                                onClick={() => {
                                    setCode('');
                                    setServiceType('');
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
