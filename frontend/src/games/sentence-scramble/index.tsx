import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Star, Trophy, ArrowRight, Timer, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const SENTENCES = [
    "The quick brown fox jumps over the lazy dog",
    "Learning English is fun and exciting",
    "A small seed can grow into a big tree",
    "The bright sun shines high in the blue sky",
    "Please remember to wash your hands before dinner",
    "Computers are helpful tools for learning new things"
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SentenceScramble: React.FC = () => {
    const { token } = useAuth();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [currentSentence, setCurrentSentence] = useState("");
    const [scrambled, setScrambled] = useState<{ id: string; word: string }[]>([]);
    const [solvedCount, setSolvedCount] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [feedback, setFeedback] = useState<boolean | null>(null);

    const generateSentence = useCallback(() => {
        const original = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
        setCurrentSentence(original);
        const words = original.split(' ').map((word, idx) => ({
            id: `${word}-${idx}-${Math.random()}`,
            word
        })).sort(() => Math.random() - 0.5);
        setScrambled(words);
        setFeedback(null);
    }, []);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setSolvedCount(0);
        setTimeLeft(60);
        generateSentence();
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'sentence-scramble',
                score: finalScore,
                duration: 60 - timeLeft,
                wrongAnswers: [],
                timestamp: new Date().toISOString(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }, [token, timeLeft]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            finishGame(score);
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft, finishGame, score]);

    const handleReorder = (newOrder: { id: string; word: string }[]) => {
        setScrambled(newOrder);
        if (newOrder.map(w => w.word).join(' ') === currentSentence) {
            setFeedback(true);
            const newScore = score + 100;
            setScore(newScore);
            setSolvedCount(prev => prev + 1);

            setTimeout(() => {
                generateSentence();
            }, 1200);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {gameState === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8"
                    >
                        <div className="w-32 h-32 bg-secondary rounded-[2.5rem] flex items-center justify-center shadow-playful mx-auto">
                            <RefreshCw className="text-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Sentence Scramble</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Drag the words to fix the sentence before the time runs out!
                        </p>
                        <button onClick={startGame} className="btn-secondary text-2xl px-12 py-5 rounded-3xl group">
                            Start Racing! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-5xl flex flex-col items-center gap-10"
                    >
                        <div className="flex items-center justify-between w-full max-w-3xl">
                            <div className="bg-white px-8 py-4 rounded-3xl shadow-playful flex items-center gap-4 border-b-4 border-primary/20">
                                <Timer className={timeLeft < 10 ? "text-primary animate-pulse" : "text-slate-400"} size={24} />
                                <span className={`text-2xl font-black ${timeLeft < 10 ? "text-primary" : "text-slate-800"}`}>
                                    {timeLeft}s
                                </span>
                            </div>
                            <div className="bg-white px-8 py-4 rounded-3xl shadow-playful flex items-center gap-3">
                                <Star className="text-accent fill-accent" size={24} />
                                <span className="text-2xl font-black text-slate-800">{score}</span>
                            </div>
                        </div>

                        <div className="bg-white/40 p-10 md:p-16 rounded-[4rem] border-4 border-dashed border-slate-200 w-full min-h-[350px] flex items-center justify-center">
                            <Reorder.Group
                                axis="x"
                                values={scrambled}
                                onReorder={handleReorder}
                                className="flex flex-wrap justify-center gap-4"
                            >
                                {scrambled.map((item) => (
                                    <Reorder.Item
                                        key={item.id}
                                        value={item}
                                        className="cursor-pointer select-none"
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95, rotate: 2 }}
                                            className={`px-6 py-4 md:px-8 md:py-6 bg-white rounded-2xl md:rounded-3xl shadow-playful border-b-8 border-slate-100 flex items-center justify-center text-xl md:text-2xl font-black text-slate-700 ${feedback ? 'border-secondary bg-secondary/10 text-secondary' : ''} transition-all`}
                                        >
                                            {item.word}
                                        </motion.div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>

                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-4 text-secondary text-3xl font-black uppercase"
                            >
                                <CheckCircle2 size={40} /> Fantastic!
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {gameState === 'finished' && (
                    <motion.div
                        key="finished"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center w-full max-w-xl bg-white p-12 rounded-[3.5rem] shadow-popping border-b-[12px] border-slate-100 text-slate-800"
                    >
                        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-playful mx-auto mb-8">
                            <Trophy className="text-accent-dark fill-accent-dark" size={48} />
                        </div>
                        <h3 className="text-4xl font-black mb-2">Sentence Master!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You fixed {solvedCount} sentences!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Score</div>
                                <div className="text-4xl font-black text-secondary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stars</div>
                                <div className="text-4xl font-black text-primary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <button onClick={startGame} className="btn-secondary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-3">
                            <RefreshCw /> Play Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SentenceScramble;
