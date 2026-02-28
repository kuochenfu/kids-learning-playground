import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Star, Trophy, ArrowRight, BookOpen, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const WORD_LIST = [
    'ADVENTURE', 'BRILLIANT', 'CHALLENGE', 'EXPLORER', 'GALAXY',
    'IMAGINATION', 'KNOWLEDGE', 'MYSTERY', 'OCEAN', 'PLANET',
    'QUARTZ', 'RAINBOW', 'SCIENCE', 'TREASURE', 'UNIVERSE'
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const WordBuilder: React.FC = () => {
    const { token } = useAuth();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [currentWord, setCurrentWord] = useState('');
    const [scrambled, setScrambled] = useState<string[]>([]);
    const [solvedWords, setSolvedWords] = useState<string[]>([]);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<boolean | null>(null);

    const generateWord = useCallback(() => {
        const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
        setCurrentWord(word);
        const letters = word.split('').sort(() => Math.random() - 0.5);
        setScrambled(letters);
        setFeedback(null);
    }, []);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setSolvedWords([]);
        generateWord();
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'word-builder',
                score: finalScore,
                duration: 0, // Simplified for now
                wrongAnswers: [],
                timestamp: new Date().toISOString(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }, [token]);

    const handleReorder = (newOrder: string[]) => {
        setScrambled(newOrder);
        if (newOrder.join('') === currentWord) {
            setFeedback(true);
            const newScore = score + 50;
            setScore(newScore);
            const newSolved = [...solvedWords, currentWord];
            setSolvedWords(newSolved);

            setTimeout(() => {
                if (newSolved.length >= 5) {
                    finishGame(newScore);
                } else {
                    generateWord();
                }
            }, 1000);
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
                            <BookOpen className="text-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Word Builder</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Drag the letters to spell the word correctly. Solve 5 words to win!
                        </p>
                        <button onClick={startGame} className="btn-secondary text-2xl px-12 py-5 rounded-3xl group">
                            Start Building! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl flex flex-col items-center gap-12"
                    >
                        <div className="flex items-center justify-between w-full max-w-2xl">
                            <div className="bg-white px-8 py-4 rounded-3xl shadow-playful flex items-center gap-4">
                                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                                    <Star className="text-accent-dark fill-accent-dark" size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Score</div>
                                    <div className="text-2xl font-black text-slate-800 leading-none">{score}</div>
                                </div>
                            </div>

                            <div className="bg-white px-8 py-4 rounded-3xl shadow-playful">
                                <div className="text-[10px] font-black uppercase text-slate-400 text-center leading-none mb-1">Words Solved</div>
                                <div className="text-2xl font-black text-center text-slate-800">
                                    {solvedWords.length} / 5
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/40 p-12 rounded-[4rem] border-4 border-dashed border-slate-200">
                            <Reorder.Group axis="x" values={scrambled} onReorder={handleReorder} className="flex flex-wrap justify-center gap-4">
                                {scrambled.map((letter, index) => (
                                    <Reorder.Item key={`${letter}-${index}`} value={letter} className="cursor-pointer select-none">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9, rotate: 5 }} className={`w-16 h-20 md:w-20 md:h-24 bg-white rounded-2xl md:rounded-[2rem] shadow-playful border-b-8 border-slate-100 flex items-center justify-center text-4xl md:text-5xl font-black text-slate-700 ${feedback ? 'border-secondary bg-secondary/10 text-secondary' : ''}`}>
                                            {letter}
                                        </motion.div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>

                        <AnimatePresence>
                            {feedback && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-secondary font-black text-2xl uppercase tracking-widest">
                                    🎉 Correct!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {gameState === 'finished' && (
                    <motion.div
                        key="finished"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center w-full max-w-xl bg-white p-12 rounded-[3.5rem] shadow-popping border-b-[12px] border-slate-100"
                    >
                        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-playful mx-auto mb-8 animate-bounce">
                            <Trophy className="text-accent-dark fill-accent-dark" size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Word Master!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You're a spelling champion!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Score</div>
                                <div className="text-4xl font-black text-secondary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stars Gained</div>
                                <div className="text-4xl font-black text-primary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <button onClick={startGame} className="btn-secondary px-10 rounded-2xl flex items-center gap-2 mx-auto">
                            <RefreshCw /> Play Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WordBuilder;
