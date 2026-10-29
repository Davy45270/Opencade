import type { SoundEffects } from '../../shell/sound';
export const ferrailleEffects: SoundEffects = {
    jump: () => ({ frequency: 460, duration: 0.09, type: 'triangle' }),
    shot: () => ({ frequency: 790, duration: 0.035, type: 'square' }),
    hit: () => ({ frequency: 170, duration: 0.07, type: 'sawtooth' }),
    bonus: () => ({ frequency: 1180, duration: 0.18, type: 'sine' }),
    shield: () => ({ frequency: 880, duration: 0.2, type: 'triangle' }),
    checkpoint: () => ({ frequency: 1040, duration: 0.25, type: 'sine' }),
    life: () => ({ frequency: 120, duration: 0.3, type: 'triangle' }),
    won: () => ({ frequency: 1320, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 95, duration: 0.4, type: 'sawtooth' }),
};
