import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/chats');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen bg-[#090b10] text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-sky-500/30">
            {/* Ambient Background Radial Glows */}
            <div 
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, #38bdf8 0%, #0284c7 50%, transparent 70%)' }}
            />
            <div 
                className="absolute bottom-10 right-10 w-72 h-72 rounded-full pointer-events-none opacity-15 blur-3xl"
                style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
            />

            <div className="max-w-md w-full relative z-10">
                {/* Brand / Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(56,189,248,0.2)] mb-4">
                        <Sparkles size={24} className="text-sky-400 animate-pulse" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                        Welcome Back
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 font-light">
                        Sign in to resume your voice assistance sessions
                    </p>
                </div>

                {/* Glassmorphic Card */}
                <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 shadow-2xl">
                    {error && (
                        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                <input 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-400/80 focus:border-sky-400/80 transition-all" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1.5 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                <input 
                                    type="password" 
                                    required 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-400/80 focus:border-sky-400/80 transition-all" 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-2 py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                            {!loading && <ArrowRight size={15} />}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-neutral-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
                            Create account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
