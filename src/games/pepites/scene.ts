import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, W, H, mine, type Direction } from '../../engines/pepites/engine';
import { mineTip } from '../../engines/pepites/tips';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { swipeDirection } from '../../shell/gestures';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const pepitesButtons: readonly TouchButton[] = [
    { id: 'pepites-left', label: '←', ariaLabel: 'Creuser à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'pepites-up', label: '↑', ariaLabel: 'Creuser vers le haut', size: 56, placement: 'left', mode: 'hold' },
    { id: 'pepites-down', label: '↓', ariaLabel: 'Creuser vers le bas', size: 56, placement: 'right', mode: 'hold' },
    { id: 'pepites-right', label: '→', ariaLabel: 'Creuser à droite', size: 56, placement: 'right', mode: 'hold' },
    { id: 'pepites-special', label: 'Étai', ariaLabel: 'Étai : figer les rochers', size: 56, placement: 'center', mode: 'tap' },
];
export interface PepitesHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
}
declare global { interface Window { __PEPITES_TEST__?: PepitesHook } }
const CELL = 30, TOP = 40;
export class PepitesScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'pepites', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private flash = 0;
    constructor(private session = new PlaySession(true)) { super('pepites'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.panels();
    }
    create(): void {
        document.body.classList.add('pepites');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('pepites'); delete window.__PEPITES_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(10, 528, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#e5f3ff', lineSpacing: 6 });
        const ready = (): boolean => {
            if (this.session.state === 'ready') this.session.send('start');
            return !this.session.paused && !this.selecting && this.engine.status === 'playing';
        };
        const press = (d: Direction): void => { if (ready()) { this.engine.input(d); this.engine.hold(d); this.hero.move(d === 'left' ? -1 : d === 'right' ? 1 : 0); } };
        const release = (): void => { this.engine.hold(null); };
        renderTouchControls(this.inputs, pepitesButtons, (id, held) => {
            const name = id.replace('pepites-', '');
            if (name === 'special') { if (held && ready() && this.engine.special()) sound.playEffect('prop'); return; }
            if (held) press(name as Direction); else release();
        });
        // Drag on the mine: the finger's direction is held until it lifts.
        const area = document.querySelector<HTMLElement>('#game');
        let origin: { x: number; y: number; id: number; dir: Direction | null } | null = null;
        this.inputs.on(area, 'pointerdown', event => { const e = event as PointerEvent; if (origin) return; e.preventDefault(); area?.setPointerCapture(e.pointerId); origin = { x: e.clientX, y: e.clientY, id: e.pointerId, dir: null }; });
        this.inputs.on(area, 'pointermove', event => {
            const e = event as PointerEvent; if (!origin || e.pointerId !== origin.id) return;
            const d = swipeDirection(e.clientX - origin.x, e.clientY - origin.y, 18);
            if (d && d !== origin.dir) { origin.dir = d; press(d); }
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.inputs.on(area, type, event => { if (origin && (event as PointerEvent).pointerId === origin.id) { origin = null; release(); } });
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right' };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent, d = keys[e.code];
            if (e.code === 'Space') { e.preventDefault(); if (ready() && this.engine.special()) sound.playEffect('prop'); return; }
            if (d) { e.preventDefault(); if (!e.repeat) press(d); }
        });
        this.inputs.on(document, 'keyup', event => { if (keys[(event as KeyboardEvent).code]) release(); });
        const choose = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Pépites : creuser la terre, ramasser les pépites, gare aux rochers');
        if (new URLSearchParams(location.search).get('test') === '1') window.__PEPITES_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: TOP, width: W * CELL, height: H * CELL }),
            read: () => ({ ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
        };
        this.scale.refresh(); this.panels(); this.draw();
    }
    private advanceTest(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
        this.testManual = true; this.testAdvancing = true;
        try {
            if (!this.session.paused && !this.selecting) for (let i = 0; i < Math.ceil(ms / (1000 / 60)); i++) this.tick(Math.min(1000 / 60, ms - i * 1000 / 60));
        } finally { this.testAdvancing = false; this.tick(0); }
    }
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void { this.tick(this.testManual ? 0 : delta); }
    private tick(delta: number): void {
        const status = this.engine.status, turns = this.engine.state.turns;
        if (!this.selecting && !this.session.paused) this.engine.step(delta);
        if (this.engine.state.turns !== turns) {
            for (const e of this.engine.events) if (['nugget', 'push', 'fall', 'blast', 'sort', 'moss', 'open', 'dig', 'water'].includes(e)) sound.playEffect(e);
            if (this.engine.events.includes('blast') || this.engine.events.includes('open')) this.flash = 1;
        }
        if (status === 'playing' && this.engine.status === 'lost') this.hero.impact = 500;
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialTurns > 0);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'pepites'); sound.playEffect(this.engine.status);
        }
        this.flash = Math.max(0, this.flash - delta / 400);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state, m = mine(this.engine.level), open = this.engine.open;
        g.clear(); g.fillStyle(0x15110d); g.fillRect(0, 0, 360, 640);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const t = this.engine.at(x, y), px = x * CELL, py = TOP + y * CELL, cx = px + CELL / 2, cy = py + CELL / 2;
            if (t === '.') { g.fillStyle(0x6b4a2b); g.fillRect(px, py, CELL, CELL); g.fillStyle(0x7d5934); g.fillCircle(px + 8, py + 9, 2); g.fillCircle(px + 21, py + 20, 2); }
            else if (t === '#') { g.fillStyle(0x3b3f4a); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0x555a68); g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2); }
            else if (t === '=') { g.fillStyle(0x8a3f2c); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0x5c2a1d); g.lineBetween(px, py + 15, px + CELL, py + 15); g.lineBetween(px + 15, py, px + 15, py + 15); g.lineBetween(px + 7, py + 15, px + 7, py + CELL); }
            else if (t === 'o') { g.fillStyle(0x9a948a); g.fillCircle(cx, cy, 13); g.fillStyle(0xc2bcb1); g.fillCircle(cx - 4, cy - 4, 4); }
            else if (t === '*') { g.fillStyle(0xffd34d); g.fillTriangle(cx, cy - 12, cx - 11, cy, cx + 11, cy); g.fillStyle(0xf2a900); g.fillTriangle(cx, cy + 12, cx - 11, cy, cx + 11, cy); g.fillStyle(0xffffff, 0.7); g.fillCircle(cx - 3, cy - 4, 2); }
            else if (t === 'E') { g.fillStyle(open ? 0x64e4cc : 0x2c3a44); g.fillRoundedRect(px + 3, py + 3, CELL - 6, CELL - 6, 5); if (open) { g.lineStyle(2, 0xffffff, 0.5 + 0.5 * Math.sin(s.turns)); g.strokeRoundedRect(px + 3, py + 3, CELL - 6, CELL - 6, 5); } }
            else if (t === 'm') { const live = s.sorting > 0; g.fillStyle(live ? 0x7b5cff : 0x4a3d7a); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0xd8ccff, live ? 0.9 : 0.3); g.lineBetween(px + 4, py + 4, px + 26, py + 26); g.lineBetween(px + 26, py + 4, px + 4, py + 26); }
            else if (t === 'g') { g.fillStyle(0xffe680); g.fillCircle(cx, cy, 13); g.fillStyle(0xf2a900); g.fillCircle(cx + 3, cy + 3, 8); g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 5, cy - 5, 3); }
            else if (t === 'x') { g.fillStyle(0xc0392b); g.fillRoundedRect(px + 6, py + 4, 18, 22, 4); g.lineStyle(2, 0xffd34d); g.lineBetween(cx, py + 4, cx + 4, py); g.fillStyle(0xffffff); g.fillRect(px + 8, cy - 2, 14, 4); }
            else if (t === 'w') { g.fillStyle(0x2f7fd6, 0.85); g.fillRect(px, py, CELL, CELL); g.lineStyle(2, 0x9fd8ff, 0.7); g.lineBetween(px + 4, py + 10 + 2 * Math.sin(s.turns), px + 26, py + 10 - 2 * Math.sin(s.turns)); }
            else if (t === 'a') { g.fillStyle(0x3fbf5a); g.fillCircle(cx - 5, cy - 3, 8); g.fillCircle(cx + 6, cy + 2, 8); g.fillCircle(cx - 1, cy + 7, 6); }
        }
        for (const e of s.enemies) {
            const cx = e.x * CELL + 15, cy = TOP + e.y * CELL + 15;
            if (e.kind === 'f') { g.fillStyle(0xff8a3d); g.fillRect(cx - 10, cy - 10, 20, 20); g.fillStyle(0xfff1a8); g.fillRect(cx - 4, cy - 4, 8, 8); }
            else { g.fillStyle(0x7fd4ff); g.fillTriangle(cx, cy, cx - 12, cy - 10, cx - 12, cy + 10); g.fillTriangle(cx, cy, cx + 12, cy - 10, cx + 12, cy + 10); }
        }
        this.hero.draw(g, s.player.x * CELL - 3, TOP + s.player.y * CELL - 5, 36);
        if (this.engine.specialTurns > 0) { g.lineStyle(3, 0xffd34d, 0.8); g.strokeRect(1, TOP + 1, W * CELL - 2, H * CELL - 2); }
        if (this.flash) { g.fillStyle(0xffffff, this.flash * 0.2); g.fillRect(0, TOP, W * CELL, H * CELL); }
        const ending = this.engine.status === 'lost' ? ({ crushed: 'Écrasé !', caught: 'Attrapé !', blast: 'Explosion !', time: 'Temps écoulé !', drown: 'Noyé !' })[this.engine.reason ?? 'crushed'] : this.engine.status === 'won' ? 'Mine terminée !' : mineTip(this.engine.level);
        this.hud?.setText(`MINE ${String(this.engine.level + 1)}/30 · ${m.name.toUpperCase()}\nPÉPITES ${String(s.nuggets)}/${String(m.goal)}${open ? ' · SORTIE OUVERTE' : ''} · ⏱ ${String(Math.ceil(s.timeLeft / 1000))} s · SCORE ${String(s.score)}\nÉTAI ${String(this.engine.specialUses)}/1${this.engine.specialTurns ? ` · ${String(this.engine.specialTurns)} tours` : ''} · ${ending}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
