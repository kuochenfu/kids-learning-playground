import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Shapes, RotateCcw, Trophy, Zap, Info, ChevronLeft, Calculator } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

type Level = 1 | 2 | 3;
type ViewMode = 'main' | 'game' | 'solver';

interface GeometricShape {
    type: 'triangle' | 'circle' | 'semicircle' | 'right_triangle' | 'square' | 'equilateral' | 'isosceles';
    params: any;
    targetValue: number;
    questionText: string;
    unit: string;
}

const GeometryQuest: React.FC = () => {
    const { token } = useAuth();

    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('main');
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'feedback' | 'finished'>('idle');

    // Game State
    const [level, setLevel] = useState<Level>(1);
    const [questionIndex, setQuestionIndex] = useState(0); // 0-4
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(180);
    const [currentShape, setCurrentShape] = useState<GeometricShape | null>(null);
    const [userInput, setUserInput] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Solver State
    const [selectedSolverShape, setSelectedSolverShape] = useState<string | null>(null);
    const [solverInputs, setSolverInputs] = useState<Record<string, string>>({});
    const [solverResults, setSolverResults] = useState<any>(null);

    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'];

    // --- GAME LOGIC ---
    const generateQuestion = useCallback((targetLevel: Level) => {
        let shape: GeometricShape;

        if (targetLevel === 1) {
            const types = ['triangle', 'square', 'circle_radius'];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === 'triangle') {
                const a1 = Math.floor(Math.random() * 40) + 40;
                const a2 = Math.floor(Math.random() * 40) + 40;
                const target = 180 - a1 - a2;
                shape = {
                    type: 'triangle', params: { a1, a2 }, targetValue: target,
                    questionText: `Angle 1 is ${a1}°, Angle 2 is ${a2}°. Find the 3rd angle!`, unit: '°'
                };
            } else if (type === 'square') {
                const side = Math.floor(Math.random() * 10) + 2;
                const mode = Math.random() > 0.5 ? 'area' : 'perimeter';
                shape = {
                    type: 'square', params: { side }, targetValue: mode === 'area' ? side * side : side * 4,
                    questionText: `A square has side ${side}. Find its ${mode}!`, unit: ''
                };
            } else {
                const diameter = (Math.floor(Math.random() * 5) + 1) * 2;
                shape = {
                    type: 'circle', params: { diameter }, targetValue: diameter / 2,
                    questionText: `A circle has diameter ${diameter}. What is its radius?`, unit: ''
                };
            }
        } else if (targetLevel === 2) {
            const types = ['equilateral', 'semicircle', 'right_triangle_pythagorean'];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === 'equilateral') {
                const side = Math.floor(Math.random() * 5) + 2;
                const target = parseFloat(((side * Math.sqrt(3)) / 2).toFixed(1));
                shape = {
                    type: 'equilateral', params: { side }, targetValue: target,
                    questionText: `An equilateral triangle has side ${side}. Find its height (round to 1 decimal).`, unit: ''
                };
            } else if (type === 'semicircle') {
                const diameter = (Math.floor(Math.random() * 3) + 1) * 10;
                const r = diameter / 2;
                const target = parseFloat(((3.14 * r) + diameter).toFixed(2));
                shape = {
                    type: 'semicircle', params: { diameter }, targetValue: target,
                    questionText: `Diameter is ${diameter}. Find the total Perimeter (π = 3.14).`, unit: ''
                };
            } else {
                // Easy Pythagorean Triple (3,4,5 or 6,8,10)
                const base = Math.random() > 0.5 ? 3 : 6;
                const height = base === 3 ? 4 : 8;
                shape = {
                    type: 'right_triangle', params: { a: height, b: base }, targetValue: base === 3 ? 5 : 10,
                    questionText: `Right triangle has legs ${height} and ${base}. Find the hypotenuse!`, unit: ''
                };
            }
        } else {
            // Level 3: Hard
            const types = ['isosceles_area', 'right_triangle_trig', 'circle_complex'];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === 'isosceles_area') {
                const side = 10;
                const base = 12; // h = sqrt(10^2 - 6^2) = 8
                shape = {
                    type: 'isosceles', params: { a: side, b: base }, targetValue: 48,
                    questionText: `Isosceles triangle: sides are ${side}, ${side}, and base is ${base}. Find the Area!`, unit: ''
                };
            } else if (type === 'right_triangle_trig') {
                const angle = 30;
                const hyp = 20;
                shape = {
                    type: 'right_triangle', params: { hyp, angle }, targetValue: 10,
                    questionText: `Right triangle has hypotenuse ${hyp} and an angle of ${angle}°. Find the side opposite to it! (Hint: sin ${angle}° = 0.5)`, unit: ''
                };
            } else {
                const circumference = 31.4; // d=10, r=5
                shape = {
                    type: 'circle', params: { circumference }, targetValue: 78.5,
                    questionText: `A circle has circumference 31.4. Find its Area (π = 3.14)!`, unit: ''
                };
            }
        }

        setCurrentShape(shape);
        setUserInput('');
        setIsCorrect(null);
        setShowHint(false);
    }, []);

    const startGame = () => {
        setViewMode('game');
        setGameState('playing');
        setLevel(1);
        setQuestionIndex(0);
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
                if (questionIndex >= 4) {
                    if (level < 3) {
                        const nextLvl = (level + 1) as Level;
                        setLevel(nextLvl);
                        setQuestionIndex(0);
                        generateQuestion(nextLvl);
                    } else {
                        setGameState('finished');
                        saveScore();
                    }
                } else {
                    setQuestionIndex(prev => prev + 1);
                    generateQuestion(level);
                }
                if (gameState !== 'finished') setGameState('playing');
            }, 1800);
        } else {
            setTimeout(() => {
                setGameState('playing');
                setIsCorrect(null);
            }, 2500);
        }
    };

    const saveScore = async () => {
        if (token) {
            axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'geometry-quest', score, duration: 180 - timeLeft
            }, { headers: { Authorization: `Bearer ${token}` } }).catch(console.error);
        }
    };

    useEffect(() => {
        let timer: any;
        if (viewMode === 'game' && gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && gameState !== 'finished' && viewMode === 'game') {
            setGameState('finished');
            saveScore();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft, score, token, viewMode]);


    // --- SOLVER LOGIC ---
    useEffect(() => {
        if (!selectedSolverShape) {
            setSolverResults(null);
            return;
        }

        const inputs = solverInputs;
        let results: any = { steps: [] };

        if (selectedSolverShape === 'right_triangle') {
            const a = parseFloat(inputs.a || '0');
            const b = parseFloat(inputs.b || '0');
            if (a > 0 && b > 0) {
                const c = Math.sqrt(a * a + b * b);
                const area = 0.5 * a * b;
                const p = a + b + c;
                const alpha = (Math.atan(a / b) * 180) / Math.PI;
                const beta = 90 - alpha;
                results = {
                    c: c.toFixed(2), area: area.toFixed(2), perimeter: p.toFixed(2),
                    alpha: alpha.toFixed(1), beta: beta.toFixed(1),
                    steps: [
                        `c = √(a² + b²) = √(${a}² + ${b}²) = ${c.toFixed(2)}`,
                        `Area = (a * b) / 2 = (${a} * ${b}) / 2 = ${area.toFixed(2)}`,
                        `Perimeter = a + b + c = ${p.toFixed(2)}`,
                        `α = atan(a/b) = ${alpha.toFixed(1)}°`,
                        `β = 90° - α = ${beta.toFixed(1)}°`
                    ]
                };
            }
        } else if (selectedSolverShape === 'equilateral') {
            const a = parseFloat(inputs.a || '0');
            if (a > 0) {
                const h = (a * Math.sqrt(3)) / 2;
                const area = (a * a * Math.sqrt(3)) / 4;
                results = {
                    h: h.toFixed(2), area: area.toFixed(2), perimeter: (3 * a).toFixed(2),
                    steps: [
                        `h = (a * √3) / 2 = ${h.toFixed(2)}`,
                        `Area = (a² * √3) / 4 = ${area.toFixed(2)}`,
                        `Perimeter = 3 * a = ${3 * a}`
                    ]
                };
            }
        } else if (selectedSolverShape === 'square') {
            const a = parseFloat(inputs.a || '0');
            if (a > 0) {
                const d = a * Math.sqrt(2);
                results = {
                    area: (a * a).toFixed(2), perimeter: (4 * a).toFixed(2), diagonal: d.toFixed(2),
                    steps: [
                        `Area = a² = ${a * a}`,
                        `Perimeter = 4 * a = ${4 * a}`,
                        `Diagonal = a * √2 = ${d.toFixed(2)}`
                    ]
                };
            }
        } else if (selectedSolverShape === 'circle') {
            const d = parseFloat(inputs.d || '0');
            if (d > 0) {
                const r = d / 2;
                const area = 3.14 * r * r;
                const c = 3.14 * d;
                results = {
                    r: r.toFixed(2), area: area.toFixed(2), circumference: c.toFixed(2),
                    steps: [
                        `r = d / 2 = ${r.toFixed(2)}`,
                        `Area = π * r² = 3.14 * ${r.toFixed(2)}² = ${area.toFixed(2)}`,
                        `Circumference = π * d = 3.14 * ${d} = ${c.toFixed(2)}`
                    ]
                };
            }
        } else if (selectedSolverShape === 'isosceles') {
            const a = parseFloat(inputs.a || '0');
            const b = parseFloat(inputs.b || '0');
            if (a > (b / 2) && b > 0) {
                const h = Math.sqrt(a * a - (b / 2) * (b / 2));
                results = {
                    h: h.toFixed(2), area: (0.5 * b * h).toFixed(2), perimeter: (2 * a + b).toFixed(2),
                    steps: [
                        `h = √(a² - (b/2)²) = ${h.toFixed(2)}`,
                        `Area = (b * h) / 2 = ${((b * h) / 2).toFixed(2)}`,
                        `Perimeter = 2a + b = ${2 * a + b}`
                    ]
                };
            }
        }

        setSolverResults(results);
    }, [selectedSolverShape, solverInputs]);


    const renderGameShape = () => {
        if (!currentShape) return null;
        const size = 300;
        const center = size / 2;

        if (currentShape.type === 'triangle' || currentShape.type === 'equilateral' || currentShape.type === 'isosceles') {
            let x1, y1, x2, y2, x3, y3;
            const baseW = 160;
            x1 = center - baseW / 2; y1 = center + 50;
            x2 = center + baseW / 2; y2 = y1;

            if (currentShape.type === 'triangle') {
                const { a1, a2 } = currentShape.params;
                const rad1 = (a1 * Math.PI) / 180, rad2 = (a2 * Math.PI) / 180;
                const rad3 = Math.PI - rad1 - rad2;
                const sideC = (baseW * Math.sin(rad2)) / Math.sin(rad3);
                x3 = x1 + sideC * Math.cos(rad1); y3 = y1 - sideC * Math.sin(rad1);
            } else if (currentShape.type === 'equilateral') {
                x3 = center; y3 = y1 - (baseW * Math.sqrt(3)) / 2;
            } else {
                // Isosceles
                const a = 120, b = 160; // visual
                const h = Math.sqrt(a * a - (b / 2) * (b / 2));
                x3 = center; y3 = y1 - h;
            }

            return (
                <svg width={size} height={size}>
                    <motion.polygon animate={{ points: `${x1},${y1} ${x2},${y2} ${x3},${y3}` }} className={`${isCorrect === null ? 'fill-primary/20 stroke-primary' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                    {currentShape.type === 'triangle' && (
                        <>
                            <text x={x1 - 10} y={y1 + 20} className="text-[10px] font-bold fill-slate-400">{currentShape.params.a1}°</text>
                            <text x={x2 - 10} y={y2 + 20} className="text-[10px] font-bold fill-slate-400">{currentShape.params.a2}°</text>
                            <text x={x3 - 10} y={y3 - 10} className="text-2xl font-black fill-primary">?</text>
                        </>
                    )}
                </svg>
            );
        }

        if (currentShape.type === 'right_triangle') {
            const w = 150, h = 100;
            const x1 = center - w / 2, y1 = center + h / 2;
            const x2 = x1 + w, y2 = y1;
            const x3 = x1, y3 = y1 - h;
            return (
                <svg width={size} height={size}>
                    <path d={`M ${x1},${y1} L ${x2},${y2} L ${x3},${y3} Z`} className={`${isCorrect === null ? 'fill-primary/20 stroke-primary' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                    <rect x={x1} y={y1 - 10} width={10} height={10} className="stroke-slate-300 fill-none" />
                </svg>
            );
        }

        if (currentShape.type === 'square') {
            const s = 120;
            return (
                <svg width={size} height={size}>
                    <rect x={center - s / 2} y={center - s / 2} width={s} height={s} className={`${isCorrect === null ? 'fill-playful-purple/20 stroke-playful-purple' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                </svg>
            );
        }

        if (currentShape.type === 'circle') {
            const r = 80;
            return (
                <svg width={size} height={size}>
                    <circle cx={center} cy={center} r={r} className={`${isCorrect === null ? 'fill-secondary/20 stroke-secondary' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
                    <line x1={center - r} y1={center} x2={center + r} y2={center} className="stroke-slate-300 stroke-2" strokeDasharray="4" />
                </svg>
            );
        }

        const r_s = 80;
        return (
            <svg width={size} height={size}>
                <path d={`M ${center - r_s},${center} A ${r_s},${r_s} 0 0 1 ${center + r_s},${center} Z`} className={`${isCorrect === null ? 'fill-playful-purple/20 stroke-playful-purple' : isCorrect ? 'fill-green-100 stroke-green-500' : 'fill-red-100 stroke-red-500'} stroke-4 transition-colors`} />
            </svg>
        );
    };

    const renderSolverShape = () => {
        const size = 200;
        const center = size / 2;
        if (selectedSolverShape === 'right_triangle') {
            return (
                <svg width={size} height={size} className="mx-auto">
                    <path d={`M ${50},${size - 50} L ${size - 50},${size - 50} L ${50},${50} Z`} fill="none" className="stroke-primary stroke-2" />
                    <text x={center} y={size - 30} className="fill-slate-400 text-xs text-center">b</text>
                    <text x={30} y={center} className="fill-slate-400 text-xs">a</text>
                    <text x={center + 20} y={center - 20} className="fill-slate-400 text-xs rotate-[-45deg]">c</text>
                    <rect x={50} y={size - 60} width={10} height={10} fill="none" className="stroke-slate-300 stroke-1" />
                </svg>
            );
        } else if (selectedSolverShape === 'equilateral') {
            return (
                <svg width={size} height={size} className="mx-auto">
                    <path d={`M ${50},${size - 50} L ${size - 50},${size - 50} L ${center},${50} Z`} fill="none" className="stroke-secondary stroke-2" />
                    <text x={center - 20} y={size - 35} className="fill-slate-400 text-xs">a</text>
                    <line x1={center} y1={50} x2={center} y2={size - 50} className="stroke-slate-200 stroke-1" strokeDasharray="4" />
                    <text x={center + 5} y={center} className="fill-slate-400 text-xs">h</text>
                </svg>
            );
        } else if (selectedSolverShape === 'square') {
            return (
                <svg width={size} height={size} className="mx-auto">
                    <rect x={50} y={50} width={100} height={100} fill="none" className="stroke-playful-purple stroke-2" />
                    <text x={center - 5} y={size - 35} className="fill-slate-400 text-xs">a</text>
                    <line x1={50} y1={size - 50} x2={size - 50} y2={50} className="stroke-slate-200 stroke-1" strokeDasharray="4" />
                    <text x={center + 10} y={center - 10} className="fill-slate-400 text-xs">d</text>
                </svg>
            );
        } else if (selectedSolverShape === 'circle') {
            return (
                <svg width={size} height={size} className="mx-auto">
                    <circle cx={center} cy={center} r={60} fill="none" className="stroke-accent-dark stroke-2" />
                    <line x1={center - 60} y1={center} x2={center + 60} y2={center} className="stroke-slate-200 stroke-1" strokeDasharray="4" />
                    <text x={center - 5} y={center - 15} className="fill-slate-400 text-xs">d</text>
                </svg>
            );
        } else if (selectedSolverShape === 'isosceles') {
            return (
                <svg width={size} height={size} className="mx-auto">
                    <path d={`M ${40},${size - 50} L ${size - 40},${size - 50} L ${center},${50} Z`} fill="none" className="stroke-orange-400 stroke-2" />
                    <text x={center} y={size - 35} className="fill-slate-400 text-xs">b</text>
                    <text x={center - 45} y={center} className="fill-slate-400 text-xs">a</text>
                </svg>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[540px] w-full bg-white rounded-[2rem] overflow-hidden relative">
            <AnimatePresence mode="wait">
                {viewMode === 'main' && (
                    <motion.div key="main" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center p-8 w-full max-w-4xl">
                        <h1 className="text-5xl font-black text-slate-800 mb-2">Geometry Lab 🗺️</h1>
                        <p className="text-xl font-bold text-slate-400 mb-12 uppercase tracking-widest">Choose Your Path</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mx-auto">
                            <motion.div onClick={startGame} whileHover={{ y: -8, scale: 1.02 }} className="bg-gradient-to-br from-primary/10 to-primary/5 p-10 rounded-[3rem] cursor-pointer border-b-8 border-primary/20 hover:shadow-popping transition-all group">
                                <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-playful group-hover:rotate-6 transition-transform"><Shapes size={40} /></div>
                                <h2 className="text-3xl font-black text-slate-800 mb-2">Adventure</h2>
                                <p className="text-slate-500 font-bold leading-tight">Master angles & area in a leveling game!</p>
                            </motion.div>
                            <motion.div onClick={() => setViewMode('solver')} whileHover={{ y: -8, scale: 1.02 }} className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-10 rounded-[3rem] cursor-pointer border-b-8 border-secondary/20 hover:shadow-popping transition-all group">
                                <div className="w-20 h-20 bg-secondary text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-playful group-hover:-rotate-6 transition-transform"><Calculator size={40} /></div>
                                <h2 className="text-3xl font-black text-slate-800 mb-2">Lab Tools</h2>
                                <p className="text-slate-500 font-bold leading-tight">Solve any geometric problem step-by-step.</p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {viewMode === 'solver' && (
                    <motion.div key="solver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full h-full p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => { setViewMode('main'); setSelectedSolverShape(null); }} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400"><ChevronLeft size={24} /></button>
                            <h2 className="text-3xl font-black text-slate-800">Geometry Solver</h2>
                        </div>
                        {!selectedSolverShape ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4">
                                {[
                                    { id: 'right_triangle', label: 'Right Triangle', color: 'bg-primary' },
                                    { id: 'equilateral', label: 'Equilateral', color: 'bg-secondary' },
                                    { id: 'isosceles', label: 'Isosceles', color: 'bg-orange-400' },
                                    { id: 'square', label: 'Square', color: 'bg-playful-purple' },
                                    { id: 'circle', label: 'Circle', color: 'bg-accent-dark' },
                                ].map(s => (
                                    <button key={s.id} onClick={() => setSelectedSolverShape(s.id)} className="aspect-square bg-slate-50 hover:bg-white hover:shadow-playful rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all group border-b-4 border-slate-100">
                                        <div className={`p-4 rounded-2xl ${s.color} text-white group-hover:scale-110 transition-transform`}><Shapes size={32} /></div>
                                        <span className="font-black text-slate-700">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-8 items-stretch">
                                <div className="flex-1 space-y-6">
                                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border-b-4 border-slate-100 min-h-[250px] flex flex-col justify-center">
                                        <h3 className="text-center font-black text-slate-800 mb-4 uppercase tracking-widest">{selectedSolverShape.replace('_', ' ')}</h3>
                                        {renderSolverShape()}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(selectedSolverShape === 'right_triangle' || selectedSolverShape === 'isosceles') && (
                                            <>
                                                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase ml-2">Side a</label><input type="number" value={solverInputs.a || ''} onChange={e => setSolverInputs(p => ({ ...p, a: e.target.value }))} className="w-full p-4 bg-white border-4 border-slate-50 rounded-2xl font-black text-xl" /></div>
                                                <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase ml-2">Base b</label><input type="number" value={solverInputs.b || ''} onChange={e => setSolverInputs(p => ({ ...p, b: e.target.value }))} className="w-full p-4 bg-white border-4 border-slate-50 rounded-2xl font-black text-xl" /></div>
                                            </>
                                        )}
                                        {(selectedSolverShape === 'equilateral' || selectedSolverShape === 'square') && (
                                            <div className="space-y-2 col-span-2"><label className="text-xs font-black text-slate-400 uppercase ml-2">Side a</label><input type="number" value={solverInputs.a || ''} onChange={e => setSolverInputs(p => ({ ...p, a: e.target.value }))} className="w-full p-4 bg-white border-4 border-slate-50 rounded-2xl font-black text-xl" /></div>
                                        )}
                                        {selectedSolverShape === 'circle' && (
                                            <div className="space-y-2 col-span-2"><label className="text-xs font-black text-slate-400 uppercase ml-2">Diameter d</label><input type="number" value={solverInputs.d || ''} onChange={e => setSolverInputs(p => ({ ...p, d: e.target.value }))} className="w-full p-4 bg-white border-4 border-slate-50 rounded-2xl font-black text-xl" /></div>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedSolverShape(null)} className="w-full p-4 text-slate-400 font-black hover:text-primary transition-colors">Back to Shape List</button>
                                </div>
                                <div className="w-full md:w-96 bg-slate-50 rounded-[2.5rem] p-8 space-y-4 overflow-y-auto max-h-[500px]">
                                    <div className="flex items-center gap-2 text-slate-800"><Info size={20} /><h4 className="font-black uppercase tracking-widest text-xs">Steps</h4></div>
                                    {solverResults ? (
                                        <div className="space-y-4">
                                            {solverResults.steps.map((step: string, i: number) => (
                                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-4 rounded-2xl border-l-4 border-primary shadow-sm font-bold text-slate-600 text-xs font-mono">{step}</motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-40 flex items-center justify-center text-slate-300 font-bold italic text-center">Enter values to see procedure ✨</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {viewMode === 'game' && (
                    <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full h-full p-6">
                        <AnimatePresence mode="wait">
                            {(gameState === 'playing' || gameState === 'feedback') && (
                                <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-6 w-full h-full">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-b-4 border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div><div className="text-[10px] font-black uppercase text-slate-400">Level</div><div className="text-xl font-black text-primary">{level}</div></div>
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3, 4].map(idx => (
                                                        <div key={idx} className={`w-3 h-3 rounded-full ${idx < questionIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-center font-black text-2xl text-slate-700">{score}</div>
                                            <div className="text-right"><div className="text-[10px] font-black uppercase text-slate-400">Time</div><div className="text-xl font-black text-orange-500">{timeLeft}s</div></div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-[2rem] p-6 relative flex flex-col items-center justify-center min-h-[320px]">
                                            <div className="absolute top-4 text-center px-4"><p className="text-xl font-black text-slate-700 leading-tight">{currentShape?.questionText}</p></div>
                                            {renderGameShape()}
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
                                        <button onClick={() => setViewMode('main')} className="p-3 text-slate-400 font-black text-sm uppercase">Exit Game</button>
                                    </div>
                                    <AnimatePresence>
                                        {isCorrect !== null && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                                <div className={`p-10 rounded-[3rem] shadow-popping flex flex-col items-center text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                    <div className="text-6xl mb-2">{isCorrect ? '🌟' : '💡'}</div>
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
                                        <button onClick={() => setViewMode('main')} className="px-10 py-4 bg-white text-slate-400 font-black rounded-xl shadow-playful border-b-4 border-slate-100 hover:bg-slate-50">Lobby</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeometryQuest;
