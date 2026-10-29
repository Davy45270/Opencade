import { required } from '../../engines/derapage/access';
import Phaser from 'phaser';
import { Engine, LEVELS } from '../../engines/derapage/engine';
import { analogSteer } from '../../engines/derapage/physics';
import { nearest, at } from '../../engines/derapage/track';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const derapageButtons: readonly TouchButton[] = [
    { id: 'derapage-drift', label: 'Dérapage', ariaLabel: 'Dérapage', size: 64, placement: 'right', mode: 'hold' },
    { id: 'derapage-bonus', label: 'Bonus', ariaLabel: 'Bonus', size: 56, placement: 'right', mode: 'tap' },
];
export interface DerapageHook {
    read(): ReturnType<Engine['snapshot']>;
    loadLevel(i: number, seed?: number): void;
    advance(ms: number): void;
    scenario(name: 'finish' | 'danger' | 'trees-boost'): void;
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
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'derapage', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private manual = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: HTMLElement;
    private held = new Set<string>();
    private pointer = 0;
    private thumb: { id: number; x: number } | null = null;
    private tilt = 0;
    private tiltEnabled = false;
    private mouseEnabled = false;
    private pendingBonus = false;
    private soundFrame = 0;
    private traces: {
        x: number;
        y: number;
    }[] = [];
    constructor(private session = new PlaySession(true)) { super('derapage'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting); }
    private start(i: number, seed?: number, fresh = false): void {
        this.manual = false;
        this.held.clear();
        this.pointer = 0;
        this.thumb = null;
        this.pendingBonus = false;
        this.traces = [];
        this.progress.start(i, fresh);
        this.engine.loadLevel(i, seed);
        this.selecting = false;
        this.panels();
    }
    create(): void {
        document.body.classList.add('derapage');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('derapage'); delete window.__DERAPAGE_TEST__; this.hud?.remove(); sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = document.createElement('div');
        this.hud.setAttribute('aria-live', 'off');
        this.hud.dataset.derapageHud = 'true';
        this.hud.style.cssText = 'position:fixed;pointer-events:none;white-space:pre;color:#effaff;font-family:system-ui;line-height:1.3;z-index:1';
        document.querySelector('#game')?.append(this.hud);
        const action = (id: string, held: boolean): void => {
            if (!held) { this.held.delete(id); return; }
            if (this.session.state === 'ready')
                this.session.send('start');
            if (this.session.paused || this.selecting)
                return;
            if (id === 'bonus')
                this.pendingBonus = true;
            this.held.add(id);
        };
        renderTouchControls(this.inputs, derapageButtons, (id, held) => { action(id.replace('derapage-', ''), held); });
        const indicator = document.createElement('output'); indicator.id = 'derapage-steering'; indicator.setAttribute('aria-label', 'Braquage'); document.querySelector('#touch-controls .left')?.append(indicator); this.inputs.cleanup(() => { indicator.remove(); });
        const keys: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift', KeyX: 'bonus', ControlLeft: 'bonus', ControlRight: 'bonus' };
        for (const type of ['keydown', 'keyup'])
            this.inputs.on(document, type, event => { const e = event as KeyboardEvent; const id = keys[e.code]; if (id) {
                e.preventDefault();
                action(id, type === 'keydown');
            } });
        this.inputs.on(window, 'blur', () => { this.held.clear(); this.pointer = 0; this.thumb = null; });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            this.inputs.on(area, 'pointerdown', event => { const e = event as PointerEvent; if (e.pointerType !== 'mouse' && !this.thumb && e.clientX < area.getBoundingClientRect().left + area.clientWidth / 2 && !(e.target as HTMLElement).closest('button')) {
                area.setPointerCapture(e.pointerId);
                this.thumb = { id: e.pointerId, x: e.clientX };
                this.pointer = 0;
                action('steering', true);
            } });
            this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerId === this.thumb?.id) this.pointer = analogSteer(e.clientX - this.thumb.x); if (e.pointerType === 'mouse' && this.mouseEnabled) {
                const r = area.getBoundingClientRect();
                this.pointer = Math.max(-1, Math.min(1, 2 * (e.clientX - r.left) / r.width - 1));
            } });
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'])
                this.inputs.on(area, type, event => { if ((event as PointerEvent).pointerType === 'mouse') this.pointer = 0; if ((event as PointerEvent).pointerId === this.thumb?.id) { this.thumb = null; this.pointer = 0; this.engine.input({ steer: 0, drift: this.held.has('drift'), bonus: false }); } });
        }
        // Optional sensors are enabled by an explicit user gesture; failures are silent.
        const help = document.querySelector('#game-help');
        for (const [label, run] of [
            ['Inclinaison', () => { void this.enableTilt(); }],
            ['Souris', () => { this.mouseEnabled = !this.mouseEnabled; }],
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
            this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.manual = false; this.panels(); });
        this.game.canvas.setAttribute('aria-label', 'Dérapage : course de karts, vue de dessus');
        if (new URLSearchParams(location.search).get('test') === '1')
            window.__DERAPAGE_TEST__ = {
                read: () => this.engine.snapshot(), loadLevel: (i, seed) => { this.start(i, seed, true); },
                advance: ms => { if (!Number.isFinite(ms) || ms < 0)
                    throw new RangeError('Temps invalide'); this.manual = true; this.tick(ms); },
                hudText: () => this.hud?.textContent ?? '', usefulArea: () => ({ x: 0, y: 96, width: 360, height: 544 }),
                bounds: () => {
                    const canvas = this.game.canvas.getBoundingClientRect(), hud = this.hud?.getBoundingClientRect(), scale = canvas.width / 360;
                    return { hud: { x: ((hud?.x ?? canvas.x) - canvas.x) / scale, y: ((hud?.y ?? canvas.y) - canvas.y) / scale, width: (hud?.width ?? 0) / scale, height: (hud?.height ?? 0) / scale }, forward: { x: 0, y: 96, width: 360, height: 330 } };
                },
                scenario: name => {
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
                    Object.assign(k, p, { angle: Math.atan2(q.y - p.y, q.x - p.x) - 1.45, vx: 0, vy: 0, lap: 2, gate: 0, passed: 35, item: 'turbo' });
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
    update(_time: number, delta: number): void { this.tick(this.manual ? 0 : delta); }
    private tick(ms: number): void {
        if (this.selecting || this.session.paused) { this.held.clear(); this.pointer = 0; this.thumb = null; this.pendingBonus = false; }
        if (!this.selecting && !this.session.paused) {
            const k = required(this.engine.karts[0]), hits = k.hits, boost = k.boostMs;
            this.engine.input({ steer: Number(this.held.has('right')) - Number(this.held.has('left')) + this.pointer + (this.tiltEnabled ? this.tilt : 0), drift: this.held.has('drift'), bonus: this.pendingBonus });
            this.pendingBonus = false;
            this.engine.step(ms);
            if (k.hits > hits) {
                sound.playEffect('life');
                sound.playEffect('impact');
            }
            if (k.boostMs > boost)
                sound.playEffect('boost');
            if (ms > 0 && this.engine.frames - this.soundFrame > 18) {
                const n = nearest(this.engine.track, k);
                sound.playEffect(n.distance > required(this.engine.track.widths[n.index]) / 2 ? 'grass' : k.driftMs > 0 ? 'drift' : 'engine');
                this.soundFrame = this.engine.frames;
            }
            if ((k.driftMs > 0 || nearest(this.engine.track, k).distance > required(this.engine.track.widths[nearest(this.engine.track, k).index]) / 2) && ms > 0) {
                this.traces.push({ x: k.x, y: k.y });
                if (this.traces.length > 60)
                    this.traces.shift();
            }
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(browserStorage(), this.progress.save, 'derapage');
            sound.playEffect(this.engine.status);
        }
        this.panels();
        this.draw();
    }
    private draw(): void {
        const g = this.graphics;
        if (!g)
            return;
        const e = this.engine, p = required(e.karts[0]), t = e.track, angle = -p.angle - Math.PI / 2;
        const project = (x: number, y: number) => ({ x: 180 + ((x - p.x) * Math.cos(angle) - (y - p.y) * Math.sin(angle)) * 5, y: 466 + ((x - p.x) * Math.sin(angle) + (y - p.y) * Math.cos(angle)) * 5 });
        g.clear();
        g.fillStyle(0x285a45);
        g.fillRect(0, 96, 360, 544);
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
            g.lineBetween(a.x, Math.max(96, a.y), b.x, Math.max(96, b.y));
        };
        for (let i = 0; i < 96; i++) {
            const a = project(required(t.points[i]).x, required(t.points[i]).y), b = project(required(t.points[(i + 1) % 96]).x, required(t.points[(i + 1) % 96]).y);
            line(a, b, required(t.widths[i]) * 5 + 5, t.walls[i] ? 0xeab789 : 0x91c6ae);
            line(a, b, required(t.widths[i]) * 5, 0x38434d);
        }
        for (const b of t.boosts) {
            const a = project(b.x, b.y);
            if (a.y > 110 && a.y < 620) { g.fillStyle(0x68edc0); g.fillCircle(a.x, a.y, b.radius * 5); g.fillStyle(0xffffff); g.fillTriangle(a.x - 6, a.y + 4, a.x + 6, a.y + 4, a.x, a.y - 6); }
        }
        for (const tree of t.trees) {
            const a = project(tree.x, tree.y);
            if (a.y > 110 && a.y < 620) { g.fillStyle(0x553c29); g.fillCircle(a.x + 2, a.y + 3, tree.radius * 5); g.fillStyle(0x37865a); g.fillCircle(a.x, a.y, tree.radius * 5); g.fillStyle(0x69a865); g.fillCircle(a.x - 3, a.y - 3, tree.radius * 2); }
        }
        for (const i of t.gates) {
            const q = required(t.points[i]), a = project(q.x, q.y);
            if (a.y > 102 && a.y < 630) {
                g.fillStyle(i === 0 ? 0xffffff : 0x627d86);
                g.fillCircle(a.x, a.y, i === 0 ? 4 : 2);
            }
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
                g.fillStyle('owner' in c ? 0x4da2cc : 0xffd166);
                g.fillRoundedRect(a.x - 6, a.y - 6, 12, 12, 3);
            }
        }
        const colors = [0xffdb70, 0xff786a, 0x67d9ec, 0xc797ff, 0x9ee278, 0xf29acd];
        for (const k of e.karts) {
            const a = project(k.x, k.y);
            if (a.y < 114 || a.y > 622)
                continue;
            g.save();
            g.translateCanvas(a.x, a.y);
            g.rotateCanvas(k.angle + angle);
            g.fillStyle(0x17202d);
            g.fillRect(-8, -8, 16, 16);
            g.fillStyle(required(colors[k.id]));
            g.fillRoundedRect(-11, -6, 22, 12, 4);
            g.fillStyle(0x26394a);
            g.fillCircle(0, 0, 4);
            if (k.boostMs > 0) { g.fillStyle(0x70eeff); g.fillTriangle(-12, -5, -12, 5, -24, 0); }
            if (k.shield) {
                g.lineStyle(2, 0x8cefff);
                g.strokeCircle(0, 0, 16);
            }
            if (k.driftMs >= 600) {
                g.fillStyle(k.driftMs >= 1400 ? 0xff67bd : 0x66dcff);
                g.fillCircle(-14, 8, 3);
                g.fillCircle(-14, -8, 3);
            }
            g.restore();
        }
        g.fillStyle(0x101827);
        g.fillRect(0, 0, 360, 96);
        // Mini-map is entirely in the reserved HUD band.
        g.lineStyle(2, 0x91c6ae);
        for (let i = 0; i < 96; i++) {
            const a = required(t.points[i]), b = required(t.points[(i + 1) % 96]);
            g.lineBetween(309 + a.x * .42, 47 + a.y * .42, 309 + b.x * .42, 47 + b.y * .42);
        }
        for (const k of e.karts) {
            g.fillStyle(required(colors[k.id]));
            g.fillCircle(309 + k.x * .42, 47 + k.y * .42, 2);
        }
        const s = e.snapshot();
        const text = `DÉRAPAGE ${String(e.level + 1)}/30 · SCORE ${String(e.score)}\nPLACE ${String(s.order.indexOf(0) + 1)}/6 · TOUR ${String(Math.min(3, p.lap + 1))}/3\nBONUS ${p.item ?? '—'} · ${String(Math.floor(e.time / 1000))} s\nCOUPE ${String(s.cup.races)}/4 · ${s.cup.order.map(id => `${String(id + 1)}:${String(s.cup.scores[id])}`).join(' ')}`;
        if (this.hud) {
            this.hud.textContent = text;
            this.hud.style.visibility = this.session.paused || this.selecting ? 'hidden' : 'visible';
            const box = this.game.canvas.getBoundingClientRect(), scale = box.width / 360;
            this.hud.style.left = `${String(box.x + 8 * scale)}px`;
            this.hud.style.top = `${String(box.y + 6 * scale)}px`;
            this.hud.style.fontSize = `${String(12 * scale)}px`;
        }
        const indicator = document.querySelector<HTMLElement>('#derapage-steering');
        if (indicator) { indicator.textContent = `◀ ━ ${this.pointer.toFixed(2)} ━ ▶`; indicator.setAttribute('aria-valuenow', String(this.pointer)); }
        const status = document.querySelector('#status');
        if (status)
            status.textContent = `Score : ${String(e.score)} · ${text}`;
    }
}
