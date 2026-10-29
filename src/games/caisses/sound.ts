import type { SoundEffects } from '../../shell/sound';
export const caissesEffects: SoundEffects = {
    move: () => ({ frequency: 310, duration: .04, type: 'sine' }),
    push: () => ({ frequency: 180, duration: .09, type: 'triangle' }),
    undo: () => ({ frequency: 450, duration: .06, type: 'sine' }),
    won: () => ({ frequency: 990, duration: .4, type: 'triangle' }),
};
