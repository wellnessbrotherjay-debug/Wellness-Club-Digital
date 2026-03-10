import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
    PlusCircle, Scan, Camera, CheckCircle,
    ChevronRight, Users, Link as LinkIcon
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
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <button onClick={() => scrollToSection('create-voucher')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <PlusCircle className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Create Voucher</span>
                    </button>
                    <button onClick={() => scrollToSection('scan-voucher')} className="p-6 bg-white rounded-xl border border-gray-100 hover:border-[#c5a572] hover:shadow-md transition-all group text-left">
                        <Scan className="text-[#c5a572] mb-3 group-hover:scale-110 transition-transform" size={24} />
                        <span className="block font-bold text-sm">Scan Voucher</span>
                    </button>
                </div>

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
                            description="On the Reception Hub (`/ `), click the 'Validate' tab in the top navigation bar."
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

                {/* SECTION: CREATE VOUCHER */}
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
                            description="On the Reception Hub (`/ `), ensure you are on the 'Create' tab."
                            actionButton={<div className="text-[#c5a572] border-b-2 border-[#c5a572] px-2 py-1 text-xs font-bold inline-flex items-center gap-1 uppercase tracking-widest"><PlusCircle size={12} /> Create</div>}
                            image="/tutorial/create_voucher_step.png"
                        />
                        <Step
                            number={2}
                            title="Fill Guest Info"
                            description="Enter Guest Name, Pax, Room Number, and WhatsApp Number."
                            icon={<Users size={16} />}
                        />
                        <Step
                            number={3}
                            title="Select Entitlements"
                            description="Click the services to include in this voucher (e.g. Wellness Pass, Gym Access)."
                            icon={<CheckCircle size={16} />}
                        />
                        <Step
                            number={4}
                            title="Issue Voucher"
                            description="Click 'Issue Digital Voucher'. The QR code will be generated."
                            actionButton={<div className="bg-[#2c2420] text-white px-3 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><PlusCircle size={12} /> Issue Digital Voucher</div>}
                        />
                        <Step
                            number={5}
                            title="Share with Guest"
                            description="Click 'Send' (WhatsApp) or 'Copy Link' to deliver the pass to the guest."
                            icon={<LinkIcon size={16} />}
                        />
                    </div>
                </section>

                {/* SECTION 5: MANAGING & REDEEMING */}
                <section id="manage-vouchers" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
                    <div className="bg-[#fcfcfc] border-b border-gray-100 px-8 py-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#c5a572]/10 flex items-center justify-center text-[#c5a572]">
                            <CheckCircle size={20} />
                        </div>
                        <h3 className="text-xl font-bold font-serif">Managing & Redeeming</h3>
                    </div>
                    <div className="p-8 space-y-12">
                        <Step
                            number={1}
                            title="Guest Check-In / Download"
                            description="Guests can scan the QR code on your screen to download their Digital Pass immediately onto their phone."
                            icon={<Scan size={16} />}
                        />
                        <Step
                            number={2}
                            title="Full Search"
                            description="Go to the 'Issued' tab to search all vouchers by Guest Name, Room, or ID."
                            icon={<Users size={16} />}
                        />
                        <Step
                            number={3}
                            title="Redeem Services"
                            description="Use the 'Validate' tab to scan the Guest's pass. Select the service they are using (e.g. 'Gym') and click Redeem."
                            icon={<CheckCircle size={16} />}
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
                    <img src={image} alt={`Step ${number} - ${title} `} className="w-full h-auto object-cover" />
                </div>
            )}

            {actionButton && <div>{actionButton}</div>}
        </div>
        {/* Connecting Line (Visual Only - Optional) */}
        {!image && <div className="absolute left-4 top-10 bottom-0 w-px bg-gray-100 -z-0 ml-[15px] hidden md:block opacity-50 last:hidden" />}
    </div>
);

export default HelpSection;
