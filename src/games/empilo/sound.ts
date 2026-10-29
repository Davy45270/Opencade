import type { SoundEffects } from '../../shell/sound';
export const empiloEffects: SoundEffects = {
    move: () => ({ frequency: 310, duration: 0.025, type: 'sine' }),
    rotate: () => ({ frequency: 530, duration: 0.055, type: 'triangle' }),
    soft: () => ({ frequency: 220, duration: 0.025, type: 'sine' }),
    drop: () => ({ frequency: 165, duration: 0.12, type: 'triangle' }),
    lock: () => ({ frequency: 390, duration: 0.06, type: 'sine' }),
    clear: () => ({ frequency: 1175, duration: 0.22, type: 'sine' }),
    won: () => ({ frequency: 1568, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 98, duration: 0.35, type: 'triangle' }),
};
