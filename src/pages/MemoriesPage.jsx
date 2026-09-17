import React, { useEffect, useState } from 'react';
import { getMemories, deleteMemory } from '../api/memories';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';

const MemoriesPage = () => {
    const [memories, setMemories] = useState([]);
    
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

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
                <Link to="/chats" className="inline-flex items-center space-x-1 text-blue-600 hover:underline">
                    <ArrowLeft size={18} /> <span>Back to Sessions</span>
                </Link>
            </div>
            
            <h1 className="text-xl font-bold mb-6">Your Memories</h1>
            
            <div className="space-y-4">
                {memories.length === 0 ? (
                    <div className="text-gray-500">No memories stored yet. Talk to the assistant to generate some!</div>
                ) : (
                    memories.map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-white p-4 border rounded shadow-sm">
                            <div>
                                <p className="font-medium">{m.text}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700 p-2">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MemoriesPage;
