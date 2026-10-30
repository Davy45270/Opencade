import { Random } from '../shared/random';
import { levelAt, type Point, type Bonus, Path } from './levels';
export const DIAMETER = 20;
export const FIXED_MS = 1000 / 60;
export interface Bead {
    id: number;
    color: number;
    s: number;
    bonus?: Bonus;
}
export interface Chain {
    beads: Bead[];
    emitted: number;
    quota: number;
    runColor?: number;
    runLeft?: number;
}
export interface Flight extends Point {
    color: number;
    dx: number;
    dy: number;
    gap: boolean;
}
export interface Burst extends Point {
    color: number;
    time: number;
}
export class Engine {
    level = 0;
    seed = 300;
    random = new Random(300);
    config = levelAt(0);
    chains: Chain[] = [];
    status: 'playing' | 'won' | 'lost' = 'playing';
    score = 0;
    remainingDistance = 0;
    angle = -Math.PI / 2;
    current = 0;
    next = 0;
    flight: Flight | null = null;
    time = 0;
    remainder = 0;
    slowMs = 0;
    reverseMs = 0;
    aimMs = 0;
    bomb = false;
    combo = 1;
    maxCombo = 1;
    gapShots = 0;
    shots = 0;
    nextId = 1;
    bursts: Burst[] = [];
    events: string[] = [];
    constructor(level = 0, seed = 300) {
        this.loadLevel(level, seed);
    }
    loadLevel(level: number, seed = 300): void {
        this.level = level;
        this.seed = seed;
        this.config = levelAt(level);
        this.random = new Random(seed);
        this.chains = this.config.paths.map((_, i) => ({
            beads: [],
            emitted: 0,
            quota: Math.floor(this.config.quota / this.config.paths.length) + (i === 0 ? this.config.quota % this.config.paths.length : 0)
        }));
        this.status = 'playing';
        this.score = 0;
        this.remainingDistance = 0;
        this.angle = -Math.PI / 2;
        this.flight = null;
        this.time = 0;
        this.remainder = 0;
        this.slowMs = 0;
        this.reverseMs = 0;
        this.aimMs = 0;
        this.bomb = false;
        this.combo = 1;
        this.maxCombo = 1;
        this.gapShots = 0;
        this.shots = 0;
        this.nextId = 1;
        this.bursts = [];
        this.events = [];
        for (const chain of this.chains) {
            for (let i = 0; i < 6; i++) {
                for (const bead of chain.beads)
                    bead.s += DIAMETER;
                this.emit(chain);
            }
        }
        this.current = this.pick();
        this.next = this.pick();
    }
    /** Feed only at the path origin; a burst never shortcuts the remaining journey. */
    private emit(chain: Chain): void {
        if (chain.emitted >= chain.quota)
            return;
        // A seeded run lasts one to three beads. A new run always changes colour.
        if (!chain.runLeft) {
            const previous = chain.runColor;
            const choice = Math.floor(this.random.next() * (this.config.colors - (previous === undefined ? 0 : 1)));
            chain.runColor = previous !== undefined && choice >= previous ? choice + 1 : choice;
            chain.runLeft = 1 + Math.floor(this.random.next() * 3);
        }
        const color = chain.runColor ?? 0;
        chain.runLeft--;
        const bonusDue = chain.emitted > 0 && chain.emitted % this.config.bonusEvery === 0;
        const bonusIndex = bonusDue ? Math.floor(this.random.next() * this.config.bonuses.length) : -1;
        const bonus = this.config.bonuses[bonusIndex];
        chain.beads.unshift({
            id: this.nextId++,
            color,
            s: 0,
            ...(bonus ? { bonus } : {})
        });
        chain.emitted++;
    }
    colors(): number[] {
        return [...new Set(this.chains.flatMap(c => c.beads.map(b => b.color)))].sort((a, b) => a - b);
    }
    private pick(): number {
        const colors = this.colors();
        return colors[Math.floor(this.random.next() * colors.length)] ?? 0;
    }
    private refresh(): void {
        const colors = this.colors();
        if (!colors.includes(this.current))
            this.current = this.pick();
        if (!colors.includes(this.next))
            this.next = this.pick();
    }
    aim(angle: number): void {
        if (Number.isFinite(angle))
            this.angle = angle;
    }
    swap(): boolean {
        if (this.flight || this.status !== 'playing')
            return false;
        [this.current, this.next] = [this.next, this.current];
        return true;
    }
    shoot(): boolean {
        if (this.flight || this.status !== 'playing')
            return false;
        this.refresh();
        this.flight = {
            ...this.config.shooter,
            color: this.current,
            dx: Math.cos(this.angle) * 650,
            dy: Math.sin(this.angle) * 650,
            gap: false
        };
        this.current = this.next;
        this.next = this.pick();
        this.shots++;
        this.events.push('tir');
        return true;
    }
    hidden(s: number): boolean {
        return this.config.tunnels.some(([a, b]) => s >= a && s <= b);
    }
    get danger(): boolean {
        return this.isDanger();
    }
    private isDanger(): boolean {
        return this.chains.some((c, i) => (c.beads.at(-1)?.s ?? 0) > (this.config.paths[i]?.length ?? 1) * .85);
    }
    private warnDanger(wasDanger: boolean): void {
        if (!wasDanger && this.isDanger())
            this.events.push('danger');
    }
    speed(chain: Chain, path: Path): number {
        const deploying = chain.emitted < Math.min(12, chain.quota);
        const cruising = deploying ? 100 : this.config.speed;
        const nearHole = (chain.beads.at(-1)?.s ?? 0) > path.length * .85;
        const acceleration = nearHole ? this.config.acceleration : 1;
        const slowing = this.slowMs > 0 ? .5 : 1;
        return cruising * acceleration * slowing;
    }
    activate(bonus: Bonus): void {
        if (bonus === 'slow')
            this.slowMs = 5000;
        if (bonus === 'reverse')
            this.reverseMs = 1500;
        if (bonus === 'aim')
            this.aimMs = 8000;
        if (bonus === 'bomb')
            this.bomb = true;
        this.events.push('bonus');
    }
    /** Literal-state entry point also used for rule oracles; it never changes resolution rules. */
    loadState(beads: Bead[], emitted = this.config.quota, current = 0, next = 0): void {
        this.chains = [{
                beads: beads.map(b => ({ ...b })),
                emitted,
                quota: this.config.quota
            }];
        this.current = current;
        this.next = next;
        this.nextId = Math.max(0, ...beads.map(b => b.id)) + 1;
        this.flight = null;
        this.status = 'playing';
        this.refresh();
    }
    insert(chainIndex: number, index: number, impact: Point, color: number): void {
        const chain = this.chains[chainIndex], path = this.config.paths[chainIndex], hit = chain?.beads[index];
        if (!chain || !path || !hit || this.hidden(hit.s))
            return;
        const wasDanger = this.danger;
        const p = path.pointAt(hit.s), t = path.tangent(hit.s);
        const ahead = (impact.x - p.x) * t.x + (impact.y - p.y) * t.y >= 0;
        const at = index + (ahead ? 1 : 0), s = hit.s + (ahead ? DIAMETER : 0);
        // Freeze the impact geometry before insertion pushes any target forward.
        const bombVictims = this.bomb ? this.chains.map((c, ci) => c.beads.filter(b => {
            const q = this.config.paths[ci]?.pointAt(b.s);
            return q !== undefined && Math.hypot(q.x - impact.x, q.y - impact.y) <= DIAMETER * 2;
        })) : [];
        const inserted = {
            id: this.nextId++,
            color,
            s
        };
        chain.beads.splice(at, 0, inserted);
        for (let i = at + 1; i < chain.beads.length; i++) {
            const a = chain.beads[i - 1], b = chain.beads[i];
            if (a && b)
                b.s = Math.max(b.s, a.s + DIAMETER);
        }
        this.events.push('insertion');
        this.combo = 1;
        if (this.bomb) {
            this.bomb = false;
            bombVictims.forEach((victims, ci) => {
                if (ci === chainIndex)
                    victims.push(inserted);
                if (victims.length)
                    this.remove(ci, victims);
            });
        }
        else
            this.match(chainIndex, at);
        this.refresh();
        // Insertion can push the head across the threshold during a flight step.
        this.warnDanger(wasDanger);
        this.finish();
    }
    private match(ci: number, index: number): boolean {
        const c = this.chains[ci], hit = c?.beads[index];
        if (!c || !hit)
            return false;
        let a = index, b = index;
        while (a > 0) {
            const p = c.beads[a - 1], q = c.beads[a];
            if (!p || !q || p.color !== hit.color || q.s - p.s > DIAMETER + .001)
                break;
            a--;
        }
        while (b < c.beads.length - 1) {
            const p = c.beads[b], q = c.beads[b + 1];
            if (!p || !q || q.color !== hit.color || q.s - p.s > DIAMETER + .001)
                break;
            b++;
        }
        if (b - a + 1 < 3)
            return false;
        this.remove(ci, c.beads.slice(a, b + 1));
        return true;
    }
    private remove(ci: number, victims: Bead[]): void {
        const chain = this.chains[ci], path = this.config.paths[ci];
        if (!chain || !path)
            return;
        this.remainingDistance = Math.max(0, path.length - (chain.beads.at(-1)?.s ?? 0));
        this.score += victims.length * 10 * this.combo;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        for (const b of victims) {
            this.bursts.push({
                ...path.pointAt(b.s),
                color: b.color,
                time: this.time
            });
            if (b.bonus)
                this.activate(b.bonus);
        }
        chain.beads = chain.beads.filter(b => !victims.includes(b));
        this.events.push(this.combo > 1 ? 'combo' : 'éclatement');
        this.combo++;
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0)
            throw new RangeError('Temps invalide');
        this.remainder += dtMs;
        while (this.remainder + 1e-8 >= FIXED_MS) {
            this.remainder -= FIXED_MS;
            if (Math.abs(this.remainder) < 1e-8)
                this.remainder = 0;
            if (this.status === 'playing')
                this.tick();
        }
    }
    /** Push by the tail; same-colour gap edges attract the front segment back. */
    private tick(): void {
        const dt = FIXED_MS / 1000, wasDanger = this.danger;
        this.time += FIXED_MS;
        this.bursts = this.bursts.filter(b => this.time - b.time < 500);
        this.chains.forEach((chain, ci) => {
            const path = this.config.paths[ci];
            if (!path)
                return;
            const beads = chain.beads;
            if (this.reverseMs > 0) {
                const shift = Math.min(60 * dt, Math.max(0, beads[0]?.s ?? 0));
                for (const b of beads)
                    b.s -= shift;
            }
            else {
                const tail = beads[0];
                if (tail) {
                    const movement = this.speed(chain, path) * dt;
                    // Stop on the entry boundary for this fixed step. Regular feeding
                    // stays in contact and cannot create a false magnetic weld.
                    const feeding = chain.emitted < chain.quota && tail.s < DIAMETER;
                    tail.s += feeding ? Math.min(movement, DIAMETER - tail.s) : movement;
                }
                for (let i = 1; i < beads.length; i++) {
                    const rear = beads[i - 1], front = beads[i];
                    if (!rear || !front)
                        continue;
                    const gap = front.s - rear.s;
                    if (gap > DIAMETER + .001 && rear.color === front.color) {
                        let end = i;
                        while (end + 1 < beads.length && (beads[end + 1]?.s ?? 0) - (beads[end]?.s ?? 0) <= DIAMETER + .001)
                            end++;
                        const shift = Math.min(gap - DIAMETER, 100 * dt);
                        for (let k = i; k <= end; k++) {
                            const b = beads[k];
                            if (b)
                                b.s -= shift;
                        }
                        if (front.s - rear.s <= DIAMETER + .001) {
                            if (this.match(ci, i))
                                break;
                        }
                    }
                    else
                        front.s = Math.max(front.s, rear.s + DIAMETER);
                }
            }
            if ((chain.beads[0]?.s ?? DIAMETER) >= DIAMETER && chain.emitted < chain.quota)
                this.emit(chain);
        });
        this.warnDanger(wasDanger);
        const expire = (ms: number): number => ms - FIXED_MS < 1e-8 ? 0 : ms - FIXED_MS;
        this.slowMs = expire(this.slowMs);
        this.reverseMs = expire(this.reverseMs);
        this.aimMs = expire(this.aimMs);
        this.moveFlight(dt);
        this.finish();
        this.refresh();
        if (this.events.length > 32)
            this.events.splice(0, this.events.length - 32);
    }
    private moveFlight(dt: number): void {
        const f = this.flight;
        if (!f)
            return;
        // Substeps keep swept collision stable even at the fastest shot speed.
        for (let n = 0; n < 4 && this.flight; n++) {
            f.x += f.dx * dt / 4;
            f.y += f.dy * dt / 4;
            for (let ci = 0; ci < this.chains.length && this.flight; ci++) {
                const c = this.chains[ci], path = this.config.paths[ci];
                if (!c || !path)
                    continue;
                for (let i = 0; i < c.beads.length; i++) {
                    const b = c.beads[i];
                    if (!b || this.hidden(b.s))
                        continue;
                    const p = path.pointAt(b.s);
                    if (Math.hypot(p.x - f.x, p.y - f.y) <= DIAMETER) {
                        this.flight = null;
                        this.insert(ci, i, f, f.color);
                        break;
                    }
                }
                if (!f.gap)
                    for (let i = 1; i < c.beads.length; i++) {
                        const a = c.beads[i - 1], b = c.beads[i];
                        if (!a || !b || b.s - a.s <= DIAMETER * 2)
                            continue;
                        for (let s = a.s + DIAMETER; s < b.s - DIAMETER; s += 5) {
                            const p = path.pointAt(s);
                            if (Math.hypot(p.x - f.x, p.y - f.y) < 4) {
                                f.gap = true;
                                this.gapShots++;
                                this.score += 25;
                                break;
                            }
                        }
                    }
            }
            if (f.x < -20 || f.x > 380 || f.y < -20 || f.y > 660)
                this.flight = null;
        }
    }
    private finish(): void {
        if (this.status !== 'playing')
            return;
        if (this.chains.some((c, i) => (c.beads.at(-1)?.s ?? 0) >= (this.config.paths[i]?.length ?? Infinity))) {
            this.status = 'lost';
            this.flight = null;
            this.events.push('life', 'lost');
        }
        else if (this.chains.every(c => c.emitted >= c.quota && !c.beads.length)) {
            this.status = 'won';
            this.score += Math.round(this.remainingDistance);
            this.events.push('won');
        }
    }
    trace(angle = this.angle): Point {
        const origin = this.config.shooter, dx = Math.cos(angle), dy = Math.sin(angle);
        let best = 800;
        this.chains.forEach((c, ci) => {
            const path = this.config.paths[ci];
            if (!path)
                return;
            for (const b of c.beads) {
                if (this.hidden(b.s))
                    continue;
                const p = path.pointAt(b.s), x = p.x - origin.x, y = p.y - origin.y, t = x * dx + y * dy, h = x * x + y * y - t * t;
                if (t >= 0 && h <= DIAMETER * DIAMETER)
                    best = Math.min(best, Math.max(0, t - Math.sqrt(DIAMETER * DIAMETER - h)));
            }
        });
        return { x: origin.x + dx * best, y: origin.y + dy * best };
    }
    snapshot() {
        return {
            level: this.level,
            seed: this.seed,
            status: this.status,
            score: this.score,
            remainingDistance: this.remainingDistance,
            time: this.time,
            remainder: this.remainder,
            angle: this.angle,
            current: this.current,
            next: this.next,
            flight: this.flight ? { ...this.flight } : null,
            chains: this.chains.map((c, i) => ({ ...c, beads: c.beads.map(b => ({
                    ...b,
                    ...this.config.paths[i]?.pointAt(b.s),
                    hidden: this.hidden(b.s)
                })) })),
            paths: this.config.paths.map(p => ({
                length: p.length,
                hole: p.pointAt(p.length),
                samples: p.samples
            })),
            shooter: this.config.shooter,
            slowMs: this.slowMs,
            reverseMs: this.reverseMs,
            aimMs: this.aimMs,
            bomb: this.bomb,
            combo: this.combo,
            maxCombo: this.maxCombo,
            gapShots: this.gapShots,
            shots: this.shots,
            danger: this.danger,
            random: this.random.state,
            bursts: this.bursts.map(b => ({ ...b }))
        };
    }
}
