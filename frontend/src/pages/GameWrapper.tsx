import React, { Suspense, lazy, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, HelpCircle } from 'lucide-react';

const GameWrapper: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // Dynamic Import based on ID
    const GameComponent = useMemo(() => {
        if (!id) return null;
        return lazy(() => import(`../games/${id}/index.tsx`));
    }, [id]);

    if (!id) {
        return <div className="text-center p-20 text-slate-500 font-bold">No game selected!</div>;
    }

    return (
        <div className="space-y-6">
            {/* Game Toolbar */}
            <div className="flex items-center justify-between mb-8">
                <Link to="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-primary transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Lobby
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-playful transition-colors text-slate-500"
                        title="Restart Game"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-playful transition-colors text-slate-500"
                        title="How to Play"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {/* Game Stage */}
            <div className="bg-white rounded-[3rem] p-1 shadow-popping border-b-8 border-slate-100/50 overflow-hidden min-h-[600px] flex items-stretch">
                <div className="flex-1 bg-slate-50/50 rounded-[2.8rem] m-1 p-6 relative">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center min-h-[540px] gap-6">
                            <motion.div
                                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
                            />
                            <p className="text-xl font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">
                                Preparing Fun... 🚀
                            </p>
                        </div>
                    }>
                        {GameComponent ? (
                            <GameComponent />
                        ) : (
                            <div className="flex items-center justify-center min-h-[540px]">
                                <p className="text-xl font-bold text-slate-400">Game not found!</p>
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default GameWrapper;
