import type { SoundEffects } from '../../shell/sound';
/** Short synthesized tones; nothing plays unless the player's global sound is on. */
export const sudokuEffects: SoundEffects = {
    select: () => ({ frequency: 520, duration: .03, type: 'sine' }),
    value: () => ({ frequency: 660, duration: .06, type: 'triangle' }),
    note: () => ({ frequency: 880, duration: .04, type: 'sine' }),
    erase: () => ({ frequency: 300, duration: .06, type: 'sine' }),
    undo: () => ({ frequency: 450, duration: .06, type: 'sine' }),
    conflict: () => ({ frequency: 160, duration: .18, type: 'sawtooth' }),
    unit: () => ({ frequency: 990, duration: .12, type: 'triangle' }),
    hint: () => ({ frequency: 760, duration: .1, type: 'sine' }),
    won: () => ({ frequency: 1180, duration: .4, type: 'triangle' }),
};
