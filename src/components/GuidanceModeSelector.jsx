import React, { useState, useRef, useEffect } from "react";
import { Heart, Apple, Dumbbell, CalendarClock, ChevronDown, Check, X } from "lucide-react";

export const GUIDANCE_MODES = {
    none: { key: "none", label: "None", desc: "Standard conversation mode", icon: null, badgeBg: "", badgeBorder: "", badgeText: "text-neutral-400", activeDot: "bg-neutral-500" },
    emotional_support: { key: "emotional_support", label: "Emotional Support", desc: "A calm space to talk through feelings", icon: Heart, badgeBg: "bg-rose-950/50 backdrop-blur-md", badgeBorder: "border-rose-500/30", badgeText: "text-rose-300", activeDot: "bg-rose-400" },
    nutrition_habits: { key: "nutrition_habits", label: "Nutrition & Habits", desc: "General food, hydration & habit tips", icon: Apple, badgeBg: "bg-lime-950/50 backdrop-blur-md", badgeBorder: "border-lime-500/30", badgeText: "text-lime-300", activeDot: "bg-lime-400" },
    fitness_movement: { key: "fitness_movement", label: "Fitness & Movement", desc: "Exercise ideas & staying consistent", icon: Dumbbell, badgeBg: "bg-orange-950/50 backdrop-blur-md", badgeBorder: "border-orange-500/30", badgeText: "text-orange-300", activeDot: "bg-orange-400" },
    daily_structure: { key: "daily_structure", label: "Daily Structure", desc: "Routines, sleep & work-rest balance", icon: CalendarClock, badgeBg: "bg-teal-950/50 backdrop-blur-md", badgeBorder: "border-teal-500/30", badgeText: "text-teal-300", activeDot: "bg-teal-400" },
};

export const GuidanceModeSelector = ({ guidanceMode = "none", onGuidanceModeChange }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const activeConfig = GUIDANCE_MODES[guidanceMode] || GUIDANCE_MODES.none;
    const isActive = guidanceMode && guidanceMode !== "none";
    const IconComponent = activeConfig.icon;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (key) => {
        if (onGuidanceModeChange) onGuidanceModeChange(key);
        setDropdownOpen(false);
    };

    const pillBase = isActive
        ? (activeConfig.badgeBg + " " + activeConfig.badgeBorder + " " + activeConfig.badgeText)
        : "bg-white/5 border-white/10 text-neutral-500 backdrop-blur-md";

    return (
        <div className="relative inline-flex items-center" ref={dropdownRef}>
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300 shadow-sm cursor-pointer ${pillBase}`}>
                <button type="button" onClick={() => setDropdownOpen(prev => !prev)} className="flex items-center space-x-1.5 focus:outline-none hover:opacity-80 transition-opacity" title="Select Guidance Mode">
                    {IconComponent ? <IconComponent size={14} /> : <span className="text-[11px] font-bold tracking-widest uppercase opacity-60">G</span>}
                    <span className="font-semibold tracking-tight">{isActive ? activeConfig.label : "Guidance"}</span>
                    <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isActive && (
                    <>
                        <div className="w-px h-3 bg-white/20 mx-1" />
                        <button type="button" onClick={() => handleSelect("none")} className="p-0.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none" title="Clear guidance mode">
                            <X size={11} className="opacity-60 hover:opacity-100" />
                        </button>
                    </>
                )}
            </div>

            {dropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-white">
                    <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Guidance Mode</span>
                        <p className="text-[10px] text-neutral-500 mt-0.5">General wellness info -- not professional advice</p>
                    </div>

                    <button onClick={() => handleSelect("none")} className={`w-full px-3 py-2 text-left flex items-start space-x-2.5 transition-colors ${guidanceMode === "none" ? "bg-white/10" : "hover:bg-white/5"}`}>
                        <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 flex items-center justify-center w-7 h-7">
                            <span className="text-[10px] font-bold">--</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white">None</span>{guidanceMode === "none" && <Check size={12} className="text-sky-400" />}</div>
                            <p className="text-[11px] text-neutral-400">Standard conversation</p>
                        </div>
                    </button>

                    <div className="mx-3 my-1 border-t border-white/5" />

                    {Object.values(GUIDANCE_MODES).filter(m => m.key !== "none").map(item => {
                        const ItemIcon = item.icon;
                        const isSelected = item.key === guidanceMode;
                        const itemPill = item.badgeBg + " " + item.badgeText;
                        return (
                            <button key={item.key} onClick={() => handleSelect(item.key)} className={`w-full px-3 py-2 text-left flex items-start space-x-2.5 transition-colors ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}>
                                <div className={`p-1.5 rounded-lg mt-0.5 ${itemPill}`}><ItemIcon size={14} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white">{item.label}</span>{isSelected && <Check size={12} className="text-sky-400" />}</div>
                                    <p className="text-[11px] text-neutral-400 truncate">{item.desc}</p>
                                </div>
                            </button>
                        );
                    })}

                    <div className="mx-3 mt-2 pt-2 border-t border-white/5">
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                            Guidance modes provide general wellness information only. Always consult a qualified professional for medical, nutritional, or therapeutic concerns.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
