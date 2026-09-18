import { useState, useRef, useCallback, useEffect } from 'react';

const FILLER_WORDS = new Set(['uh', 'um', 'hmm', 'ah', 'er', 'mhm', 'huh', 'eh', 'oh']);
const INTERRUPT_KEYWORDS = new Set(['wait', 'stop', 'hold', 'pause', 'quiet', 'shut up']);

export const useSpeechRecognition = ({ onSpeechStart, onFinalResult, onInterimResult, onPermissionDenied }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const shouldBeListeningRef = useRef(false);
    const debounceTimerRef = useRef(null);
    const interruptFiredRef = useRef(false);
    const pauseTimerRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onspeechstart = () => {
            // Do NOT blindly trigger interrupt on raw sound detection.
        };

        recognition.onspeechend = () => {
            // Reset interrupt trigger flag when current speech segment ends
            interruptFiredRef.current = false;
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            const currentText = (interimTranscript + finalTranscript).trim();
            
            if (currentText.length > 0) {
                if (onInterimResult) onInterimResult(currentText);

                // Reset pause timer: if no new speech arrives for 1.2s, speech segment ended
                if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = setTimeout(() => {
                    interruptFiredRef.current = false;
                }, 1200);

                // Word parsing and filler filtering
                const words = currentText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
                const meaningfulWords = words.filter(w => !FILLER_WORDS.has(w));
                const hasInterruptKeyword = words.some(w => INTERRUPT_KEYWORDS.has(w));
                
                // Genuine user speech: requires an explicit keyword ("wait", "stop") OR at least 2 real words
                const isGenuineInterrupt = hasInterruptKeyword || meaningfulWords.length >= 2;

                if (isGenuineInterrupt && !interruptFiredRef.current) {
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }
                    // 250ms debounce to prevent brief noise blips from triggering
                    debounceTimerRef.current = setTimeout(() => {
                        if (!interruptFiredRef.current) {
                            interruptFiredRef.current = true;
                            if (onSpeechStart) onSpeechStart(currentText);
                        }
                    }, 250);
                }
            }

            if (finalTranscript.trim()) {
                interruptFiredRef.current = false;
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
                if (pauseTimerRef.current) {
                    clearTimeout(pauseTimerRef.current);
                    pauseTimerRef.current = null;
                }
                if (onFinalResult) onFinalResult(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
                shouldBeListeningRef.current = false;
                setIsListening(false);
                if (onPermissionDenied) onPermissionDenied();
            }
        };

        recognition.onend = () => {
            if (shouldBeListeningRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    // Ignore start errors on end
                }
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            shouldBeListeningRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onSpeechStart, onFinalResult, onPermissionDenied]);

    const start = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            shouldBeListeningRef.current = true;
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start speech recognition", e);
            }
        }
    }, [isListening]);

    const stop = useCallback(() => {
        shouldBeListeningRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    return {
        start,
        stop,
        isListening
    };
};
