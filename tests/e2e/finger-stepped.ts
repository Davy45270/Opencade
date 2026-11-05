/** Scene hooks may declare fingerReceived(selector, before, after, target) and fingerReleased(selectors, before, after).
 * Both run in the page on read() snapshots; event receipts are always required, and #resume must leave pause.
 * Without a declaration, event receipts suffice. New game: add fingerReceived: (s, b, a) => s === '#resume' || Number(a.moves) > Number(b.moves) to its hook.
 */
import type { Page, CDPSession, TestInfo } from '@playwright/test';
import type { FingerProof } from '../../src/games/finger-receipts';

export type Touch = { id: number; x: number; y: number };
type State = Record<string, unknown>;
type Receipt = { sequence: number; events: { sequence: number; type: string; x: number; y: number }[] };
type Hook = FingerProof & { fingerReceipts(): Receipt; read(): State; advance(ms: number): void };
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
        // jump. Browser timers cannot repeat a held button while CDP is slow.
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
    private async receipts(): Promise<Receipt> {
        return this.page.evaluate(id => {
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Crochet absent');
            return hook.fingerReceipts();
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
        if (reaction) await this.advance(); // A newly decided release (the scene may act here).
        const before = await this.read();
        const priorReceipt = await this.receipts();
        await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        this.active = false;
        await this.page.clock.runFor(17);
        const after = await this.read();
        const tapped = this.entries.at(-1)?.selectors ?? [];
        const effect = await this.page.evaluate(({ id, selectors, before, after }) => {
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Crochet absent');
            if (selectors.includes('#resume') && (after.fingerInput as { paused?: boolean } | undefined)?.paused !== false) return false;
            return hook.fingerReleased?.(selectors, before, after) ?? true;
        }, { id: this.game, selectors: tapped, before, after });
        const accepted = receivedEvents(priorReceipt, await this.receipts(), 'pointerup', this.activePoints) && effect;
        this.activePoints = [];
        this.entries.push({ type: 'touchEnd', selectors: [], intended: [], noise: [], points: [], timeMs: this.elapsed, missed: !accepted });
        if (!accepted) throw new Error(`toucher perdu : ${this.game} touchEnd`);
    }
    /** `delayMs`: the time before this event. A new decision costs a reaction (150 ms); the move that
     *  continues the same swipe is finger travel, not a new decision (about 60 ms for 60 px). */
    async touch(type: 'touchStart' | 'touchMove', intended: Touch[], selectors = intended.map(() => '#game canvas'), delayMs = 150): Promise<void> {
        if (!intended.length) throw new Error('Toucher vide');
        await this.advance(delayMs); // The observation used by the caller is now delayMs game ms old.
        if (type === 'touchStart') await this.endTouch(false); // Already waited for this replacement decision.
        const before = await this.read();
        const priorReceipt = await this.receipts();
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
        const received = receivedEvents(priorReceipt, await this.receipts(), type === 'touchStart' ? 'pointerdown' : 'pointermove', points);
        const proved = await this.page.evaluate(({ id, selectors, before, after, targets }) => {
            const hook = window.__ARCADE_TEST__?.games[id] as Hook | undefined;
            if (!hook) throw new Error('Crochet absent');
            return selectors.map((selector, i) => hook.fingerReceived?.(selector, before, after, targets[i]) ?? true);
        }, { id: this.game, selectors, before, after, targets });
        const accepted = received && targets.every(t => t.hit) && proved.every(Boolean);
        this.entries.push({ type, selectors, points, intended, noise, timeMs: this.elapsed, missed: !accepted });
        // The diagnosis says which proof failed: browser receipt, hit test (and what was hit) or the game's own proof.
        if (!accepted) {
            const hits = await this.page.evaluate(points => points.map(p => { const e = document.elementFromPoint(p.x, p.y); return e ? `${(e.tagName || "el").toLowerCase()}${e.id ? `#${e.id}` : ''}${typeof e.className === 'string' && e.className ? `.${e.className.split(' ').join('.')}` : ''}` : 'hors écran'; }), points);
            throw new Error(`toucher perdu : ${this.game} ${selectors.join(', ')} — reçu ${String(received)} · touché ${targets.map(t => String(t.hit)).join('/')} (${hits.join(' / ')}) · preuve ${proved.map(String).join('/')}`);
        }
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

/** Match every finger separately; a persistent command is not an event receipt. */
function receivedEvents(prior: Receipt, next: Receipt, type: string, points: Touch[]): boolean {
    if (next.sequence <= prior.sequence) return false;
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
