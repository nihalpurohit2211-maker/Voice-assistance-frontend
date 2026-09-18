import React, { useState, useRef } from 'react';
import { sendChatMessage } from '../api/chat';
import { UnifiedModeSelector } from '../components/UnifiedModeSelector';

const TextChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [mode, setMode] = useState('casual');
    const [isLocked, setIsLocked] = useState(false);
    const [guidanceMode, setGuidanceMode] = useState(() => {
        return localStorage.getItem('preferredGuidanceMode') || 'none';
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const manualOverrideRef = useRef(false);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        manualOverrideRef.current = true;
    };

    const handleToggleLock = () => {
        setIsLocked(prev => !prev);
    };

    const handleGuidanceModeChange = (newGuidanceMode) => {
        setGuidanceMode(newGuidanceMode);
        localStorage.setItem('preferredGuidanceMode', newGuidanceMode);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);
        setError('');

        const modeToSend = isLocked ? mode : (manualOverrideRef.current ? mode : null);
        const guidanceModeToSend = guidanceMode !== 'none' ? guidanceMode : null;

        try {
            const data = await sendChatMessage(userText, sessionId, modeToSend, guidanceModeToSend);
            if (data.session_id) {
                setSessionId(data.session_id);
            }
            if (!isLocked && data.mode) {
                setMode(data.mode);
                manualOverrideRef.current = false;
            }
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.reply, 
                intent: data.intent,
                mode: data.mode 
            }]);
        } catch (err) {
            setError('Failed to send message.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewSession = () => {
        setSessionId(null);
        setMessages([]);
        setError('');
    };

    return (
        <div className="min-h-screen text-[var(--text-primary)] flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
            <div className="max-w-3xl w-full mx-auto p-4 flex flex-col flex-1 h-screen">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                        <h1 className="text-xl font-bold text-white">Text Chat</h1>
                        <UnifiedModeSelector 
                            mode={mode} 
                            onModeChange={handleModeChange} 
                            isLocked={isLocked} 
                            onToggleLock={handleToggleLock} 
                            guidanceMode={guidanceMode}
                            onGuidanceModeChange={handleGuidanceModeChange}
                        />
                    </div>
                    <button 
                        onClick={handleNewSession}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border"
                        style={{ 
                            backgroundColor: 'var(--bg-surface)', 
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        New Session
                    </button>
                </div>

                {/* Guidance mode disclaimer */}
                {guidanceMode && guidanceMode !== 'none' && (
                    <div className="mb-3 px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5" style={{ backgroundColor: 'rgba(212, 83, 107, 0.12)', borderColor: 'rgba(212, 83, 107, 0.3)', color: 'var(--mode-guidance)' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--mode-guidance)' }}></span>
                        <span>General wellness info — not professional advice</span>
                    </div>
                )}

                {error && <div className="p-2.5 mb-4 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{error}</div>}
                
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`p-3 max-w-[80%] ${msg.role === 'user' ? 'ml-auto text-white' : 'text-neutral-200'}`} style={{ backgroundColor: msg.role === 'user' ? 'var(--mode-casual)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)' }}>
                            <div className="text-[10px] font-bold mb-1 uppercase opacity-70">{msg.role}</div>
                            <div className="text-sm leading-relaxed">{msg.content}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                                {msg.intent && <span className="text-[10px] opacity-80" style={{ color: 'var(--mode-reflective)' }}>Intent: {msg.intent}</span>}
                                {msg.mode && <span className="text-[10px] capitalize opacity-80" style={{ color: 'var(--mode-casual)' }}>Mode: {msg.mode}</span>}
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Assistant is typing...</div>}
                </div>
                
                <form onSubmit={handleSend} className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        className="flex-1 border p-2.5 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                        placeholder="Type a message..."
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: 'var(--mode-casual)', borderRadius: 'var(--radius-md)' }}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TextChatPage;
