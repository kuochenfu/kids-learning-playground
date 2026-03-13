import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, ArrowRight, RefreshCw, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';

// A small dictionary for the computer matching
const DICTIONARY: Record<string, string[]> = {
    a: ["apple", "ant", "alligator", "airplane", "arm"],
    b: ["ball", "bear", "banana", "bird", "boat"],
    c: ["cat", "car", "cake", "cup", "cloud"],
    d: ["dog", "duck", "drum", "door", "deer"],
    e: ["egg", "elephant", "eagle", "ear", "earth"],
    f: ["fish", "frog", "flag", "flower", "fire"],
    g: ["goat", "grape", "guitar", "grass", "gift"],
    h: ["hat", "horse", "house", "hand", "heart"],
    i: ["ice", "igloo", "island", "ink", "iron"],
    j: ["jar", "jam", "jacket", "jeep", "juice"],
    k: ["kite", "king", "kangaroo", "key", "koala"],
    l: ["lion", "leaf", "lemon", "lamp", "leg"],
    m: ["monkey", "moon", "mouse", "milk", "mask"],
    n: ["nest", "nose", "net", "night", "nut"],
    o: ["owl", "orange", "octopus", "ocean", "onion"],
    p: ["pig", "pear", "piano", "pencil", "pizza"],
    q: ["queen", "quilt", "quiet", "quack", "quarter"],
    r: ["rabbit", "rain", "robot", "ring", "rope"],
    s: ["sun", "star", "snake", "ship", "socks"],
    t: ["tiger", "tree", "table", "train", "tent"],
    u: ["umbrella", "unicorn", "under", "up", "uncle"],
    v: ["vase", "violin", "van", "vest", "village"],
    w: ["whale", "watch", "water", "wing", "wood"],
    x: ["xylophone", "box", "fox", "six", "ax"],
    y: ["yo-yo", "yellow", "yak", "yard", "yarn"],
    z: ["zebra", "zoo", "zero", "zigzag", "zipper"]
};

const Shiritori: React.FC = () => {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [chain, setChain] = useState<{ word: string; user: boolean }[]>([]);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const startGame = () => {
        setGameState('playing');
        setChain([{ word: "Apple", user: false }]);
        setScore(0);
        setInput("");
        setError(null);
    };

    const finishGame = useCallback(async (finalScore: number) => {
        setGameState('finished');
        try {
            await api.post('/api/score', {
                gameId: 'shiritori',
                score: finalScore,
                duration: 0,
                wrongAnswers: [],
            });
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chain]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const playerWord = input.toLowerCase().trim();
        if (!playerWord) return;

        const lastWord = chain[chain.length - 1].word.toLowerCase();
        const lastLetter = lastWord[lastWord.length - 1];

        // Validation
        if (playerWord[0] !== lastLetter) {
            setError(`Wait! Your word must start with the letter "${lastLetter.toUpperCase()}"`);
            return;
        }
        if (chain.some(item => item.word.toLowerCase() === playerWord)) {
            setError("Oops! That word was already used.");
            return;
        }

        // Success
        const newChain = [...chain, { word: input, user: true }];
        setChain(newChain);
        setInput("");
        setError(null);
        setScore(prev => prev + 50);

        // Computer Turn
        setTimeout(() => {
            const nextLetter = playerWord[playerWord.length - 1];
            const possibleWords = DICTIONARY[nextLetter] || [];
            const unusedWords = possibleWords.filter(w => !newChain.some(item => item.word.toLowerCase() === w.toLowerCase()));

            if (unusedWords.length === 0) {
                // Computer gives up
                setScore(prev => prev + 200);
                finishGame(score + 250);
            } else {
                const computerWord = unusedWords[Math.floor(Math.random() * unusedWords.length)];
                setChain(prev => [...prev, { word: computerWord[0].toUpperCase() + computerWord.slice(1), user: false }]);
            }
        }, 800);
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
                        <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center shadow-playful mx-auto mb-8">
                            <CheckCircle2 className="text-white" size={64} />
                        </div>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Word Chain</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Shiritori! Match the last letter of the previous word. How long can your chain go?
                        </p>
                        <button onClick={startGame} className="btn-secondary text-2xl px-12 py-5 rounded-3xl group">
                            Start Chain! <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-3xl flex flex-col gap-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3">
                                <Star className="text-accent fill-accent" size={20} />
                                <span className="text-xl font-black text-slate-800">{score}</span>
                            </div>
                            <div className="bg-secondary/10 px-6 py-3 rounded-2xl border-2 border-secondary/20 text-secondary font-black">
                                Chain Length: {chain.length}
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="bg-white/50 h-[400px] overflow-y-auto p-8 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col gap-4 scroll-smooth shadow-inner"
                        >
                            {chain.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: item.user ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${item.user ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`px-6 py-4 rounded-3xl shadow-playful font-black text-xl flex flex-col ${item.user ? 'bg-secondary text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border-b-4 border-slate-100'
                                        }`}>
                                        {item.word}
                                        <span className={`text-[10px] mt-1 ${item.user ? 'text-white/60' : 'text-slate-400'}`}>
                                            Ends with: <span className="uppercase text-lg">{item.word[item.word.length - 1]}</span>
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            {input.length > 0 && (
                                <div className="text-center text-slate-400 font-bold text-sm animate-pulse">
                                    Next word must start with: <span className="text-secondary text-lg uppercase font-black">
                                        {chain[chain.length - 1].word[chain[chain.length - 1].word.length - 1]}
                                    </span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="flex gap-4">
                            <div className="flex-1 relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a word..."
                                    className="w-full p-6 bg-white rounded-3xl shadow-playful font-bold text-xl focus:ring-4 focus:ring-secondary/20 outline-none border-b-8 border-slate-100"
                                />
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute -top-12 left-0 right-0 bg-primary text-white p-2 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle size={14} /> {error}
                                    </motion.div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="bg-secondary hover:bg-secondary-dark text-white p-6 rounded-3xl shadow-playful flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                                disabled={!input.trim()}
                            >
                                <Send size={28} />
                            </button>
                        </form>

                        <button
                            onClick={() => finishGame(score)}
                            className="text-slate-400 font-bold hover:text-primary transition-colors text-center text-sm"
                        >
                            I'm stuck, finish game
                        </button>
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
                        <h3 className="text-4xl font-black text-slate-800 mb-2">Chain Master!</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You created a chain of {chain.length} words!</p>
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
                        <button onClick={startGame} className="btn-secondary w-full text-xl py-5 rounded-3xl flex items-center justify-center gap-2">
                            <RefreshCw /> New Chain
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Shiritori;
