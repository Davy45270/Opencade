import Phaser from 'phaser';
import { Engine, LEVELS, difficulty, type Direction } from '../../engines/serpentin/engine';
import { Inputs, renderTouchControls, directionalSwipe, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const serpentinButtons: readonly TouchButton[] = [
    { id: 'serpentin-left', label: '←', ariaLabel: 'Aller à gauche', size: 56, placement: 'left', mode: 'tap' },
    { id: 'serpentin-up', label: '↑', ariaLabel: 'Monter', size: 56, placement: 'center', mode: 'tap' },
    { id: 'serpentin-down', label: '↓', ariaLabel: 'Descendre', size: 56, placement: 'center', mode: 'tap' },
    { id: 'serpentin-right', label: '→', ariaLabel: 'Aller à droite', size: 56, placement: 'right', mode: 'tap' },
];
export interface SerpentinHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'wall'): void;
}
declare global { interface Window { __SERPENTIN_TEST__?: SerpentinHook } }
export class SerpentinScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'serpentin', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private glow = 0;
    constructor(private session = new PlaySession(true)) { super('serpentin'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        document.body.classList.add('serpentin');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('serpentin'); delete window.__SERPENTIN_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(15, 548, '', { fontFamily: 'system-ui', fontSize: '17px', color: '#e5f3ff', lineSpacing: 8 });
        const direction = (value: Direction): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            const before = this.engine.snapshot().queue.length;
            this.engine.input(value);
            if (this.engine.snapshot().queue.length > before) sound.playEffect('turn');
        };
        renderTouchControls(this.inputs, serpentinButtons, (id, held) => { if (held) direction(id.replace('serpentin-', '') as Direction); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) directionalSwipe(this.inputs, area, direction, 20, true);
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right' };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            const value = keys[e.code];
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
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                this.start(0, 454, true);
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
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const before = this.engine.state.score;
        if (!this.selecting) this.engine.step(delta);
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
        g.clear(); g.fillStyle(0x132438); g.fillRoundedRect(0, 0, 360, 640, 18);
        g.lineStyle(1, 0x24415a);
        for (let x = 0; x <= 15; x++) g.lineBetween(15 + x * 22, 32, 15 + x * 22, 494);
        for (let y = 0; y <= 21; y++) g.lineBetween(15, 32 + y * 22, 345, 32 + y * 22);
        const d = difficulty(this.engine.level);
        g.lineStyle(3, d.walls ? 0xffb867 : 0x70cfff); g.strokeRect(14, 31, 332, 464);
        for (const c of this.engine.state.obstacles) { g.fillStyle(0x617b96); g.fillRoundedRect(17 + c.x * 22, 34 + c.y * 22, 18, 18, 4); }
        const apple = this.engine.state.apple;
        g.fillStyle(0xffb867); g.fillCircle(26 + apple.x * 22, 43 + apple.y * 22, 8 + this.glow * 2);
        g.lineStyle(2, 0xffffff); g.lineBetween(26 + apple.x * 22, 34 + apple.y * 22, 30 + apple.x * 22, 30 + apple.y * 22);
        const crystal = this.engine.state.crystal;
        if (crystal) {
            const x = 26 + crystal.x * 22, y = 43 + crystal.y * 22;
            g.fillStyle(0xbfa2ff); g.fillTriangle(x, y - 10, x - 8, y, x + 8, y); g.fillTriangle(x, y + 10, x - 8, y, x + 8, y);
        }
        this.engine.state.segments.forEach((c, i) => {
            const x = 17 + c.x * 22, y = 34 + c.y * 22;
            g.fillStyle(i === 0 ? 0xe5fff7 : 0x64e4cc, i === 0 ? 1 : 0.85); g.fillRoundedRect(x, y, 18, 18, i === 0 ? 7 : 5);
            if (i === 0) { g.fillStyle(0x102532); g.fillCircle(x + 6, y + 6, 2); g.fillCircle(x + 12, y + 6, 2); }
        });
        this.hud?.setText(`NIVEAU ${String(this.engine.level + 1)} · ${d.walls ? 'MURS' : 'TORE'}\nÉTINCELLES ${String(this.engine.state.eaten)}/${String(d.goal)}    SCORE ${String(this.engine.state.score)}\n${d.speed.toFixed(1)} pas/s${crystal ? ' · CRISTAL !' : ' · Suivez la lumière'}`);
        const status = document.querySelector('#status');
        if (status) status.textContent = `Score : ${String(this.engine.state.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
