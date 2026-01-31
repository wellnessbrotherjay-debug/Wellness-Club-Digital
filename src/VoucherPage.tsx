import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    CheckCircle, Loader2, Copy, ExternalLink,
    RefreshCw, Calendar, PlusCircle, Scan,
    List, History, Search, Trash2, XCircle, AlertCircle, Mail
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Validator from './Validator';
import CountrySelector from './components/CountrySelector';

import { APPS_SCRIPT_URL } from './constants/config';
import { LoginScreen } from './components/LoginScreen';

export interface VoucherData {
    id: string;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    services: string[];
    imageUrl?: string;
    status?: string;
    created_at?: string;
    redeemed_at?: string;
    redemptions?: RedemptionData[];
    pax?: number;
    secondGuestName?: string;
}

interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
}

import { SERVICES_LIST } from './constants/services';

import { useVoucherData } from './hooks/useVoucherData';

const VoucherPage: React.FC = () => {
    const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'validate' | 'issued'>('create');
    const [formData, setFormData] = useState({
        guestName: '',
        roomNumber: '',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        imageUrl: '',
        email: '',
        pax: 1,
        additionalGuests: [] as string[],
    });

    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [currentVoucher, setCurrentVoucher] = useState<VoucherData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+62');
    const [waStatus, setWaStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const [email, setEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

    // Use custom hook for data fetching
    const {
        vouchers: recentVouchers,
        setVouchers: setRecentVouchers,
        redemptions, // Added missing redemptions from hook
        isFetching: isFetchingHistory,
        hasLoaded: hasInitialLoaded,
        error: fetchError,
        refresh: fetchData
    } = useVoucherData();

    // Auth Persistence & Magic Links
    useEffect(() => {
        // Check URL for magic PIN
        const params = new URLSearchParams(window.location.search);
        const magicPin = params.get('pin');

        if (magicPin === '0000') {
            const role = params.get('role') === 'staff' ? 'staff' : 'admin';
            handleLogin(role);
            window.history.replaceState({}, '', '/'); // Clear PIN from URL
        } else if (magicPin === '1234') {
            // Deprecated 1234 link support
            handleLogin('admin');
            window.history.replaceState({}, '', '/');
        } else {
            // Fallback to saved session
            const savedRole = localStorage.getItem('wellness_session') as 'admin' | 'staff' | null;
            if (savedRole) {
                setUserRole(savedRole);
                if (savedRole === 'staff') setActiveTab('validate');
            }
        }
    }, []);

    const handleLogin = (role: 'admin' | 'staff') => {
        setUserRole(role);
        localStorage.setItem('wellness_session', role);
        if (role === 'staff') setActiveTab('validate');
    };

    const handleLogout = () => {
        setUserRole(null);
        localStorage.removeItem('wellness_session');
        setActiveTab('create');
    };

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

        const allGuestNames = [formData.guestName, ...formData.additionalGuests].filter(Boolean).join(' & ');

        const payload = JSON.stringify({
            voucherCode: voucherId,
            userName: allGuestNames,
            status: 'Created',
            roomNumber: formData.roomNumber,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            imageUrl: formData.imageUrl,
            services: selectedServices.join(', '),
            createdAt: new Date().toLocaleString('sv-SE').replace('T', ' '), // Clean format: YYYY-MM-DD HH:mm:ss
            // details field is removed
            pax: formData.pax,
            secondGuestName: formData.additionalGuests[0] || '' // Fallback for existing sheet column
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
                guestName: allGuestNames,
                roomNumber: formData.roomNumber,
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                imageUrl: formData.imageUrl,
                services: selectedServices,
                created_at: new Date().toISOString(),
                pax: formData.pax,
                secondGuestName: formData.additionalGuests[0] || ''
            };

            setCurrentVoucher(newVoucher);
            setRecentVouchers(prev => [newVoucher, ...prev]);
            setEmail(formData.email); // Pre-fill email for sending
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
            imageUrl: '',
            email: '',
            pax: 1,
            additionalGuests: [],
        });
        setSelectedServices([]);
        setCurrentVoucher(null);
        setStatus('idle');
        // Keep whatsapp number if we want to retain it, or clear it. 
        // User workflow: New voucher -> New Number.
        setWhatsappNumber('');
        setWaStatus('idle');
        setEmail('');
        setEmailStatus('idle');
    };

    const sendToWhatsApp = async () => {
        if (!currentVoucher || !whatsappNumber) return;

        setWaStatus('sending');

        // Use client-side wa.me link instead of backend webhook
        const cleanNumber = whatsappNumber.replace(/^0+/, '').replace(/\D/g, '');
        const fullNumber = `${countryCode.replace('+', '')}${cleanNumber}`;
        const link = `${window.location.origin}/v/${currentVoucher.id}`;

        const message = `Dear ${currentVoucher.guestName},\n\nHere is your *No.1 Wellness Club Digital Pass*:\n${link}\n\nPresent this at the reception to redeem your services.\n\nEnjoy your stay!`;

        const waLink = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;

        window.open(waLink, '_blank');

        // Simulate success
        setTimeout(() => {
            setWaStatus('sent');
            setTimeout(() => setWaStatus('idle'), 3000);
        }, 1000);
    };

    const handleSendEmail = () => {
        if (!currentVoucher || !email) return;

        setEmailStatus('sending');

        const subject = `Your No.1 Wellness Club Digital Pass`;
        const body = `Dear ${currentVoucher.guestName},\n\nHere is your digital pass for No.1 Wellness Club:\n\n${window.location.origin}/v/${currentVoucher.id}\n\nEnjoy your stay!\n\nBest regards,\nNo.1 Wellness Club Team`;

        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;

        // Simulate success since we handed off to the mail client
        setTimeout(() => {
            setEmailStatus('sent');
            setTimeout(() => setEmailStatus('idle'), 3000);
        }, 1000);
    };

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear all local voucher history? This doesn't affect the Google Sheet.")) {
            setRecentVouchers([]);
            localStorage.removeItem('reception_vouchers');
        }
    };

    const filteredVouchers = (Array.isArray(recentVouchers) ? recentVouchers : []).filter(v =>
        v.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.roomNumber.includes(searchQuery)
    );

    const voucherUrl = (voucher: VoucherData) =>
        `${window.location.origin}/v/${voucher.id}?d=${btoa(JSON.stringify(voucher))}`;

    if (!userRole) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Reception | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/htf-logo.png" alt="HTF Solutions" className="h-20 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-serif font-bold">Reception Hub</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Digital Pass Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            <span className="text-[10px] text-gray-400 uppercase">Live Dashboard</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-600 border border-red-200 px-4 py-2 rounded-lg transition-all hover:bg-red-50"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
                    <div className="flex border-t border-gray-50">
                        {userRole === 'admin' && (
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'create' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <PlusCircle size={16} /> Create
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('validate')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'validate' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Scan size={16} /> Validate
                        </button>
                        {userRole === 'admin' && (
                            <button
                                onClick={() => setActiveTab('issued')}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'issued' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <List size={16} /> Issued
                                <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-[9px]">{recentVouchers.length}</span>
                            </button>
                        )}
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
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pax (Guests)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                            value={formData.pax}
                                            onChange={e => setFormData({ ...formData, pax: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div className="space-y-4 md:col-span-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Additional Guests</label>
                                            <button
                                                onClick={() => setFormData({ ...formData, additionalGuests: [...formData.additionalGuests, ''] })}
                                                className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors font-bold uppercase"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {formData.additionalGuests.map((name, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-[#c5a572] transition-all text-sm font-medium"
                                                        placeholder={`Guest ${idx + 2} Name`}
                                                        value={name}
                                                        onChange={e => {
                                                            const newGuests = [...formData.additionalGuests];
                                                            newGuests[idx] = e.target.value;
                                                            setFormData({ ...formData, additionalGuests: newGuests });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newGuests = formData.additionalGuests.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, additionalGuests: newGuests });
                                                        }}
                                                        className="text-red-400 hover:text-red-600 transition-colors p-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {formData.additionalGuests.length === 0 && (
                                                <p className="text-[10px] text-gray-300 italic">No additional guests added.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Room Number</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                            placeholder="Room 101"
                                            value={formData.roomNumber}
                                            onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">WhatsApp Number (For Digital Delivery)</label>
                                        <div className="flex gap-2">
                                            <CountrySelector value={countryCode} onChange={setCountryCode} />
                                            <input
                                                type="text"
                                                className="flex-1 bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium font-mono"
                                                placeholder="812345678"
                                                value={whatsappNumber}
                                                onChange={e => setWhatsappNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guest Email (Optional)</label>
                                        <input
                                            type="email"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                            placeholder="guest@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Check In</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] transition-all font-medium appearance-none"
                                            value={formData.checkIn}
                                            onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
                                        />
                                        <Calendar
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 cursor-pointer pointer-events-auto"
                                            size={18}
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                if (input) {
                                                    try {
                                                        if (typeof (input as any).showPicker === 'function') {
                                                            (input as any).showPicker();
                                                        } else {
                                                            input.focus();
                                                        }
                                                    } catch (err) {
                                                        input.focus();
                                                    }
                                                }
                                            }}
                                        />
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
                                        <Calendar
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 cursor-pointer pointer-events-auto"
                                            size={18}
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                if (input) {
                                                    try {
                                                        if (typeof (input as any).showPicker === 'function') {
                                                            (input as any).showPicker();
                                                        } else {
                                                            input.focus();
                                                        }
                                                    } catch (err) {
                                                        input.focus();
                                                    }
                                                }
                                            }}
                                        />
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

                        {/* GENERATED RECENTLY PREVIEW */}
                        {currentVoucher && (
                            <div className="bg-[#f0fdf4] border border-green-100 p-8 rounded-2xl animate-fade-in flex flex-col items-center gap-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 translate-x-16 -translate-y-16 rounded-full" />

                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative z-10">
                                    <QRCode value={voucherUrl(currentVoucher)} size={200} />
                                </div>

                                <div className="text-center relative z-10 w-full">
                                    <div className="flex items-center gap-2 text-green-600 font-bold uppercase tracking-widest text-[10px] mb-2 justify-center">
                                        {recentVouchers.find(v => v.id === currentVoucher.id)?.status === 'Redeemed' ? (
                                            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-1 rounded-full animate-bounce mt-2">
                                                <AlertCircle size={14} />
                                                <span>Voucher Validated & Redeemed</span>
                                            </div>
                                        ) : (
                                            <>
                                                <CheckCircle size={14} />
                                                <span>Voucher Created Successfully</span>
                                            </>
                                        )}
                                    </div>
                                    <h3 className="text-3xl font-serif text-[#2c2420] mb-1 font-bold">{currentVoucher.id}</h3>
                                    <p className="text-gray-500 text-sm mb-2">{currentVoucher.guestName} • Room {currentVoucher.roomNumber}</p>

                                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-[#c5a572] mb-8">
                                        <span>{currentVoucher.pax || 1} Pax</span>
                                        {currentVoucher.guestName.includes('&') && (
                                            <>
                                                <span>•</span>
                                                <div className="flex flex-col gap-1">
                                                    {currentVoucher.guestName.split(' & ').slice(1).map((name, i) => (
                                                        <span key={i}>+ {name}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

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

                                        <button
                                            onClick={() => {
                                                const width = 375;
                                                const height = 800;
                                                const left = (window.screen.width - width) / 2;
                                                const top = (window.screen.height - height) / 2;

                                                // Link without base64 data (it's fetched by ID now)
                                                window.open(
                                                    `${window.location.origin}/v/${currentVoucher.id}`,
                                                    'GuestPassPopup',
                                                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
                                                );
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2c2420] text-white rounded-xl hover:bg-black text-sm font-bold transition-all"
                                        >
                                            Open Pass
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>

                                    {/* WHATSAPP SENDER */}
                                    <div className="mt-6 w-full max-w-sm pt-6 border-t border-dashed border-gray-200 mx-auto">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 block text-left">Send to Guest (WhatsApp)</label>
                                        <div className="flex gap-2">
                                            <div className="w-32">
                                                <CountrySelector value={countryCode} onChange={setCountryCode} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Number..."
                                                value={whatsappNumber}
                                                onChange={e => setWhatsappNumber(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm font-mono focus:outline-none focus:border-green-500 transition-colors"
                                            />
                                            <button
                                                onClick={sendToWhatsApp}
                                                disabled={!whatsappNumber || waStatus === 'sending' || waStatus === 'sent'}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all ${waStatus === 'sent'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                            >
                                                {waStatus === 'sending' ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : waStatus === 'sent' ? (
                                                    <>
                                                        <CheckCircle size={14} /> Sent!
                                                    </>
                                                ) : (
                                                    <>
                                                        Send
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* EMAIL SENDER */}
                                    <div className="mt-4 w-full max-w-sm pt-4 border-t border-dashed border-gray-200 mx-auto">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2 block text-left">Send via Email</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="guest@example.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                            <button
                                                onClick={handleSendEmail}
                                                disabled={!email || emailStatus === 'sending' || emailStatus === 'sent'}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all ${emailStatus === 'sent'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {emailStatus === 'sending' ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : emailStatus === 'sent' ? (
                                                    <>
                                                        <CheckCircle size={14} /> Sent!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail size={14} /> Send
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button onClick={resetForm} className="mt-8 text-gray-400 hover:text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw size={14} /> Create Next Voucher
                        </button>
                    </div>
                )}

                {/* VALIDATE TAB */}
                {activeTab === 'validate' && (
                    <div className="animate-fade-in">
                        <Validator
                            vouchers={recentVouchers}
                            onRefresh={() => fetchData(true)}
                        />
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
                            {isFetchingHistory && !hasInitialLoaded && (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#c5a572]">
                                        <Loader2 size={32} className="animate-spin" />
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading History...</p>
                                </div>
                            )}

                            {(!isFetchingHistory || hasInitialLoaded) && fetchError && (
                                <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                                        <XCircle size={32} />
                                    </div>
                                    <p className="text-red-800 font-bold uppercase tracking-widest text-xs mb-2">Connection Error</p>
                                    <p className="text-gray-500 text-xs mb-6 max-w-xs mx-auto">Could not fetch data from Google Sheets.</p>
                                    <button
                                        onClick={() => fetchData()}
                                        className="mt-6 px-8 py-3 bg-white text-red-600 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm border border-red-100 hover:bg-red-50 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {(!isFetchingHistory || hasInitialLoaded) && !fetchError && filteredVouchers.length === 0 ? (
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
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[#c5a572] font-bold text-xs mr-2">{voucher.id}</span>
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[8px] uppercase">
                                                        Issued: {(() => {
                                                            if (!voucher.created_at) return 'N/A';
                                                            try {
                                                                return new Date(voucher.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                                            } catch (e) {
                                                                return 'Invalid Date';
                                                            }
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* REDEMPTION HISTORY IN LIST */}
                                            <div className="mt-2 space-y-1">
                                                {Array.isArray(redemptions) && redemptions.filter(r => r.voucherCode === voucher.id).map((redeem, idx) => (
                                                    <div key={`red-${idx}`} className="text-xs text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-100 flex justify-between items-center">
                                                        <CheckCircle size={10} />
                                                        <span className="text-[9px] font-bold uppercase">
                                                            {redeem.serviceType} • {(() => {
                                                                try {
                                                                    return new Date(redeem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                } catch (e) {
                                                                    return '';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {voucher.status === 'Redeemed' && (
                                                <span className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold uppercase rounded-lg">
                                                    Redeemed
                                                </span>
                                            )}

                                            <button
                                                onClick={() => {
                                                    const width = 375;
                                                    const height = 800;
                                                    const left = (window.screen.width - width) / 2;
                                                    const top = (window.screen.height - height) / 2;

                                                    window.open(
                                                        `${window.location.origin}/v/${voucher.id}`,
                                                        'GuestPassPopup',
                                                        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
                                                    );
                                                }}
                                                className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VoucherPage;
