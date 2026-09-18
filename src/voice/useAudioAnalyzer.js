import { useEffect, useRef, useCallback } from 'react';
import { audioPlayer } from './audioPlayer';

/**
 * Hook for capturing real-time audio frequency data from:
 * 1. User microphone (via Web Audio AnalyserNode)
 * 2. AI output audio (via audioPlayer's AnalyserNode for Cartesia or synthetic prosody wave for browser TTS)
 */
export const useAudioAnalyzer = (isSessionActive) => {
    const micContextRef = useRef(null);
    const micAnalyserRef = useRef(null);
    const micStreamRef = useRef(null);
    const micDataArrayRef = useRef(null);

    // Synthetic browser speech wave state
    const synthPhaseRef = useRef(0);

    // Initialize microphone audio stream & analyser
    useEffect(() => {
        if (!isSessionActive) {
            // Clean up microphone stream if session ends
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop());
                micStreamRef.current = null;
            }
            if (micContextRef.current && micContextRef.current.state !== 'closed') {
                micContextRef.current.close().catch(() => {});
                micContextRef.current = null;
            }
            micAnalyserRef.current = null;
            return;
        }

        let isCancelled = false;

        const initMicStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: true, 
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                micStreamRef.current = stream;
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const context = new AudioContext();
                micContextRef.current = context;

                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.75;
                source.connect(analyser);

                micAnalyserRef.current = analyser;
                micDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
            } catch (err) {
                console.warn('[AudioAnalyzer] Could not initialize mic analyzer stream:', err);
            }
        };

        initMicStream();

        return () => {
            isCancelled = true;
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop());
                micStreamRef.current = null;
            }
            if (micContextRef.current && micContextRef.current.state !== 'closed') {
                micContextRef.current.close().catch(() => {});
                micContextRef.current = null;
            }
        };
    }, [isSessionActive]);

    /**
     * Called by the 60fps render loop inside ParticleSphere.
     * Returns real-time normalized audio features:
     * - source: 'user' | 'ai' | 'thinking' | 'idle'
     * - volume: 0.0 to 1.0
     * - bass, mid, treble: 0.0 to 1.0
     * - rawData: Uint8Array of 128 frequency bins (if available)
     */
    const getVisualizerData = useCallback((aiState, useCartesia = false) => {
        // 1. When AI is speaking
        if (aiState === 'speaking') {
            if (useCartesia) {
                const aiData = audioPlayer.getAudioData();
                if (aiData.volume > 0.01) {
                    return {
                        source: 'ai',
                        volume: aiData.volume,
                        bass: aiData.bass,
                        mid: aiData.mid,
                        treble: aiData.treble,
                        rawData: aiData.frequencyData
                    };
                }
            }

            // Browser TTS or audio fallback: Organic synthetic vocal ripple wave
            synthPhaseRef.current += 0.07;
            const p = synthPhaseRef.current;
            // Harmonic wave mirroring vocal formants
            const v1 = Math.sin(p * 1.8);
            const v2 = Math.sin(p * 3.5);
            const v3 = Math.cos(p * 5.1);
            const baseVol = 0.35 + 0.25 * (v1 * 0.5 + v2 * 0.3 + v3 * 0.2);

            return {
                source: 'ai',
                volume: Math.max(0.1, baseVol),
                bass: Math.abs(v1) * 0.6 + 0.2,
                mid: Math.abs(v2) * 0.7 + 0.3,
                treble: Math.abs(v3) * 0.5 + 0.2,
                rawData: null
            };
        }

        // 2. When AI is thinking (rhythmic cognitive pulse)
        if (aiState === 'thinking') {
            synthPhaseRef.current += 0.04;
            const pulse = (Math.sin(synthPhaseRef.current * 2.0) + 1.0) * 0.5;
            return {
                source: 'thinking',
                volume: 0.15 + pulse * 0.2,
                bass: 0.2 + pulse * 0.25,
                mid: 0.15 + pulse * 0.2,
                treble: 0.1,
                rawData: null
            };
        }

        // 3. When AI is listening -> Analyze live user microphone input!
        if (aiState === 'listening' && micAnalyserRef.current && micDataArrayRef.current) {
            const analyser = micAnalyserRef.current;
            const dataArray = micDataArrayRef.current;
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            let bassSum = 0;
            let midSum = 0;
            let trebleSum = 0;
            const len = dataArray.length;

            for (let i = 0; i < len; i++) {
                const val = dataArray[i];
                sum += val;
                if (i < 16) bassSum += val;
                else if (i < 64) midSum += val;
                else trebleSum += val;
            }

            const rawVolume = (sum / len) / 255;
            // Noise floor gate
            const volume = rawVolume > 0.03 ? rawVolume * 1.5 : 0;
            const bass = (bassSum / 16) / 255;
            const mid = (midSum / 48) / 255;
            const treble = (trebleSum / 64) / 255;

            return {
                source: volume > 0.03 ? 'user' : 'idle',
                volume: Math.min(volume, 1.0),
                bass: Math.min(bass * 1.4, 1.0),
                mid: Math.min(mid * 1.5, 1.0),
                treble: Math.min(treble * 1.3, 1.0),
                rawData: dataArray
            };
        }

        // 4. Default Idle state (gentle resting breath)
        return {
            source: 'idle',
            volume: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            rawData: null
        };
    }, []);

    return { getVisualizerData };
};
