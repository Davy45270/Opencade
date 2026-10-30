import Phaser from 'phaser';
import { Random } from '../../engines/shared/random';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { Engine, greedyMove, type Mode, type Tool, type State } from '../../engines/gourmandises/engine';
import { GAME_NAME, LEVELS } from '../../engines/gourmandises/levels';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { drawPiece } from './thumbnail';
import { drawDrop, drawIce, boardLayout, presentation, drawScenery, drawTool, card, WORLDS } from './presentation';
export const gourmandisesButtons: readonly TouchButton[] = [
    { id: 'gourmandises-hammer', label: '', ariaLabel: 'Marteau : une case', size: 56, placement: 'center', mode: 'tap' },
    { id: 'gourmandises-rocket', label: '', ariaLabel: 'Fusée : une ligne', size: 56, placement: 'center', mode: 'tap' },
    { id: 'gourmandises-rainbow', label: '', ariaLabel: 'Arc-en-ciel : une couleur', size: 56, placement: 'center', mode: 'tap' },
];
const MODE_KEY = 'arcade-lab:gourmandises:mode:v1';
const RUN_KEY = 'arcade-lab:gourmandises:run:v1';
export interface GourmandisesHook {
    read(): State & { armedTool: Tool | null; stars: number; characterView: ReturnType<GameCharacter['snapshot']> };
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'loss' | 'drop'): [number, number] | null;
    bestMove(): [number, number] | null;
    board(): { x: number; y: number; unit: number; width: number; height: number };
}
declare global { interface Window { __GOURMANDISES_TEST__?: GourmandisesHook } }
export class GourmandisesScene extends Phaser.Scene {
    private hero = new GameCharacter(selectedCharacter());
    private engine = new Engine(readValue(browserStorage(), MODE_KEY) === 'arcade' ? 'arcade' : 'discovery', this.hero.id);
    private progress = new Progression(readSave(browserStorage(), 'gourmandises', LEVELS.length), LEVELS.length);
    private inputs = new Inputs();
    private selecting = false;
    private ready = true;
    private selected = -1;
    private cursor = 0;
    private tool: Tool | null = null;
    private animation = 0;
    private falls = new Map<number, number>();
    private deliveries: { from: number; to: number }[] = [];
    private combo = 0;
    private shake = false;
    private burstColors: number[] = [];
    private particles: { x: number; y: number; color: number }[] = [];
    private graphics?: Phaser.GameObjects.Graphics;
    private texture?: Phaser.Textures.CanvasTexture;
    private scenery?: HTMLCanvasElement;
    private sceneryWorld = -1;
    private reducedMotion = false;
    private hud?: Phaser.GameObjects.Text;
    private modeButton?: HTMLButtonElement;
    private down: { index: number; x: number; y: number } | null = null;
    constructor(private session = new PlaySession(false)) { super('gourmandises'); }
    private board() {
        const s = this.engine.state;
        return boardLayout(s.width, s.height);
    }
    private panels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting);
    }
    private start(index: number, seed?: number, fresh = false): void {
        this.ready = false;
        const pausePanel = document.querySelector<HTMLElement>('#pause-panel');
        if (pausePanel) pausePanel.hidden = true;
        this.progress.start(index, fresh);
        this.engine.loadLevel(index, seed, this.engine.state.mode, this.hero.id);
        this.cursor = this.engine.state.cells.findIndex(cell => cell.piece);
        this.selected = -1;
        this.tool = null;
        this.selecting = false;
        this.animation = 0;
        this.sync();
    }
    private blocked(): boolean { return this.ready || this.session.paused || this.selecting || this.animation > 0; }
    private act(a: number, b: number): void {
        if (this.blocked()) return;
        this.burstColors = this.engine.state.cells.map(cell => cell.piece?.color ?? 0);
        this.shake = this.engine.state.cells[a]?.piece?.special === 'color'
            && this.engine.state.cells[b]?.piece?.special === 'color';
        this.engine.swap(a, b);
        this.selected = -1;
        this.feedback();
    }
    private choose(i: number): void {
        const cell = this.engine.state.cells[i];
        if (this.blocked() || !cell?.active || (!cell.piece && !this.tool)) return;
        this.engine.state.idle = 0;
        this.cursor = i;
        if (this.tool) {
            this.burstColors = this.engine.state.cells.map(cell => cell.piece?.color ?? 0);
            this.shake = false;
            this.engine.useTool(this.tool, i);
            this.tool = null;
            this.feedback();
        } else if (this.selected >= 0 && this.engine.adjacent(this.selected, i)) this.act(this.selected, i);
        else this.selected = i;
    }
    private feedback(): void {
        const board = this.board();
        this.particles = [];
        this.falls.clear();
        this.deliveries = [];
        const cargo = new Map<number, number>();
        for (const event of this.engine.events) {
            if (['swap', 'refused', 'match', 'special', 'cascade', 'obstacle'].includes(event.type)) sound.playEffect(event.type, event.multiplier);
            if ((event.type === 'fall' || event.type === 'fill') && event.from !== undefined && event.to !== undefined) {
                this.falls.set(event.to, (event.to - event.from) / this.engine.state.width);
                if (event.piece?.drop) {
                    const origin = cargo.get(event.from) ?? event.from;
                    cargo.delete(event.from);
                    cargo.set(event.to, origin);
                }
            }
            if (event.type === 'drop') {
                for (const to of event.cells) {
                    this.deliveries.push({ from: cargo.get(to) ?? to, to });
                    cargo.delete(to);
                }
            }
            if (event.type === 'match') {
                for (const i of event.cells) this.particles.push({
                    x: board.x + (i % this.engine.state.width + 0.5) * board.unit,
                    y: board.y + (Math.floor(i / this.engine.state.width) + 0.5) * board.unit,
                    color: this.burstColors[i] ?? 0,
                });
            }
        }
        this.combo = Math.max(0, ...this.engine.events.filter(e => e.type === 'cascade').map(e => e.multiplier));
        if (this.engine.events.some(e => e.type === 'match') || this.deliveries.length > 0) {
            this.animation = 280;
            this.hero.move(0, true);
        }
        if (this.engine.events.some(e => e.type === 'obstacle')) sound.playEffect('life');
        this.sync();
    }
    private sync(): void {
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score);
            writeSave(browserStorage(), this.progress.save, 'gourmandises');
            sound.playEffect(this.engine.status);
        }
        writeValue(browserStorage(), RUN_KEY, JSON.stringify(this.engine.snapshot()));
        if (this.modeButton) this.modeButton.textContent = this.engine.state.mode === 'discovery' ? 'Mode : Découverte' : 'Mode : Arcade';
        this.panels();
        const scores = document.querySelector('#result-scores');
        if (scores && this.engine.status !== 'playing') {
            scores.textContent = `${'★'.repeat(this.engine.stars)}${'☆'.repeat(3 - this.engine.stars)} · Score : ${String(this.engine.state.score)}`;
        }
        this.draw();
    }
    private setMode(mode: Mode): void {
        writeValue(browserStorage(), MODE_KEY, mode);
        this.engine.state.mode = mode;
        this.start(this.engine.level, this.engine.state.seed, true);
    }
    private keydown(e: KeyboardEvent): void {
        if (e.repeat) return;
        if (e.code === 'Escape' && this.tool) {
            e.preventDefault();
            this.tool = null;
            this.syncTools();
            return;
        }
        if (e.code === 'Escape' && !this.session.menuOpen) {
            document.querySelector<HTMLButtonElement>('#game-menu-toggle')?.click();
            return;
        }
        if (!this.ready && !this.session.paused && !this.selecting && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
            e.preventDefault();
            this.tool = (['hammer', 'rocket', 'rainbow'] as const)[Number(e.code.slice(-1)) - 1] ?? null;
            if (this.tool && (this.engine.state.tools[this.tool] <= 0 || this.engine.status !== 'playing')) this.tool = null;
            this.selected = -1;
            if (this.tool) this.animation = 0;
            this.syncTools();
            return;
        }
        if (this.blocked()) return;
        const delta: Record<string, number> = {
            ArrowLeft: -1, ArrowRight: 1,
            ArrowUp: -this.engine.state.width, ArrowDown: this.engine.state.width,
        };
        if (e.code in delta) {
            e.preventDefault();
            const next = this.cursor + required(delta[e.code]);
            if (!this.engine.adjacent(this.cursor, next) || !this.engine.state.cells[next]?.active) return;
            if (this.selected >= 0) this.act(this.selected, next);
            this.cursor = next;
        } else if (e.code === 'Space') {
            e.preventDefault();
            this.choose(this.cursor);
        }

    }
    create(): void {
        document.body.classList.add('gourmandises');
        this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const saved = readValue(browserStorage(), RUN_KEY);
        if (saved) {
            try {
                const state = JSON.parse(saved) as State;
                if (state.level >= 0 && state.level < LEVELS.length && state.character === this.hero.id) {
                    this.engine.restore(state);
                    this.progress.start(state.level, true);
                }
            } catch { /* A malformed optional save starts a fresh level. */ }
        }
        const pausePanel = document.querySelector<HTMLElement>('#pause-panel');
        const pauseTitle = document.querySelector('#pause-title');
        if (pausePanel) pausePanel.hidden = false;
        if (pauseTitle) pauseTitle.textContent = 'Prêt ?';
        const resumeButton = document.querySelector('#resume');
        if (resumeButton) resumeButton.textContent = 'Jouer';
        this.inputs.on(document.querySelector('#resume'), 'click', () => {
            this.ready = false;
            if (pausePanel) pausePanel.hidden = true;
        });
        this.graphics = this.add.graphics();
        this.texture = this.textures.createCanvas('gourmandises-board', 360, 640) ?? undefined;
        this.add.image(0, 0, 'gourmandises-board').setOrigin(0);
        this.children.bringToTop(this.graphics);
        this.hud = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
        this.modeButton = document.createElement('button');
        this.modeButton.id = 'gourmandises-mode';
        document.querySelector('#game-menu')?.append(this.modeButton);
        // The shell menu may use a different host; keep the preference with status actions.
        if (!this.modeButton.isConnected) document.querySelector('#help')?.append(this.modeButton);
        this.inputs.on(this.modeButton, 'click', () => { this.setMode(this.engine.state.mode === 'discovery' ? 'arcade' : 'discovery'); });
        renderTouchControls(this.inputs, gourmandisesButtons, (id, held) => {
            if (!held || this.ready || this.session.paused || this.selecting) return;
            const tool = id.replace('gourmandises-', '') as Tool;
            this.tool = this.tool === tool ? null : tool;
            if (this.tool && this.engine.state.tools[this.tool] <= 0) this.tool = null;
            this.selected = -1;
            if (this.tool) this.animation = 0;
            this.syncTools();
        });
        for (const tool of ['hammer', 'rocket', 'rainbow'] as const) {
            const button = document.querySelector(`#gourmandises-${tool}`);
            const icon = document.createElement('canvas');
            icon.width = 56;
            icon.height = 56;
            icon.setAttribute('aria-hidden', 'true');
            const context = icon.getContext('2d');
            if (context) drawTool(context, tool);
            const count = document.createElement('span');
            count.className = 'tool-count';
            button?.replaceChildren(icon, count);
        }
        const indexAt = (x: number, y: number): number => {
            const b = this.board();
            const col = Math.floor((x - b.x) / b.unit);
            const row = Math.floor((y - b.y) / b.unit);
            return col >= 0 && col < this.engine.state.width && row >= 0 && row < this.engine.state.height
                ? row * this.engine.state.width + col : -1;
        };
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (!this.blocked()) {
                this.engine.state.idle = 0;
                this.down = { index: indexAt(p.x, p.y), x: p.x, y: p.y };
            }
        });
        this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            const down = this.down;
            this.down = null;
            if (!down || down.index < 0 || this.blocked()) return;
            const dx = p.x - down.x;
            const dy = p.y - down.y;
            if (!this.tool && Math.hypot(dx, dy) >= this.board().unit * 0.35) {
                const released = indexAt(p.x, p.y);
                const direction = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * this.engine.state.width;
                const target = this.engine.adjacent(down.index, released) ? released : down.index + direction;
                this.act(down.index, target);
            } else this.choose(down.index);
        });
        this.inputs.on(document, 'keydown', event => { this.keydown(event as KeyboardEvent); });
        this.inputs.on(document, 'keyup', event => {
            if ((event as KeyboardEvent).code === 'KeyP') {
                document.querySelector<HTMLButtonElement>('#game-menu-toggle')?.click();
            }
        });
        const retry = (): void => {
            this.progress.retry();
            this.start(this.engine.level, this.engine.state.seed);
        };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => {
            if (this.progress.state === 'won') this.start(this.engine.level + 1);
        });
        const levels = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); });
            this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : permuter deux pièces voisines`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__GOURMANDISES_TEST__ = {
            read: () => {
                const paused = this.ready || this.session.paused || this.selecting;
                const special = this.animation > 0 && (this.combo > 1 || this.engine.events.some(e => e.type === 'special'));
                this.hero.advance(0, paused, this.engine.status, special);
                return { ...this.engine.snapshot(), armedTool: this.tool, stars: this.engine.stars, characterView: this.hero.snapshot() };
            },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 600 }),
            loadLevel: (index, seed) => {
                this.ready = false;
                if (pausePanel) pausePanel.hidden = true;
                this.start(index, seed, true);
            },
            bestMove: () => greedyMove(this.engine),
            board: () => this.board(),
            scenario: name => {
                this.ready = false;
                if (pausePanel) pausePanel.hidden = true;
                this.setMode('arcade');
                this.start(name === 'drop' ? 60 : name === 'finish' ? 0 : 59, name === 'drop' ? 8 : 6, true);
                const policy = new Random(65);
                let final: [number, number] | null = null;
                // Reach a near terminal state through ordinary, legal permutations only.
                for (let step = 0; step < this.engine.state.budget; step++) {
                    const moves = this.engine.validMoves();
                    const move = name !== 'loss' ? greedyMove(this.engine) : moves[Math.floor(policy.next() * moves.length)];
                    if (!move) break;
                    const probe = this.engine.clone();
                    probe.swap(...move);
                    if (name === 'drop' ? probe.events.some(e => e.type === 'drop') : probe.status !== 'playing') {
                        final = move;
                        break;
                    }
                    this.engine.swap(...move);
                }
                this.sync();
                return final;
            },
        };
        const cleanup = (): void => {
            this.inputs.dispose();
            document.body.classList.remove('gourmandises');
            this.modeButton?.remove();
            delete window.__GOURMANDISES_TEST__;
            this.textures.remove('gourmandises-board');
            sound.stop();
        };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        this.sync();
    }
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void {
        const paused = this.ready || this.session.paused || this.selecting;
        if (!paused) {
            this.engine.advance(delta);
            this.animation = Math.max(0, this.animation - delta);
        }
        const special = this.animation > 0 && (this.combo > 1 || this.engine.events.some(e => e.type === 'special'));
        this.hero.advance(Math.min(delta, 100), paused, this.engine.status, special);
        this.draw();
    }
    private syncTools(): void {
        for (const item of presentation(this.engine.state, this.tool).tools) {
            const button = document.querySelector<HTMLButtonElement>(`#gourmandises-${item.tool}`);
            button?.setAttribute('aria-pressed', String(item.armed));
            if (button) {
                button.disabled = item.disabled;
                const count = button.querySelector('.tool-count');
                if (count) count.textContent = String(item.count);
            }
        }
    }
    private drawHud(c: CanvasRenderingContext2D): void {
        const s = this.engine.state;
        const view = presentation(s, this.tool);
        c.textAlign = 'center';
        card(c, 10, 10, 66, 83, '#ff5ba7');
        card(c, 82, 10, 194, 83, '#fff1d6');
        card(c, 282, 10, 68, 83, view.movesColor);
        c.fillStyle = '#633953';
        c.font = 'bold 13px system-ui';
        c.fillText('Niveau', 43, 31);
        c.fillText('Objectif', 179, 29);
        c.fillText('Coups', 316, 31);
        c.font = 'bold 32px system-ui';
        c.fillStyle = '#ffffff';
        c.fillText(String(s.level + 1), 43, 72);
        c.fillText(view.moves, 316, 72);
        s.objectives.forEach((o, i) => {
            const x = 82 + 194 * (i + 0.5) / s.objectives.length;
            const icon = view.objectives[i]?.icon;
            if (icon === 'drop') drawDrop(c, x, 55, 12);
            else if (typeof icon === 'number') drawPiece(c, x, 50, 14, icon);
            else {
                c.fillStyle = '#825130';
                c.font = 'bold 14px system-ui';
                c.fillText(icon === 'score' ? '★' : icon === 'ice' ? '◇' : '▧', x, 55);
            }
            c.fillStyle = '#563749';
            c.font = 'bold 13px system-ui';
            const done = this.engine.progress(o);
            c.fillText(`${String(done)}/${String(o.target)}${done >= o.target ? ' ✓' : ''}`, x, 81);
        });
        c.fillStyle = '#fff7ce';
        c.strokeStyle = '#865328';
        c.lineWidth = 3;
        c.font = 'bold 14px system-ui';
        c.strokeText(WORLDS[view.world] ?? WORLDS[0], 120, 116);
        c.fillText(WORLDS[view.world] ?? WORLDS[0], 120, 116);
        for (let i = 0; i < 3; i++) drawPiece(c, 88 + i * 32, 138, 12, 1, i < view.stars ? undefined : 'empty');
        c.fillStyle = '#64472c';
        c.font = 'bold 11px system-ui';
        c.fillText(`Score ${String(s.score)}`, 120, 160);
        card(c, 16, 165, 222, 25);
        c.fillStyle = '#fff5df';
        c.beginPath();
        c.moveTo(235, 171);
        c.lineTo(255, 162);
        c.lineTo(235, 184);
        c.fill();
        c.fillStyle = '#654329';
        c.font = `bold ${String(this.combo > 1 ? Math.min(24, 14 + this.combo * 2) + this.animation / 140 : 12)}px system-ui`;
        c.fillText(this.combo > 1 ? `Cascade ×${String(this.combo)} !` : s.status === 'won' ? 'Bravo !' : s.status === 'lost' ? 'On essaie encore ?' : 'À toi de jouer !', 127, 182);
        c.textAlign = 'left';
    }
    private draw(): void {
        const c = this.texture?.context;
        if (!c) return;
        if (this.ready && !this.session.menuOpen && !this.selecting) {
            const pausePanel = document.querySelector<HTMLElement>('#pause-panel');
            if (pausePanel) pausePanel.hidden = false;
        }
        const b = this.board();
        const s = this.engine.state;
        c.clearRect(0, 0, 360, 640);
        const view = presentation(s, this.tool);
        if (this.sceneryWorld !== view.world) {
            this.scenery = document.createElement('canvas');
            this.scenery.width = 360;
            this.scenery.height = 640;
            const context = this.scenery.getContext('2d');
            if (context) drawScenery(context, view.world);
            this.sceneryWorld = view.world;
        }
        if (this.scenery) c.drawImage(this.scenery, 0, 0);
        c.shadowColor = '#254834';
        c.shadowBlur = 12;
        c.shadowOffsetY = 6;
        card(c, b.x - 8, b.y - 8, b.width + 16, b.height + 16, '#b77d49');
        c.shadowBlur = 0;
        c.shadowOffsetY = 0;
        card(c, b.x - 4, b.y - 4, b.width + 8, b.height + 8, '#d9f7ed');
        const hint = this.engine.hint();
        c.save();
        if (this.shake && this.animation > 0 && !this.reducedMotion) {
            c.translate(Math.sin(this.animation / 18) * 3, 0);
        }
        c.beginPath();
        c.rect(b.x, b.y, b.width, b.height);
        c.clip();
        s.cells.forEach((cell, i) => {
            if (!cell.active) return;
            const x = b.x + i % s.width * b.unit;
            const y = b.y + Math.floor(i / s.width) * b.unit;
            c.fillStyle = (i % s.width + Math.floor(i / s.width)) % 2 ? '#b6e3d9' : '#d2f0e4';
            c.fillRect(x + 1, y + 1, b.unit - 2, b.unit - 2);
            if (cell.crate) {
                c.fillStyle = cell.crate > 1 ? '#ad7547' : '#dba363';
                c.fillRect(x + 3, y + 3, b.unit - 6, b.unit - 6);
                c.strokeStyle = '#734d36';
                c.lineWidth = cell.crate + 1;
                c.strokeRect(x + 6, y + 6, b.unit - 12, b.unit - 12);
                c.beginPath();
                c.moveTo(x + 6, y + 6);
                c.lineTo(x + b.unit - 6, y + b.unit - 6);
                c.stroke();
                for (let plank = 1; plank < 3; plank++) {
                    c.beginPath();
                    c.moveTo(x + 4, y + b.unit * plank / 3);
                    c.lineTo(x + b.unit - 4, y + b.unit * plank / 3);
                    c.stroke();
                }
                if (cell.crate === 1) {
                    c.beginPath();
                    c.moveTo(x + b.unit * 0.4, y + 4);
                    c.lineTo(x + b.unit * 0.6, y + b.unit * 0.45);
                    c.lineTo(x + b.unit * 0.4, y + b.unit - 4);
                    c.stroke();
                }
                for (const dx of [8, b.unit - 8]) for (const dy of [8, b.unit - 8]) {
                    c.fillStyle = '#684e3a';
                    c.beginPath();
                    c.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
                    c.fill();
                }
            }
            if (cell.piece) {
                const distance = this.falls.get(i) ?? 0;
                const offset = this.animation > 0 && !this.reducedMotion ? -Math.pow(this.animation / 280, 2) * b.unit * distance : 0;
                if (cell.piece.drop) drawDrop(c, x + b.unit / 2, y + b.unit / 2 + offset, b.unit * 0.34);
                else drawPiece(c, x + b.unit / 2, y + b.unit / 2 + offset, b.unit * 0.37, cell.piece.color, cell.piece.special);
            }
            if (cell.ice) drawIce(c, x, y, b.unit, cell.ice);
            if (cell.exit) {
                c.strokeStyle = '#fff0a0';
                c.lineWidth = 4;
                c.beginPath();
                c.moveTo(x + b.unit * 0.25, y + b.unit * 0.75);
                c.lineTo(x + b.unit * 0.5, y + b.unit * 0.9);
                c.lineTo(x + b.unit * 0.75, y + b.unit * 0.75);
                c.stroke();
            }
            if (i === this.cursor && this.selected < 0) {
                c.strokeStyle = '#b2d8df';
                c.lineWidth = 1;
                c.strokeRect(x + 3, y + 3, b.unit - 6, b.unit - 6);
            }
            if (i === this.selected || (hint?.includes(i) && Math.floor(s.idle / 300) % 2 === 0)) {
                c.strokeStyle = '#fff8b2';
                c.lineWidth = 3;
                c.strokeRect(x + 2, y + 2, b.unit - 4, b.unit - 4);
            }
        });
        // Delivered cargo has left the final board; draw the event's gold piece
        // separately so a refill at the same destination cannot replace it.
        if (this.animation > 0 && !this.reducedMotion) {
            const remaining = Math.pow(this.animation / 280, 2);
            for (const delivery of this.deliveries) {
                const x = b.x + (delivery.to % s.width + 0.5) * b.unit;
                const y = b.y + (Math.floor(delivery.to / s.width) + 0.5
                    - (delivery.to - delivery.from) / s.width * remaining) * b.unit;
                drawDrop(c, x, y, b.unit * 0.34);
            }
        }
        c.restore();
        if (this.animation > 0 && !this.reducedMotion) {
            const t = 1 - this.animation / 280;
            for (const event of this.engine.events.filter(event => event.type === 'special')) {
                for (const index of event.cells) {
                    const x = b.x + (index % s.width + 0.5) * b.unit;
                    const y = b.y + (Math.floor(index / s.width) + 0.5) * b.unit;
                    c.strokeStyle = '#fff7b9';
                    c.lineWidth = 4 * (1 - t);
                    c.beginPath();
                    for (let ray = 0; ray < 8; ray++) {
                        c.moveTo(x, y);
                        c.lineTo(x + Math.cos(ray * Math.PI / 4) * (24 + t * 70), y + Math.sin(ray * Math.PI / 4) * (24 + t * 70));
                    }
                    c.stroke();
                }
            }
            c.fillStyle = '#ffe8a0';
            c.globalAlpha = 1 - t;
            for (const p of this.particles) for (let j = 0; j < 4; j++) {
                c.beginPath();
                drawPiece(c, p.x + Math.cos(j * 1.57) * t * 24, p.y + Math.sin(j * 1.57) * t * 24, 4, p.color);
            }
            c.globalAlpha = 1;
        }
        const pieceNames = ['fraises', 'étoiles', 'gouttes', 'feuilles', 'fleurs', 'cœurs', 'oranges'];
        const targets = s.objectives.map(o => {
            const label = o.kind === 'collect' ? pieceNames[o.color] ?? 'pièces'
                : o.kind === 'drop' ? 'gouttes sorties' : o.kind;
            return `${label} ${String(this.engine.progress(o))}/${String(o.target)}`;
        }).join(' · ');
        const budget = s.mode === 'arcade' ? `/${String(s.budget)}` : ' · Découverte';
        const text = [
            `${GAME_NAME} · Niveau ${String(s.level + 1)}/${String(LEVELS.length)}`,
            `Objectif : ${targets}`,
            `Coups : ${String(s.moves)}${budget} · SCORE ${String(s.score)}`,
            `⚒ ${String(s.tools.hammer)}  ↑ ${String(s.tools.rocket)}  ◉ ${String(s.tools.rainbow)}`
                + (this.tool ? ` · ${{ hammer: 'Marteau', rocket: 'Fusée', rainbow: 'Arc-en-ciel' }[this.tool]}` : ''),
        ].join('\n');
        this.hud?.setText(text);
        c.fillStyle = '#fff2ce';
        c.font = '14px system-ui';
        this.drawHud(c);
        this.texture?.refresh();
        this.graphics?.clear();
        if (this.graphics) this.hero.draw(this.graphics, 264, 105, 84);
        const status = document.querySelector('#status');
        if (status) status.textContent = text;
        this.syncTools();
    }
}

function required<T>(value: T | null | undefined): T {
    if (value == null) throw new Error('Valeur attendue');
    return value;
}
