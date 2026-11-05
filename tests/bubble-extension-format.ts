import { Engine } from '../src/engines/bubble/engine';
import { levelAt } from '../src/engines/bubble/levels';
/** Recorded shots of levels 31-130: two base-36 characters per shot, (angle index × 2 + swap). */
export type Shot = { angle: number; swap: boolean };
export function encodeShots(shots: readonly Shot[]): string {
    return shots.map(s => (Math.round(s.angle * 100 + 139) * 2 + (s.swap ? 1 : 0)).toString(36).padStart(2, '0')).join('');
}
export function decodeShots(code: string): Shot[] {
    if (code.length % 2 || !/^[0-9a-z]*$/.test(code)) throw new Error('Invalid shot code');
    return Array.from({ length: code.length / 2 }, (_, i) => {
        const n = parseInt(code.slice(i * 2, i * 2 + 2), 36), index = Math.floor(n / 2);
        if (index > 278) throw new Error('Invalid shot angle');
        return { angle: (index - 139) / 100, swap: n % 2 === 1 };
    });
}
/** Margin ceiling: it descends 20 % more often than the level's own cadence. */
export function handicapInterval(interval: number): number {
    return interval ? Math.max(1, Math.floor(interval * 0.8)) : 0;
}
/**
 * Replays a recorded line on the real deal of a level (its own seed), optionally with another
 * ceiling interval; returns the end state. The level's data are restored afterwards.
 */
export function replay(index: number, code: string, interval?: number, EngineClass = Engine): { status: string; shots: number; drops: number } {
    const level = levelAt(index), own = level.interval;
    if (interval !== undefined) level.interval = interval;
    try {
        const e = new EngineClass(level.seed); e.loadLevel(index, level.seed);
        for (const shot of decodeShots(code)) {
            if (e.status !== 'playing') break;
            if (shot.swap) e.swap();
            e.aim(shot.angle); e.shoot(); e.advance(10000);
        }
        return { status: e.status, shots: e.shots, drops: e.drops };
    } finally { level.interval = own; }
}
