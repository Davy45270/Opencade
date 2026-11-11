import type { SoundEffects } from '../../shell/sound';
/** Synthesised: a soft click to select, a short engine purr per slide, a bright chime when a group boards, a horn on the win. */
export const busfolieEffects: SoundEffects = {
    select: () => ({ frequency: 760, duration: 0.03, type: 'sine' }),
    move: () => ({ frequency: 180, duration: 0.09, type: 'triangle' }),
    board: () => ({ frequency: 990, duration: 0.18, type: 'sine' }),
    refused: () => ({ frequency: 150, duration: 0.08, type: 'sawtooth' }),
    undo: () => ({ frequency: 520, duration: 0.06, type: 'triangle' }),
    hint: () => ({ frequency: 1180, duration: 0.12, type: 'sine' }),
    nohint: () => ({ frequency: 300, duration: 0.1, type: 'triangle' }),
    blocked: () => ({ frequency: 120, duration: 0.35, type: 'sawtooth' }),
    won: () => ({ frequency: 660, duration: 0.45, type: 'square' }),
};
