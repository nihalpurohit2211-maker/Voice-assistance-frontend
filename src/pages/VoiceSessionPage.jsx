import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceSocket } from '../voice/useVoiceSocket';
import { useSpeechRecognition } from '../voice/useSpeechRecognition';
import { audioPlayer } from '../voice/audioPlayer';
import SessionControls from '../components/SessionControls';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const VoiceSessionPage = () => {
    const [logs, setLogs] = useState([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const addLog = useCallback((role, text) => {
        setLogs(prev => [...prev, { role, text }]);
    }, []);

    const appendToLastLog = useCallback((role, text) => {
        setLogs(prev => {
            const newLogs = [...prev];
            if (newLogs.length > 0 && newLogs[newLogs.length - 1].role === role) {
                newLogs[newLogs.length - 1].text += text;
            } else {
                newLogs.push({ role, text });
            }
            return newLogs;
        });
    }, []);

    const { connect, disconnect, connectionStatus, sendUserTurn, sendInterrupt } = useVoiceSocket({
        onReplyChunk: (text, audioBase64) => {
            if (text) appendToLastLog('assistant', text + ' ');
            audioPlayer.enqueueChunk(audioBase64, text ? text.length + 1 : 0);
        },
        onTurnEnd: () => {
            // End of assistant turn
        },
        onError: (err) => {
            setErrorMsg(err);
        }
    });

    const { start: startMic, stop: stopMic, isListening } = useSpeechRecognition({
        onSpeechStart: () => {
            if (audioPlayer.isPlaying) {
                const offset = audioPlayer.stopImmediately();
                sendInterrupt(offset);
                addLog('system', `[Interrupted AI at offset ${offset}]`);
            }
        },
        onFinalResult: (text) => {
            audioPlayer.reset();
            addLog('user', text);
            sendUserTurn(text);
        },
        onPermissionDenied: () => {
            setErrorMsg('Microphone permission denied. Please allow microphone access.');
            handleStopSession();
        }
    });

    const handleStartSession = () => {
        setErrorMsg('');
        setLogs([]);
        audioPlayer.init(); // Must be called here in a user gesture!
        connect();
        setIsSessionActive(true);
    };

    const handleStopSession = () => {
        disconnect();
        stopMic();
        audioPlayer.reset();
        setIsSessionActive(false);
    };

    useEffect(() => {
        if (connectionStatus === 'connected' && isSessionActive) {
            startMic();
        } else if (connectionStatus === 'disconnected' && isSessionActive) {
            stopMic();
            setIsSessionActive(false);
        }
    }, [connectionStatus, isSessionActive, startMic, stopMic]);

    useEffect(() => {
        return () => {
            handleStopSession();
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4 flex flex-col h-screen">
            <div className="flex justify-between items-center mb-4">
                <Link to="/chats" className="inline-flex items-center space-x-1 text-blue-600 hover:underline">
                    <ArrowLeft size={18} /> <span>Chat History</span>
                </Link>
                <h1 className="text-xl font-bold">Voice Session</h1>
            </div>

            {errorMsg && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{errorMsg}</div>}

            <SessionControls 
                onStart={handleStartSession} 
                onStop={handleStopSession} 
                isSessionActive={isSessionActive}
                connectionStatus={connectionStatus}
                isListening={isListening}
            />

            <div className="flex-1 mt-6 border rounded bg-white p-4 overflow-y-auto space-y-3">
                {logs.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">Start a session and speak to see the live transcript.</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`p-3 rounded max-w-[80%] ${log.role === 'user' ? 'bg-blue-100 ml-auto' : log.role === 'system' ? 'bg-yellow-100 mx-auto text-center text-sm' : 'bg-gray-100'}`}>
                        <div className="text-xs font-bold uppercase mb-1">{log.role}</div>
                        <div className="whitespace-pre-wrap">{log.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VoiceSessionPage;
