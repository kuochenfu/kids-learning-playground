import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../../../shared/types';
import api from '../utils/api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (googleResponse: { credential: string }) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Clean up legacy token key left by old auth code
        localStorage.removeItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (googleResponse: { credential: string }) => {
        setLoading(true);
        setUser(null);
        localStorage.removeItem('user');

        try {
            // Backend sets the httpOnly JWT cookie automatically.
            // We only store the non-sensitive user profile in localStorage.
            const response = await api.post('/api/auth/google', {
                credential: googleResponse.credential,
            });
            const { user: backendUser } = response.data;
            setUser(backendUser);
            localStorage.setItem('user', JSON.stringify(backendUser));
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // Best-effort — clear local state regardless
        }
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // remove legacy key from old auth code
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
