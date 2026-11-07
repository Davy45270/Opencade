import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import { TAP_STEP_MS, due, land, lift, slide, type TapGesture } from './tap';
import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, PLANS, filled, castawayAt, shelterOpen, type Direction } from '../../engines/traverse/engine';
import { crossingTip } from '../../engines/traverse/tips';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { car, hudVeil, log, turtle, worldOf, SceneryLayer, BlockPool, baked } from '../universal/art';
import { CAR_PAINTS, crossingScenery, hut, laneRuns } from './art';
export const traverseButtons: readonly TouchButton[] = [
    // Tap the road to step forward, swipe for the sides (or back); Bond stays a button.
    { id: 'traverse-special', label: 'Bond', ariaLabel: 'Bond', size: 56, placement: 'right', mode: 'tap' },
];
export interface TraverseHook {
    performance(): { frames: number; gameMs: number };
    bounds(): { hud: { x: number; y: number; width: number; height: number }; hero: { x: number; y: number; width: number; height: number } };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean; down: boolean; acted: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
    /** What the last frame drew for the crossing's rules (pass 404). */
    marks(): { red: number; green: number; rocks: number; castaway: boolean; closedShelters: number };
}
declare global { interface Window { __TRAVERSE_TEST__?: TraverseHook } }
export class TraverseScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'traverse', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    /** Static scenery layer, repainted only when its key changes (level, board): software rendering stays fast. */
    private scenery?: SceneryLayer;
    /** Cars, logs, turtles and huts baked once per shape, shown as pooled images; waves on a cheap layer below them. */
    private pieces?: BlockPool;
    private under?: Phaser.GameObjects.Graphics;
    private paintedRocks = 0;
    private hud?: Phaser.GameObjects.Text;
    private gesture: (TapGesture & { id: number; timer?: ReturnType<typeof setTimeout> }) | null = null;
    private heroBounds = { x: 0, y: 0, width: 24, height: 24 };
    private drawn = { red: 0, green: 0, rocks: 0, castaway: false, closedShelters: 0 };
    
    constructor(private session = new PlaySession(true)) { super('traverse'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('traverse');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('traverse'); delete window.__TRAVERSE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.scenery = new SceneryLayer(this, 'traverse');
        this.under = this.add.graphics().setDepth(-0.5);
        this.pieces = new BlockPool(this, 0);
        this.graphics = this.add.graphics().setDepth(1);
        this.hud = this.add.text(10, 6, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 4 }).setDepth(2);
        const direction = (value: Direction | 'special'): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            if (value === 'special') this.engine.special(); else this.engine.input(value);
            sound.playEffect('step');
        };
        renderTouchControls(this.inputs, traverseButtons, (id, held) => { if (held) direction(id.replace('traverse-', '') as Direction | 'special'); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            const drop = (): void => { if (this.gesture) clearTimeout(this.gesture.timer); this.gesture = null; };
            this.inputs.cleanup(drop);
            this.inputs.on(area, 'pointerdown', event => {
                const e = event as PointerEvent;
                if (this.gesture || this.session.paused || this.selecting) return;
                e.preventDefault(); area.setPointerCapture(e.pointerId);
                // A still finger steps forward on release, or TAP_STEP_MS after landing if it is still down (whichever comes first).
                const g = { ...land(e.clientX, e.clientY, performance.now()), id: e.pointerId, timer: undefined as ReturnType<typeof setTimeout> | undefined };
                g.timer = setTimeout(() => { if (this.gesture === g && due(g, performance.now())) direction('up'); }, TAP_STEP_MS);
                this.gesture = g;
            });
            // A swipe acts as soon as it is long enough; sideways travel before the step cancels the forward step.
            this.inputs.on(area, 'pointermove', event => {
                const e = event as PointerEvent, g = this.gesture;
                if (!g || e.pointerId !== g.id) return;
                const d = slide(g, e.clientX, e.clientY);
                if (d) direction(d);
            });
            this.inputs.on(area, 'pointerup', event => {
                const e = event as PointerEvent, g = this.gesture;
                if (!g || e.pointerId !== g.id) return;
                drop();
                const d = lift(g, e.clientX, e.clientY);
                if (d) direction(d);
            });
            for (const type of ['pointercancel', 'lostpointercapture']) this.inputs.on(area, type, drop);
        }
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right' };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            const value = e.code === 'Space' ? 'special' : keys[e.code];
            if (value) { e.preventDefault(); if (!e.repeat) direction(value); }
        });
        const choose = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Traverse : rejoindre les abris entre route et rivière');
        if (new URLSearchParams(location.search).get('test') === '1') window.__TRAVERSE_TEST__ = {
            ...fingerProof,
            bounds: () => { const h = this.hud?.getBounds(); return { hud: { x: h?.x ?? 0, y: h?.y ?? 0, width: h?.width ?? 0, height: h?.height ?? 0 }, hero: { ...this.heroBounds } }; },
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 9, y: 64, width: 342, height: 570 }),
            performance: () => ({ frames: this.game.loop.frame, gameMs: (this.engine.state.phase * (30 - Math.floor(17 * this.engine.level / 29)) + this.engine.snapshot().frames) * 1000 / 60 }),
            fingerReceipts: receipts,
            read: () => ({ fingerInput: { paused: this.session.paused, down: this.gesture !== null, acted: this.gesture?.acted ?? false }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            marks: () => ({ ...this.drawn }),
            scenario: name => {
                this.start(0, 454, true);
                const state = this.engine.state;
                const road = this.engine.board.lanes.find(l => l.kind === 'road');
                if (!road) throw new Error('Voie routière absente');
                const hitColumn = Array.from({ length: 9 }, (_, x) => x).find(x => filled(road, x, 0, 0));
                if (hitColumn === undefined) throw new Error('Véhicule absent');
                const player = name === 'finish' ? { x: 7, y: 1 } : { x: hitColumn, y: road.y + 1 };
                this.engine.loadState({ ...state, player, previous: { ...player }, occupied: name === 'finish' ? [1, 4] : [], time: 60000, lives: name === 'finish' ? 3 : 1 });
                this.testManual = true; this.tick(0);
            },
        };
        this.scale.refresh();
        this.panels(); this.draw();
    }
    private advanceTest(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
        this.testManual = true;
        this.testAdvancing = true;
        try {
            if (!this.session.paused && !this.selecting) {
                const step = 1000 / 60;
                for (let i = 0; i < Math.ceil(ms / step); i++) {
                    const delta = Math.min(step, ms - i * step);
                    this.tick(delta);
                }
            }
        } finally {
            this.testAdvancing = false;
            this.tick(0);
        }
    }
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const lives = this.engine.state.lives, previous = { ...this.engine.state.player };
        if (!this.selecting && !this.session.paused) this.engine.step(delta);
        if (this.engine.state.lives < lives) { sound.playEffect('life'); this.hero.impact = 500; }
        else if (previous.x !== this.engine.state.player.x || previous.y !== this.engine.state.player.y) this.hero.move(this.engine.state.player.x - previous.x, true);
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialMs > 0);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'traverse'); sound.playEffect(this.engine.status);
        }
        if (this.testAdvancing) return;
        this.scale.refresh();
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state;
        const world = worldOf(this.engine.level), time = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : this.time.now / 1000;
        g.clear();
        const layer = this.scenery, sg = layer?.g;
        if (layer && sg && layer.stale(this.engine.board)) {
            // Sky, grass strips and asphalt never move within a crossing.
            this.paintedRocks = crossingScenery(sg, world, this.engine.board); hudVeil(sg, world, 4, 2, 352, 60);
            layer.commit();
        }
        const u = this.under, pool = this.pieces; u?.clear(); pool?.begin();
        this.drawn = { red: 0, green: 0, rocks: 0, castaway: false, closedShelters: 0 };
        const paints = CAR_PAINTS;
        for (let y = 0; y < 15; y++) {
            const lane = this.engine.board.lanes.find(l => l.y === y), top = 64 + y * 38;
            if (lane?.kind === 'river' && u) {
                // Wave crests drift with the current: a few plain dashes, the water itself is baked.
                u.fillStyle(world === 'volcan' ? 0xffc04a : 0xcff3ff, .7);
                for (let i = 0; i < 6; i++) { const wx = 9 + ((((i * 61 + time * 26 * (lane.direction || 1)) % 342) + 342) % 342); u.fillRect(Math.min(wx, 335), top + 9 + (i % 2) * 13, 14, 2); }
            }
            if (lane) {
                // Contiguous cells form one vehicle, log or row of turtles.
                for (const [run, x] of laneRuns(lane, s.phase, this.engine.level)) {
                    const left = 11 + run * 38, width = (x - run) * 38 - 4;
                    if (lane.kind === 'road') { const paint = paints[(lane.y + run) % paints.length] ?? 0xff5f5f; pool?.show(baked(this, `car-${paint.toString(16)}-${String(width)}-${String(lane.direction)}`, width, 30, b => { car(b, 0, 2, width, 24, paint, lane.direction); }), left, top + 5); }
                    else if (lane.diver) { const key = baked(this, `turtle-${String(lane.direction)}`, 38, 26, b => { turtle(b, 19, 13, 12, lane.direction); }); for (let k = run; k < x; k++) pool?.show(key, 9 + k * 38, top + 6); }
                    else pool?.show(baked(this, `log-${String(width)}`, width, 26, b => { log(b, 0, 0, width, 26); }), left, top + 6);
                }
            }
            if (lane?.light) {
                // Light at the lane's left edge: red while the lane stands still next quantum.
                const red = (s.phase % lane.light.period) < lane.light.red; this.drawn[red ? 'red' : 'green']++;
                g.fillStyle(0x111111); g.fillRoundedRect(10, 66 + y * 38, 10, 33, 3); g.fillStyle(red ? 0xff4d4d : 0x4dff88); g.fillCircle(15, red ? 74 + y * 38 : 92 + y * 38, 4);
            }
            if (lane?.kind === 'river' && ((lane.speed ?? 1) > 1 || lane.tide)) {
                // Current chevrons: doubled on rapids, pointing where the water flows now.
                const flow = Math.sign((lane.tide ? (Math.floor(s.phase / lane.tide) % 2 ? -1 : 1) : 1) * lane.direction), cy = 82 + y * 38;
                for (const cx of (lane.speed ?? 1) > 1 ? [334, 342] : [338]) { g.fillStyle(0xbfe9ff, 0.9); g.fillTriangle(cx + flow * 5, cy, cx - flow * 4, cy - 6, cx - flow * 4, cy + 6); }
            }
        }
        // Rocks are baked with the scenery; the count stays what the player sees.
        // Rocks live in the baked scenery: report the ones actually painted there.
        this.drawn.rocks = this.paintedRocks;
        const castaway = s.rescued ? null : castawayAt(this.engine.board, s.phase);
        if (castaway) { this.drawn.castaway = true; g.fillStyle(0xffe08a); g.fillCircle(28 + castaway.x * 38, 83 + castaway.y * 38, 9); g.lineStyle(2, 0xff6b6b); g.strokeCircle(28 + castaway.x * 38, 83 + castaway.y * 38, 12); }
        for (const x of this.engine.board.shelters) {
            const open = shelterOpen(this.engine.board, s.occupied, s.rescued ?? false, x); if (!open && !s.occupied.includes(x)) this.drawn.closedShelters++;
            // Shelter: a little hut; its door glows when open, a star once reached.
            const hx = 12 + x * 38, done = s.occupied.includes(x);
            const state = done ? 'done' : open ? 'open' : 'closed';
            pool?.show(baked(this, `hut-${state}`, 38, 40, b => { hut(b, state); }), hx - 2, 62);
        }
        // Short interpolation stays wholly inside the useful area, below the separate HUD.
        const blend = Math.min(1, this.engine.snapshot().frames / 4);
        const x = s.previous.x + (s.player.x - s.previous.x) * blend;
        const y = s.previous.y + (s.player.y - s.previous.y) * blend;
        // Larger than its 38 px cell so the character reads on a phone; feet stay in the lane.
        const heroY = Math.max(64, 52 + y * 38);
        this.heroBounds = { x: 3 + x * 38, y: heroY, width: 50, height: 50 };
        this.hero.draw(g, 3 + x * 38, heroY, 50);
        pool?.end();
        const text = `TRAVERSE ${String(this.engine.level + 1)}/30 · ${PLANS[this.engine.level]?.name ?? ''} · SCORE ${String(s.score)}\n${crossingTip(this.engine.level)}${this.engine.board.castaway ? (s.rescued ? ' · recueilli ✓' : ' · naufragé à bord ?') : ''}\nVIES ${String(s.lives)} · ${String(Math.ceil(s.time / 1000))} s · BOND ${String(this.engine.specialUses)}/1 · ABRIS ${String(s.occupied.length)}/${String(this.engine.board.shelters.length)}`;
        this.hud?.setText(text);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · ${text}`;
    }
}
