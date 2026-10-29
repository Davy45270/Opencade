import type { SoundEffects } from '../../shell/sound';
export const dedaleEffects: SoundEffects = {
    turn: () => ({ frequency: 300, duration: 0.035, type: 'sine' }),
    move: () => ({ frequency: 180, duration: 0.025, type: 'sine' }),
    seed: () => ({ frequency: 740, duration: 0.07, type: 'triangle' }),
    sun: () => ({ frequency: 1480, duration: 0.3, type: 'sine' }),
    wisp: () => ({ frequency: 1040, duration: 0.18, type: 'triangle' }),
    mode: () => ({ frequency: 390, duration: 0.12, type: 'sine' }),
    life: () => ({ frequency: 155, duration: 0.25, type: 'triangle' }),
    won: () => ({ frequency: 1180, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: 0.4, type: 'sawtooth' }),
};
