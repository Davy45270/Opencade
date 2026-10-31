import type { Page, CDPSession, TestInfo } from '@playwright/test';

export type Touch = { id: number; x: number; y: number };
type State = Record<string, unknown>;
type Hook = { read(): State; advance(ms: number): void };
type Target = { x: number; y: number; screenX: number; screenY: number; dx: number; dy: number };
export function checksum(value: unknown): number {
    let sum = 109;
    for (const char of JSON.stringify(value)) sum = (sum * 31 + char.charCodeAt(0)) % 2147483647;
    return sum;
}

/** Fixed simulation latency. Only CDP packets can change the scene's controls. */
export class Finger {
    entries: { type: 'touchStart' | 'touchMove' | 'touchEnd'; selectors: string[]; points: Touch[]; intended: Touch[]; noise: Touch[]; timeMs: number; missed: boolean }[] = [];
    elapsed = 0;
    steps = 0;
    advances: { step: number; ms: number; gameMs: number }[] = [];
    private active = false;
    private activePoints: Touch[] = [];
    private seed: number;
    private readonly initialSeed: number;
    private game = '';
    private constructor(private page: Page, private cdp: CDPSession, seed = 109) {
        if (!Number.isInteger(seed) || seed < 1 || seed >= 2147483647) throw new RangeError('Graine invalide');
        this.seed = seed; this.initialSeed = seed;
    }
    /** Install before navigation, so Phaser and held-button timers share this clock. */
    static async prepare(page: Page): Promise<void> { await page.clock.install({ time: 0 }); }
    static async create(page: Page, cdp: CDPSession, seed = 109): Promise<Finger> {
        const finger = new Finger(page, cdp, seed);
        finger.game = await page.evaluate(() => {
            const id = window.__ARCADE_TEST__?.current();
            if (!id) throw new Error('Jeu absent');
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Horloge absente');
            hook.advance(0);
            return id;
        });
        // Fixed epoch, never a wall-time oracle. A11 is already frozen before this
        // jump. Browser timers cannot repeat a held Empilo button while CDP is slow.
        await page.clock.pauseAt(3600000);
        return finger;
    }
    private noise(): number { this.seed = this.seed * 16807 % 2147483647; return this.seed % 25 - 12; }
    async read(): Promise<State> {
        return this.page.evaluate(id => {
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Crochet absent');
            hook.advance(0); // Commit held scene controls without advancing simulation.
            return hook.read();
        }, this.game);
    }
    async advance(ms = 150): Promise<void> {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
        if (this.steps >= 50000) throw new Error('Budget de pas de jeu épuisé');
        await this.page.evaluate(({ id, ms }) => {
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Horloge absente');
            hook.advance(ms); // A11 already divides this duration into fixed simulation steps.
        }, { id: this.game, ms });
        this.elapsed += ms; this.steps++;
        this.advances.push({ step: this.steps, ms, gameMs: this.elapsed });
        await this.page.clock.runFor(17); // Present one frame; A11 keeps its game delta at zero.
    }
    async release(): Promise<void> { await this.endTouch(true); }
    private async endTouch(reaction: boolean): Promise<void> {
        if (!this.active) return;
        if (reaction) await this.advance(); // A newly decided release (Bubble fires here).
        const before = await this.read();
        await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        this.active = false;
        await this.page.clock.runFor(17);
        const after = await this.read();
        const scene = after.fingerInput as { held?: string[]; controls?: { x: number; y: number; jump: boolean; fire: boolean }; thumb?: unknown; firing?: boolean };
        const tapped = this.entries.at(-1)?.selectors ?? [];
        const effect = tapped.includes('#resume') ? (after.fingerInput as { paused?: boolean } | undefined)?.paused === false
            : this.game === 'alunir' ? scene.held?.length === 0
            : this.game === 'ferraille' ? scene.controls?.x === 0 && scene.controls.y === 0 && !scene.controls.jump && !scene.controls.fire
            : this.game === 'derapage' ? scene.thumb === null
            : this.game === 'orbite' ? scene.firing === false
            : this.game === 'essaim' ? scene.firing === false
            : this.game === 'bubble' && before.inFlight === false ? Number(after.shots) === Number(before.shots) + 1 || this.entries.at(-1)?.selectors.every(s => !s.includes('canvas')) === true
            : true;
        const accepted = receivedEvents(before, after, 'pointerup', this.activePoints) && effect;
        this.activePoints = [];
        this.entries.push({ type: 'touchEnd', selectors: [], intended: [], noise: [], points: [], timeMs: this.elapsed, missed: !accepted });
        if (!accepted) throw new Error(`toucher perdu : ${this.game} touchEnd`);
    }
    async touch(type: 'touchStart' | 'touchMove', intended: Touch[], selectors = intended.map(() => '#game canvas')): Promise<void> {
        if (!intended.length) throw new Error('Toucher vide');
        await this.advance(); // The observation used by the caller is now 150 game ms old.
        if (type === 'touchStart') await this.endTouch(false); // Already waited for this replacement decision.
        const before = await this.read();
        // A terminal transition can happen during human reaction time. There is
        // no new command to send once the playthrough has ended.
        if (before.status === 'won' || before.status === 'lost') { await this.release(); return; }
        if (type === 'touchMove' && !this.active) throw new Error('Glissement sans toucher');
        const noise = intended.map(p => ({ id: p.id, x: this.noise(), y: this.noise() }));
        const points = intended.map((p, i) => ({ id: p.id, x: p.x + (noise[i]?.x ?? 0), y: p.y + (noise[i]?.y ?? 0) }));
        if (selectors.length !== intended.length) throw new Error('Une cible par toucher est requise');
        const targets = await this.page.evaluate(({ points, selectors }) => points.map((p, i) => {
            const selector = selectors[i] ?? '#game canvas', r = document.querySelector(selector)?.getBoundingClientRect();
            if (!r) throw new Error(`Cible absente ${selector}`);
            return { hit: Boolean(document.elementFromPoint(p.x, p.y)?.closest(selector)),
                x: (p.x - r.x) / r.width * 360, y: (p.y - r.y) / r.height * 640,
                screenX: p.x, screenY: p.y, dx: p.x - r.x - r.width / 2, dy: p.y - r.y - r.height / 2 };
        }), { points, selectors });
        await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
        this.active = true;
        this.activePoints = points;
        await this.page.clock.runFor(17);
        const after = await this.read();
        const accepted = receivedEvents(before, after, type === 'touchStart' ? 'pointerdown' : 'pointermove', points) && targets.every(t => t.hit) && selectors.every((selector, i) => received(this.game, selector, before, after, targets[i]));
        this.entries.push({ type, selectors, points, intended, noise, timeMs: this.elapsed, missed: !accepted });
        if (!accepted) throw new Error(`toucher perdu : ${this.game} ${selectors.join(', ')}`);
    }
    async steer(selectors: string[]): Promise<void> {
        if (!selectors.length) { await this.advance(); await this.endTouch(false); return; }
        const points = await this.page.evaluate(selectors => selectors.map((selector, id) => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            if (!r) throw new Error(`Cible absente ${selector}`);
            return { id, x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }), selectors);
        await this.touch('touchStart', points, selectors);
    }
    async press(selectors: string[], during?: () => Promise<void>): Promise<void> {
        await this.steer(selectors);
        // A tap's down/up pair is decided together. A callback can make a new release decision.
        try { await during?.(); } finally { await this.endTouch(Boolean(during)); }
    }
    /** Poll in game steps; no wall-clock oracle or host-dependent number of samples. */
    async until(predicate: () => Promise<boolean>, maxSteps = 1000): Promise<void> {
        for (let step = 0; step < maxSteps; step++) {
            if (await predicate()) return;
            await this.advance();
        }
        if (await predicate()) return;
        throw new Error('Budget de pas de jeu épuisé');
    }
    async attach(info: Pick<TestInfo, 'attach'>, name = 'finger-stepped.json'): Promise<void> {
        const final = await this.read();
        await info.attach(name, { contentType: 'application/json', body: JSON.stringify({ clock: 'stepped', seed: this.initialSeed, latencyGameMs: 150, noisePx: 12, steps: this.steps, advances: this.advances, gameMs: this.elapsed, entries: this.entries, misses: this.entries.filter(e => e.missed).length, outcome: final.status, final, fingerprint: checksum({ entries: this.entries, final }) }, null, 2) });
    }
}

