import type { SoundEffects } from '../../shell/sound';
export const marmailleEffects: SoundEffects = {
    role: () => ({ frequency: 660, duration: .05, type: 'triangle' }),
    brique: () => ({ frequency: 330, duration: .04, type: 'square' }),
    pioche: () => ({ frequency: 220, duration: .04, type: 'square' }),
    sauvé: saved => ({ frequency: 700 + saved * 20, duration: .1, type: 'sine' }),
    chute: () => ({ frequency: 140, duration: .18, type: 'sine' }),
    won: () => ({ frequency: 960, duration: .35, type: 'triangle' }),
    lost: () => ({ frequency: 90, duration: .4, type: 'sine' }),
};
