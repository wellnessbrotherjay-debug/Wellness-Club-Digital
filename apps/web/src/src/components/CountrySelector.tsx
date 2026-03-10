import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRY_CODES } from '../data/countryCodes';

interface CountrySelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const filteredCountries = COUNTRY_CODES.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dial_code.includes(searchTerm) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCountry = COUNTRY_CODES.find(c => c.dial_code === value) || COUNTRY_CODES.find(c => c.code === 'ID');

    return (
        <div className="relative w-36" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-3 py-3 flex items-center justify-between text-sm font-bold focus:outline-none focus:border-[#c5a572] transition-all hover:bg-gray-50"
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="text-gray-500 font-mono text-xs">{selectedCountry?.code}</span>
                    <span>{selectedCountry?.dial_code}</span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in max-h-80 flex flex-col">
                    {/* Search Header */}
                    <div className="px-3 pb-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search country..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-[#c5a572] transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredCountries.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-xs font-bold uppercase tracking-wide">
                                No countries found
                            </div>
                        ) : (
                            filteredCountries.map((country) => (
                                <button
                                    key={`${country.code}-${country.dial_code}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(country.dial_code);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors group ${value === country.dial_code ? 'bg-[#c5a572]/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded w-8 text-center">{country.code}</span>
                                        <span className={`text-sm truncate ${value === country.dial_code ? 'text-[#c5a572] font-bold' : 'text-[#2c2420]'}`}>
                                            {country.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-2">
                                        <span className="text-xs font-mono text-gray-400">{country.dial_code}</span>
                                        {value === country.dial_code && <Check size={14} className="text-[#c5a572]" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CountrySelector;
