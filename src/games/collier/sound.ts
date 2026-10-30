import type { SoundEffects } from '../../shell/sound';
export const collierEffects: SoundEffects = {
    tir: () => ({
        frequency: 620,
        duration: .05,
        type: 'triangle'
    }),
    insertion: () => ({
        frequency: 280,
        duration: .07,
        type: 'sine'
    }),
    éclatement: () => ({
        frequency: 520,
        duration: .12,
        type: 'sine'
    }),
    combo: size => ({
        frequency: 640 + size * 40,
        duration: .18,
        type: 'triangle'
    }),
    bonus: () => ({
        frequency: 880,
        duration: .22,
        type: 'sine'
    }),
    danger: () => ({
        frequency: 180,
        duration: .24,
        type: 'square'
    }),
    won: () => ({
        frequency: 960,
        duration: .35,
        type: 'triangle'
    }),
    life: () => ({
        frequency: 110,
        duration: .16,
        type: 'triangle'
    }),
    lost: () => ({
        frequency: 90,
        duration: .4,
        type: 'sine'
    })
};
