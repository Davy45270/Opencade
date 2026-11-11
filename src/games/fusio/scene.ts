import Phaser from 'phaser';
import './style.css';
import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { Engine, GAME_NAME, LEVELS } from '../../engines/fusio/engine';
import { CHALLENGES } from '../../engines/fusio/challenges';
import { maxTile, type Direction } from '../../engines/fusio/rules';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, readValue, writeSave, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { canvasGraphics } from '../thumbnail-art';
import { BUTTON_DIRECTIONS, keyAction, swipe } from './controls';
import { UI, arrowIcon, backdrop, boardFrame, bulbIcon, cellXY, hintArrow, layout, pill, sparkle, starIcon, tile, undoIcon, wall, type Layout, type Rect } from './art';
export const RUN_KEY = 'arcade-lab:fusio:run:v1';
export const BEST_KEY = 'arcade-lab:fusio:best:v1';
export const HELP_KEY = 'arcade-lab:fusio:help:v1';
/** Undo, the four directions and the hint, under the thumbs on every screen (≥ 44 px, DOM buttons: keyboard and
 * screen readers reach them). */
export const fusioButtons: readonly TouchButton[] = [
    { id: 'fusio-undo', label: '', ariaLabel: 'Annuler le dernier coup', size: 44, placement: 'left', mode: 'tap' },
    { id: 'fusio-left', label: '', ariaLabel: 'Glisser vers la gauche', size: 44, placement: 'center', mode: 'tap' },
    { id: 'fusio-up', label: '', ariaLabel: 'Glisser vers le haut', size: 44, placement: 'center', mode: 'tap' },
    { id: 'fusio-down', label: '', ariaLabel: 'Glisser vers le bas', size: 44, placement: 'center', mode: 'tap' },
    { id: 'fusio-right', label: '', ariaLabel: 'Glisser vers la droite', size: 44, placement: 'center', mode: 'tap' },
    { id: 'fusio-hint', label: '', ariaLabel: 'Indice : le coup conseillé, expliqué', size: 44, placement: 'right', mode: 'tap' },
];
const SLIDE_MS = 110, POP_MS = 150, END_DELAY = 900, HINT_MS = 2400;
type Tone = 'tip' | 'hint' | 'win' | 'lost';
interface Anim { t: number; moved: { from: number; to: number; value: number }[]; merged: { from: [number, number]; to: number; value: number }[]; spawn: { at: number; value: number } | null; board: number[] }
export interface FusioHook {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { best: number; message: string; tone: Tone; animating: boolean; panel: boolean; progression: string; unlocked: number; cumulativeScore: number; character: ReturnType<GameCharacter['snapshot']>; fingerInput: { down: boolean } };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    loadClassic(seed: number): void;
    /** The agent's next move (not counted as a hint), or null. */
    nextMove(): Direction | null;
    /** The board's rectangle (logical units). */
    boardRect(): Rect;
    /** Every text box on the canvas and the box it must stay inside (logical units). */
    texts(): { name: string; box: Rect; limit: Rect }[];
}
declare global { interface Window { __FUSIO_TEST__?: FusioHook } }
const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
export class FusioScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter(selectedCharacter());
    private progress = new Progression(readSave(browserStorage(), 'fusio', LEVELS.length), LEVELS.length);
    private inputs = new Inputs();
    private best = 0;
    private selecting = false;
    private manual = false;
    private message = ''; private tone: Tone = 'tip';
    private anim: Anim | null = null;
    /** The board layer is redrawn only when something changed or a tile is moving (software rendering on phones). */
    private dirty = true;
    private hintMs = 0;
    private ended = 0;
    private press: { x: number; y: number; done: boolean } | null = null;
    private down = false;
    private l: Layout = layout(4);
    private sky?: Phaser.GameObjects.Graphics;
    private skyKey = '';
    private g?: Phaser.GameObjects.Graphics;
    private fx?: Phaser.GameObjects.Graphics;
    private texts: Record<'title' | 'l0' | 'v0' | 'l1' | 'v1' | 'l2' | 'v2' | 'speech', Phaser.GameObjects.Text> | null = null;
    constructor(private session = new PlaySession(false)) { super('fusio'); }
    private get blocked(): boolean { return this.session.paused || this.selecting; }
    private storage() { return browserStorage(); }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('fusio');
        const best = Number(readValue(this.storage(), BEST_KEY) ?? 0); this.best = Number.isFinite(best) && best > 0 ? Math.floor(best) : 0;
        const cleanup = (): void => { this.save(); this.inputs.dispose(); document.body.classList.remove('fusio'); document.querySelector('#fusio-modes')?.remove(); delete window.__FUSIO_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.sky = this.add.graphics().setDepth(0);
        this.g = this.add.graphics().setDepth(1);
        this.fx = this.add.graphics().setDepth(3);
        const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
        const text = (size: number, color: string, bold = true) => this.add.text(0, 0, '', { fontFamily: family, fontSize: `${String(size)}px`, color, fontStyle: bold ? 'bold' : 'normal' }).setDepth(2);
        this.texts = { title: text(18, '#ffffff'), l0: text(11, '#d9ccff'), v0: text(20, '#ffffff'), l1: text(11, '#d9ccff'), v1: text(20, '#ffffff'), l2: text(11, '#d9ccff'), v2: text(20, '#ffffff'), speech: text(14, '#2b1d57', false) };
        const resized = (): void => { this.relayout(); };
        this.scale.on('resize', resized);
        this.events.once('shutdown', () => { this.scale.off('resize', resized); });
        renderTouchControls(this.inputs, fusioButtons, (id, held) => { if (held) this.button(id); });
        this.dressButtons();
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!this.blocked) this.press = { x: p.x, y: p.y, done: false }; });
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.swipeMove(p.x, p.y, false); });
        this.input.on('pointerup', (p: Phaser.Input.Pointer) => { this.swipeMove(p.x, p.y, true); this.press = null; });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) {
            this.inputs.on(area, 'pointerdown', () => { this.down = true; });
            for (const type of ['pointerup', 'pointercancel']) this.inputs.on(area, type, () => { this.down = false; });
        }
        this.inputs.on(document, 'keydown', event => { this.keydown(event as KeyboardEvent); });
        this.inputs.on(document, 'visibilitychange', () => { this.save(); });
        const retry = (): void => {
            if (this.engine.kind === 'classic') this.newClassic(); else { this.progress.retry(); this.engine.loadChallenge(this.engine.index); this.fresh(); }
        };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => {
            if (this.engine.kind === 'classic') { if (this.engine.keepGoing()) { this.say('On continue : visez 4096 !', 'tip'); this.save(); this.sync(); } }
            else if (this.progress.state === 'won') this.startChallenge(this.engine.index + 1);
        });
        const levels = (): void => { this.selecting = !this.selecting; this.renderSelector(); this.sync(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : glisser pour pousser les tuiles, deux tuiles égales fusionnent`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__FUSIO_TEST__ = this.testHook(receipts);
        // Resume the saved run, else the classic game (the entry point for adults).
        let restored: Engine | null;
        try { restored = Engine.restore(JSON.parse(readValue(this.storage(), RUN_KEY) ?? 'null')); } catch { restored = null; }
        if (restored && restored.status === 'playing' && (restored.kind === 'classic' || restored.index < this.progress.save.unlocked)) {
            this.engine = restored; if (restored.kind === 'challenge') this.progress.start(restored.index, true);
            this.relayout(); this.opening(); this.sync();
        } else this.newClassic();
    }
    private dressButtons(): void {
        const paint = (id: string, draw: (g: ReturnType<typeof canvasGraphics>) => void): void => {
            const button = document.querySelector(`#${id}`); if (!button) return;
            const c = document.createElement('canvas'); c.width = 88; c.height = 88; c.setAttribute('aria-hidden', 'true');
            const ctx = c.getContext('2d'); if (ctx) { ctx.scale(2, 2); draw(canvasGraphics(ctx)); }
            button.replaceChildren(c);
        };
        for (const [id, d] of Object.entries(BUTTON_DIRECTIONS)) paint(id, g => { arrowIcon(g, 22, 22, 34, d); });
        paint('fusio-undo', g => { undoIcon(g, 22, 22, 38); });
        paint('fusio-hint', g => { bulbIcon(g, 22, 22, 40); });
    }
    // ——— Starting games ———
    private newClassic(seed = Date.now() % 2147483647): void { this.engine.loadClassic(seed); this.fresh(); }
    private startChallenge(index: number): void { this.progress.start(index, false); this.engine.loadChallenge(index); this.fresh(); }
    private fresh(): void { this.selecting = false; this.anim = null; this.hintMs = 0; this.ended = 0; this.relayout(); this.opening(); this.save(); this.renderSelector(); this.sync(); }
    private opening(): void {
        const e = this.engine;
        if (e.kind === 'challenge') { this.say(CHALLENGES[e.index]?.tip ?? '', 'tip'); return; }
        if (readValue(this.storage(), HELP_KEY) !== '1') {
            writeValue(this.storage(), HELP_KEY, '1');
            this.say('Glissez : toutes les tuiles partent de ce côté, deux tuiles égales fusionnent. Visez 2048.', 'tip');
        } else this.say('Classique : gardez la plus grande tuile dans un coin.', 'tip');
    }
    private say(text: string, tone: Tone): void { this.message = text; this.tone = tone; }
    private relayout(): void { this.l = layout(this.engine.size, this.scale.width, this.scale.height); this.skyKey = ''; this.dirty = true; this.draw(); }
    // ——— Input ———
    private button(id: string): void {
        if (this.blocked) return;
        const d = BUTTON_DIRECTIONS[id];
        if (d) this.play(d);
        else if (id === 'fusio-undo') this.undo();
        else if (id === 'fusio-hint') this.askHint();
    }
    private swipeMove(x: number, y: number, end: boolean): void {
        const p = this.press; if (!p || p.done || this.blocked) return;
        const d = swipe(x - p.x, y - p.y);
        if (d) { p.done = true; this.play(d); }
        else if (end) p.done = true;
    }
    private keydown(e: KeyboardEvent): void {
        if (this.blocked) return;
        const target = e.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        const a = keyAction(e); if (!a) return;
        e.preventDefault();
        if (a.type === 'move') this.play(a.direction);
        else if (e.repeat) return;
        else if (a.type === 'undo') this.undo();
        else if (a.type === 'hint') this.askHint();
        else if (this.engine.kind === 'classic') this.newClassic(); else { this.progress.retry(); this.engine.loadChallenge(this.engine.index); this.fresh(); }
    }
    // ——— Actions ———
    private play(direction: Direction): void {
        const e = this.engine;
        if (e.status !== 'playing') return;
        const before = e.state.board.slice();
        if (!e.move(direction)) { sound.playEffect('refused'); this.hero.impact = 160; this.sync(); return; }
        const moved = e.events.filter(ev => ev.type === 'TILE_MOVED').map(ev => ev.payload as Anim['moved'][number]);
        const merged = e.events.filter(ev => ev.type === 'TILE_MERGED').map(ev => ev.payload as Anim['merged'][number]);
        const spawn = (e.events.find(ev => ev.type === 'TILE_SPAWNED')?.payload ?? null) as Anim['spawn'];
        this.anim = reduced() ? null : { t: 0, moved, merged, spawn, board: before };
        this.hintMs = 0;
        const big = merged.reduce((m, x) => Math.max(m, x.value), 0);
        if (big) { sound.playEffect('merge', Math.log2(big)); if (big >= 64 && big >= maxTile(before)) this.hero.move(0, true); } else sound.playEffect('slide');
        if (this.tone === 'hint') this.say(e.kind === 'challenge' ? CHALLENGES[e.index]?.tip ?? '' : 'Classique : gardez la plus grande tuile dans un coin.', 'tip');
        const after: string = e.status;
        if (after !== 'playing') this.finish();
        this.save(); this.sync();
    }
    private undo(): void {
        const e = this.engine;
        if (!e.undo()) {
            sound.playEffect('refused');
            this.say(e.config.undoEnabled === false ? 'Ce défi se joue sans annuler.' : 'Rien à annuler pour l’instant.', 'tip');
            this.sync(); return;
        }
        this.anim = null; this.ended = 0; sound.playEffect('undo'); this.say('Coup annulé.', 'tip'); this.save(); this.sync();
    }
    private askHint(): void {
        const e = this.engine;
        if (e.status !== 'playing') return;
        const h = e.hint();
        if (!h) return;
        this.hintMs = HINT_MS; this.hero.move(0, true); sound.playEffect('hint');
        this.say(`Indice : ${h.text}`, 'hint'); this.save(); this.sync();
    }
    private finish(): void {
        const e = this.engine;
        this.ended = 0;
        if (e.kind === 'classic') {
            if (e.state.score > this.best) { this.best = e.state.score; writeValue(this.storage(), BEST_KEY, String(this.best)); }
        } else if (this.progress.state === 'playing') { this.progress.finish(e.status === 'won' ? 'won' : 'lost', e.status === 'won' ? e.state.score : 0); writeSave(this.storage(), this.progress.save, 'fusio'); }
        if (e.status === 'won') { sound.playEffect('won'); this.say(e.kind === 'classic' ? `Bravo, ${String(e.config.target)} ! Vous pouvez continuer.` : `Bravo ! Défi réussi en ${String(e.state.moves)} coups.`, 'win'); }
        else { this.hero.impact = 600; sound.playEffect('lost'); this.say(e.state.lostBy === 'moves' ? 'Plus de coups : l’objectif n’est pas atteint.' : 'Plus aucun coup possible.', 'lost'); }
    }
    private save(): void {
        const e = this.engine;
        if (e.kind === 'classic' && e.state.score > this.best) { this.best = e.state.score; writeValue(this.storage(), BEST_KEY, String(this.best)); }
        writeValue(this.storage(), RUN_KEY, e.status === 'playing' ? JSON.stringify(e.serialize()) : 'null');
    }
    private renderSelector(): void {
        document.querySelector('#fusio-modes')?.remove();
        if (!this.selecting) return;
        renderLevels(LEVELS, this.progress.save, index => { this.startChallenge(index); });
        const modes = document.createElement('div'); modes.id = 'fusio-modes';
        const b = document.createElement('button'); b.id = 'fusio-classic'; b.textContent = `Classique 4 × 4 · 2048${this.best ? ` · record ${String(this.best)}` : ''}`;
        b.addEventListener('click', () => { this.newClassic(); });
        const p = document.createElement('p'); p.textContent = 'Défis (une règle change à chaque fois) :';
        modes.append(b, p);
        document.querySelector('#level-list')?.before(modes);
    }
    // ——— Test hook ———
    private testHook(receipts: ReturnType<typeof fingerReceipts>): FusioHook {
        const box = (t?: Phaser.GameObjects.Text): Rect => t ? { x: t.x, y: t.y, w: t.displayWidth, h: t.displayHeight } : { x: 0, y: 0, w: 0, h: 0 };
        return {
            ...fingerProof,
            fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), best: this.best, message: this.message, tone: this.tone, animating: this.anim !== null, panel: this.panelShown(), progression: this.progress.state, unlocked: this.progress.save.unlocked, cumulativeScore: this.progress.total, character: this.hero.snapshot(), fingerInput: { down: this.down } }),
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.manual = true;
                for (let left = ms; left > 0; left -= 1000 / 60) this.tick(Math.min(left, 1000 / 60));
                if (ms === 0) this.tick(0);
            },
            hudText: () => `${this.texts?.title.text ?? ''} · SCORE ${String(this.engine.state.score)} · ${this.texts?.l1.text ?? ''} ${this.texts?.v1.text ?? ''} · ${this.texts?.l2.text ?? ''} ${this.texts?.v2.text ?? ''}\n${this.message}`,
            usefulArea: () => ({ x: 0, y: 0, width: this.scale.width, height: this.scale.height }),
            loadLevel: index => { this.startChallenge(index); },
            loadClassic: seed => { this.newClassic(seed); },
            nextMove: () => this.engine.nextMove(),
            boardRect: () => ({ x: this.l.board.x, y: this.l.board.y, w: this.l.board.w, h: this.l.board.h }),
            texts: () => {
                const t = this.texts; if (!t) return [];
                const l = this.l, inner = (r: Rect, top = 0): Rect => ({ x: r.x + 4, y: r.y + top, w: r.w - 8, h: r.h - top });
                return [
                    { name: 'title', box: box(t.title), limit: { x: l.hud.x, y: l.hud.y, w: l.hud.w - 60, h: 28 } },
                    ...[0, 1, 2].flatMap(k => { const p = l.pills[k] ?? l.hud; return [{ name: `label-${String(k)}`, box: box(t[`l${String(k)}` as 'l0']), limit: inner(p) }, { name: `value-${String(k)}`, box: box(t[`v${String(k)}` as 'v0']), limit: inner(p) }]; }),
                    { name: 'speech', box: box(t.speech), limit: { x: l.bubble.x + 4, y: l.bubble.y + 2, w: l.bubble.w - 8, h: l.bubble.h - 4 } },
                ];
            },
        };
    }
    // ——— Frame ———
    updatePaused(): void { this.draw(); }
    private lastFrame = 0;
    update(_time: number, delta: number): void {
        const now = performance.now(), real = this.lastFrame ? Math.min(1000, now - this.lastFrame) : delta;
        this.lastFrame = now; this.tick(this.manual ? 0 : real);
    }
    private tick(delta: number): void {
        const paused = this.blocked || document.hidden, dt = paused ? 0 : delta;
        this.engine.advance(dt);
        if (this.anim) { this.anim.t += dt; if (this.anim.t >= SLIDE_MS + POP_MS) { this.anim = null; this.dirty = true; } }
        const hinted = this.hintMs > 0;
        this.hintMs = Math.max(0, this.hintMs - dt);
        if (hinted && this.hintMs === 0) this.sync();
        if (this.engine.status !== 'playing') { const was = this.ended; this.ended += dt; if (was < END_DELAY && this.ended >= END_DELAY) this.sync(); }
        this.hero.advance(Math.min(delta, 100), paused, this.engine.status, false);
        this.draw();
    }
    private panelShown(): boolean { return this.engine.status !== 'playing' && (this.ended >= END_DELAY || reduced()); }
    private sync(): void {
        const e = this.engine, shown = this.panelShown() ? e.status : 'playing';
        const state = e.kind === 'challenge' ? this.progress.state : e.status === 'won' ? 'won' : 'lost';
        renderPanels(shown, state, e.index, e.state.score, this.progress.total, this.selecting);
        const title = document.querySelector('#result-title'), scores = document.querySelector('#result-scores');
        const next = document.querySelector<HTMLButtonElement>('#next-level'), retry = document.querySelector('#retry-level');
        if (retry) retry.textContent = 'Rejouer';
        if (e.kind === 'classic') {
            if (title && shown === 'won') title.textContent = `${String(e.config.target)} atteint !`;
            if (title && shown === 'lost') title.textContent = 'Partie terminée';
            if (scores) scores.textContent = `Score : ${String(e.state.score)} · Record : ${String(this.best)} · ${String(e.state.moves)} coups`;
            if (next) next.textContent = 'Continuer';
        } else {
            if (scores && shown === 'won') scores.textContent = `${'★'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)} · ${String(e.state.moves)} coups · Score : ${String(e.state.score)} · Cumulé : ${String(this.progress.total)}`;
            if (scores && shown === 'lost') scores.textContent = e.state.lostBy === 'moves' ? `Les ${String(e.config.moveLimit ?? 0)} coups sont joués. Une autre partie donnera d’autres tuiles.` : 'Le plateau est bloqué. Une autre partie donnera d’autres tuiles.';
            if (next) next.textContent = 'Défi suivant';
        }
        const undo = document.querySelector<HTMLButtonElement>('#fusio-undo');
        if (undo) { undo.disabled = !e.canUndo; undo.setAttribute('aria-label', e.config.undoEnabled === false ? 'Annuler : désactivé dans ce défi' : 'Annuler le dernier coup'); }
        const hint = document.querySelector<HTMLButtonElement>('#fusio-hint'); if (hint) hint.disabled = e.status !== 'playing';
        for (const [id, d] of Object.entries(BUTTON_DIRECTIONS)) document.querySelector(`#${id}`)?.classList.toggle('hinted', this.hintMs > 0 && e.lastHint?.direction === d);
        this.dirty = true; this.draw();
    }
    // ——— Drawing ———
    private draw(): void {
        const g = this.g, fx = this.fx, t = this.texts, sky = this.sky; if (!g || !fx || !t || !sky) return;
        const e = this.engine, l = this.l, theme = e.theme, w = Math.round(this.scale.width), h = Math.round(this.scale.height), key = `${theme}:${String(w)}x${String(h)}`;
        if (key !== this.skyKey) { this.skyKey = key; sky.clear(); backdrop(sky, theme, w, h); }
        fx.clear();
        const title = e.kind === 'classic' ? `Classique · objectif ${String(e.config.target)}${e.state.endless ? ' · on continue' : ''}` : `Défi ${String(e.index + 1)}/${String(LEVELS.length)} · ${e.name}`;
        const bd = l.board, cell = bd.cell, still = reduced(), a = this.anim;
        if (this.dirty || a) { this.dirty = false; this.drawBoard(title); }
        this.hero.draw(fx, l.hero.x, l.hero.y, l.hero.w);
        if (a && !still && a.t >= SLIDE_MS) for (const m of a.merged) { const [x, y] = cellXY(l, m.to); sparkle(fx, x + cell / 2, y + cell / 2, cell, (a.t - SLIDE_MS) / POP_MS); }
        if (this.hintMs > 0 && e.lastHint && e.status === 'playing') {
            const alpha = still ? 0.85 : 0.55 + 0.35 * Math.abs(Math.sin(e.time / 260));
            hintArrow(fx, bd.x + bd.w / 2, bd.y + bd.h / 2, bd.w * 0.5, e.lastHint.direction, alpha);
        }
        if (e.status === 'lost') { fx.fillStyle(0x10081f, 0.35); fx.fillRoundedRect(bd.x, bd.y, bd.w, bd.h, 12); }
        if (e.status === 'won' && !still) for (let k = 0; k < 12; k++) {
            const ang = k * Math.PI / 6 + e.time / 900, r = bd.w * (0.3 + 0.1 * Math.sin(e.time / 300 + k));
            fx.fillStyle([UI.gold, 0xee5fa7, UI.green, 0x2f8be6][k % 4] ?? UI.gold, 0.9); fx.fillCircle(bd.x + bd.w / 2 + Math.cos(ang) * r, bd.y + bd.h / 2 + Math.sin(ang) * r, 5);
        }
        const status = document.querySelector('#status'), line = `${title}. Score ${String(e.state.score)}. ${this.message}`;
        if (status && status.textContent !== line) status.textContent = line;
    }
    private drawBoard(title: string): void {
        const g = this.g, t = this.texts; if (!g || !t) return;
        const e = this.engine, l = this.l, theme = e.theme;
        g.clear();
        // HUD: title, then Score / Record (or moves left) / Objectif pills.
        // The title starts 4 px in, so it fits in the remaining width up to the hint button (l.hud.w - 60).
        t.title.setText(title); fit(t.title, l.hud.w - 64, 26, [18, 17, 16, 15, 14, 13]);
        t.title.setPosition(l.hud.x + 4, l.hud.y + 13 - t.title.displayHeight / 2);
        if (e.kind === 'challenge') for (let k = 0; k < 3; k++) starIcon(g, l.hud.x + l.hud.w - 48 + k * 18, l.hud.y + 13, 7, k < e.stars);
        const left = e.movesLeft;
        const cells: [string, string][] = [
            ['SCORE', String(e.state.score)],
            e.kind === 'classic' ? ['RECORD', String(Math.max(this.best, e.state.score))] : left !== null ? ['COUPS RESTANTS', String(left)] : ['COUPS', String(e.state.moves)],
            ['OBJECTIF', e.state.endless ? '∞' : String(e.config.target)],
        ];
        cells.forEach(([label, value], k) => {
            const p = l.pills[k]; if (!p) return;
            pill(g, p.x, p.y, p.w, p.h, k === 2 ? UI.violet : 0x2b2f6b);
            const lt = t[`l${String(k)}` as 'l0'], vt = t[`v${String(k)}` as 'v0'];
            lt.setText(label); fit(lt, p.w - 10, 14, [11, 10, 9]); lt.setPosition(p.x + p.w / 2 - lt.displayWidth / 2, p.y + 4);
            vt.setText(value); fit(vt, p.w - 10, 26, [22, 20, 18, 16, 14]); vt.setPosition(p.x + p.w / 2 - vt.displayWidth / 2, p.y + p.h - 4 - vt.displayHeight);
        });
        // Companion and its bubble, never over the board.
        const b = l.bubble, toneColor = this.tone === 'hint' ? 0xffe27a : this.tone === 'win' ? 0xb9f0b0 : this.tone === 'lost' ? 0xffc2bd : 0xfff8e8;
        g.fillStyle(0x000000, 0.25); g.fillRoundedRect(b.x, b.y + 3, b.w, b.h, 14);
        g.fillStyle(toneColor); g.fillRoundedRect(b.x, b.y, b.w, b.h, 14);
        g.fillTriangle(b.x + 2, b.y + b.h * 0.4, b.x + 2, b.y + b.h * 0.7, b.x - 8, b.y + b.h * 0.6);
        t.speech.setText(this.message).setWordWrapWidth(b.w - 20); fit(t.speech, b.w - 20, b.h - 8, [15, 14, 13, 12, 11, 10]);
        t.speech.setPosition(b.x + 10, b.y + b.h / 2 - t.speech.displayHeight / 2);
        // Board.
        const bd = l.board, size = e.size, cell = bd.cell, still = reduced();
        boardFrame(g, theme, bd.x, bd.y, bd.w, size, bd.gap);
        for (const i of e.config.walls ?? []) { const [x, y] = cellXY(l, i); wall(g, theme, x, y, cell); }
        const a = this.anim;
        if (a && !still) {
            const k = Math.min(1, a.t / SLIDE_MS), ease = 1 - (1 - k) * (1 - k);
            if (a.t < SLIDE_MS) {
                // Sliding: every tile of the previous board travels to its cell (merging pairs both slide in).
                const dest = new Map<number, number>();
                for (const m of a.moved) dest.set(m.from, m.to);
                for (const m of a.merged) { dest.set(m.from[0], m.to); dest.set(m.from[1], m.to); }
                a.board.forEach((v, i) => {
                    if (!v) return;
                    const to = dest.get(i) ?? i, [x0, y0] = cellXY(l, i), [x1, y1] = cellXY(l, to);
                    tile(g, v, x0 + (x1 - x0) * ease, y0 + (y1 - y0) * ease, cell);
                });
            } else {
                const p = (a.t - SLIDE_MS) / POP_MS, pop = 1 + 0.16 * Math.sin(Math.PI * p);
                const mergedAt = new Set(a.merged.map(m => m.to));
                e.state.board.forEach((v, i) => {
                    if (!v) return;
                    const [x, y] = cellXY(l, i);
                    if (a.spawn && a.spawn.at === i) tile(g, v, x, y, cell, Math.min(1, p * 1.2));
                    else tile(g, v, x, y, cell, mergedAt.has(i) ? pop : 1);
                });
            }
        } else e.state.board.forEach((v, i) => { if (!v) return; const [x, y] = cellXY(l, i); tile(g, v, x, y, cell); });
    }
}
/** Largest listed font size whose text fits the box; scaled down below the smallest (a wider font never overflows). */
function fit(t: Phaser.GameObjects.Text, w: number, h: number, sizes: readonly number[]): void {
    t.setScale(1);
    for (const size of sizes) { t.setFontSize(size); if (t.width <= w && t.height <= h) return; }
    t.setScale(Math.min(1, w / Math.max(1, t.width), h / Math.max(1, t.height)));
}
