import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, meteorAt, polygon, required } from '../../engines/alunir/engine';
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
    advance(ms: number): void;
    hudText(): string;
    bounds(): { module: { x: number; y: number; width: number; height: number }; hud: { x: number; y: number; width: number; height: number } };
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
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
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private held = new Set<string>();
    constructor(private session = new PlaySession(true)) { super('alunir'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.held.clear(); this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        document.body.classList.add('alunir');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('alunir'); delete window.__ALUNIR_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
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
                const s = this.engine.state, body = polygon(s.x, s.y, s.angle);
                const x = Math.min(...body.map(p => p.x)) - 1, y = Math.min(...body.map(p => p.y)) - 1;
                const hud = this.hud?.getBounds();
                return { module: { x, y, width: Math.max(...body.map(p => p.x)) + 1 - x, height: Math.max(...body.map(p => p.y)) + 1 - y },
                    hud: { x: hud?.x ?? 0, y: hud?.y ?? 0, width: hud?.width ?? 0, height: hud?.height ?? 0 } };
            },
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
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
        g.clear(); g.fillStyle(0x101827); g.fillRect(0, 0, 360, 640);
        g.fillStyle(0x96b6cd);
        for (let i = 0; i < 45; i++) g.fillCircle((i * 83 + 19) % 360, (i * 113 + 70) % 460, 1);
        const e = this.engine, plan = e.plan();
        if (e.has('gravite')) { g.fillStyle(0x8866cc, 0.18); g.fillRect(110, 180, 190, 260); }
        if (e.has('tunnel')) { g.fillStyle(0x55bbee, 0.15); g.fillRect(0, 240, 360, 140); for (let x = 20; x < 350; x += 50) { g.lineStyle(2, 0x55bbee); g.lineBetween(x, 290, x + 22, 290); g.lineBetween(x + 22, 290, x + 15, 285); } }
        if (e.has('geyser')) { g.fillStyle(0xffaa55, e.state.ticks % 240 < 180 ? 0.3 : 0.08); g.fillRect(130, 300, 100, 180); }
        for (const [a, b] of e.obstacles()) { g.lineStyle(8, 0x9c7b91); g.lineBetween(a.x, a.y, b.x, b.y); }
        if (e.has('meteores')) { const m = meteorAt(e.state.ticks); g.lineStyle(3, 0xffbb66); g.lineBetween(m.x - 22, m.y - 6, m.x, m.y); g.fillStyle(0xff7755); g.fillCircle(m.x, m.y, 8); }
        if (e.has('balise')) { g.lineStyle(2, e.mission.beacon ? 0x64e4cc : 0xffdd66); g.strokeCircle(plan.beacon[0], plan.beacon[1], 38); g.lineBetween(plan.beacon[0], plan.beacon[1] - 15, plan.beacon[0], plan.beacon[1] + 15); }
        if (e.has('secours') && !e.mission.rescued) { g.fillStyle(0xffffff); g.fillCircle(plan.rescue[0], plan.rescue[1] - 4, 5); g.lineStyle(3, 0xffffff); g.lineBetween(plan.rescue[0], plan.rescue[1] + 1, plan.rescue[0], plan.rescue[1] + 10); g.lineBetween(plan.rescue[0] - 8, plan.rescue[1] + 4, plan.rescue[0] + 8, plan.rescue[1] + 4); }
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
            if (p.role === 'service') { g.lineStyle(2, 0xffcc66); g.strokeRect(p.x + 10, p.y - 18, 12, 15); }
            if (e.has('cargo') && p.role === 'service' && !e.mission.cargo) { g.fillStyle(0xffbb77); g.fillRect(p.x + 38, p.y - 13, 12, 10); }
            for (let i = 0; i < p.multiplier; i++) { g.fillStyle(0xffffff); g.fillCircle(p.x + 8 + i * 8, p.y + 9, 2); }
        }
        const s = this.engine.state, body = polygon(s.x, s.y, s.angle);
        if (e.level === 0 && e.status === 'playing' && e.target().y - s.y < 60) { g.lineStyle(1, 0x64e4cc, 0.6); g.lineBetween(s.x, s.y - 25, s.x, s.y + 18); }
        g.fillStyle(0xffd080); g.fillPoints(body, true); g.lineStyle(2, 0xffffff); g.strokePoints(body, true);
        g.fillStyle(0x18394e); g.fillCircle(s.x, s.y - 3, 12);
        if (e.mission.cargo) { g.fillStyle(0xffbb77); g.fillRect(s.x - 5, s.y + 3, 10, 7); }
        if (e.mission.rescued) { g.fillStyle(0xffffff); g.fillCircle(s.x + 9, s.y - 3, 3); }
        this.hero.draw(g, s.x - 17, s.y - 21, 34, s.angle);
        if (this.engine.controls.thrust && s.fuel > 0 && this.engine.status === 'playing') {
            g.lineStyle(4, 0xff9955); g.lineBetween(s.x - Math.sin(s.angle) * 12, s.y + Math.cos(s.angle) * 12, s.x - Math.sin(s.angle) * 22, s.y + Math.cos(s.angle) * 22);
        }
        const l = e.plan(), intro = s.ticks < 120 ? `\n${l.idea}` : '';
        this.hud?.setText(`${s.ticks < 120 ? l.name : ''}${intro}\nALUNIR ${String(this.engine.level + 1)}/30 · ×${String(required(this.engine.terrain.pads[0]).multiplier)} · SCORE ${String(s.score)} · F ${s.fuel.toFixed(0)} · STAB ${String(this.engine.specialUses)}/2 (${(this.engine.specialTicks / 60).toFixed(1)} s)\nVX ${s.vx.toFixed(2)} /0,6 · VY ${s.vy.toFixed(2)} /1,2 · ${(s.angle * 180 / Math.PI).toFixed(0)}° /10°`);
        // Place the two-line HUD on the opposite side of the module at every frame.
        const top = Math.min(...body.map(p => p.y));
        this.hud?.setY(top < 85 ? 550 : 10);
        const status = document.querySelector('#status');
        if (status) status.textContent = `Score : ${String(s.score)} · ${this.engine.status === 'playing' ? 'En vol' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
