import { useState, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useVoiceSocket = ({ onReplyChunk, onTurnEnd, onError, onMetrics }) => {
    const { token } = useContext(AuthContext);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const wsRef = useRef(null);
    const turnInProgressRef = useRef(false);

    const connect = useCallback(() => {
        if (!token) {
            onError('No token found');
            return;
        }
        
        setConnectionStatus('connecting');
        const wsBase = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
        const wsUrl = `${wsBase}/ws/voice?token=${token}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            setConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'reply_chunk') {
                    onReplyChunk(msg.text, msg.audio);
                } else if (msg.type === 'turn_end') {
                    turnInProgressRef.current = false;
                    onTurnEnd();
                } else if (msg.type === 'metrics') {
                    if (onMetrics) onMetrics(msg.ttfb, msg.intent, msg.mode);
                } else if (msg.type === 'error') {
                    onError(msg.message);
                }
            } catch (err) {
                console.error("Failed to parse websocket message", err);
            }
        };
        
        ws.onclose = () => {
            setConnectionStatus('disconnected');
            turnInProgressRef.current = false;
        };
        
        ws.onerror = () => {
            setConnectionStatus('disconnected');
            onError('WebSocket connection error');
            turnInProgressRef.current = false;
        };
        
        wsRef.current = ws;
    }, [token, onReplyChunk, onTurnEnd, onError, onMetrics]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const sendUserTurn = useCallback((text, use_cartesia = true, mode = null, guidance_mode = null) => {
        if (connectionStatus !== 'connected' || !wsRef.current) {
            onError('Socket not connected');
            return;
        }
        if (turnInProgressRef.current) {
            console.warn('Turn already in progress');
            return;
        }
        
        turnInProgressRef.current = true;
        wsRef.current.send(JSON.stringify({ type: 'user_turn', text, use_cartesia, mode, guidance_mode }));
    }, [connectionStatus, onError]);

    const sendInterrupt = useCallback((spokenOffset) => {
        if (connectionStatus === 'connected' && wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt', spoken_offset: spokenOffset }));
            turnInProgressRef.current = false;
        }
    }, [connectionStatus]);

    const sendReplayTurn = useCallback((text, use_cartesia = true, mode = null) => {
        if (connectionStatus !== 'connected' || !wsRef.current) {
            onError('Socket not connected');
            return;
        }
        turnInProgressRef.current = true;
        wsRef.current.send(JSON.stringify({ type: 'replay_turn', text, use_cartesia, mode }));
    }, [connectionStatus, onError]);

    return {
        connect,
        disconnect,
        connectionStatus,
        sendUserTurn,
        sendInterrupt,
        sendReplayTurn
    };
};
