import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getChats } from '../api/chat';
import { AuthContext } from '../context/AuthContext';
import { LogOut, MessageSquare, Mic } from 'lucide-react';

const ChatsListPage = () => {
    const [chats, setChats] = useState([]);
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        getChats().then(setChats).catch(console.error);
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Your Conversations</h1>
                <div className="space-x-4 flex items-center">
                    <Link to="/memories" className="inline-flex items-center space-x-1 text-purple-600 hover:underline">
                        <span>Memories</span>
                    </Link>
                    <Link to="/voice" className="inline-flex items-center space-x-1 text-blue-600 hover:underline">
                        <Mic size={18} /> <span>New Voice Session</span>
                    </Link>
                    <button onClick={logout} className="inline-flex items-center space-x-1 text-red-600 hover:underline">
                        <LogOut size={18} /> <span>Logout</span>
                    </button>
                </div>
            </div>
            
            {chats.length === 0 ? (
                <div className="text-gray-500">No previous sessions found.</div>
            ) : (
                <ul className="space-y-3">
                    {chats.map(chat => (
                        <li key={chat.id} className="border p-4 rounded hover:bg-gray-50">
                            <Link to={`/chats/${chat.id}`} className="flex items-center space-x-3">
                                <MessageSquare className="text-gray-400" />
                                <div>
                                    <div className="font-medium">Session from {new Date(chat.started_at).toLocaleString()}</div>
                                    <div className="text-sm text-gray-500">
                                        {chat.ended_at ? 'Completed' : 'Incomplete'}
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ChatsListPage;
