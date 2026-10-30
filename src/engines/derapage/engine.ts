import { required } from './access';
import { Random } from '../shared/random';
import { at, createTrack, difficulty, type Track } from './track';
import { physics, collide, resolveRail, type Input, type Kart } from './physics';
import { aiInput, aiSpeed } from './ai';
import { checkpoint, ranking, Cup, POINTS } from './race';
import { updateItems, useItem, type Crate, type Puddle } from './items';
export { LEVELS, difficulty } from './track';
export const FIXED_MS = 1000 / 60;
export class Engine {
    lapStartFrame = 0;
    lapPenaltyStartMs = 0;
    lapTimesMs: number[] = [];
    bestLapMs: number | null = null;
    lastLapDeltaMs: number | null = null;
    level = 0;
    seed = 28;
    track!: Track;
    karts: Kart[] = [];
    crates: Crate[] = [];
    puddles: Puddle[] = [];
    time = 0;
    frames = 0;
    remainder = 0;
    status: 'playing' | 'won' | 'lost' = 'playing';
    score = 0;
    cup = new Cup();
    private random = new Random(28);
    private cupBefore = { races: 0, scores: [0, 0, 0, 0, 0, 0] };
    private controls: Input = { steer: 0, drift: false, bonus: false };
    constructor(level = 0, seed = 28) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 28): void {
        if (!Number.isInteger(level) || level < 0 || level > 29)
            throw new RangeError('Niveau invalide');
        if (Math.floor(level / 4) !== Math.floor(this.level / 4) || level % 4 === 0 || level >= 28)
            this.cup = new Cup();
        else if (level === this.level) {
            this.cup.races = this.cupBefore.races;
            this.cup.scores = [...this.cupBefore.scores];
        }
        this.cupBefore = { races: this.cup.races, scores: [...this.cup.scores] };
        this.level = level;
        this.seed = seed;
        this.random = new Random(seed);
        this.track = createTrack(level, seed);
        this.lapStartFrame = 0;
        this.lapPenaltyStartMs = 0;
        this.lapTimesMs = [];
        this.bestLapMs = null;
        this.lastLapDeltaMs = null;
        this.time = 0;
        this.frames = 0;
        this.remainder = 0;
        this.status = 'playing';
        this.score = 0;
        this.puddles = [];
        this.controls = { steer: 0, drift: false, bonus: false };
        this.karts = Array.from({ length: 6 }, (_, id) => {
            const p = at(this.track, -3 - Math.floor(id / 2) * 4), next = at(this.track, 1 - Math.floor(id / 2) * 4), angle = Math.atan2(next.y - p.y, next.x - p.x), offset = id % 2 === 0 ? -2 : 2;
            return { id, x: p.x - Math.sin(angle) * offset, y: p.y + Math.cos(angle) * offset, angle, vx: 0, vy: 0, lap: 0, gate: 1, passed: 0, driftMs: 0, boostMs: 0, jumpMs: 0, slipMs: 0, shield: false, item: null, finishMs: null, hits: 0, penaltyMs: 0, missedGates: 0, noticeMs: 0, jumpHeight: 0, slalomPassed: [] };
        });
        this.crates = [16, 40, 64, 88].map(i => ({ ...required(this.track.points[i]), cooldown: 0 }));
    }
    /** One independent 800 ms impulse per lap, including the opening lap. */
    special(id = 0): boolean {
        const k = this.karts[id];
        if (this.status !== 'playing' || !k || k.finishMs !== null || k.specialLap === k.lap) return false;
        k.specialLap = k.lap; k.specialMs = 800;
        return true;
    }
    advance(ms: number): void { this.step(ms); }
    input(input: Input): void { this.controls = { ...input, steer: Math.max(-1, Math.min(1, input.steer)), bonus: this.controls.bonus || input.bonus }; }
    step(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0)
            throw new RangeError('Temps invalide');
        if (this.status !== 'playing')
            return;
        this.remainder += ms;
        while (this.remainder + 1e-8 >= FIXED_MS && this.status === 'playing') {
            this.remainder -= FIXED_MS;
            if (Math.abs(this.remainder) < 1e-8)
                this.remainder = 0;
            this.frames++;
            this.time = this.frames * FIXED_MS;
            const previous = this.karts.map(k => ({ x: k.x, y: k.y }));
            for (const k of this.karts) {
                const input = k.id === 0 ? this.controls : aiInput(k, this.track, this.level, this.random.next() * 2 - 1);
                // Deterministic straight-line policy, no extra random draw.
                if (k.id > 0 && k.passed + 2 < (this.karts[0]?.passed ?? 0) && Math.abs(input.steer) < 0.12 && Math.hypot(k.vx, k.vy) > 16) this.special(k.id);
                if (input.bonus)
                    useItem(k, this.puddles);
                physics(k, input, this.track, FIXED_MS / 1000, difficulty(this.level).grassGrip, k.id === 0 ? 24 : aiSpeed(k, this.track, this.level));
            }
            this.controls.bonus = false;
            for (let i = 0; i < 6; i++)
                for (let j = i + 1; j < 6; j++)
                    collide(required(this.karts[i]), required(this.karts[j]));
            for (const k of this.karts) {
                if (this.track.circuit.theme.urban) resolveRail(k, this.track);
                const lap = k.lap;
                checkpoint(k, required(previous[k.id]), this.track, this.time);
                if (k.id === 0 && k.lap > lap) {
                    const elapsed = (this.frames - this.lapStartFrame) * FIXED_MS + (k.penaltyMs ?? 0) - this.lapPenaltyStartMs;
                    this.lapPenaltyStartMs = k.penaltyMs ?? 0;
                    this.lastLapDeltaMs = this.bestLapMs === null ? null : elapsed - this.bestLapMs;
                    this.lapTimesMs.push(elapsed);
                    this.bestLapMs = Math.min(this.bestLapMs ?? Infinity, elapsed);
                    this.lapStartFrame = this.frames;
                }
            }
            const order = ranking(this.karts, this.track);
            updateItems(this.karts, this.crates, this.puddles, order, this.random, FIXED_MS);
            if (required(this.karts[0]).finishMs !== null) {
                const place = order.indexOf(0);
                this.score = required(POINTS[place]);
                this.status = place < 3 ? 'won' : 'lost';
                this.remainder = 0;
                if (this.cup.races < 4)
                    this.cup.record(order);
            }
        }
    }
    /** Read-only timing consumers can retain the immutable track reference. */
    snapshot(cloneTrack = true) {
        const value = { level: this.level, seed: this.seed, status: this.status, score: this.score, time: this.time, timing: { raceMs: this.time + (required(this.karts[0]).penaltyMs ?? 0), currentLapMs: required(this.karts[0]).finishMs === null ? (this.frames - this.lapStartFrame) * FIXED_MS + (required(this.karts[0]).penaltyMs ?? 0) - this.lapPenaltyStartMs : 0, lapTimesMs: this.lapTimesMs, bestLapMs: this.bestLapMs, lastLapDeltaMs: this.lastLapDeltaMs }, frames: this.frames, remainder: this.remainder, random: this.random.state, controls: this.controls, track: this.track, karts: this.karts, crates: this.crates, puddles: this.puddles, order: ranking(this.karts, this.track), cup: { races: this.cup.races, scores: this.cup.scores, order: this.cup.standings() } };
        return cloneTrack ? structuredClone(value) : { ...structuredClone({ ...value, track: undefined }), track: this.track };
    }
}
