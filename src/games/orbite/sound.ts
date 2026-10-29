import type { SoundEffects } from '../../shell/sound';
export const orbiteEffects: SoundEffects = {
    fire: () => ({ frequency: 740, duration: 0.045, type: 'triangle' }),
    edge: () => ({ frequency: 145, duration: 0.045, type: 'sine' }),
    shield: () => ({ frequency: 260, duration: 0.025, type: 'triangle' }),
    probe: () => ({ frequency: 430, duration: 0.09, type: 'triangle' }),
    armor: () => ({ frequency: 980, duration: 0.05, type: 'sine' }),
    life: () => ({ frequency: 110, duration: 0.22, type: 'triangle' }),
    comet: () => ({ frequency: 620, duration: 0.16, type: 'sine' }),
    bonus: () => ({ frequency: 1320, duration: 0.24, type: 'sine' }),
    won: () => ({ frequency: 1760, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 82, duration: 0.4, type: 'triangle' }),
};
