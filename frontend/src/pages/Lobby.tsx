import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, Book, Beaker, GraduationCap, Zap, Star, Puzzle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import type { GameMetadata } from '../../../shared/types';

const GAMES: GameMetadata[] = [
    {
        id: 'speed-math',
        title: 'Speed Math Challenge',
        description: 'Master your multiplication & division skills!',
        icon: 'math',
        color: 'bg-primary',
        category: 'Math',
    },
    {
        id: 'word-builder',
        title: 'Word Builder',
        description: 'Build your vocabulary with spelling puzzles!',
        icon: 'english',
        color: 'bg-secondary',
        category: 'English',
    },
    {
        id: 'sentence-scramble',
        title: 'Sentence Scramble',
        description: 'Race against time to fix the mixed-up sentences!',
        icon: 'english',
        color: 'bg-secondary',
        category: 'English',
    },
    {
        id: 'shiritori',
        title: 'Word Chain (Shiritori)',
        description: 'How long can you keep the word chain going?',
        icon: 'english',
        color: 'bg-secondary',
        category: 'English',
    },
    {
        id: 'twenty-questions',
        title: '20 Questions',
        description: 'Ask the right questions to find the secret object!',
        icon: 'english',
        color: 'bg-secondary',
        category: 'English',
    },
    {
        id: 'adverb-charades',
        title: 'Adverb Charades',
        description: 'Learn how adverbs change the way we do things!',
        icon: 'english',
        color: 'bg-secondary',
        category: 'English',
    },
    {
        id: 'science-quiz',
        title: 'Science Quiz',
        description: 'Explore the secrets of the world!',
        icon: 'science',
        color: 'bg-playful-blue',
        category: 'Science',
    },
    {
        id: 'logic-puzzles',
        title: 'Logic Puzzles',
        description: 'Train your brain with fun challenges!',
        icon: 'logic',
        color: 'bg-playful-purple',
        category: 'Logic',
    },
    {
        id: 'puzzle-time',
        title: 'Puzzle Time!',
        description: 'Assemble the pieces of a cute kitten dreams!',
        icon: 'puzzle',
        color: 'bg-playful-pink',
        category: 'Logic',
    },
    {
        id: 'geometry-quest',
        title: 'Geometry Quest',
        description: 'Master shapes & angles to unlock the secrets!',
        icon: 'math',
        color: 'bg-primary',
        category: 'Math',
    },
];

const Lobby: React.FC = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [totalStars, setTotalStars] = React.useState(0);

    React.useEffect(() => {
        const fetchStars = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/achievements`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const stars = res.data?.reduce((acc: number, s: any) => acc + Math.floor(s.score / 10), 0) || 0;
                setTotalStars(stars);
            } catch (err) {
                console.error('Failed to fetch stars:', err);
            }
        };
        fetchStars();
    }, [token]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'math': return <Calculator size={32} />;
            case 'english': return <Book size={32} />;
            case 'science': return <Beaker size={32} />;
            case 'logic': return <GraduationCap size={32} />;
            case 'puzzle': return <Puzzle size={32} />;
            default: return <Zap size={32} />;
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
                        Hi, {user?.name || 'Explorer'}! <span className="text-primary">What's the plan today?</span> 🚀
                    </h1>
                    <p className="text-xl font-bold text-slate-500 max-w-2xl leading-relaxed">
                        Choose a challenge and earn your stars. Every game brings you one step closer to your goal!
                    </p>
                </div>

                <div className="bg-white px-6 py-4 rounded-3xl shadow-playful flex items-center gap-4 border-b-4 border-slate-100">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-inner">
                        <Star className="text-accent-dark fill-accent-dark" size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Stars</div>
                        <div className="text-3xl font-black text-slate-800 leading-none">{totalStars}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {GAMES.map((game, index) => (
                    <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        onClick={() => navigate(`/games/${game.id}`)}
                        className="cursor-pointer group flex items-start gap-6 bg-white p-8 rounded-[2.5rem] shadow-playful hover:shadow-popping hover:-translate-y-2 transition-all duration-300 border-b-8 border-slate-100/50"
                    >
                        <div className={`p-6 rounded-3xl ${game.color} text-white shadow-playful group-hover:rotate-6 transition-transform duration-300`}>
                            {getIcon(game.icon)}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                                    {game.category}
                                </span>
                                <span className="flex items-center gap-1 text-accent-dark font-black text-xs px-2 py-1 bg-accent/20 rounded-full">
                                    <Star size={12} className="fill-accent-dark" /> +10 Stars
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-primary transition-colors">
                                {game.title}
                            </h3>
                            <p className="text-slate-500 font-bold leading-relaxed">
                                {game.description}
                            </p>

                            <div className="mt-6 flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform duration-300">
                                Play Now <Zap size={14} className="fill-primary" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Lobby;
