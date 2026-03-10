import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, ChevronLeft, Clock, Users, Phone } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../constants';
import { COUNTRIES } from '../constants/countries';
import CountrySelector from './CountrySelector';
import { trackBooking, trackOutboundLink } from '../utils/analytics';
import { useVoucher } from '../contexts/VoucherContext';
import { submitBooking } from '../utils/sheetData';

const ClassScheduleModal: React.FC<{ onClose: () => void; initialClass?: string | null; initialCoach?: string | null }> = ({ onClose, initialClass, initialCoach }) => {
    const { t, language } = useLanguage();
    const { getWhatsAppSuffix } = useVoucher();
    const rawSchedule = [
        { day: t('modal.days.monday'), classes: [{ name: "Pilates", times: [{ time: "10:00 - 11:00", coach: "Greg" }, { time: "15:00 - 16:00", coach: "Greg" }, { time: "19:00 - 20:00", coach: "Greg" }] }] },
        { day: t('modal.days.tuesday'), classes: [{ name: "Yoga", times: [{ time: "10:00 - 11:00", coach: "Anais" }, { time: "15:00 - 16:00", coach: "Anais" }, { time: "19:00 - 20:00", coach: "Anais" }] }, { name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "" }, { time: "15:00 - 16:00", coach: "" }, { time: "19:00 - 20:00", coach: "" }] }] },
        { day: t('modal.days.wednesday'), classes: [{ name: "Stretching", times: [{ time: "10:00 - 11:00", coach: "Karry" }, { time: "15:00 - 16:00", coach: "Karry" }] }, { name: "Sensual Flow", times: [{ time: "19:00 - 20:00", coach: "Karry" }] }] },
        { day: t('modal.days.thursday'), classes: [{ name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "Greg" }, { time: "15:00 - 16:00", coach: "Greg" }, { time: "19:00 - 20:00", coach: "Greg" }] }, { name: "Kickboxing", times: [{ time: "10:00 - 11:00", coach: "Victor" }, { time: "19:00 - 20:00", coach: "Victor" }] }] },
        { day: t('modal.days.friday'), classes: [{ name: "Reformer Pilates", times: [{ time: "15:00 - 16:00", coach: "Maria" }] }, { name: "Zumba", times: [{ time: "10:00 - 11:00", coach: "Maira" }, { time: "19:00 - 20:00", coach: "Maira" }] }] },
        { day: t('modal.days.saturday'), classes: [{ name: "Yoga", times: [{ time: "10:00 - 11:00", coach: "Marina" }, { time: "15:00 - 16:00", coach: "Marina" }, { time: "19:00 - 20:00", coach: "Marina" }] }, { name: "Reformer Pilates", times: [{ time: "10:00 - 11:00", coach: "" }, { time: "15:00 - 16:00", coach: "" }, { time: "19:00 - 20:00", coach: "" }] }] },
        { day: t('modal.days.sunday'), classes: [] }
    ];

    const schedule = rawSchedule.map(day => ({
        ...day,
        classes: day.classes.map(cls => ({
            ...cls,
            times: cls.times // Removed filter to show all times even without allocated coach
        })).filter(cls => cls.times.length > 0)
    }));

    const [bookingStep, setBookingStep] = useState<'view' | 'select-class' | 'select-time' | 'enter-details'>(initialClass ? 'select-time' : 'view');
    const [selectedClassForBooking, setSelectedClassForBooking] = useState<string | null>(initialClass || null);
    const [selectedTimeForBooking, setSelectedTimeForBooking] = useState<{ day: string; time: string; coach: string } | null>(null);
    const [mainBooker, setMainBooker] = useState({ name: '', email: '', countryIso: 'ID', whatsapp: '' });
    const [numPeople, setNumPeople] = useState(1);
    const [guestDetails, setGuestDetails] = useState<{ name: string, email: string, countryIso: string, whatsapp: string }[]>([
        { name: '', email: '', countryIso: 'ID', whatsapp: '' },
        { name: '', email: '', countryIso: 'ID', whatsapp: '' },
        { name: '', email: '', countryIso: 'ID', whatsapp: '' }
    ]);

    const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);

    // Explicitly list all classes to ensure none are missing
    const classNames = ["Pilates", "Reformer Pilates", "Yoga", "Kickboxing", "Zumba", "Stretching", "Sensual Flow"];

    const availableSlots = selectedClassForBooking
        ? schedule.flatMap(day => day.classes.filter(c => c.name === selectedClassForBooking).flatMap(c => c.times.map(t => ({ day: day.day, time: t.time, coach: t.coach }))))
        : [];

    const handleBookClick = () => {
        if (bookingStep === 'view') {
            setBookingStep('select-class');
        } else if (bookingStep === 'select-class' && selectedClassForBooking) {
            setBookingStep('select-time');
        } else if (bookingStep === 'select-time' && selectedTimeForBooking) {
            setBookingStep('enter-details');
        } else if (bookingStep === 'enter-details' && selectedTimeForBooking) {
            if (!mainBooker.name || !mainBooker.email || !mainBooker.whatsapp) {
                alert(t('booking.fill_all_required') || "Please fill in all required fields.");
                return;
            }
            setShowAvailabilityWarning(true);
        }
    };

    const handleFinalConfirmOnWhatsApp = async () => {
        if (selectedTimeForBooking && selectedClassForBooking) {

            const dialCode = COUNTRIES.find(c => c.code === mainBooker.countryIso)?.dial_code || '+62';
            const fullPhoneNumber = `${dialCode}${mainBooker.whatsapp.replace(/^0+/, '')}`;

            // Save booking to Google Sheets
            const guestDetailsForSheet = numPeople > 1 ? guestDetails.slice(0, numPeople - 1).filter(g => g.name.trim()) : [];

            await submitBooking({
                className: selectedClassForBooking,
                customerName: mainBooker.name,
                customerEmail: mainBooker.email,
                customerPhone: fullPhoneNumber,
                timeSlot: selectedTimeForBooking.time,
                day: selectedTimeForBooking.day,
                coach: selectedTimeForBooking.coach,
                numPeople: numPeople,
                guestDetails: guestDetailsForSheet
            });

            let detailsMsg = '';
            if (numPeople > 1) {
                const guests = guestDetails
                    .slice(0, numPeople - 1)
                    .map((g, i) => {
                        if (!g.name.trim()) return null;
                        const dialCode = COUNTRIES.find(c => c.code === g.countryIso)?.dial_code || '+62';
                        const phone = `${dialCode}${g.whatsapp.replace(/^0+/, '')}`;
                        return `Guest ${i + 1}: ${g.name}\n   Email: ${g.email}\n   WA: ${phone}`;
                    })
                    .filter(Boolean)
                    .join('\n\n');
                detailsMsg = `\n\n*Guest Details*\n${guests}`;
            }

            const msg = language === 'id'
                ? `Halo No.1 Wellness, saya ingin menanyakan ketersediaan untuk kelas berikut.

*Detail Kelas*
Kelas: ${selectedClassForBooking}
Slot Waktu Pilihan: ${selectedTimeForBooking.time} (${selectedTimeForBooking.day})

Mohon informasikan apakah slot ini tersedia dan benar.

*Info Pendaftar*
Nama: ${mainBooker.name}
Email: ${mainBooker.email}
WhatsApp: ${fullPhoneNumber}
Total Orang: ${numPeople}${detailsMsg}${getWhatsAppSuffix()}`
                : `Hi No.1 Wellness, I would like to check if the following class time is available.

*Class Details*
Class: ${selectedClassForBooking}
Desired Time Slot: ${selectedTimeForBooking.time} (${selectedTimeForBooking.day})

Please let me know if this slot is correct and available.

*Booking Info*
Name: ${mainBooker.name}
Email: ${mainBooker.email}
WhatsApp: ${fullPhoneNumber}
Total Pax: ${numPeople}${detailsMsg}${getWhatsAppSuffix()}`;

            // Track the class booking before opening WhatsApp
            trackBooking(`Class: ${selectedClassForBooking}`, 'ClassScheduleModal');
            trackOutboundLink(`https://wa.me/${WHATSAPP_NUMBER}`, 'whatsapp', `Class Booking: ${selectedClassForBooking}`);

            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            onClose();
        }
    };

    const handleBack = () => {
        if (bookingStep === 'enter-details') setBookingStep('select-time');
        else if (bookingStep === 'select-time') setBookingStep('select-class');
        else if (bookingStep === 'select-class') setBookingStep('view');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#f4ede5] w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-[#2c2420]/10 flex items-center justify-center hover:bg-[#2c2420] hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="p-8 pb-4 border-b border-[#2c2420]/10 text-center relative">
                    {bookingStep !== 'view' && (
                        <button
                            onClick={handleBack}
                            className="absolute left-16 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest font-bold text-[#c5a572] flex items-center gap-1 hover:text-[#2c2420]"
                        >
                            <ChevronLeft size={14} /> {t('modal.back')}
                        </button>
                    )}
                    <span className="text-[#c5a572] text-[10px] uppercase tracking-[0.4em] font-bold block mb-2">{bookingStep === 'view' ? t('modal.weekly_timetable') : t('modal.book_class')}</span>
                    <h2 className="text-3xl md:text-5xl font-sans font-bold text-[#2c2420]">
                        {showAvailabilityWarning ? "Confirm Your Class" : (
                            <>
                                {bookingStep === 'view' ? (initialCoach ? `${t('modal.wellness_schedule')} - ${initialCoach}` : t('modal.wellness_schedule')) :
                                    bookingStep === 'select-class' ? t('modal.select_class') :
                                        bookingStep === 'select-time' ? t('modal.select_time') :
                                            "Booking Details"
                                }
                            </>
                        )}
                    </h2>
                </div>

                <div className="overflow-y-auto p-6 md:p-10 flex-1">
                    {bookingStep === 'view' ? (
                        <>
                            <div className="grid md:grid-cols-2 gap-6">
                                {schedule.map((day, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-xl border border-[#2c2420]/5 shadow-sm">
                                        <h3 className="font-sans font-bold text-xl text-[#c5a572] mb-4 border-b border-[#c5a572]/20 pb-2">{day.day}</h3>
                                        <div className="space-y-4">
                                            {day.classes.map((cls, cIdx) => (
                                                <div key={cIdx}>
                                                    <div className="font-bold text-[#2c2420] text-sm uppercase tracking-wider mb-1">{cls.name}</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {cls.times.map((t, tIdx) => (
                                                            <span key={tIdx} className="text-xs bg-[#2c2420]/5 px-2 py-1 rounded text-[#2c2420]/70 flex items-center gap-1">
                                                                <Clock size={10} /> {t.time}
                                                                {t.coach && <span className="text-[9px] text-[#c5a572] uppercase tracking-wider font-bold ml-1">| {t.coach}</span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {day.classes.length === 0 && <p className="text-sm text-gray-400 italic">{t('modal.rest_day')}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-6 bg-[#c5a572]/10 rounded-2xl border border-[#c5a572]/20">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[#c5a572] font-bold text-lg uppercase tracking-widest">Additional Recovery</span>
                                    <p className="text-[#2c2420]/70 text-sm font-sans text-center">Includes a recovery session in our Hot & Cold Bath after class.</p>
                                </div>
                            </div>
                        </>
                    ) : bookingStep === 'select-class' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                            {classNames.map((cls, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setSelectedClassForBooking(cls); setBookingStep('select-time'); }}
                                    className="bg-white p-6 rounded-xl border border-[#2c2420]/10 hover:border-[#c5a572] hover:bg-[#c5a572]/5 transition-all text-left shadow-sm group"
                                >
                                    <h3 className="font-sans font-bold text-2xl text-[#2c2420] group-hover:text-[#c5a572] mb-2">{cls}</h3>
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#2c2420]/60">{t('modal.select_class')}</span>
                                </button>
                            ))}
                        </div>
                    ) : bookingStep === 'select-time' ? (
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-center font-sans font-bold text-2xl text-[#c5a572] mb-8">{t('modal.available_slots')} {selectedClassForBooking}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {availableSlots.length > 0 ? (
                                    availableSlots.map((slot, idx) => {
                                        const isUnallocated = !slot.coach || slot.coach.trim() === "";
                                        const isSelected = selectedTimeForBooking?.day === slot.day && selectedTimeForBooking?.time === slot.time;
                                        return (
                                            <button
                                                key={idx}
                                                disabled={isUnallocated}
                                                onClick={() => { if (!isUnallocated) setSelectedTimeForBooking(slot); }}
                                                className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${isUnallocated ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' : (isSelected ? 'bg-[#2c2420] border-[#2c2420] text-white' : 'bg-white border-[#2c2420]/10 hover:border-[#c5a572] text-[#2c2420]')}`}
                                            >
                                                <div>
                                                    <span className={`block text-xs uppercase tracking-widest font-bold mb-1 ${isUnallocated ? 'text-gray-400' : (isSelected ? 'text-[#c5a572]' : 'text-[#2c2420]/60')}`}>{slot.day}</span>
                                                    <span className={`font-sans text-lg font-bold ${isUnallocated ? 'text-gray-400' : ''}`}>{slot.time}</span>
                                                    <span className={`block text-[10px] uppercase tracking-widest mt-1 ${isUnallocated ? 'text-gray-400 italic' : (isSelected ? 'text-white/70' : 'text-[#2c2420]/40')}`}>
                                                        {isUnallocated ? 'Class Not Available' : `${t('modal.coach')}: ${slot.coach}`}
                                                    </span>
                                                </div>
                                                {isSelected && <div className="w-4 h-4 rounded-full bg-[#c5a572]" />}
                                                {isUnallocated && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-1 md:col-span-2 py-20 text-center bg-white rounded-2xl border border-[#2c2420]/5">
                                        <p className="font-sans text-xl text-[#2c2420]/40">No available classes currently</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-lg mx-auto">
                            {showAvailabilityWarning ? (
                                <div className="py-12 px-6 bg-white rounded-3xl border border-[#c5a572]/20 shadow-xl text-center space-y-8 animate-scale-in">
                                    <div className="w-20 h-20 bg-[#c5a572]/10 rounded-full flex items-center justify-center mx-auto">
                                        <Clock className="text-[#c5a572]" size={40} />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-sans font-bold text-[#2c2420]">Confirm Availability</h3>
                                        <p className="text-[#2c2420]/70 leading-relaxed">
                                            This is a <strong className="text-[#2c2420]">desired booking request</strong>. Our team will verify the schedule and confirm the availability once you message us on WhatsApp.
                                        </p>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <button
                                            onClick={handleFinalConfirmOnWhatsApp}
                                            className="w-full py-5 bg-[#25D366] text-white rounded-xl font-bold text-lg hover:bg-[#1ebd5e] transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            <Phone size={20} />
                                            Book on WhatsApp
                                        </button>

                                        <button
                                            onClick={() => setShowAvailabilityWarning(false)}
                                            className="text-[#2c2420]/40 text-sm font-bold uppercase tracking-widest hover:text-[#2c2420] transition-colors"
                                        >
                                            Back to details
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-8 text-center">
                                        <h3 className="font-sans font-bold text-2xl text-[#c5a572] mb-2">{selectedClassForBooking}</h3>
                                        <p className="text-[#2c2420]/70 font-bold">{selectedTimeForBooking?.day}, {selectedTimeForBooking?.time}</p>
                                        <p className="text-[#2c2420]/50 text-sm uppercase tracking-widest mt-1">with Coach {selectedTimeForBooking?.coach}</p>

                                        <div className="mt-4 p-3 bg-[#c5a572]/10 rounded-lg border border-[#c5a572]/20 inline-block">
                                            <p className="text-[#2c2420]/80 text-xs font-bold">
                                                Includes Access to Hot & Cold Bath
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4 bg-white p-6 rounded-xl border border-[#2c2420]/10">
                                            <h4 className="text-sm font-bold text-[#2c2420] flex items-center gap-2">Your Details</h4>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase tracking-widest text-[#2c2420]/60 font-bold">Full Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={mainBooker.name}
                                                    onChange={(e) => setMainBooker({ ...mainBooker, name: e.target.value })}
                                                    placeholder="Enter your full name"
                                                    className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-3 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase tracking-widest text-[#2c2420]/60 font-bold">Email Address <span className="text-red-500">*</span></label>
                                                <input
                                                    type="email"
                                                    value={mainBooker.email}
                                                    onChange={(e) => setMainBooker({ ...mainBooker, email: e.target.value })}
                                                    placeholder="Enter your email"
                                                    className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-3 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] uppercase tracking-widest text-[#2c2420]/60 font-bold">WhatsApp Number <span className="text-red-500">*</span></label>
                                                <div className="flex gap-2">
                                                    <div className="w-[100px] flex-shrink-0">
                                                        <CountrySelector value={mainBooker.countryIso} onChange={(code: string) => setMainBooker({ ...mainBooker, countryIso: code })} />
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={mainBooker.whatsapp}
                                                        onChange={(e) => setMainBooker({ ...mainBooker, whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                                                        placeholder="812 3456 7890"
                                                        className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-3 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest font-bold text-[#2c2420]/60 mb-2">Number of People</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[1, 2, 3, 4].map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setNumPeople(num)}
                                                        className={`py-3 rounded opacity-90 hover:opacity-100 transition-all font-bold ${numPeople === num ? 'bg-[#2c2420] text-white' : 'bg-white border border-[#2c2420]/10 text-[#2c2420]'}`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {numPeople > 1 && (
                                            <div className="bg-white p-6 rounded-xl border border-[#2c2420]/10 animate-fade-in">
                                                <h4 className="text-sm font-bold text-[#2c2420] mb-4 flex items-center gap-2"><Users size={14} /> Guest Details</h4>
                                                <div className="space-y-4">
                                                    {Array.from({ length: numPeople - 1 }).map((_, idx) => (
                                                        <div key={idx} className="space-y-3 pb-4 border-b border-[#2c2420]/5 last:border-0 last:pb-0">
                                                            <div className="font-bold text-[10px] uppercase tracking-widest text-[#2c2420]/40 mb-2">Guest {idx + 1}</div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <input
                                                                    type="text"
                                                                    value={guestDetails[idx].name}
                                                                    onChange={(e) => {
                                                                        const newDetails = [...guestDetails];
                                                                        newDetails[idx] = { ...newDetails[idx], name: e.target.value };
                                                                        setGuestDetails(newDetails);
                                                                    }}
                                                                    placeholder="Full Name"
                                                                    className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                                />
                                                                <input
                                                                    type="email"
                                                                    value={guestDetails[idx].email}
                                                                    onChange={(e) => {
                                                                        const newDetails = [...guestDetails];
                                                                        newDetails[idx] = { ...newDetails[idx], email: e.target.value };
                                                                        setGuestDetails(newDetails);
                                                                    }}
                                                                    placeholder="Email Address"
                                                                    className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                                />
                                                                <div className="flex gap-2 relative">
                                                                    <div className="w-[100px] flex-shrink-0">
                                                                        <CountrySelector
                                                                            value={guestDetails[idx].countryIso}
                                                                            onChange={(code: string) => {
                                                                                const newDetails = [...guestDetails];
                                                                                newDetails[idx] = { ...newDetails[idx], countryIso: code };
                                                                                setGuestDetails(newDetails);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <input
                                                                        type="tel"
                                                                        value={guestDetails[idx].whatsapp}
                                                                        onChange={(e) => {
                                                                            const newDetails = [...guestDetails];
                                                                            newDetails[idx] = { ...newDetails[idx], whatsapp: e.target.value.replace(/[^0-9]/g, '') };
                                                                            setGuestDetails(newDetails);
                                                                        }}
                                                                        placeholder="WhatsApp Number"
                                                                        className="w-full bg-white border border-[#e0d9c8] rounded-[10px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#c5a572] outline-none placeholder:text-[#2c2420]/30"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className={`p-6 border-t border-[#2c2420]/10 bg-[#f4ede5] text-center ${showAvailabilityWarning ? 'hidden' : ''}`}>
                    {bookingStep === 'view' ? (
                        <button
                            onClick={() => setBookingStep('select-class')}
                            className="bg-[#2c2420] text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-[#c5a572] transition-colors rounded-sm"
                        >
                            {t('wellness.book')}
                        </button>
                    ) : bookingStep === 'select-time' ? (
                        <button
                            onClick={() => selectedTimeForBooking && setBookingStep('enter-details')}
                            disabled={!selectedTimeForBooking}
                            className={`px-8 py-3 uppercase tracking-widest text-xs font-bold transition-colors rounded-sm ${selectedTimeForBooking ? 'bg-[#2c2420] text-white hover:bg-[#c5a572]' : 'bg-[#2c2420]/20 text-[#2c2420]/40 cursor-not-allowed'}`}
                        >
                            Next
                        </button>
                    ) : bookingStep === 'enter-details' ? (
                        <button
                            onClick={handleBookClick}
                            className={`px-8 py-3 uppercase tracking-widest text-xs font-bold transition-colors rounded-sm bg-[#2c2420] text-white hover:bg-[#c5a572]`}
                        >
                            {t('modal.confirm_booking')}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ClassScheduleModal;
