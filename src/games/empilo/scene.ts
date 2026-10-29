import Phaser from 'phaser';
import { Engine, LEVELS, SHAPES, difficulty, emptyBoard, type Action, type Cell } from '../../engines/empilo/engine';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const empiloButtons: readonly TouchButton[] = [
    { id: 'empilo-left', label: '←', ariaLabel: 'Déplacer à gauche', size: 56, placement: 'left', mode: 'hold', repeatMs: 90 },
    { id: 'empilo-right', label: '→', ariaLabel: 'Déplacer à droite', size: 56, placement: 'left', mode: 'hold', repeatMs: 90 },
    { id: 'empilo-clockwise', label: '↻', ariaLabel: 'Tourner à droite', size: 56, placement: 'center', mode: 'tap' },
    { id: 'empilo-counterclockwise', label: '↺', ariaLabel: 'Tourner à gauche', size: 56, placement: 'center', mode: 'tap' },
    { id: 'empilo-soft', label: '↓', ariaLabel: 'Descente douce', size: 56, placement: 'right', mode: 'hold', repeatMs: 55 },
    { id: 'empilo-drop', label: '⤓', ariaLabel: 'Chute instantanée', size: 56, placement: 'right', mode: 'tap' },
];
export interface EmpiloHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'blocked'): void;
}
declare global { interface Window { __EMPILO_TEST__?: EmpiloHook } }
export class EmpiloScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'empilo', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private flash = 0;
    private lastPiece = '';
    constructor(private session = new PlaySession(true)) { super('empilo'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        document.body.classList.add('empilo');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('empilo'); delete window.__EMPILO_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(18, 582, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#e5f3ff', lineSpacing: 4 });
        const act = (action: Action): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            const before = this.engine.state.lines;
            if (this.engine.input(action)) { sound.playEffect(action === 'drop' ? 'drop' : action === 'soft' ? 'soft' : action.includes('clockwise') ? 'rotate' : 'move'); this.flash = action === 'drop' ? 0.5 : 0; }
            if (this.engine.state.lines > before) { sound.playEffect('clear'); this.flash = 1; }
        };
        renderTouchControls(this.inputs, empiloButtons, (id, held) => { if (held) act(id.replace('empilo-', '') as Action); });
        const keys: Record<string, Action> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', ArrowUp: 'clockwise', KeyX: 'clockwise', KeyW: 'clockwise', KeyZ: 'counterclockwise', KeyC: 'counterclockwise', Space: 'drop' };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent, action = keys[e.code];
            if (!action) return;
            e.preventDefault(); if (!e.repeat || ['left', 'right', 'soft'].includes(action)) act(action);
        });
        const area = document.querySelector<HTMLElement>('#game');
        let gesture: { id: number; x: number; y: number; time: number; moved: boolean; dropped: boolean } | null = null;
        this.inputs.on(area, 'pointerdown', event => {
            const e = event as PointerEvent; if (gesture) return;
            e.preventDefault(); area?.setPointerCapture(e.pointerId);
            gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now(), moved: false, dropped: false };
        });
        this.inputs.on(area, 'pointermove', event => {
            const e = event as PointerEvent; if (!gesture || e.pointerId !== gesture.id || gesture.dropped) return;
            const dx = e.clientX - gesture.x;
            if (e.clientY - gesture.y >= 60 && performance.now() - gesture.time < 350) { act('drop'); gesture.dropped = true; gesture.moved = true; return; }
            const steps = Math.floor(Math.abs(dx) / 30);
            for (let i = 0; i < steps; i++) act(dx > 0 ? 'right' : 'left');
            if (steps) { gesture.x += Math.sign(dx) * steps * 30; gesture.moved = true; }
        });
        this.inputs.on(area, 'pointerup', event => { if (gesture?.id === (event as PointerEvent).pointerId) { if (!gesture.moved) act('clockwise'); gesture = null; } });
        for (const type of ['pointercancel', 'lostpointercapture']) this.inputs.on(area, type, () => { gesture = null; });
        const choose = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Empilo : puits de cristaux, glisser pour déplacer, tap pour tourner');
        if (new URLSearchParams(location.search).get('test') === '1') window.__EMPILO_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                this.start(0, 456, true);
                const board = emptyBoard();
                if (name === 'finish') board[15] = [1, 1, 1, 0, 0, 0, 1, 1, 1];
                else board[0] = [1, 1, 1, 1, 1, 1, 1, 1, 0];
                this.engine.loadState({ ...this.engine.state, board, active: { id: 0, cells: structuredClone([...(SHAPES[0] ?? [])]), x: 3, y: name === 'finish' ? 4 : 14 }, lines: name === 'finish' ? 4 : 0, score: name === 'finish' ? 400 : 0 });
            },
        };
        this.scale.refresh(); this.panels(); this.draw();
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
        const before = this.engine.state.lines;
        if (!this.selecting) this.engine.step(delta);
        if (this.engine.state.lines > before) { sound.playEffect('clear'); this.flash = 1; }
        const piece = JSON.stringify(this.engine.state.active);
        if (piece !== this.lastPiece && this.engine.state.active.y === 0) sound.playEffect('lock');
        this.lastPiece = piece;
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'empilo'); sound.playEffect(this.engine.status);
        }
        this.flash = Math.max(0, this.flash - delta / 400);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    private crystal(c: Cell, color: number, alpha = 1, sealed = false): void {
        const g = this.graphics; if (!g) return;
        const x = 60 + c.x * 30, y = 49 + c.y * 30;
        g.fillStyle(color, alpha); g.fillTriangle(x, y - 13, x - 13, y, x + 13, y); g.fillTriangle(x, y + 13, x - 13, y, x + 13, y);
        g.lineStyle(1, 0xffffff, alpha * 0.7); g.lineBetween(x, y - 10, x - 8, y); g.lineBetween(x - 8, y, x, y + 9);
        if (sealed) { g.lineStyle(3, 0xffffff); g.strokeCircle(x, y, 5); }
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const colors = [0x80e9dc, 0xffc582, 0xe9a6d2, 0xaeb6ff, 0x91c9ff, 0xe1e992, 0xd29af2, 0x9de1ae];
        g.clear(); g.fillStyle(0x102637); g.fillRoundedRect(0, 0, 360, 640, 18);
        g.lineStyle(1, 0x244659);
        for (let x = 0; x <= 9; x++) g.lineBetween(45 + x * 30, 34, 45 + x * 30, 514);
        for (let y = 0; y <= 16; y++) g.lineBetween(45, 34 + y * 30, 315, 34 + y * 30);
        g.lineStyle(2, 0x80e9dc); g.strokeRect(44, 33, 272, 482);
        this.engine.state.board.forEach((row, y) => { row.forEach((v, x) => { if (v) this.crystal({ x, y }, v === 2 ? 0xc59ee9 : 0x6fa5b4, 1, v === 2); }); });
        const active = this.engine.state.active;
        const ghost = { ...active }; while (this.engine.fits({ ...ghost, y: ghost.y + 1 })) ghost.y++;
        if (this.engine.status === 'playing') {
            for (const c of ghost.cells) this.crystal({ x: c.x + ghost.x, y: c.y + ghost.y }, colors[active.id] ?? 0xffffff, 0.18);
            for (const c of active.cells) this.crystal({ x: c.x + active.x, y: c.y + active.y }, colors[active.id] ?? 0xffffff);
        }
        this.engine.state.next.forEach((id, i) => {
            for (const c of SHAPES[id] ?? []) {
                g.fillStyle(colors[id] ?? 0xffffff); const x = 22 + i * 108 + c.x * 16, y = 530 + c.y * 16;
                g.fillTriangle(x, y - 7, x - 7, y, x + 7, y); g.fillTriangle(x, y + 7, x - 7, y, x + 7, y);
            }
        });
        if (this.flash) { g.fillStyle(0xdefcff, this.flash * 0.16); g.fillRect(45, 34, 270, 480); }
        const d = difficulty(this.engine.level);
        this.hud?.setText(`STRATE ${String(this.engine.level + 1)} · ${d.gravity.toFixed(1)} cases/s\nLIGNES ${String(this.engine.state.lines)}/${String(d.goal)}   SCORE ${String(this.engine.state.score)}\n${this.engine.state.resets >= 15 ? 'Ancrage imminent' : 'Cristaux en formation'}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(this.engine.state.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
