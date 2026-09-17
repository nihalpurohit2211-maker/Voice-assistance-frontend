import axios from 'axios';

export const createApiClient = () => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    });

    instance.interceptors.request.use(config => {
        const token = sessionStorage.getItem('voiceAssistantToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    return instance;
};

const apiClient = createApiClient();
export default apiClient;
