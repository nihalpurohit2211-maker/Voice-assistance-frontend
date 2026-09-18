import React, { useState, useRef } from 'react';
import { sendChatMessage } from '../api/chat';
import { ModeIndicatorBar } from '../components/ModeIndicatorBar';

const TextChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [mode, setMode] = useState('casual');
    const [isLocked, setIsLocked] = useState(false);
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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);
        setError('');

        const modeToSend = isLocked ? mode : (manualOverrideRef.current ? mode : null);

        try {
            const data = await sendChatMessage(userText, sessionId, modeToSend);
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
        <div className="max-w-3xl mx-auto p-4 flex flex-col h-screen">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-bold">Text Chat</h1>
                    <ModeIndicatorBar 
                        mode={mode} 
                        onModeChange={handleModeChange} 
                        isLocked={isLocked} 
                        onToggleLock={handleToggleLock} 
                    />
                </div>
                <button 
                    onClick={handleNewSession}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                >
                    New Session
                </button>
            </div>
            {error && <div className="text-red-600 bg-red-100 p-2 mb-4">{error}</div>}
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 border p-4 rounded bg-white">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                        <div className="text-xs font-bold mb-1 uppercase">{msg.role}</div>
                        <div>{msg.content}</div>
                        <div className="flex items-center gap-2 mt-1">
                            {msg.intent && <span className="text-xs text-purple-600">Intent: {msg.intent}</span>}
                            {msg.mode && <span className="text-xs text-blue-600 capitalize">Mode: {msg.mode}</span>}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="text-gray-500 text-sm">Assistant is typing...</div>}
            </div>
            
            <form onSubmit={handleSend} className="flex gap-2">
                <input 
                    type="text" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    className="flex-1 border rounded p-2"
                    placeholder="Type a message..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Send
                </button>
            </form>
        </div>
    );
};

export default TextChatPage;
