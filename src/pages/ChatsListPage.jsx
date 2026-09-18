import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getChats } from '../api/chat';
import { AuthContext } from '../context/AuthContext';
import { LogOut, MessageSquare, Mic, Clock, Sparkles } from 'lucide-react';

/**
 * Format a session date into section grouping: "Today", "Yesterday", or Calendar Date
 */
const getGroupLabel = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const isToday = 
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = 
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
};

/**
 * Group sessions by date label, sorting each group in reverse-chronological order
 */
const groupChatsByDate = (chatList) => {
    const sorted = [...chatList].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    const groupsMap = new Map();

    sorted.forEach((chat) => {
        const label = getGroupLabel(chat.started_at);
        if (!groupsMap.has(label)) {
            groupsMap.set(label, []);
        }
        groupsMap.get(label).push(chat);
    });

    return Array.from(groupsMap.entries()).map(([label, items]) => ({
        label,
        items
    }));
};

/**
 * Format session duration if start and end timestamps exist
 */
const formatDuration = (startStr, endStr) => {
    // TODO: Backend does not return an explicit 'duration' field in the /chats response.
    // If both started_at and ended_at are present, compute duration; otherwise omit gracefully.
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs <= 0) return null;
    const totalSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

/**
 * Get mode color dot and label.
 * Gracefully handles missing mode from current backend response.
 */
const getModeInfo = (mode) => {
    // TODO: Backend /chats endpoint does not currently expose a 'mode' field on session objects.
    // Using neutral placeholder dot (var(--text-muted)) and 'Session' label when omitted.
    if (!mode) {
        return {
            color: 'var(--text-muted)',
            label: 'Session',
            isPlaceholder: true
        };
    }
    switch (mode.toLowerCase()) {
        case 'focused':
            return { color: 'var(--mode-focused)', label: 'Focused' };
        case 'reflective':
            return { color: 'var(--mode-reflective)', label: 'Reflective' };
        case 'playful':
            return { color: 'var(--mode-playful)', label: 'Playful' };
        case 'casual':
        default:
            return { color: 'var(--mode-casual)', label: 'Casual' };
    }
};

