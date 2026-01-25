import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2, ChevronDown, Camera } from 'lucide-react';
import QRScanner from './QRScanner';

const Validator: React.FC<{ scriptUrl: string }> = ({ scriptUrl }) => {
    const [code, setCode] = useState('');
    const [serviceType, setServiceType] = useState<'Massage' | 'Fitness' | 'Food/Beverage' | ''>('');
    const [status, setStatus] = useState<'idle' | 'searching' | 'valid' | 'invalid' | 'error'>('idle');
    const [showScanner, setShowScanner] = useState(false);

    const handleVerify = async () => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode || !serviceType) {
            alert("Please enter voucher code and select service type");
            return;
        }

        setStatus('searching');

        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'redeem',
                    voucherCode: cleanCode,
                    serviceType: serviceType // Send service type to backend
                })
            });

            // Artificial delay to feel like a search
            setTimeout(() => {
                setStatus('valid');
            }, 1000);

        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

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
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#c5a572] transition-colors font-mono tracking-widest font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Service Redeemed For</label>
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value as any)}
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
                                <option value="Yoga Class">Yoga Class</option>
                                <option value="Reformer Pilates">Reformer Pilates</option>
                                <option value="Pilates + GUIDED Recovery">Pilates + Guided Recovery</option>
                                <option value="Kickboxing">Kickboxing / Muay Thai</option>
                                <option value="Zumba">Zumba</option>
                                <option value="Private Session">Private Fitness Session</option>
                            </optgroup>

                            <optgroup label="Other">
                                <option value="Food & Beverage">Food & Beverage</option>
                                <option value="Day Pass">Day Pass (Facilities Only)</option>
                                <option value="Event Access">Event Access</option>
                            </optgroup>
                        </select>
                        <div className="absolute right-4 top-[3.2rem] pointer-events-none text-gray-400">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    <button
                        onClick={handleVerify}
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
                    {status === 'idle' && (
                        <div className="text-center py-10">
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
                            onScanSuccess={(scannedCode) => {
                                setCode(scannedCode);
                                setShowScanner(false);
                                // Verification will be triggered if they have a service selected
                            }}
                            onClose={() => setShowScanner(false)}
                        />
                    )}

                    {status === 'valid' && (
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-green-100/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <div className="text-green-800 font-bold uppercase tracking-widest text-xs mb-2">
                                Voucher Validated
                            </div>
                            <p className="text-sm text-gray-600 mb-2 font-medium">
                                Voucher <strong>{code}</strong> has been marked as redeemed.
                            </p>
                            <p className="text-xs text-gray-500 mb-6">
                                Service Type: <strong>{serviceType}</strong>
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

                    {status === 'invalid' && (
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 animate-fade-in text-center">
                            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                            <div className="text-red-700 font-bold uppercase tracking-widest text-xs mb-2">
                                Error
                            </div>
                            <p className="text-sm text-gray-600">Could not verify voucher details.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 animate-fade-in text-center">
                            <p className="text-sm text-orange-600 font-medium">Network error. Check connection and try again.</p>
                            <button onClick={handleVerify} className="mt-4 text-xs font-bold uppercase tracking-widest underline">Retry</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Validator;
