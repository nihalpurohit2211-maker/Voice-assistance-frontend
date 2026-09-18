import React, { useState, useRef, useEffect } from 'react';
import { Coffee, Target, Heart, Sparkles, Lock, Unlock, ChevronDown, Check } from 'lucide-react';

export const MODES = {
    casual: {
        key: 'casual',
        label: 'Casual',
        desc: 'Light, relaxed & friendly',
        icon: Coffee,
        badgeBg: 'bg-slate-50',
        badgeBorder: 'border-slate-200',
        badgeText: 'text-slate-700',
        activeDot: 'bg-slate-500',
    },
    focused: {
        key: 'focused',
        label: 'Focused',
        desc: 'Clear, direct & efficient',
        icon: Target,
        badgeBg: 'bg-blue-50',
        badgeBorder: 'border-blue-200',
        badgeText: 'text-blue-700',
        activeDot: 'bg-blue-600',
    },
    reflective: {
        key: 'reflective',
        label: 'Reflective',
        desc: 'Calm, gentle & comforting',
        icon: Heart,
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
        badgeText: 'text-rose-700',
        activeDot: 'bg-rose-500',
    },
    playful: {
        key: 'playful',
        label: 'Playful',
        desc: 'Energetic, witty & spirited',
        icon: Sparkles,
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-200',
        badgeText: 'text-amber-700',
        activeDot: 'bg-amber-500',
    },
};

export const ModeIndicatorBar = ({ mode = 'casual', onModeChange, isLocked = false, onToggleLock }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [animatePulse, setAnimatePulse] = useState(false);
    const dropdownRef = useRef(null);
    const prevModeRef = useRef(mode);

    const activeConfig = MODES[mode] || MODES.casual;
    const IconComponent = activeConfig.icon;

    // Trigger subtle visual pulse when mode auto-switches or changes
    useEffect(() => {
        if (prevModeRef.current !== mode) {
            setAnimatePulse(true);
            const timer = setTimeout(() => setAnimatePulse(false), 800);
            prevModeRef.current = mode;
            return () => clearTimeout(timer);
        }
    }, [mode]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (selectedKey) => {
        if (onModeChange) {
            onModeChange(selectedKey);
        }
        setDropdownOpen(false);
    };

    return (
        <div className="relative inline-flex items-center" ref={dropdownRef}>
            {/* Pill Container */}
            <div 
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300 shadow-sm ${activeConfig.badgeBg} ${activeConfig.badgeBorder} ${activeConfig.badgeText} ${animatePulse ? 'ring-2 ring-offset-1 ring-blue-300 scale-105' : 'scale-100'}`}
            >
                {/* Mode Selector Button */}
                <button
                    type="button"
                    onClick={() => setDropdownOpen(prev => !prev)}
                    className="flex items-center space-x-1.5 focus:outline-none hover:opacity-80 transition-opacity"
                    title="Click to manually change mode"
                >
                    <IconComponent size={14} className="transition-transform duration-300" />
                    <span className="font-semibold tracking-tight">{activeConfig.label}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                        ({isLocked ? 'Locked' : 'Auto'})
                    </span>
                    <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Divider */}
                <div className="w-px h-3 bg-neutral-300 opacity-60 mx-1" />

                {/* Animated Lock/Unlock Toggle Button */}
                <button
                    type="button"
                    onClick={onToggleLock}
                    className="relative group p-1 rounded-full hover:bg-black/5 transition-colors focus:outline-none flex items-center justify-center w-5 h-5"
                    title={isLocked ? "Mode is Locked (Click to allow auto-switching)" : "Auto-Switching active (Click to lock mode)"}
                >
                    {isLocked ? (
                        <>
                            {/* Visible when NOT hovered */}
                            <Lock size={12} className="text-neutral-700 transition-opacity duration-200 group-hover:opacity-0 absolute" />
                            {/* Morph preview to Unlock on hover */}
                            <Unlock size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute" />
                        </>
                    ) : (
                        <>
                            {/* Visible when NOT hovered */}
                            <Unlock size={12} className="text-neutral-400 transition-opacity duration-200 group-hover:opacity-0 absolute" />
                            {/* Morph preview to Lock on hover */}
                            <Lock size={12} className="text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute" />
                        </>
                    )}
                </button>
            </div>

            {/* Dropdown Menu for Manual Mode Selection */}
            {dropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-60 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 text-neutral-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-neutral-100 mb-1 flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Conversation Mode</span>
                        <span className="text-[10px] text-neutral-400">
                            {isLocked ? 'Locked mode' : 'One-turn override'}
                        </span>
                    </div>
                    {Object.values(MODES).map((item) => {
                        const ItemIcon = item.icon;
                        const isSelected = item.key === mode;
                        return (
                            <button
                                key={item.key}
                                onClick={() => handleSelect(item.key)}
                                className={`w-full px-3 py-2 text-left flex items-start space-x-2.5 transition-colors ${isSelected ? 'bg-neutral-50 font-medium' : 'hover:bg-neutral-50/70'}`}
                            >
                                <div className={`p-1.5 rounded-lg mt-0.5 ${item.badgeBg} ${item.badgeText}`}>
                                    <ItemIcon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-neutral-900">{item.label}</span>
                                        {isSelected && <Check size={12} className="text-blue-600" />}
                                    </div>
                                    <p className="text-[11px] text-neutral-500 truncate">{item.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