const ChatsListPage = () => {
    const [chats, setChats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        setIsLoading(true);
        getChats()
            .then((data) => {
                setChats(data || []);
            })
            .catch((err) => {
                console.error('Failed to load chats:', err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const groupedSessions = groupChatsByDate(chats);

    return (
        <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--bg-base)' }}>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header matching dark design tokens */}
                <header className="flex justify-between items-center mb-8 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center space-x-2.5">
                        <MessageSquare size={22} style={{ color: 'var(--mode-casual)' }} />
                        <h1 className="text-xl font-semibold tracking-tight text-white">Your Conversations</h1>
                    </div>
                    <nav className="space-x-3 flex items-center">
                        <Link 
                            to="/memories" 
                            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all hover:border-white/20"
                            style={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderColor: 'var(--border-subtle)', 
                                color: 'var(--text-primary)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <span>Memories</span>
                        </Link>
                        <Link 
                            to="/voice" 
                            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all shadow-sm hover:opacity-90"
                            style={{ 
                                backgroundColor: 'var(--mode-casual)', 
                                borderColor: 'var(--mode-casual)', 
                                color: '#ffffff',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <Mic size={14} /> <span>New Voice Session</span>
                        </Link>
                        <button 
                            onClick={logout} 
                            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all hover:border-red-500/40"
                            style={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderColor: 'var(--border-subtle)', 
                                color: 'var(--status-danger)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <LogOut size={14} /> <span>Logout</span>
                        </button>
                    </nav>
                </header>

                {/* Loading State: 4-5 Skeleton Card Placeholders */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <div 
                                key={n}
                                className="animate-pulse p-4 flex flex-col justify-between border"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    height: '82px'
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                                    <div className="w-24 h-3.5 rounded bg-white/15"></div>
                                    <div className="w-16 h-3 rounded bg-white/10"></div>
                                    <div className="w-20 h-3 rounded bg-white/10 ml-auto"></div>
                                </div>
                                <div className="w-3/5 h-3.5 rounded bg-white/10 mt-2"></div>
                            </div>
                        ))}
                    </div>
                ) : chats.length === 0 ? (
                    /* Empty State */
                    <div 
                        className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl"
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
                            <MessageSquare size={22} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <h3 className="text-base font-medium text-white">No conversations yet</h3>
                        <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
                            Start your first voice session to begin talking with the assistant.
                        </p>
                        <Link
                            to="/voice"
                            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 mt-5 text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: 'var(--mode-casual)', borderRadius: 'var(--radius-md)' }}
                        >
                            <Mic size={14} />
                            <span>Start Voice Session</span>
                        </Link>
                    </div>
                ) : (
                    /* Grouped Sessions List */
                    <div className="space-y-7">
                        {groupedSessions.map(({ label, items }) => (
                            <section key={label}>
                                <h2 
                                    className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {label}
                                </h2>
                                <div className="space-y-2.5">
                                    {items.map((chat) => {
                                        const modeInfo = getModeInfo(chat.mode);
                                        const duration = formatDuration(chat.started_at, chat.ended_at);
                                        // TODO: Backend does not currently expose a transcript preview in /chats.
                                        // If a preview or first message is provided in future data, read it here:
                                        const previewText = chat.preview || (chat.messages && chat.messages[0]?.content) || null;
                                        const formattedTime = new Date(chat.started_at).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });

                                        return (
                                            <Link 
                                                key={chat.id} 
                                                to={`/chats/${chat.id}`}
                                                className="block border p-4 transition-all hover:border-white/20 group"
                                                style={{ 
                                                    backgroundColor: 'var(--bg-surface)', 
                                                    borderColor: 'var(--border-subtle)',
                                                    borderRadius: 'var(--radius-md)'
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    {/* Mode indicator & label */}
                                                    <div className="flex items-center space-x-2.5 min-w-0">
                                                        <span 
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: modeInfo.color }}
                                                            title={modeInfo.isPlaceholder ? "Mode info pending from backend" : `Mode: ${modeInfo.label}`}
                                                        />
                                                        <span className="text-xs font-medium text-white tracking-tight">
                                                            {modeInfo.label}
                                                        </span>

                                                        {/* Duration badge if available */}
                                                        {duration && (
                                                            <span 
                                                                className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full border"
                                                                style={{ 
                                                                    backgroundColor: 'var(--bg-elevated)', 
                                                                    borderColor: 'var(--border-subtle)',
                                                                    color: 'var(--text-secondary)' 
                                                                }}
                                                            >
                                                                <Clock size={10} />
                                                                <span>{duration}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Timestamp and Status */}
                                                    <div className="flex items-center space-x-3 flex-shrink-0 text-xs">
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            {formattedTime}
                                                        </span>
                                                        <span 
                                                            className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                                                            style={{
                                                                backgroundColor: chat.ended_at ? 'rgba(79, 201, 138, 0.12)' : 'rgba(224, 145, 61, 0.12)',
                                                                borderColor: chat.ended_at ? 'rgba(79, 201, 138, 0.3)' : 'rgba(224, 145, 61, 0.3)',
                                                                color: chat.ended_at ? 'var(--mode-playful)' : 'var(--mode-focused)'
                                                            }}
                                                        >
                                                            {chat.ended_at ? 'Completed' : 'Incomplete'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* First line transcript preview (single line, ellipsis overflow) */}
                                                {previewText ? (
                                                    <p 
                                                        className="truncate text-xs mt-2 font-light leading-normal"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        {previewText}
                                                    </p>
                                                ) : (
                                                    <p 
                                                        className="truncate text-xs mt-2 font-light italic"
                                                        style={{ color: 'var(--text-muted)' }}
                                                    >
                                                        Session from {new Date(chat.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatsListPage;
