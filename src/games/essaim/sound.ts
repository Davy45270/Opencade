import type { SoundEffects } from '../../shell/sound';
export const essaimEffects: SoundEffects = {
    signature: () => ({ frequency: 1320, duration: 0.18, type: 'triangle' }),
    fire: () => ({ frequency: 880, duration: 0.045, type: 'triangle' }),
    dive: () => ({ frequency: 190, duration: 0.14, type: 'sine' }),
    enemy: () => ({ frequency: 510, duration: 0.09, type: 'triangle' }),
    armor: () => ({ frequency: 1040, duration: 0.05, type: 'sine' }),
    life: () => ({ frequency: 110, duration: 0.22, type: 'triangle' }),
    wave: () => ({ frequency: 700, duration: 0.16, type: 'sine' }),
    bonus: () => ({ frequency: 1480, duration: 0.24, type: 'sine' }),
    won: () => ({ frequency: 1760, duration: 0.4, type: 'triangle' }),
    lost: () => ({ frequency: 82, duration: 0.4, type: 'triangle' }),
};
