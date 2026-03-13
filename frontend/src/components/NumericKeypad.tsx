import React from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
    onInput: (digit: string) => void;
    onDelete: () => void;
    allowDecimal?: boolean;
    disabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ onInput, onDelete, allowDecimal = false, disabled = false }) => {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
        <div className="grid grid-cols-3 gap-2">
            {digits.map(d => (
                <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => onInput(d)}
                    className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all py-4 rounded-xl text-xl font-black text-slate-700 border-b-4 border-slate-200 disabled:opacity-40"
                >
                    {d}
                </button>
            ))}
            <button
                type="button"
                disabled={disabled || !allowDecimal}
                onClick={() => allowDecimal && onInput('.')}
                className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all py-4 rounded-xl text-xl font-black text-slate-700 border-b-4 border-slate-200 disabled:opacity-40"
            >
                {allowDecimal ? '.' : ''}
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onInput('0')}
                className="bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all py-4 rounded-xl text-xl font-black text-slate-700 border-b-4 border-slate-200 disabled:opacity-40"
            >
                0
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={onDelete}
                className="bg-slate-50 hover:bg-primary/10 active:scale-95 transition-all py-4 rounded-xl text-xl font-black text-primary border-b-4 border-slate-200 flex items-center justify-center disabled:opacity-40"
            >
                <Delete size={20} />
            </button>
        </div>
    );
};
