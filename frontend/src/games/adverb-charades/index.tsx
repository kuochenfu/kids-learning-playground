import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, ArrowRight, BookOpen, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const ADVERB_MISSIONS = [
    {
        verb: "Walk",
        options: ["Quickly", "Slowly", "Happily", "Sadly"],
        correct: "Slowly",
        animation: {
            move: { x: [0, 100, 0] },
            transition: { duration: 5, repeat: Infinity, ease: "linear" }
        },
        description: "The robot is taking its time..."
    },
    {
        verb: "Jump",
        options: ["Gracefully", "Wildly", "Quietly", "Loudly"],
        correct: "Wildly",
        animation: {
            move: { y: [0, -100, 0, -150, 0, -80, 0], rotate: [0, 360, 0, -360, 0] },
            transition: { duration: 2, repeat: Infinity }
        },
        description: "The robot is jumping everywhere!"
    },
    {
        verb: "Wave",
        options: ["Shyly", "Proudly", "Nervously", "Angrily"],
        correct: "Nervously",
        animation: {
            move: { x: [0, 5, -5, 5, -5, 0], scale: [1, 1.05, 1] },
            transition: { duration: 0.2, repeat: Infinity }
        },
        description: "The robot's hand is shaking a lot..."
    }
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const AdverbCharades: React.FC = () => {
    const { token } = useAuth();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const startMission = useCallback(() => {
        setGameState('playing');
        setCurrentIdx(0);
        setScore(0);
        setFeedback(null);
    }, []);

    const handleAnswer = (option: string) => {
        if (feedback) return;

        if (option === ADVERB_MISSIONS[currentIdx].correct) {
            setScore(prev => prev + 150);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }

        setTimeout(() => {
            if (currentIdx + 1 < ADVERB_MISSIONS.length) {
                setCurrentIdx(prev => prev + 1);
                setFeedback(null);
            } else {
                finishGame(score + (option === ADVERB_MISSIONS[currentIdx].correct ? 150 : 0));
            }
        }, 1500);
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'adverb-charades',
                score: finalScore,
                duration: 0,
                wrongAnswers: [],
                timestamp: new Date().toISOString(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }, [token]);

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
                        <div className="w-32 h-32 bg-secondary rounded-[2.5rem] flex items-center justify-center shadow-playful mx-auto group">
                            <Zap className="text-white fill-white group-hover:scale-125 transition-transform" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Adverb Charades</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Watch the robot perform an action. Can you find the <b>ADVERB</b> that describes how it's moving?
                        </p>
                        <button onClick={startMission} className="btn-secondary text-2xl px-12 py-5 rounded-3xl group">
                            Start Missions! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl flex flex-col items-center gap-10"
                    >
                        <div className="flex items-center justify-between w-full max-w-2xl">
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3">
                                <Star className="text-accent fill-accent" size={20} />
                                <span className="text-xl font-black text-slate-800">{score}</span>
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful font-black text-slate-500">
                                Mission {currentIdx + 1} / {ADVERB_MISSIONS.length}
                            </div>
                        </div>

                        {/* Robot Stage */}
                        <div className="bg-white w-full max-w-3xl h-[300px] rounded-[3rem] shadow-playful border-4 border-dashed border-slate-200 relative overflow-hidden flex items-center justify-center">
                            <motion.div
                                key={currentIdx}
                                animate={ADVERB_MISSIONS[currentIdx].animation.move}
                                transition={ADVERB_MISSIONS[currentIdx].animation.transition}
                                className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-playful relative z-10"
                            >
                                <div className="w-12 h-2 bg-white/30 rounded-full absolute top-4" />
                                <div className="flex gap-4 absolute">
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                </div>
                            </motion.div>

                            <div className="absolute inset-0 bg-grad-playful opacity-5" />
                        </div>

                        <h3 className="text-3xl font-black text-slate-800">
                            The robot is {ADVERB_MISSIONS[currentIdx].verb.toLowerCase()}ing...
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                            {ADVERB_MISSIONS[currentIdx].options.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={!!feedback}
                                    className={`p-6 rounded-2xl font-black text-lg transition-all border-b-8
                    ${feedback === null ? 'bg-white text-slate-700 border-slate-100 hover:border-secondary hover:-translate-y-1' :
                                            opt === ADVERB_MISSIONS[currentIdx].correct ? 'bg-secondary text-white border-secondary-dark' :
                                                (feedback === 'wrong' && opt !== ADVERB_MISSIONS[currentIdx].correct) ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50' : 'bg-white border-slate-100'
                                        }
                  `}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence>
                            {feedback === 'correct' && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-secondary font-black text-2xl uppercase tracking-widest">
                                    ✨ Perfectly Described! ✨
                                </motion.div>
                            )}
                            {feedback === 'wrong' && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary font-black text-2xl uppercase tracking-widest">
                                    Not quite right!
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
                        className="text-center w-full max-w-xl bg-white p-12 rounded-[3.5rem] shadow-popping"
                    >
                        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-playful mx-auto mb-8">
                            <Trophy className="text-accent-dark fill-accent-dark" size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Adverb Expert!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You understand how actions change!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Score</div>
                                <div className="text-4xl font-black text-secondary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stars Gained</div>
                                <div className="text-4xl font-black text-primary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <button onClick={startMission} className="btn-secondary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-2">
                            <RefreshCw /> Play Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdverbCharades;
