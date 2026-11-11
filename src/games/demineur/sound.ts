import type { SoundEffects } from '../../shell/sound';
/** Synthesised: a soft tick per dug cell, a rising sweep for a cascade, a cloth snap for a flag, a low thud for a mine. */
export const demineurEffects: SoundEffects = {
    dig: () => ({ frequency: 620, duration: 0.04, type: 'triangle' }),
    cascade: () => ({ frequency: 880, duration: 0.16, type: 'sine' }),
    flag: () => ({ frequency: 980, duration: 0.06, type: 'square' }),
    unflag: () => ({ frequency: 520, duration: 0.05, type: 'square' }),
    tool: () => ({ frequency: 740, duration: 0.05, type: 'sine' }),
    hint: () => ({ frequency: 1180, duration: 0.12, type: 'sine' }),
    nohint: () => ({ frequency: 300, duration: 0.1, type: 'triangle' }),
    refused: () => ({ frequency: 160, duration: 0.07, type: 'sawtooth' }),
    boom: () => ({ frequency: 70, duration: 0.4, type: 'sawtooth' }),
    won: () => ({ frequency: 990, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: 0.35, type: 'sawtooth' }),
};
