import React from 'react';
import { Mic, Square, Loader } from 'lucide-react';

const SessionControls = ({ onStart, onStop, isSessionActive, connectionStatus, isListening }) => {
    return (
        <div className="flex flex-col items-center p-4 border rounded bg-white shadow-sm">
            <div className="mb-4 text-sm text-gray-500 text-center">
                <p>Note: Please use headphones to prevent the microphone from picking up the AI's voice (feedback loop).</p>
            </div>
            
            <div className="mb-4 text-sm font-medium">
                Status: 
                <span className={`ml-2 ${connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-600'}`}>
                    {connectionStatus}
                </span>
                {isSessionActive && (
                    <span className="ml-2 text-blue-600">
                        {isListening ? '| Listening...' : '| Waiting...'}
                    </span>
                )}
            </div>

            {!isSessionActive ? (
                <button 
                    onClick={onStart} 
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition"
                >
                    <Mic size={20} />
                    <span>Start Session</span>
                </button>
            ) : (
                <button 
                    onClick={onStop} 
                    className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition"
                >
                    <Square size={20} />
                    <span>End Session</span>
                </button>
            )}
        </div>
    );
};

export default SessionControls;
