import React, { useState } from 'react';
import { ChevronRight, Loader2, KeyRound } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (role: 'admin' | 'staff') => void;
}

const ADMIN_PASSWORD = 'admin1234';
const STAFF_PASSWORD = 'no1reception';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<'admin' | 'staff'>('admin');
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setIsLoading(true);
        // Simulate network delay for "app feel"
        setTimeout(() => {
            const isValid = (selectedRole === 'admin' && password === ADMIN_PASSWORD) ||
                (selectedRole === 'staff' && password === STAFF_PASSWORD);

            if (isValid) {
                onLogin(selectedRole);
            } else {
                setError(true);
                setPassword('');
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
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Select Role & Enter Password</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
                    <button
                        onClick={() => { setSelectedRole('admin'); setError(false); setPassword(''); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedRole === 'admin' ? 'bg-[#c5a572] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Front House Admin
                    </button>
                    <button
                        onClick={() => { setSelectedRole('staff'); setError(false); setPassword(''); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedRole === 'staff' ? 'bg-[#c5a572] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                        Front House
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(false); }}
                            placeholder="Enter Password"
                            className={`w-full bg-white/5 border ${error ? 'border-red-500 animate-shake' : 'border-white/10'} rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-[#c5a572] focus:ring-1 focus:ring-[#c5a572] transition-all`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={password.length === 0 || isLoading}
                        className="w-full bg-[#c5a572] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#b09365] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Access System <ChevronRight size={16} />
                            </>
                        )}
                    </button>

                    {error && (
                        <p className="text-center text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                            Invalid Password
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};
