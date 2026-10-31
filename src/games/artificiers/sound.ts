import type { SoundEffects } from '../../shell/sound';
export const artificiersEffects: SoundEffects = {
    shot: () => ({ frequency: 510, duration: .08, type: 'triangle' }),
    blast: () => ({ frequency: 75, duration: .25, type: 'sawtooth' }),
    jump: () => ({ frequency: 380, duration: .12, type: 'sine' }),
    grapple: () => ({ frequency: 710, duration: .09, type: 'triangle' }),
    fall: () => ({ frequency: 110, duration: .12, type: 'sine' }),
    splash: () => ({ frequency: 155, duration: .24, type: 'sine' }),
    bonus: () => ({ frequency: 840, duration: .18, type: 'triangle' }),
    won: () => ({ frequency: 960, duration: .35, type: 'triangle' }),
    lost: () => ({ frequency: 90, duration: .4, type: 'sine' }),
};
