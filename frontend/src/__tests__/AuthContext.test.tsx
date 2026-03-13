import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the api module
vi.mock('../utils/api', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

import api from '../utils/api';

// Helper component to expose auth context values
const AuthConsumer = () => {
    const { user, isAuthenticated, loading } = useAuth();
    return (
        <div>
            <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
            <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
            <span data-testid="user">{user ? user.name : 'none'}</span>
        </div>
    );
};

const LoginButton = () => {
    const { login } = useAuth();
    return (
        <button onClick={() => login({ credential: 'test-credential' })}>Login</button>
    );
};

const LogoutButton = () => {
    const { logout } = useAuth();
    return <button onClick={() => logout()}>Logout</button>;
};

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('starts unauthenticated when localStorage is empty', async () => {
        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        // Wait for loading to finish
        await screen.findByText('ready');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
        expect(screen.getByTestId('user')).toHaveTextContent('none');
    });

    it('restores user from localStorage on mount', async () => {
        const storedUser = { id: 1, name: 'Yui', email: 'yui@test.com', role: 'child', picture: '' };
        localStorage.setItem('user', JSON.stringify(storedUser));

        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await screen.findByText('ready');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
        expect(screen.getByTestId('user')).toHaveTextContent('Yui');
    });

    it('login() stores user in state and localStorage', async () => {
        const mockUser = { id: 1, name: 'Yui', email: 'yui@test.com', role: 'child', picture: '' };
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: { user: mockUser },
        });

        const { getByText } = render(
            <AuthProvider>
                <AuthConsumer />
                <LoginButton />
            </AuthProvider>
        );

        await screen.findByText('ready');
        await act(async () => {
            getByText('Login').click();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
        expect(screen.getByTestId('user')).toHaveTextContent('Yui');
        expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(mockUser);
    });

    it('logout() clears user state and localStorage', async () => {
        const storedUser = { id: 1, name: 'Yui', email: 'yui@test.com', role: 'child', picture: '' };
        localStorage.setItem('user', JSON.stringify(storedUser));
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

        const { getByText } = render(
            <AuthProvider>
                <AuthConsumer />
                <LogoutButton />
            </AuthProvider>
        );

        await screen.findByText('ready');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');

        await act(async () => {
            getByText('Logout').click();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
        expect(localStorage.getItem('user')).toBeNull();
    });

    it('logout() clears state even if API call fails', async () => {
        const storedUser = { id: 1, name: 'Yui', email: 'yui@test.com', role: 'child', picture: '' };
        localStorage.setItem('user', JSON.stringify(storedUser));
        (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        const { getByText } = render(
            <AuthProvider>
                <AuthConsumer />
                <LogoutButton />
            </AuthProvider>
        );

        await screen.findByText('ready');
        await act(async () => {
            getByText('Logout').click();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });
});
