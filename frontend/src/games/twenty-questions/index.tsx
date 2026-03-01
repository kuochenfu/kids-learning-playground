import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, HelpCircle, RefreshCw, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const MYSTERIES = [
    {
        answer: "Elephant",
        facts: { isAnimal: true, canFly: false, isBig: true, hasFur: false, livesInWater: false, hasTrunk: true, isHeavy: true },
        hints: ["It's very large.", "It has a long nose.", "It lives in the savannah."]
    },
    {
        answer: "Banana",
        facts: { isAnimal: false, canFly: false, isBig: false, isYellow: true, isFruit: true, growsOnTree: true, canEat: true },
        hints: ["It's curved and yellow.", "Monkeys love it.", "You have to peel it."]
    },
    {
        answer: "Airplane",
        facts: { isAnimal: false, canFly: true, isBig: true, isMachine: true, carriesPeople: true, hasWings: true, needsElectricity: true },
        hints: ["It has wings.", "It flies in the sky.", "It has a pilot."]
    },
    {
        answer: "Pizza",
        facts: { isAnimal: false, isBig: false, canEat: true, isFruit: false, isYellow: false, canBeFoundInside: true },
        hints: ["It's round and cut into slices.", "It has cheese and tomato sauce.", "Italian favorite."]
    },
    {
        answer: "Bicycle",
        facts: { isAnimal: false, isBig: false, hasWheels: true, isMachine: true, needsElectricity: false },
        hints: ["It has two wheels.", "You peddle it with your legs.", "It has a bell."]
    },
    {
        answer: "Cat",
        facts: { isAnimal: true, isBig: false, hasFur: true, hasLegs: true, canBePet: true },
        hints: ["It says 'Meow'.", "It likes to chase mice.", "It has sharp claws."]
    },
    {
        answer: "Computer",
        facts: { isAnimal: false, isMachine: true, needsElectricity: true, canBeFoundInside: true, hasScreen: true },
        hints: ["You can play games on it.", "It has a keyboard.", "Connected to the internet."]
    },
    {
        answer: "Tree",
        facts: { isAnimal: false, growsOnGround: true, isBig: true, hasLeaves: true, isWood: true },
        hints: ["It has a trunk.", "Birds build nests in it.", "It changes colors in autumn."]
    },
    {
        answer: "Robot",
        facts: { isAnimal: false, isMachine: true, needsElectricity: true, madeOfMetal: true },
        hints: ["It's built by engineers.", "It can follow commands.", "Think of Wall-E."]
    },
    {
        answer: "Moon",
        facts: { isAnimal: false, isBig: true, canFly: true, glowsAtNight: true },
        hints: ["It orbits the Earth.", "It's not a star.", "Astronauts walked on it."]
    },
    {
        answer: "Book",
        facts: { isAnimal: false, isBig: false, madeOfPaper: true, canBeFoundInside: true, isWood: false },
        hints: ["It has many pages.", "You read it.", "It has a cover."]
    },
    {
        answer: "Goldfish",
        facts: { isAnimal: true, livesInWater: true, isYellow: true, isBig: false },
        hints: ["It lives in a bowl.", "It's a popular first pet.", "It has fins."]
    },
    {
        answer: "Violin",
        facts: { isAnimal: false, isWood: true, makesNoise: true, canBeFoundInside: true, isMachine: false },
        hints: ["It's a musical instrument.", "You use a bow to play it.", "It has four strings."]
    },
    {
        answer: "T-Shirt",
        facts: { isAnimal: false, canWear: true, canBeFoundInside: true, isBig: false },
        hints: ["You wear it on your body.", "It has short sleeves.", "Made of fabric."]
    },
    {
        answer: "Basketball",
        facts: { isAnimal: false, isBig: false, isRound: true, forSports: true },
        hints: ["It's orange.", "You bounce it.", "You throw it into a hoop."]
    }
];

