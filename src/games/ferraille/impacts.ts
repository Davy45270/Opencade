import type { Enemy, Shot, State } from '../../engines/ferraille/engine';
/**
 * Feel layer of Ferraille, outside the engine: it only reads the state after each step, so
 * physics, scores and replays are unchanged. "I hit" and "I am hit" no longer share the gold
 * frame: an enemy struck blinks white with sparks, a destroyed one bursts into scrap with a
 * floating "+100", a grenade draws its real 64 px blast, and losing a life shakes the view and
 * reddens its edges. Times are game milliseconds, so a paused or test-driven game stays still.
 */
export const BLINK_MS = 80, SPARK_MS = 260, SCRAP_MS = 520, BLAST_MS = 420, SCORE_MS = 700, SHAKE_MS = 250, RED_MS = 400;
/** Grenade blast radius of the engine (`explode`), in world pixels. */
export const BLAST_RADIUS = 64;
export interface Burst { kind: 'spark' | 'scrap' | 'blast' | 'score'; x: number; y: number; age: number; life: number; text?: string }
interface Seen { hp: number; x: number; y: number; w: number; h: number }
export class Impacts {
    bursts: Burst[] = [];
    /** Remaining white blink of each struck enemy. */
    blink = new Map<Enemy, number>();
    shake = 0;
    red = 0;
    /** Sounds to play for this step: 'kill' per destroyed enemy, 'boom' per grenade blast. */
    sounds: string[] = [];
    private enemies = new Map<Enemy, Seen>();
    private grenades = new Set<Shot>();
    /** Counters for the E2E: what the feel layer has reacted to since the level began. */
    counts = { blinks: 0, kills: 0, blasts: 0, hurts: 0 };
    reset(state: State): void {
        this.bursts = []; this.blink.clear(); this.shake = this.red = 0; this.sounds = [];
        this.counts = { blinks: 0, kills: 0, blasts: 0, hurts: 0 };
        this.remember(state);
    }
    /** Compare the state after a step with the one before it; `events` are the engine's events of that step. */
    observe(state: State, events: readonly string[]): void {
        this.sounds = [];
        const alive = new Set(state.enemies);
        for (const [enemy, seen] of this.enemies) {
            const cx = seen.x + seen.w / 2, cy = seen.y + seen.h / 2;
            if (!alive.has(enemy)) {
                // Removed with no life left: destroyed (an enemy falling off the map keeps its hp).
                if (enemy.hp <= 0) {
                    this.bursts.push({ kind: 'scrap', x: cx, y: cy, age: 0, life: SCRAP_MS }, { kind: 'score', x: cx, y: seen.y, age: 0, life: SCORE_MS, text: '+100' });
                    this.counts.kills++; this.sounds.push('kill');
                }
                this.blink.delete(enemy);
            } else if (enemy.hp < seen.hp) {
                this.blink.set(enemy, BLINK_MS);
                this.bursts.push({ kind: 'spark', x: cx, y: cy, age: 0, life: SPARK_MS });
                this.counts.blinks++;
            }
        }
        // A grenade ends by exploding (life set to 0); one cleared by a lost life never exploded.
        for (const shot of this.grenades) if (shot.life <= 0) {
            this.bursts.push({ kind: 'blast', x: shot.x + shot.w / 2, y: shot.y + shot.h / 2, age: 0, life: BLAST_MS });
            this.counts.blasts++; this.sounds.push('boom'); this.shake = Math.max(this.shake, SHAKE_MS * .6);
        }
        if (events.includes('life')) { this.shake = SHAKE_MS; this.red = RED_MS; this.counts.hurts++; }
        this.remember(state);
    }
    /** Age every effect by `ms` of game time. */
    advance(ms: number): void {
        for (const b of this.bursts) b.age += ms;
        this.bursts = this.bursts.filter(b => b.age < b.life);
        for (const [enemy, left] of this.blink) if (left - ms > 0) this.blink.set(enemy, left - ms); else this.blink.delete(enemy);
        this.shake = Math.max(0, this.shake - ms); this.red = Math.max(0, this.red - ms);
    }
    /** Screen offset of the shake (none with reduced motion), deterministic in game time. */
    offset(reducedMotion: boolean): { x: number; y: number } {
        if (reducedMotion || this.shake <= 0) return { x: 0, y: 0 };
        const k = this.shake / SHAKE_MS * 5;
        return { x: Math.round(Math.sin(this.shake * .9) * k), y: Math.round(Math.cos(this.shake * 1.3) * k) };
    }
    private remember(state: State): void {
        this.enemies = new Map(state.enemies.map(e => [e, { hp: e.hp, x: e.x, y: e.y, w: e.w, h: e.h }]));
        this.grenades = new Set(state.shots.filter(s => s.friendly && s.kind === 'grenade' && s.life > 0));
    }
}
