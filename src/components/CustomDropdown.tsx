import { useState, useRef, useEffect } from 'react';

interface Option {
    value: string;
    label: string;
}

interface CustomDropdownProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
}

export function CustomDropdown({ value, options, onChange, placeholder }: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`custom-dropdown ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
            <button
                type="button"
                className="dropdown-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <svg className={`chevron ${isOpen ? 'up' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <div className="dropdown-menu">
                <div className="dropdown-menu-inner">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`dropdown-item ${option.value === value ? 'active' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                            {option.value === value && (
                                <svg className="check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
