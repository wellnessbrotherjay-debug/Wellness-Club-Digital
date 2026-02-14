import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    CheckCircle, Loader2, Copy, ExternalLink,
    RefreshCw, Calendar, PlusCircle, Scan,
    List, History, Search, Trash2, XCircle, AlertCircle, Mail, BarChart
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Validator from './Validator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
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
    serviceType?: string;
    redeemed_service?: string;
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

import { ENTITLEMENTS } from './constants/services';

import { useVoucherData } from './hooks/useVoucherData';

const VoucherPage: React.FC = () => {
    const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'validate' | 'issued' | 'analytics' | 'declined'>('create');
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


    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [currentVoucher, setCurrentVoucher] = useState<VoucherData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+62');
    const [waStatus, setWaStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const [email, setEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const [nonIssuanceForm, setNonIssuanceForm] = useState({
        roomNumber: '',
        duration: '',
        reason: '' as 'No WhatsApp' | 'Busy' | 'Not Interested' | 'Custom' | '',
        customReason: ''
    });
    const [isLogging, setIsLogging] = useState(false);

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

    // Robust fallback for redemptions
    const effectiveRedemptions = redemptions.length > 0 ? redemptions : recentVouchers
        .filter(v => v.status === 'Redeemed')
        .map(v => ({
            timestamp: v.redeemed_at || v.created_at || new Date().toISOString(),
            voucherCode: v.id,
            guestName: v.guestName,
            serviceType: (v.services && v.services.length > 0) ? v.services[0] : 'General Admission'
        }));

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



    // Removed localStorage logic as we now fetch from Sheets



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

        const services = [
            ENTITLEMENTS.TS_SHOPPING,
            ENTITLEMENTS.TS_SALON,
            ENTITLEMENTS.WELLNESS_ALL
        ];

        const allGuestNames = [formData.guestName, ...formData.additionalGuests].filter(Boolean).join(' & ');

        const payload = JSON.stringify({
            voucherCode: voucherId,
            userName: allGuestNames,
            status: 'Created',
            roomNumber: formData.roomNumber,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            imageUrl: formData.imageUrl,
            services: services.join(', '),
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
                services: services,
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

    const handleLogNonIssuance = async () => {
        const { roomNumber, duration, reason, customReason } = nonIssuanceForm;
        if (!roomNumber || !reason) {
            alert("Please provide at least a room number and a reason.");
            return;
        }

        setIsLogging(true);
        const finalReason = reason === 'Custom' ? customReason : reason;

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'log_non_issuance',
                    roomNumber: roomNumber,
                    duration: duration,
                    reason: finalReason,
                    timestamp: new Date().toISOString()
                }),
            });

            alert("Insight logged successfully. Thank you!");
            setNonIssuanceForm({
                roomNumber: '',
                duration: '',
                reason: '',
                customReason: ''
            });
            setActiveTab('create');
        } catch (error) {
            console.error("Error logging insight:", error);
            alert("Failed to log insight. Please try again.");
        } finally {
            setIsLogging(false);
        }
    };

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear all local voucher history? This doesn't affect the Google Sheet.")) {
            setRecentVouchers([]);
            localStorage.removeItem('reception_vouchers');
        }
    };

    const handleDeleteVoucher = async (ids: string | string[]) => {
        const idList = Array.isArray(ids) ? ids : [ids];
        if (idList.length === 0) return;

        const isBulk = idList.length > 1;
        const confirmMsg = isBulk
            ? `Are you sure you want to permanently delete these ${idList.length} vouchers?`
            : `Are you sure you want to permanently delete voucher ${idList[0]}?`;

        if (!window.confirm(confirmMsg)) return;

        const password = window.prompt("Enter Admin Password to delete:");
        if (password !== '1111') {
            alert("Incorrect password. Deletion cancelled.");
            return;
        }

        setIsDeleting(true);
        console.log("Starting deletion for ids:", idList);

        try {
            const body = JSON.stringify({
                action: 'delete',
                voucherCode: isBulk ? idList : idList[0]
            });
            console.log("Sending delete request with body:", body);

            // Optimistic update
            setRecentVouchers(prev => prev.filter(v => !idList.includes(v.id)));
            if (isBulk) setSelectedIds([]);

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: body,
            });

            console.log("Delete request sent:", response.type);
            alert(isBulk ? `${idList.length} vouchers deleted successfully.` : `Voucher deleted successfully.`);

        } catch (error) {
            console.error("Error deleting vouchers:", error);
            alert("Failed to delete. Please check your connection and refresh.");
            fetchData(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredVouchers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredVouchers.map(v => v.id));
        }
    };

    const filteredVouchers = (Array.isArray(recentVouchers) ? recentVouchers : []).filter(v => {
        const query = searchQuery.toLowerCase();
        return (
            String(v.guestName || '').toLowerCase().includes(query) ||
            String(v.id || '').toLowerCase().includes(query) ||
            String(v.roomNumber || '').toLowerCase().includes(query)
        );
    });

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
                            onClick={() => window.location.href = '/help'}
                            className="text-xs font-bold uppercase tracking-widest text-[#c5a572] hover:text-[#2c2420] border border-[#c5a572]/20 px-4 py-2 rounded-lg transition-all hover:bg-[#c5a572]/10"
                        >
                            Help
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
                    <div className="flex border-t border-gray-50">
                        {userRole === 'admin' && (
                            <>
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'create' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    <PlusCircle size={16} /> Create
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setActiveTab('validate')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'validate' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Scan size={16} /> Validate
                        </button>
                        <button
                            onClick={() => setActiveTab('declined')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'declined' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <AlertCircle size={16} /> Insights
                        </button>
                        {userRole === 'admin' && (
                            <>
                                <button
                                    onClick={() => setActiveTab('issued')}
                                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'issued' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    <List size={16} /> Issued
                                    <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-[9px]">{recentVouchers.length}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'analytics' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    <BarChart size={16} /> Analytics
                                </button>
                            </>
                        )}
                        {userRole === 'staff' && (
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

                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative z-10 flex flex-col items-center">
                                    <QRCode value={voucherUrl(currentVoucher)} size={200} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4">Guest Scan to Download</p>
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
                                    <h3 className="text-3xl font-mono text-[#c5a572] mb-1 font-bold tracking-wider">{currentVoucher.id}</h3>
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
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center transition-all">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    onClick={toggleSelectAll}
                                    disabled={isDeleting}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${selectedIds.length > 0 && selectedIds.length === filteredVouchers.length
                                        ? 'bg-[#c5a572] text-white border-[#c5a572]'
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-[#c5a572]'
                                        } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {selectedIds.length > 0 && selectedIds.length === filteredVouchers.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID or room..."
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#c5a572] outline-none transition-all"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {selectedIds.length > 0 ? (
                                <div className="flex items-center gap-4 w-full md:w-auto animate-scale-in">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        {selectedIds.length} Selected
                                    </span>
                                    <button
                                        onClick={() => handleDeleteVoucher(selectedIds)}
                                        disabled={isDeleting}
                                        className={`flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-600 active:scale-95 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Trash2 size={18} className={isDeleting ? 'animate-pulse' : ''} />
                                        <span>{isDeleting ? 'Deleting...' : 'Delete Selected'}</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={clearHistory}
                                    className="flex items-center gap-2 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
                                >
                                    <Trash2 size={18} /> <span>Clear History</span>
                                </button>
                            )}
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
                                    <div
                                        key={voucher.id}
                                        className={`bg-white p-6 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row justify-between items-center gap-6 group relative overflow-hidden ${selectedIds.includes(voucher.id) ? 'border-[#c5a572] bg-[#fcfaf7]' : 'border-gray-100 hover:border-[#c5a572]/40'
                                            }`}
                                    >
                                        <div className="flex gap-4 items-center w-full md:w-auto">
                                            {/* Selection Checkbox */}
                                            <button
                                                onClick={() => toggleSelect(voucher.id)}
                                                disabled={isDeleting}
                                                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${selectedIds.includes(voucher.id)
                                                    ? 'bg-[#c5a572] border-[#c5a572] text-white'
                                                    : 'border-gray-200 hover:border-[#c5a572] text-transparent'
                                                    } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <CheckCircle size={14} className={selectedIds.includes(voucher.id) ? 'opacity-100' : 'opacity-0'} />
                                            </button>

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
                                                {Array.isArray(effectiveRedemptions) && effectiveRedemptions.filter(r => r.voucherCode === voucher.id).map((redeem, idx) => (
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
                                                    // Populate form with voucher data
                                                    const names = voucher.guestName.split(' & ');
                                                    setFormData({
                                                        guestName: names[0] || '',
                                                        roomNumber: voucher.roomNumber || '',
                                                        checkIn: voucher.checkIn || new Date().toISOString().split('T')[0],
                                                        checkOut: voucher.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                                        imageUrl: voucher.imageUrl || '',
                                                        email: '', // Email not stored in voucher data
                                                        pax: voucher.pax || 1,
                                                        additionalGuests: names.slice(1),
                                                    });
                                                    setCurrentVoucher(voucher);
                                                    setActiveTab('create');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                Open
                                            </button>

                                            <button
                                                onClick={() => handleDeleteVoucher(voucher.id)}
                                                disabled={isDeleting}
                                                className={`p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title="Delete Voucher"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <AnalyticsDashboard />
                )}

                {/* DECLINED TAB */}
                {activeTab === 'declined' && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="mb-8">
                                <h3 className="text-2xl font-serif font-bold mb-1 italic text-amber-900">Non-Issuance Log</h3>
                                <p className="text-sm text-gray-400 font-medium">Why was a voucher not issued to this guest?</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Room Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 101"
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-amber-200 rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                                            value={nonIssuanceForm.roomNumber}
                                            onChange={e => setNonIssuanceForm({ ...nonIssuanceForm, roomNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stay Duration (Nights)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 3"
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-amber-200 rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                                            value={nonIssuanceForm.duration}
                                            onChange={e => setNonIssuanceForm({ ...nonIssuanceForm, duration: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Main Reason</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['No WhatsApp', 'Busy', 'Not Interested', 'Custom'].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setNonIssuanceForm({ ...nonIssuanceForm, reason: r as any })}
                                                className={`px-4 py-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${nonIssuanceForm.reason === r
                                                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {nonIssuanceForm.reason === 'Custom' && (
                                    <div className="space-y-2 animate-scale-in">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Describe Reason</label>
                                        <textarea
                                            placeholder="Briefly describe why..."
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-amber-200 rounded-xl px-4 py-3 text-sm outline-none transition-all min-h-[100px]"
                                            value={nonIssuanceForm.customReason}
                                            onChange={e => setNonIssuanceForm({ ...nonIssuanceForm, customReason: e.target.value })}
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={handleLogNonIssuance}
                                    disabled={isLogging || !nonIssuanceForm.roomNumber || !nonIssuanceForm.reason}
                                    className="w-full bg-[#2c2420] text-white py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-bold text-sm uppercase tracking-widest"
                                >
                                    {isLogging ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Logging...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlusCircle size={18} />
                                            <span>Submit Log</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VoucherPage;
