import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChatById } from '../api/chat';
import { ArrowLeft } from 'lucide-react';

const ChatDetailPage = () => {
    const { id } = useParams();
    const [chat, setChat] = useState(null);

    useEffect(() => {
        getChatById(id).then(setChat).catch(console.error);
    }, [id]);

    if (!chat) return <div className="p-4">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
                <Link to="/chats" className="inline-flex items-center space-x-1 text-blue-600 hover:underline">
                    <ArrowLeft size={18} /> <span>Back to Sessions</span>
                </Link>
            </div>
            
            <h1 className="text-xl font-bold mb-6">
                Session Transcript ({new Date(chat.started_at).toLocaleString()})
            </h1>
            
            <div className="space-y-4">
                {chat.messages.map((msg, idx) => (
                    <div key={idx} className={`p-4 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100 mr-auto'}`}>
                        <div className="text-xs text-gray-500 mb-1 flex justify-between">
                            <span className="font-bold uppercase">{msg.role}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.was_interrupted && (
                            <div className="text-xs text-red-500 mt-2 font-semibold flex items-center">
                                (Interrupted)
                            </div>
                        )}
                        {msg.intent && msg.role === 'user' && (
                            <div className="text-xs text-purple-600 mt-1">Intent: {msg.intent}</div>
                        )}
                    </div>
                ))}
                {chat.messages.length === 0 && <div className="text-gray-500 text-center">No messages in this session.</div>}
            </div>
        </div>
    );
};

export default ChatDetailPage;
