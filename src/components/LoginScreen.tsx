import React, { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (role: 'admin' | 'staff') => void;
}

const ADMIN_PIN = '0000';
const STAFF_PIN = '0000';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [pin, setPin] = useState('');
    const [selectedRole, setSelectedRole] = useState<'admin' | 'staff'>('admin');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    const handleLogin = () => {
        setIsLoading(true);
        // Simulate network delay for "app feel"
        setTimeout(() => {
            const isValid = (selectedRole === 'admin' && pin === ADMIN_PIN) ||
                (selectedRole === 'staff' && pin === STAFF_PIN);

            if (isValid) {
                onLogin(selectedRole);
            } else {
                setError(true);
                setPin('');
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="min-h-screen bg-[#2c2420] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                    <img src="/htf-logo.png" alt="HTF" className="h-16 mx-auto mb-6 opacity-90 invert brightness-0 filter" />
                    <h2 className="text-white font-serif text-2xl font-bold tracking-wide mb-2">Welcome Back</h2>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Select Role & Enter PIN</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                    <button
                        onClick={() => setSelectedRole('admin')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedRole === 'admin' ? 'bg-[#c5a572] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Admin (Reception)
                    </button>
                    <button
                        onClick={() => setSelectedRole('staff')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedRole === 'staff' ? 'bg-[#c5a572] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Staff (Scanner)
                    </button>
                </div>

                <div className="flex justify-center gap-4 mb-10">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                ? 'bg-[#c5a572] scale-110'
                                : 'bg-white/10 scale-100'
                                } ${error ? 'bg-red-500 animate-shake' : ''}`}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all text-white text-xl font-medium py-6 rounded-2xl backdrop-blur-sm border border-white/5"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="flex items-center justify-center">
                        {/* Empty spacer for alignment */}
                    </div>
                    <button
                        onClick={() => handleNumberClick('0')}
                        className="bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all text-white text-xl font-medium py-6 rounded-2xl backdrop-blur-sm border border-white/5"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                        DELETE
                    </button>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={pin.length !== 4 || isLoading}
                    className="w-full bg-[#c5a572] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#b09365] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                            Access System <ChevronRight size={16} />
                        </>
                    )}
                </button>

                {error && (
                    <p className="text-center text-red-400 text-xs font-bold mt-4 uppercase tracking-widest animate-pulse">
                        Invalid PIN Code
                    </p>
                )}
            </div>
        </div>
    );
};
