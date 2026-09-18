import React, { useState, useRef, useEffect } from 'react';
import { 
    Coffee, 
    Target, 
    Heart, 
    Sparkles, 
    Lock, 
    Unlock, 
    ChevronDown, 
    Check, 
    Apple, 
    Dumbbell, 
    CalendarClock, 
    Minus 
} from 'lucide-react';

export const TONE_MODES = {
    casual: {
        key: 'casual',
        label: 'Casual',
        desc: 'Light, relaxed & friendly',
        icon: Coffee,
        color: 'var(--mode-casual)'
    },
    focused: {
        key: 'focused',
        label: 'Focused',
        desc: 'Clear, direct & efficient',
        icon: Target,
        color: 'var(--mode-focused)'
    },
    reflective: {
        key: 'reflective',
        label: 'Reflective',
        desc: 'Calm, gentle & comforting',
        icon: Heart,
        color: 'var(--mode-reflective)'
    },
    playful: {
        key: 'playful',
        label: 'Playful',
        desc: 'Energetic, witty & spirited',
        icon: Sparkles,
        color: 'var(--mode-playful)'
    },
};

export const GUIDANCE_SUBMODES = {
    none: {
        key: 'none',
        label: 'None',
        desc: 'Standard conversation mode',
        icon: Minus,
        color: 'var(--text-muted)'
    },
    emotional_support: {
        key: 'emotional_support',
        label: 'Emotional Support',
        desc: 'A calm space to talk through feelings',
        icon: Heart,
        color: 'var(--mode-guidance)'
    },
    nutrition_habits: {
        key: 'nutrition_habits',
        label: 'Nutrition & Habits',
        desc: 'General food, hydration & habit tips',
        icon: Apple,
        color: 'var(--mode-playful)'
    },
    fitness_movement: {
        key: 'fitness_movement',
        label: 'Fitness & Movement',
        desc: 'Exercise ideas & staying consistent',
        icon: Dumbbell,
        color: 'var(--mode-focused)'
    },
    daily_structure: {
        key: 'daily_structure',
        label: 'Daily Structure',
        desc: 'Routines, sleep & work-rest balance',
        icon: CalendarClock,
        color: 'var(--mode-reflective)'
    },
};

/**
 * UnifiedModeSelector
 * Single top-bar control merging Tone mode + Guidance sub-mode
 * Stacked vertically:
 *   Section "TONE" - 4 tone options + lock/unlock toggle
 *   Section "GUIDANCE" - None + 4 wellness sub-modes
 * Pinned disclaimer when guidance mode is active
 */
