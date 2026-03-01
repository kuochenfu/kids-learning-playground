import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue } from 'framer-motion';
import { Timer, Eye, RotateCcw, Star, Trophy, Home, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface Piece {
    id: number;
    x: number; // grid x
    y: number; // grid y
    currentX: number; // pixel x in board
    currentY: number; // pixel y in board
    isLocked: boolean;
}

const PuzzleTime: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [gridSize, setGridSize] = useState(3); // Defaulting to 3x3 for better demo, can toggle to 5 or 7
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [timeLeft, setTimeLeft] = useState(180);
    const [score, setScore] = useState(0);
    const [showPeek, setShowPeek] = useState(false);
    const [hintOpacity] = useState(0.1);
    const [puzzleImages, setPuzzleImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const carouselRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const boardSize = 600; // 600px square board
    const trayWidth = 180;

    const pieceSize = boardSize / gridSize;

    const generatePieces = useCallback((size: number) => {
        const newPieces: Piece[] = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const margin = 20;
                newPieces.push({
                    id: y * size + x,
                    x,
                    y,
                    // Random starting position in the trays, ensuring they are mostly visible
                    currentX: Math.random() > 0.5
                        ? -trayWidth + margin + Math.random() * (trayWidth - pieceSize - margin * 2)
                        : boardSize + margin + Math.random() * (trayWidth - pieceSize - margin * 2),
                    currentY: margin + Math.random() * (boardSize - pieceSize - margin * 2),
                    isLocked: false,
                });
            }
        }
        // Shuffle positions a bit more
        setPieces(newPieces.sort(() => Math.random() - 0.5));
    }, [pieceSize, boardSize, trayWidth]);

    const startGame = (size: number) => {
        setGridSize(size);
        setGameState('playing');
        setTimeLeft(180);
        setScore(0);
        generatePieces(size);
    };

    const peek = () => {
        if (showPeek) return;
        setShowPeek(true);
        setTimeLeft(prev => Math.max(0, prev - 5)); // 5s penalty
        setTimeout(() => setShowPeek(false), 2000); // 2s duration
    };


    // Check win condition
    useEffect(() => {
        if (gameState === 'playing' && pieces.length > 0 && pieces.every(p => p.isLocked)) {
            const finalScore = Math.floor((timeLeft / 180) * 1000) + (gridSize === 4 ? 400 : gridSize === 5 ? 800 : 0);
            setScore(finalScore);
            setGameState('finished');
            if (token) {
                axios.post(`${API_BASE_URL}/api/score`, {
                    gameId: 'puzzle-time',
                    score: finalScore,
                    timestamp: new Date().toISOString(),
                }, { headers: { Authorization: `Bearer ${token}` } }).catch(console.error);
            }
        }
    }, [pieces, gameState, timeLeft, gridSize, token]);

    // Timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            setGameState('finished');
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        const fetchPuzzles = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/puzzles`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPuzzleImages(res.data);
            } catch (err) {
                console.error('Failed to fetch puzzles:', err);
                setPuzzleImages(['/assets/puzzle/kitten.png']);
            }
        };
        if (token) fetchPuzzles();
    }, [token]);

    const resolveImageUrl = (url: string) => {
        if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
        return url;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/puzzles/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            const newUrl = res.data.url;
            setPuzzleImages(prev => [...prev, newUrl]);
            setSelectedImageIndex(puzzleImages.length); // Select new upload
        } catch (err: any) {
            console.error('Upload failed:', err);
            alert(err.response?.data?.error || 'Upload failed. Please check file size and format.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, imgUrl: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this puzzle?') || !token) return;

        const filename = imgUrl.split('/').pop();
        try {
            await axios.delete(`${API_BASE_URL}/api/puzzles/${filename}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPuzzleImages(prev => prev.filter(img => img !== imgUrl));
            if (puzzleImages[selectedImageIndex] === imgUrl) {
                setSelectedImageIndex(0);
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete image.');
        }
    };

    const currentPuzzleImage = resolveImageUrl(puzzleImages[selectedImageIndex] || '/assets/puzzle/kitten.png');

    // Auto-scroll logic
    useEffect(() => {
        if (itemRefs.current[selectedImageIndex]) {
            itemRefs.current[selectedImageIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedImageIndex, puzzleImages]);

    const lockPiece = (id: number) => {
        setPieces(prev => prev.map(p => p.id === id ? { ...p, isLocked: true } : p));
    };

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[600px] bg-[#FFF9F0] rounded-[2.5rem] p-8 overflow-hidden">
            <AnimatePresence mode="wait">
                {gameState === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-8"
                    >
                        {/* Image Selection Carousel */}
                        <div className="relative w-full max-w-4xl px-12">
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Choose your puzzle!</h3>
                            <div
                                ref={carouselRef}
                                className="flex items-center gap-8 overflow-x-auto py-10 px-[35%] snap-x no-scrollbar scroll-smooth"
                            >
                                {puzzleImages.map((img, idx) => (
                                    <motion.div
                                        key={img}
                                        ref={el => { itemRefs.current[idx] = el; }}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`relative flex-shrink-0 w-40 h-40 rounded-[2.5rem] cursor-pointer transition-all snap-center group ${selectedImageIndex === idx
                                            ? 'ring-[12px] ring-[#FFB7CE] shadow-popping scale-110 z-10'
                                            : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-105'
                                            }`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: selectedImageIndex === idx ? 1.1 : 1 }}
                                    >
                                        <img
                                            src={resolveImageUrl(img)}
                                            className="w-full h-full object-cover rounded-[2.2rem]"
                                            alt={`Puzzle ${idx + 1}`}
                                        />
                                        {selectedImageIndex === idx && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-3 -right-3 bg-[#B2E2F2] p-2 rounded-full shadow-playful z-20"
                                            >
                                                🐾
                                            </motion.div>
                                        )}
                                        {/* Delete Button for authorized user */}
                                        {user?.email === 'kuochenfu@gmail.com' && img.startsWith('/uploads') && (
                                            <button
                                                onClick={(e) => handleDelete(e, img)}
                                                className="absolute -bottom-2 -left-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}

                                {/* Upload Button - Restricted to authorized user */}
                                {user?.email === 'kuochenfu@gmail.com' && (
                                    <label className="flex-shrink-0 w-40 h-40 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors p-4 text-center snap-center">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                        {isUploading ? (
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFB7CE]"></div>
                                        ) : (
                                            <>
                                                <Plus size={32} className="text-slate-300" />
                                                <span className="text-xs font-black text-slate-400 uppercase mt-2">New Card</span>
                                                <span className="text-[10px] font-bold text-slate-300 mt-1 leading-tight">JPG / PNG / WEBP<br />Max 5MB</span>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>

                            {/* Scroll Arrows */}
                            <button
                                onClick={() => setSelectedImageIndex(prev => Math.max(0, prev - 1))}
                                className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-slate-300 hover:text-[#FFB7CE] transition-colors"
                            >
                                <ChevronLeft size={48} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => setSelectedImageIndex(prev => Math.min(puzzleImages.length - 1, prev + 1))}
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-slate-300 hover:text-[#FFB7CE] transition-colors"
                            >
                                <ChevronRight size={48} strokeWidth={3} />
                            </button>
                        </div>

                        <h2 className="text-5xl font-black text-slate-800 tracking-tight">Puzzle Time!</h2>
                        <p className="text-xl font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                            Assemble the cute kitten puzzle before time runs out!
                        </p>

                        <div className="flex flex-wrap justify-center gap-6">
                            <button onClick={() => startGame(3)} className="px-10 py-5 bg-[#B2E2F2] text-slate-700 font-black rounded-3xl shadow-playful hover:scale-105 transition-transform flex flex-col items-center">
                                <span className="text-2xl">3 x 3</span>
                                <span className="text-xs opacity-60">Starter 🐣</span>
                            </button>
                            <button onClick={() => startGame(4)} className="px-10 py-5 bg-[#FFB7CE] text-white font-black rounded-3xl shadow-playful hover:scale-105 transition-transform flex flex-col items-center">
                                <span className="text-2xl">4 x 4</span>
                                <span className="text-xs opacity-80">Pro 🐱</span>
                            </button>
                            <button onClick={() => startGame(5)} className="px-10 py-5 bg-playful-purple text-white font-black rounded-3xl shadow-playful hover:scale-105 transition-transform flex flex-col items-center">
                                <span className="text-2xl">5 x 5</span>
                                <span className="text-xs opacity-80">Master 🦁</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'playing' && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full flex flex-col items-center gap-8"
                    >
                        {/* Status Bar */}
                        <div className="w-full max-w-4xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3 transition-colors ${timeLeft < 20 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-600'}`}>
                                    <Timer size={24} />
                                    <span className="text-2xl font-black">{timeLeft}s</span>
                                </div>
                                <div className="bg-white px-6 py-3 rounded-2xl shadow-playful flex items-center gap-3">
                                    <div className="flex gap-1 text-[#FFB7CE]">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={18} fill={i < Math.floor(score / 200) ? 'currentColor' : 'none'} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={peek}
                                    disabled={showPeek}
                                    className="p-4 bg-white hover:bg-slate-50 rounded-2xl shadow-playful text-slate-500 flex items-center gap-2 font-bold transition-all disabled:opacity-50"
                                >
                                    <Eye size={20} /> Peek ( -5s )
                                </button>
                                <button
                                    onClick={() => setGameState('idle')}
                                    className="p-4 bg-white hover:bg-slate-50 rounded-2xl shadow-playful text-slate-500"
                                >
                                    <RotateCcw size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar (Paw Prints) */}
                        <div className="w-full max-w-2xl h-6 bg-white rounded-full p-1 shadow-inner relative overflow-hidden border-2 border-[#FFB7CE]/20">
                            <motion.div
                                className="h-full bg-[#FFB7CE] rounded-full flex items-center justify-end px-2"
                                animate={{ width: `${(pieces.filter(p => p.isLocked).length / pieces.length) * 100}%` }}
                            >
                                <span className="text-[10px] text-white font-black">🐾</span>
                            </motion.div>
                        </div>

                        {/* Puzzle Board & Trays */}
                        <div className="relative flex items-center justify-center gap-12 mt-4 select-none">
                            {/* Board */}
                            <div
                                className="relative bg-white shadow-popping rounded-2xl border-8 border-white overflow-visible box-content"
                                style={{ width: boardSize, height: boardSize }}
                            >
                                {/* Ghost Hint */}
                                <div
                                    className="absolute inset-0 transition-opacity duration-1000"
                                    style={{
                                        backgroundImage: `url(${currentPuzzleImage})`,
                                        backgroundSize: `${boardSize}px ${boardSize}px`,
                                        opacity: showPeek ? 1 : hintOpacity
                                    }}
                                />

                                {/* Grid Slots */}
                                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                                    {[...Array(gridSize * gridSize)].map((_, i) => (
                                        <div key={i} className="border border-slate-100/30" />
                                    ))}
                                </div>

                                {/* Placed Pieces Layer */}
                                {pieces.map((piece) => (
                                    <PuzzlePiece
                                        key={piece.id}
                                        piece={piece}
                                        pieceSize={pieceSize}
                                        boardSize={boardSize}
                                        puzzleImage={currentPuzzleImage}
                                        onLock={() => lockPiece(piece.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {gameState === 'finished' && (
                    <motion.div
                        key="finished"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center max-w-xl bg-white p-12 rounded-[4rem] shadow-popping border-b-[12px] border-[#B2E2F2]"
                    >
                        <div className="w-32 h-32 bg-[#FFB7CE] rounded-full flex items-center justify-center mx-auto mb-8 shadow-playful relative">
                            <Trophy className="text-white" size={64} />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute -top-2 -right-2 text-4xl"
                            >
                                ✨
                            </motion.div>
                        </div>

                        <h3 className="text-5xl font-black text-slate-800 mb-4">Purr-fect! 🐱</h3>
                        <p className="text-xl font-bold text-slate-500 mb-10">You completed the {gridSize}x{gridSize} puzzle!</p>

                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-[#FFF9F0] p-8 rounded-[2.5rem] border-b-4 border-[#FFB7CE]/20">
                                <span className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-1">Score</span>
                                <span className="text-4xl font-black text-slate-800">{score.toLocaleString()}</span>
                            </div>
                            <div className="bg-[#FFF9F0] p-8 rounded-[2.5rem] border-b-4 border-[#B2E2F2]/20">
                                <span className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-1">Stars</span>
                                <span className="text-4xl font-black text-[#FFB7CE]">+{Math.floor(score / 10)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button onClick={() => setGameState('idle')} className="btn-secondary text-xl py-5 rounded-3xl w-full">
                                <RotateCcw /> Play Another
                            </button>
                            <button onClick={() => navigate('/')} className="px-8 py-5 border-4 border-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                <Home size={20} /> Back to Lobby
                            </button>
                        </div>

                        {/* Confetti (Visual) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Celebration effects can go here */}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PuzzlePiece: React.FC<{
    piece: Piece;
    pieceSize: number;
    boardSize: number;
    puzzleImage: string;
    onLock: () => void;
}> = ({ piece, pieceSize, boardSize, puzzleImage, onLock }) => {
    const controls = useAnimation();
    const x = useMotionValue(piece.currentX);
    const y = useMotionValue(piece.currentY);
    const [isPlaced, setIsPlaced] = useState(false);
    const [showMeow, setShowMeow] = useState(false);

    const handleDragEnd = () => {
        if (isPlaced) return;

        const currentX = x.get();
        const currentY = y.get();

        const targetX = piece.x * pieceSize;
        const targetY = piece.y * pieceSize;

        const distance = Math.sqrt(
            Math.pow(currentX - targetX, 2) +
            Math.pow(currentY - targetY, 2)
        );

        if (distance < 60) { // Very generous snap radius
            setIsPlaced(true);
            setShowMeow(true);
            onLock();
            controls.start({
                x: targetX,
                y: targetY,
                scale: 1,
                rotate: 0,
                transition: { type: 'spring', stiffness: 600, damping: 35 }
            });
            // Update physical values so we don't jump on next state hit
            x.set(targetX);
            y.set(targetY);
            setTimeout(() => setShowMeow(false), 1000);
        }
    };

    return (
        <motion.div
            drag={!isPlaced}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={controls}
            initial={{
                x: piece.currentX,
                y: piece.currentY,
                scale: 1,
                rotate: (Math.random() - 0.5) * 20
            }}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 100 }}
            className={`absolute cursor-grab active:cursor-grabbing ${isPlaced ? 'pointer-events-none z-0' : 'z-10'}`}
            style={{
                x, y,
                width: pieceSize,
                height: pieceSize,
                backgroundImage: `url(${puzzleImage})`,
                backgroundSize: `${boardSize}px ${boardSize}px`,
                backgroundPosition: `-${piece.x * pieceSize}px -${piece.y * pieceSize}px`,
                boxShadow: isPlaced ? 'none' : '0 10px 20px rgba(0,0,0,0.1)',
                border: isPlaced ? 'none' : '2px solid white',
                borderRadius: isPlaced ? '0' : '8px'
            }}
        >
            {showMeow && (
                <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -50, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                    <span className="text-[#FFB7CE] font-black text-2xl drop-shadow-md">Meow! 🐾</span>
                </motion.div>
            )}
            {isPlaced && (
                <motion.div
                    initial={{ opacity: 0, scale: 2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <span className="text-white text-xs opacity-50">✨</span>
                </motion.div>
            )}
        </motion.div>
    );
};

export default PuzzleTime;