/** Evidence comes from frozen scene/engine snapshots, never from DOM hit testing alone. */
export function received(game: string, selector: string, before: State, after: State, target?: Target): boolean {
    const scene = after.fingerInput as { paused?: boolean; held?: string[]; controls?: Record<string, unknown>; thumb?: { x: number; y: number; dx: number; dy: number } | null; firing?: boolean; pulling?: boolean; aimingPointer?: number | null } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    // A DOM button such as Resume acts on click, i.e. after touchEnd: its effect is checked in endTouch().
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts') || (game === 'caisses' && scene?.pulling === true);
    if (game === 'alunir') return scene?.held?.includes(selector.slice(1)) === true;
    if (game === 'ferraille') {
        if (selector === '.joystick' && target) {
            const angle = Math.round(Math.atan2(target.dy, target.dx) / (Math.PI / 4)) * Math.PI / 4;
            return scene?.controls?.x === Math.round(Math.cos(angle)) && scene.controls.y === Math.round(Math.sin(angle));
        }
        return scene?.controls?.[selector.endsWith('jump') ? 'jump' : 'fire'] === true;
    }
    if (game === 'derapage' && selector.includes('canvas') && target && scene?.thumb) return near(scene.thumb.x + scene.thumb.dx, target.screenX) && near(scene.thumb.y + scene.thumb.dy, target.screenY);
    if (game === 'orbite' && selector.endsWith('-fire')) return scene?.firing === true;
    if (game === 'essaim' && selector.endsWith('-fire')) return scene?.firing === true;
    const direction = selector.split('-').at(-1);
    if (game === 'dedale') return after.requested === direction;
    if (game === 'serpentin') return after.direction === direction || (after.queue as string[]).includes(direction ?? '');
    if (game === 'traverse' && !selector.endsWith('-special')) return (after.queue as string[]).includes(direction ?? '');
    if (selector.includes('canvas') || selector === '#essaim-steer') {
        if (!target) return false;
        if (game === 'artificiers' && selector.includes('canvas')) {
            const aiming = (after.fingerInput as { aiming?: { x: number; y: number } | null } | undefined)?.aiming;
            return !!aiming && near(aiming.x, target.x) && near(aiming.y, target.y);
        }
        if (game === 'bubble') return scene?.aimingPointer != null && near(after.angle, Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180, Math.atan2(target.x - 180, 570 - target.y))), .008);
        if (game === 'essaim' && selector === '#essaim-steer') return near(after.target, Math.max(18, Math.min(342, Number(before.cannon) + target.x / 3 - 60)));
        if (game === 'essaim' || game === 'orbite') return near(after.target, Math.max(game === 'essaim' ? 18 : 16, Math.min(game === 'essaim' ? 342 : 344, Math.round(target.x))));
        if (game === 'briqueterie') return near(after.paddle, Math.max(Number(after.width) / 2, Math.min(360 - Number(after.width) / 2, target.x)));
    }
    if (game === 'artificiers' && selector === '#artificiers-weapon') return changed('weapon');
    if (game === 'caisses') return changed('moves', 'player', 'boxes');
    if (game === 'empilo') return changed('active', 'dealt', 'status', 'reserve');
    if (game === 'bubble' && selector === '#touch-swap') return changed('next', 'queued');
    if (game === 'briqueterie' && selector.endsWith('-launch')) return after.ready === false;
    return false;
}

