import type { SoundEffects } from '../../shell/sound';
export const pompiersEffects: SoundEffects = {
    spray: () => ({ frequency: 680, duration: .12, type: 'sine' }),
    foam: () => ({ frequency: 430, duration: .16, type: 'triangle' }),
    refill: () => ({ frequency: 310, duration: .2, type: 'sine' }),
    refilled: () => ({ frequency: 740, duration: .14, type: 'sine' }),
    extinguished: () => ({ frequency: 920, duration: .18, type: 'triangle' }),
    rescued: () => ({ frequency: 1040, duration: .23, type: 'sine' }),
    carried: () => ({ frequency: 560, duration: .12, type: 'triangle' }),
    tool: () => ({ frequency: 440, duration: .07, type: 'triangle' }),
    'pickup-tool': () => ({ frequency: 660, duration: .1, type: 'triangle' }),
    break: () => ({ frequency: 180, duration: .1, type: 'triangle' }),
    climb: () => ({ frequency: 520, duration: .12, type: 'triangle' }),
    heal: () => ({ frequency: 790, duration: .16, type: 'sine' }),
    call: () => ({ frequency: 600, duration: .14, type: 'triangle' }),
    won: () => ({ frequency: 1100, duration: .5, type: 'triangle' }),
    lost: () => ({ frequency: 220, duration: .3, type: 'sine' }),
    hurt: () => ({ frequency: 260, duration: .1, type: 'sine' }),
};
