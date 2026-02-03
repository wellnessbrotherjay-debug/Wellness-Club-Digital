import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Calendar, PlusCircle, Scan, Camera, CheckCircle,
    Trash2, ExternalLink, MessageCircle, ChevronRight,
    Search, Users, Link as LinkIcon
} from 'lucide-react';

const HelpSection: React.FC = () => {
    // Scroll to section handler
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-[#2c2420] font-sans pb-20">
            <Helmet>
                <title>Staff User Guide | No.1 Wellness Club</title>
            </Helmet>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/htf-logo.png" alt="HTF Solutions" className="h-16 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-serif font-bold">Staff Guide</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">System Documentation</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-xs font-bold uppercase tracking-widest text-[#c5a572] hover:text-[#2c2420] transition-colors"
                    >
                        Back to App
                    </button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">

                {/* Introduction */}
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-serif font-bold">How to use the Wellness App</h2>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        A step-by-step guide for Front Desk & Wellness staff to manage bookings and vouchers.
                    </p>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => scrollToSection('create-booking')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <Calendar className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Create Booking</span>
                    </button>
                    <button onClick={() => scrollToSection('cancel-booking')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <Trash2 className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Cancel Booking</span>
                    </button>
                    <button onClick={() => scrollToSection('create-voucher')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <PlusCircle className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Create Voucher</span>
                    </button>
                    <button onClick={() => scrollToSection('scan-voucher')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <Scan className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Scan Voucher</span>
                    </button>
                </div>

                {/* SECTION 1: CREATE BOOKING */}
                <section id="create-booking" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
                    <div className="bg-[#fcfcfc] border-b border-gray-100 px-8 py-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#c5a572]/10 flex items-center justify-center text-[#c5a572]">
                            <Calendar size={20} />
                        </div>
                        <h3 className="text-xl font-bold font-serif">How to Create Bookings</h3>
                    </div>
                    <div className="p-8 space-y-12">
                        <Step
                            number={1}
                            title="Open the Schedule"
                            description="Go to the Schedule page (`/schedule`) or click 'View Live Schedule' from the main screen dashboard."
                            icon={<Calendar size={16} />}
                            image="/tutorial/schedule_view_step.png"
                        />
                        <Step
                            number={2}
                            title="Select Class & Time"
                            description="Click on any class card (e.g., 'Pilates') to open the booking options. Available time slots will be shown."
                            icon={<ChevronRight size={16} />}
                            image="/tutorial/booking_modal_step.png"
                        />
                        <Step
                            number={3}
                            title="Enter Guest Details"
                            description="Fill in the Guest Name, Email, and WhatsApp number. Select the number of Pax to ensure the team knows how many people are coming."
                            icon={<Users size={16} />}
                        />
                        <Step
                            number={4}
                            title="Confirm Booking"
                            description="Click 'Confirm Booking'. The app will redirect to WhatsApp to send the booking request to the team."
                            actionButton={<div className="bg-[#25D366] text-white px-3 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><MessageCircle size={12} /> Book on WhatsApp</div>}
                        />
                    </div>
                </section>

                {/* SECTION 2: CANCEL BOOKING */}
                <section id="cancel-booking" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
                    <div className="bg-[#fcfcfc] border-b border-gray-100 px-8 py-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <Trash2 size={20} />
                        </div>
                        <h3 className="text-xl font-bold font-serif">How to Cancel Bookings</h3>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800 text-sm mb-4">
                            <span className="font-bold">Note:</span>
                            Bookings cannot be cancelled directly inside the App interface yet. Use the Google Sheet.
                        </div>

                        <Step
                            number={1}
                            title="Access Master Sheet"
                            description="Open the Google Sheet used for managing bookings (Admin Access required)."
                            icon={<ExternalLink size={16} />}
                        />
                        <Step
                            number={2}
                            title="Locate Highlighted Row"
                            description="Find the booking row using the Guest Name or Booking ID."
                            icon={<Search size={16} />}
                        />
                        <Step
                            number={3}
                            title="Update Status"
                            description="Change the status column to 'Cancelled' or delete the row entirely."
                            icon={<Trash2 size={16} />}
                        />
                    </div>
                </section>

                {/* SECTION 3: SCAN VOUCHER */}
                <section id="scan-voucher" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
                    <div className="bg-[#fcfcfc] border-b border-gray-100 px-8 py-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#c5a572]/10 flex items-center justify-center text-[#c5a572]">
                            <Scan size={20} />
                        </div>
                        <h3 className="text-xl font-bold font-serif">How to Scan & Redeem Vouchers</h3>
                    </div>
                    <div className="p-8 space-y-12">
                        <Step
                            number={1}
                            title="Go to Validate Tab"
                            description="On the Reception Hub (`/`), click the 'Validate' tab in the top navigation bar."
                            actionButton={<div className="text-[#c5a572] border-b-2 border-[#c5a572] px-2 py-1 text-xs font-bold inline-flex items-center gap-1 uppercase tracking-widest"><Scan size={12} /> Validate</div>}
                            image="/tutorial/validate_voucher_step.png"
                        />
                        <Step
                            number={2}
                            title="Open Scanner / Enter ID"
                            description="Click the big Camera icon to scan a QR code, or type the Voucher ID (e.g. NW-1234) manually in the input box."
                            icon={<Camera size={16} />}
                        />
                        <Step
                            number={3}
                            title="Select Service"
                            description="Once the code is recognized, click the dropdown to select which service the guest is using (e.g. 'Morning Yoga' or 'Gym Access')."
                            icon={<ChevronRight size={16} />}
                        />
                        <Step
                            number={4}
                            title="Redeem"
                            description="Click 'Validate & Redeem'. Wait for the green success message."
                            actionButton={<div className="bg-[#2c2420] text-white px-3 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><CheckCircle size={12} /> Validate & Redeem</div>}
                        />
                    </div>
                </section>

                {/* SECTION 4: CREATE VOUCHER */}
                <section id="create-voucher" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
                    <div className="bg-[#fcfcfc] border-b border-gray-100 px-8 py-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#c5a572]/10 flex items-center justify-center text-[#c5a572]">
                            <PlusCircle size={20} />
                        </div>
                        <h3 className="text-xl font-bold font-serif">How to Create Vouchers</h3>
                    </div>
                    <div className="p-8 space-y-12">
                        <Step
                            number={1}
                            title="Go to Create Tab"
                            description="On the Reception Hub (`/`), ensure you are on the 'Create' tab (default view)."
                            actionButton={<div className="text-[#c5a572] border-b-2 border-[#c5a572] px-2 py-1 text-xs font-bold inline-flex items-center gap-1 uppercase tracking-widest"><PlusCircle size={12} /> Create</div>}
                            image="/tutorial/create_voucher_step.png"
                        />
                        <Step
                            number={2}
                            title="Fill Guest Details"
                            description="Enter Guest Name, Pax, Room Number, & WhatsApp Number. IMPORTANT: Ensure WhatsApp number is correct for digital delivery."
                            icon={<Users size={16} />}
                        />
                        <Step
                            number={3}
                            title="Select Entitlements"
                            description="Click the services to include in this voucher (e.g. Wellness Pass, Gym Access). A checkmark will appear."
                            icon={<CheckCircle size={16} />}
                        />
                        <Step
                            number={4}
                            title="Issue Voucher"
                            description="Click 'Issue Digital Voucher'. The QR code will be generated instantly."
                            actionButton={<div className="bg-[#2c2420] text-white px-3 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><PlusCircle size={12} /> Issue Digital Voucher</div>}
                        />
                        <Step
                            number={5}
                            title="Share with Guest"
                            description="Click 'Send' (WhatsApp) or 'Copy Link' to deliver the pass to the guest immediately."
                            icon={<LinkIcon size={16} />}
                        />
                    </div>
                </section>

            </main>
        </div>
    );
};

// Helper Component for Steps
const Step: React.FC<{ number: number; title: string; description: string; icon?: React.ReactNode; actionButton?: React.ReactNode; image?: string }> = ({ number, title, description, icon, actionButton, image }) => (
    <div className="flex gap-4 group">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2c2420] text-white flex items-center justify-center font-bold font-serif shadow-lg group-hover:bg-[#c5a572] transition-colors relative z-10">
            {number}
        </div>
        <div className="flex-1 pt-1 space-y-4">
            <div>
                <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                    {title}
                    {icon && <span className="text-gray-300 group-hover:text-[#c5a572] transition-colors">{icon}</span>}
                </h4>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
            </div>

            {image && (
                <div className="relative rounded-xl overflow-hidden border border-gray-100 shadow-md group-hover:shadow-xl transition-all">
                    <img src={image} alt={`Step ${number} - ${title}`} className="w-full h-auto object-cover" />
                </div>
            )}

            {actionButton && <div>{actionButton}</div>}
        </div>
        {/* Connecting Line (Visual Only - Optional) */}
        {!image && <div className="absolute left-4 top-10 bottom-0 w-px bg-gray-100 -z-0 ml-[15px] hidden md:block opacity-50 last:hidden" />}
    </div>
);

export default HelpSection;
