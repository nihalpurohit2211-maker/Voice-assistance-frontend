import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeechRecognition = ({ onSpeechStart, onFinalResult, onPermissionDenied }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const shouldBeListeningRef = useRef(false);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onspeechstart = () => {
            if (onSpeechStart) onSpeechStart();
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript.trim()) {
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
