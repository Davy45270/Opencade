import type { SoundEffects } from '../../shell/sound';
export const alunirEffects: SoundEffects = {
    thrust: () => ({ frequency: 90, duration: 0.08, type: 'sawtooth' }),
    life: () => ({ frequency: 160, duration: 0.15, type: 'triangle' }),
    won: () => ({ frequency: 980, duration: 0.4, type: 'sine' }),
    lost: () => ({ frequency: 110, duration: 0.4, type: 'sawtooth' }),
};
