import type { SoundEffects } from '../../shell/sound';
/** Synthesised: a soft slide, a rising tone per merge (higher for bigger tiles), a pop for the new tile. */
export const fusioEffects: SoundEffects = {
    slide: () => ({ frequency: 420, duration: 0.04, type: 'triangle' }),
    merge: size => ({ frequency: 360 + 50 * Math.min(12, size), duration: 0.09, type: 'sine' }),
    refused: () => ({ frequency: 150, duration: 0.06, type: 'sawtooth' }),
    undo: () => ({ frequency: 520, duration: 0.07, type: 'triangle' }),
    hint: () => ({ frequency: 1180, duration: 0.12, type: 'sine' }),
    won: () => ({ frequency: 990, duration: 0.45, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: 0.35, type: 'sawtooth' }),
};
