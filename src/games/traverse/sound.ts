import type { SoundEffects } from '../../shell/sound';
export const traverseEffects: SoundEffects = {
    step: () => ({ frequency: 420, duration: .04, type: 'sine' }),
    life: () => ({ frequency: 160, duration: .2, type: 'triangle' }),
    won: () => ({ frequency: 940, duration: .4, type: 'triangle' }),
    lost: () => ({ frequency: 100, duration: .4, type: 'sine' }),
};
