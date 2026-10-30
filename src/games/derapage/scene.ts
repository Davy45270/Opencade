import { Cadence, draw3d, screenHeading, type RenderCost } from './view3d';
import { beginThumb, moveThumb, thumbDirection, thumbIntensity, acceptsThumb, type Thumb } from './joystick';
import { RoadLayer, inView } from './road';
import { kartLandscape, kartRoadArt, kartTree } from './kart-art';
import { others } from '../../characters/selection';
import { GameCharacter } from '../../characters/game';
import { arcadeArt, bonusEmblem, emblems, liveries, vehicleDrawing, type Emblem } from '../../characters/arcade-art';
import { ids, expressions } from '../../characters/model';
import { ArcadePaint } from '../../characters/arcade-phaser';
import { renderCharacter } from '../../characters/canvas';
import { required } from '../../engines/derapage/access';
import Phaser from 'phaser';
import { Engine, LEVELS } from '../../engines/derapage/engine';
import { analogSteer } from '../../engines/derapage/physics';
import { circuitKey } from '../../engines/derapage/circuits';
import { nearest, at, boostStrip } from '../../engines/derapage/track';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, recordCircuitLap, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export function formatTime(ms: number | null): string {
    if (ms === null) return '—';
    const cs = Math.floor(ms / 10);
    return `${String(Math.floor(cs / 6000)).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}
export const derapageButtons: readonly TouchButton[] = [
    { id: 'derapage-special', label: 'Élan', ariaLabel: 'Élan : mini turbo', size: 56, placement: 'center', mode: 'tap' },
    { id: 'derapage-drift', label: 'Dérapage', ariaLabel: 'Dérapage', size: 64, placement: 'right', mode: 'hold' },
    { id: 'derapage-bonus', label: 'Bonus', ariaLabel: 'Bonus', size: 56, placement: 'right', mode: 'tap' },
];
export interface DerapageHook {
    view(): { preferred: string; active: string; fallback: boolean; fps: number; elapsed: number; cost: RenderCost };
    art(): string[];
    overview(enabled: boolean): void;
    read(): ReturnType<Engine['snapshot']> & { character: ReturnType<GameCharacter['snapshot']>; drivers: (string | null)[] };
    loadLevel(i: number, seed?: number): void;
    advance(ms: number): void;
    scenario(name: 'finish' | 'danger' | 'trees-boost' | 'lap' | 'slalom-gate' | 'bmx-jump'): void;
    hudText(): string;
    usefulArea(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    bounds(): {
        hud: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        forward: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
}
declare global {
    interface Window {
        __DERAPAGE_TEST__?: DerapageHook;
    }
}
export class DerapageScene extends Phaser.Scene {
    private view3d = false;
    private cadence = new Cadence();
    private renderCost: RenderCost = { lines: 0, samples: 0, segmentChecks: 0, boostChecks: 0, sprites: 0 };
    private get active3d(): boolean { return this.view3d && !this.cadence.fallback; }
    private recordedLaps = 0;
    private lapCrossedAt = -Infinity;
    private newRecord = false;
    private hero = new GameCharacter();
    private rivals = others(this.hero.id).map(id => new GameCharacter(id));
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'derapage', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private manual = false;
    private overviewMode = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private background?: Phaser.GameObjects.Graphics;
    private road?: RoadLayer;
    private previousFrame?: number;
    private hudContent = '';
    private normalTrack?: Engine['track'];
    private normals: ReturnType<typeof nearest>[] = [];
    private normalAt(t: Engine['track'], index: number): ReturnType<typeof nearest> {
        if (this.normalTrack !== t) {
            this.normalTrack = t;
            this.normals = t.points.map(p => nearest(t, p));
        }
        return required(this.normals[index]);
    }
    private paint?: ArcadePaint;
    private hud3d?: Phaser.GameObjects.Graphics;
    private propCount = 0;
    private props3d: Phaser.GameObjects.Graphics[] = [];
    private rearTextures = new Map<string, string>();
    private kartTextures = new Map<string, string>();
    private emblemTextures = new Map<Emblem, string>();
    private resultArt?: HTMLCanvasElement;
    private hud?: HTMLElement;
    private held = new Set<string>();
    private pointer = 0;
    private thumb: Thumb | null = null;
    private cameraFixed = true;
    private assistance = true;
    private heading: number | undefined;
    private persistControls(): void {
        writeValue(browserStorage(), 'arcade-lab:derapage:controls:v1', JSON.stringify({ camera: this.cameraFixed ? 'fixed' : 'rotating', assist: this.assistance }));
    }
    private tilt = 0;
    private tiltEnabled = false;
    private mouseEnabled = false;
    private pendingBonus = false;
    private soundFrame = 0;
    private sceneTime = 0;
    private traces: {
        x: number;
        y: number;
    }[] = [];
    constructor(private session = new PlaySession(true)) { super('derapage'); }
    private panels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
        if (this.engine.status !== 'playing') {
            if (!this.resultArt) {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 400;
                canvas.style.cssText = 'width:180px;height:180px;max-width:100%;display:block;margin:auto';
                canvas.setAttribute('role', 'img');
                canvas.setAttribute('aria-label', `${liveries[this.hero.id].name} en action`);
                canvas.dataset.vehicleAction = this.hero.id;
                const context = canvas.getContext('2d');
                if (context) renderCharacter(context, arcadeArt[this.hero.id].vehicles.action, 0, 0, 400);
                document.querySelector('#result-title')?.after(canvas);
                this.resultArt = canvas;
            }
            const scores = document.querySelector('#result-scores'), s = this.engine.snapshot();
            if (scores) scores.textContent = `Temps total ${formatTime(s.timing.raceMs)} · Meilleur tour ${formatTime(s.timing.bestLapMs)} · Record du circuit ${formatTime(this.progress.save.circuitRecords?.[circuitKey(this.engine.level)] ?? null)} · Classement ${s.order.map((id, i) => `${String(i + 1)}. Kart ${String(id + 1)}`).join(' · ')}`;
        }
    }
    private start(i: number, seed?: number, fresh = false): void {
        this.recordedLaps = 0;
        this.lapCrossedAt = -Infinity;
        this.newRecord = false;
        this.manual = false;
        this.held.clear();
        this.pointer = 0;
        this.thumb = null;
        this.heading = undefined;
        this.pendingBonus = false;
        this.traces = [];
        this.progress.start(i, fresh);
        this.engine.loadLevel(i, seed);
        this.selecting = false;
        this.panels();
    }
    create(): void {
        this.previousFrame = undefined;
        this.hudContent = '';
        document.body.classList.add('derapage');
        this.view3d = this.progress.save.view === '3d';
        const view = document.createElement('button');
        view.id = 'derapage-view'; view.style.minHeight = view.style.minWidth = '44px';
        const refreshView = (): void => { view.textContent = `Vue : ${this.view3d ? '3D' : 'dessus'}`; };
        refreshView(); document.querySelector('#game-menu')?.append(view);
        this.inputs.on(view, 'click', () => {
            this.view3d = this.cadence.fallback || !this.view3d; this.cadence = new Cadence();
            this.progress.save.view = this.view3d ? '3d' : 'top';
            writeSave(browserStorage(), this.progress.save, 'derapage');
            this.thumb = null; this.heading = undefined; this.pointer = 0; refreshView(); this.draw();
        });
        this.inputs.cleanup(() => { view.remove(); });
        try {
            const saved = JSON.parse(readValue(browserStorage(), 'arcade-lab:derapage:controls:v1') ?? 'null') as { camera?: string; assist?: boolean } | null;
            this.cameraFixed = saved?.camera !== 'rotating';
            this.assistance = saved?.assist !== false;
        } catch { /* Use the accessible default for invalid preferences. */ }
        for (const kind of ['camera', 'assist'] as const) {
            const button = document.createElement('button');
            button.id = `derapage-${kind}`;
            const refresh = (): void => { button.textContent = kind === 'camera' ? `Caméra : ${this.cameraFixed ? 'fixe' : 'tournante'}` : `Aide : ${this.assistance ? 'oui' : 'non'}`; };
            refresh(); document.querySelector('#game-menu')?.append(button);
            this.inputs.on(button, 'click', () => {
                if (kind === 'camera') this.cameraFixed = !this.cameraFixed;
                else this.assistance = !this.assistance;
                this.thumb = null; this.heading = undefined; this.pointer = 0;
                this.persistControls(); refresh(); this.draw();
            });
            this.inputs.cleanup(() => { button.remove(); });
        }
        const cleanup = (): void => { this.inputs.dispose(); this.road?.destroy(); this.paint?.destroy(); for (const prop of this.props3d) prop.destroy(); this.props3d = []; this.propCount = 0; this.hud3d?.destroy(); this.hud3d = undefined; this.resultArt?.remove(); this.resultArt = undefined; document.body.classList.remove('derapage'); delete window.__DERAPAGE_TEST__; this.hud?.remove(); sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.background = this.add.graphics().setDepth(-1);
        this.road = new RoadLayer(this);
        this.graphics = this.add.graphics().setDepth(1);
        this.paint = new ArcadePaint(this, 96);
        for (const id of ids) for (const expression of expressions) this.kartTextures.set(`${id}-${expression}`, this.paint.texture(`kart-${id}-${expression}`, vehicleDrawing(id, 'dessus', expression)));
        for (const id of ids) for (const expression of expressions) this.rearTextures.set(`${id}-${expression}`, this.paint.texture(`rear-${id}-${expression}`, vehicleDrawing(id, 'arriere', expression)));
        for (const kind of Object.keys(emblems) as Emblem[]) this.emblemTextures.set(kind, this.paint.texture(`emblem-${kind}`, emblems[kind], 80));
        this.hud = document.createElement('div');
        this.hud.setAttribute('aria-live', 'off');
        this.hud.dataset.derapageHud = 'true';
        this.hud.style.cssText = 'position:fixed;pointer-events:none;white-space:pre;color:#effaff;font-family:system-ui;line-height:1.1;z-index:1';
        document.querySelector('#game')?.append(this.hud);
        const action = (id: string, held: boolean): void => {
            if (!held) { this.held.delete(id); return; }
            if (this.session.state === 'ready')
                this.session.send('start');
            if (this.session.paused || this.selecting)
                return;
            if (id === 'special') this.engine.special();
            if (id === 'bonus')
                this.pendingBonus = true;
            this.held.add(id);
        };
        renderTouchControls(this.inputs, derapageButtons, (id, held) => { action(id.replace('derapage-', ''), held); });
        const indicator = document.createElement('output'); indicator.id = 'derapage-steering'; indicator.setAttribute('aria-label', 'Braquage'); document.querySelector('#touch-controls .left')?.append(indicator); this.inputs.cleanup(() => { indicator.remove(); });
        const keys: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift', KeyC: 'special', KeyX: 'bonus', ControlLeft: 'bonus', ControlRight: 'bonus' };
        for (const type of ['keydown', 'keyup'])
            this.inputs.on(document, type, event => { const e = event as KeyboardEvent; const id = keys[e.code]; if (id) {
                e.preventDefault();
                action(id, type === 'keydown');
            } });
        this.inputs.on(window, 'blur', () => { this.held.clear(); this.pointer = 0; this.thumb = null; });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            this.inputs.on(area, 'pointerdown', event => { const e = event as PointerEvent; if (e.pointerType !== 'mouse' && !this.thumb && acceptsThumb(e.target === this.game.canvas, e.clientY, this.game.canvas.getBoundingClientRect().top, this.game.canvas.getBoundingClientRect().height, this.active3d || this.cameraFixed)) {
                e.preventDefault();
                area.setPointerCapture(e.pointerId);
                this.thumb = beginThumb(e.pointerId,e.clientX,e.clientY);
                this.pointer = 0;
                action('steering', true);
            } });
            this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerId === this.thumb?.id) { moveThumb(this.thumb,e.clientX,e.clientY); this.pointer = analogSteer(this.thumb.dx); } if (e.pointerType === 'mouse' && this.mouseEnabled) {
                const r = area.getBoundingClientRect();
                this.pointer = Math.max(-1, Math.min(1, 2 * (e.clientX - r.left) / r.width - 1));
            } });
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
                this.inputs.on(area, type, event => { if ((event as PointerEvent).pointerType === 'mouse') this.pointer = 0; if ((event as PointerEvent).pointerId === this.thumb?.id) { this.thumb = null; this.pointer = 0; this.heading = undefined; this.engine.input({ steer: 0, mode: this.active3d || this.cameraFixed ? 'joystick' : undefined, drift: this.held.has('drift'), bonus: false }); } });
        }
        // Optional sensors are enabled by an explicit user gesture; failures are silent.
        const help = document.querySelector('#game-help');
        for (const [label, run] of [
            ['Inclinaison (tournante)', () => { void this.enableTilt(); }],
            ['Souris (tournante)', () => { this.mouseEnabled = !this.mouseEnabled; }],
        ] as const) {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.minWidth = b.style.minHeight = '48px';
            help?.append(b);
            this.inputs.on(b, 'click', run);
            this.inputs.cleanup(() => { b.remove(); });
        }
        this.inputs.on(window, 'deviceorientation', event => { const e = event as DeviceOrientationEvent; if (this.tiltEnabled && e.gamma !== null)
            this.tilt = Math.max(-1, Math.min(1, e.gamma / 25)); });
        const choose = (): void => { this.selecting = !this.selecting; this.held.clear(); renderLevels(LEVELS, this.progress.save, i => { this.start(i, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels'])
            this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won')
            this.start(this.engine.level + 1); });
        for (const id of ['retry-level', 'replay-level', 'restart'])
            this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.recordedLaps = 0; this.newRecord = false; this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.manual = false; this.panels(); });
        this.game.canvas.setAttribute('aria-label', 'Dérapage : course de karts, vue de dessus');
        if (new URLSearchParams(location.search).get('test') === '1')
            window.__DERAPAGE_TEST__ = {
                view: () => ({ preferred: this.view3d ? '3d' : 'top', active: this.active3d ? '3d' : 'top', fallback: this.cadence.fallback, fps: this.cadence.fps, elapsed: this.cadence.elapsed, cost: this.renderCost }),
                art: () => this.paint?.keys() ?? [],
                overview: enabled => { this.overviewMode = enabled; this.manual = true; this.draw(); },
                read: () => ({ ...this.engine.snapshot(), character: this.hero.snapshot(), drivers: [this.hero.id, ...this.rivals.map(r => r.id), null] }), loadLevel: (i, seed) => { this.start(i, seed, true); },
                advance: ms => { if (!Number.isFinite(ms) || ms < 0)
                    throw new RangeError('Temps invalide'); this.manual = true; this.tick(ms); },
                hudText: () => this.hud?.textContent ?? '', usefulArea: () => ({ x: 0, y: 96, width: 360, height: 544 }),
                bounds: () => {
                    const canvas = this.game.canvas.getBoundingClientRect(), hud = this.hud?.getBoundingClientRect(), scale = canvas.width / 360;
                    return { hud: { x: ((hud?.x ?? canvas.x) - canvas.x) / scale, y: ((hud?.y ?? canvas.y) - canvas.y) / scale, width: (hud?.width ?? 0) / scale, height: (hud?.height ?? 0) / scale }, forward: { x: 0, y: 96, width: 360, height: 330 } };
                },
                scenario: name => {
                    if (name === 'slalom-gate' || name === 'bmx-jump') {
                        this.start(name === 'slalom-gate' ? 28 : 29, 28, true);
                        const t = this.engine.track, k = required(this.engine.karts[0]);
                        const index = name === 'slalom-gate' ? required(t.slalom[0]).index : required(t.circuit.jumps[0]);
                        const p = at(t, required(t.distances[index]) - (name === 'slalom-gate' ? 8 : .1));
                        const q = at(t, required(t.distances[index]) + 1), angle = Math.atan2(q.y - p.y, q.x - p.x);
                        Object.assign(k, p, { angle, vx: 22 * Math.cos(angle), vy: 22 * Math.sin(angle) });
                        this.overviewMode = false; this.manual = true; this.tick(0); return;
                    }
                    if (name === 'trees-boost') {
                        this.start(14, 28, true);
                        const t = this.engine.track, b = required(t.boosts[0]), k = required(this.engine.karts[0]);
                        const next = required(t.points[(b.index + 1) % t.points.length]);
                        const angle = Math.atan2(next.y - b.y, next.x - b.x);
                        Object.assign(k, { x: b.x, y: b.y, angle, vx: 24 * Math.cos(angle), vy: 24 * Math.sin(angle) });
                        this.manual = true;
                        this.tick(1000 / 60);
                        return;
                    }
                    this.start(0, 28, true);
                    this.engine.frames = 6000; this.engine.time = 100000;
                    const k = required(this.engine.karts[0]), t = this.engine.track, p = at(t, t.length - 3), q = at(t, 0);
                    Object.assign(k, p, { angle: Math.atan2(q.y - p.y, q.x - p.x) - 1.45, vx: 0, vy: 0, lap: name === 'lap' ? 0 : 2, gate: 0, passed: name === 'lap' ? 11 : 35, item: 'turbo' });
                    if (name === 'danger')
                        for (const rival of this.engine.karts.slice(1)) {
                            rival.lap = 3;
                            rival.passed = 36;
                            rival.finishMs = 99000 + rival.id;
                        }
                    this.manual = true;
                    this.tick(0);
                },
            };
        this.panels();
        this.draw();
    }
    private async enableTilt(): Promise<void> {
        try {
            const sensor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
                requestPermission?: () => Promise<string>;
            };
            if (sensor.requestPermission && await sensor.requestPermission() !== 'granted')
                return;
            this.tiltEnabled = !this.tiltEnabled;
        }
        catch {
            this.tiltEnabled = false;
        }
    }
    updatePaused(): void { this.previousFrame = undefined; this.tick(0); }
    update(time: number): void {
        // Phaser's smoothed delta discards long frames. Use its raw timestamp,
        // cap hidden-tab gaps, and leave fixed stepping to the engine.
        const elapsed = this.previousFrame === undefined ? 0 : Math.max(0, time - this.previousFrame);
        this.previousFrame = time;
        const delta = Math.min(250, elapsed);
        this.sceneTime = time;
        if (this.active3d && !this.manual && !this.session.paused && !this.selecting && this.engine.status === 'playing') {
            this.cadence.add(elapsed);
            if (this.cadence.fallback) { this.thumb = null; this.heading = undefined; this.pointer = 0; }
        }
        this.tick(this.manual ? 0 : delta);
    }
    private tick(ms: number): void {
        if (this.selecting || this.session.paused) { this.held.clear(); this.pointer = 0; this.thumb = null; this.pendingBonus = false; }
        if (!this.selecting && !this.session.paused) {
            const k = required(this.engine.karts[0]), hits = k.hits, boost = k.boostMs;
            const dx = Number(this.held.has('right')) - Number(this.held.has('left'));
            const dy = Number(this.held.has('down')) - Number(this.held.has('up'));
            this.heading = dx || dy ? Math.atan2(dy, dx) : thumbDirection(this.thumb);
            if (this.active3d) this.heading = screenHeading(this.heading, k.angle);
            this.engine.input({ mode: this.active3d || this.cameraFixed ? 'joystick' : undefined, heading: this.heading, assist: this.assistance, steer: Number(this.held.has('right')) - Number(this.held.has('left')) + this.pointer + (this.tiltEnabled ? this.tilt : 0), drift: this.held.has('drift'), bonus: this.pendingBonus });
            this.pendingBonus = false;
            this.engine.step(ms);
            if (k.hits > hits) {
                sound.playEffect('life');
                sound.playEffect('impact'); this.hero.impact = 350;
            }
            if (k.boostMs > boost)
                sound.playEffect('boost');
            if (ms > 0 && this.engine.frames - this.soundFrame > 18) {
                const n = nearest(this.engine.track, k);
                sound.playEffect(n.distance > required(this.engine.track.widths[n.index]) / 2 ? 'grass' : k.driftMs > 0 ? 'drift' : 'engine');
                this.soundFrame = this.engine.frames;
            }
            const surface = nearest(this.engine.track, k);
            if ((k.driftMs > 0 || surface.distance > required(this.engine.track.widths[surface.index]) / 2) && ms > 0) {
                this.traces.push({ x: k.x, y: k.y });
                if (this.traces.length > 60)
                    this.traces.shift();
            }
        }
        while (this.recordedLaps < this.engine.lapTimesMs.length) {
            this.lapCrossedAt = this.sceneTime;
            this.newRecord = recordCircuitLap(browserStorage(), this.progress.save, this.engine.level, required(this.engine.lapTimesMs[this.recordedLaps]));
            this.recordedLaps++;
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(browserStorage(), this.progress.save, 'derapage');
            sound.playEffect(this.engine.status);
        }
        this.hero.advance(ms, this.session.paused || this.selecting, this.engine.status, (this.engine.karts[0]?.specialMs ?? 0) > 0);
        for (const [i, actor] of this.rivals.entries()) {
            const k = this.engine.karts[i + 1];
            if (k) { actor.impact = (k.railHitMs ?? 0) > 0 ? 180 : actor.impact; actor.advance(ms, this.session.paused || this.selecting, k.finishMs !== null ? 'won' : 'playing', (k.specialMs ?? 0) > 0); }
        }
        this.panels();
        this.draw();
    }
    private draw(): void {
        const g = this.graphics, background = this.background;
        if (!g || !background)
            return;
        const e = this.engine.snapshot(false), p = required(e.karts[0]), t = e.track, angle = this.cameraFixed ? 0 : -p.angle - Math.PI / 2;
        const xs = t.points.map(q=>q.x), ys = t.points.map(q=>q.y);
        const cx = (Math.min(...xs)+Math.max(...xs))/2, cy = (Math.min(...ys)+Math.max(...ys))/2;
        const fit = Math.min(300/(Math.max(...xs)-Math.min(...xs)+30),450/(Math.max(...ys)-Math.min(...ys)+30));
        const scale = this.overviewMode ? fit : 5;
        const project = (x: number, y: number) => this.overviewMode ? { x:180+(x-cx)*fit, y:360+(y-cy)*fit } : ({ x: 180 + ((x - p.x) * Math.cos(angle) - (y - p.y) * Math.sin(angle)) * 5, y: (this.cameraFixed ? 368 : 466) + ((x - p.x) * Math.sin(angle) + (y - p.y) * Math.cos(angle)) * 5 });
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        g.clear();
        background.clear();
        this.road?.hide();
        this.paint?.begin();
        for (let i=0;i<this.propCount;i++) this.props3d[i]?.clear().setVisible(false);
        this.propCount = 0;
        this.hud3d?.clear();
        let propIndex = 0;
        const layer=(depth:number): Phaser.GameObjects.Graphics => {
            const prop=this.props3d[propIndex] ?? this.add.graphics();
            this.props3d[propIndex++]=prop;
            this.propCount=propIndex;
            return prop.setDepth(depth).setVisible(true);
        };
        if (this.active3d) {
            this.renderCost = draw3d(g,e,(id,x,y,size,rotation,depth) => {
                const driver = id === 0 ? this.hero : this.rivals[id-1];
                const art = driver && this.rearTextures.get(`${driver.id}-${driver.expression}`);
                if (art) this.paint?.draw(art,x,y-size/2,size,rotation,1,depth);
                else {
                    const g=layer(depth);
                    g.fillStyle(0x222937);
                    for (const side of [-1,1]) for (const row of [.25,.75]) g.fillRect(x+side*size*.25-size*.06,y-size*row,size*.12,size*.18);
                    g.fillStyle(0x89949c); g.fillRoundedRect(x-size*.23,y-size*.85,size*.46,size*.8,size*.08);
                    g.fillStyle(0xf2eee1); g.fillCircle(x,y-size*.55,size*.13);
                }
            }, layer);
        } else {
        background.fillStyle(t.circuit.snow.length ? 0xe0eff5 : t.circuit.theme.ground);
        background.fillRect(0, 96, 360, 544);
        // Clip geometry to the useful rectangle so the reserved HUD never hides the road ahead.
        const line = (a: {
            x: number;
            y: number;
        }, b: {
            x: number;
            y: number;
        }, width: number, color: number) => {
            if (Math.max(a.y, b.y) < 96 || Math.min(a.y, b.y) > 640 || Math.max(a.x, b.x) < 0 || Math.min(a.x, b.x) > 360)
                return;
            g.lineStyle(width, color);
            g.lineBetween(a.x, a.y, b.x, b.y);
            if (width > 2) {
                g.fillStyle(color);
                g.fillCircle(a.x,a.y,width/2); g.fillCircle(b.x,b.y,width/2);
            }
        };
        if (t.circuit.plaza) {
            const plaza = [[-28,-18],[22,-18],[22,15],[-28,15]].map(([x,y])=>project(required(x),required(y)));
            background.fillStyle(0xb6aa91); background.fillPoints(plaza,true);
            for (const q of [{ x:-50,y:-5 },{ x:53,y:15 }]) {
                const a=project(q.x,q.y);
                background.fillStyle(t.circuit.theme.border); background.fillCircle(a.x,a.y,7*scale);
                background.fillStyle(t.circuit.theme.ground); background.fillCircle(a.x,a.y,5*scale);
            }
        }
        const artTime = reduced ? 0 : this.sceneTime;
        kartLandscape(background,t,project,scale,artTime);
        this.road?.draw(t,project,scale,this.overviewMode ? 0 : angle);
        kartRoadArt(g,t,project,scale,artTime);
        for (const edge of t.bermEdges) line(project(edge.a.x,edge.a.y),project(edge.b.x,edge.b.y),2*scale,0xe4c99a);
        for (const [i, gate] of t.slalom.entries()) {
            const passed=p.slalomPassed?.[i] === p.lap, missed=p.slalomMissed?.[i] === p.lap;
            const color=missed ? (!reduced && Math.floor(e.frames/10)%2 ? 0xffb7b7 : 0xe64049) : passed ? 0x49e087 : i%2 ? 0x3285e8 : 0xe64049;
            const tops=[-1,1].map(side => {
                const a=project(gate.x+gate.nx*gate.half*side,gate.y+gate.ny*gate.half*side);
                const top={ x:a.x,y:a.y-Math.max(9,7*scale) };
                line(a,top,Math.max(2,.7*scale),color);
                return top;
            });
            line(required(tops[0]),required(tops[1]),Math.max(4,1.7*scale),color);
        }
        for (const b of t.boosts) {
            const strip=boostStrip(t,b);
            const polygon=strip.corners.map(q=>project(q.x,q.y));
            if (!inView(polygon)) continue;
            g.fillStyle(0x168e78); g.fillPoints(polygon,true);
            // Chevrons travel along the strip, clipped to its exact footprint.
            const phase=(artTime/500)%1;
            for (let row=0;row<3;row++) {
                const u=(row+phase)*strip.length/3;
                const points=[strip.point(u, -strip.half),strip.point(Math.min(strip.length,u+.7),0),strip.point(u,strip.half),strip.point(Math.max(0,u-.35),strip.half),strip.point(Math.min(strip.length,Math.max(0,u+.35)),0),strip.point(Math.max(0,u-.35),-strip.half)];
                g.fillStyle(0xb5ffe4); g.fillPoints(points.map(q=>project(q.x,q.y)),true);
            }
        }
        for (const tree of t.trees) {
            const a = project(tree.x, tree.y);
            if (!inView([a], (tree.radius*2+8)*scale)) continue;
            if (t.circuit.theme.kart) {
                if (t.circuit.theme.kart === 'volcano' && a.y > 110 && a.y < 620) kartTree(g,t.circuit.theme.kart,a,tree.radius,scale,artTime);
                continue;
            }
            if (t.circuit.theme.urban) {
                if (a.y>105 && a.y<630) { g.fillStyle(t.circuit.theme.decor); g.fillRect(a.x-tree.radius*scale,a.y-tree.radius*scale,tree.radius*2*scale,tree.radius*2*scale); }
                continue;
            }
            if (t.circuit.snow.length && a.y > 110 && a.y < 620) {
                for (const h of [0, 1, 2]) { g.fillStyle(h === 2 ? 0xf4fbff : 0x327454); g.fillTriangle(a.x-2*scale,a.y-h*scale,a.x+2*scale,a.y-h*scale,a.x,a.y-(h+3)*scale); }
                continue;
            }
            if (t.circuit.family === 'bmx' && a.y > 110 && a.y < 620) { g.fillStyle(0xdabc72); g.fillRect(a.x-2*scale,a.y-scale,4*scale,2*scale); continue; }
            if (a.y > 110 && a.y < 620) { g.fillStyle(0x553c29); g.fillCircle(a.x + 2, a.y + 3, tree.radius * scale); g.fillStyle(t.circuit.theme.decor); g.fillCircle(a.x, a.y, tree.radius * scale); g.fillStyle(0x69a865); g.fillCircle(a.x - 3, a.y - 3, tree.radius * scale * .4); }
        }
        for (const section of t.circuit.tunnel) {
            const index = Math.floor(section * 96/t.circuit.controls.length);
            for (let j=0;j<7;j++) {
                const q = required(t.points[(index+j)%96]), r = required(t.points[(index+j+1)%96]);
                line(project(q.x,q.y),project(r.x,r.y),required(t.widths[index])*scale,0x19212d);
            }
            if (t.circuit.theme.kart === 'autumn') for (const end of [index,(index+7)%96]) {
                const q=required(t.points[end]),n=this.normalAt(t,end),half=required(t.widths[end])/2;
                const a=project(q.x+n.nx*half,q.y+n.ny*half),b=project(q.x-n.nx*half,q.y-n.ny*half);
                const topA={x:a.x,y:a.y-4*scale},topB={x:b.x,y:b.y-4*scale};
                line(a,topA,1.2*scale,0xd69d58); line(b,topB,1.2*scale,0xd69d58);
                line(topA,topB,2*scale,0x9d693d);
            }
        }
        for (const section of t.circuit.port) {
            const q = required(t.circuit.controls[section]), n = nearest(t,{ x:q[0],y:q[1] });
            const offset = required(t.widths[n.index])/2+24;
            const a = project(n.x-n.nx*offset,n.y-n.ny*offset);
            g.fillStyle(0x246b94); g.fillCircle(a.x,a.y,12*scale);
            g.lineStyle(2,0xe8d8af); g.strokeCircle(a.x,a.y,12*scale);
            g.fillStyle(0xf0e4c4); g.fillRect(a.x-5*scale,a.y,10*scale,2*scale);
        }
        const finishA = t.finishLine.a, finishB = t.finishLine.b;
        const fx = finishB.x-finishA.x, fy = finishB.y-finishA.y, fw = Math.hypot(fx,fy);
        const tx = -fy/fw, ty = fx/fw;
        // Two checker rows span exactly the exposed gate segment.
        for (let row=0;row<2;row++) for (let cell=0;cell<12;cell++) {
            const polygon = [[cell/12,row-1],[(cell+1)/12,row-1],[(cell+1)/12,row],[cell/12,row]].map(([u,v])=>project(finishA.x+fx*required(u)+tx*required(v),finishA.y+fy*required(u)+ty*required(v)));
            g.fillStyle((row+cell)%2 ? 0xffffff : 0x080b10);
            g.fillPoints(polygon,true);
        }
        const postA=project(finishA.x,finishA.y), postB=project(finishB.x,finishB.y);
        const postHeight=Math.max(24,8*scale);
        const topA={x:postA.x,y:postA.y-postHeight}, topB={x:postB.x,y:postB.y-postHeight};
        line(postA,topA,Math.max(3,scale*.7),0xf4e6b1); line(postB,topB,Math.max(3,scale*.7),0xf4e6b1);
        for (let row=0;row<2;row++) for (let cell=0;cell<12;cell++) {
            const points=[[cell/12,row*4],[(cell+1)/12,row*4],[(cell+1)/12,(row+1)*4],[cell/12,(row+1)*4]].map(([u,v])=>({x:topA.x+(topB.x-topA.x)*required(u),y:topA.y+(topB.y-topA.y)*required(u)+required(v)}));
            g.fillStyle((row+cell)%2 ? 0xffffff : 0x080b10); g.fillPoints(points,true);
        }
        if (!reduced && e.timing.lapTimesMs.length && this.sceneTime-this.lapCrossedAt<200) { g.fillStyle(0xffffff,.35*(1-(this.sceneTime-this.lapCrossedAt)/200)); g.fillRect(0,96,360,544); }
        if (t.circuit.theme.urban) {
            const left=project(finishA.x-fx/fw*4+tx*5,finishA.y-fy/fw*4+ty*5);
            const right=project(finishB.x+fx/fw*4+tx*5,finishB.y+fy/fw*4+ty*5);
            line(left,right,3,t.circuit.theme.border);
            g.fillStyle(0xf7f3e3); g.fillCircle(left.x,left.y,3); g.fillCircle(right.x,right.y,3);
        }
        for (let row=0;row<3;row++) for (const side of [-1,1]) {
            const q = { x:(finishA.x+finishB.x)/2-tx*(4+row*4)+fx/fw*side*2, y:(finishA.y+finishB.y)/2-ty*(4+row*4)+fy/fw*side*2 };
            const a=project(q.x,q.y), b=project(q.x+fx/fw*2,q.y+fy/fw*2);
            line(a,b,2,0xffffff);
        }
        for (const mark of this.traces) {
            const a = project(mark.x, mark.y);
            if (a.y > 100 && a.y < 635) {
                g.fillStyle(0x1a2530);
                g.fillCircle(a.x, a.y, 2);
            }
        }
        for (const c of [...e.crates.filter(c => c.cooldown === 0), ...e.puddles]) {
            const a = project(c.x, c.y);
            if (a.y > 106 && a.y < 630) {
                if ('owner' in c) {
                    const owner = c.owner === 0 ? this.hero : this.rivals[c.owner - 1];
                    const kind = liveries[owner?.id ?? 'panda'].trap;
                    const key = this.emblemTextures.get(kind);
                    // A dark rim keeps the trap readable against every road surface.
                    g.fillStyle(0x181b2c); g.fillCircle(a.x, a.y, 11);
                    if (key) this.paint?.draw(key, a.x, a.y, 24);
                } else {
                    g.fillStyle(0xffd166); g.fillRoundedRect(a.x - 7, a.y - 7, 14, 14, 3);
                    g.lineStyle(2, 0x533946); g.strokeRoundedRect(a.x - 7, a.y - 7, 14, 14, 3);
                    g.lineBetween(a.x - 4, a.y, a.x + 4, a.y); g.lineBetween(a.x, a.y - 4, a.x, a.y + 4);
                }
            }
        }
        const grassEdge=nearest(t,p);
        if (!t.circuit.theme.urban && grassEdge.distance>required(t.widths[grassEdge.index])/2 && p.jumpMs<=0) {
            for (let i=0;i<7;i++) {
                const phase=((artTime/450+i/7)%1), side=i%2 ? 1 : -1;
                const q=project(p.x-Math.cos(p.angle)*(2+phase*4)-Math.sin(p.angle)*side*phase*2,p.y-Math.sin(p.angle)*(2+phase*4)+Math.cos(p.angle)*side*phase*2);
                g.fillStyle(0xc2b477,1-phase); g.fillCircle(q.x,q.y,(.15+phase*.3)*scale);
            }
        }
        for (const k of e.karts) {
            const a = project(k.x, k.y);
            if (a.y < 126 || a.y > 614)
                continue;
            g.save();
            const height=k.jumpHeight ?? 0, size=this.overviewMode ? scale/5 : 1;
            g.fillStyle(0x101522, height > 0 ? .8 : .4);
            g.fillEllipse(a.x+height*scale*1.4, a.y+4+height*scale*1.2, 22*size, 10*size);
            if (!reduced && (k.landingMs ?? 0) > 0) {
                g.fillStyle(0xd5bd91,.65);
                for (const side of [-1,0,1]) g.fillCircle(a.x+side*9*size,a.y+5*size,4*size);
            }
            if (!reduced && (k.railHitMs ?? 0) > 0) {
                const n=nearest(t,k), side=(k.x-n.x)*n.nx+(k.y-n.y)*n.ny > 0 ? 1 : -1;
                const impact=project(n.x+n.nx*side*(required(t.widths[n.index])/2+1.8),n.y+n.ny*side*(required(t.widths[n.index])/2+1.8));
                for (const dx of [-5,0,5]) line(impact,{ x:impact.x+dx,y:impact.y-7 },2,0xffe5a0);
            }
            g.translateCanvas(a.x, a.y - (k.jumpHeight ?? 0) * scale);
            const jumpScale=1+Math.min(.35,height/3*.35);
            g.scaleCanvas(jumpScale,jumpScale);
            g.rotateCanvas(k.angle + (this.overviewMode ? 0 : angle));
            if (this.overviewMode) g.scaleCanvas(scale/5,scale/5);
            const driver = k.id === 0 ? this.hero : this.rivals[k.id - 1];
            const livery = liveries[driver?.id ?? 'panda'];
            if (driver) {
                const key = this.kartTextures.get(`${driver.id}-${driver.expression}`);
                if (key) this.paint?.draw(key, a.x, a.y - height * scale, 46 * size * jumpScale, k.angle + (this.overviewMode ? 0 : angle) + Math.PI / 2);
            } else {
                g.fillStyle(0x89949c); g.fillRoundedRect(-13, -8, 26, 16, 4);
                g.fillStyle(0x222937); for (const x of [-8, 8]) for (const y of [-9, 9]) g.fillCircle(x, y, 4);
                g.fillStyle(0xf2eee1); g.fillCircle(0, 0, 5);
            }
            const emblemAt = (kind: Emblem, localX: number, localY: number, diameter: number): void => {
                const key = this.emblemTextures.get(kind), r = k.angle + (this.overviewMode ? 0 : angle);
                if (key) this.paint?.draw(key, a.x + (localX * Math.cos(r) - localY * Math.sin(r)) * size, a.y - height * scale + (localX * Math.sin(r) + localY * Math.cos(r)) * size, diameter * size, 0, 1, 2);
            };
            if (k.boostMs > 0 || (k.specialMs ?? 0) > 0) {
                g.fillStyle(0xffdb70); g.fillTriangle(-15, -5, -15, 5, -29, 0);
                emblemAt(livery.boost, -29, 0, 23);
            }
            if (k.item) emblemAt(bonusEmblem(driver?.id ?? 'panda', k.item), 0, -29, 20);
            if (k.jumpMs > 0) emblemAt(livery.motif, 0, 28, 17);
            if (k.shield) {
                g.lineStyle(2, Number.parseInt(livery.light.slice(1), 16));
                g.strokeCircle(0, 0, 25);
                emblemAt(livery.shield, 0, -28, 19);
            }
            if (!reduced && k.driftMs >= 600) {
                g.fillStyle(k.driftMs >= 1400 ? 0xff67bd : 0x66dcff);
                g.fillCircle(-14, 8, 3);
                g.fillCircle(-14, -8, 3);
            }
            g.restore();
        }
        }
        {
        const g=this.active3d ? this.hud3d ??= this.add.graphics().setDepth(1000) : required(this.graphics);
        const colors = [0xffdb70, 0xff786a, 0x67d9ec, 0xc797ff, 0x9ee278, 0xf29acd];
        const finishA=t.finishLine.a, finishB=t.finishLine.b;
        g.fillStyle(0x101827);
        g.fillRect(0, 0, 360, 96);
        // Mini-map is entirely in the reserved HUD band.
        g.lineStyle(2, 0x91c6ae);
        const miniScale = Math.min(88/(Math.max(...xs)-Math.min(...xs)),72/(Math.max(...ys)-Math.min(...ys)));
        const mini = (x:number,y:number) => ({ x:309+(x-cx)*miniScale, y:47+(y-cy)*miniScale });
        for (let i = 0; i < 96; i++) {
            const a = required(t.points[i]), b = required(t.points[(i + 1) % 96]);
            const ma=mini(a.x,a.y), mb=mini(b.x,b.y); g.lineBetween(ma.x,ma.y,mb.x,mb.y);
        }
        for (const k of e.karts) {
            g.fillStyle(required(colors[k.id]));
            const m=mini(k.x,k.y); g.fillCircle(m.x,m.y,2);
        }
        const fa=mini(finishA.x,finishA.y), fb=mini(finishB.x,finishB.y);
        g.lineStyle(4,0x080b10); g.lineBetween(fa.x,fa.y,fb.x,fb.y);
        g.lineStyle(2,0xffffff); g.lineBetween(fa.x,fa.y,fb.x,fb.y);
        }
        const s = e;
        const timing = s.timing;
        const delta = timing.lastLapDeltaMs;
        const crossing = timing.lapTimesMs.length === 0 || this.sceneTime-this.lapCrossedAt >= 2000 ? '' : `Écart ${delta === null ? '—' : `${delta < 0 ? '−' : '+'}${formatTime(Math.abs(delta))}`} ${this.newRecord ? 'Nouveau record !' : ''}`;
        const text = `DÉRAPAGE ${String(e.level + 1)}/30 · PLACE ${String(s.order.indexOf(0) + 1)}/6 · TOUR ${String(Math.min(3, p.lap + 1))}/3
SCORE ${String(s.score)} · COURSE ${formatTime(timing.raceMs)} · TOUR ${formatTime(timing.currentLapMs)}
MEILLEUR ${formatTime(timing.bestLapMs)} · BONUS ${(p.noticeMs ?? 0) > 0 ? 'Porte manquée +2,0 s' : p.item ?? '—'}${crossing ? ` · ${crossing}` : ''}
ÉLAN ${p.specialLap === p.lap ? '0' : '1'}/1 · COUPE ${String(s.cup.races)}/4 · ${s.cup.order.map(id => `${String(id + 1)}:${String(s.cup.scores[id])}`).join(' ')}`;
        if (this.hud) {
            this.game.canvas.setAttribute('aria-label', `Dérapage : course de karts, vue ${this.active3d ? '3D' : 'de dessus'}`);
            const box = this.game.canvas.getBoundingClientRect(), scale = box.width / 360;
            const content = `${text}|${crossing}|${String(delta)}|${String(box.x)},${String(box.y)},${String(box.width)}`;
            this.hud.style.visibility = this.session.paused || this.selecting ? 'hidden' : 'visible';
            if (content !== this.hudContent) {
                const layoutChanged = !this.hudContent.endsWith(`|${String(box.x)},${String(box.y)},${String(box.width)}`);
                this.hudContent = content;
                const lines = [`TOUR ${formatTime(timing.currentLapMs)}`, `MEILLEUR ${formatTime(timing.bestLapMs)}`, crossing, ...text.split('\n')];
                lines.forEach((line, i) => {
                    let span = this.hud?.children[i] as HTMLSpanElement | undefined;
                    const changed = !span || span.textContent !== line;
                    if (!span) {
                        span = document.createElement('span');
                        span.style.display = 'block';
                        this.hud?.append(span);
                    }
                    if (changed) span.textContent = line;
                    if (i === 2 && crossing) {
                        span.dataset.lapDelta = 'true';
                        span.style.color = delta === null || delta < 0 ? '#80efac' : '#ff9b9b';
                    }
                    if (changed || layoutChanged) {
                        span.style.fontSize = `${String((i === 0 ? 24 : i === 1 ? 12 : i === 2 ? 10 : 8.5) * scale)}px`;
                        const width = span.getBoundingClientRect().width;
                        if (width > 249 * scale && i !== 0)
                            span.style.fontSize = `${String(9 * scale * 249 * scale / width)}px`;
                    }
                });
                this.hud.style.left = `${String(box.x + 8 * scale)}px`;
                this.hud.style.top = `${String(box.y + 6 * scale)}px`;
                this.hud.style.fontSize = `${String(12 * scale)}px`;
            }
        }
        if ((this.active3d || this.cameraFixed) && this.thumb) {
            const rect = this.game.canvas.getBoundingClientRect(), ratio = 360 / rect.width;
            const x = (this.thumb.x - rect.x) * ratio, y = (this.thumb.y - rect.y) * ratio;
            g.lineStyle(2, 0xffffff, .8); g.strokeCircle(x, y, 40 * ratio);
            g.fillStyle(0x80efac, .9); const reach=Math.max(1,Math.hypot(this.thumb.dx,this.thumb.dy)/40); g.fillCircle(x + this.thumb.dx / reach * ratio, y + this.thumb.dy / reach * ratio, 7);
        }
        if (!this.active3d && this.cameraFixed && this.heading !== undefined) {
            const q = project(p.x, p.y), a = this.heading;
            const x = q.x + Math.cos(a) * 42, y = q.y + Math.sin(a) * 42;
            g.lineStyle(3, 0x80efac); g.lineBetween(q.x + Math.cos(a) * 22, q.y + Math.sin(a) * 22, x, y);
            for (const side of [-1, 1]) g.lineBetween(x, y, x - Math.cos(a + side * .6) * 10, y - Math.sin(a + side * .6) * 10);
        }
        const viewButton = document.querySelector('#derapage-view');
        if (viewButton) viewButton.textContent = this.cadence.fallback ? 'Vue : dessus · repli automatique' : `Vue : ${this.view3d ? '3D' : 'dessus'}`;
        const indicator = document.querySelector<HTMLElement>('#derapage-steering');
        if (indicator) { indicator.textContent = this.active3d || this.cameraFixed ? this.thumb ? `Direction ✓ ${String(Math.round(thumbIntensity(this.thumb)*100))} %` : 'Posez le pouce, puis pointez la direction' : `◀ ━ ${this.pointer.toFixed(2)} ━ ▶`; if (this.cadence.fallback) indicator.textContent = 'Vue de dessus : cadence 3D insuffisante'; indicator.setAttribute('aria-valuenow', String(this.pointer)); }
        const status = document.querySelector('#status');
        if (status)
            status.textContent = `Score : ${String(e.score)} · ${text}`;
    }
}
