import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Sparkles, Gamepad2, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (isAuthenticated && !loading) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);

    return (
        <div className="min-h-screen bg-grad-playful flex flex-col items-center justify-center p-6 bg-slate-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full max-w-md bg-white p-10 rounded-3xl shadow-popping border-b-8 border-slate-100/50"
            >
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                        className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-playful mb-6"
                    >
                        <Gamepad2 className="text-white" size={48} />
                    </motion.div>

                    <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight text-center">
                        Hi, Yui! 🌟
                    </h1>
                    <p className="text-slate-500 font-bold text-lg text-center leading-relaxed">
                        Ready for your <span className="text-primary font-black uppercase tracking-widest text-sm">learning journey</span>?
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col items-center min-h-[50px] justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
                                <Loader2 className="animate-spin" size={40} />
                                <span className="font-bold">Signing you in...</span>
                            </div>
                        ) : (
                            <GoogleLogin
                                onSuccess={credentialResponse => {
                                    login(credentialResponse);
                                }}
                                onError={() => {
                                    console.log('Login Failed');
                                }}
                                useOneTap
                                shape="pill"
                                theme="outline"
                                size="large"
                                text="continue_with"
                            />
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-100 text-center">
                        <p className="text-sm font-bold text-slate-400 flex items-center justify-center gap-2">
                            <Sparkles className="text-accent" size={16} />
                            Unlock stars and badges as you go!
                        </p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-slate-400 font-bold text-sm"
            >
                Parent Portal • Login with Google to start
            </motion.div>
        </div>
    );
};

export default Login;
