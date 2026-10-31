import type { SoundEffects } from '../../shell/sound';
export const bombercadeEffects: SoundEffects = {
    place: () => ({ frequency: 240, duration: .07, type: 'triangle' }),
    fuse: () => ({ frequency: 650, duration: .025, type: 'sine' }),
    explosion: () => ({ frequency: 85, duration: .22, type: 'sawtooth' }),
    chain: () => ({ frequency: 150, duration: .12, type: 'square' }),
    block: () => ({ frequency: 190, duration: .08, type: 'triangle' }),
    power: () => ({ frequency: 880, duration: .16, type: 'sine' }),
    special: () => ({ frequency: 1140, duration: .2, type: 'triangle' }),
    hit: () => ({ frequency: 180, duration: .12, type: 'triangle' }),
    life: () => ({ frequency: 100, duration: .18, type: 'sawtooth' }),
    won: () => ({ frequency: 990, duration: .4, type: 'triangle' }),
    lost: () => ({ frequency: 110, duration: .4, type: 'sawtooth' }),
};
