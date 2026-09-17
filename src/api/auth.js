import apiClient from './client';

export const register = async (email, password) => {
    const res = await apiClient.post('/auth/register', { email, password });
    return res.data;
};

export const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
};

export const getMe = async () => {
    const res = await apiClient.get('/me');
    return res.data;
};
