import React, { useEffect, useRef, memo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { XCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
    valStatus?: 'idle' | 'searching' | 'valid' | 'invalid' | 'error' | 'expired';
    currentService?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose, valStatus, currentService }) => {
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
                    <div className="animate-fade-in flex flex-col items-center">
                        <div className={`border rounded-2xl p-6 w-full mb-6 transition-all duration-500 ${valStatus === 'valid' ? 'bg-green-500/20 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'bg-black/40 border-white/10'}`}>
                            {valStatus === 'searching' ? (
                                <div className="flex flex-col items-center py-2">
                                    <Loader2 className="animate-spin text-[#c5a572] mb-3" size={32} />
                                    <h2 className="text-xl font-serif text-white">Redeeming...</h2>
                                    <p className="text-[10px] text-white/40 uppercase font-bold mt-2">Updating Sheet</p>
                                </div>
                            ) : valStatus === 'valid' ? (
                                <div className="animate-scale-in">
                                    <h2 className="text-2xl font-serif text-green-400 mb-1">Voucher Redeemed!</h2>
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <span className="text-[10px] text-green-500/60 font-bold uppercase tracking-widest">Time:</span>
                                        <span className="text-[10px] text-white font-mono bg-white/10 px-2 py-0.5 rounded">{validationTime}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-green-500/20 rounded-full inline-block mb-2">
                                        <p className="text-[9px] text-green-400 uppercase font-bold tracking-widest">{currentService}</p>
                                    </div>
                                </div>
                            ) : valStatus === 'error' ? (
                                <div className="flex flex-col items-center py-2">
                                    <AlertCircle className="text-red-500 mb-3" size={32} />
                                    <h2 className="text-xl font-serif text-white">System Error</h2>
                                    <p className="text-[10px] text-red-400 uppercase font-bold mt-1">Check Hub connection</p>
                                    <button
                                        onClick={() => onScanSuccessRef.current(scannedResult)}
                                        className="mt-4 text-[10px] text-white bg-red-500/20 px-4 py-2 rounded-full font-bold uppercase"
                                    >
                                        Retry Redemption
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-serif text-white mb-1">Captured</h2>
                                    <p className="text-[10px] text-white/40 uppercase font-bold mb-4">Ready to Redeem</p>
                                </>
                            )}
                            {valStatus !== 'error' && (
                                <p className="text-white font-mono tracking-widest text-lg bg-black/40 py-3 px-4 rounded-xl border border-white/5 mt-2">{scannedResult}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button
                                onClick={() => {
                                    setScannedResult(null);
                                    setValidationTime(null);
                                    hasScannedRef.current = false;
                                    // Don't stop the camera, just allow another scan
                                }}
                                className="bg-[#c5a572] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-[#c5a572]/20 hover:bg-[#b39462] transition-colors"
                            >
                                {valStatus === 'valid' ? 'Scan Next' : 'Reset Overlay'}
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-white/10 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all border border-white/5"
                            >
                                {valStatus === 'valid' ? 'Done' : 'Cancel'}
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
