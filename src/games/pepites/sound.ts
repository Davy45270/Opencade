import type { SoundEffects } from '../../shell/sound';
export const pepitesEffects: SoundEffects = {
    dig: () => ({ frequency: 160, duration: 0.03, type: 'triangle' }),
    nugget: () => ({ frequency: 1320, duration: 0.12, type: 'sine' }),
    push: () => ({ frequency: 120, duration: 0.08, type: 'square' }),
    fall: () => ({ frequency: 90, duration: 0.06, type: 'triangle' }),
    blast: () => ({ frequency: 70, duration: 0.35, type: 'sawtooth' }),
    sort: () => ({ frequency: 880, duration: 0.1, type: 'sine' }),
    water: () => ({ frequency: 300, duration: 0.07, type: 'sine' }),
    moss: () => ({ frequency: 240, duration: 0.05, type: 'sine' }),
    open: () => ({ frequency: 990, duration: 0.3, type: 'triangle' }),
    prop: () => ({ frequency: 600, duration: 0.2, type: 'square' }),
    won: () => ({ frequency: 1175, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: 0.35, type: 'sawtooth' }),
};
