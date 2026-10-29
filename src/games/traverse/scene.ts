import { swipeDirection } from '../../shell/gestures';
import Phaser from 'phaser';
import { Engine, LEVELS, filled, type Direction } from '../../engines/traverse/engine';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const traverseButtons: readonly TouchButton[] = [
    { id: 'traverse-left', label: '←', ariaLabel: 'Aller à gauche', size: 56, placement: 'left', mode: 'tap' },
    { id: 'traverse-up', label: '↑', ariaLabel: 'Monter', size: 56, placement: 'center', mode: 'tap' },
    { id: 'traverse-down', label: '↓', ariaLabel: 'Descendre', size: 56, placement: 'center', mode: 'tap' },
    { id: 'traverse-right', label: '→', ariaLabel: 'Aller à droite', size: 56, placement: 'right', mode: 'tap' },
];
export interface TraverseHook {
    bounds(): { hud: { x: number; y: number; width: number; height: number }; hero: { x: number; y: number; width: number; height: number } };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __TRAVERSE_TEST__?: TraverseHook } }
export class TraverseScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'traverse', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private heroBounds = { x: 0, y: 0, width: 24, height: 24 };
    
    constructor(private session = new PlaySession(true)) { super('traverse'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        document.body.classList.add('traverse');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('traverse'); delete window.__TRAVERSE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(10, 12, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#e5f3ff', lineSpacing: 8 });
        const direction = (value: Direction): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            this.engine.input(value); sound.playEffect('step');
        };
        renderTouchControls(this.inputs, traverseButtons, (id, held) => { if (held) direction(id.replace('traverse-', '') as Direction); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            let origin: { x: number; y: number; id: number } | null = null;
            this.inputs.on(area, 'pointerdown', event => {
                const e = event as PointerEvent;
                if (origin || this.session.paused || this.selecting) return;
                e.preventDefault(); area.setPointerCapture(e.pointerId);
                origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
            });
            this.inputs.on(area, 'pointerup', event => {
                const e = event as PointerEvent;
                if (!origin || e.pointerId !== origin.id) return;
                const d = swipeDirection(e.clientX - origin.x, e.clientY - origin.y, 20);
                origin = null; direction(d ?? 'up');
            });
            for (const type of ['pointercancel', 'lostpointercapture']) this.inputs.on(area, type, () => { origin = null; });
        }
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
        this.game.canvas.setAttribute('aria-label', 'Traverse : rejoindre les abris entre route et rivière');
        if (new URLSearchParams(location.search).get('test') === '1') window.__TRAVERSE_TEST__ = {
            bounds: () => { const h = this.hud?.getBounds(); return { hud: { x: h?.x ?? 0, y: h?.y ?? 0, width: h?.width ?? 0, height: h?.height ?? 0 }, hero: { ...this.heroBounds } }; },
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 9, y: 64, width: 342, height: 570 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
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
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const lives = this.engine.state.lives;
        if (!this.selecting && !this.session.paused) this.engine.step(delta);
        if (this.engine.state.lives < lives) sound.playEffect('life');
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
        g.clear(); g.fillStyle(0x101827); g.fillRect(0, 0, 360, 640);
        for (let y = 0; y < 15; y++) {
            const lane = this.engine.board.lanes.find(l => l.y === y);
            g.fillStyle(lane?.kind === 'river' ? 0x184f73 : lane ? 0x32394e : 0x235448);
            g.fillRect(9, 64 + y * 38, 342, 37);
            if (lane) for (let x = 0; x < 9; x++) if (filled(lane, x, s.phase, this.engine.level)) {
                g.fillStyle(lane.kind === 'road' ? 0xff876b : lane.diver ? 0x86bda3 : 0xc49b67);
                g.fillRoundedRect(11 + x * 38, 70 + y * 38, 34, 26, lane.kind === 'road' ? 5 : 10);
                if (lane.kind === 'road') { g.fillStyle(0x263449); g.fillRect(20 + x * 38, 73 + y * 38, 12, 16); }
            }
        }
        for (const x of this.engine.board.shelters) {
            g.fillStyle(s.occupied.includes(x) ? 0xffd479 : 0x64e4cc); g.fillRoundedRect(12 + x * 38, 67, 32, 32, 7);
        }
        // Short interpolation stays wholly inside the useful area, below the separate HUD.
        const blend = Math.min(1, this.engine.snapshot().frames / 4);
        const x = s.previous.x + (s.player.x - s.previous.x) * blend;
        const y = s.previous.y + (s.player.y - s.previous.y) * blend;
        this.heroBounds = { x: 16 + x * 38, y: 71 + y * 38, width: 24, height: 24 };
        g.fillStyle(0xfff1b8); g.fillRoundedRect(16 + x * 38, 71 + y * 38, 24, 24, 8);
        g.fillStyle(0x173947); g.fillCircle(23 + x * 38, 78 + y * 38, 3); g.fillCircle(33 + x * 38, 78 + y * 38, 3);
        const text = `TRAVERSE ${String(this.engine.level + 1)}/30 · SCORE ${String(s.score)}\nVIES ${String(s.lives)} · ${String(Math.ceil(s.time / 1000))} s · ABRIS ${String(s.occupied.length)}/${String(this.engine.board.shelters.length)}`;
        this.hud?.setText(text);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · ${text}`;
    }
}
