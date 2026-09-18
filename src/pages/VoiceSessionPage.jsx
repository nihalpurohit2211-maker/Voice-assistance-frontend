import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceSocket } from '../voice/useVoiceSocket';
import { useSpeechRecognition } from '../voice/useSpeechRecognition';
import { audioPlayer } from '../voice/audioPlayer';
import { useAudioAnalyzer } from '../voice/useAudioAnalyzer';
import { ParticleSphere } from '../components/ParticleSphere';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, Settings2, Activity, Square, Headphones, History, X } from 'lucide-react';
import { ModeIndicatorBar } from '../components/ModeIndicatorBar';

export const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5];

export const cleanTextForSpeech = (text) => {
    if (!text) return '';
    return text
        // Remove bracketed intent tags like [casual], [focused], [reflective], [playful], [small_talk], etc.
        .replace(/\[[a-zA-Z0-9_\s-]+\]/g, '')
        // Remove markdown headers
        .replace(/^#+\s+/gm, '')
        // Remove markdown bold/italic syntax **word** or *word* or __word__ or _word_
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        // Remove markdown code blocks and inline code
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        // Remove markdown link syntax [text](url) -> text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove bullet markers and dashes at line start
        .replace(/^[\s*-]+(?=\w)/gm, '')
        // Remove emojis and symbols so SAPI / Web Speech doesn't awkwardly read symbol descriptions aloud
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        // Normalize multiple spaces / linebreaks into a single space
        .replace(/\s+/g, ' ')
        .trim();
};

export const findBestVoice = (voices, preferredVoiceName) => {
    if (!voices || voices.length === 0) return null;
    
    // 1. Explicit user selection
    if (preferredVoiceName) {
        const found = voices.find(v => v.name === preferredVoiceName);
        if (found) return found;
    }

    // 2. High-quality Natural/Neural English voices (Edge / Windows 11 modern online voices)
    const naturalEn = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')) && 
        (v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'))
    );
    if (naturalEn) return naturalEn;

    // 3. Google English voices (Chrome)
    const googleEn = voices.find(v => 
        v.name.includes('Google') && 
        (v.lang.startsWith('en') || v.name.includes('US English') || v.name.includes('UK English'))
    );
    if (googleEn) return googleEn;

    // 4. Modern non-legacy English voices (actively avoid ancient robotic SAPI voices Zira/David Desktop)
    const modernEn = voices.find(v => 
        v.lang.startsWith('en') && 
        !v.name.includes('Desktop') && 
        !v.name.includes('David') && 
        !v.name.includes('Zira') && 
        !v.name.includes('Mark')
    );
    if (modernEn) return modernEn;

    // 5. Any English voice
    const anyEn = voices.find(v => v.lang.startsWith('en'));
    if (anyEn) return anyEn;

    // 6. First available voice fallback
    return voices[0] || null;
};

const VoiceSessionPage = () => {
    const [logs, setLogs] = useState([]);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [useCartesia, setUseCartesia] = useState(false); // default to free browser TTS
    const [transcriptDrawerOpen, setTranscriptDrawerOpen] = useState(false);

    // Audio Visualizer data hook (connects mic and AI audio to ParticleSphere)
    const { getVisualizerData } = useAudioAnalyzer(isSessionActive);

    // Speech Speed State (0.8, 1.0, 1.25, 1.5)
    const [speechSpeed, setSpeechSpeed] = useState(() => {
        const saved = localStorage.getItem('preferredSpeechSpeed');
        const parsed = parseFloat(saved);
        return SPEED_OPTIONS.includes(parsed) ? parsed : 1.0;
    });
    const speechSpeedRef = useRef(speechSpeed);

    useEffect(() => {
        speechSpeedRef.current = speechSpeed;
    }, [speechSpeed]);

    const handleSpeedChange = (newSpeed) => {
        setSpeechSpeed(newSpeed);
        speechSpeedRef.current = newSpeed;
        localStorage.setItem('preferredSpeechSpeed', String(newSpeed));
    };

    // Browser Voices State
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
        return localStorage.getItem('preferredVoiceName') || '';
    });
    const selectedVoiceNameRef = useRef(selectedVoiceName);

    useEffect(() => {
        selectedVoiceNameRef.current = selectedVoiceName;
    }, [selectedVoiceName]);

    const handleVoiceChange = (voiceName) => {
        setSelectedVoiceName(voiceName);
        selectedVoiceNameRef.current = voiceName;
        localStorage.setItem('preferredVoiceName', voiceName);
    };
    
    // Mode State
    const [mode, setMode] = useState('casual');
    const [isLocked, setIsLocked] = useState(false);
    const activeModeRef = useRef('casual');
    const isLockedRef = useRef(false);
    const manualOverrideRef = useRef(false);

    useEffect(() => {
        activeModeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        isLockedRef.current = isLocked;
    }, [isLocked]);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        activeModeRef.current = newMode;
        manualOverrideRef.current = true;
    };

    const handleToggleLock = () => {
        setIsLocked(prev => !prev);
    };

    // AI State: 'idle', 'listening', 'thinking', 'speaking'
    const [aiState, setAiState] = useState('idle');
    const [metrics, setMetrics] = useState({ ttfb: null, intent: null, mode: 'casual' });
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
    const activeUtteranceRef = useRef(null);

    const cancelBrowserTts = useCallback(() => {
        browserTtsQueueRef.current = [];
        isSpeakingBrowserTtsRef.current = false;
        activeUtteranceRef.current = null;
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const playNextBrowserSentence = useCallback(() => {
        if (!window.speechSynthesis || browserTtsQueueRef.current.length === 0) {
            isSpeakingBrowserTtsRef.current = false;
            activeUtteranceRef.current = null;
            return;
        }

        isSpeakingBrowserTtsRef.current = true;
        const rawSentence = browserTtsQueueRef.current.shift();
        const sentenceText = cleanTextForSpeech(rawSentence);

        if (!sentenceText) {
            // If cleaned text was empty (e.g. only markdown tokens or intent tags), move to next
            playNextBrowserSentence();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(sentenceText);
        activeUtteranceRef.current = utterance; // Retain reference to prevent Chrome GC bug

        const voices = window.speechSynthesis.getVoices();
        const voiceToUse = findBestVoice(voices, selectedVoiceNameRef.current);
        if (voiceToUse) {
            utterance.voice = voiceToUse;
        }

        // Apply distinct audible prosody according to active mode
        const currentMode = activeModeRef.current || 'casual';
        let baseRate = 1.0;
        let basePitch = 1.0;

        if (currentMode === 'focused') {
            baseRate = 1.14; // brisk and efficient
            basePitch = 1.0;
        } else if (currentMode === 'reflective') {
            baseRate = 0.88; // slow, calm and gentle
            basePitch = 0.98;
        } else if (currentMode === 'playful') {
            baseRate = 1.06; // energetic and expressive
            basePitch = 1.10;
        } else {
            // casual
            baseRate = 1.0;  // relaxed natural pace
            basePitch = 1.0;
        }

        // Scale by user speed preference (0.8, 1.0, 1.25, 1.5)
        const userSpeed = speechSpeedRef.current || 1.0;
        utterance.rate = Math.min(Math.max(baseRate * userSpeed, 0.5), 2.0);
        utterance.pitch = basePitch;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                spokenTextLengthRef.current = Math.max(spokenTextLengthRef.current, event.charIndex + event.charLength);
            }
        };

        utterance.onend = () => {
            activeUtteranceRef.current = null;
            spokenTextLengthRef.current += sentenceText.length;
            if (browserTtsQueueRef.current.length > 0) {
                // Immediate transition to next sentence - no artificial timeout dead-air!
                playNextBrowserSentence();
            } else {
                isSpeakingBrowserTtsRef.current = false;
                setTimeout(() => setAiState('listening'), 300);
            }
        };

        utterance.onerror = (e) => {
            activeUtteranceRef.current = null;
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('Browser TTS utterance error:', e.error);
            }
            if (browserTtsQueueRef.current.length > 0) {
                playNextBrowserSentence();
            } else {
                isSpeakingBrowserTtsRef.current = false;
            }
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
                const cleaned = cleanTextForSpeech(text);
                if (cleaned) {
                    browserTtsQueueRef.current.push(cleaned);
                    if (!isSpeakingBrowserTtsRef.current) {
                        playNextBrowserSentence();
                    }
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
        onMetrics: (ttfb, intent, backendMode) => {
            setMetrics({ ttfb, intent, mode: backendMode });
            if (!isLockedRef.current && backendMode) {
                setMode(backendMode);
                activeModeRef.current = backendMode;
            }
            if (!isLockedRef.current) {
                manualOverrideRef.current = false;
            }
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
                browserTtsQueueRef.current = sentences.map(s => cleanTextForSpeech(s)).filter(Boolean);
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
            const modeToSend = isLockedRef.current 
                ? activeModeRef.current 
                : (manualOverrideRef.current ? activeModeRef.current : null);
            sendUserTurn(text, useCartesia, modeToSend);
            setAiState('thinking');
            setMetrics(prev => ({ ...prev, ttfb: null, intent: null })); 
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
        setMetrics({ ttfb: null, intent: null, mode: 'casual' });
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
        const loadVoices = () => {
            if (!window.speechSynthesis) return;
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                // Sort: English voices first, Natural/Neural first, then alphabetical
                const sorted = [...voices].sort((a, b) => {
                    const aEn = a.lang.startsWith('en');
                    const bEn = b.lang.startsWith('en');
                    if (aEn && !bEn) return -1;
                    if (!aEn && bEn) return 1;
                    const aNat = a.name.includes('Natural') || a.name.includes('Neural');
                    const bNat = b.name.includes('Natural') || b.name.includes('Neural');
                    if (aNat && !bNat) return -1;
                    if (!aNat && bNat) return 1;
                    return a.name.localeCompare(b.name);
                });
                setAvailableVoices(sorted);
                if (!selectedVoiceNameRef.current) {
                    const best = findBestVoice(sorted, '');
                    if (best) {
                        setSelectedVoiceName(best.name);
                        selectedVoiceNameRef.current = best.name;
                    }
                }
            }
        };

        loadVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
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
        const modeToSend = isLockedRef.current 
            ? activeModeRef.current 
            : (manualOverrideRef.current ? activeModeRef.current : null);
        sendUserTurn(text, useCartesia, modeToSend);
        setAiState('thinking');
        setMetrics(prev => ({ ...prev, ttfb: null, intent: null })); 
    };

    // Latest assistant reply for subtitle display
    const latestAssistantLog = [...logs].reverse().find(l => l.role === 'assistant');
    const latestAssistantText = latestAssistantLog ? latestAssistantLog.text.trim() : '';

    // Color logic
    const getIntentColor = (intent) => {
        switch(intent) {
            case 'emotional': return 'text-rose-400';
            case 'instruction': return 'text-amber-400';
            case 'question': return 'text-purple-400';
            default: return 'text-sky-400';
        }
    };
    const intentColor = metrics.intent ? getIntentColor(metrics.intent) : 'text-neutral-400';

    return (
        <div className="relative h-screen w-screen bg-[#090b10] text-neutral-100 font-sans overflow-hidden flex flex-col justify-between selection:bg-sky-500/30">
            
            {/* Subtle Ambient Radial Vignette behind the sphere */}
            <div 
                className="absolute inset-0 pointer-events-none z-0 opacity-40 transition-opacity duration-1000"
                style={{
                    background: 'radial-gradient(circle at 50% 48%, rgba(30, 41, 59, 0.4) 0%, rgba(9, 11, 16, 0.95) 70%, rgba(9, 11, 16, 1) 100%)'
                }}
            />

            {/* Header: Minimal, floating, unobtrusive */}
            <header className="relative z-30 px-6 py-5 flex justify-between items-center bg-gradient-to-b from-[#090b10]/90 via-[#090b10]/50 to-transparent">
                <Link 
                    to="/chats" 
                    className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-all text-xs font-medium tracking-wider uppercase px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md shadow-xs"
                >
                    <ArrowLeft size={15} /> <span>Exit</span>
                </Link>

                {/* Persistent Mode Indicator Bar with Lock/Unlock */}
                <ModeIndicatorBar 
                    mode={mode} 
                    onModeChange={handleModeChange} 
                    isLocked={isLocked} 
                    onToggleLock={handleToggleLock} 
                />

                <div className="flex items-center space-x-2">
                    {/* Headphones Advisory (subtle pill) */}
                    <div 
                        className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-medium backdrop-blur-md"
                        title="Use headphones for optimal voice recognition and echo cancellation"
                    >
                        <Headphones size={13} className="text-neutral-400" />
                        <span>Headphones recommended</span>
                    </div>

                    {/* Quick Speed Cycle Pill */}
                    <button
                        onClick={() => {
                            const nextIdx = (SPEED_OPTIONS.indexOf(speechSpeed) + 1) % SPEED_OPTIONS.length;
                            handleSpeedChange(SPEED_OPTIONS[nextIdx]);
                        }}
                        title="Speech Speed - click to cycle (0.8x, 1x, 1.25x, 1.5x)"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-medium transition-all shadow-xs cursor-pointer backdrop-blur-md"
                    >
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Speed</span>
                        <span className="font-semibold text-white">{speechSpeed}x</span>
                    </button>

                    {/* Transcript Peek Button */}
                    <button
                        onClick={() => setTranscriptDrawerOpen(!transcriptDrawerOpen)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-medium transition-all shadow-xs cursor-pointer backdrop-blur-md"
                        title="View conversation history"
                    >
                        <History size={13} className="text-neutral-300" />
                        <span className="hidden md:inline">History</span>
                    </button>

                    {errorMsg && (
                        <div className="text-red-400 text-xs font-medium px-2.5 py-1 rounded-full bg-red-950/50 border border-red-800/40">{errorMsg}</div>
                    )}
                </div>
            </header>

            {/* Central Visual Centerpiece: The Audio-Reactive 3D Particle Sphere */}
            <main className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="w-full h-full max-w-5xl max-h-[82vh] relative flex items-center justify-center">
                    <ParticleSphere 
                        mode={mode} 
                        aiState={aiState} 
                        getVisualizerData={getVisualizerData} 
                        useCartesia={useCartesia} 
                    />
                </div>
            </main>

            {/* Lower-Middle: Minimal Floating Subtitles / Live Captions */}
            <div className="relative z-20 px-6 pb-32 flex flex-col items-center justify-end pointer-events-none select-none">
                <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-2">
                    {interimText ? (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <span className="inline-block px-4 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-base md:text-xl font-light text-sky-300 tracking-wide animate-pulse shadow-lg">
                                "{interimText}"
                            </span>
                        </div>
                    ) : latestAssistantText ? (
                        <div className="animate-in fade-in duration-300 max-w-xl">
                            <p className="text-base md:text-lg font-light text-neutral-200/90 leading-relaxed tracking-normal drop-shadow-md line-clamp-3">
                                "{latestAssistantText}"
                            </p>
                        </div>
                    ) : !isSessionActive ? (
                        <div className="text-xs tracking-widest uppercase font-medium text-neutral-400/80 animate-in fade-in duration-500">
                            Tap the microphone to begin session
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 text-xs tracking-widest uppercase font-medium text-neutral-400/80">
                            <span className="w-2 h-2 rounded-full bg-sky-400/80 animate-ping"></span>
                            <span>Listening... speak anytime</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Glassmorphic Bottom Island / Control Bar */}
            <footer className="absolute bottom-7 left-0 right-0 flex justify-center px-4 pointer-events-none z-30">
                <div className="bg-neutral-900/85 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] shadow-[0_16px_50px_rgba(0,0,0,0.7)] pointer-events-auto transition-all duration-500 ease-out flex flex-col overflow-hidden w-full max-w-lg">
                    
                    {/* Collapsible Details Panel */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${detailsOpen && isSessionActive ? 'max-h-[30rem] border-b border-white/10' : 'max-h-0'}`}>
                        <div className="p-5 bg-black/40 flex flex-col justify-around items-center space-y-4">
                            {/* Metrics Row */}
                            <div className="flex w-full justify-around items-center">
                                <div className="text-center">
                                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mb-1">Latency</div>
                                    <div className="text-lg text-white font-light">{metrics.ttfb ? `${metrics.ttfb}s` : '---'}</div>
                                </div>
                                <div className="w-px h-10 bg-white/10"></div>
                                <div className="text-center">
                                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mb-1">Intent</div>
                                    <div className={`text-sm font-medium ${intentColor} capitalize`}>{metrics.intent ? metrics.intent.replace('_', ' ') : '---'}</div>
                                </div>
                                <div className="w-px h-10 bg-white/10"></div>
                                <div className="text-center">
                                    <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold mb-1">Mode</div>
                                    <div className="text-sm font-medium text-white capitalize">{mode} {isLocked ? '(Locked)' : ''}</div>
                                </div>
                            </div>

                            {/* Voice Engine Toggle */}
                            <div className="w-full flex items-center justify-between bg-white/5 border border-white/10 p-1.5 rounded-full">
                                <button 
                                    onClick={() => setUseCartesia(false)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-colors ${!useCartesia ? 'bg-white/15 text-white shadow-xs font-semibold' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Browser Voice (Free)
                                </button>
                                <button 
                                    onClick={() => setUseCartesia(true)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-colors ${useCartesia ? 'bg-white/15 text-white shadow-xs font-semibold' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Cartesia (Premium)
                                </button>
                            </div>

                            {/* Speech Speed Selector */}
                            <div className="w-full flex items-center justify-between px-1">
                                <span className="text-xs text-neutral-400 font-medium">Speed:</span>
                                <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 p-1 rounded-full">
                                    {SPEED_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => handleSpeedChange(s)}
                                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${speechSpeed === s ? 'bg-white/20 text-white font-semibold shadow-xs' : 'text-neutral-400 hover:text-white'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Browser Voice Selector Dropdown */}
                            {!useCartesia && availableVoices.length > 0 && (
                                <div className="w-full flex flex-col space-y-1.5 px-1">
                                    <div className="flex justify-between items-center text-[11px] text-neutral-400 font-medium">
                                        <span className="uppercase tracking-wider">Browser Voice</span>
                                        <span>{availableVoices.length} voices</span>
                                    </div>
                                    <select
                                        value={selectedVoiceName}
                                        onChange={(e) => handleVoiceChange(e.target.value)}
                                        className="w-full bg-neutral-800/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400 truncate"
                                    >
                                        {availableVoices.map((v) => (
                                            <option key={v.name} value={v.name} className="bg-neutral-900 text-white">
                                                {(v.name.includes('Natural') || v.name.includes('Neural')) ? '✨ ' : ''}{v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Bar Controls */}
                    <div className="flex items-center justify-between p-2 pl-4">
                        
                        {/* Status / Toggle Details */}
                        <button 
                            onClick={() => setDetailsOpen(!detailsOpen)}
                            className="flex items-center space-x-2.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
                            disabled={!isSessionActive}
                            title="Toggle Telemetry & Voice Settings"
                        >
                            <Settings2 size={16} className="text-neutral-400" />
                            <div className="flex items-center space-x-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                    aiState === 'speaking' ? 'bg-emerald-400 animate-pulse' :
                                    aiState === 'thinking' ? 'bg-amber-400 animate-ping' :
                                    aiState === 'listening' ? 'bg-sky-400' : 'bg-neutral-500'
                                }`}></span>
                                <span className="text-xs font-medium text-neutral-300 capitalize">
                                    {aiState === 'idle' ? 'Ready' : 
                                     aiState === 'listening' ? 'Listening' :
                                     aiState === 'thinking' ? 'Thinking' : 'Speaking'}
                                </span>
                            </div>
                        </button>

                        {/* Text Input (Visible when active) */}
                        <form onSubmit={handleTextSubmit} className={`flex-1 px-3 transition-all duration-300 ${isSessionActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <input 
                                type="text" 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-400 transition-all"
                                disabled={!isSessionActive}
                            />
                        </form>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            {isSessionActive && !textInput && (
                                <div className="flex space-x-1 px-3 pointer-events-none">
                                    {aiState === 'listening' ? (
                                        <div className="flex items-center h-6 space-x-1">
                                            <div className="w-1 h-2 bg-sky-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1 h-4 bg-sky-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-1 h-2.5 bg-sky-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                    ) : aiState === 'speaking' ? (
                                        <div className="flex items-center h-6 space-x-1">
                                            <div className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                                            <div className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                                            <div className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                    ) : aiState === 'thinking' ? (
                                        <Activity size={18} className="text-amber-400 animate-spin" />
                                    ) : null}
                                </div>
                            )}

                            <button 
                                onClick={isSessionActive ? handleStopSession : handleStartSession}
                                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 ${
                                    isSessionActive 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                                        : 'bg-white text-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:scale-105'
                                }`}
                                title={isSessionActive ? "Stop voice session" : "Start voice session"}
                            >
                                {isSessionActive ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
                            </button>
                        </div>
                    </div>

                </div>
            </footer>

            {/* Slide-Over Conversation History Drawer */}
            {transcriptDrawerOpen && (
                <div 
                    className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setTranscriptDrawerOpen(false)}
                >
                    <div 
                        className="w-full max-w-md bg-neutral-900/95 border-l border-white/10 h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-white/10">
                            <div className="flex items-center space-x-2">
                                <History size={16} className="text-neutral-400" />
                                <h3 className="text-sm font-semibold text-white tracking-wide">Transcript History</h3>
                            </div>
                            <button 
                                onClick={() => setTranscriptDrawerOpen(false)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-xs">
                                    No messages in current session yet.
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`flex flex-col ${log.role === 'user' ? 'items-end' : log.role === 'system' ? 'items-center' : 'items-start'}`}>
                                        {log.role === 'system' ? (
                                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[11px] tracking-wider uppercase font-medium">
                                                {log.text}
                                            </div>
                                        ) : (
                                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-light leading-relaxed ${
                                                log.role === 'user' 
                                                    ? 'bg-white/10 text-neutral-200 rounded-br-none' 
                                                    : 'bg-sky-950/40 border border-sky-500/20 text-sky-100 rounded-bl-none'
                                            }`}>
                                                {log.text}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default VoiceSessionPage;
