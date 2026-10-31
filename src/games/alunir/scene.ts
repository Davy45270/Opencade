import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { DecorCache } from '../ferraille/decor-cache';
import { lunarSky, lunarGround, lunarCrater, lunarModule, scoreMark, moduleBounds } from './presentation';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, meteorAt, required } from '../../engines/alunir/engine';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const alunirButtons: readonly TouchButton[] = [
    { id: 'alunir-special', label: 'Stable', ariaLabel: 'Stabilisation', size: 56, placement: 'right', mode: 'tap' },
    { id: 'alunir-left', label: '↺', ariaLabel: 'Tourner à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'alunir-right', label: '↻', ariaLabel: 'Tourner à droite', size: 56, placement: 'left', mode: 'hold' },
    { id: 'alunir-thrust', label: 'Poussée', ariaLabel: 'Poussée', size: 64, placement: 'right', mode: 'hold' },
];
export interface AlunirHook {
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    hudText(): string;
    bounds(): { module: { x: number; y: number; width: number; height: number }; hud: { x: number; y: number; width: number; height: number } };
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean; held: string[] }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __ALUNIR_TEST__?: AlunirHook } }
export class AlunirScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'alunir', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private decor?: DecorCache;
    private groundGraphics?: Phaser.GameObjects.Graphics;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private held = new Set<string>();
    constructor(private session = new PlaySession(true)) { super('alunir'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.held.clear(); this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels(); this.draw();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('alunir');
        const cleanup = (): void => { this.inputs.dispose(); this.decor?.destroy(); document.body.classList.remove('alunir'); delete window.__ALUNIR_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.groundGraphics = this.add.graphics().setDepth(-3);
        this.decor = new DecorCache(this, 70);
        for (let part = 0; part < 6; part++) this.decor.bake(`lunar-118-${String(part)}`, 360, 640, g => { lunarSky(g, this.engine, true, part); });
        for (let i = 0; i < 12; i++) this.decor.bake(`crater-118-${String(i)}`, 64, 48, g => { lunarCrater(g, i, 32, 24); });
        this.hud = this.add.text(10, 10, '', { fontFamily: 'system-ui', fontSize: '11px', color: '#e5f3ff', lineSpacing: 2, wordWrap: { width: 340 } });
        const control = (id: string, held: boolean): void => {
            if (held && !this.session.menuOpen && !this.selecting && this.session.state === 'ready') this.session.send('start');
            if (held && !this.session.paused && !this.selecting) {
                if (id === 'alunir-special') { this.engine.special(); return; }
                if (id === 'alunir-thrust' && !this.held.has(id)) sound.playEffect('thrust');
                this.held.add(id);
            } else this.held.delete(id);
        };
        renderTouchControls(this.inputs, alunirButtons, control);
        const keys: Record<string, string> = { Space: 'special', ArrowUp: 'thrust', KeyW: 'thrust', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        for (const type of ['keydown', 'keyup']) this.inputs.on(document, type, event => {
            const e = event as KeyboardEvent, key = keys[e.code];
            if (key && !e.repeat) { e.preventDefault(); control(`alunir-${key}`, type === 'keydown'); }
        });
        this.inputs.on(window, 'blur', () => { this.held.clear(); });
        const choose = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.held.clear(); this.testManual = false; this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Alunir : poser le module sur la plateforme lumineuse');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ALUNIR_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            bounds: () => {
                const s = this.engine.state, hud = this.hud?.getBounds();
                return { module: moduleBounds(s.x, s.y, s.angle),
                    hud: { x: hud?.x ?? 0, y: hud?.y ?? 0, width: hud?.width ?? 0, height: hud?.height ?? 0 } };
            },
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.engine.state.ticks * 1000 / 60 }),
            read: () => ({ fingerInput: { receipts: receipts(), paused: this.session.paused, held: [...this.held] }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                this.start(0, 454, true);
                const p = required(this.engine.terrain.pads[0]);
                this.engine.loadState({ x: p.x + p.width / 2, y: p.y - 15, vy: name === 'finish' ? 1.21 : 4, fuel: 100 });

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
        const previousStatus = this.engine.status;
        if (this.session.paused || this.selecting) this.held.clear();
        const thrust = this.held.has('alunir-thrust');
        this.engine.input({ thrust, left: this.held.has('alunir-left'), right: this.held.has('alunir-right') });
        if (!this.session.paused && !this.selecting) this.engine.step(delta);
        if (thrust) this.hero.move(0, true);
        if (previousStatus === 'playing' && this.engine.status === 'lost') this.hero.impact = 350;
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialTicks > 0);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'alunir'); sound.playEffect(this.engine.status);
        }
        if (this.testAdvancing) return;
        this.scale.refresh();
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics;
        if (!g) return;
        g.clear();
        const e = this.engine, plan = e.plan();
        const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (this.decor) {
            this.decor.begin();
            for (let part = 0; part < 6; part++) {
                const shiftX = reduced ? 0 : part >= 1 && part <= 3 ? ((-e.state.x * .025 * part % 360) + 360) % 360 : part === 4 ? -e.state.x * .02 : 0;
                const shiftY = reduced || part < 1 || part > 3 ? 0 : e.state.ticks * .015 * part % 640;
                for (const x of part >= 1 && part <= 3 ? [shiftX - 360, shiftX] : [shiftX]) for (const y of shiftY ? [shiftY - 640, shiftY] : [0]) this.decor.draw(`lunar-118-${String(part)}`, x, y, 360, 640, -6 + part * .1);
            }
        } else lunarSky(g, e, reduced);
        g.save(); g.scaleCanvas(1, .88);
        if (this.decor && this.groundGraphics) {
            const ground = this.groundGraphics;
            ground.clear(); ground.save(); ground.scaleCanvas(1, .88);
            lunarGround(ground, e, (i, x, y) => { this.decor?.draw(`crater-118-${String(i % 12)}`, x - 32, (y - 24) * .88, 64, 48 * .88, -2); });
            ground.restore();
        } else lunarGround(g, e);
        if (e.has('gravite')) { g.fillStyle(0x8866cc, 0.18); g.fillRect(110, 180, 190, 260); }
        if (e.has('tunnel')) { g.fillStyle(0x55bbee, 0.15); g.fillRect(0, 240, 360, 140); for (let x = 20; x < 350; x += 50) { g.lineStyle(2, 0x55bbee); g.lineBetween(x, 290, x + 22, 290); g.lineBetween(x + 22, 290, x + 15, 285); } }
        if (e.has('geyser')) { g.fillStyle(0xffaa55, e.state.ticks % 240 < 180 ? 0.3 : 0.08); g.fillRect(130, 300, 100, 180); }
        if (e.has('gravite')) for (let i = 0; i < 10; i++) { g.lineStyle(2, 0xbc9dff, .6); g.strokeEllipse(205, 205 + i * 23, 150 - i % 3 * 15, 22); }
        if (e.has('tunnel')) for (let i = 0; i < 8; i++) {
            const x = 8 + i * 48;
            g.lineStyle(3, 0x69cbe7, .6); g.lineBetween(x, 242, x + 10, 252); g.lineBetween(x + 10, 252, x + 10, 368); g.lineBetween(x + 10, 368, x, 378);
            g.lineStyle(2, 0xc4fbff, .6); g.strokeEllipse(x + 25, 310, 28, 52);
        }
        if (e.has('geyser')) for (let i = 0; i < 18; i++) {
            const active = e.state.ticks % 240 < 180, x = 145 + i * 31 % 76, y = 475 - i * (active ? 9 : 2);
            g.fillStyle(i % 2 ? 0xffd881 : 0xff9159, active ? .8 : .3); g.fillEllipse(x, y, 5 + i % 4, 14);
        }
        if (e.has('glace')) for (const p of e.terrain.pads) for (let i = 0; i < 6; i++) { g.fillStyle(0xb5f5ff, .8); g.fillTriangle(p.x + i * p.width / 6, p.y + 24, p.x + (i + 1) * p.width / 6, p.y + 24, p.x + (i + .5) * p.width / 6, p.y + 42); }
        for (const [a, b] of e.obstacles()) { g.lineStyle(8, 0x9c7b91); g.lineBetween(a.x, a.y, b.x, b.y);
            const length = Math.hypot(b.x - a.x, b.y - a.y), count = Math.ceil(length / 22);
            for (let i = 0; i < count; i++) { const x = a.x + (b.x - a.x) * i / count, y = a.y + (b.y - a.y) * i / count;
                g.fillStyle(i % 2 ? 0x9d83ac : 0x75648f); g.fillTriangle(x - 12, y - 7, x + 12, y - 4, x + 6, y + 13); }
        }
        if (e.has('meteores')) { const m = meteorAt(e.state.ticks); g.lineStyle(3, 0xffbb66); g.lineBetween(m.x - 22, m.y - 6, m.x, m.y); g.fillStyle(0xff7755); g.fillCircle(m.x, m.y, 12); g.fillStyle(0x785369); g.fillCircle(m.x + 2, m.y, 9); g.fillStyle(0xc89a97); g.fillCircle(m.x - 2, m.y - 3, 3); }
        if (e.has('balise')) { g.fillStyle(0x9fe8ef); g.fillRoundedRect(plan.beacon[0] - 9, plan.beacon[1] - 17, 18, 34, 5); g.fillStyle(0xffde78); g.fillTriangle(plan.beacon[0], plan.beacon[1] - 35, plan.beacon[0] - 16, plan.beacon[1] - 18, plan.beacon[0] + 16, plan.beacon[1] - 18); g.lineStyle(2, e.mission.beacon ? 0x64e4cc : 0xffdd66); g.strokeCircle(plan.beacon[0], plan.beacon[1], 38); g.lineBetween(plan.beacon[0], plan.beacon[1] - 15, plan.beacon[0], plan.beacon[1] + 15); }
        if (e.has('secours') && !e.mission.rescued) { g.fillStyle(0xe5efff); g.fillRoundedRect(plan.rescue[0] - 7, plan.rescue[1], 14, 16, 4); g.fillStyle(0x44c1df); g.fillEllipse(plan.rescue[0], plan.rescue[1] - 4, 18, 16); g.lineStyle(3, 0xe5efff); g.strokeEllipse(plan.rescue[0], plan.rescue[1] - 4, 18, 16); g.fillStyle(0xffffff); g.fillCircle(plan.rescue[0], plan.rescue[1] - 4, 5); g.lineStyle(3, 0xffffff); g.lineBetween(plan.rescue[0], plan.rescue[1] + 1, plan.rescue[0], plan.rescue[1] + 10); g.lineBetween(plan.rescue[0] - 8, plan.rescue[1] + 4, plan.rescue[0] + 8, plan.rescue[1] + 4); }
        for (const [i, gate] of plan.route.entries()) {
            g.lineStyle(2, e.events.includes('passage ' + String(i)) ? 0x64e4cc : 0xffdd66);
            g.strokeCircle(gate[0], gate[1], 22);
            if (gate === e.nextGate()) { g.lineBetween(gate[0] - 6, gate[1], gate[0] + 6, gate[1]); g.lineBetween(gate[0], gate[1] - 6, gate[0], gate[1] + 6); }
        }
        const points = this.engine.terrain.points;
        g.lineStyle(2, 0x7487a6);
        for (let i = 1; i < points.length; i++) g.lineBetween(required(points[i - 1]).x, required(points[i - 1]).y, required(points[i]).x, required(points[i]).y);
        for (const p of this.engine.terrain.pads) {
            g.lineStyle(5, p.role === 'service' ? 0xffcc66 : e.has('glace') ? 0xbbeeff : 0x64e4cc); g.lineBetween(p.x, p.y, p.x + p.width, p.y);
            if (p.role === 'service') { g.fillStyle(0xedd784); g.fillRoundedRect(p.x + 5, p.y - 34, 22, 30, 6); g.fillStyle(0x46c9ce); g.fillRoundedRect(p.x + 9, p.y - 29, 14, 16, 3); g.lineStyle(3, 0xffd562); g.lineBetween(p.x + 27, p.y - 26, p.x + 35, p.y - 20); g.lineBetween(p.x + 35, p.y - 20, p.x + 35, p.y - 7); g.lineStyle(2, 0xffcc66); g.strokeRect(p.x + 10, p.y - 18, 12, 15); }
            if (e.has('cargo') && p.role === 'service' && !e.mission.cargo) { g.fillStyle(0xffbb77); g.fillRoundedRect(p.x + 38, p.y - 25, 23, 22, 3); g.lineStyle(2, 0xffedb4); g.strokeRect(p.x + 38, p.y - 25, 23, 22); g.lineBetween(p.x + 49, p.y - 25, p.x + 49, p.y - 3); g.lineBetween(p.x + 38, p.y - 19, p.x + 61, p.y - 19); }
            g.fillStyle(0x263b66); g.fillRoundedRect(p.x, p.y + 3, p.width, 22, 4);
            scoreMark(g, p.x + p.width / 2 - 9, p.y + 7, p.multiplier);
            if (e.has('mobile') && p.role !== 'service') {
                g.fillStyle(0xffce64); g.fillTriangle(p.x - 9, p.y + 10, p.x - 2, p.y + 5, p.x - 2, p.y + 15);
                g.fillTriangle(p.x + p.width + 9, p.y + 10, p.x + p.width + 2, p.y + 5, p.x + p.width + 2, p.y + 15);
                g.fillStyle(0x83eaff); g.fillTriangle(p.x + 8, p.y + 25, p.x + 17, p.y + 25, p.x + 12, p.y + 38);
            }
            for (let i = 0; i < p.multiplier; i++) { g.fillStyle(0xffffff); g.fillCircle(p.x + 8 + i * 8, p.y + 9, 2); }
        }
        const s = this.engine.state;
        if (e.level === 0 && e.status === 'playing' && e.target().y - s.y < 60) { g.lineStyle(1, 0x64e4cc, 0.6); g.lineBetween(s.x, s.y - 25, s.x, s.y + 18); }
        lunarModule(g, e, this.hero, reduced);
        g.restore();
        const l = e.plan(), intro = s.ticks < 120 ? `\n${l.idea}` : '';
        this.hud?.setText(`${s.ticks < 120 ? l.name : ''}${intro}\nALUNIR ${String(this.engine.level + 1)}/30 · ×${String(required(this.engine.terrain.pads[0]).multiplier)} · SCORE ${String(s.score)} · F ${s.fuel.toFixed(0)} · STAB ${String(this.engine.specialUses)}/2 (${(this.engine.specialTicks / 60).toFixed(1)} s)\nVX ${s.vx.toFixed(2)} /0,6 · VY ${s.vy.toFixed(2)} /1,2 · ${(s.angle * 180 / Math.PI).toFixed(0)}° /10°`);
        // Place the two-line HUD on the opposite side of the module at every frame.
        const top = moduleBounds(s.x, s.y, s.angle).y;
        this.hud?.setY(top < 100 ? 550 : 10);
        const status = document.querySelector('#status');
        if (status) status.textContent = `Score : ${String(s.score)} · ${this.engine.status === 'playing' ? 'En vol' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
