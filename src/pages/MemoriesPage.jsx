import React, { useEffect, useState, useRef } from 'react';
import { getMemories, deleteMemory } from '../api/memories';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Brain, MoreVertical, Edit2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { exportMemoriesToObsidian } from '../utils/obsidianExport';

/**
 * Client-side grouping of identical or near-identical memories (case-insensitive, trimmed).
 * Display grouping only; does not mutate or merge original data.
 */
const groupSimilarMemories = (memoryList) => {
    const map = new Map();
    // Sort reverse-chronological by created_at first
    const sorted = [...memoryList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sorted.forEach((mem) => {
        const key = (mem.text || '').trim().toLowerCase();
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(mem);
    });

    return Array.from(map.entries()).map(([key, items]) => ({
        key,
        primary: items[0],
        similar: items.slice(1),
        count: items.length
    }));
};

const MemoriesPage = () => {
    const [memories, setMemories] = useState([]);
    const [exportFlash, setExportFlash] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const menuRef = useRef(null);
    
    const fetchMemories = () => {
        getMemories().then(setMemories).catch(console.error);
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    // Close overflow menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = async (id) => {
        try {
            setOpenMenuId(null);
            await deleteMemory(id);
            fetchMemories();
        } catch (err) {
            console.error('Failed to delete memory', err);
        }
    };

    const handleExport = () => {
        exportMemoriesToObsidian(memories);
        setExportFlash(true);
        setTimeout(() => setExportFlash(false), 1500);
    };

    const toggleGroupExpanded = (key) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const memoryGroups = groupSimilarMemories(memories);

    const renderOverflowMenu = (m) => {
        const isOpen = openMenuId === m.id;
        // TODO: Backend does not currently return a session_id on /memories items.
        // If exposed in future API versions, 'View source session' will automatically link here:
        const hasSourceSession = Boolean(m.session_id);

        return (
            <div className="relative flex-shrink-0" ref={isOpen ? menuRef : null}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isOpen ? null : m.id);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors focus:outline-none"
                    style={{ backgroundColor: isOpen ? 'var(--bg-elevated)' : 'transparent' }}
                    title="Actions"
                >
                    <MoreVertical size={16} />
                </button>

                {isOpen && (
                    <div 
                        className="absolute right-0 top-full mt-1.5 w-48 border rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                        style={{ 
                            backgroundColor: 'var(--bg-elevated)', 
                            borderColor: 'var(--border-subtle)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        {/* Edit Action - Stubbed & disabled with tooltip */}
                        <button
                            type="button"
                            disabled
                            className="w-full px-3 py-2 text-left text-xs flex items-center space-x-2.5 opacity-40 cursor-not-allowed"
                            style={{ color: 'var(--text-muted)' }}
                            title="Editing not yet supported"
                        >
                            <Edit2 size={13} />
                            <span>Edit (Not yet supported)</span>
                        </button>

                        {/* View Source Session - Only rendered if memory object exposes session_id */}
                        {hasSourceSession && (
                            <Link
                                to={`/chats/${m.session_id}`}
                                className="w-full px-3 py-2 text-left text-xs flex items-center space-x-2.5 transition-colors hover:bg-white/5"
                                style={{ color: 'var(--text-primary)' }}
                                onClick={() => setOpenMenuId(null)}
                            >
                                <ExternalLink size={13} />
                                <span>View source session</span>
                            </Link>
                        )}

                        <div className="my-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

                        {/* Delete Action */}
                        <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            className="w-full px-3 py-2 text-left text-xs flex items-center space-x-2.5 transition-colors hover:bg-red-950/40"
                            style={{ color: 'var(--status-danger)' }}
                        >
                            <Trash2 size={13} />
                            <span>Delete memory</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--bg-base)' }}>
            <div className="max-w-3xl mx-auto p-6">
                {/* Header with adequate spacing between count badge and Obsidian Export */}
                <div className="flex items-center justify-between mb-8 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/chats"
                            className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:border-white/20"
                            style={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-secondary)'
                            }}
                            title="Back to Sessions"
                        >
                            <ArrowLeft size={16} />
                        </Link>
                        <div className="flex items-center space-x-2.5">
                            <Brain size={20} style={{ color: 'var(--mode-reflective)' }} />
                            <h1 className="text-xl font-semibold tracking-wide text-white">Your Memories</h1>
                            {memories.length > 0 && (
                                <span 
                                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full border ml-2"
                                    style={{ 
                                        backgroundColor: 'var(--bg-surface)', 
                                        borderColor: 'var(--border-subtle)', 
                                        color: 'var(--mode-reflective)' 
                                    }}
                                >
                                    {memories.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Export to Obsidian - right-aligned, clearly separated by flex layout */}
                    {memories.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 hover:border-white/20 ml-4 flex-shrink-0"
                            style={{ 
                                backgroundColor: exportFlash ? 'rgba(79, 201, 138, 0.15)' : 'var(--bg-surface)', 
                                borderColor: exportFlash ? 'var(--mode-playful)' : 'var(--border-subtle)', 
                                color: exportFlash ? 'var(--mode-playful)' : 'var(--text-primary)',
                                borderRadius: 'var(--radius-md)'
                            }}
                            title="Download all memories as a Markdown file for Obsidian"
                        >
                            <Download size={13} />
                            <span>{exportFlash ? 'Downloading…' : 'Export to Obsidian'}</span>
                        </button>
                    )}
                </div>

                {/* Memory List */}
                <div className="space-y-4">
                    {memories.length === 0 ? (
                        <div 
                            className="flex flex-col items-center justify-center py-24 text-center border rounded-2xl"
                            style={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderColor: 'var(--border-subtle)',
                                borderRadius: 'var(--radius-lg)'
                            }}
                        >
                            <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center border mb-3"
                                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                            >
                                <Brain size={24} style={{ color: 'var(--text-secondary)' }} />
                            </div>
                            <p className="text-white text-sm font-medium">No memories stored yet</p>
                            <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                                Important details, preferences, and reflections mentioned in your voice sessions will automatically appear here.
                            </p>
                        </div>
                    ) : (
                        memoryGroups.map(({ key, primary, similar, count }) => {
                            const isExpanded = Boolean(expandedGroups[key]);

                            return (
                                <div
                                    key={key}
                                    className="border transition-all"
                                    style={{ 
                                        backgroundColor: 'var(--bg-surface)', 
                                        borderColor: 'var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px'
                                    }}
                                >
                                    {/* Primary Memory Entry */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="text-sm text-neutral-100 leading-relaxed font-light">{primary.text}</p>
                                            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                                                {new Date(primary.created_at).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        {renderOverflowMenu(primary)}
                                    </div>

                                    {/* Expandable disclosure for duplicate/similar entries */}
                                    {similar.length > 0 && (
                                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                            <button
                                                type="button"
                                                onClick={() => toggleGroupExpanded(key)}
                                                className="flex items-center space-x-1.5 text-xs font-medium py-1 px-2 rounded-md transition-colors hover:bg-white/5"
                                                style={{ color: 'var(--mode-reflective)' }}
                                            >
                                                <span>{count} similar entries</span>
                                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-2 space-y-2 pl-3 border-l-2" style={{ borderColor: 'var(--border-subtle)' }}>
                                                    {similar.map((sim) => (
                                                        <div key={sim.id} className="flex justify-between items-start py-1.5">
                                                            <div className="flex-1 min-w-0 pr-3">
                                                                <p className="text-xs text-neutral-300 font-light">{sim.text}</p>
                                                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                                    {new Date(sim.created_at).toLocaleString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            {renderOverflowMenu(sim)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemoriesPage;
