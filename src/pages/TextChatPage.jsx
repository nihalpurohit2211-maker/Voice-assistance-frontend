import React, { useState } from 'react';
import { sendChatMessage } from '../api/chat';

const TextChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);
        setError('');

        try {
            const data = await sendChatMessage(userText);
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply, intent: data.intent }]);
        } catch (err) {
            setError('Failed to send message.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 flex flex-col h-screen">
            <h1 className="text-xl font-bold mb-4">Stateless Text Chat (Testing)</h1>
            {error && <div className="text-red-600 bg-red-100 p-2 mb-4">{error}</div>}
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 border p-4 rounded bg-white">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                        <div className="text-xs font-bold mb-1 uppercase">{msg.role}</div>
                        <div>{msg.content}</div>
                        {msg.intent && <div className="text-xs text-purple-600 mt-1">Intent: {msg.intent}</div>}
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
