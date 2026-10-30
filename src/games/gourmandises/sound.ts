import type { SoundEffects } from '../../shell/sound';
export const gourmandisesEffects: SoundEffects = Object.fromEntries(
    ['swap', 'refused', 'match', 'special', 'cascade', 'obstacle', 'won', 'lost', 'life'].map((name, index) => [
        name, (size: number) => ({ frequency: 180 + index * 75 + Math.min(size, 10) * 15,
            duration: name === 'won' ? 0.5 : 0.12, type: 'sine' as const }),
    ]),
);
