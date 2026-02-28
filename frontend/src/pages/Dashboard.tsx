import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Star, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const Dashboard: React.FC = () => {
    const { user, token } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/api/achievements`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSessions(res.data || []);
            } catch (err) {
                console.error('Failed to fetch achievements:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAchievements();
    }, [token]);

    const totalStars = sessions.reduce((acc, s) => acc + Math.floor(s.score / 10), 0);
    const totalScore = sessions.reduce((acc, s) => acc + s.score, 0);

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
                        Hi, {user?.name}! <span className="text-primary">Your Progress</span> 🌟
                    </h1>
                    <p className="text-xl font-bold text-slate-500 max-w-2xl leading-relaxed">
                        Check your achievements and stars earned so far. Great job keep it up!
                    </p>
                </div>

                <Link to="/" className="btn-primary group">
                    <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    Back to Lobby
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-playful border-b-8 border-primary/20 flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Star className="text-primary fill-primary" size={40} />
                    </div>
                    <span className="text-5xl font-black text-slate-800 mb-2 tracking-tight">{totalStars}</span>
                    <span className="text-lg font-bold text-slate-500 uppercase tracking-widest text-center">Stars Earned</span>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-playful border-b-8 border-secondary/20 flex flex-col items-center">
                    <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Trophy className="text-secondary fill-secondary" size={40} />
                    </div>
                    <span className="text-5xl font-black text-slate-800 mb-2 tracking-tight">{sessions.length}</span>
                    <span className="text-lg font-bold text-slate-500 uppercase tracking-widest text-center">Games Played</span>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-playful border-b-8 border-accent/20 flex flex-col items-center">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Star className="text-accent fill-accent" size={40} />
                    </div>
                    <span className="text-5xl font-black text-slate-800 mb-2 tracking-tight">
                        {sessions.length > 0 ? Math.floor(totalScore / sessions.length) : 0}
                    </span>
                    <span className="text-lg font-bold text-slate-500 uppercase tracking-widest text-center">Avg Score</span>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 shadow-playful border-b-8 border-slate-100/50">
                <h2 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-4">
                    <div className="p-3 bg-secondary rounded-2xl shadow-playful flex items-center justify-center">
                        <Trophy className="text-white" size={24} />
                    </div>
                    Recent Performance
                </h2>

                {loading ? (
                    <div className="py-10 text-center font-bold text-slate-400 animate-pulse">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100">
                        <p className="text-xl font-bold text-slate-400">No games played yet. Go to the Lobby to start!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sessions.map((item, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={item.ID}
                                className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-playful transition-all duration-300"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm font-black text-2xl group-hover:scale-110 transition-transform">
                                        {item.gameId[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-800 mb-1 capitalize">
                                            {item.gameId.replace(/-/g, ' ')}
                                        </h4>
                                        <p className="text-slate-500 font-bold flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(item.CreatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-2xl font-black text-slate-800 leading-none mb-1">{item.score.toLocaleString()}</span>
                                    <span className="text-sm font-bold text-secondary">+{Math.floor(item.score / 10)} Stars</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
