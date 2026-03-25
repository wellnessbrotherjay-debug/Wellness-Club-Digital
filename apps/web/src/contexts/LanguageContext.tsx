/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav.home': 'Home',
        'nav.recover': 'Recover',
        'nav.nourish': 'Nourish',
        'nav.movement': 'Movement',
        'nav.facilities': 'Facilities',
        'nav.book_now': 'Book Now',
        'wellness.book': 'Book',
        'modal.weekly_timetable': 'Weekly Timetable',
        'modal.wellness_schedule': 'Wellness Schedule',
        'modal.book_class': 'Book a Class',
        'modal.select_class': 'Select Class',
        'modal.select_time': 'Select Time',
        'modal.available_slots': 'Available Slots for',
        'modal.coach': 'Coach',
        'modal.back': 'Back',
        'modal.rest_day': 'Rest Day',
        'modal.confirm_booking': 'Confirm Booking',
        'modal.days.monday': 'Monday',
        'modal.days.tuesday': 'Tuesday',
        'modal.days.wednesday': 'Wednesday',
        'modal.days.thursday': 'Thursday',
        'modal.days.friday': 'Friday',
        'modal.days.saturday': 'Saturday',
        'modal.days.sunday': 'Sunday',
        'booking.fill_all_required': 'Please fill in all required fields',
        'footer.address': 'Jl. Kayu Aya No.1, Seminyak',
        'footer.rights': '© 2026 No.1 Wellness Club. All Rights Reserved.'
    },
    id: {
        'nav.home': 'Beranda',
        'nav.recover': 'Pemulihan',
        'nav.nourish': 'Nutrisi',
        'nav.movement': 'Gerakan',
        'nav.facilities': 'Fasilitas',
        'nav.book_now': 'Pesan Sekarang',
        'wellness.book': 'Pesan',
        'modal.weekly_timetable': 'Jadwal Mingguan',
        'modal.wellness_schedule': 'Jadwal Wellness',
        'modal.book_class': 'Pesan Kelas',
        'modal.select_class': 'Pilih Kelas',
        'modal.select_time': 'Pilih Waktu',
        'modal.available_slots': 'Slot Tersedia untuk',
        'modal.coach': 'Pelatih',
        'modal.back': 'Kembali',
        'modal.rest_day': 'Hari Istirahat',
        'modal.confirm_booking': 'Konfirmasi Pemesanan',
        'modal.days.monday': 'Senin',
        'modal.days.tuesday': 'Selasa',
        'modal.days.wednesday': 'Rabu',
        'modal.days.thursday': 'Kamis',
        'modal.days.friday': 'Jumat',
        'modal.days.saturday': 'Sabtu',
        'modal.days.sunday': 'Minggu',
        'booking.fill_all_required': 'Harap isi semua kolom yang diperlukan',
        'footer.address': 'Jl. Kayu Aya No.1, Seminyak',
        'footer.rights': '© 2026 No.1 Wellness Club. Hak Cipta Dilindungi.'
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
