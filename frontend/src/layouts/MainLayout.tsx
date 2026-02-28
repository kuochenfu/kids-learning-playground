import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Star, Trophy, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Lobby', path: '/', icon: <Gamepad2 size={24} /> },
        { name: 'Star Chart', path: '/dashboard', icon: <Star size={24} /> },
        { name: 'Best Score', path: '/achievements', icon: <Trophy size={24} /> },
    ];

    return (
        <div className="min-h-screen bg-grad-playful flex flex-col">
            {/* Navigation Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 shadow-sm border-b border-slate-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="bg-primary p-2 rounded-2xl shadow-playful group-hover:rotate-12 transition-transform duration-300">
                            <Gamepad2 className="text-white" size={28} />
                        </div>
                        <span className="text-2xl font-extrabold text-slate-800 tracking-tight">Antigravity</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 font-bold transition-colors ${isActive ? 'text-primary' : 'text-slate-500 hover:text-primary'
                                        }`}
                                >
                                    <span className={`${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 mr-2">
                            <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-800 leading-tight">{user?.name}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-accent/20 text-accent-dark rounded-full">
                                    {user?.role === 'parent' ? '👨‍👩‍👧 Parent' : '🌟 Explorer'}
                                </span>
                            </div>
                            <img
                                src={user?.picture || 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Explorer'}
                                alt="Profile"
                                className="w-10 h-10 rounded-full border-2 border-primary-light shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Areas */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-400 font-medium border-t border-slate-100 bg-white/50">
                <p>© 2026 Interactive Learning Portal • Built with Love for Yui ❤️</p>
            </footer>
        </div>
    );
};

export default MainLayout;