/** Match every finger separately; a persistent command is not an event receipt. */
function receivedEvents(before: State, after: State, type: string, points: Touch[]): boolean {
    type Receipt = { sequence: number; events: { sequence: number; type: string; x: number; y: number }[] };
    const prior = (before.fingerInput as { receipts?: Receipt } | undefined)?.receipts;
    const next = (after.fingerInput as { receipts?: Receipt } | undefined)?.receipts;
    if (!prior || !next || next.sequence <= prior.sequence) return false;
    const remaining = next.events.filter(event => event.sequence > prior.sequence && event.type === type);
    return points.every(point => {
        const index = remaining.findIndex(event => Math.abs(event.x - point.x) < 1 && Math.abs(event.y - point.y) < 1);
        if (index < 0) return false;
        remaining.splice(index, 1);
        return true;
    });
}

/** Shared by the realtime spec and browser-free regression checks. */
export function performanceMetrics(renderedFrames: number, gameMs: number, realMs: number) {
    if (![renderedFrames, gameMs, realMs].every(Number.isFinite) || renderedFrames < 0 || gameMs < 0 || realMs <= 0) throw new RangeError('Mesure invalide');
    const fps = renderedFrames * 1000 / realMs;
    return {
        fps, gameToRealRatio: gameMs / realMs, thresholdFps: 30,
        warning: fps < 30 ? `Rendu inférieur au seuil indicatif de 30 i/s : ${fps.toFixed(2)}` : null,
    };
}
