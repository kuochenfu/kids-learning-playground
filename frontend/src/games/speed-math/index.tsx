import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, ArrowRight, Zap, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const MAX_TIME = 60; // 60 seconds per challenge
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SpeedMath: React.FC = () => {
    const { token } = useAuth();

    // Game State
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [question, setQuestion] = useState({ a: 0, b: 0, op: '*', result: 0 });
    const [userInput, setUserInput] = useState('');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(MAX_TIME);
    const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a random math problem suitable for 4th Grade
    const generateQuestion = useCallback(() => {
        const ops = ['*', '/'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, result;

        if (op === '*') {
            a = Math.floor(Math.random() * 11) + 2;
            b = Math.floor(Math.random() * 11) + 2;
            result = a * b;
        } else {
            b = Math.floor(Math.random() * 9) + 2;
            result = Math.floor(Math.random() * 10) + 1;
            a = b * result;
        }

        setQuestion({ a, b, op, result });
        setUserInput('');
        setFeedback(null);
    }, []);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setTimeLeft(MAX_TIME);
        setWrongAnswers([]);
        generateQuestion();
    };

    const finishGame = useCallback(async () => {
        setGameState('finished');
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'speed-math',
                score,
                duration: MAX_TIME - timeLeft,
                wrongAnswers,
                timestamp: new Date().toISOString(),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Score saved successfully');
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }, [score, timeLeft, wrongAnswers, token]);

    // Timer logic
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, timeLeft, finishGame]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (gameState !== 'playing' || !userInput) return;

        const val = parseInt(userInput);
        if (val === question.result) {
            setScore(prev => prev + 10);
            setFeedback('correct');
            setTimeout(generateQuestion, 400);
        } else {
            setWrongAnswers(prev => [...prev, `${question.a} ${question.op} ${question.b} = ${userInput}`]);
            setFeedback('wrong');
            setUserInput('');
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
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="text-center space-y-8"
                    >
                        <div className="w-32 h-32 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-playful mx-auto group-hover:rotate-12 transition-transform">
                            <Zap className="text-white fill-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Speed Math Challenge</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Answer as many multiplication and division questions as you can in 60 seconds. Ready?
                        </p>
                        <button onClick={startGame} className="btn-primary text-2xl px-12 py-5 rounded-3xl group">
                            Start Fun! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl flex flex-col gap-10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="bg-white px-8 py-4 rounded-3xl shadow-playful flex items-center gap-4">
                                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-inner">
                                    <Star className="text-accent-dark fill-accent-dark" size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Score</div>
                                    <div className="text-2xl font-black text-slate-800 leading-none">{score}</div>
                                </div>
                            </div>

                            <div className={`px-8 py-4 rounded-3xl shadow-playful border-b-4 ${timeLeft < 10 ? 'bg-primary-light/10 border-primary shadow-primary/20 animate-pulse' : 'bg-white border-slate-100'}`}>
                                <div className="text-[10px] font-black uppercase text-slate-400 text-center leading-none mb-1">Time Left</div>
                                <div className={`text-2xl font-black text-center leading-none ${timeLeft < 10 ? 'text-primary' : 'text-slate-800'}`}>
                                    {timeLeft}s
                                </div>
                            </div>
                        </div>

                        <motion.div
                            animate={feedback === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
                            className="bg-white p-16 rounded-[4rem] shadow-playful border-b-8 border-slate-100 flex flex-col items-center gap-12 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${(timeLeft / MAX_TIME) * 100}%` }}
                                    transition={{ duration: 1, ease: 'linear' }}
                                    className={`h-full ${timeLeft < 15 ? 'bg-primary' : 'bg-secondary'}`}
                                />
                            </div>

                            <div className="flex items-center gap-8 justify-center">
                                <span className="text-7xl md:text-8xl font-black text-slate-800">{question.a}</span>
                                <span className="text-4xl md:text-5xl font-black text-primary">{question.op === '*' ? '×' : '÷'}</span>
                                <span className="text-7xl md:text-8xl font-black text-slate-800">{question.b}</span>
                                <span className="text-4xl md:text-5xl font-black text-slate-300">=</span>
                            </div>

                            <form onSubmit={handleSubmit} className="w-full max-w-xs relative">
                                <input
                                    autoFocus
                                    type="number"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="?"
                                    className={`w-full text-center text-7xl md:text-8xl font-black py-6 rounded-[2.5rem] bg-slate-50 outline-none border-4 transition-all duration-200 
                                    ${feedback === 'correct' ? 'border-secondary text-secondary bg-secondary/5' :
                                            feedback === 'wrong' ? 'border-primary text-primary bg-primary/5' :
                                                'border-slate-100 focus:border-primary-light focus:bg-white'}`}
                                />
                                <AnimatePresence>
                                    {feedback === 'correct' && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: [0, 1.5, 1], opacity: 1 }}
                                            className="absolute -top-12 -right-12 text-secondary pointer-events-none"
                                        >
                                            <CheckCircle2 size={64} className="fill-white" />
                                        </motion.div>
                                    )}
                                    {feedback === 'wrong' && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: [0, 1.5, 1], opacity: 1 }}
                                            className="absolute -top-12 -right-12 text-primary pointer-events-none"
                                        >
                                            <XCircle size={64} className="fill-white" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </motion.div>
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
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Awesome Work!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You're getting faster and smarter!</p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Final Score</div>
                                <div className="text-4xl font-black text-primary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Stars Gained</div>
                                <div className="text-4xl font-black text-secondary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <button onClick={startGame} className="btn-primary w-full sm:w-auto text-xl px-10 rounded-2xl group flex items-center justify-center gap-2">
                                <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" /> Play Again
                            </button>
                            <Link to="/" className="btn-secondary w-full sm:w-auto text-xl px-10 rounded-2xl flex items-center justify-center gap-2">
                                Back to Lobby
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpeedMath;
