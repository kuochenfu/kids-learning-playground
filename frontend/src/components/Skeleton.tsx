import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 rounded-3xl ${className}`} />
);

export const SkeletonCard: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse bg-white rounded-[2.5rem] shadow-playful p-8 flex flex-col gap-4 ${className}`}>
        <div className="w-16 h-16 bg-slate-200 rounded-full" />
        <div className="h-6 bg-slate-200 rounded-2xl w-3/4" />
        <div className="h-4 bg-slate-100 rounded-xl w-1/2" />
    </div>
);
