import { PlaySession } from '../../shell/pause';
import { bubbleButtons } from '../registry';
import Phaser from 'phaser';
import { sound } from '../../shell/services';
import { Inputs, renderTouchControls, keyboardControls } from '../../shell/input';
import { renderLevels } from '../../shell/levels';
import { renderPanels } from '../../shell/panels';
import { Engine, center, ORIGIN, ROW_STEP, LOSS_LINE, type Cell, type Color } from '../../engines/bubble/engine';
import { LEVELS } from '../../engines/bubble/levels';
import { Progression } from '../../shell/progression';
import { readSave, writeSave, type StoragePort } from '../../shell/storage';
const COLORS = [0x65e6ce, 0xffb867, 0xf080ab, 0x8ba6ff, 0xffef70, 0x70cfff];
interface Effect {
    cell: Cell;
    drops: number;
    age: number;
    fall: boolean;
}
export interface TestHook {
    load: (grid: Cell[], next?: Color, seed?: number) => void;
    setNext: (color: Color) => void;
    setSeed: (seed: number) => void;
    loadLevel: (index: number, seed?: number) => void;
    advance(ms: number): void;
    hudText(): string;
    visuals(): { guide: ReturnType<Engine['trace']>['segments']; falling: number };
    usefulArea(): { x: number; y: number; width: number; height: number };
    read: () => ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
}
declare global {
    interface Window {
        __BUBBLE_TEST__?: TestHook;
    }
}
export class LabScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression();
    private storage?: StoragePort;
    private selecting = false;
    private tapToShoot = false;
    private aimingPointer: number | null = null;
    private testManual = false;
    private testAdvancing = false;
    private inputs = new Inputs();
    private startLevel(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh);
        this.engine.loadLevel(index, seed);
        this.effects = [];
        this.selecting = false;
        this.syncPanels();
    }
    private syncPanels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
    }
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private effects: Effect[] = [];
    constructor(private session = new PlaySession(false)) {
        super('lab');
    }
    create(): void {
        try { this.storage = window.localStorage; } catch { /* Unavailable storage. */ }
        const cleanup = (): void => {
            this.inputs.dispose();
            sound.stop();
            delete window.__BUBBLE_TEST__;
        };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        renderTouchControls(this.inputs, bubbleButtons, (id, held) => {
            if (!held || this.selecting || this.session.paused) return;
            if (id === 'touch-fire') this.engine.shoot();
            else if (id === 'touch-swap') this.engine.swap();
            else if (id === 'touch-mode') {
                this.tapToShoot = !this.tapToShoot;
                document.querySelector('#touch-mode')?.setAttribute('aria-pressed', String(this.tapToShoot));
            }
            else this.engine.aim(this.engine.angle + (id === 'touch-left' ? -0.08 : 0.08));
        });
        this.progress = new Progression(readSave(this.storage), LEVELS.length);
        const showLevels = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.startLevel(index, undefined, true); });
            this.syncPanels();
        };
        this.inputs.on(document.querySelector('#levels'), 'click', showLevels);
        this.inputs.on(document.querySelector('#result-levels'), 'click', showLevels);
        this.inputs.on(document.querySelector('#close-levels'), 'click', showLevels);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => {
            if (this.progress.state === 'won') this.startLevel(this.engine.level + 1);
        });
        this.inputs.on(document.querySelector('#retry-level'), 'click', () => {
            this.progress.retry(); this.engine.restart(); this.effects = []; this.syncPanels();
        });
        this.inputs.on(document.querySelector('#replay-level'), 'click', () => {
            this.progress.retry(); this.engine.restart(); this.effects = []; this.syncPanels();
        });
        this.graphics = this.add.graphics();
        this.hud = this.add.text(18, 482, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#e5f3ff' });
        this.add.text(266, 612, 'SUIVANTE', { fontFamily: 'system-ui', fontSize: '11px', color: '#a6bdce' });
        const aim = (pointer: Phaser.Input.Pointer): void => {
            if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15)
                this.engine.aim(Math.atan2(pointer.x - ORIGIN.x, ORIGIN.y - pointer.y));
        };
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.wasTouch || this.aimingPointer === pointer.id) aim(pointer);
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.aimingPointer !== null) return;
            if (!this.session.paused && !this.selecting && pointer.wasTouch && !this.tapToShoot) {
                this.aimingPointer = pointer.id;
                aim(pointer);
            } else if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15) {
                aim(pointer);
                this.engine.shoot();
            }
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.aimingPointer !== pointer.id) return;
            this.aimingPointer = null;
            aim(pointer);
            if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15) this.engine.shoot();
        });
        this.input.on('pointerupoutside', () => { this.aimingPointer = null; });
        this.inputs.on(this.game.canvas, 'touchcancel', () => { this.aimingPointer = null; });
        keyboardControls(this.inputs, delta => { if (!this.session.paused && !this.selecting) this.engine.aim(this.engine.angle + delta); }, () => { if (!this.session.paused && !this.selecting) this.engine.shoot(); });
        this.inputs.on(document, 'keydown', (event: Event) => {
            if ((event as KeyboardEvent).code === 'KeyX' && !(event.target instanceof HTMLElement && event.target.closest('button')) && !this.session.paused && !this.selecting) this.engine.swap();
        });
        const restart = document.querySelector<HTMLButtonElement>('#restart');
        this.inputs.on(restart, 'click', () => {
            this.progress.retry();
            this.engine.restart();
            this.effects = [];
        });
        const canvas = this.game.canvas;
        canvas.setAttribute('aria-label', 'Aire de jeu Bubble Lab : glisser puis relâcher pour tirer ; souris : viser et cliquer');
        canvas.setAttribute('role', 'img');
        if (new URLSearchParams(location.search).get('test') === '1') {
            window.__BUBBLE_TEST__ = {
                advance: ms => { this.advanceTest(ms); },
                loadLevel: (index, seed) => { this.startLevel(index, seed, true); },
                load: (grid, next = 0, seed = this.engine.seed) => {
                    this.progress.retry();
                    this.engine.load(grid, next, seed);
                    this.effects = [];
                },
                setNext: (color) => {
                    this.engine.setNext(color);
                },
                setSeed: (seed) => {
                    this.engine.seed = seed;
                    this.progress.retry();
                    this.engine.restart();
                    this.effects = [];
                },
                hudText: () => this.hud?.text ?? '',
                visuals: () => ({ guide: this.guide(), falling: this.effects.filter(e => e.fall).length }),
                usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
                read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            };
        }
    }
    private guide(): ReturnType<Engine['trace']>['segments'] {
        return this.engine.status === 'playing' && !this.engine.flight ? this.engine.trace().segments.slice(0, 2) : [];
    }
    private bubble(x: number, y: number, color: Color, alpha = 1, scale = 1): void {
        const g = this.graphics;
        if (!g)
            return;
        g.fillStyle(0x020e1d, alpha * 0.4);
        g.fillCircle(x, y + 3, 19 * scale);
        g.fillStyle(COLORS[color] ?? 0xffffff, alpha);
        g.fillCircle(x, y, 18 * scale);
        g.lineStyle(1, 0xffffff, alpha * 0.45);
        g.strokeCircle(x, y, 16 * scale);
        g.fillStyle(0xffffff, alpha * 0.6);
        g.fillEllipse(x - 6 * scale, y - 7 * scale, 8 * scale, 5 * scale);
        // Distinct markings supplement color perception.
        g.lineStyle(2, 0x102438, alpha * 0.65);
        for (let i = 0; i <= color; i++)
            g.lineBetween(x - 5 + 3 * i, y + 4, x - 5 + 3 * i, y + 9);
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
                    for (const effect of this.effects) effect.age += delta;
                    this.effects = this.effects.filter(effect => effect.age < 650);
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
        const drops = this.engine.drops;
        const result = this.selecting ? null : this.engine.advance(delta);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(this.storage, this.progress.save);
        }
        if (!this.testAdvancing) this.syncPanels();
        if (result) {
            if (result.popped.length) sound.playEffect('pop', result.popped.length);
            if (result.fallen.length) sound.playEffect('fall', result.fallen.length);
            this.effects.push(...result.popped.map(cell => ({ cell, drops, age: 0, fall: false })), ...result.fallen.map(cell => ({ cell, drops, age: 0, fall: true })));
        }
        if (this.testAdvancing) return;
        const g = this.graphics;
        if (!g)
            return;
        g.clear();
        g.fillStyle(0x132438);
        g.fillRoundedRect(0, 0, 360, 640, 18);
        g.lineStyle(1, 0x24415a);
        for (let y = 20; y < 455; y += 35)
            g.lineBetween(5, y, 355, y);
        g.lineStyle(2, 0x64e4cc, 0.6);
        g.lineBetween(0, 0, 0, 455);
        g.lineBetween(359, 0, 359, 455);
        const ceiling = this.engine.drops * ROW_STEP;
        g.fillStyle(0x24415a, 0.75);
        g.fillRect(0, 0, 360, ceiling);
        g.lineBetween(0, ceiling + 1, 360, ceiling + 1);
        g.lineStyle(2, 0xf080ab, 0.65);
        for (let x = 4; x < 360; x += 16)
            g.lineBetween(x, LOSS_LINE, x + 8, LOSS_LINE);
        if (this.engine.status === 'playing' && !this.engine.flight) {
            g.lineStyle(2, 0xd7eaff, 0.4);
            for (const segment of this.guide()) {
                const length = Phaser.Math.Distance.BetweenPoints(segment.from, segment.to);
                for (let p = 0; p < length; p += 14) {
                    g.lineBetween(segment.from.x + segment.direction.x * p, segment.from.y + segment.direction.y * p, segment.from.x + segment.direction.x * Math.min(p + 5, length), segment.from.y + segment.direction.y * Math.min(p + 5, length));
                }
            }
        }
        for (const cell of this.engine.grid) {
            const p = center(cell, this.engine.drops);
            this.bubble(p.x, p.y, cell.color);
        }
        for (const effect of this.effects) {
            effect.age += delta;
            const t = effect.age / 650, p = center(effect.cell, effect.drops);
            this.bubble(p.x + (effect.fall ? Math.sin(t * 5) * 12 : 0), p.y + (effect.fall ? t * t * 250 : 0), effect.cell.color, Math.max(0, 1 - t), effect.fall ? 1 : 1 + t * 0.7);
        }
        this.effects = this.effects.filter(e => e.age < 650);
        g.fillStyle(0x24415a);
        g.fillCircle(ORIGIN.x, ORIGIN.y, 34);
        g.lineStyle(12, 0xa6bdce);
        g.lineBetween(ORIGIN.x, ORIGIN.y, ORIGIN.x + Math.sin(this.engine.angle) * 40, ORIGIN.y - Math.cos(this.engine.angle) * 40);
        if (!this.engine.flight)
            this.bubble(ORIGIN.x, ORIGIN.y, this.engine.next);
        const projectile = this.engine.projectile();
        if (projectile && this.engine.flight)
            this.bubble(projectile.x, projectile.y, this.engine.flight.color);
        this.bubble(300, 585, this.engine.queued, 0.9, 0.8);
        this.hud?.setText(`NIVEAU ${String(this.engine.level + 1)} · DESCENTE ${String(this.engine.shotsBeforeDrop ?? '—')}\nSCORE  ${String(this.engine.score)}\nTIRS     ${String(this.engine.shots)}`);
        const status = document.querySelector('#status');
        const text = `Score : ${String(this.engine.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
        if (status && status.textContent !== text)
            status.textContent = text;
    }
}
