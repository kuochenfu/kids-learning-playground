import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, ArrowRight, Lightbulb, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface Question {
    text: string;
    options: string[];
    answer: string;
    fact: string;
}

const ScienceQuiz: React.FC = () => {
    const { token } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showFact, setShowFact] = useState(false);
    const [loading, setLoading] = useState(false);

    const startGame = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/questions?category=science`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuestions(res.data);
            setGameState('playing');
            setScore(0);
            setCurrentIdx(0);
            setFeedback(null);
            setShowFact(false);
        } catch (err) {
            console.error('Failed to load questions:', err);
            alert('Failed to load questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'science-quiz',
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

        if (option === questions[currentIdx].answer) {
            setScore(prev => prev + 100);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }
        setShowFact(true);
    };

    const nextQuestion = () => {
        if (currentIdx + 1 < questions.length) {
            setCurrentIdx(prev => prev + 1);
            setFeedback(null);
            setShowFact(false);
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
                        <div className="w-32 h-32 bg-sky-400 rounded-[2.5rem] flex items-center justify-center shadow-playful mx-auto group-hover:rotate-12 transition-transform">
                            <Lightbulb className="text-white fill-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Science Quiz</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Explore the secrets of the world! Reach the end to become a Science Explorer.
                        </p>
                        <button
                            onClick={startGame}
                            disabled={loading}
                            className="btn-primary bg-sky-500 hover:bg-sky-600 border-sky-700 text-2xl px-12 py-5 rounded-3xl group flex items-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Let's Discover!"}
                            {!loading && <ArrowRight className="group-hover:translate-x-2 transition-transform" />}
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && questions.length > 0 && (
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
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful font-black text-slate-500">
                                Question {currentIdx + 1}/{questions.length}
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] shadow-playful relative overflow-hidden">
                            <h3 className="text-3xl font-black text-slate-800 mb-10 text-center">
                                {questions[currentIdx].text}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {questions[currentIdx].options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleAnswer(opt)}
                                        disabled={!!feedback}
                                        className={`p-6 text-xl font-bold rounded-2xl border-4 transition-all
                      ${feedback === null ? 'bg-slate-50 border-slate-100 hover:border-sky-400 hover:bg-white' :
                                                opt === questions[currentIdx].answer ? 'bg-secondary/10 border-secondary text-secondary' :
                                                    (feedback === 'wrong' && opt === questions[currentIdx].answer) ? 'bg-secondary/10 border-secondary' :
                                                        (feedback === 'wrong' && opt !== questions[currentIdx].answer) ? 'bg-primary/5 border-slate-100 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-400'}
                    `}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence>
                                {showFact && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-10 p-6 bg-sky-50 rounded-2xl border-2 border-sky-100 flex gap-4 items-start"
                                    >
                                        <div className="p-2 bg-sky-400 rounded-lg text-white mt-1">
                                            <Lightbulb size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sky-900 font-bold mb-2">Did you know?</p>
                                            <p className="text-sky-800">{questions[currentIdx].fact}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {feedback && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={nextQuestion}
                                className="btn-primary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-3"
                            >
                                {currentIdx + 1 === questions.length ? 'Finish Quiz' : 'Next Question'} <ArrowRight />
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
                        <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-playful mx-auto mb-8">
                            <Trophy className="text-accent-dark fill-accent-dark" size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Science Explorer!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You've mastered the mysteries of science!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Final Score</div>
                                <div className="text-4xl font-black text-primary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Stars Gained</div>
                                <div className="text-4xl font-black text-secondary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <button onClick={startGame} className="btn-primary w-full text-xl px-10 rounded-2xl flex items-center justify-center gap-2">
                            <RefreshCw /> Play Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScienceQuiz;
