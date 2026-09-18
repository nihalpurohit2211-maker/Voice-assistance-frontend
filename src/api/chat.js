import apiClient from './client';

export const sendChatMessage = async (message, sessionId = null, mode = null) => {
    const res = await apiClient.post('/chat', { message, session_id: sessionId, mode });
    return res.data;
};

export const getChats = async () => {
    const res = await apiClient.get('/chats');
    return res.data;
};

export const getChatById = async (id) => {
    const res = await apiClient.get(`/chats/${id}`);
    return res.data;
};
