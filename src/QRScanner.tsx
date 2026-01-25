import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { XCircle } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
      /* verbose= */ false
        );

        const handleScan = (decodedText: string) => {
            try {
                const data = JSON.parse(decodedText);
                if (data.type === 'voucher-redemption' && data.id) {
                    scanner.clear();
                    onScanSuccess(data.id);
                } else {
                    // If it's just a raw code NW-XXXX
                    onScanSuccess(decodedText);
                    scanner.clear();
                }
            } catch (e) {
                // Fallback for raw text codes
                if (decodedText.startsWith('NW-')) {
                    onScanSuccess(decodedText);
                    scanner.clear();
                }
            }
        };

        scanner.render(handleScan, (error) => {
            // Ignore scan errors
        });

        return () => {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
            >
                <XCircle size={32} />
            </button>

            <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden relative border-2 border-[#c5a572]/30 shadow-2xl shadow-[#c5a572]/20">
                <div id="reader" className="w-full h-full"></div>
                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-[#c5a572] rounded-2xl animate-pulse"></div>
            </div>

            <div className="mt-8 text-center">
                <h2 className="text-xl font-serif text-white mb-2">Scan Guest Voucher</h2>
                <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Align QR code within the frame</p>
            </div>
        </div>
    );
};

export default QRScanner;
