import type { SoundEffects } from '../../shell/sound';
export const derapageEffects: SoundEffects = {
    engine: () => ({ frequency: 95, duration: .09, type: 'sawtooth' }),
    drift: () => ({ frequency: 380, duration: .1, type: 'triangle' }),
    boost: () => ({ frequency: 740, duration: .2, type: 'sine' }),
    impact: () => ({ frequency: 65, duration: .12, type: 'square' }),
    life: () => ({ frequency: 130, duration: .08, type: 'triangle' }),
    won: () => ({ frequency: 960, duration: .4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: .4, type: 'sine' }),
};
