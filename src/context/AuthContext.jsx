import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => sessionStorage.getItem('voiceAssistantToken'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            getMe().then(setUser).catch(() => logout());
        } else {
            setUser(null);
        }
    }, [token]);

    const login = async (email, password) => {
        const { token: newToken } = await apiLogin(email, password);
        sessionStorage.setItem('voiceAssistantToken', newToken);
        setToken(newToken);
    };

    const register = async (email, password) => {
        const { token: newToken } = await apiRegister(email, password);
        sessionStorage.setItem('voiceAssistantToken', newToken);
        setToken(newToken);
    };

    const logout = () => {
        sessionStorage.removeItem('voiceAssistantToken');
        setToken(null);
        setUser(null);
    };

    const isAuthenticated = token !== null;

    return (
        <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
