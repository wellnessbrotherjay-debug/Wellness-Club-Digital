import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
}

const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedCountry = COUNTRIES.find(c => c.code === value) || COUNTRIES.find(c => c.code === 'ID')!;

    const filteredCountries = COUNTRIES.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dial_code.includes(searchQuery) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Update position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current!.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const spaceBelow = viewportHeight - rect.bottom;
                const dropdownHeight = 300; // Approximate max height

                // Decide placement: if space below < 300px and space above > space below, go up
                const placeUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;

                // Mobile adjustment: if screen is narrow, make dropdown wider (e.g. 280-300px min)
                const isMobile = viewportWidth < 768;
                let width = rect.width;
                let left = rect.left;

                if (isMobile) {
                    width = Math.min(viewportWidth - 32, 320); // Max 320px or screen width minus padding
                    // Center adjust if regular left position goes off screen
                    if (left + width > viewportWidth) {
                        left = viewportWidth - width - 16; // 16px padding from right
                    }
                    if (left < 16) left = 16; // 16px padding from left
                }

                if (placeUp) {
                    setDropdownStyle({
                        position: 'fixed',
                        bottom: `${viewportHeight - rect.top + 4}px`, // 4px gap from top of button
                        left: `${left}px`,
                        width: `${width}px`,
                        maxHeight: '300px'
                    });
                } else {
                    setDropdownStyle({
                        position: 'fixed',
                        top: `${rect.bottom + 4}px`,
                        left: `${left}px`,
                        width: `${width}px`,
                        maxHeight: '300px'
                    });
                }
            };

            updatePosition();

            // Only auto-focus on non-touch devices to avoid keyboard popping up immediately on mobile
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            if (!isTouch) {
                setTimeout(() => {
                    if (inputRef.current) inputRef.current.focus();
                }, 50);
            }

            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            }
        }
    }, [isOpen]);

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Check if click is outside both the button (container) and the dropdown
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

            if (isOutsideContainer && isOutsideDropdown) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const dropdownContent = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-[#e0d9c8] rounded-[12px] shadow-2xl z-[10002] flex flex-col overflow-hidden animate-fade-in"
        >
            <div className="p-3 border-b border-[#e0d9c8] bg-[#fdfaf6]">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#e0d9c8] rounded-[6px] focus:border-[#c5a572] outline-none"
                    />
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-1">
                {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                        <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                                onChange(country.code);
                                setIsOpen(false);
                                setSearchQuery('');
                            }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f4ede5] transition-colors rounded-[8px] ${country.code === value ? 'bg-[#f4ede5]' : ''}`}
                        >
                            <span className="text-xl">{country.flag}</span>
                            <span className="font-medium text-[#2c2420] w-12">{country.dial_code}</span>
                            <span className="text-sm text-[#666] truncate flex-1">{country.name}</span>
                        </button>
                    ))
                ) : (
                    <div className="p-4 text-center text-sm text-[#666]">
                        No country found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="relative h-full" ref={containerRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-full min-w-[120px] p-4 border-2 border-[#e0d9c8] rounded-[6px] focus:border-[#c5a572] outline-none transition-colors bg-white flex items-center justify-between gap-2"
                >
                    <span className="flex items-center gap-2">
                        <span className="text-xl">{selectedCountry.flag}</span>
                        <span className="font-medium text-[#2c2420]">{selectedCountry.dial_code}</span>
                    </span>
                    <ChevronDown size={14} className="text-[#666]" />
                </button>
            </div>

            {isOpen && createPortal(dropdownContent, document.body)}
        </>
    );
};
export default CountrySelect;
