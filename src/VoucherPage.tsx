import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    CheckCircle, Loader2, Copy, ExternalLink,
    RefreshCw, Calendar, PlusCircle, Scan,
    List, History, Search, Trash2, Smartphone, XCircle
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Validator from './Validator';

interface VoucherData {
    id: string;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    services: string[];
    timestamp: string; // ISO string for storage
}

const SERVICES_LIST = [
    "15% off T Store Shopping",
    "15% off TS Salon Services",
    "No.1 Wellness Club Access",
    "Complimentary Breakfast",
    "Late Check-out (2pm)",
    "Welcome Drink",
    "Personal Training Session"
];

const VoucherPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'create' | 'validate' | 'issued'>('create');
    const [formData, setFormData] = useState({
        guestName: '',
        roomNumber: '',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    });

    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [currentVoucher, setCurrentVoucher] = useState<VoucherData | null>(null);
    const [recentVouchers, setRecentVouchers] = useState<VoucherData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8y4tdQIIbRDq7zaWsSDc2oEBsSXomEQP2nC-cZYcCteJwl6FwvvuGP3S8I6pTWGvG/exec';

    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    // Extend window to support JSONP callback
    useEffect(() => {
        (window as any).loadVouchers = (data: any[]) => {
            setIsFetchingHistory(false);
            setFetchError(false);
            const mapped = data.map(item => {
                // Parse details string "Room: 101 | In: 2026-01-23..."
                // Or fallback to dummy parsing if needed
                let room = '';
                let checkIn = '';
                let checkOut = '';

                if (item.details) {
                    const roomMatch = item.details.match(/Room:\s*([^|]+)/);
                    if (roomMatch) room = roomMatch[1].trim();

                    const inMatch = item.details.match(/In:\s*([^|]+)/);
                    if (inMatch) checkIn = inMatch[1].trim();

                    const outMatch = item.details.match(/Out:\s*([^|]+)/);
                    if (outMatch) checkOut = outMatch[1].trim();
                }

                return {
                    id: item.code,
                    guestName: item.guestName,
                    roomNumber: room,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    status: item.status,
                    timestamp: item.timestamp,
                    services: [] // Not strictly needed for list view, but could parse from details
                };
            }).reverse(); // Show newest first

            setRecentVouchers(mapped);
        };
    }, []);

    const fetchVouchersFromSheet = () => {
        setIsFetchingHistory(true);
        setFetchError(false);

        const script = document.createElement('script');
        script.src = `${APPS_SCRIPT_URL}?callback=loadVouchers&t=${Date.now()}`;
        document.body.appendChild(script);

        // Cleanup
        script.onload = () => document.body.removeChild(script);
        script.onerror = () => {
            document.body.removeChild(script);
            setIsFetchingHistory(false);
            setFetchError(true);
        };
    };

    // Load from Sheet on mount and when tab changes
    useEffect(() => {
        if (activeTab === 'issued') {
            fetchVouchersFromSheet();
        }
    }, [activeTab]);

    // Initial load
    useEffect(() => {
        fetchVouchersFromSheet();
    }, []);

    // Removed localStorage logic as we now fetch from Sheets

    const toggleService = (service: string) => {
        setSelectedServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    const generateVoucherId = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'NW-';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleGenerate = async () => {
        setStatus('generating');
        const voucherId = generateVoucherId();

        const payload = JSON.stringify({
            voucherCode: voucherId,
            userName: formData.guestName,
            status: 'Active',
            details: `Room: ${formData.roomNumber} | In: ${formData.checkIn} | Out: ${formData.checkOut} | Services: ${selectedServices.join(', ')}`
        });

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload,
            });

            const newVoucher: VoucherData = {
                id: voucherId,
                guestName: formData.guestName,
                roomNumber: formData.roomNumber,
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                services: selectedServices,
                timestamp: new Date().toISOString()
            };

            setCurrentVoucher(newVoucher);
            setRecentVouchers(prev => [newVoucher, ...prev]);
            setStatus('success');

        } catch (error) {
            console.error("Error generating voucher:", error);
            setStatus('error');
        }
    };

    const resetForm = () => {
        setFormData({
            guestName: '',
            roomNumber: '',
            checkIn: new Date().toISOString().split('T')[0],
            checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        });
        setSelectedServices([]);
        setCurrentVoucher(null);
        setStatus('idle');
    };

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear all local voucher history? This doesn't affect the Google Sheet.")) {
            setRecentVouchers([]);
            localStorage.removeItem('reception_vouchers');
        }
    };

    const filteredVouchers = recentVouchers.filter(v =>
        v.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.roomNumber.includes(searchQuery)
    );

    const voucherUrl = (voucher: VoucherData) =>
        `${window.location.origin}/v/${voucher.id}?d=${btoa(JSON.stringify(voucher))}`;

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Reception | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/htf-logo.png" alt="HTF Solutions" className="h-12 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-serif font-bold">Reception Hub</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Digital Pass Management</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            <span className="text-[10px] text-gray-400 uppercase">Live Dashboard</span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
                    <div className="flex border-t border-gray-50">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'create' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <PlusCircle size={16} /> Create
                        </button>
                        <button
                            onClick={() => setActiveTab('validate')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'validate' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Scan size={16} /> Validate
                        </button>
                        <button
                            onClick={() => setActiveTab('issued')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'issued' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <List size={16} /> Issued
                            <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-[9px]">{recentVouchers.length}</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-6 mt-8">

                {/* CREATE TAB */}
                {activeTab === 'create' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="mb-8">
                                <h2 className="text-2xl font-serif mb-1">New Guest Pass</h2>
                                <p className="text-sm text-gray-400">Generate a unique QR pass for hotel guests.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guest Name</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                            placeholder="Guest Full Name"
                                            value={formData.guestName}
                                            onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Room Number</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                            placeholder="e.g. 101"
                                            value={formData.roomNumber}
                                            onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Check In</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] transition-all font-medium appearance-none"
                                                value={formData.checkIn}
                                                onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
                                            />
                                            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Check Out</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] transition-all font-medium appearance-none"
                                                value={formData.checkOut}
                                                onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
                                            />
                                            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Includes Services</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {SERVICES_LIST.map(service => (
                                            <button
                                                key={service}
                                                onClick={() => toggleService(service)}
                                                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${selectedServices.includes(service)
                                                    ? 'bg-[#c5a572]/5 border-[#c5a572] shadow-sm'
                                                    : 'bg-white border-gray-100 hover:border-gray-300 text-gray-500'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedServices.includes(service)
                                                    ? 'bg-[#c5a572] border-[#c5a572]'
                                                    : 'bg-gray-100 border-gray-200'
                                                    }`}>
                                                    {selectedServices.includes(service) && <CheckCircle size={12} className="text-white" />}
                                                </div>
                                                <span className="text-sm font-medium">{service}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={status === 'generating' || !formData.guestName || !formData.roomNumber}
                                    className="w-full bg-[#2c2420] text-white h-16 rounded-xl font-bold tracking-[.2em] uppercase hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-8 group"
                                >
                                    {status === 'generating' ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Issue Digital Voucher</span>
                                            <PlusCircle className="group-hover:translate-x-1 transition-transform" size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* GENERATED RECENTLY PREVIEW */}
                        {currentVoucher && (
                            <div className="bg-[#f0fdf4] border border-green-100 p-8 rounded-2xl animate-fade-in flex flex-col items-center gap-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 translate-x-16 -translate-y-16 rounded-full" />

                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative z-10">
                                    <QRCode value={voucherUrl(currentVoucher)} size={200} />
                                </div>

                                <div className="text-center relative z-10 w-full">
                                    <div className="flex items-center gap-2 text-green-600 font-bold uppercase tracking-widest text-[10px] mb-2 justify-center">
                                        <CheckCircle size={14} />
                                        <span>Voucher Created Successfully</span>
                                    </div>
                                    <h3 className="text-3xl font-serif text-[#2c2420] mb-1 font-bold">{currentVoucher.id}</h3>
                                    <p className="text-gray-500 text-sm mb-8">{currentVoucher.guestName} • Room {currentVoucher.roomNumber}</p>

                                    <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(voucherUrl(currentVoucher));
                                                alert("Link copied to clipboard");
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-bold transition-all"
                                        >
                                            <Copy size={16} />
                                            Copy Link
                                        </button>
                                        <a
                                            href={voucherUrl(currentVoucher)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2c2420] text-white rounded-xl hover:bg-black text-sm font-bold shadow-lg transition-all"
                                        >
                                            <Smartphone size={16} />
                                            Open Mobile
                                        </a>
                                    </div>
                                </div>

                                <button onClick={resetForm} className="mt-8 text-gray-400 hover:text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <RefreshCw size={14} /> Create Next Voucher
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* VALIDATE TAB */}
                {activeTab === 'validate' && (
                    <div className="animate-fade-in">
                        <Validator scriptUrl={APPS_SCRIPT_URL} />
                    </div>
                )}

                {/* ISSUED TAB */}
                {activeTab === 'issued' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID or room..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#c5a572] outline-none transition-all"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={clearHistory}
                                className="flex items-center gap-2 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
                            >
                                <Trash2 size={18} /> <span>Clear History</span>
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {isFetchingHistory && (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#c5a572]">
                                        <Loader2 size={32} className="animate-spin" />
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading History...</p>
                                </div>
                            )}

                            {!isFetchingHistory && fetchError && (
                                <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                                        <XCircle size={32} />
                                    </div>
                                    <p className="text-red-800 font-bold uppercase tracking-widest text-xs mb-2">Connection Error</p>
                                    <p className="text-gray-500 text-xs mb-6 max-w-xs mx-auto">Could not fetch data from Google Sheets.</p>
                                    <button
                                        onClick={fetchVouchersFromSheet}
                                        className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!isFetchingHistory && !fetchError && filteredVouchers.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                        <History size={32} />
                                    </div>
                                    <p className="text-gray-400">No vouchers found in local history.</p>
                                </div>
                            ) : (
                                !isFetchingHistory && !fetchError && filteredVouchers.map(voucher => (
                                    <div key={voucher.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#c5a572]/40 transition-all flex flex-col md:flex-row justify-between items-center gap-6 group">
                                        <div className="flex gap-4 items-center w-full md:w-auto">
                                            <div className="w-12 h-12 bg-[#fcfcfc] border border-gray-100 rounded-lg flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                                <QRCode value={voucherUrl(voucher)} size={48} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg">{voucher.guestName}</h3>
                                                    <span className="px-2 py-0.5 bg-[#f0ede6] text-[#2c2420] text-[9px] font-bold rounded uppercase">Room {voucher.roomNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                    <span className="font-mono text-[#c5a572] font-bold">{voucher.id}</span>
                                                    <span>•</span>
                                                    <span>Issued {new Date(voucher.timestamp).toLocaleDateString()} at {new Date(voucher.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(voucherUrl(voucher));
                                                    alert("Link copied");
                                                }}
                                                className="flex-1 md:flex-none p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-[#2c2420] transition-colors"
                                                title="Copy Link"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <a
                                                href={voucherUrl(voucher)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 md:flex-none p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-[#2c2420] transition-colors"
                                                title="View"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button
                                                onClick={() => {
                                                    setCurrentVoucher(voucher);
                                                    setActiveTab('create');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="flex-[2] md:flex-none px-6 py-3 bg-[#f0ede6] text-[#2c2420] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#c5a572] hover:text-white transition-all shadow-sm"
                                            >
                                                Show QR
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* QUICK INFO (Bottom Bar) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 py-3 px-6 z-30">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    <div>No.1 Wellness Club • Reception Dashboard</div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span>Systems Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoucherPage;

