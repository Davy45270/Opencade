import { center, key, type Point, type Resolution } from '../../engines/bubble/engine';
/** Visual only: the attached bubble glides from its impact point to its socket. */
export const SETTLE_MS = 90;
export class Settle {
    key = '';
    age = SETTLE_MS;
    private from: Point = { x: 0, y: 0 };
    private to: Point = { x: 0, y: 0 };
    start(key: string, from: Point, to: Point): void {
        this.key = key; this.from = { ...from }; this.to = { ...to }; this.age = 0;
    }
    clear(): void { this.key = ''; this.age = SETTLE_MS; }
    /** Frozen while paused or selecting a level: the glide resumes where it stopped. */
    advance(delta: number, frozen: boolean): void {
        if (!frozen && this.age < SETTLE_MS) this.age = Math.min(SETTLE_MS, this.age + delta);
    }
    /** Current drawing position of `key`, or null once settled (draw at the cell centre). */
    point(key: string): Point | null {
        if (key !== this.key || this.age >= SETTLE_MS) return null;
        const t = this.age / SETTLE_MS;
        return { x: this.from.x + (this.to.x - this.from.x) * t, y: this.from.y + (this.to.y - this.from.y) * t };
    }
}
/**
 * Socket the glide ends on. A bubble popped on arrival bursts where the board stood before the
 * shot, so it glides towards its pre-descent socket; a kept bubble follows the descended board.
 */
export function settleTarget(result: Pick<Resolution, 'attached' | 'popped'>, dropsBefore: number, dropsAfter: number): Point | null {
    const attached = result.attached;
    if (!attached) return null;
    const popped = result.popped.some(c => key(c) === key(attached));
    return center(attached, popped ? dropsBefore : dropsAfter);
}
