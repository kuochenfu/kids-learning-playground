import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import Lobby from '../pages/Lobby';

// Mock the api module
vi.mock('../utils/api', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] }),
    },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, name: 'Yui', email: 'yui@test.com', role: 'child', picture: '' },
        isAuthenticated: true,
        loading: false,
    }),
}));

describe('Lobby', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <Lobby />
            </MemoryRouter>
        );
        expect(screen.getByText(/Hi, Yui/i)).toBeInTheDocument();
    });

    it('renders all 10 game cards', () => {
        render(
            <MemoryRouter>
                <Lobby />
            </MemoryRouter>
        );

        const expectedGames = [
            'Speed Math Challenge',
            'Word Builder',
            'Sentence Scramble',
            'Word Chain (Shiritori)',
            '20 Questions',
            'Adverb Charades',
            'Science Quiz',
            'Logic Puzzles',
            'Puzzle Time!',
            'Geometry Quest',
        ];

        for (const title of expectedGames) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
    });

    it('renders star counter area', () => {
        render(
            <MemoryRouter>
                <Lobby />
            </MemoryRouter>
        );
        expect(screen.getByText('Total Stars')).toBeInTheDocument();
    });
});
