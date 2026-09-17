import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatsListPage from './pages/ChatsListPage';
import ChatDetailPage from './pages/ChatDetailPage';
import TextChatPage from './pages/TextChatPage';
import VoiceSessionPage from './pages/VoiceSessionPage';
import MemoriesPage from './pages/MemoriesPage';

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/chats" element={<ProtectedRoute><ChatsListPage /></ProtectedRoute>} />
                    <Route path="/chats/:id" element={<ProtectedRoute><ChatDetailPage /></ProtectedRoute>} />
                    <Route path="/text-chat" element={<ProtectedRoute><TextChatPage /></ProtectedRoute>} />
                    <Route path="/voice" element={<ProtectedRoute><VoiceSessionPage /></ProtectedRoute>} />
                    <Route path="/memories" element={<ProtectedRoute><MemoriesPage /></ProtectedRoute>} />
                    <Route path="/" element={<ProtectedRoute><Navigate to="/voice" replace /></ProtectedRoute>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
