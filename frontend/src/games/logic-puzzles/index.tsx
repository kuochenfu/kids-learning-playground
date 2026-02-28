import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, ArrowRight, Brain, RefreshCw, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PUZZLES = [
    {
        type: "Sequence",
        question: "Complete the pattern: 2, 4, 8, 16, ?",
        options: ["20", "24", "32", "64"],
        answer: "32",
        explanation: "Each number is double the previous one!"
    },
    {
        type: "Logic",
        question: "If all Bloops are Razzies and all Razzies are Lurgs, are all Bloops also Lurgs?",
        options: ["Yes", "No", "Maybe", "Only on Tuesdays"],
        answer: "Yes",
        explanation: "This is a transitive relationship: A=B, B=C, therefore A=C!"
    },
    {
        type: "Pattern",
        question: "Which shape comes next? Triangle (3), Square (4), Pentagon (5), ...",
        options: ["Hexagon (6)", "Circle", "Star", "Rectangle"],
        answer: "Hexagon (6)",
        explanation: "The number of sides increases by one each time!"
    },
    {
        type: "Deduction",
        question: "I have keys but no locks. I have a space but no room. You can enter, but never leave. What am I?",
        options: ["Map", "Keyboard", "Clock", "Book"],
        answer: "Keyboard",
        explanation: "A keyboard has keys and a space bar, and an Enter key!"
    },
    {
        type: "Math Logic",
        question: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
        options: ["$0.10", "$0.05", "$0.15", "$1.00"],
        answer: "$0.05",
        explanation: "If ball is $0.05, bat is $1.05. Total = $1.10!"
    }
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const LogicPuzzles: React.FC = () => {
    const { token } = useAuth();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setCurrentIdx(0);
        setFeedback(null);
        setShowExplanation(false);
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'logic-puzzles',
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

    const handleAnswer = (option: string) => {
        if (feedback) return;

        if (option === PUZZLES[currentIdx].answer) {
            setScore(prev => prev + 150);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }
        setShowExplanation(true);
    };

    const nextPuzzle = () => {
        if (currentIdx + 1 < PUZZLES.length) {
            setCurrentIdx(prev => prev + 1);
            setFeedback(null);
            setShowExplanation(false);
        } else {
            finishGame(score);
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
                        <div className="w-32 h-32 bg-indigo-400 rounded-full flex items-center justify-center shadow-playful mx-auto mb-8">
                            <Brain className="text-white ring-4 ring-white/30 rounded-full p-2" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Logic Puzzles</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Train your brain with fun challenges! Solve the mysteries using your logical thinking.
                        </p>
                        <button onClick={startGame} className="btn-primary bg-indigo-500 hover:bg-indigo-600 border-indigo-700 text-2xl px-12 py-5 rounded-3xl group">
                            Start Training! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-3xl flex flex-col gap-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3">
                                <Star className="text-accent fill-accent" size={20} />
                                <span className="text-xl font-black text-slate-800">{score}</span>
                            </div>
                            <div className="bg-indigo-50 px-6 py-2 rounded-xl text-indigo-600 font-bold border-2 border-indigo-100">
                                {PUZZLES[currentIdx].type}
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful font-black text-slate-500">
                                Puzzles {currentIdx + 1}/{PUZZLES.length}
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] shadow-playful relative">
                            <h3 className="text-3xl font-black text-slate-800 mb-10 text-center leading-snug">
                                {PUZZLES[currentIdx].question}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PUZZLES[currentIdx].options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={!!feedback}
                                        className={`p-6 text-xl font-bold rounded-2xl border-4 transition-all
                      ${feedback === null ? 'bg-slate-50 border-slate-100 hover:border-indigo-400 hover:bg-white' :
                                                opt === PUZZLES[currentIdx].answer ? 'bg-green-50 border-green-400 text-green-700' :
                                                    (feedback === 'wrong' && opt !== PUZZLES[currentIdx].answer) ? 'bg-red-50 border-slate-100 text-red-300' : 'bg-slate-50 border-slate-100 text-slate-400'}
                    `}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence>
                                {showExplanation && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-10 p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex gap-4 items-start"
                                    >
                                        <div className="p-2 bg-indigo-400 rounded-lg text-white mt-1">
                                            <HelpCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-indigo-900 font-bold mb-2">The logic is...</p>
                                            <p className="text-indigo-800 italic">"{PUZZLES[currentIdx].explanation}"</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {feedback && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={nextPuzzle}
                                className="btn-primary bg-indigo-500 border-indigo-700 w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-3"
                            >
                                {currentIdx + 1 === PUZZLES.length ? 'Finish Training' : 'Next Puzzle'} <ArrowRight />
                            </motion.button>
                        )}
                    </motion.div>
                )}

                {gameState === 'finished' && (
                    <motion.div
                        key="finished"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center w-full max-w-xl bg-white p-12 rounded-[3.5rem] shadow-popping"
                    >
                        <div className="w-24 h-24 bg-indigo-400 rounded-[2rem] flex items-center justify-center shadow-playful mx-auto mb-8 rotate-12">
                            <Trophy className="text-white fill-white" size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Logic Master Architect!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">Your logical deduction skills are top-notch!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100">
                                <div className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">Logic Potential</div>
                                <div className="text-4xl font-black text-indigo-600">{score}</div>
                            </div>
                            <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100">
                                <div className="text-[10px] font-black uppercase text-indigo-400 mb-1 tracking-widest">Stars Gained</div>
                                <div className="text-4xl font-black text-secondary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <button onClick={startGame} className="btn-primary bg-indigo-500 border-indigo-700 w-full text-xl px-10 rounded-2xl flex items-center justify-center gap-2">
                            <RefreshCw /> Try More Puzzles
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LogicPuzzles;
