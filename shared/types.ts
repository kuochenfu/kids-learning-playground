export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  createdAt: string;
}

export interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  duration: number; // in seconds
  wrongAnswers: string[];
  timestamp: string;
}

export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'Math' | 'English' | 'Science' | 'Logic';
}
