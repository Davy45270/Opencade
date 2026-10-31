import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, SHAPES, BOMB, TILE, stratum, emptyBoard, type Action, type Cell } from '../../engines/empilo/engine';
import { strataTip } from '../../engines/empilo/tips';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const empiloButtons: readonly TouchButton[] = [
    { id: 'empilo-special', label: 'Réserve', ariaLabel: 'Mise de côté', size: 56, placement: 'right', mode: 'tap' },
    { id: 'empilo-left', label: '←', ariaLabel: 'Déplacer à gauche', size: 56, placement: 'left', mode: 'hold', repeatMs: 90 },
    { id: 'empilo-right', label: '→', ariaLabel: 'Déplacer à droite', size: 56, placement: 'left', mode: 'hold', repeatMs: 90 },
    { id: 'empilo-clockwise', label: '↻', ariaLabel: 'Tourner à droite', size: 56, placement: 'center', mode: 'tap' },
    { id: 'empilo-counterclockwise', label: '↺', ariaLabel: 'Tourner à gauche', size: 56, placement: 'center', mode: 'tap' },
    // Below 380 px the six primary buttons do not fit 56 px each: soft drop goes to the menu (swipe down still drops).
    { compactMenu: true, id: 'empilo-soft', label: '↓', ariaLabel: 'Descente douce', size: 56, placement: 'right', mode: 'hold', repeatMs: 55 },
    { id: 'empilo-drop', label: '⤓', ariaLabel: 'Chute instantanée', size: 56, placement: 'right', mode: 'tap' },
];
export interface EmpiloHook {
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']>; specialUses: number; specialTicks: number };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'blocked' | 'reserve'): void;
    /** What the last frame drew for the stratum rules (pass 402). */
    marks(): { previews: number; riseLeft: number | null; blast: { x: number; y: number; width: number } | null; belts: number };
}
declare global { interface Window { __EMPILO_TEST__?: EmpiloHook } }
export class EmpiloScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'empilo', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private flash = 0;
    private lastPiece = '';
    private drawn: ReturnType<EmpiloHook['marks']> = { previews: 0, riseLeft: null, blast: null, belts: 0 };
    constructor(private session = new PlaySession(true)) { super('empilo'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('empilo');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('empilo'); delete window.__EMPILO_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(18, 568, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 4 });
        const act = (action: Action): void => {
            if (this.session.state === 'ready') this.session.send('start');
            if (this.session.paused || this.selecting || this.engine.status !== 'playing') return;
            const before = this.engine.state.lines;
            if (action === 'left' || action === 'right') this.hero.move(action === 'left' ? -1 : 1);
            if (action === 'drop') this.hero.move(0, true);
            if (this.engine.input(action)) { sound.playEffect(action === 'drop' ? 'drop' : action === 'soft' ? 'soft' : action.includes('clockwise') ? 'rotate' : 'move'); this.flash = action === 'drop' ? 0.5 : 0; }
            if (this.engine.state.lines > before) { sound.playEffect('clear'); this.flash = 1; this.hero.animation = 'celebration'; this.hero.moving = 650; }
            this.landing();
        };
        renderTouchControls(this.inputs, empiloButtons, (id, held) => { if (held) act(id.replace('empilo-', '') as Action); });
        const keys: Record<string, Action> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', ArrowUp: 'clockwise', KeyX: 'clockwise', KeyW: 'clockwise', KeyZ: 'counterclockwise', KeyC: 'counterclockwise', Space: 'drop', ShiftLeft: 'special', KeyV: 'special' };
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
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.hero.time }),
            read: () => ({ fingerInput: { receipts: receipts(), paused: this.session.paused }, ...this.engine.snapshot(), character: this.hero.snapshot(), specialUses: this.engine.specialUses, specialTicks: this.engine.specialTicks, cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            marks: () => structuredClone(this.drawn),
            scenario: name => {
                this.start(0, 456, true);
                const board = emptyBoard();
                if (name === 'reserve') {
                    board[15] = [1, 1, 1, 0, 0, 0, 1, 1, 1];
                    const top = board[0]; if (top) top[6] = 1;
                    this.engine.loadState({ ...this.engine.state, board, reserve: 0, next: [7, 2, 3], lines: 4, active: { id: 1, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], x: 3, y: 8 } }); return;
                }
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
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const before = this.engine.state.lines;
        if (!this.session.paused && !this.selecting) this.engine.step(delta);
        if (this.engine.state.lines > before) { sound.playEffect('clear'); this.flash = 1; this.hero.animation = 'celebration'; this.hero.moving = 650; }
        this.landing();
        const piece = JSON.stringify(this.engine.state.active);
        if (piece !== this.lastPiece && this.engine.state.active.y === 0) sound.playEffect('lock');
        this.lastPiece = piece;
        if (this.engine.status === 'lost' && this.progress.state === 'playing') this.hero.impact = 500;
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialTicks > 0);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'empilo'); sound.playEffect(this.engine.status);
        }
        this.flash = Math.max(0, this.flash - delta / 400);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    /** Sounds and flashes for the last landing's mechanism events, once each. */
    private landing(): void {
        for (const event of this.engine.events) {
            if (event === 'bomb' || event === 'gem' || event === 'key' || event === 'rise') sound.playEffect(event);
            if (event === 'bomb' || event === 'key') this.flash = 1;
        }
        this.engine.events = [];
    }
    private crystal(c: Cell, color: number, alpha = 1, sealed = false): void {
        const g = this.graphics; if (!g) return;
        const x = 32 + c.x * 28, y = 48 + c.y * 28;
        g.fillStyle(color, alpha); g.fillTriangle(x, y - 13, x - 13, y, x + 13, y); g.fillTriangle(x, y + 13, x - 13, y, x + 13, y);
        g.lineStyle(1, 0xffffff, alpha * 0.7); g.lineBetween(x, y - 10, x - 8, y); g.lineBetween(x - 8, y, x, y + 9);
        if (sealed) { g.lineStyle(3, 0xffffff); g.strokeCircle(x, y, 5); }
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const colors = [0x80e9dc, 0xffc582, 0xe9a6d2, 0xaeb6ff, 0x91c9ff, 0xe1e992, 0xd29af2, 0x9de1ae, 0xff8a5c];
        g.clear(); g.fillStyle(0x102637); g.fillRoundedRect(0, 0, 360, 640, 18);
        g.lineStyle(1, 0x244659);
        for (let x = 0; x <= 9; x++) g.lineBetween(18 + x * 28, 34, 18 + x * 28, 482);
        for (let y = 0; y <= 16; y++) g.lineBetween(18, 34 + y * 28, 270, 34 + y * 28);
        g.lineStyle(2, 0x80e9dc); g.strokeRect(17, 33, 254, 450);
        const l = stratum(this.engine.level);
        this.drawn = { previews: 0, riseLeft: null, blast: null, belts: l.conveyors.length };
        // Conveyor rows: chevrons in the gutter on the side they push towards.
        for (const belt of l.conveyors) {
            const y = 48 + belt.y * 28, x = belt.direction > 0 ? 276 : 12;
            g.fillStyle(0x5fb3ff, 0.9); g.fillTriangle(x + belt.direction * 5, y, x - belt.direction * 4, y - 7, x - belt.direction * 4, y + 7);
            g.fillStyle(0x5fb3ff, 0.08); g.fillRect(18, 34 + belt.y * 28, 252, 28);
        }
        this.engine.state.board.forEach((row, y) => { row.forEach((v, x) => {
            if (!v) return;
            if (v === TILE.gem) { this.crystal({ x, y }, 0x6fa5b4); g.fillStyle(0xff5fa2); g.fillCircle(32 + x * 28, 48 + y * 28, 6); g.fillStyle(0xffffff, 0.8); g.fillCircle(30 + x * 28, 46 + y * 28, 2); return; }
            if (v === TILE.lock) { g.fillStyle(0x7b6a52); g.fillRoundedRect(20 + x * 28, 36 + y * 28, 24, 24, 4); g.lineStyle(2, 0xffd166); g.strokeCircle(32 + x * 28, 44 + y * 28, 5); g.fillStyle(0xffd166); g.fillRect(26 + x * 28, 46 + y * 28, 12, 9); return; }
            if (v === TILE.key) { this.crystal({ x, y }, 0x6fa5b4); g.lineStyle(3, 0xffd166); g.strokeCircle(28 + x * 28, 48 + y * 28, 4); g.lineBetween(32 + x * 28, 48 + y * 28, 40 + x * 28, 48 + y * 28); g.lineBetween(38 + x * 28, 48 + y * 28, 38 + x * 28, 52 + y * 28); return; }
            this.crystal({ x, y }, v === TILE.sealed ? 0xc59ee9 : 0x6fa5b4, 1, v === TILE.sealed);
        }); });
        if (l.rise) {
            const left = l.rise - ((this.engine.state.locked ?? 0) % l.rise); this.drawn.riseLeft = left;
            for (let i = 0; i < l.rise; i++) { g.fillStyle(i < left ? 0x3a5566 : 0xff8a5c); g.fillRect(18 + i * (252 / l.rise), 485, 252 / l.rise - 3, 5); }
        }
        const active = this.engine.state.active;
        const ghost = { ...active }; while (this.engine.fits({ ...ghost, y: ghost.y + 1 })) ghost.y++;
        if (this.engine.status === 'playing') {
            for (const c of ghost.cells) this.crystal({ x: c.x + ghost.x, y: c.y + ghost.y }, colors[active.id] ?? 0xffffff, 0.18);
            if (active.id === BOMB) {
                // Blast preview around the ghost, then the bomb itself.
                const blast = { x: 18 + (ghost.x - 1) * 28, y: 34 + (ghost.y - 1) * 28, width: 84 }; this.drawn.blast = blast;
                g.lineStyle(2, 0xff8a5c, 0.6); g.strokeRect(blast.x, blast.y, blast.width, blast.width);
                g.fillStyle(0x2b2b33); g.fillCircle(32 + active.x * 28, 48 + active.y * 28, 11); g.fillStyle(0xff8a5c); g.fillCircle(38 + active.x * 28, 40 + active.y * 28, 3);
            } else for (const c of active.cells) this.crystal({ x: c.x + active.x, y: c.y + active.y }, colors[active.id] ?? 0xffffff);
        }
        this.engine.state.next.slice(0, l.preview).forEach((id, i) => {
            this.drawn.previews++;
            for (const c of SHAPES[id] ?? []) {
                g.fillStyle(colors[id] ?? 0xffffff); const x = 22 + i * 108 + c.x * 16, y = 530 + c.y * 16;
                g.fillTriangle(x, y - 7, x - 7, y, x + 7, y); g.fillTriangle(x, y + 7, x - 7, y, x + 7, y);
            }
        });
        if (this.flash) { g.fillStyle(0xdefcff, this.flash * 0.16); g.fillRect(18, 34, 252, 448); }
        this.hero.draw(g, 274, 230, 84);
        if (this.engine.reserve !== null) for (const c of SHAPES[this.engine.reserve] ?? []) { g.fillStyle(colors[this.engine.reserve] ?? 0xffffff); g.fillRoundedRect(282 + c.x * 13, 370 + c.y * 13, 11, 11, 3); }
        const s = this.engine.state, goal = l.objective === 'gems' ? `GEMMES ${String(s.gems ?? 0)}/${String(l.goal)}` : `LIGNES ${String(s.lines)}/${String(l.goal)}`;
        const timer = l.timeMs ? ` · ⏱ ${String(Math.ceil((s.timeLeft ?? 0) / 1000))} s` : '';
        const ending = this.engine.status === 'lost' ? ({ top: 'Le puits déborde !', time: 'Temps écoulé !', rise: 'La marée déborde !' })[this.engine.reason ?? 'top'] + ' On réessaie ?' : this.engine.status === 'won' ? 'Bravo, strate terminée !' : s.resets >= 15 ? 'Ancrage imminent' : strataTip(this.engine.level);
        this.hud?.setText(`STRATE ${String(this.engine.level + 1)} · ${l.name.toUpperCase()} · ${l.gravity.toFixed(1)} c/s\n${goal}   SCORE ${String(s.score)}${timer}\nRÉSERVE ${String(this.engine.specialUses)}/1 · ${this.engine.reserve === null ? 'vide' : 'à droite'}\n${ending}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(this.engine.state.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
