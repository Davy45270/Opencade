import type { SoundEffects } from '../../shell/sound';
export const briqueterieEffects: SoundEffects = {
    launch: () => ({ frequency: 420, duration: 0.09, type: 'triangle' }),
    bounce: () => ({ frequency: 340, duration: 0.025, type: 'sine' }),
    paddle: () => ({ frequency: 510, duration: 0.07, type: 'triangle' }),
    brick: () => ({ frequency: 790, duration: 0.08, type: 'triangle' }),
    bonus: () => ({ frequency: 1280, duration: 0.2, type: 'sine' }),
    life: () => ({ frequency: 180, duration: 0.22, type: 'sine' }),
    won: () => ({ frequency: 1080, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: 0.35, type: 'sawtooth' }),
};
