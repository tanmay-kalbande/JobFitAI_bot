import { useState, useRef, useEffect, useCallback } from 'react';

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
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const updateMenuPosition = useCallback(() => {
        if (!toggleRef.current) return;
        const rect = toggleRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = Math.min(options.length * 44, 200);
        const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight + 16;

        setMenuStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 8 }
                : { top: rect.bottom + 8 }),
        });
    }, [options.length]);

    const handleToggle = () => {
        if (!isOpen) updateMenuPosition();
        setIsOpen(prev => !prev);
    };

    // Close on outside click or scroll
    useEffect(() => {
        if (!isOpen) return;
        const close = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const closeOnScroll = () => setIsOpen(false);
        document.addEventListener('mousedown', close);
        window.addEventListener('scroll', closeOnScroll, true);
        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', closeOnScroll, true);
        };
    }, [isOpen]);

    return (
        <div
            className={`custom-dropdown ${isOpen ? 'is-open' : ''}`}
            ref={containerRef}
        >
            <button
                type="button"
                className="dropdown-toggle"
                ref={toggleRef}
                onClick={handleToggle}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <svg
                    className={`chevron ${isOpen ? 'up' : ''}`}
                    width="12" height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="dropdown-menu dropdown-menu-portal" style={menuStyle}>
                    <div className="dropdown-menu-inner">
                        {options.map(option => (
                            <div
                                key={option.value}
                                className={`dropdown-item ${option.value === value ? 'active' : ''}`}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                            >
                                {option.label}
                                {option.value === value && (
                                    <svg
                                        className="check-icon"
                                        width="12" height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
