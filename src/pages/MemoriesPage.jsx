import React, { useEffect, useState } from 'react';
import { getMemories, deleteMemory } from '../api/memories';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Brain } from 'lucide-react';
import { exportMemoriesToObsidian } from '../utils/obsidianExport';

const MemoriesPage = () => {
    const [memories, setMemories] = useState([]);
    const [exportFlash, setExportFlash] = useState(false);
    
    const fetchMemories = () => {
        getMemories().then(setMemories).catch(console.error);
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    const handleDelete = async (id) => {
        try {
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
                            <Brain size={18} className="text-purple-400" />
                            <h1 className="text-lg font-semibold tracking-wide text-white">Your Memories</h1>
                            {memories.length > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400">
                                    {memories.length}
                                </span>
                            )}
                        </div>
                    </div>
                    {memories.length > 0 && (
                        <button
                            onClick={handleExport}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${
                                exportFlash
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                    : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                            }`}
                            title="Download all memories as a Markdown file for Obsidian"
                        >
                            <Download size={13} />
                            <span>{exportFlash ? 'Downloading…' : 'Export to Obsidian'}</span>
                        </button>
                    )}
                </div>

                {/* Memory List */}
                <div className="space-y-3">
                    {memories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Brain size={32} className="text-neutral-700 mb-4" />
                            <p className="text-neutral-500 text-sm">No memories stored yet.</p>
                            <p className="text-neutral-600 text-xs mt-1">Talk to the assistant to generate some!</p>
                        </div>
                    ) : (
                        memories.map((m) => (
                            <div
                                key={m.id}
                                className="group flex justify-between items-start bg-neutral-900/60 border border-white/8 rounded-2xl p-4 backdrop-blur-sm hover:border-white/15 transition-all"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-sm text-neutral-200 leading-relaxed">{m.text}</p>
                                    <p className="text-[11px] text-neutral-500 mt-2">
                                        {new Date(m.created_at).toLocaleString('en-US', {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(m.id)}
                                    className="flex-shrink-0 p-2 rounded-full text-neutral-600 hover:text-red-400 hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete memory"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemoriesPage;
