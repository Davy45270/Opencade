import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, W, H, mine, type Direction } from '../../engines/pepites/engine';
import { mineTip } from '../../engines/pepites/tips';
import { CELL, MINE_GROUND, TOP, creature, mineTile } from './art';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { swipeDirection } from '../../shell/gestures';
import { PlaySession } from '../../shell/pause';
import { setHud } from '../../shell/hud';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const pepitesButtons: readonly TouchButton[] = [
    // Drag then hold on the mine to dig; Étai is the only button.
    { id: 'pepites-special', label: 'Étai', ariaLabel: 'Étai : figer les rochers', size: 56, placement: 'right', mode: 'tap' },
];
export interface PepitesHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
}
declare global { interface Window { __PEPITES_TEST__?: PepitesHook } }
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
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('pepites');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('pepites'); delete window.__PEPITES_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(10, TOP + H * CELL + 8, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#e5f3ff', lineSpacing: 6 });
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
            fingerReceipts: receipts,
            read: () => ({ fingerInput: { paused: this.session.paused }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
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
        g.clear(); g.fillStyle(MINE_GROUND); g.fillRect(0, 0, 360, 640);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mineTile(g, this.engine.at(x, y), x * CELL, TOP + y * CELL, open, s.turns, s.sorting > 0);
        for (const e of s.enemies) creature(g, e.kind, e.x * CELL + 15, TOP + e.y * CELL + 15);
        this.hero.draw(g, s.player.x * CELL - 3, TOP + s.player.y * CELL - 5, 36);
        if (this.engine.specialTurns > 0) { g.lineStyle(3, 0xffd34d, 0.8); g.strokeRect(1, TOP + 1, W * CELL - 2, H * CELL - 2); }
        if (this.flash) { g.fillStyle(0xffffff, this.flash * 0.2); g.fillRect(0, TOP, W * CELL, H * CELL); }
        const ending = this.engine.status === 'lost' ? ({ crushed: 'Écrasé !', caught: 'Attrapé !', blast: 'Explosion !', time: 'Temps écoulé !', drown: 'Noyé !' })[this.engine.reason ?? 'crushed'] : this.engine.status === 'won' ? 'Mine terminée !' : mineTip(this.engine.level);
        setHud('left', [{ icon: '◆', value: `${String(s.nuggets)}/${String(m.goal)}`, label: 'Pépites' }]);
        setHud('center', [{ icon: '⏱', value: String(Math.ceil(s.timeLeft / 1000)), label: 'Temps' }]);
        setHud('right', [{ icon: '★', value: String(s.score), label: 'Score' }]);
        this.hud?.setText(`MINE ${String(this.engine.level + 1)}/30 · ${m.name.toUpperCase()}\nPÉPITES ${String(s.nuggets)}/${String(m.goal)}${open ? ' · SORTIE OUVERTE' : ''} · ⏱ ${String(Math.ceil(s.timeLeft / 1000))} s · SCORE ${String(s.score)}\nÉTAI ${String(this.engine.specialUses)}/1${this.engine.specialTurns ? ` · ${String(this.engine.specialTurns)} tours` : ''} · ${ending}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
