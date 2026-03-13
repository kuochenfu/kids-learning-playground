import React, { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-[3rem] shadow-popping p-12 max-w-lg w-full text-center border-b-8 border-primary/20">
                        <div className="text-6xl mb-6">😬</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4">Something went wrong!</h2>
                        <p className="text-lg font-bold text-slate-500 mb-8">
                            Don't worry — it's not your fault. Let's try again!
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-primary text-xl px-10 py-4 rounded-2xl"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
