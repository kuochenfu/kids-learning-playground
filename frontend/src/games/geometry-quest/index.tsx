import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Target, Shapes, RotateCcw, Trophy, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

type Level = 1 | 2 | 3;

interface GeometricShape {
    type: 'triangle' | 'circle' | 'semicircle';
    params: any;
    targetValue: number;
    questionText: string;
    unit: string;
}

const GeometryQuest: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'feedback' | 'finished'>('idle');
    const [level, setLevel] = useState<Level>(1);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(180);
    const [currentShape, setCurrentShape] = useState<GeometricShape | null>(null);
    const [userInput, setUserInput] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

    const generateQuestion = useCallback((targetLevel: Level) => {
        let shape: GeometricShape;
        if (targetLevel === 1) {
            const a1 = Math.floor(Math.random() * 80) + 20;
            const a2 = Math.floor(Math.random() * (160 - a1)) + 10;
            const target = 180 - a1 - a2;
            shape = {
                type: 'triangle',
                params: { a1, a2 },
                targetValue: target,
                questionText: `Angle 1 is ${a1}°, Angle 2 is ${a2}°. Find the 3rd angle!`,
                unit: '°'
            };
        } else if (targetLevel === 2) {
            const diameter = (Math.floor(Math.random() * 4) + 2) * 10;
            const radius = diameter / 2;
            const target = 3.14 * radius * radius;
            shape = {
                type: 'circle',
                params: { diameter },
                targetValue: target,
                questionText: `Diameter is ${diameter}. Find the Area (π = 3.14).`,
                unit: ''
            };
        } else {
            const diameter = (Math.floor(Math.random() * 5) + 2) * 10;
            const radius = diameter / 2;
            const target = parseFloat(((3.14 * radius) + diameter).toFixed(2));
            shape = {
                type: 'semicircle',
                params: { diameter },
                targetValue: target,
                questionText: `Diameter is ${diameter}. Find the Perimeter (π = 3.14).`,
                unit: ''
            };
        }
        setCurrentShape(shape);
        setUserInput('');
        setIsCorrect(null);
        setShowHint(false);
    }, []);

    const startGame = () => {
        setGameState('playing');
        setLevel(1);
        setScore(0);
        setTimeLeft(180);
        generateQuestion(1);
    };

    const handleKeypad = (val: string) => {
        if (val === 'DEL') {
            setUserInput(prev => prev.slice(0, -1));
        } else if (userInput.length < 8) {
            setUserInput(prev => prev + val);
        }
    };

    const checkAnswer = async () => {
        if (!currentShape) return;
        const ans = parseFloat(userInput);
        const correct = Math.abs(ans - currentShape.targetValue) < 0.1;

        setIsCorrect(correct);
        setGameState('feedback');

        if (correct) {
            setScore(prev => prev + 10 * level);
            setTimeout(() => {
                if (level < 3) setLevel(l => (l + 1) as Level);
                generateQuestion((level < 3 ? level + 1 : 3) as Level);
                setGameState('playing');
            }, 1800);
        } else {
            setTimeout(() => {
                setGameState('playing');
                setIsCorrect(null);
            }, 2500);
        }
    };

    useEffect(() => {
        let timer: any;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && gameState !== 'finished') {
            setGameState('finished');
            if (token) {
                axios.post(`${API_BASE_URL}/api/score`, {
                    gameId: 'geometry-quest', score, duration: 180 - timeLeft
                }, { headers: { Authorization: `Bearer ${token}` } }).catch(console.error);
            }
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft, score, token]);

    const renderShape = () => {
        if (!currentShape) return null;
        const size = 300;
        const center = size / 2;

        if (currentShape.type === 'triangle') {
            const { a1, a2 } = currentShape.params;
            const a3_val = isCorrect === false ? (parseFloat(userInput) || 1) : (180 - a1 - a2);
            const baseW = 180;
            const x1 = center - baseW / 2, y1 = center + 50, x2 = center + baseW / 2, y2 = y1;
            const rad1 = (a1 * Math.PI) / 180, rad2 = (a2 * Math.PI) / 180;
            const visualA3 = isCorrect === false ? a3_val : (180 - a1 - a2);
            const radV3 = (visualA3 * Math.PI) / 180;
            const sideC = (baseW * Math.sin(rad2)) / Math.sin(radV3);
            const x3 = x1 + sideC * Math.cos(rad1), y3 = y1 - sideC * Math.sin(rad1);

            return (
                <svg width={size} height={size}>
                    <motion.polygon animate={{ points: `${x1},${y1} ${x2},${y2} ${x3},${y3}` }} className={`${isCorrect === null ? 'fill-primary/20 stroke-primary' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                    <text x={x1 - 10} y={y1 + 20} className="text-[10px] font-bold fill-slate-400">{a1}°</text>
                    <text x={x2 - 10} y={y2 + 20} className="text-[10px] font-bold fill-slate-400">{a2}°</text>
                    <text x={x3 - 10} y={y3 - 10} className="text-2xl font-black fill-primary">?</text>
                </svg>
            );
        }
        if (currentShape.type === 'circle') {
            const r = currentShape.params.diameter * 1.5;
            return (
                <svg width={size} height={size}>
                    <circle cx={center} cy={center} r={r} className={`${isCorrect === null ? 'fill-secondary/20 stroke-secondary' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                    <line x1={center - r} y1={center} x2={center + r} y2={center} className="stroke-slate-300 stroke-2" strokeDasharray="4" />
                    <text x={center - 15} y={center - 5} className="text-xs font-bold fill-slate-500">d={currentShape.params.diameter}</text>
                </svg>
            );
        }
        const r_s = currentShape.params.diameter * 1.5;
        return (
            <svg width={size} height={size}>
                <path d={`M ${center - r_s},${center} A ${r_s},${r_s} 0 0 1 ${center + r_s},${center} Z`} className={`${isCorrect === null ? 'fill-playful-purple/20 stroke-playful-purple' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                <text x={center - 20} y={center + 20} className="text-xs font-bold fill-slate-500">d={currentShape.params.diameter}</text>
            </svg>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[540px] w-full bg-white rounded-[2rem] overflow-hidden p-6 relative">
            <AnimatePresence mode="wait">
                {gameState === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                        <Shapes size={64} className="text-primary mx-auto mb-6" />
                        <h1 className="text-5xl font-black text-slate-800 mb-4">Geometry Quest 🧭</h1>
                        <p className="text-lg font-bold text-slate-500 mb-8 max-w-sm mx-auto">Calculate angles and area to unlock common shapes!</p>
                        <button onClick={startGame} className="px-12 py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-playful hover:scale-105 transition-transform">Start Adventure</button>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'feedback') && (
                    <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-6 w-full h-full">
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-b-4 border-slate-100">
                                <div><div className="text-[10px] font-black uppercase text-slate-400">Level</div><div className="text-xl font-black text-primary">{level}</div></div>
                                <div className="text-center font-black text-2xl text-slate-700">{score}</div>
                                <div className="text-right"><div className="text-[10px] font-black uppercase text-slate-400">Time</div><div className="text-xl font-black text-orange-500">{timeLeft}s</div></div>
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-[2rem] p-6 relative flex flex-col items-center justify-center min-h-[320px]">
                                <div className="absolute top-4 text-center px-4"><p className="text-xl font-black text-slate-700 leading-tight">{currentShape?.questionText}</p></div>
                                {renderShape()}
                                <button onClick={() => setShowHint(!showHint)} className="absolute bottom-4 right-4 p-3 bg-white hover:bg-slate-100 rounded-xl shadow-playful transition-colors">
                                    <Target size={24} className={showHint ? "text-primary" : "text-slate-300"} />
                                </button>
                            </div>
                            <div className="bg-white border-4 border-slate-50 p-4 rounded-3xl text-center">
                                <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">Answer</span>
                                <div className="text-5xl font-black text-slate-800 tracking-tighter">{userInput || '...'}</div>
                            </div>
                        </div>
                        <div className="w-full md:w-64 flex flex-col gap-3">
                            <div className="grid grid-cols-3 gap-2 flex-1">
                                {buttons.map(b => (
                                    <button key={b} onClick={() => handleKeypad(b)} className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all py-4 rounded-xl text-xl font-black text-slate-700 border-b-4 border-slate-200">{b}</button>
                                ))}
                            </div>
                            <button onClick={checkAnswer} disabled={!userInput || gameState === 'feedback'} className={`py-6 rounded-2xl font-black text-xl shadow-playful flex items-center justify-center gap-3 transition-colors ${!userInput || gameState === 'feedback' ? 'bg-slate-100 text-slate-300' : 'bg-accent text-accent-dark hover:scale-102'}`}>Check <Zap size={20} className="fill-current" /></button>
                        </div>

                        <AnimatePresence>
                            {isCorrect !== null && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                    <div className={`p-10 rounded-[3rem] shadow-popping flex flex-col items-center text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                        <div className="text-6xl mb-2">{isCorrect ? '🌟' : '�'}</div>
                                        <h2 className="text-3xl font-black">{isCorrect ? 'EXCELLENT' : 'NOT QUITE'}</h2>
                                        {isCorrect ? <p className="font-bold">+ {10 * level} pts</p> : <p className="font-bold">Correct was {currentShape?.targetValue}</p>}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {gameState === 'finished' && (
                    <motion.div key="finished" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8">
                        <Trophy size={80} className="text-accent mx-auto mb-4" />
                        <h2 className="text-5xl font-black text-slate-800 mb-2">Victory!</h2>
                        <p className="text-lg font-bold text-slate-500 mb-8">Score: {score}</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={startGame} className="px-10 py-4 bg-primary text-white font-black rounded-xl shadow-playful flex items-center gap-2 transition-transform hover:scale-105"><RotateCcw size={20} /> Retry</button>
                            <button onClick={() => navigate('/')} className="px-10 py-4 bg-white text-slate-400 font-black rounded-xl shadow-playful border-b-4 border-slate-100 hover:bg-slate-50">Lobby</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeometryQuest;
