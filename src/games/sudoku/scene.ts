import Phaser from 'phaser';
import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { SudokuGame, type Mode } from '../../engines/sudoku/game';
import { GRIDS, LEVELS } from '../../engines/sudoku/levels';
import { dailySeed } from '../../engines/sudoku/generator';
import { TECHNIQUE_NAMES } from '../../engines/sudoku/logic';
import { Inputs, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, readValue, writeSave, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { backdrop, bubble, drawActions, drawGrid, drawPad, hitTest, layout, starRow, PALETTE, type Layout, type Rect } from './art';
import { keyAction } from './controls';
/** Everything is played on the canvas (board, pad, Notes/Undo/Hint): no button under the thumbs. */
export const sudokuButtons: readonly TouchButton[] = [];
export const RUN_KEY = 'arcade-lab:sudoku:run:v1';
const COUNT = GRIDS.length;
type Tone = 'tip' | 'hint' | 'error' | 'win';
export interface SudokuHook {
    advance(ms: number): void;
    read(): ReturnType<SudokuGame['snapshot']> & { fingerInput: { down: boolean }; progression: string; cumulativeScore: number; unlocked: number; message: string; tone: Tone; character: ReturnType<GameCharacter['snapshot']> };
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    loadLevel(index: number, seed?: number): void;
    loadGenerated(mode: 'daily' | 'endless', seed: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    /** Logical centre of a cell, a pad key (0: eraser) or an action button: where a real finger is sent. */
    target(kind: 'cell' | 'pad' | 'action', what: number | string): { x: number; y: number };
    /** The proved solution of the grid on screen (test only: a real finger then types it). */
    solution(): number[];
    /** Every text box on the canvas and the box it must stay inside (logical units). */
    texts(): { name: string; box: Rect; limit: Rect }[];
}
declare global { interface Window { __SUDOKU_TEST__?: SudokuHook } }
const clock = (ms: number): string => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function today(): number { const d = new Date(); return dailySeed(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
export class SudokuScene extends Phaser.Scene {
    private engine = new SudokuGame();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'sudoku', COUNT), COUNT);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private down = false;
    private dirty = true;
    private endless = 1;
    private message = ''; private tone: Tone = 'tip';
    private cheerMs = 0; private saveMs = 0;
    private flashes: { cells: number[]; ms: number }[] = [];
    private winMs = 0;
    private layout: Layout = layout(4);
    /** The canvas fills the play area (Phaser RESIZE): layout from its current size. */
    private relayout(): void { this.layout = layout(this.engine.puzzle.size, this.scale.width, this.scale.height); this.dirty = true; }
    private sky?: Phaser.GameObjects.Image;
    private skyKey = '';
    private board?: Phaser.GameObjects.Graphics;
    private fx?: Phaser.GameObjects.Graphics;
    private title?: Phaser.GameObjects.Text;
    private stats?: Phaser.GameObjects.Text;
    private speech?: Phaser.GameObjects.Text;
    private labels: Phaser.GameObjects.Text[] = [];
    constructor(private session = new PlaySession(false)) { super('sudoku'); }
    private storage() { return browserStorage(); }
    private name(): string {
        if (this.engine.mode === 'daily') return 'Grille du jour';
        if (this.engine.mode === 'endless') return `Grille infinie n° ${String(this.endless)}`;
        return GRIDS[this.engine.level]?.title.fr ?? '';
    }
    private say(text: string, tone: Tone): void { this.message = text; this.tone = tone; this.dirty = true; }
    private opening(): void {
        const g = GRIDS[this.engine.level];
        if (this.engine.mode === 'classic' && g) this.say(g.tip, 'tip');
        else this.say(this.engine.mode === 'daily' ? 'La grille du jour : la même pour tout le monde aujourd\'hui.' : 'Une nouvelle grille, prouvée à solution unique.', 'tip');
    }
    private fresh(): void { this.relayout(); this.flashes = []; this.winMs = 0; this.selecting = false; this.opening(); this.persist(); this.sync(); }
    private start(index: number, fresh = false): void { this.progress.start(index, fresh); this.engine.loadLevel(index); this.fresh(); }
    private generated(mode: Exclude<Mode, 'classic'>, seed: number): void {
        this.progress.start(this.engine.mode === 'classic' ? this.engine.level : 0, false);
        if (mode === 'endless') this.endless = seed;
        this.engine.loadGenerated(mode, mode === 'endless' ? 7919 * seed : seed); this.fresh();
    }
    private persist(): void {
        writeValue(this.storage(), RUN_KEY, JSON.stringify({ version: 1, mode: this.engine.mode, level: this.engine.level, seed: this.engine.seed, endless: this.endless, state: this.engine.state }));
    }
    private resumeRun(): boolean {
        try {
            const run = JSON.parse(readValue(this.storage(), RUN_KEY) ?? 'null') as { mode?: unknown; level?: unknown; seed?: unknown; endless?: unknown; state?: unknown } | null;
            if (!run) return false;
            if (typeof run.endless === 'number' && Number.isSafeInteger(run.endless) && run.endless >= 1) this.endless = run.endless;
            if (run.mode === 'classic' && typeof run.level === 'number' && Number.isInteger(run.level) && run.level >= 0 && run.level < Math.min(COUNT, this.progress.save.unlocked)) {
                this.engine.loadLevel(run.level); this.progress.start(run.level, true);
            } else if (run.mode === 'daily' && run.seed === today()) this.engine.loadGenerated('daily', today());
            else if (run.mode === 'endless' && typeof run.seed === 'number' && run.seed === 7919 * this.endless) this.engine.loadGenerated('endless', run.seed);
            else return false;
            if (!this.engine.resume(run.state)) this.engine.restart();
            return true;
        } catch { return false; }
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('sudoku');
        // The clock is saved every 5 s while playing, and once more when the page goes away.
        const hide = (): void => { if (this.engine.status === 'playing') this.persist(); };
        window.addEventListener('pagehide', hide);
        const cleanup = (): void => { this.inputs.dispose(); window.removeEventListener('pagehide', hide); document.body.classList.remove('sudoku'); delete window.__SUDOKU_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.sky = this.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(0);
        const resized = (): void => { this.relayout(); this.draw(); };
        this.scale.on('resize', resized);
        this.events.once('shutdown', () => { this.scale.off('resize', resized); });
        this.board = this.add.graphics().setDepth(1);
        this.fx = this.add.graphics().setDepth(3);
        // Canvas texts use the page's own font: whatever font the device substitutes, fit() keeps every text in its box.
        const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
        const text = (size: number, color: string, bold = false) => this.add.text(0, 0, '', { fontFamily: family, fontSize: `${String(size)}px`, color, fontStyle: bold ? 'bold' : 'normal' }).setDepth(2);
        this.title = text(17, '#1e2a5a', true);
        this.stats = text(14, '#3b3f6b');
        this.speech = text(13, '#1e2a5a');
        this.labels = ['Notes', 'Annuler', 'Indice'].map(() => text(15, '#1e2a5a', true));
        if (this.resumeRun()) { this.relayout(); this.opening(); this.sync(); }
        else this.start(Math.min(COUNT, this.progress.save.unlocked) - 1, true);
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.tap(p.x, p.y); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            this.inputs.on(area, 'pointerdown', () => { this.down = true; });
            for (const type of ['pointerup', 'pointercancel']) this.inputs.on(area, type, () => { this.down = false; });
        }
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (this.session.paused || this.selecting) return;
            const target = e.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
            const a = keyAction(e, this.engine.puzzle.size);
            if (!a) return;
            e.preventDefault();
            if (a.type === 'move') this.engine.move(a.dx, a.dy);
            else if (a.type === 'deselect') this.engine.select(null);
            else if (e.repeat) return;
            else if (a.type === 'digit') this.engine.input(a.value, a.note || this.engine.notesMode);
            else if (a.type === 'erase') this.engine.erase();
            else if (a.type === 'notes') this.engine.toggleNotes();
            else if (a.type === 'undo') this.engine.undo();
            else this.engine.hint();
            this.after(a.type === 'notes' ? 'notes' : 'action');
        });
        const choose = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.start(index, true); });
            // Free play after the written grids: the daily grid and endless grids, both generated and proved unique.
            const list = document.querySelector('#level-list');
            for (const [label, act] of [['★ Grille du jour', () => { this.generated('daily', today()); }], ['∞ Grille infinie', () => { this.generated('endless', this.endless); }]] as const) {
                const button = document.createElement('button'); button.textContent = label; button.className = 'sudoku-free';
                button.addEventListener('click', act); list?.append(button);
            }
            this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => {
            if (this.engine.mode === 'endless' && this.engine.status === 'won') this.generated('endless', this.endless + 1);
            else if (this.engine.mode === 'classic' && this.progress.state === 'won') this.start(this.engine.level + 1);
        });
        const retry = (): void => { this.progress.retry(); this.engine.restart(); this.fresh(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Sudoku : remplir la grille, chaque chiffre une fois par ligne, colonne et bloc');
        if (new URLSearchParams(location.search).get('test') === '1') window.__SUDOKU_TEST__ = {
            ...fingerProof,
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.testManual = true;
                const step = 1000 / 60;
                for (let i = 0; i < Math.ceil(ms / step); i++) this.tick(Math.min(step, ms - i * step));
                this.draw();
            },
            fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), fingerInput: { down: this.down }, progression: this.progress.state, cumulativeScore: this.progress.total, unlocked: this.progress.save.unlocked, message: this.message, tone: this.tone, character: this.hero.snapshot() }),
            loadLevel: (index, seed) => { this.testManual = false; this.start(index, true); if (seed !== undefined) this.engine.seed = seed; },
            loadGenerated: (mode, seed) => { this.generated(mode, seed); },
            hudText: () => `${this.title?.text ?? ''}\n${this.stats?.text ?? ''}`,
            usefulArea: () => ({ x: 0, y: 0, width: this.scale.width, height: this.scale.height }),
            target: (kind, what) => {
                const l = this.layout;
                if (kind === 'cell') { const i = Number(what); return { x: l.grid.x + (i % l.size + .5) * l.grid.cell, y: l.grid.y + (Math.floor(i / l.size) + .5) * l.grid.cell }; }
                const r: Rect | undefined = kind === 'pad' ? l.pad.find(k => k.value === Number(what)) : l.actions.find(a => a.id === what);
                if (!r) throw new RangeError('Cible absente');
                return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
            },
            solution: () => [...this.engine.puzzle.solution],
            texts: () => {
                const box = (t?: Phaser.GameObjects.Text): Rect => t ? { x: t.x, y: t.y, w: t.displayWidth, h: t.displayHeight } : { x: 0, y: 0, w: 0, h: 0 };
                const l = this.layout;
                return [
                    { name: 'title', box: box(this.title), limit: { x: l.hud.x, y: l.hud.y, w: l.hud.w - 70, h: 30 } },
                    { name: 'stats', box: box(this.stats), limit: { x: l.hud.x, y: l.hud.y + 28, w: l.hud.w - 152, h: 30 } },
                    { name: 'speech', box: box(this.speech), limit: { x: l.bubble.x + 4, y: l.bubble.y + 2, w: l.bubble.w - 8, h: l.bubble.h - 4 } },
                    ...this.labels.map((t, k) => { const a = l.actions[k] ?? { x: 0, y: 0, w: 0, h: 0 }; return { name: `action-${String(k)}`, box: box(t), limit: { x: a.x + 40, y: a.y + 4, w: a.w - 44, h: a.h - 4 } }; }),
                ];
            },
        };
    }
    private tap(x: number, y: number): void {
        if (this.session.paused || this.selecting) return;
        const hit = hitTest(this.layout, x, y);
        if (!hit) return;
        if (hit.kind === 'cell') {
            if (!this.engine.select(hit.index)) return;
            this.after('select'); return;
        }
        if (hit.kind === 'pad') { if (hit.value === 0) this.engine.erase(); else this.engine.input(hit.value); this.after('action'); return; }
        if (hit.id === 'notes') { this.engine.toggleNotes(); this.after('notes'); return; }
        if (hit.id === 'undo') this.engine.undo(); else this.engine.hint();
        this.after('action');
    }
    /** After an input: sounds, the companion's line, animations, save; the board is redrawn. */
    private after(kind: 'select' | 'action' | 'notes'): void {
        this.dirty = true;
        if (kind === 'notes') { this.say(this.engine.notesMode ? 'Mode notes : les chiffres touchés se notent dans la case, sans être joués.' : 'Mode notes coupé : les chiffres se jouent.', 'tip'); sound.playEffect('note'); this.sync(); return; }
        const events = this.engine.events.map(e => e.type), snap = this.engine.state;
        if (kind === 'select') { sound.playEffect('select'); this.sync(); return; }
        if (!events.length) {
            if (this.engine.refused === 'select') this.say('Touchez d\'abord une case de la grille.', 'tip');
            else if (this.engine.refused === 'given') this.say('Ce chiffre est donné par la grille : il ne bouge pas.', 'tip');
            else if (this.engine.refused === 'nothing' && this.engine.status === 'playing') this.say('Rien à annuler pour l\'instant.', 'tip');
            this.sync(); return;
        }
        if (events.includes('hint') && snap.hint) {
            const h = snap.hint, how = h.technique ? ` (${TECHNIQUE_NAMES[h.technique].fr})` : '';
            this.say(h.lines.join(' ') + (h.kind === 'logic' && h.value ? ` → ${String(h.value)}${how}` : ''), h.kind === 'conflict' || h.kind === 'wrong' ? 'error' : 'hint');
            this.cheerMs = 900; sound.playEffect('hint');
        } else if (events.includes('conflict')) {
            const clash = this.engine.snapshot().conflicts.length;
            this.say(`Oups : ce chiffre est déjà dans la ligne, la colonne ou le bloc (${String(clash)} cases hachurées).`, 'error');
            this.hero.impact = 450; sound.playEffect('conflict');
        } else if (events.includes('undo')) { this.say('Annulé.', 'tip'); sound.playEffect('undo'); }
        else if (events.includes('cleared')) sound.playEffect('erase');
        else if (events.includes('note')) sound.playEffect('note');
        else if (events.includes('value')) {
            sound.playEffect('value');
            if (this.tone === 'error' || this.tone === 'hint') this.say('Bien joué.', 'tip');
        }
        const units = this.engine.events.filter(e => e.type === 'unit').map(e => e.payload as number);
        if (units.length && !events.includes('won')) {
            const t = this.engine.puzzle.size;
            this.flashes.push({ cells: units.flatMap(u => Array.from({ length: t }, (_, k) => u < t ? u * t + k : u < 2 * t ? k * t + (u - t) : -1)).filter(i => i >= 0), ms: 600 });
            this.cheerMs = 700; sound.playEffect('unit');
        }
        if (events.includes('won')) this.won();
        this.persist(); this.sync();
    }
    private won(): void {
        const s = this.engine.snapshot();
        if (this.engine.mode === 'classic' && this.progress.state === 'playing') { this.progress.finish('won', s.score); writeSave(this.storage(), this.progress.save, 'sudoku'); }
        this.winMs = 1600; sound.playEffect('won');
        this.say(`Bravo ! Grille terminée en ${clock(s.elapsedMs)}, ${String(s.stars)} étoile${s.stars > 1 ? 's' : ''}.`, 'win');
    }
    private panels(): void {
        const s = this.engine.snapshot(), classic = this.engine.mode === 'classic';
        renderPanels(this.engine.status, classic ? this.progress.state : 'won', this.engine.level, s.score, this.progress.total, this.selecting);
        const title = document.querySelector('#result-title'), scores = document.querySelector('#result-scores'), next = document.querySelector<HTMLButtonElement>('#next-level');
        if (this.engine.status !== 'won') { if (next) next.textContent = 'Niveau suivant'; return; }
        if (title && !classic) title.textContent = this.engine.mode === 'daily' ? 'Grille du jour réussie !' : 'Grille réussie !';
        if (scores) scores.textContent = `${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)} · Temps ${clock(s.elapsedMs)} · Erreurs ${String(s.mistakes)} · Indices ${String(s.hintsUsed)} · Score ${String(s.score)}${classic ? ` · Cumulé ${String(this.progress.total)}` : ''}`;
        if (next) { next.textContent = this.engine.mode === 'endless' ? 'Grille suivante' : 'Niveau suivant'; next.hidden = this.engine.mode === 'daily' || (classic && this.progress.state !== 'won'); }
    }
    private sync(): void { this.panels(); this.draw(); }
    updatePaused(): void { this.draw(); }
    // Phaser smooths its delta towards 1/60 s: on a slow phone (or a throttled tab) the clock would lag behind the
    // wall. The chrono runs on the real time between two frames, capped at 1 s so a hidden page does not count.
    private lastFrame: number | null = null;
    update(): void {
        const now = performance.now(), wall = this.lastFrame === null ? 0 : Math.min(now - this.lastFrame, 1000);
        this.lastFrame = now;
        this.tick(this.testManual ? 0 : wall);
    }
    private tick(delta: number): void {
        const paused = this.session.paused || this.selecting;
        if (!paused) {
            const before = Math.floor(this.engine.state.elapsedMs / 1000);
            this.engine.advance(delta);
            if (Math.floor(this.engine.state.elapsedMs / 1000) !== before) this.stamp();
            this.saveMs += delta; if (this.saveMs >= 5000) { this.saveMs = 0; this.persist(); }
            this.cheerMs = Math.max(0, this.cheerMs - delta); this.winMs = Math.max(0, this.winMs - delta);
            for (const f of this.flashes) f.ms -= delta;
            this.flashes = this.flashes.filter(f => f.ms > 0);
        }
        this.hero.advance(delta, paused, this.engine.status, false);
        if (this.cheerMs > 0 && this.engine.status === 'playing' && !paused) { this.hero.expression = 'joie'; this.hero.animation = 'celebration'; }
        this.drawFx();
    }
    /** HUD lines: title on the first, clock and counters on the second (stars drawn beside). */
    private stamp(): void {
        const s = this.engine.state, place = this.engine.mode === 'classic' ? ` · ${String(this.engine.level + 1)}/${String(COUNT)}` : '';
        this.title?.setText(`SUDOKU${place} · ${this.name()}`);
        this.stats?.setText(`⏱ ${clock(s.elapsedMs)} · Erreurs ${String(s.mistakes)} · Indices ${String(s.hintsUsed)}`);
        const hud = this.layout.hud;
        fit(this.title, hud.w - 74, 28, [18, 17, 16, 15, 14, 13]); fit(this.stats, hud.w - 156, 26, [15, 14, 13, 12, 11]);
        this.title?.setPosition(hud.x + 4, hud.y + 14 - (this.title.displayHeight / 2));
        this.stats?.setPosition(hud.x + 4, hud.y + 43 - (this.stats.displayHeight / 2));
        const status = document.querySelector('#status');
        if (status) status.textContent = `${this.title?.text ?? ''}. ${this.stats?.text ?? ''}. ${this.message}`;
    }
    private draw(): void {
        const w = Math.max(1, Math.round(this.scale.width)), h = Math.max(1, Math.round(this.scale.height)), key = `sudoku-sky-${String(w)}x${String(h)}`;
        if (this.sky && key !== this.skyKey) {
            // Static sky baked once per canvas size: one image per frame, never hundreds of dots.
            this.skyKey = key;
            if (!this.textures.exists(key)) { const sg = this.make.graphics({}, false); backdrop(sg, w, h); sg.generateTexture(key, w, h); sg.destroy(); }
            this.sky.setTexture(key);
        }
        if (this.dirty && this.board) {
            this.dirty = false;
            const g = this.board, l = this.layout, s = this.engine.snapshot(), hint = this.engine.state.hint;
            g.clear();
            bubble(g, l, this.tone);
            drawGrid(g, l, { size: l.size, boxRows: this.engine.puzzle.boxRows, boxCols: this.engine.puzzle.boxCols, givens: s.givens, values: s.values, notes: s.notes, selected: s.selectedIndex, conflicts: s.conflicts, hintCells: hint ? hint.cells : [] });
            drawPad(g, l, this.engine.counts(), this.engine.notesMode);
            drawActions(g, l, this.engine.notesMode, s.history > 0);
            starRow(g, l.hud.x + l.hud.w - 140, l.hud.y + 43, 8, s.stars);
            this.speech?.setText(this.message).setWordWrapWidth(l.bubble.w - 24);
            fit(this.speech, l.bubble.w - 24, l.bubble.h - 8, [15, 14, 13, 12, 11, 10]);
            this.speech?.setPosition(l.bubble.x + 12, l.bubble.y + l.bubble.h / 2 - this.speech.displayHeight / 2);
            this.labels.forEach((t, k) => {
                const a = l.actions[k]; if (!a) return;
                t.setText(k === 0 ? (this.engine.notesMode ? 'Notes ✓' : 'Notes') : k === 1 ? 'Annuler' : 'Indice');
                fit(t, a.w - 48, 22, [15, 14, 13, 12]);
                t.setPosition(a.x + 42, a.y + a.h / 2 - t.displayHeight / 2 + (k === 0 && this.engine.notesMode ? 3 : 0));
            });
            this.stamp();
        }
        this.drawFx();
    }
    /** Every frame: the companion, unit flashes and the victory sparkle (none with reduced motion). */
    private drawFx(): void {
        const g = this.fx; if (!g) return;
        g.clear();
        const l = this.layout, h = l.hero, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.hero.draw(g, h.x, h.y, h.w);
        if (reduced) return;
        for (const f of this.flashes) for (const i of f.cells) {
            g.fillStyle(PALETTE.done, .35 * f.ms / 600);
            g.fillRect(l.grid.x + i % l.size * l.grid.cell, l.grid.y + Math.floor(i / l.size) * l.grid.cell, l.grid.cell, l.grid.cell);
        }
        if (this.winMs > 0) {
            const t = 1 - this.winMs / 1600, cx = l.grid.x + l.grid.w / 2, cy = l.grid.y + l.grid.h / 2;
            for (let k = 0; k < 12; k++) {
                const a = k * Math.PI / 6 + t * 2, r = 40 + t * l.grid.w * .55;
                g.fillStyle([0xffc928, 0xee5fa7, 0x43b23f, 0x2f8be6][k % 4] ?? 0xffc928, 1 - t);
                g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 7 * (1 - t) + 2);
            }
        }
    }
}
/** Largest listed font size whose text fits the box; scaled down below the smallest (a wider font never overflows). */
function fit(t: Phaser.GameObjects.Text | undefined, w: number, h: number, sizes: readonly number[]): void {
    if (!t) return;
    t.setScale(1);
    for (const size of sizes) { t.setFontSize(size); if (t.width <= w && t.height <= h) return; }
    t.setScale(Math.min(1, w / Math.max(1, t.width), h / Math.max(1, t.height)));
}
