import { useCallback, useRef } from 'react';

const useSound = () => {
    const ctxRef = useRef<AudioContext | null>(null);

    const getCtx = (): AudioContext | null => {
        try {
            if (!ctxRef.current) {
                ctxRef.current = new AudioContext();
            }
            return ctxRef.current;
        } catch {
            return null;
        }
    };

    const playTone = useCallback((frequencies: number[], durations: number[], gainValue = 0.3) => {
        const ctx = getCtx();
        if (!ctx) return;
        try {
            let time = ctx.currentTime;
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(gainValue, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
                osc.start(time);
                osc.stop(time + durations[i]);
                time += durations[i];
            });
        } catch {
            // Browser may block audio without user gesture — silently ignore
        }
    }, []);

    const playCorrect = useCallback(() => {
        playTone([440, 880], [0.1, 0.1]);
    }, [playTone]);

    const playWrong = useCallback(() => {
        playTone([220, 110], [0.15, 0.15], 0.2);
    }, [playTone]);

    const playComplete = useCallback(() => {
        playTone([523, 659, 784, 1047], [0.08, 0.08, 0.08, 0.16]);
    }, [playTone]);

    return { playCorrect, playWrong, playComplete };
};

export default useSound;