const QUESTIONS = [
    { id: 'isAnimal', text: "Is it an animal?" },
    { id: 'canFly', text: "Does it fly?" },
    { id: 'isBig', text: "Is it bigger than a car?" },
    { id: 'hasFur', text: "Does it have fur?" },
    { id: 'isYellow', text: "Is it yellow?" },
    { id: 'canEat', text: "Can you eat it?" },
    { id: 'isMachine', text: "Is it a machine?" },
    { id: 'needsElectricity', text: "Does it need electricity?" },
    { id: 'hasWheels', text: "Does it have wheels?" },
    { id: 'hasLegs', text: "Does it have legs?" },
    { id: 'madeOfMetal', text: "Is it made of metal?" },
    { id: 'isWood', text: "Is it made of wood?" },
    { id: 'hasScreen', text: "Does it have a screen?" },
    { id: 'canBeFoundInside', text: "Can it be found inside a house?" },
    { id: 'glowsAtNight', text: "Does it glow at night?" },
    { id: 'madeOfPaper', text: "Is it made of paper?" },
    { id: 'livesInWater', text: "Does it live in water?" },
    { id: 'makesNoise', text: "Does it make noise?" },
    { id: 'canWear', text: "Can you wear it?" },
    { id: 'isRound', text: "Is it round?" },
    { id: 'forSports', text: "Is it used for sports?" }
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const TwentyQuestions: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'guessing' | 'finished'>('idle');
    const [mystery, setMystery] = useState(MYSTERIES[0]);
    const [askedCount, setAskedCount] = useState(0);
    const [history, setHistory] = useState<{ q: string; ans: boolean }[]>([]);
    const [score, setScore] = useState(0);
    const [guess, setGuess] = useState("");

    const startNewMystery = useCallback(() => {
        const m = MYSTERIES[Math.floor(Math.random() * MYSTERIES.length)];
        setMystery(m);
        setAskedCount(0);
        setHistory([]);
        setGuess("");
        setGameState('playing');
    }, []);

    const handleAsk = (qId: keyof typeof mystery.facts, qText: string) => {
        const ans = !!mystery.facts[qId];
        setHistory(prev => [...prev, { q: qText, ans }]);
        setAskedCount(prev => prev + 1);
        if (askedCount >= 20) setGameState('guessing');
    };

    const handleGuess = (e: React.FormEvent) => {
        e.preventDefault();
        if (guess.toLowerCase().trim() === mystery.answer.toLowerCase()) {
            // Scoring: Efficiency bonus. Max 1000, drops by 40 for each question asked.
            const missionScore = Math.max(200, 1000 - (askedCount * 40));
            setScore(missionScore);
            finishGame(missionScore);
        } else {
            setGameState('finished');
            finishGame(0);
        }
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await axios.post(`${API_BASE_URL}/api/score`, {
                gameId: 'twenty-questions',
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
                        <div className="w-32 h-32 bg-secondary rounded-[2.5rem] flex items-center justify-center shadow-playful mx-auto">
                            <HelpCircle className="text-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">20 Questions</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Form interrogative sentences to find the secret object! Can you solve it in under 20 tries?
                        </p>
                        <div className="flex flex-col gap-4 items-center">
                            <button onClick={startNewMystery} className="btn-secondary text-2xl px-12 py-5 rounded-3xl group w-fit">
                                Start Guessing! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                            </button>
                            <button onClick={() => navigate('/lobby')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">
                                Return to Lobby
                            </button>
                        </div>
                    </motion.div>
                )}

                {(gameState === 'playing' || gameState === 'guessing') && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl flex flex-col gap-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3">
                                <MessageCircle className="text-secondary" />
                                <span className="text-xl font-black text-slate-800">{askedCount} / 20</span>
                            </div>
                            <button
                                onClick={() => setGameState('guessing')}
                                className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-2xl font-black shadow-playful transition-all"
                            >
                                I Know It! 💡
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Question Selection */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                    <HelpCircle className="text-secondary" size={20} /> Ask a Question:
                                </h3>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {QUESTIONS.map((q) => (
                                        <button
                                            key={q.id}
                                            onClick={() => handleAsk(q.id as any, q.text)}
                                            disabled={history.some(h => h.q === q.text) || gameState === 'guessing'}
                                            className="w-full p-5 text-left bg-white rounded-2xl border-b-4 border-slate-100 hover:border-secondary hover:translate-x-1 transition-all flex items-center justify-between group disabled:opacity-50"
                                        >
                                            <span className="font-bold text-slate-700">{q.text}</span>
                                            <ArrowRight className="text-slate-300 group-hover:text-secondary opacity-0 group-hover:opacity-100 transition-all" size={18} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Interaction History */}
                            <div className="bg-slate-50 rounded-[3rem] p-8 min-h-[400px] border-4 border-dashed border-slate-200">
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Your Notebook</h3>
                                <div className="space-y-4">
                                    {history.length === 0 && (
                                        <p className="text-center text-slate-300 font-bold mt-12 italic">Ask your first question...</p>
                                    )}
                                    {history.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border-b-2 border-slate-100"
                                        >
                                            <span className="font-bold text-slate-600 italic">"{item.q}"</span>
                                            {item.ans ? (
                                                <div className="flex items-center gap-1 text-secondary font-black">
                                                    <CheckCircle2 size={16} /> YES
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-primary font-black">
                                                    <XCircle size={16} /> NO
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {gameState === 'guessing' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-10 rounded-[3rem] shadow-popping border-4 border-secondary/20"
                            >
                                <h3 className="text-2xl font-black text-center mb-6">What is the secret object?</h3>
                                <form onSubmit={handleGuess} className="flex gap-4">
                                    <input
                                        value={guess}
                                        onChange={(e) => setGuess(e.target.value)}
                                        autoFocus
                                        placeholder="Type your guess here..."
                                        className="flex-1 p-6 bg-slate-50 rounded-2xl font-bold text-xl outline-none focus:ring-4 focus:ring-secondary/20 transition-all"
                                    />
                                    <button type="submit" className="btn-secondary px-10 rounded-2xl">Guess!</button>
                                </form>
                            </motion.div>
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
                        <div className={`w-24 h-24 ${guess.toLowerCase().trim() === mystery.answer.toLowerCase() ? 'bg-secondary' : 'bg-primary'} rounded-full flex items-center justify-center shadow-playful mx-auto mb-8`}>
                            {guess.toLowerCase().trim() === mystery.answer.toLowerCase() ? <Trophy className="text-white" size={48} /> : <XCircle className="text-white" size={48} />}
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-2">
                            {guess.toLowerCase().trim() === mystery.answer.toLowerCase() ? "Brilliant!" : "Aww, Not Quite!"}
                        </h3>
                        <p className="text-xl font-bold text-slate-500 mb-4">
                            The secret object was <span className="text-secondary font-black">{mystery.answer}</span>.
                        </p>
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Final Score</div>
                                <div className="text-4xl font-black text-secondary">{score}</div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border-b-4 border-slate-100">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Stars Gained</div>
                                <div className="text-4xl font-black text-primary">+{Math.floor(score / 10)}</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button onClick={startNewMystery} className="btn-secondary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-2">
                                <RefreshCw /> Play Again
                            </button>
                            <button onClick={() => navigate('/lobby')} className="btn-primary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-2">
                                Return to Lobby
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TwentyQuestions;
