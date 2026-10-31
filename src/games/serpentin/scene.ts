import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import Phaser from 'phaser';
import { Engine, LEVELS, difficulty, layout, gateOpen, type Direction } from '../../engines/serpentin/engine';
import { levelTip } from '../../engines/serpentin/tips';
import { Inputs, renderTouchControls, directionalSwipe, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const serpentinButtons: readonly TouchButton[] = [
    { id: 'serpentin-special', label: 'Esquive', ariaLabel: 'Esquive : traverser son corps une fois', size: 56, placement: 'right', mode: 'tap' },
    { id: 'serpentin-left', label: '←', ariaLabel: 'Aller à gauche', size: 56, placement: 'left', mode: 'tap' },
    { id: 'serpentin-up', label: '↑', ariaLabel: 'Monter', size: 56, placement: 'center', mode: 'tap' },
    { id: 'serpentin-down', label: '↓', ariaLabel: 'Descendre', size: 56, placement: 'center', mode: 'tap' },
    { id: 'serpentin-right', label: '→', ariaLabel: 'Aller à droite', size: 56, placement: 'right', mode: 'tap' },
];
export interface SerpentinHook {
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    renderedFrames(): number;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean }; character: ReturnType<GameCharacter['snapshot']>; cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'wall' | 'benchmark' | 'body'): void;
    /** Gate states drawn by the last frame (pass 401). */
    marks(): { open: number; closing: number; closed: number };
}
declare global { interface Window { __SERPENTIN_TEST__?: SerpentinHook } }
export class SerpentinScene extends Phaser.Scene {
    private hero = new GameCharacter();
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'serpentin', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private frames = 0;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private glow = 0;
    private drawn = { open: 0, closing: 0, closed: 0 };
    constructor(private session = new PlaySession(true)) { super('serpentin'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('serpentin');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('serpentin'); delete window.__SERPENTIN_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(15, 548, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#e5f3ff', lineSpacing: 8 });
        const direction = (value: Direction | 'special'): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            if (value === 'special') { this.engine.special(); return; }
            const before = this.engine.snapshot().queue.length;
            this.engine.input(value);
            if (this.engine.snapshot().queue.length > before) sound.playEffect('turn');
        };
        renderTouchControls(this.inputs, serpentinButtons, (id, held) => { if (held) direction(id.replace('serpentin-', '') as Direction | 'special'); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) directionalSwipe(this.inputs, area, direction, 20, true);
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
        this.game.canvas.setAttribute('aria-label', 'Serpentin : glisser pour guider la tête lumineuse');
        if (new URLSearchParams(location.search).get('test') === '1') window.__SERPENTIN_TEST__ = {
            renderedFrames: () => this.frames,
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.engine.snapshot().ticks * 1000 / 60 }),
            read: () => ({ fingerInput: { receipts: receipts(), paused: this.session.paused }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            marks: () => ({ ...this.drawn }),
            scenario: name => {
                if (name === 'benchmark') {
                    // Real toroidal movement, no growth or obstacle collision during sampling.
                    this.start(4, 454, true);
                    this.engine.state.obstacles = []; this.engine.state.apple = { x: 7, y: 0 };
                    return;
                }
                this.start(0, 454, true);
                if (name === 'body') {
                    this.engine.loadState({ segments: [{ x: 4, y: 10 }, { x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 9 }, { x: 8, y: 9 }, ...Array.from({ length: 6 }, (_, i) => ({ x: 8, y: 10 + i }))], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 });
                    return;
                }
                this.engine.loadState({ segments: name === 'finish' ? [...Array.from({ length: 8 }, (_, i) => ({ x: 7 - i, y: 10 })), { x: 0, y: 11 }, { x: 1, y: 11 }] : [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }], direction: 'right', apple: name === 'wall' ? { x: 2, y: 2 } : { x: 7, y: 9 }, obstacles: name === 'wall' ? [{ x: 7, y: 9 }] : [], eaten: name === 'finish' ? 7 : 0, score: name === 'finish' ? 70 : 0, crystal: null, crystalUntil: 0 });
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
        const before = this.engine.state.score;
        const previous = this.engine.state.segments[0], status = this.engine.status;
        if (!this.selecting && !this.session.paused) this.engine.step(delta);
        const head = this.engine.state.segments[0];
        if (previous && head && (previous.x !== head.x || previous.y !== head.y)) this.hero.move(head.x - previous.x);
        if (status === 'playing' && this.engine.status === 'lost') this.hero.impact = 350;
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialArmed || this.engine.specialMs > 0);
        for (const event of this.engine.events) if (event === 'portal' || event === 'scissors') sound.playEffect(event);
        this.engine.events = [];
        if (this.engine.state.score !== before) { this.glow = 1; sound.playEffect(this.engine.state.score - before >= 50 * (this.engine.level + 1) ? 'crystal' : 'apple'); }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'serpentin'); sound.playEffect(this.engine.status);
        }
        this.glow = Math.max(0, this.glow - delta / 400);
        if (this.testAdvancing) return;
        this.scale.refresh();
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics;
        if (!g) return;
        this.frames++;
        g.clear(); g.fillStyle(0x132438); g.fillRoundedRect(0, 0, 360, 640, 18);
        g.lineStyle(1, 0x24415a);
        for (let x = 0; x <= 15; x++) g.lineBetween(15 + x * 22, 32, 15 + x * 22, 494);
        for (let y = 0; y <= 21; y++) g.lineBetween(15, 32 + y * 22, 345, 32 + y * 22);
        const d = difficulty(this.engine.level);
        g.lineStyle(3, d.walls ? 0xffb867 : 0x70cfff); g.strokeRect(14, 31, 332, 464);
        const l = layout(this.engine.level), ticks = this.engine.snapshot().ticks, at = (v: number) => 26 + v * 22, ay = (v: number) => 43 + v * 22;
        // Portals: paired rings sharing one colour per pair.
        l.portals.forEach((p, i) => {
            const color = i % 2 ? 0x7affc4 : 0xff7ad9;
            for (const c of [p.a, p.b]) { g.lineStyle(3, color); g.strokeCircle(at(c.x), ay(c.y), 8); g.fillStyle(color, 0.35 + 0.25 * Math.sin(ticks / 9)); g.fillCircle(at(c.x), ay(c.y), 5); }
        });
        // Gates: solid bar when closed, outline when open, blinking during the last half second.
        this.drawn = { open: 0, closing: 0, closed: 0 };
        for (const gate of l.gates) {
            const open = gateOpen(gate, ticks), closing = open && (ticks + gate.phase) % gate.period >= gate.open - 30;
            this.drawn[closing ? 'closing' : open ? 'open' : 'closed']++;
            g.lineStyle(2, 0xffd166); g.strokeRect(17 + gate.cell.x * 22, 34 + gate.cell.y * 22, 18, 18);
            if (!open || (closing && Math.floor(ticks / 5) % 2 === 0)) { g.fillStyle(0xffd166, open ? 0.45 : 1); g.fillRect(19 + gate.cell.x * 22, 36 + gate.cell.y * 22, 14, 14); }
        }
        // Arrows: chevrons pointing where the next move will go.
        for (const k of l.currents) {
            const x = at(k.cell.x), y = ay(k.cell.y);
            const [dx, dy] = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const)[k.direction]; g.fillStyle(0x3f8fbf, 0.55); g.fillRect(x - 10, y - 10, 20, 20);
            g.fillStyle(0xbfe9ff); g.fillTriangle(x + dx * 7, y + dy * 7, x - dx * 3 - dy * 6, y - dy * 3 - dx * 6, x - dx * 3 + dy * 6, y - dy * 3 + dx * 6);
        }
        // Sentries: dotted beat, red body.
        for (const p of l.patrols) { g.fillStyle(0xff6b6b, 0.25); for (const c of p.path) g.fillCircle(at(c.x), ay(c.y), 3); }
        for (const c of this.engine.sentries()) { g.fillStyle(0xff4d5e); g.fillRoundedRect(18 + c.x * 22, 35 + c.y * 22, 16, 16, 3); g.fillStyle(0xffffff); g.fillCircle(at(c.x) - 3, ay(c.y) - 2, 2); g.fillCircle(at(c.x) + 3, ay(c.y) - 2, 2); }
        const scissors = this.engine.state.scissors;
        if (scissors) { const x = at(scissors.x), y = ay(scissors.y); g.lineStyle(3, 0xff6b6b); g.lineBetween(x - 7, y - 7, x + 7, y + 7); g.lineBetween(x + 7, y - 7, x - 7, y + 7); g.strokeCircle(x - 6, y + 6, 3); g.strokeCircle(x + 6, y + 6, 3); }
        for (const c of this.engine.state.obstacles) { g.fillStyle(0x617b96); g.fillRoundedRect(17 + c.x * 22, 34 + c.y * 22, 18, 18, 4); }
        const apple = this.engine.state.apple;
        if (l.prey) { g.fillStyle(0xfff3a0, 0.3 + 0.2 * Math.sin(ticks / 6)); g.fillCircle(26 + apple.x * 22, 43 + apple.y * 22, 12); }
        g.fillStyle(l.prey ? 0xfff07a : 0xffb867); g.fillCircle(26 + apple.x * 22, 43 + apple.y * 22, 8 + this.glow * 2);
        g.lineStyle(2, 0xffffff); g.lineBetween(26 + apple.x * 22, 34 + apple.y * 22, 30 + apple.x * 22, 30 + apple.y * 22);
        const crystal = this.engine.state.crystal;
        if (crystal) {
            const x = 26 + crystal.x * 22, y = 43 + crystal.y * 22;
            g.fillStyle(0xbfa2ff); g.fillTriangle(x, y - 10, x - 8, y, x + 8, y); g.fillTriangle(x, y + 10, x - 8, y, x + 8, y);
        }
        // Paint tail first: an armed dodge can put the head on a body cell.
        [...this.engine.state.segments.entries()].reverse().forEach(([i, c]) => {
            const x = 17 + c.x * 22, y = 34 + c.y * 22;
            g.fillStyle(i === 0 ? 0xe5fff7 : 0x64e4cc, i === 0 ? 1 : 0.85); g.fillRoundedRect(x, y, 18, 18, i === 0 ? 7 : 5);
            if (i === 0) this.hero.draw(g, x - 4, y - 5, 26);
        });
        const timer = l.timeMs ? ` · ⏱ ${String(Math.ceil((this.engine.state.timeLeft ?? 0) / 1000))} s` : '';
        const ending = this.engine.status === 'lost' ? ({ wall: 'Mur !', obstacle: 'Rocher !', body: 'Corps !', gate: 'Écluse fermée !', patrol: 'Sentinelle !', time: 'Temps écoulé !', full: 'Plus de place !' })[this.engine.reason ?? 'wall'] : '';
        this.hud?.setText(`NIVEAU ${String(this.engine.level + 1)} · ${l.name.toUpperCase()} · ${d.walls ? 'MURS' : 'TORE'}\nÉTINCELLES ${String(this.engine.state.eaten)}/${String(d.goal)}    SCORE ${String(this.engine.state.score)}${timer}\nESQUIVE ${String(this.engine.specialUses)}/1${this.engine.specialArmed ? ' · prête' : ''} · ${ending || (crystal ? 'CRISTAL !' : levelTip(this.engine.level))}`);
        const status = document.querySelector('#status');
        if (status) status.textContent = `Score : ${String(this.engine.state.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
