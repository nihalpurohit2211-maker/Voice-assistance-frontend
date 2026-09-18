import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChatById } from '../api/chat';
import { ArrowLeft, Download, MessageSquare } from 'lucide-react';
import { exportChatToObsidian } from '../utils/obsidianExport';

const ChatDetailPage = () => {
    const { id } = useParams();
    const [chat, setChat] = useState(null);
    const [exportFlash, setExportFlash] = useState(false);

    useEffect(() => {
        getChatById(id).then(setChat).catch(console.error);
    }, [id]);

    const handleExport = () => {
        if (!chat) return;
        exportChatToObsidian(chat);
        setExportFlash(true);
        setTimeout(() => setExportFlash(false), 1500);
    };

    if (!chat) return (
        <div className="min-h-screen bg-[#090b10] flex items-center justify-center">
            <div className="text-neutral-500 text-sm animate-pulse">Loading session…</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#090b10] text-white">
            <div className="max-w-3xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/chats"
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                            <ArrowLeft size={16} className="text-neutral-400" />
                        </Link>
                        <div className="flex items-center space-x-2">
                            <MessageSquare size={18} className="text-sky-400" />
                            <div>
                                <h1 className="text-sm font-semibold text-white tracking-wide">Session Transcript</h1>
                                <p className="text-[11px] text-neutral-500">
                                    {new Date(chat.started_at).toLocaleString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${
                            exportFlash
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                        }`}
                        title="Download transcript as a Markdown file for Obsidian"
                    >
                        <Download size={13} />
                        <span>{exportFlash ? 'Downloading…' : 'Export to Obsidian'}</span>
                    </button>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                    {chat.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <MessageSquare size={32} className="text-neutral-700 mb-4" />
                            <p className="text-neutral-500 text-sm">No messages in this session.</p>
                        </div>
                    ) : (
                        chat.messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-white/10 text-neutral-100 rounded-br-sm'
                                        : 'bg-sky-950/40 border border-sky-500/20 text-sky-50 rounded-bl-sm'
                                }`}>
                                    <div className="flex items-center justify-between gap-4 mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                            {msg.role === 'user' ? 'You' : 'Assistant'}
                                        </span>
                                        <span className="text-[10px] opacity-40">
                                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="whitespace-pre-wrap font-light">{msg.content}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {msg.was_interrupted && (
                                            <span className="text-[10px] text-amber-400 font-medium">⚡ Interrupted</span>
                                        )}
                                        {msg.intent && msg.role === 'user' && (
                                            <span className="text-[10px] text-purple-400">Intent: {msg.intent}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatDetailPage;
