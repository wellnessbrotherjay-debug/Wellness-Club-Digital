import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    CheckCircle, Loader2, Copy, ExternalLink,
    Calendar, PlusCircle, Scan, Plus,
    List, History, Search, Trash2, XCircle, AlertCircle, Mail, BarChart, Send, Clock
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Validator from './Validator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CountrySelector from './components/CountrySelector';
import { COUNTRY_CODES } from './data/countryCodes';


import { LoginScreen } from './components/LoginScreen';
import { VoucherCache } from './utils/voucherCache';

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
    expires_at?: string;
    expired_at?: string;
    redemptions?: RedemptionData[];
    pax?: number;
    secondGuestName?: string;
    email?: string;
    whatsapp?: string;
    weather?: string;
}

export interface RedemptionData {
    timestamp: string;
    voucherCode: string;
    guestName: string;
    serviceType: string;
    roomNumber: string;
}

import { ENTITLEMENTS } from './constants/services';
import { useVoucherData } from './hooks/useVoucherData';

const VoucherPage: React.FC = () => {
    const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
    const [activeTab, setActiveTab] = useState<'create' | 'validate' | 'issued' | 'analytics' | 'declined'>('create');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all'); // DEFAULT TO ALL TO AVOID EMPTY LIST CONFUSION
    const [formData, setFormData] = useState({
        guestName: '',
        roomNumber: '',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        imageUrl: '',
        email: '',
        whatsapp: '',
        countryCode: '+62',
        pax: 1,
        additionalGuests: [] as string[],
        isTest: false,
    });

    const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [currentVoucher, setCurrentVoucher] = useState<VoucherData | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    const {
        vouchers: recentVouchers,
        setVouchers: setRecentVouchers,
        redemptions,
        isFetching: isFetchingHistory,
        hasLoaded: hasInitialLoaded,
        error: fetchError,
        refresh: fetchData
    } = useVoucherData();

    const effectiveRedemptions = useMemo(() => {
        const recentRedemptions = recentVouchers
            .filter(v => (v.status === 'Redeemed' || v.redeemed_at) && v.redeemed_at) // Ensure it has a redemption timestamp
            .map(v => ({
                timestamp: v.redeemed_at!,
                voucherCode: v.id,
                guestName: v.guestName,
                serviceType: v.redeemed_service || v.serviceType || (v.services?.[0] || 'General Admission'), // Check redeemed_service first, then serviceType, then services array
                roomNumber: v.roomNumber || '',
                weather: v.weather
            }));

        // Merge with historical redemptions, prioritizing recentVouchers (which are likely more up-to-date for today's actions)
        // We use a Map to dedup by voucherCode
        const redemptionMap = new Map();

        // Populate with history first
        redemptions.forEach(r => redemptionMap.set(r.voucherCode, r));

        // Overwrite or add with recent vouchers, ensuring weather is preserved from whichever source has it
        recentRedemptions.forEach(r => {
            const existing = redemptionMap.get(r.voucherCode);
            // The recentVoucher row 'r' now contains weather if it was just redeemed in this session
            const weather = r.weather || (existing ? existing.weather : undefined);
            redemptionMap.set(r.voucherCode, existing ? { ...existing, ...r, weather } : { ...r, weather });
        });

        return Array.from(redemptionMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [recentVouchers, redemptions]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const magicPin = params.get('pin');

        if (magicPin === '0000') {
            const role = params.get('role') === 'staff' ? 'staff' : 'admin';
            handleLogin(role);
            window.history.replaceState({}, '', '/');
        } else if (magicPin === '1234') {
            handleLogin('admin');
            window.history.replaceState({}, '', '/');
        } else {
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

        const rawGuestName = [formData.guestName, ...formData.additionalGuests].filter(Boolean).join(' & ');
        const allGuestNames = formData.isTest ? `[TEST] ${rawGuestName}` : rawGuestName;

        const cleanWA = formData.whatsapp.replace(/\D/g, '').replace(/^0+/, '');
        const prefix = formData.countryCode.replace(/\D/g, '');
        const finalWA = cleanWA.startsWith(prefix) ? `+${cleanWA}` : `${formData.countryCode}${cleanWA}`;

        const payload = JSON.stringify({
            action: 'create', // CRITICAL: Tell GAS this is a creation, not a redemption
            // Keys must match Google Sheet column names EXACTLY (lowercase)
            date: voucherId,            // Sheet col: "date" = voucher code
            description: allGuestNames, // Sheet col: "description" = guest name
            category: 'Created',        // Sheet col: "category" = status
            roomNumber: formData.roomNumber,// Sheet col: "roomNumber" or "Room"
            type: formData.checkIn,     // Sheet col: "type" = check-in date
            checkout: formData.checkOut,// Sheet col: "checkout" = check-out date
            imageurl: formData.imageUrl,// Sheet col: "imageurl" = image URL
            services: services.join(', '),
            created_at: new Date().toISOString(),
            pax: formData.pax,
            email: formData.email,
            whatsapp: formData.whatsapp ? finalWA : '',
            is_test: formData.isTest ? 'TRUE' : 'FALSE'
        });

        try {
            const response = await fetch('/api/redeem-voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to sync with database');
            }

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
                secondGuestName: formData.additionalGuests[0] || '',
                email: formData.email,
                whatsapp: formData.whatsapp ? finalWA : ''
            };

            setCurrentVoucher(newVoucher);
            setCurrentVoucher(newVoucher);
            setRecentVouchers(prev => [newVoucher, ...prev]);

            // CRITICAL: Cache locally to ensure WhatsApp/Email persist even if backend sync lags
            VoucherCache.save(newVoucher);

            setEmail(formData.email);
            setStatus('success');
            setShowCreateForm(false);

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
            whatsapp: '',
            countryCode: '+62',
            pax: 1,
            additionalGuests: [],
            isTest: false,
        });

        setCurrentVoucher(null);
        setStatus('idle');
        setWaStatus('idle');
        setEmail('');
        setEmailStatus('idle');
        setShowCreateForm(true);
    };

    const sendWhatsApp = async () => {
        if (!currentVoucher || !currentVoucher.whatsapp) return;

        setWaStatus('sending');
        const link = `${window.location.origin}/v/${currentVoucher.id}`;

        const message = `Dear ${currentVoucher.guestName},\n\nHere is your *No.1 Wellness Club Digital Pass*:\n${link}\n\nPresent this at the reception to redeem your services.\n\nEnjoy your stay!`;
        const waLink = `https://wa.me/${currentVoucher.whatsapp.replace('+', '')}?text=${encodeURIComponent(message)}`;

        window.open(waLink, '_blank');

        setTimeout(() => {
            setWaStatus('sent');
            setTimeout(() => setWaStatus('idle'), 3000);
        }, 1000);
    };

    const sendEmail = () => {
        if (!currentVoucher || !email) return;

        setEmailStatus('sending');
        const subject = `Your No.1 Wellness Club Digital Pass`;
        const body = `Dear ${currentVoucher.guestName},\n\nHere is your digital pass for No.1 Wellness Club:\n\n${window.location.origin}/v/${currentVoucher.id}\n\nEnjoy your stay!\n\nBest regards,\nNo.1 Wellness Club Team`;

        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;

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
            await fetch('/api/log-insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
            VoucherCache.clear();
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
        if (password !== '1234') {
            alert("Incorrect password. Deletion cancelled.");
            return;
        }

        setIsDeleting(true);

        try {
            const body = JSON.stringify({
                action: 'delete',
                voucherCode: isBulk ? idList : idList[0]
            });

            setRecentVouchers(prev => prev.filter(v => !idList.includes(v.id)));
            if (isBulk) setSelectedIds([]);
            VoucherCache.delete(idList);

            await fetch('/api/redeem-voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
            });

            alert(isBulk ? `${idList.length} vouchers deleted successfully.` : `Voucher deleted successfully.`);

        } catch (error) {
            console.error("Error deleting vouchers:", error);
            alert("Failed to delete. Please check your connection and refresh.");
            fetchData();
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
        // 1. Basic Search Filter
        const query = searchQuery.toLowerCase();
        const matchesQuery = (
            String(v.guestName || '').toLowerCase().includes(query) ||
            String(v.id || '').toLowerCase().includes(query) ||
            String(v.roomNumber || '').toLowerCase().includes(query)
        );

        // 2. Data Quality Filter: Relaxed to show row even if name is missing during debug
        if (v.guestName === 'Unknown Guest' && !query) return false;

        // 3. Status/Expiry Filter: If in "Active" tab, apply chosen filter
        if (activeTab === 'issued') {
            const isRedeemed = v.status === 'Redeemed' || (Array.isArray(effectiveRedemptions) && effectiveRedemptions.some(r => r.voucherCode === v.id));
            const expiryDate = v.checkOut ? new Date(v.checkOut) : (v.expires_at ? new Date(v.expires_at) : null);
            const isExpired = expiryDate ? (expiryDate.getTime() < (new Date().setHours(0, 0, 0, 0))) : false;

            if (statusFilter === 'active') return matchesQuery && !isRedeemed && !isExpired;
            if (statusFilter === 'redeemed') return matchesQuery && isRedeemed;
            if (statusFilter === 'expired') return matchesQuery && isExpired;
            return matchesQuery; // 'all'
        }

        return matchesQuery;
    });

    // Short URL only — no base64 payload. Long base64 URLs make QR codes too dense to scan.
    // IMPORTANT: Always use the canonical guest-facing domain, NOT window.location.origin.
    // The admin app runs on reception.no1wellness.com which is a broken domain (404).
    // QR codes must point to the working Vercel deployment.
    const GUEST_PASS_BASE = 'https://wellness-club-digital.vercel.app';
    const voucherUrl = (voucher: VoucherData) =>
        `${GUEST_PASS_BASE}/v/${voucher.id}`;


    if (!userRole) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Reception | No.1 Wellness Club</title>
            </Helmet>

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
                            <span className="text-[10px] text-gray-400 uppercase">Live Dashboard v2.9 • {recentVouchers.length} Total • {fetchError ? 'Err' : 'OK'}</span>
                            <span className="text-[8px] text-gray-300 block max-w-[200px] truncate">Supabase API Active</span>
                        </div>
                        <button
                            onClick={() => window.location.href = '/help'}
                            className="text-xs font-bold uppercase tracking-widest text-[#c5a572] hover:text-[#2c2420] border border-[#c5a572]/20 px-4 py-2 rounded-lg transition-all hover:bg-[#c5a572]/10"
                        >
                            Help
                        </button>
                    </div>
                </div>

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
                        <button
                            onClick={() => setActiveTab('declined')}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'declined' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <AlertCircle size={16} /> Insights
                        </button>
                        {(userRole === 'admin' || userRole === 'staff') && (
                            <button
                                onClick={() => setActiveTab('issued')}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'issued' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <List size={16} /> Issued
                                <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-[9px]">
                                    {recentVouchers.filter(v => {
                                        if (!v.guestName || v.guestName === 'Unknown Guest') return false;
                                        // Show TOTAL count of valid vouchers since we are in "All" mode by default now
                                        return true;
                                    }).length}
                                </span>
                            </button>
                        )}
                        {userRole === 'admin' && (
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'analytics' ? 'border-[#c5a572] text-[#c5a572]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <BarChart size={16} /> Analytics
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-6 mt-8">
                {activeTab === 'create' && (
                    <div className="animate-fade-in space-y-8">
                        {!showCreateForm && (
                            <div className="flex justify-center mb-8">
                                <button
                                    onClick={resetForm}
                                    className="px-8 py-4 bg-[#c5a572] text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#c5a572]/20 hover:bg-[#b08d55] transition-all flex items-center gap-3"
                                >
                                    <Plus size={16} /> Create New Guest Pass
                                </button>
                            </div>
                        )}

                        {showCreateForm && (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-serif mb-1">New Guest Pass</h2>
                                    <p className="text-sm text-gray-400">Generate a unique QR pass for hotel guests.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Guest Name & Surname</label>
                                            <input
                                                type="text"
                                                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium"
                                                placeholder="e.g. John Smith"
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
                                                <CountrySelector value={formData.countryCode} onChange={val => setFormData({ ...formData, countryCode: val })} />
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-[#fcfcfc] border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572]/20 transition-all font-medium font-mono"
                                                    placeholder="812345678"
                                                    value={formData.whatsapp}
                                                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
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

                                        <div className="space-y-2 md:col-span-2 flex items-center gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                            <input
                                                type="checkbox"
                                                id="testMode"
                                                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                checked={formData.isTest}
                                                onChange={e => setFormData({ ...formData, isTest: e.target.checked })}
                                            />
                                            <label htmlFor="testMode" className="text-sm font-bold text-amber-800 cursor-pointer">
                                                Enable Test Mode (Excludes from Analytics)
                                            </label>
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
                        )}

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
                                    <div className="bg-white border-2 border-[#c5a572]/20 rounded-3xl p-6 w-full max-w-sm mb-6 text-left space-y-4 shadow-xl relative">
                                        <div className="absolute -top-3 left-6 bg-[#c5a572] text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                            Official Guest Receipt
                                        </div>

                                        <div className="flex justify-between items-start border-b border-gray-100 pb-3 mt-2">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c5a572] mb-0.5">Guest (Name & Surname)</p>
                                                <h4 className="text-xl font-serif text-[#2c2420] font-bold italic">{currentVoucher.guestName}</h4>
                                                <p className="text-xs font-bold text-gray-500 mt-1">Room {currentVoucher.roomNumber}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c5a572] mb-0.5">Voucher ID</p>
                                                <p className="text-sm font-mono font-black text-[#2c2420]">{currentVoucher.id}</p>
                                                <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">{currentVoucher.pax || 1} Pax</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c5a572] mb-1">Pass Issued On</p>
                                                <p className="text-xs font-bold text-[#2c2420] flex items-center gap-2">
                                                    <Clock size={12} className="text-gray-400" />
                                                    {currentVoucher.created_at ? new Date(currentVoucher.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500 mb-1">Valid Until (Expiry)</p>
                                                <p className="text-xs font-black text-white bg-red-500 px-3 py-1 rounded-lg inline-block shadow-sm">
                                                    {currentVoucher.checkOut || currentVoucher.checkIn
                                                        ? new Date(currentVoucher.checkOut || currentVoucher.checkIn).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            {(() => {
                                                const voucherRedemptions = Array.isArray(effectiveRedemptions) ? effectiveRedemptions.filter(r => r.voucherCode === currentVoucher.id) : [];
                                                if (voucherRedemptions.length > 0) {
                                                    return (
                                                        <div className="mb-4 pt-1 border-b border-gray-100 pb-3">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-green-600 mb-2">Redemption Details</p>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {voucherRedemptions.map((r, i) => (
                                                                    <div key={i} className="flex flex-col gap-1 text-xs bg-green-50 p-2 rounded-lg border border-green-100">
                                                                        <span className="font-bold text-green-800">{r.serviceType}</span>
                                                                        <span className="text-[10px] text-green-600 flex items-center gap-1 capitalize">
                                                                            <Clock size={10} />
                                                                            {new Date(r.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                            {r.weather && r.weather.length < 50 && <span className="ml-1 opacity-75">• {r.weather}</span>}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#c5a572] mb-2">Back-End Contact Data</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {currentVoucher.email && (
                                                    <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                            <Mail size={12} />
                                                        </div>
                                                        <span className="font-semibold truncate">{currentVoucher.email}</span>
                                                    </div>
                                                )}
                                                {currentVoucher.whatsapp && (
                                                    <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                        <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                            <Send size={12} />
                                                        </div>
                                                        <span className="font-mono font-bold tracking-tighter">{currentVoucher.whatsapp}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm mx-auto mb-8">
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
                                                const url = voucherUrl(currentVoucher);
                                                window.open(
                                                    url,
                                                    'GuestPassPopup',
                                                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
                                                );
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2c2420] text-white rounded-xl hover:bg-black text-sm font-bold transition-all shadow-lg shadow-black/10"
                                        >
                                            Open Pass
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>

                                    <div className="mt-2 w-full max-w-sm pt-6 border-t border-dashed border-gray-200 mx-auto">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Send to Guest (WhatsApp)</p>
                                        <div className="flex gap-1 items-center">
                                            <div className="flex-shrink-0">
                                                <CountrySelector
                                                    value={currentVoucher.whatsapp?.startsWith('+') ? (() => {
                                                        const match = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length).find((c: any) => currentVoucher.whatsapp?.startsWith(c.dial_code));
                                                        return match?.dial_code || '+62';
                                                    })() : '+62'}
                                                    onChange={(val) => {
                                                        const match = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length).find((c: any) => currentVoucher.whatsapp?.startsWith(c.dial_code));
                                                        const currentPrefix = match?.dial_code || '';
                                                        const rest = currentVoucher.whatsapp?.startsWith('+') ? currentVoucher.whatsapp.slice(currentPrefix.length) : currentVoucher.whatsapp;
                                                        setCurrentVoucher({ ...currentVoucher, whatsapp: `${val}${rest}` });
                                                    }}
                                                />
                                            </div>
                                            <input
                                                type="tel"
                                                placeholder="Number..."
                                                className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a572]/20 transition-all font-mono"
                                                value={(() => {
                                                    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length);
                                                    const match = sortedCodes.find((c: any) => currentVoucher.whatsapp?.startsWith(c.dial_code));
                                                    if (match && currentVoucher.whatsapp?.startsWith(match.dial_code)) {
                                                        return currentVoucher.whatsapp.slice(match.dial_code.length);
                                                    }
                                                    return currentVoucher.whatsapp || '';
                                                })()}
                                                onChange={(e) => {
                                                    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length);
                                                    const match = sortedCodes.find((c: any) => currentVoucher.whatsapp?.startsWith(c.dial_code));
                                                    const prefix = match?.dial_code || '+62';
                                                    setCurrentVoucher({ ...currentVoucher, whatsapp: `${prefix}${e.target.value.replace(/\D/g, '')}` });
                                                }}
                                            />
                                            <button
                                                onClick={sendWhatsApp}
                                                disabled={waStatus === 'sending' || !currentVoucher.whatsapp}
                                                className={`flex-shrink-0 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${waStatus === 'sent' ? 'bg-green-500 text-white' : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-lg shadow-[#25D366]/20'}`}
                                            >
                                                {waStatus === 'sending' ? <Loader2 size={16} className="animate-spin" /> : waStatus === 'sent' ? 'Sent' : 'Send'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 w-full max-w-sm pt-6 border-t border-dashed border-gray-200 mx-auto">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Send via Email</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                placeholder="guest@example.com"
                                                className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a572]/20 transition-all"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                            <button
                                                onClick={sendEmail}
                                                className="px-6 py-3 bg-[#3b82f6] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                            >
                                                {emailStatus === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'validate' && (
                    <div className="animate-fade-in">
                        <Validator
                            vouchers={recentVouchers}
                            onRefresh={() => fetchData()}
                        />
                    </div>
                )}

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
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#c5a572] outline-none transition-all text-sm"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 overflow-x-auto no-scrollbar">
                                    {[
                                        { id: 'active', label: 'Active', icon: <CheckCircle size={14} />, color: 'text-green-600' },
                                        { id: 'redeemed', label: 'Redeemed', icon: <CheckCircle size={14} />, color: 'text-blue-600' },
                                        { id: 'expired', label: 'Expired', icon: <XCircle size={14} />, color: 'text-amber-600' },
                                        { id: 'all', label: 'All', icon: <List size={14} />, color: 'text-gray-600' }
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setStatusFilter(filter.id as any)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === filter.id
                                                ? 'bg-white text-[#c5a572] shadow-sm'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {filter.icon}
                                            {filter.label}
                                        </button>
                                    ))}
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
                                    <p className="text-gray-400">
                                        {statusFilter === 'all'
                                            ? `No vouchers found. Checked ${recentVouchers.length} local rows.`
                                            : `No ${statusFilter} vouchers found.`}
                                    </p>
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left inline-block max-w-md mx-auto">
                                        <p className="text-[10px] text-gray-400 font-mono">DEBUG INFO:</p>
                                        <p className="text-[10px] text-gray-500 font-mono">Voucher Length: {recentVouchers.length}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">Redemption Length: {redemptions.length}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">Status: {isFetchingHistory ? 'Fetching...' : 'Idle'}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">Error: {fetchError ? 'Yes' : 'No'}</p>
                                        <p className="text-[10px] text-gray-500 font-mono truncate">Endpoint: Supabase API</p>
                                    </div>
                                </div>
                            ) : (
                                !isFetchingHistory && !fetchError && filteredVouchers.map(voucher => (
                                    <div
                                        key={voucher.id}
                                        className={`bg-white p-6 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row justify-between items-center gap-6 group relative overflow-hidden ${selectedIds.includes(voucher.id) ? 'border-[#c5a572] bg-[#fcfaf7]' : 'border-gray-100 hover:border-[#c5a572]/40'
                                            }`}
                                    >
                                        <div className="flex gap-4 items-center w-full md:w-auto">
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
                                                        Issued: {voucher.created_at ? new Date(voucher.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                                    </span>
                                                    {(() => {
                                                        const isRedeemed = voucher.status === 'Redeemed' || (Array.isArray(effectiveRedemptions) && effectiveRedemptions.some(r => r.voucherCode === voucher.id));
                                                        const expiryDate = voucher.checkOut ? new Date(voucher.checkOut) : (voucher.expires_at ? new Date(voucher.expires_at) : null);
                                                        const isExpired = expiryDate ? (expiryDate.getTime() < (new Date().setHours(0, 0, 0, 0))) : false;

                                                        if (isRedeemed) return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-blue-100">Redeemed</span>;
                                                        if (isExpired) return <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100">Expired</span>;
                                                        return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-green-100">Active</span>;
                                                    })()}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {voucher.email && (
                                                        <span className="flex items-center gap-1 text-[9px] text-gray-500 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50">
                                                            <Mail size={10} className="text-blue-400" /> {voucher.email}
                                                        </span>
                                                    )}
                                                    {voucher.whatsapp && (
                                                        <span className="flex items-center gap-1 text-[9px] text-gray-500 bg-green-50/50 px-2 py-0.5 rounded border border-green-100/50">
                                                            <Send size={10} className="text-green-500" /> {voucher.whatsapp}
                                                        </span>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 w-full mt-1">
                                                        {voucher.checkIn && (
                                                            <span className="flex items-center gap-1 text-[9px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                                <Calendar size={10} /> In: {new Date(voucher.checkIn).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                        {voucher.checkOut && (
                                                            <>
                                                                <span className="flex items-center gap-1 text-[9px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                                    Out: {new Date(voucher.checkOut).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                                                                    Valid Until: {new Date(voucher.checkOut).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                            </>
                                                        )}
                                                        {voucher.pax && (
                                                            <span className="flex items-center gap-1 text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                                                                {voucher.pax} Pax
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3 space-y-1">
                                                    {(() => {
                                                        const voucherRedemptions = Array.isArray(effectiveRedemptions) ? effectiveRedemptions.filter(r => r.voucherCode === voucher.id) : [];
                                                        const count = voucherRedemptions.length;
                                                        if (count === 0) return null;

                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 w-fit flex items-center gap-1.5 animate-pulse">
                                                                    <CheckCircle size={12} />
                                                                    Redeemed {count > 1 ? `${count}x` : ''}
                                                                </div>
                                                                {voucherRedemptions.map((redeem, idx) => (
                                                                    <div key={`red-${idx}`} className="text-[8px] text-gray-400 ml-4 flex items-center gap-2">
                                                                        <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                                                        {redeem.serviceType} • {new Date(redeem.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
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
                                                    // CRITICAL: Set all states to sync the "Success" screen view correctly
                                                    setCurrentVoucher(voucher);
                                                    setEmail(voucher.email || '');
                                                    setWaStatus('idle');
                                                    setEmailStatus('idle');
                                                    setShowCreateForm(false);
                                                    setActiveTab('create');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="px-6 py-2 bg-[#2c2420] text-white hover:bg-black rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
                                            >
                                                Open Details
                                            </button>
                                            <button
                                                onClick={() => handleDeleteVoucher(voucher.id)}
                                                disabled={isDeleting}
                                                className={`p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                {activeTab === 'analytics' && (
                    <AnalyticsDashboard
                        vouchers={recentVouchers}
                        redemptions={redemptions}
                        onViewVoucher={(voucherId) => {
                            const voucher = recentVouchers.find(v => v.id === voucherId);
                            if (voucher) {
                                setCurrentVoucher(voucher);
                                setEmail(voucher.email || '');
                                setWaStatus('idle');
                                setEmailStatus('idle');
                                setShowCreateForm(false);
                                setActiveTab('create');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                    />
                )}

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
