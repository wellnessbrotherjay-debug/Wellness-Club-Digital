import React, { useEffect, useRef, memo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { XCircle, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
    valStatus?: 'idle' | 'searching' | 'valid' | 'invalid' | 'error' | 'expired';
    currentService?: string;
    serviceGroups?: any[];
    selectedServices?: string[];
    toggleService?: (value: string) => void;
    onRedeem?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
    onScanSuccess, onClose, valStatus, currentService,
    serviceGroups = [], selectedServices = [], toggleService, onRedeem
}) => {
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = React.useState(false);
    const [scannedResult, setScannedResult] = React.useState<string | null>(null);
    const [validationTime, setValidationTime] = React.useState<string | null>(null);
    const [invalidCode, setInvalidCode] = React.useState<string | null>(null);

    // Crucial: Use refs for props used in the async camera callback to prevent stale closures 
    const onScanSuccessRef = useRef(onScanSuccess);
    const valStatusRef = useRef(valStatus);
    const currentServiceRef = useRef(currentService);

    // Sync refs on every render
    onScanSuccessRef.current = onScanSuccess;
    valStatusRef.current = valStatus;
    currentServiceRef.current = currentService;

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);

    useEffect(() => {
        scannerRef.current = new Html5Qrcode("reader");

        // Small delay to ensure the container is ready and prevent permission race
        const timer = setTimeout(() => {
            startCamera();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Stop failed", err));
            }
        };
    }, []);

    const startCamera = async () => {
        if (!scannerRef.current) return;

        setErrorMsg(null);
        setScannedResult(null);
        setValidationTime(null);
        setInvalidCode(null);
        hasScannedRef.current = false;

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                // Prefer back camera
                const backCamera = devices.find(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                const cameraId = backCamera ? backCamera.id : devices[0].id;

                await scannerRef.current.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // Use ref here to check if we already processed a scan
                        if (hasScannedRef.current) return;

                        const nwMatch = decodedText.match(/NW-[A-Z0-9]{4,}/i);

                        if (!nwMatch) {
                            if (!invalidCode) {
                                setInvalidCode("Invalid QR Code - Only Voucher QR codes allowed");
                                setTimeout(() => setInvalidCode(null), 3000);
                            }
                            return;
                        }

                        const resultId = nwMatch[0].toUpperCase();
                        hasScannedRef.current = true;

                        setScannedResult(resultId);
                        const now = new Date();
                        const timeStr = now.getHours().toString().padStart(2, '0') + ":" +
                            now.getMinutes().toString().padStart(2, '0') + ":" +
                            now.getSeconds().toString().padStart(2, '0');
                        setValidationTime(timeStr);

                        // Trigger the latest callback from the parent
                        onScanSuccessRef.current(resultId);
                    },
                    (_error) => { /* quiet scan failures */ }
                );
                setIsCameraActive(true);
            } else {
                setErrorMsg("No cameras found. Please ensure you are on a mobile device or have a webcam plugged in.");
            }
        } catch (err: any) {
            console.error("Camera start failed", err);
            const errStr = err.toString();
            if (errStr.includes("NotAllowedError") || errStr.includes("Permission denied")) {
                setErrorMsg("Camera permission denied. Please allow camera access in your browser settings to scan vouchers.");
            } else {
                setErrorMsg("Could not access camera. Please refresh the page and try again.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <button
                onClick={onClose}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-all p-3 hover:bg-white/10 rounded-full"
            >
                <XCircle size={32} />
            </button>

            <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden relative border-2 border-[#c5a572]/30 shadow-2xl shadow-[#c5a572]/20">
                <div id="reader" className="w-full h-full"></div>

                {errorMsg && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/95 text-center z-20">
                        <XCircle size={48} className="text-red-500 mb-4" />
                        <h3 className="text-white font-bold mb-2">Camera Access Required</h3>
                        <p className="text-white/60 text-xs mb-6 px-4">{errorMsg}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#c5a572] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg"
                        >
                            Refresh Hub
                        </button>
                    </div>
                )}

                {!isCameraActive && !errorMsg && !scannedResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/80 text-center z-10">
                        <Loader2 className="animate-spin text-[#c5a572] mb-4" size={32} />
                        <p className="text-white/60 text-sm">Initializing camera...</p>
                        <button
                            onClick={startCamera}
                            className="mt-6 px-6 py-2 border border-[#c5a572] text-[#c5a572] rounded-full text-[10px] font-bold uppercase"
                        >
                            Retry Camera
                        </button>
                    </div>
                )}

                {isCameraActive && !errorMsg && (
                    <>
                        <div className={`absolute inset-0 pointer-events-none border-[40px] z-1 transition-colors duration-300 ${scannedResult ? 'border-green-500/40' : 'border-black/40'}`}></div>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 rounded-3xl transition-all duration-300 z-2 ${scannedResult ? 'border-green-500 scale-110 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'border-[#c5a572] animate-pulse'}`}>
                            {scannedResult && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 animate-fade-in">
                                    <CheckCircle size={48} className="text-white" />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-10 text-center max-w-xs w-full px-4">
                {scannedResult ? (
                    <div className="animate-fade-in flex flex-col items-center w-full">
                        <div className={`border rounded-2xl p-6 w-full mb-6 transition-all duration-500 overflow-hidden ${valStatus === 'valid' ? 'bg-green-500/20 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'bg-black/40 border-white/10'}`}>
                            {valStatus === 'searching' ? (
                                <div className="flex flex-col items-center py-4">
                                    <Loader2 className="animate-spin text-[#c5a572] mb-3" size={32} />
                                    <h2 className="text-xl font-serif text-white">Redeeming...</h2>
                                    <div className="mt-4 px-3 py-1 bg-[#c5a572]/10 rounded-full">
                                        <p className="text-[10px] text-[#c5a572] uppercase font-bold tracking-widest leading-none">{currentService}</p>
                                    </div>
                                </div>
                            ) : valStatus === 'valid' ? (
                                <div className="animate-scale-in flex flex-col items-center py-2 text-center">
                                    <CheckCircle size={48} className="text-green-500 mb-4" />
                                    <h2 className="text-2xl font-serif text-green-400 mb-1">Voucher Redeemed!</h2>
                                    <p className="text-white/60 text-xs mb-4">{validationTime}</p>
                                    <div className="bg-green-500/20 px-4 py-2 rounded-xl border border-green-500/30">
                                        <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-1">Items Logged:</p>
                                        <p className="text-sm text-white font-bold">{currentService}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col w-full h-full max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#2c2420]/80 backdrop-blur-sm py-2 z-10">
                                        <div>
                                            <h2 className="text-lg font-serif text-white">{scannedResult}</h2>
                                            <p className="text-[9px] text-green-400 uppercase font-bold tracking-widest">Active • Select Services</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {serviceGroups.length === 0 ? (
                                            <div className="py-8 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
                                                <AlertCircle className="text-red-500 mx-auto mb-2" size={20} />
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">No valid services found</p>
                                            </div>
                                        ) : (
                                            serviceGroups.map(group => (
                                                <div key={group.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                    <div className="text-[8px] font-bold uppercase tracking-widest text-[#c5a572] mb-2">{group.label}</div>
                                                    <div className="space-y-1">
                                                        {group.items.map((item: any) => (
                                                            <button
                                                                key={item.value}
                                                                onClick={() => toggleService?.(item.value)}
                                                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedServices.includes(item.value)
                                                                    ? 'bg-[#c5a572] text-white'
                                                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-bold">{item.label}</span>
                                                                {selectedServices.includes(item.value) && <CheckCircle size={14} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={onClose}
                                className="bg-white/10 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all border border-white/5"
                            >
                                {valStatus === 'valid' ? 'Done' : 'Cancel'}
                            </button>
                            <button
                                onClick={() => {
                                    if (valStatus === 'valid') {
                                        setScannedResult(null);
                                        setValidationTime(null);
                                        hasScannedRef.current = false;
                                    } else {
                                        onRedeem?.();
                                    }
                                }}
                                disabled={valStatus === 'searching' || (valStatus !== 'valid' && selectedServices.length === 0)}
                                className={`py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center justify-center gap-2 ${valStatus === 'valid'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-[#c5a572] text-white hover:bg-[#b39462] disabled:opacity-50'
                                    }`}
                            >
                                {valStatus === 'valid' ? (
                                    <>
                                        <Camera size={14} /> Scan Next
                                    </>
                                ) : valStatus === 'searching' ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <>
                                        <CheckCircle size={14} /> Redeem Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {invalidCode && (
                            <div className="mb-4 animate-bounce bg-red-500/20 border border-red-500/50 py-2 px-4 rounded-lg">
                                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest leading-none">{invalidCode}</p>
                            </div>
                        )}
                        <h2 className="text-xl font-serif text-white mb-3">Scan Guest Voucher</h2>
                        <div className="px-4 py-2 bg-white/5 rounded-full inline-block mb-4 border border-white/10">
                            <p className="text-[9px] text-[#c5a572] uppercase font-bold tracking-[0.2em] leading-relaxed">Redeeming For: {currentService}</p>
                        </div>
                        <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-bold leading-relaxed px-4">
                            {errorMsg ? "Please fix permissions to scan" : "Align the QR code within the highlighted frame"}
                        </p>
                    </>
                )}
                {!scannedResult && (
                    <div className="mt-8 flex flex-col gap-2">
                        <p className="text-[10px] text-white/20 uppercase font-bold">Having Trouble?</p>
                        <p className="text-[9px] text-white/30 italic">On iOS: Ensure Safari Camera access is set to 'Allow' in Settings</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Use memo to prevent unneeded re-renders when parent cycles (e.g. from polling)
export default memo(QRScanner);
