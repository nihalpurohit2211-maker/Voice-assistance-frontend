import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceSocket } from '../voice/useVoiceSocket';
import { useSpeechRecognition } from '../voice/useSpeechRecognition';
import { audioPlayer } from '../voice/audioPlayer';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Settings2, Activity, Square, Play, Waves } from 'lucide-react';

const VoiceSessionPage = () => {
    const [logs, setLogs] = useState([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [useCartesia, setUseCartesia] = useState(false); // default to free browser TTS
    
    // AI State: 'idle', 'listening', 'thinking', 'speaking'
    const [aiState, setAiState] = useState('idle');
    const [metrics, setMetrics] = useState({ ttfb: null, intent: null });
    const [textInput, setTextInput] = useState('');
    const logsEndRef = useRef(null);

    const [interimText, setInterimText] = useState('');

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

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs, interimText]);

    const spokenTextLengthRef = useRef(0);
    const currentTurnReplyRef = useRef('');
    const lastFullReplyRef = useRef('');
    const wasWaitInterruptedRef = useRef(false);
    const hasInterruptedCurrentTurnRef = useRef(false);

    // Micro-pause sentence queue for browser TTS
    const browserTtsQueueRef = useRef([]);
    const isSpeakingBrowserTtsRef = useRef(false);
    const pauseTimeoutRef = useRef(null);

    const cancelBrowserTts = useCallback(() => {
        browserTtsQueueRef.current = [];
        isSpeakingBrowserTtsRef.current = false;
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }
        window.speechSynthesis.cancel();
    }, []);

    const playNextBrowserSentence = useCallback(() => {
        if (browserTtsQueueRef.current.length === 0) {
            isSpeakingBrowserTtsRef.current = false;
            return;
        }

        isSpeakingBrowserTtsRef.current = true;
        const sentenceText = browserTtsQueueRef.current.shift();

        const utterance = new SpeechSynthesisUtterance(sentenceText);
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google US') || v.name.includes('Zira')) 
                       || voices.find(v => v.lang.startsWith('en-US')) 
                       || voices[0];
        if (preferred) utterance.voice = preferred;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                spokenTextLengthRef.current = Math.max(spokenTextLengthRef.current, event.charIndex + event.charLength);
            }
        };

        utterance.onend = () => {
            spokenTextLengthRef.current += sentenceText.length;
            if (browserTtsQueueRef.current.length > 0) {
                // 150ms natural conversational micro-pause between sentences
                pauseTimeoutRef.current = setTimeout(() => {
                    playNextBrowserSentence();
                }, 150);
            } else {
                isSpeakingBrowserTtsRef.current = false;
                setTimeout(() => setAiState('listening'), 400);
            }
        };

        utterance.onerror = () => {
            isSpeakingBrowserTtsRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
    }, []);

    const { connect, disconnect, connectionStatus, sendUserTurn, sendInterrupt, sendReplayTurn } = useVoiceSocket({
        onReplyChunk: (text, audioBase64) => {
            setAiState('speaking');
            hasInterruptedCurrentTurnRef.current = false;
            if (text) {
                currentTurnReplyRef.current += text + ' ';
                appendToLastLog('assistant', text + ' ');
            }
            
            if (audioBase64) {
                const isSentenceEnd = Boolean(text && /[.?!]\s*$/.test(text.trim()));
                audioPlayer.enqueueChunk(audioBase64, text ? text.length + 1 : 0, isSentenceEnd);
            } else if (text && !useCartesia) {
                // Queue sentence and play with 150ms natural pause between full sentences
                browserTtsQueueRef.current.push(text);
                if (!isSpeakingBrowserTtsRef.current) {
                    playNextBrowserSentence();
                }
            }
        },
        onTurnEnd: () => {
            audioPlayer.flush();
            hasInterruptedCurrentTurnRef.current = false;
            if (useCartesia) {
                setTimeout(() => setAiState('listening'), 500);
            }
        },
        onMetrics: (ttfb, intent) => {
            setMetrics({ ttfb, intent });
        },
        onError: (err) => {
            setErrorMsg(err);
            setAiState('idle');
        }
    });

    const checkAndExecuteContinue = (userText) => {
        const norm = userText.toLowerCase().trim();
        const isContinue = norm === 'continue' || 
                           norm.startsWith('continue') || 
                           norm.includes('what were we talking about') || 
                           norm.includes('carry on') || 
                           norm.includes('go on');
        
        if (wasWaitInterruptedRef.current && lastFullReplyRef.current && isContinue) {
            wasWaitInterruptedRef.current = false;
            hasInterruptedCurrentTurnRef.current = false;
            const textToReplay = lastFullReplyRef.current;
            addLog('user', userText);
            addLog('assistant', textToReplay);
            setAiState('speaking');
            spokenTextLengthRef.current = 0;
            currentTurnReplyRef.current = textToReplay + ' ';
            
            if (!useCartesia) {
                cancelBrowserTts();
                const sentences = textToReplay.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [textToReplay];
                browserTtsQueueRef.current = sentences.map(s => s.trim()).filter(Boolean);
                playNextBrowserSentence();
            } else {
                sendReplayTurn(textToReplay, true);
            }
            return true;
        }
        return false;
    };

    const { start: startMic, stop: stopMic, isListening } = useSpeechRecognition({
        onSpeechStart: (text) => {
            // Suppress repeated barge-in triggers during the same utterance or speaking turn
            if (hasInterruptedCurrentTurnRef.current) {
                return;
            }
            hasInterruptedCurrentTurnRef.current = true;

            const isWait = text.toLowerCase().includes('wait');
            if (aiState === 'speaking' && isWait) {
                wasWaitInterruptedRef.current = true;
                lastFullReplyRef.current = currentTurnReplyRef.current.trim();
                console.log("[Barge-in] Stored lastFullReply for 'wait' interrupt:", lastFullReplyRef.current);
            }
            
            cancelBrowserTts();
            if (audioPlayer.isPlaying) {
                const offset = audioPlayer.stopImmediately();
                sendInterrupt(offset);
                addLog('system', `[Barge-in: "${text}"]`);
            } else if (!useCartesia && aiState === 'speaking') {
                const offset = spokenTextLengthRef.current;
                sendInterrupt(offset);
                addLog('system', `[Barge-in: "${text}"]`);
            }
            setAiState('listening');
        },
        onInterimResult: (text) => {
            setInterimText(text);
        },
        onFinalResult: (text) => {
            setInterimText('');
            audioPlayer.reset();
            spokenTextLengthRef.current = 0;
            hasInterruptedCurrentTurnRef.current = false;
            cancelBrowserTts();
            
            if (checkAndExecuteContinue(text)) {
                return;
            }
            
            wasWaitInterruptedRef.current = false;
            currentTurnReplyRef.current = '';
            addLog('user', text);
            sendUserTurn(text, useCartesia);
            setAiState('thinking');
            setMetrics({ ttfb: null, intent: null }); 
        },
        onPermissionDenied: () => {
            setErrorMsg('Microphone permission denied.');
            handleStopSession();
        }
    });

    const handleStartSession = () => {
        setErrorMsg('');
        setLogs([]);
        audioPlayer.init();
        connect();
        setIsSessionActive(true);
        setAiState('listening');
    };

    const handleStopSession = () => {
        disconnect();
        stopMic();
        audioPlayer.reset();
        setIsSessionActive(false);
        setAiState('idle');
        setMetrics({ ttfb: null, intent: null });
    };

    useEffect(() => {
        if (connectionStatus === 'connected' && isSessionActive && aiState !== 'thinking') {
            startMic();
        } else if (aiState === 'thinking') {
            stopMic();
        } else if (connectionStatus === 'disconnected' && isSessionActive) {
            stopMic();
            setIsSessionActive(false);
            setAiState('idle');
        }
    }, [connectionStatus, isSessionActive, startMic, stopMic, aiState]);

    useEffect(() => {
        return () => handleStopSession();
    }, []);

    useEffect(() => {
        // Preload voices to ensure they are available when needed
        const loadVoices = () => window.speechSynthesis.getVoices();
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim() || !isSessionActive) return;
        
        audioPlayer.reset();
        spokenTextLengthRef.current = 0;
        cancelBrowserTts();
        
        const text = textInput.trim();
        setTextInput('');

        if (checkAndExecuteContinue(text)) {
            return;
        }

        wasWaitInterruptedRef.current = false;
        currentTurnReplyRef.current = '';
        addLog('user', text);
        sendUserTurn(text, useCartesia);
        setAiState('thinking');
        setMetrics({ ttfb: null, intent: null }); 
    };

    // Color logic
    const getIntentColor = (intent) => {
        switch(intent) {
            case 'emotional': return 'text-rose-500';
            case 'instruction': return 'text-amber-500';
            case 'question': return 'text-purple-500';
            default: return 'text-blue-500';
        }
    };
    const intentColor = metrics.intent ? getIntentColor(metrics.intent) : 'text-neutral-900';

    return (
        <div className="flex h-screen bg-white text-neutral-900 font-sans overflow-hidden">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-white to-transparent">
                <Link to="/chats" className="flex items-center space-x-2 text-neutral-400 hover:text-neutral-900 transition-colors">
                    <ArrowLeft size={20} /> <span>Exit</span>
                </Link>
                {errorMsg && (
                    <div className="text-red-500 text-sm font-medium">{errorMsg}</div>
                )}
            </div>

            {/* Main Chat Canvas */}
            <div className="flex-1 overflow-y-auto px-6 pb-56 pt-24 max-w-4xl mx-auto w-full">
                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-300">
                        <Waves size={48} className="mb-4 opacity-50" />
                        <p className="font-light tracking-wide">Start a session below to begin.</p>
                    </div>
                )}
                
                <div className="space-y-8">
                    {logs.map((log, i) => (
                        <div key={i} className={`flex flex-col ${log.role === 'user' ? 'items-end' : log.role === 'system' ? 'items-center' : 'items-start'}`}>
                            {log.role === 'system' ? (
                                <div className="px-4 py-1 rounded-full bg-neutral-100 text-neutral-400 text-xs tracking-wider uppercase font-medium">
                                    {log.text}
                                </div>
                            ) : (
                                <div className={`max-w-[85%] text-xl md:text-2xl font-light leading-relaxed tracking-tight ${log.role === 'user' ? 'text-neutral-400 text-right' : 'text-neutral-900'}`}>
                                    {log.text}
                                </div>
                            )}
                        </div>
                    ))}
                    {interimText && (
                        <div className="flex flex-col items-end opacity-60">
                            <div className="max-w-[85%] text-xl md:text-2xl font-light leading-relaxed tracking-tight text-neutral-400 text-right animate-pulse">
                                {interimText}
                            </div>
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Dynamic Island / Bottom Control Bar */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center px-4 pointer-events-none z-20">
                <div className="bg-white/80 backdrop-blur-xl border border-neutral-200 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] pointer-events-auto transition-all duration-500 ease-out flex flex-col overflow-hidden w-full max-w-lg">
                    
                    {/* Collapsible Details Panel (slides down from inside the pill when opened) */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${detailsOpen && isSessionActive ? 'max-h-48 border-b border-neutral-100' : 'max-h-0'}`}>
                        <div className="p-6 bg-neutral-50/50 flex flex-col justify-around items-center space-y-4">
                            <div className="flex w-full justify-around items-center">
                                <div className="text-center">
                                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mb-1">Latency</div>
                                    <div className="text-lg text-neutral-800 font-light">{metrics.ttfb ? `${metrics.ttfb}s` : '---'}</div>
                                </div>
                                <div className="w-px h-10 bg-neutral-200"></div>
                                <div className="text-center">
                                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mb-1">Intent</div>
                                    <div className={`text-sm font-medium ${intentColor} capitalize`}>{metrics.intent ? metrics.intent.replace('_', ' ') : '---'}</div>
                                </div>
                            </div>
                            <div className="w-full flex items-center justify-between bg-neutral-100 p-2 rounded-full">
                                <button 
                                    onClick={() => setUseCartesia(false)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-colors ${!useCartesia ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    Browser Voice (Free)
                                </button>
                                <button 
                                    onClick={() => setUseCartesia(true)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-colors ${useCartesia ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    Cartesia (Premium)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Pill Controls */}
                    <div className="flex items-center justify-between p-2 pl-4">
                        
                        {/* Status / Toggle Details */}
                        <button 
                            onClick={() => setDetailsOpen(!detailsOpen)}
                            className="flex items-center space-x-3 hover:bg-neutral-100 p-3 rounded-full transition-colors"
                            disabled={!isSessionActive}
                        >
                            <Settings2 size={18} className="text-neutral-400" />
                            <span className={`text-sm font-medium ${isSessionActive ? intentColor : 'text-neutral-400'}`}>
                                {aiState === 'idle' ? 'Ready' : 
                                 aiState === 'listening' ? 'Listening...' :
                                 aiState === 'thinking' ? 'Thinking...' : 'Speaking'}
                            </span>
                        </button>

                        {/* Text Input (Visible when active) */}
                        <form onSubmit={handleTextSubmit} className={`flex-1 px-4 transition-all duration-300 ${isSessionActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <input 
                                type="text" 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-transparent border-none outline-none text-sm text-neutral-700 placeholder-neutral-400 focus:ring-0"
                                disabled={!isSessionActive}
                            />
                        </form>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            {isSessionActive && !textInput && (
                                <div className="flex space-x-1 px-4 pointer-events-none">
                                    {aiState === 'listening' ? (
                                        <div className="flex items-center h-8 space-x-1">
                                            <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                    ) : aiState === 'speaking' ? (
                                        <div className="flex items-center h-8 space-x-1">
                                            <div className="w-1.5 h-5 bg-neutral-900 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1.5 h-8 bg-neutral-900 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                                            <div className="w-1.5 h-4 bg-neutral-900 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                                            <div className="w-1.5 h-6 bg-neutral-900 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                    ) : aiState === 'thinking' ? (
                                        <Activity size={20} className="text-neutral-400 animate-spin" />
                                    ) : null}
                                </div>
                            )}

                            <button 
                                onClick={isSessionActive ? handleStopSession : handleStartSession}
                                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isSessionActive ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-neutral-900 text-white shadow-lg hover:scale-105'}`}
                            >
                                {isSessionActive ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Ambient Background Glow (Subtle) */}
            {aiState === 'speaking' && (
                <div className={`fixed inset-0 opacity-5 pointer-events-none transition-opacity duration-1000 ${intentColor.replace('text-', 'bg-')}`}></div>
            )}
        </div>
    );
};

export default VoiceSessionPage;
