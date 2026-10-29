import { required } from '../../engines/derapage/access';
import Phaser from 'phaser';
import { Engine, LEVELS } from '../../engines/derapage/engine';
import { analogSteer } from '../../engines/derapage/physics';
import { nearest, at } from '../../engines/derapage/track';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, recordCircuitLap } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export function formatTime(ms: number | null): string {
    if (ms === null) return '—';
    const cs = Math.floor(ms / 10);
    return `${String(Math.floor(cs / 6000)).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}
export const derapageButtons: readonly TouchButton[] = [
    { id: 'derapage-drift', label: 'Dérapage', ariaLabel: 'Dérapage', size: 64, placement: 'right', mode: 'hold' },
    { id: 'derapage-bonus', label: 'Bonus', ariaLabel: 'Bonus', size: 56, placement: 'right', mode: 'tap' },
];
export interface DerapageHook {
    overview(enabled: boolean): void;
    read(): ReturnType<Engine['snapshot']>;
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
    private recordedLaps = 0;
    private newRecord = false;
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'derapage', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private manual = false;
    private overviewMode = false;
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
    private panels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
        if (this.engine.status !== 'playing') {
            const scores = document.querySelector('#result-scores'), s = this.engine.snapshot();
            if (scores) scores.textContent = `Temps total ${formatTime(s.timing.raceMs)} · Meilleur tour ${formatTime(s.timing.bestLapMs)} · Record du circuit ${formatTime(this.progress.save.circuitRecords?.[String(this.engine.level)] ?? null)} · Classement ${s.order.map((id, i) => `${String(i + 1)}. Kart ${String(id + 1)}`).join(' · ')}`;
        }
    }
    private start(i: number, seed?: number, fresh = false): void {
        this.recordedLaps = 0;
        this.newRecord = false;
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
            this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.recordedLaps = 0; this.newRecord = false; this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.manual = false; this.panels(); });
        this.game.canvas.setAttribute('aria-label', 'Dérapage : course de karts, vue de dessus');
        if (new URLSearchParams(location.search).get('test') === '1')
            window.__DERAPAGE_TEST__ = {
                overview: enabled => { this.overviewMode = enabled; this.manual = true; this.draw(); },
                read: () => this.engine.snapshot(), loadLevel: (i, seed) => { this.start(i, seed, true); },
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
        while (this.recordedLaps < this.engine.lapTimesMs.length) {
            this.newRecord = recordCircuitLap(browserStorage(), this.progress.save, this.engine.level, required(this.engine.lapTimesMs[this.recordedLaps]));
            this.recordedLaps++;
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
        const e = this.engine.snapshot(), p = required(e.karts[0]), t = e.track, angle = -p.angle - Math.PI / 2;
        const xs = t.points.map(q=>q.x), ys = t.points.map(q=>q.y);
        const cx = (Math.min(...xs)+Math.max(...xs))/2, cy = (Math.min(...ys)+Math.max(...ys))/2;
        const fit = Math.min(300/(Math.max(...xs)-Math.min(...xs)+30),450/(Math.max(...ys)-Math.min(...ys)+30));
        const scale = this.overviewMode ? fit : 5;
        const project = (x: number, y: number) => this.overviewMode ? { x:180+(x-cx)*fit, y:360+(y-cy)*fit } : ({ x: 180 + ((x - p.x) * Math.cos(angle) - (y - p.y) * Math.sin(angle)) * 5, y: 466 + ((x - p.x) * Math.sin(angle) + (y - p.y) * Math.cos(angle)) * 5 });
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        g.clear();
        g.fillStyle(t.circuit.snow.length ? 0xe0eff5 : t.circuit.theme.ground);
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
        if (t.circuit.plaza) {
            const plaza = [[-28,-18],[22,-18],[22,15],[-28,15]].map(([x,y])=>project(required(x),required(y)));
            g.fillStyle(0xb6aa91); g.fillPoints(plaza,true);
            for (const q of [{ x:-50,y:-5 },{ x:53,y:15 }]) {
                const a=project(q.x,q.y);
                g.fillStyle(t.circuit.theme.border); g.fillCircle(a.x,a.y,7*scale);
                g.fillStyle(t.circuit.theme.ground); g.fillCircle(a.x,a.y,5*scale);
            }
        }
        for (let i = 0; i < 96; i++) {
            const a = project(required(t.points[i]).x, required(t.points[i]).y), b = project(required(t.points[(i + 1) % 96]).x, required(t.points[(i + 1) % 96]).y);
            line(a, b, required(t.widths[i]) * scale + (t.circuit.theme.urban ? 6*scale : 5), t.circuit.theme.border);
            const height = required(t.heights[i]);
            const shade = Math.min(12, Math.floor(height));
            const road = t.circuit.snow.length ? 0xc9dfe9 : t.circuit.family === 'bmx' ? 0x9b744d : 0x38434d;
            line(a, b, required(t.widths[i]) * scale, road + shade * 0x010101);

            if (t.circuit.jumps.includes(i)) line(a, b, required(t.widths[i]) * scale, 0xb69366);
        }
        for (const edge of t.bermEdges) line(project(edge.a.x,edge.a.y),project(edge.b.x,edge.b.y),2*scale,0xe4c99a);
        if (t.circuit.theme.urban) {
            for (let i=0;i<96;i++) {
                if (!t.walls[i]) continue;
                const q=required(t.points[i]), r=required(t.points[(i+1)%96]);
                const n=nearest(t,q), m=nearest(t,r);
                for (const side of [-1,1]) {
                    const edge = (p: { x:number; y:number }, normal: { nx:number; ny:number }, half:number) => project(p.x+normal.nx*half*side,p.y+normal.ny*half*side);
                    line(edge(q,n,required(t.widths[i])/2+.9),edge(r,m,required(t.widths[(i+1)%96])/2+.9),Math.max(2,1.8*scale),0xbec5ca);
                    const a=edge(q,n,required(t.widths[i])/2+1.8), b=edge(r,m,required(t.widths[(i+1)%96])/2+1.8);
                    line(a,b,Math.max(2.5,.65*scale),0xf1f5f8);
                    const posts=Math.max(1,Math.ceil(Math.hypot(r.x-q.x,r.y-q.y)/3));
                    for (let j=0;j<posts;j++) {
                        const x=a.x+(b.x-a.x)*j/posts, y=a.y+(b.y-a.y)*j/posts;
                        line({ x,y },{ x,y:y-Math.max(3,1.1*scale) },Math.max(1.5,.45*scale),0x647583);
                    }
                }
            }
            // Short paving joints follow the road; the continuous border is the kerb/rail.
            for (let i=0;i<96;i+=2) {
                const q=required(t.points[i]), n=nearest(t,q), half=required(t.widths[i])/2-1;
                line(project(q.x+n.nx*half,q.y+n.ny*half),project(q.x-n.nx*half,q.y-n.ny*half),1,0x65717a);
            }
        }
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
            const a = project(b.x, b.y);
            if (a.y > 110 && a.y < 620) { g.fillStyle(0x68edc0); g.fillCircle(a.x, a.y, b.radius * scale); g.fillStyle(0xffffff); g.fillTriangle(a.x - 6, a.y + 4, a.x + 6, a.y + 4, a.x, a.y - 6); }
        }
        for (const tree of t.trees) {
            const a = project(tree.x, tree.y);
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
            if (!reduced && k.driftMs >= 600) {
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
        const s = e;
        const timing = s.timing;
        const delta = timing.lastLapDeltaMs;
        const crossing = timing.lapTimesMs.length === 0 ? '' : `Écart ${delta === null ? '—' : `${delta < 0 ? '−' : '+'}${formatTime(Math.abs(delta))}`} ${this.newRecord ? 'Nouveau record !' : ''}`;
        const text = `DÉRAPAGE ${String(e.level + 1)}/30 · PLACE ${String(s.order.indexOf(0) + 1)}/6 · TOUR ${String(Math.min(3, p.lap + 1))}/3
SCORE ${String(s.score)} · COURSE ${formatTime(timing.raceMs)} · TOUR ${formatTime(timing.currentLapMs)}
MEILLEUR ${formatTime(timing.bestLapMs)} · BONUS ${(p.noticeMs ?? 0) > 0 ? 'Porte manquée +2,0 s' : p.item ?? '—'}${crossing ? ` · ${crossing}` : ''}
COUPE ${String(s.cup.races)}/4 · ${s.cup.order.map(id => `${String(id + 1)}:${String(s.cup.scores[id])}`).join(' ')}`;
        if (this.hud) {
            this.hud.replaceChildren();
            const lines = text.split('\n');
            lines.forEach((line, i) => {
                const span = document.createElement('span');
                span.textContent = line + (i < lines.length - 1 ? '\n' : '');
                if (i === 2 && crossing) {
                    span.dataset.lapDelta = 'true';
                    span.style.color = delta !== null && delta < 0 ? '#80efac' : '#ff9b9b';
                }
                this.hud?.append(span);
            });
            this.hud.style.visibility = this.session.paused || this.selecting ? 'hidden' : 'visible';
            const box = this.game.canvas.getBoundingClientRect(), scale = box.width / 360;
            this.hud.style.left = `${String(box.x + 8 * scale)}px`;
            this.hud.style.top = `${String(box.y + 6 * scale)}px`;
            this.hud.style.fontSize = `${String(12 * scale)}px`;
            // Keep all four lines left of the mini-map, inside the reserved band.
            for (const span of this.hud.children) {
                const width = span.getBoundingClientRect().width;
                if (width > 249 * scale && span instanceof HTMLElement)
                    span.style.fontSize = `${String(12 * scale * 249 * scale / width)}px`;
            }
        }
        const indicator = document.querySelector<HTMLElement>('#derapage-steering');
        if (indicator) { indicator.textContent = `◀ ━ ${this.pointer.toFixed(2)} ━ ▶`; indicator.setAttribute('aria-valuenow', String(this.pointer)); }
        const status = document.querySelector('#status');
        if (status)
            status.textContent = `Score : ${String(e.score)} · ${text}`;
    }
}