export const UnifiedModeSelector = ({
    mode = 'casual',
    onModeChange,
    isLocked = false,
    onToggleLock,
    guidanceMode = 'none',
    onGuidanceModeChange
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeTone = TONE_MODES[mode] || TONE_MODES.casual;
    const ToneIcon = activeTone.icon;
    const activeGuidance = GUIDANCE_SUBMODES[guidanceMode] || GUIDANCE_SUBMODES.none;
    const isGuidanceActive = guidanceMode && guidanceMode !== 'none';
    const GuidanceIcon = activeGuidance.icon;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTone = (toneKey) => {
        if (onModeChange) onModeChange(toneKey);
    };

    const handleSelectGuidance = (guidanceKey) => {
        if (onGuidanceModeChange) onGuidanceModeChange(guidanceKey);
    };

    return (
        <div className="relative inline-flex items-center" ref={dropdownRef}>
            {/* Unified Top-Bar Trigger Pill */}
            <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2 px-3 py-1.5 border text-xs font-medium transition-all shadow-sm focus:outline-none hover:border-white/20"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)'
                }}
                title="Mode and Guidance Settings"
            >
                {/* Tone Icon & Label */}
                <span className="flex items-center space-x-1.5" style={{ color: activeTone.color }}>
                    <ToneIcon size={14} />
                    <span className="font-semibold tracking-tight text-white">{activeTone.label}</span>
                </span>

                {/* Auto/Lock status indicator */}
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({isLocked ? 'Locked' : 'Auto'})
                </span>

                {/* Active Guidance Pill snippet if non-None */}
                {isGuidanceActive && (
                    <>
                        <span className="w-px h-3 bg-white/15" />
                        <span 
                            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
                            style={{ 
                                backgroundColor: 'rgba(212, 83, 107, 0.15)',
                                color: 'var(--mode-guidance)'
                            }}
                        >
                            <GuidanceIcon size={12} />
                            <span>{activeGuidance.label}</span>
                        </span>
                    </>
                )}

                <ChevronDown 
                    size={12} 
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }} 
                />
            </button>

            {/* Unified Dropdown Menu */}
            {dropdownOpen && (
                <div 
                    className="absolute top-full mt-2 left-0 w-72 border shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{ 
                        backgroundColor: 'var(--bg-surface)', 
                        borderColor: 'var(--border-subtle)',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    {/* SECTION 1: TONE */}
                    <div className="px-3 pb-1 flex justify-between items-center">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Tone
                        </span>
                        
                        {/* Lock / Unlock Toggle Button Relocated Inside Section Header */}
                        <div className="flex items-center space-x-1.5">
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {isLocked ? 'Locked' : 'Auto-switch'}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleLock) onToggleLock();
                                }}
                                className="relative group p-1 rounded hover:bg-white/10 transition-colors focus:outline-none flex items-center justify-center w-5 h-5"
                                title={isLocked ? "Mode is Locked (Click to allow auto-switching)" : "Auto-Switching active (Click to lock mode)"}
                            >
                                {isLocked ? (
                                    <>
                                        <Lock size={12} className="text-white/90 transition-opacity duration-200 group-hover:opacity-0 absolute" />
                                        <Unlock size={12} className="text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute" />
                                    </>
                                ) : (
                                    <>
                                        <Unlock size={12} className="text-white/60 transition-opacity duration-200 group-hover:opacity-0 absolute" />
                                        <Lock size={12} className="text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tone Options */}
                    <div className="px-1 space-y-0.5 mt-1">
                        {Object.values(TONE_MODES).map((item) => {
                            const ItemIcon = item.icon;
                            const isSelected = item.key === mode;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleSelectTone(item.key)}
                                    className="w-full px-2.5 py-1.5 text-left flex items-start space-x-2.5 rounded-lg transition-colors hover:bg-white/5"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent'
                                    }}
                                >
                                    <div 
                                        className="p-1.5 rounded-md mt-0.5 flex-shrink-0"
                                        style={{ 
                                            backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                                            color: item.color 
                                        }}
                                    >
                                        <ItemIcon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-white">{item.label}</span>
                                            {isSelected && <Check size={12} style={{ color: item.color }} />}
                                        </div>
                                        <p className="text-[11px] truncate font-light" style={{ color: 'var(--text-muted)' }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Section Divider */}
                    <div className="my-2.5 border-t mx-2" style={{ borderColor: 'var(--border-subtle)' }} />

                    {/* SECTION 2: GUIDANCE */}
                    <div className="px-3 pb-1 flex justify-between items-center">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Guidance
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Wellness sub-modes
                        </span>
                    </div>

                    {/* Guidance Options */}
                    <div className="px-1 space-y-0.5 mt-1">
                        {Object.values(GUIDANCE_SUBMODES).map((item) => {
                            const ItemIcon = item.icon;
                            const isSelected = item.key === guidanceMode;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleSelectGuidance(item.key)}
                                    className="w-full px-2.5 py-1.5 text-left flex items-start space-x-2.5 rounded-lg transition-colors hover:bg-white/5"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent'
                                    }}
                                >
                                    <div 
                                        className="p-1.5 rounded-md mt-0.5 flex-shrink-0"
                                        style={{ 
                                            backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                                            color: item.color 
                                        }}
                                    >
                                        <ItemIcon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-white">{item.label}</span>
                                            {isSelected && <Check size={12} style={{ color: item.color }} />}
                                        </div>
                                        <p className="text-[11px] truncate font-light" style={{ color: 'var(--text-muted)' }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Pinned Disclaimer Text - shown whenever active guidance sub-mode is not "None" */}
                    {isGuidanceActive && (
                        <div className="mx-3 mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                Guidance modes provide general wellness information only. Always consult a qualified professional for medical, nutritional, or therapeutic concerns.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UnifiedModeSelector;
