import apiClient from './client';

export const getMemories = async () => {
    const res = await apiClient.get('/memories');
    return res.data;
};

export const deleteMemory = async (id) => {
    const res = await apiClient.delete(`/memories/${id}`);
    return res.data;
};
