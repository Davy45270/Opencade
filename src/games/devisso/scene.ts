import { fingerProof } from './finger';
import Phaser from 'phaser';
import './style.css';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { Engine, LEVELS, GAME_NAME, RESCUE_STEPS, type Boost } from '../../engines/devisso/engine';
import { coveredBy } from '../../engines/devisso/rules';
import { trap } from '../../engines/devisso/solver';
import { shape, rotate } from '../../engines/devisso/shapes';
import { workshopTip } from '../../engines/devisso/tips';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { reserveHudRow } from '../../shell/hud';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { canvasGraphics } from '../thumbnail-art';
import {
    BOARD, ROWS, UI, backdrop, boardFrame, boostIcon, boxArt, burst, chainArt, coinIcon, crateArt, dust, heartIcon,
    impact, miniBox, pill, plate, screwHead, slotArt, starIcon, toBoard, toWorld, type ScrewLook,
} from './art';
export const devissoButtons: readonly TouchButton[] = [
    { id: 'devisso-undo', label: '', ariaLabel: 'Annuler : un coup en arrière', size: 56, placement: 'center', mode: 'tap' },
    { id: 'devisso-hint', label: '', ariaLabel: 'Indice : la vis à dévisser', size: 56, placement: 'center', mode: 'tap' },
    { id: 'devisso-hammer', label: '', ariaLabel: 'Marteau : briser une plaque ou une caisse', size: 56, placement: 'center', mode: 'tap' },
    { id: 'devisso-bomb', label: '', ariaLabel: 'Explosion : souffler une zone', size: 56, placement: 'center', mode: 'tap' },
    { id: 'devisso-drill', label: '', ariaLabel: 'Perçage : ôter n’importe quelle vis', size: 56, placement: 'center', mode: 'tap' },
];
/** Boosts that wait for a point on the board. */
const AIMED: readonly Boost[] = ['hammer', 'bomb', 'drill'];
const AIM_TEXT: Record<string, string> = {
    hammer: 'Marteau : touchez une plaque ou une caisse.', bomb: 'Explosion : touchez le centre de la zone.', drill: 'Perçage : touchez n’importe quelle vis.',
};
/** The "Reprendre" button of the dead-end banner (world pixels). */
const RESCUE = { x: 70, y: 392, w: 220, h: 52 } as const;
interface Flight { color: number; from: [number, number]; to: [number, number]; t: number; look: ScrewLook }
interface Fall { plate: number; shift: [number, number]; t: number }
interface Spark { kind: 'burst' | 'dust' | 'impact'; x: number; y: number; t: number; color: number }
export interface DevissoHook {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { armed: Boost | null; animating: boolean; progression: string; cumulativeScore: number; character: ReturnType<GameCharacter['snapshot']>; fingerInput: { paused: boolean; armed: Boost | null } };
    advance(ms: number): void;
    hudText(): string;
    /** The coin figure drawn in the HUD pill. */
    hudCoins(): string;
    /** Canvas banners drawn over the board (world rects): the dead end only; a win leaves the ending to the shell panel. */
    banners(): { x: number; y: number; width: number; height: number }[];
    /** The tip row under the board (world rect) and its text. */
    tipRow(): { x: number; y: number; width: number; height: number; text: string };
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    /** World point of screw `i` (centre), for finger tests. */
    screwPoint(i: number): { x: number; y: number };
    /** A free screw that keeps a winning line (solver), or -1. */
    bestMove(): number;
    /** Ordinary taps toward a named situation: a dead end, or one tap from the win. */
    scenario(name: 'stuck' | 'finish' | 'crowded'): number;
}
declare global { interface Window { __DEVISSO_TEST__?: DevissoHook } }
export class DevissoScene extends Phaser.Scene {
    private hero = new GameCharacter(selectedCharacter());
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'devisso', LEVELS.length), LEVELS.length);
    private inputs = new Inputs();
    private manual = false;
    private selecting = false;
    private armed: Boost | null = null;
    private flights: Flight[] = [];
    private falls: Fall[] = [];
    private sparks: Spark[] = [];
    /** World rect of the canvas banner drawn last frame, or null. */
    private banner: { x: number; y: number; width: number; height: number } | null = null;
    private turning = new Map<number, number>();
    private shake = { screw: -1, t: 0 };
    private boxDone = 0;
    private graphics?: Phaser.GameObjects.Graphics;
    private texts: Record<'level' | 'coins' | 'hearts' | 'boxes' | 'tip' | 'title' | 'sub' | 'button', Phaser.GameObjects.Text> | null = null;
    private hud?: Phaser.GameObjects.Text;
    constructor(private session = new PlaySession(false)) { super('devisso'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.armed = null;
        this.flights = []; this.falls = []; this.sparks = []; this.turning.clear(); this.boxDone = 0; this.sync();
    }
    private blocked(): boolean { return this.session.paused || this.selecting; }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('devisso');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('devisso'); reserveHudRow(false); delete window.__DEVISSO_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        // The ⏸ gets its own row: the canvas draws level, coins and hearts across the top.
        reserveHudRow();
        this.graphics = this.add.graphics();
        const text = (x: number, y: number, size: number, color = '#ffffff', bold = true): Phaser.GameObjects.Text =>
            this.add.text(x, y, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${String(size)}px`, fontStyle: bold ? 'bold' : 'normal', color }).setDepth(2);
        this.texts = {
            level: text(20, 17, 16), coins: text(259, 17, 15, '#4a3205'), hearts: text(332, 17, 15),
            boxes: text(176, 62, 12, '#ffffff', false), tip: text(60, 598, 13, '#ffffff', false).setWordWrapWidth(292).setLineSpacing(2),
            title: text(180, 318, 24).setOrigin(0.5, 0).setDepth(4), sub: text(180, 356, 14, '#ffffff', false).setOrigin(0.5, 0).setDepth(4).setAlign('center').setWordWrapWidth(270),
            button: text(180, 408, 16).setOrigin(0.5, 0).setDepth(4),
        };
        this.hud = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
        renderTouchControls(this.inputs, devissoButtons, (id, held) => { if (held) this.boost(id.replace('devisso-', '') as Boost); });
        for (const kind of ['undo', 'hint', 'hammer', 'bomb', 'drill'] as const) {
            const button = document.querySelector(`#devisso-${kind}`), icon = document.createElement('canvas');
            icon.width = 56; icon.height = 56; icon.setAttribute('aria-hidden', 'true');
            const context = icon.getContext('2d'); if (context) boostIcon(canvasGraphics(context), kind, 2, 2, 52);
            const count = document.createElement('span'); count.className = 'boost-count';
            button?.replaceChildren(icon, count);
        }
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.pointer(p.worldX, p.worldY); });
        this.inputs.on(document, 'keydown', event => { this.keydown(event as KeyboardEvent); });
        const retry = (): void => { this.progress.retry(); this.start(this.engine.level, this.engine.seed); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const levels = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : dévisser les vis libres, remplir les boîtes de leur couleur`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__DEVISSO_TEST__ = this.testHook(receipts);
        this.start(this.progress.level, undefined, true);
    }
    private keydown(e: KeyboardEvent): void {
        if (e.repeat || this.blocked()) return;
        const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
        if (digit >= 0) { e.preventDefault(); this.boost((['undo', 'hint', 'hammer', 'bomb', 'drill'] as const)[digit] ?? 'undo'); }
        else if (e.code === 'KeyZ' || e.code === 'Backspace') { e.preventDefault(); this.boost('undo'); }
        else if (e.code === 'KeyH') { e.preventDefault(); this.boost('hint'); }
        else if (e.code === 'Escape' && this.armed) { e.preventDefault(); this.armed = null; this.sync(); }
        else if (e.code === 'KeyR') { e.preventDefault(); this.progress.retry(); this.start(this.engine.level, this.engine.seed); }
        else if ((e.code === 'Enter' || e.code === 'Space') && this.engine.stuck) { e.preventDefault(); this.rescue(); }
        else if (e.code === 'Enter' || e.code === 'Space') {
            // Keyboard play: the hint's screw if one is shown, else the first free screw that fits.
            e.preventDefault();
            const i = this.engine.hint >= 0 ? this.engine.hint : this.engine.board.screws.findIndex((_, k) => this.engine.state.present[k] && this.engine.blocker(k) === null);
            if (i >= 0) this.tap(i);
        }
    }
    private boost(kind: Boost): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        if (AIMED.includes(kind)) { this.armed = this.armed === kind || this.engine.boosts[kind] <= 0 ? null : kind; this.sync(); return; }
        this.armed = null;
        if (kind === 'undo') { if (this.engine.undo()) sound.playEffect('undo'); }
        else if (this.engine.useHint() >= 0) sound.playEffect('hint');
        this.flights = []; this.falls = []; this.sync();
    }
    private pointer(x: number, y: number): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        if (this.engine.stuck && !this.armed) {
            if (x >= RESCUE.x && x <= RESCUE.x + RESCUE.w && y >= RESCUE.y && y <= RESCUE.y + RESCUE.h) this.rescue();
            return;
        }
        if (y < BOARD.y || y > BOARD.y + BOARD.h) return;
        const [bx, by] = toBoard(x, y);
        if (this.armed) {
            const before = this.engine.snapshot(), kind = this.armed;
            const done = kind === 'drill' ? (() => { const i = this.engine.screwAt(bx, by, true); return i >= 0 && this.engine.drill(i); })()
                : kind === 'hammer' ? this.engine.hammer(bx, by) : this.engine.bomb(bx, by);
            if (done) { this.armed = null; sound.playEffect(kind); this.animate(before); if (kind === 'bomb') this.sparks.push({ kind: 'burst', x, y, t: 0, color: 0xff7a2f }); }
            this.sync(); return;
        }
        const i = this.engine.screwAt(bx, by);
        if (i >= 0) this.tap(i);
    }
    private tap(i: number): void {
        const before = this.engine.snapshot();
        if (this.engine.tap(i)) { this.animate(before); this.hero.move(0, this.engine.events.includes('complete')); }
        else {
            this.shake = { screw: i, t: 0 }; this.hero.impact = 300;
            const [x, y] = toWorld(...this.engine.position(i)); this.sparks.push({ kind: 'impact', x, y, t: 0, color: 0xffffff });
            sound.playEffect('refused');
        }
        this.sync();
    }
    private rescue(): void {
        if (this.engine.rescue()) { this.flights = []; this.falls = []; sound.playEffect('rescue'); this.sync(); }
    }
    /** Flights to the box or the buffer, plates falling, sparks, from the snapshot before the action. */
    private animate(before: ReturnType<Engine['snapshot']>): void {
        const e = this.engine;
        for (const event of e.events) if (!['stuck', 'won', 'lost'].includes(event)) sound.playEffect(event);
        const box = this.boxCenter(), slot = (k: number): [number, number] => [this.slotX(k) + 20, ROWS.buffer + 20];
        let buffered = before.buffer.length;
        for (const i of e.removed) {
            const screw = e.board.screws[i]; if (!screw) continue;
            const from = toWorld(...this.positionIn(before.shift, i));
            const intoBuffer = e.events.includes('buffer') && e.state.buffer.length > before.buffer.length && !before.slots.some(b => b && b.color === screw.color && b.filled < 3);
            this.flights.push({ color: screw.color, from, to: intoBuffer ? slot(buffered++) : box, t: 0, look: this.look(i) });
            this.turning.set(i, 0);
        }
        for (const p of e.fell) {
            this.falls.push({ plate: p, shift: [...(before.shift[p] ?? [0, 0])] as [number, number], t: 0 });
            const plateDef = e.board.plates[p];
            if (plateDef) { const [x, y] = toWorld(plateDef.x + (before.shift[p]?.[0] ?? 0), plateDef.y + (before.shift[p]?.[1] ?? 0)); this.sparks.push({ kind: 'dust', x, y: y + 40, t: 0, color: 0 }); }
        }
        if (e.events.includes('complete')) { this.boxDone = 1; this.sparks.push({ kind: 'burst', x: box[0], y: box[1], t: 0, color: 0xffd84a }); }
        if (e.events.includes('gold') || e.events.includes('slot')) this.sparks.push({ kind: 'burst', x: this.slotX(5) + 20, y: ROWS.buffer + 20, t: 0, color: 0xffc928 });
    }
    private positionIn(shift: number[][], i: number): [number, number] {
        const screw = this.engine.board.screws[i], p = screw ? this.engine.board.plates[screw.plate] : undefined;
        if (!screw || !p) return [0, 0];
        return [p.x + (shift[screw.plate]?.[0] ?? 0) + screw.lx, p.y + (shift[screw.plate]?.[1] ?? 0) + screw.ly];
    }
    private look(i: number): ScrewLook {
        const s = this.engine.board.screws[i], st = this.engine.state;
        if (!s) return { color: 0 };
        return { color: s.color, key: s.key, lock: s.lock && !st.unlocked, tnt: s.tnt, gold: s.gold, ice: st.ice[i] ?? 0, gear: s.gear !== null, portal: s.portal >= 0, chain: st.chained[i] ?? false };
    }
    private boxCenter(): [number, number] { return [88, ROWS.boxes + 34]; }
    private slotX(k: number): number { return 38 + k * 49; }
    private testHook(receipts: ReturnType<typeof fingerReceipts>): DevissoHook {
        return {
            ...fingerProof,
            fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), armed: this.armed, animating: this.flights.length + this.falls.length > 0, progression: this.progress.state, cumulativeScore: this.progress.total, character: this.hero.snapshot(), fingerInput: { paused: this.blocked(), armed: this.armed } }),
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.manual = true;
                for (let left = ms; left > 0; left -= 1000 / 60) this.tick(Math.min(left, 1000 / 60));
                if (ms === 0) this.tick(0);
            },
            hudText: () => this.hud?.text ?? '',
            hudCoins: () => this.texts?.coins.text ?? '',
            banners: () => this.banner ? [{ ...this.banner }] : [],
            tipRow: () => ({ x: 4, y: ROWS.tip, width: 352, height: 44, text: this.texts?.tip.text ?? '' }),
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            screwPoint: i => { const [x, y] = toWorld(...this.engine.position(i)); return { x, y }; },
            bestMove: () => {
                const probe = new Engine(); probe.loadLevel(this.engine.level, this.engine.seed); probe.state = this.engine.state; probe.boosts.hint = 1;
                return probe.useHint();
            },
            scenario: name => {
                this.start(this.engine.level, this.engine.seed, true);
                const e = this.engine;
                if (name === 'stuck') {
                    // A real dead end found by the bounded search, played with ordinary taps.
                    for (const i of trap(e.board, e.state, 20000) ?? []) e.tap(i);
                } else if (name === 'crowded') {
                    // Along the dead-end line, stop with four screws waiting in the buffer.
                    for (const i of trap(e.board, e.state, 20000) ?? []) { if (e.state.buffer.length >= 4) break; e.tap(i); }
                } else {
                    const probe = new Engine(); probe.loadLevel(e.level, e.seed);
                    const line: number[] = [];
                    for (let n = 0; n < 200 && probe.status === 'playing'; n++) { probe.boosts.hint = 1; const i = probe.useHint(); if (i < 0) break; line.push(i); probe.tap(i); }
                    for (const i of line.slice(0, -1)) e.tap(i);
                    this.flights = []; this.falls = []; this.sync(); return line.at(-1) ?? -1;
                }
                this.flights = []; this.falls = []; this.sync(); return -1;
            },
        };
    }
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void { this.tick(this.manual ? 0 : delta); }
    private tick(delta: number): void {
        const paused = this.blocked();
        const dt = paused ? 0 : delta;
        if (!paused) this.engine.advance(delta);
        for (const f of this.flights) f.t += dt / 420;
        for (const f of this.falls) f.t += dt / 650;
        for (const s of this.sparks) s.t += dt / 600;
        for (const [i, t] of this.turning) this.turning.set(i, t + dt / 420);
        this.flights = this.flights.filter(f => f.t < 1); this.falls = this.falls.filter(f => f.t < 1); this.sparks = this.sparks.filter(s => s.t < 1);
        for (const [i, t] of this.turning) if (t >= 1) this.turning.delete(i);
        this.shake.t += dt; this.boxDone = Math.max(0, this.boxDone - dt / 500);
        this.hero.advance(Math.min(delta, 100), paused, this.engine.status, this.flights.length > 0 && this.engine.events.includes('complete'));
        this.draw();
    }
    private sync(): void {
        const e = this.engine;
        if (e.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(e.status, e.score); writeSave(browserStorage(), this.progress.save, 'devisso'); sound.playEffect(e.status);
        }
        for (const kind of ['undo', 'hint', 'hammer', 'bomb', 'drill'] as const) {
            const button = document.querySelector<HTMLButtonElement>(`#devisso-${kind}`); if (!button) continue;
            const count = e.boosts[kind];
            button.disabled = e.status !== 'playing' || count <= 0 || (kind === 'undo' && e.snapshot().history === 0);
            button.setAttribute('aria-pressed', String(this.armed === kind));
            const badge = button.querySelector('.boost-count'); if (badge) badge.textContent = String(count);
        }
        this.panels();
        const scores = document.querySelector('#result-scores');
        if (scores && e.status === 'won') scores.textContent = `${'★'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)} · Pièces : ${String(e.score)} · Score cumulé : ${String(this.progress.total)}`;
        this.draw();
    }
    private draw(): void {
        const g = this.graphics, t = this.texts; if (!g || !t) return;
        const e = this.engine, s = e.state, b = e.board, level = LEVELS[e.level], theme = level?.theme ?? 'atelier';
        const now = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : e.time / 1000;
        g.clear();
        backdrop(g, theme);
        // HUD: level, stars and progress, coins, hearts.
        pill(g, 8, 10, 100, 34, UI.violet);
        t.level.setText(`Niveau ${String(e.level + 1)}`);
        for (let k = 0; k < 3; k++) starIcon(g, 136 + k * 26, 22, 10, k < e.stars);
        const removed = s.present.filter(p => !p).length;
        g.fillStyle(0x000000, 0.3); g.fillRoundedRect(118, 36, 106, 9, 4.5);
        g.fillStyle(UI.green); g.fillRoundedRect(118, 36, Math.max(9, 106 * removed / b.screws.length), 9, 4.5);
        pill(g, 232, 10, 68, 34, 0xffe27a); coinIcon(g, 246, 27, 9); t.coins.setText(String(e.purse));
        pill(g, 304, 10, 50, 34, 0xd8324a); heartIcon(g, 318, 26, 9, 0xffffff); t.hearts.setText(String(e.hearts));
        // Boxes: the open one, then the queue.
        const active = s.slots[0] ?? null;
        boxArt(g, 12, ROWS.boxes + 8, 152, 52, active ? active.color : null, active ? active.filled : 0, this.boxDone);
        const queued = b.queue.slice(s.next, s.next + 5);
        queued.forEach((c, k) => { miniBox(g, 178 + k * 36, ROWS.boxes + 26, c, k === 0 ? 1 : 0.8); });
        const total = b.queue.length;
        t.boxes.setText(`Boîtes ${String(s.boxes)}/${String(total)}${queued.length ? ' · suivantes' : ''}`);
        // Buffer: five slots, the sixth locked until a gold screw opens it.
        const full = s.buffer.length / s.cap;
        for (let k = 0; k < 6; k++) {
            const x = this.slotX(k), y = ROWS.buffer;
            slotArt(g, x, y, 40, k >= s.cap, full >= 0.8 && k < s.cap ? 0.5 + 0.5 * Math.sin(e.time / 160) : 0);
            const c = s.buffer[k];
            if (c !== undefined) screwHead(g, x + 20, y + 20, { color: c }, 13);
        }
        // Board.
        boardFrame(g, theme);
        const plates = b.plates.map((p, k) => ({ p, k })).filter(({ k }) => s.plates[k]).sort((a, z) => a.p.z - z.p.z || a.k - z.k);
        const free: number[] = [];
        const holesOf = (k: number, shift: readonly number[]): [number, number][] => {
            const p = b.plates[k]; if (!p) return [];
            return shape(p.shape).holes.map(([hx, hy]) => { const [x, y] = rotate(hx, hy, p.rot); return [p.x + (shift[0] ?? 0) + x, p.y + (shift[1] ?? 0) + y]; });
        };
        const drawScrew = (i: number, dim: number): void => {
            const [bx, by] = e.position(i), [x, y] = toWorld(bx, by);
            const shaking = this.shake.screw === i && this.shake.t < 300 ? Math.sin(this.shake.t / 25) * 4 * (1 - this.shake.t / 300) : 0;
            screwHead(g, x + shaking, y, this.look(i), 14, now * 0.4 + i, dim, e.hint === i ? 0.6 + 0.4 * Math.sin(e.time / 120) : 0);
        };
        for (const { p, k } of plates) {
            plate(g, { shape: p.shape, x: p.x + (s.shift[k]?.[0] ?? 0), y: p.y + (s.shift[k]?.[1] ?? 0), rot: p.rot, tint: p.tint, material: p.material }, holesOf(k, s.shift[k] ?? [0, 0]), 1, p.z * 2);
            b.screws.forEach((screw, i) => {
                if (screw.plate !== k || !s.present[i]) return;
                const cover = coveredBy(b, s, i);
                if (cover.plates.length + cover.crates.length > 0) drawScrew(i, 0.55); else free.push(i);
            });
        }
        b.crates.forEach((c, k) => { const hp = s.crates[k] ?? 0; if (hp > 0) crateArt(g, c.x, c.y, hp); });
        b.screws.forEach((screw, i) => { if (screw.chain >= 0 && s.chained[i] && s.present[screw.chain]) chainArt(g, e.position(i), e.position(screw.chain)); });
        for (const i of free) drawScrew(i, e.blocker(i) ? 0.25 : 0);
        // Falling plates and flying screws.
        for (const f of this.falls) {
            const p = b.plates[f.plate]; if (!p) continue;
            plate(g, { shape: p.shape, x: p.x + f.shift[0], y: p.y + f.shift[1] + f.t * f.t * 4, rot: p.rot, tint: p.tint, material: p.material }, holesOf(f.plate, [f.shift[0], f.shift[1] + f.t * f.t * 4]), 1 - f.t, 6);
        }
        for (const f of this.flights) {
            const k = Math.min(1, Math.max(0, (f.t - 0.3) / 0.7)), ease = k * k * (3 - 2 * k);
            const x = f.from[0] + (f.to[0] - f.from[0]) * ease, y = f.from[1] + (f.to[1] - f.from[1]) * ease - Math.sin(ease * Math.PI) * 40;
            screwHead(g, x, y, { ...f.look, ice: 0, lock: false, chain: false }, 14 * (1 + 0.25 * Math.sin(Math.min(1, f.t / 0.3) * Math.PI)), f.t * 14);
        }
        for (const sp of this.sparks) {
            if (sp.kind === 'burst') burst(g, sp.x, sp.y, sp.t, sp.color); else if (sp.kind === 'dust') dust(g, sp.x, sp.y, sp.t); else impact(g, sp.x, sp.y, sp.t);
        }
        // Companion and tip.
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(4, ROWS.tip, 352, 44, 12);
        this.hero.draw(g, 6, ROWS.tip - 6, 50);
        const tip = this.armed ? AIM_TEXT[this.armed] ?? '' : e.hint >= 0 ? 'Indice : la vis qui brille garde la partie gagnable.' : e.events.includes('nohint') ? 'Pas d’indice d’ici : annulez un coup.' : workshopTip(e.level);
        t.tip.setText(tip);
        // Dead-end banner (red). A won level has one ending only: the shell's result panel (stars, coins, next level);
        // the canvas then just dims the board and says so in the tip row, clear of that panel.
        const banner = e.stuck && !this.armed && e.status === 'playing';
        t.tip.setVisible(true); t.title.setVisible(banner); t.sub.setVisible(banner); t.button.setVisible(banner && e.hearts > 0);
        this.banner = null;
        if (e.status === 'won') {
            g.fillStyle(0x000000, 0.45); g.fillRect(0, BOARD.y, 360, BOARD.h);
            t.tip.setText(`Niveau terminé ! ${level?.name ?? ''}`);
        }
        if (banner) {
            const top = 298, height = 156;
            this.banner = { x: 30, y: top, width: 300, height };
            g.fillStyle(0x000000, 0.45); g.fillRect(0, BOARD.y, 360, BOARD.h);
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(34, top + 6, 300, height, 20);
            g.fillStyle(UI.red); g.fillRoundedRect(30, top, 300, height, 20);
            g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(38, top + 6, 284, 30, 12);
            t.title.setY(top + 20); t.sub.setY(top + 58);
            t.title.setText('Aucun coup possible !');
            const left = e.hearts > 0 ? `Un cœur reprend les ${String(RESCUE_STEPS)} derniers coups.` : 'Plus de cœur : un bonus, ou recommencer.';
            t.sub.setText(`Réserve pleine, aucune vis ne rentre.\n${left}`);
            if (e.hearts > 0) { pill(g, RESCUE.x, RESCUE.y, RESCUE.w, RESCUE.h, 0xffffff); heartIcon(g, RESCUE.x + 30, RESCUE.y + 25, 11); t.button.setText('Reprendre').setColor('#c8283a'); }
        }
        const text = `DÉVISSO · ${String(e.level + 1)}/${String(LEVELS.length)} · ${level?.name ?? ''} · SCORE ${String(e.purse)}\nVIS ${String(removed)}/${String(b.screws.length)} · BOÎTES ${String(s.boxes)}/${String(total)} · RÉSERVE ${String(s.buffer.length)}/${String(s.cap)} · CŒURS ${String(e.hearts)}\n${tip}`;
        this.hud?.setText(text);
        const status = document.querySelector('#status'); if (status) status.textContent = text;
    }
}
