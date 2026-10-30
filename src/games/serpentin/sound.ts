import type { SoundEffects } from '../../shell/sound';
export const serpentinEffects: SoundEffects = {
    turn: () => ({ frequency: 280, duration: 0.035, type: 'sine' }),
    apple: () => ({ frequency: 880, duration: 0.13, type: 'triangle' }),
    crystal: () => ({ frequency: 1320, duration: 0.24, type: 'sine' }),
    portal: () => ({ frequency: 620, duration: 0.12, type: 'sine' }),
    scissors: () => ({ frequency: 420, duration: 0.16, type: 'square' }),
    won: () => ({ frequency: 1040, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 130, duration: 0.35, type: 'sawtooth' }),
};
