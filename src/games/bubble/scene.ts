import { GameCharacter } from '../../characters/game';
import { arcadeArt, emblems, liveries, launcherViews, launcherDrawing, aimBarrelDrawing } from '../../characters/arcade-art';
import { expressions } from '../../characters/model';
import { ArcadePaint } from '../../characters/arcade-phaser';
import { drawBubbleBackdrop } from './backdrop';
import { Settle, settleTarget } from './settle';
import { PlaySession } from '../../shell/pause';
import { bubbleButtons } from '../registry';
import Phaser from 'phaser';
import { sound } from '../../shell/services';
import { Inputs, renderTouchControls, keyboardControls } from '../../shell/input';
import { renderLevels } from '../../shell/levels';
import { renderPanels } from '../../shell/panels';
import { Engine, center, key, ORIGIN, ROW_STEP, LOSS_LINE, type Cell, type Color, type Point } from '../../engines/bubble/engine';
import { LEVELS } from '../../engines/bubble/levels';
import { Progression } from '../../shell/progression';
import { readSave, writeSave, type StoragePort } from '../../shell/storage';
const HINTS: Record<string, string> = {
    stone: 'Pierre : couper ses attaches', bomb: 'Bombe : éclate ses six voisins',
    rainbow: 'Anneau blanc : couleur touchée', ice: 'Glace : deux éclatements voisins',
    star: 'Étoiles : couper leurs attaches', bumper: 'Barres dorées : rebond intermédiaire',
    leaf: 'Feuille : balaie toute sa rangée', crystal: 'Cristal : fixe, retient ses voisines', prism: 'Prisme : rejoint toutes les couleurs',
};
/** Catalogue levels name what is new on their board. */
const CATALOGUE_HINTS: Record<string, string> = {
    P01: 'Jardin : grands groupes, aucun obstacle',
    P02: 'Verrou : un éclat voisin · Feuille : la rangée',
    P03: 'Cristal fixe · Prisme : toutes les couleurs',
};
/** What the last frame actually drew, for the E2E: guide segments, ghost opacities, attached bubble position. */
export interface Drawn { guide: number; ghost: { alpha: number; ring: number } | null; attached: Point | null; decor: string[]; icons: Record<'crystal' | 'prism' | 'leaf' | 'lock', number>; prismArcAlpha: number }
const onScreen = (p: Point): boolean => p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 640;
const GHOST_ALPHA = 0.35, GHOST_RING_ALPHA = 0.85;
interface Effect {
    cell: Cell;
    drops: number;
    age: number;
    fall: boolean;
}
export interface TestHook {
    art(): string[];
    load: (grid: Cell[], next?: Color, seed?: number) => void;
    setNext: (color: Color) => void;
    setSeed: (seed: number) => void;
    loadLevel: (index: number, seed?: number) => void;
    advance(ms: number): void;
    hudText(): string;
    visuals(): { guide: ReturnType<Engine['trace']>['segments']; falling: number; ghost: Cell | null; settling: Point | null; drawn: Drawn };
    usefulArea(): { x: number; y: number; width: number; height: number };
    lastAttached(): Cell | null;
    read: () => ReturnType<Engine['snapshot']> & { character: ReturnType<GameCharacter['snapshot']>; cumulativeScore: number; progression: string };
}
declare global {
    interface Window {
        __BUBBLE_TEST__?: TestHook;
    }
}
export class LabScene extends Phaser.Scene {
    private hero = new GameCharacter();
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
        this.effects = []; this.settle.clear();
        this.selecting = false;
        this.syncPanels();
    }
    private syncPanels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
    }
    private graphics?: Phaser.GameObjects.Graphics;
    private obstacles?: Phaser.GameObjects.Graphics;
    private paint?: ArcadePaint;
    private bubbleTextures: string[] = [];
    private launcherTextures = new Map<string, string>();
    private specialTexture = '';
    private barrelTexture = '';
    private hud?: Phaser.GameObjects.Text;
    private effects: Effect[] = [];
    /** Last attached bubble glides from its impact point to its socket (visual only). */
    private settle = new Settle();
    private drawn: Drawn = { guide: 0, ghost: null, attached: null, decor: [], icons: { crystal: 0, prism: 0, leaf: 0, lock: 0 }, prismArcAlpha: 0 };
    private frame: Drawn = this.drawn;
    constructor(private session = new PlaySession(false)) {
        super('lab');
    }
    create(): void {
        document.body.classList.add('bubble');
        try { this.storage = window.localStorage; } catch { /* Unavailable storage. */ }
        const cleanup = (): void => {
            this.paint?.destroy();
            this.inputs.dispose(); document.body.classList.remove('bubble');
            sound.stop();
            delete window.__BUBBLE_TEST__;
        };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        renderTouchControls(this.inputs, bubbleButtons, (id, held) => {
            if (!held || this.selecting || this.session.paused) return;
            if (id === 'bubble-special') this.engine.special();
            else if (id === 'touch-fire') this.engine.shoot();
            else if (id === 'touch-swap') this.engine.swap();
            else if (id === 'touch-mode') {
                this.tapToShoot = !this.tapToShoot;
                document.querySelector('#touch-mode')?.setAttribute('aria-pressed', String(this.tapToShoot));
            }
            else this.engine.aim(this.engine.angle + (id === 'touch-left' ? -0.08 : 0.08));
        });
        this.progress = new Progression(readSave(this.storage, 'bubble', LEVELS.length), LEVELS.length);
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
            this.progress.retry(); this.engine.restart(); this.effects = []; this.settle.clear(); this.syncPanels();
        });
        this.inputs.on(document.querySelector('#replay-level'), 'click', () => {
            this.progress.retry(); this.engine.restart(); this.effects = []; this.settle.clear(); this.syncPanels();
        });
        this.graphics = this.add.graphics();
        this.paint = new ArcadePaint(this, 256);
        const paint = this.paint;
        this.bubbleTextures = arcadeArt[this.hero.id].bubbles.map((list, color) => paint.texture(`bubble-${this.hero.id}-${String(color)}`, list, 80));
        for (const view of launcherViews) for (const expression of expressions) this.launcherTextures.set(`${view}-${expression}`, this.paint.texture(`launcher-${this.hero.id}-${view}-${expression}`, launcherDrawing(this.hero.id, view, expression), 192));
        const special = { panda: 'bao', pandaroux: 'feuille', dragon: 'feu', singe: 'banane', licorne: 'arc-en-ciel' } as const;
        this.specialTexture = this.paint.texture(`special-${this.hero.id}`, emblems[special[this.hero.id]]);
        this.barrelTexture = this.paint.texture(`barrel-${this.hero.id}`, aimBarrelDrawing(this.hero.id));
        this.obstacles = this.add.graphics().setDepth(3);
        this.hud = this.add.text(18, 482, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff' });
        this.hud.setDepth(4);
        this.add.text(266, 612, 'SUIVANTE', { fontFamily: 'system-ui', fontSize: '11px', color: '#e5f3ff' }).setDepth(4);
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
            // Commit the displayed guide. A finger can drift while lifting; the
            // release packet must not silently select a different rebound socket.
            if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15) this.engine.shoot();
        });
        this.input.on('pointerupoutside', () => { this.aimingPointer = null; });
        this.inputs.on(this.game.canvas, 'touchcancel', () => { this.aimingPointer = null; });
        keyboardControls(this.inputs, delta => { if (!this.session.paused && !this.selecting) this.engine.aim(this.engine.angle + delta); }, () => { if (!this.session.paused && !this.selecting) this.engine.shoot(); });
        this.inputs.on(document, 'keydown', (event: Event) => {
            if ((event as KeyboardEvent).code === 'KeyC' && !this.session.paused && !this.selecting) this.engine.special();
            if ((event as KeyboardEvent).code === 'KeyX' && !(event.target instanceof HTMLElement && event.target.closest('button')) && !this.session.paused && !this.selecting) this.engine.swap();
        });
        const restart = document.querySelector<HTMLButtonElement>('#restart');
        this.inputs.on(restart, 'click', () => {
            this.progress.retry();
            this.engine.restart();
            this.effects = []; this.settle.clear();
        });
        const canvas = this.game.canvas;
        canvas.setAttribute('aria-label', 'Aire de jeu Bubble Lab : glisser puis relâcher pour tirer ; souris : viser et cliquer');
        canvas.setAttribute('role', 'img');
        if (new URLSearchParams(location.search).get('test') === '1') {
            window.__BUBBLE_TEST__ = {
                art: () => this.paint?.keys() ?? [],
                advance: ms => { this.advanceTest(ms); },
                loadLevel: (index, seed) => { this.startLevel(index, seed, true); },
                load: (grid, next = 0, seed = this.engine.seed) => {
                    this.progress.retry();
                    this.engine.load(grid, next, seed);
                    this.effects = []; this.settle.clear();
                },
                setNext: (color) => {
                    this.engine.setNext(color);
                },
                setSeed: (seed) => {
                    this.engine.seed = seed;
                    this.progress.retry();
                    this.engine.restart();
                    this.effects = []; this.settle.clear();
                },
                hudText: () => this.hud?.text ?? '',
                lastAttached: () => this.engine.last.attached ? { ...this.engine.last.attached } : null,
                visuals: () => ({ guide: this.guide(), falling: this.effects.filter(e => e.fall).length, ghost: this.ghost(), settling: this.settling(), drawn: { ...this.drawn } }),
                usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
                read: () => ({ ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            };
        }
    }
    /** Whole aiming path up to the impact, so a finger covering the launcher still sees where it lands. */
    private guide(): ReturnType<Engine['trace']>['segments'] {
        return this.engine.status === 'playing' && !this.engine.flight ? this.engine.trace().segments : [];
    }
    /** Socket the current aim will fill: the same cell the engine attaches on release. */
    private ghost(): Cell | null {
        return this.engine.status === 'playing' && !this.engine.flight ? this.engine.trace().target : null;
    }
    private settling(): Point | null {
        const attached = this.engine.last.attached;
        return attached ? this.settle.point(key(attached)) : null;
    }
    /** Fixed crystal: a faceted ice-blue hexagon, never a colour bubble. */
    private drawCrystal(p: Point): void {
        const g = this.obstacles; if (!g) return;
        const pts = Array.from({ length: 6 }, (_, i) => ({ x: p.x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * 19, y: p.y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * 19 }));
        g.fillStyle(0x9fe8ff, 0.95); g.fillPoints(pts, true); if (onScreen(p)) this.frame.icons.crystal++;
        g.lineStyle(2, 0xffffff, 0.9); g.strokePoints(pts, true);
        g.lineStyle(1.5, 0x4aa8d8, 0.9); g.lineBetween(p.x, p.y - 19, p.x, p.y + 19); g.lineBetween(p.x - 16, p.y - 9, p.x + 16, p.y + 9);
    }
    /** Wild prism: a pale bubble wrapped in six rainbow arcs. */
    private drawPrism(p: Point): void {
        const g = this.obstacles; if (!g) return;
        g.fillStyle(0xf4f7ff, 0.95); g.fillCircle(p.x, p.y, 18); if (onScreen(p)) this.frame.icons.prism++;
        [0xff5a6e, 0xffa53d, 0xffe14d, 0x5fd86b, 0x4aa8ff, 0xa66bff].forEach((color, i) => {
            const alpha = 1; this.frame.prismArcAlpha = alpha;
            g.lineStyle(4, color, alpha); g.beginPath(); g.arc(p.x, p.y, 15, i * Math.PI / 3, (i + 1) * Math.PI / 3); g.strokePath();
        });
    }
    /** Leaf bubble: an autumn leaf with its vein over the colour. */
    private drawLeaf(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.leaf++;
        g.fillStyle(0xffb14a, 0.95); g.fillTriangle(p.x - 11, p.y + 9, p.x + 11, p.y - 9, p.x - 4, p.y - 6); g.fillTriangle(p.x - 11, p.y + 9, p.x + 11, p.y - 9, p.x + 5, p.y + 6);
        g.lineStyle(2, 0x7a3b12, 0.95); g.lineBetween(p.x - 12, p.y + 10, p.x + 11, p.y - 9);
    }
    /** P02 locked bubble: a padlock over the colour (same rule as one-layer ice). */
    private drawLock(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.lock++;
        g.lineStyle(3, 0xffe7a8, 1); g.beginPath(); g.arc(p.x, p.y - 4, 7, Math.PI, 0); g.strokePath();
        g.fillStyle(0xd9a441, 1); g.fillRoundedRect(p.x - 10, p.y - 4, 20, 15, 3);
        g.fillStyle(0x5a3a10, 1); g.fillCircle(p.x, p.y + 3, 2.5);
    }
    private bubble(x: number, y: number, color: Color, alpha = 1, scale = 1): void {
        const key = this.bubbleTextures[color];
        if (key) this.paint?.draw(key, x, y, 40 * scale, 0, alpha, 2);
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
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const drops = this.engine.drops;
        const impact = this.engine.flight?.trajectory.segments.at(-1)?.to;
        this.settle.advance(delta, this.selecting || this.session.paused);
        const result = this.selecting || this.session.paused ? null : this.engine.advance(delta);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(this.storage, this.progress.save);
        }
        if (!this.testAdvancing) this.syncPanels();
        if (result) {
            if (result.attached && result.popped.length === 0) this.hero.impact = 250;
            const socket = settleTarget(result, drops, this.engine.drops);
            if (result.attached && impact && socket) this.settle.start(key(result.attached), impact, socket); else this.settle.clear();
            if (result.popped.length) sound.playEffect('pop', result.popped.length);
            if (result.fallen.length) sound.playEffect('fall', result.fallen.length);
            this.effects.push(...result.popped.map(cell => ({ cell, drops, age: 0, fall: false })), ...result.fallen.map(cell => ({ cell, drops, age: 0, fall: true })));
            if (this.effects.length > 128) this.effects.splice(0, this.effects.length - 128);
        }
        this.hero.pose = Math.abs(this.engine.angle) > 0.2 ? 'profil' : 'face'; this.hero.flip = this.engine.angle < 0;
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialArmed || this.engine.specialMs > 0);
        if (this.testAdvancing) return;
        const g = this.graphics;
        if (!g)
            return;
        g.clear();
        this.obstacles?.clear();
        const drawn: Drawn = { guide: 0, ghost: null, attached: null, decor: [], icons: { crystal: 0, prism: 0, leaf: 0, lock: 0 }, prismArcAlpha: 0 };
        this.frame = drawn;
        const attachedKey = this.engine.last.attached ? key(this.engine.last.attached) : '';
        this.paint?.begin();
        drawn.decor = drawBubbleBackdrop(g, this.engine.level);
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
            g.lineStyle(3, 0xd7eaff, 0.7);
            for (const segment of this.guide()) {
                drawn.guide++;
                const length = Phaser.Math.Distance.BetweenPoints(segment.from, segment.to);
                for (let p = 0; p < length; p += 14) {
                    g.lineBetween(segment.from.x + segment.direction.x * p, segment.from.y + segment.direction.y * p, segment.from.x + segment.direction.x * Math.min(p + 5, length), segment.from.y + segment.direction.y * Math.min(p + 5, length));
                }
            }
        }
        const ghost = this.ghost();
        if (ghost) {
            const p = center(ghost, this.engine.drops);
            this.bubble(p.x, p.y, this.engine.next, GHOST_ALPHA);
            g.lineStyle(2, 0xffffff, GHOST_RING_ALPHA).strokeCircle(p.x, p.y, 19);
            drawn.ghost = { alpha: GHOST_ALPHA, ring: GHOST_RING_ALPHA };
        }
        g.lineStyle(8, 0xffb867);
        for (const bumper of this.engine.bumpers) g.lineBetween(bumper.x, bumper.top, bumper.x, bumper.bottom);
        for (const cell of this.engine.grid) {
            const p = this.settle.point(key(cell)) ?? center(cell, this.engine.drops);
            if (key(cell) === attachedKey) drawn.attached = { ...p };
            const catalogue = LEVELS[this.engine.level]?.catalogue;
            if (cell.kind === 'crystal') this.drawCrystal(p);
            else if (cell.kind === 'prism') this.drawPrism(p);
            else this.bubble(p.x, p.y, cell.color);
            if (cell.kind === 'leaf') this.drawLeaf(p);
            else if (cell.kind === 'ice' && catalogue === 'P02') this.drawLock(p);
            else if (cell.kind && cell.kind !== 'crystal' && cell.kind !== 'prism' && this.obstacles) {
                const g = this.obstacles;
                g.lineStyle(3, cell.kind === 'stone' ? 0x303b4c : 0xffffff);
                if (cell.kind === 'stone') { g.fillStyle(0x667080); g.fillRoundedRect(p.x - 13, p.y - 13, 26, 26, 5); }
                if (cell.kind === 'bomb') { g.fillStyle(0x263040); g.fillCircle(p.x, p.y, 10); g.lineBetween(p.x, p.y - 10, p.x + 8, p.y - 16); }
                if (cell.kind === 'ice') { g.strokeRect(p.x - 14, p.y - 14, 28, 28); if (cell.ice === 1) g.lineBetween(p.x - 12, p.y - 12, p.x + 12, p.y + 12); }
                if (cell.kind === 'star') {
                    g.lineBetween(p.x - 12, p.y, p.x + 12, p.y);
                    g.lineBetween(p.x, p.y - 12, p.x, p.y + 12);
                    g.lineBetween(p.x - 8, p.y - 8, p.x + 8, p.y + 8);
                    g.lineBetween(p.x + 8, p.y - 8, p.x - 8, p.y + 8);
                }
            }
        }
        for (const effect of this.effects) {
            effect.age += delta;
            // A bubble popped on arrival keeps gliding from its impact while it bursts.
            const t = effect.age / 650, p = (effect.fall ? null : this.settle.point(key(effect.cell))) ?? center(effect.cell, effect.drops);
            this.bubble(p.x + (effect.fall ? Math.sin(t * 5) * 12 : 0), p.y + (effect.fall ? t * t * 250 : 0), effect.cell.color, Math.max(0, 1 - t), effect.fall ? 1 : 1 + t * 0.7);
            if (!effect.fall && key(effect.cell) === attachedKey) drawn.attached = { ...p };
        }
        this.effects = this.effects.filter(e => e.age < 650);
        this.drawn = drawn;
        const view = this.engine.flight ? 'tir' : this.engine.angle < -.3 ? 'gauche' : this.engine.angle > .3 ? 'droite' : 'face';
        const launcher = this.launcherTextures.get(`${view}-${this.hero.expression}`);
        if (launcher) this.paint?.draw(launcher, 157, 579, 126);
        // The articulated muzzle follows the exact aim; the loaded bubble stays at the physical origin.
        const livery = liveries[this.hero.id];
        this.paint?.draw(this.barrelTexture, ORIGIN.x, ORIGIN.y, 106, this.engine.angle, 1, 1.5);
        if (!this.engine.flight)
            this.bubble(ORIGIN.x, ORIGIN.y, this.engine.next);
        if (this.engine.rainbow && !this.engine.flight) {
            this.obstacles?.lineStyle(3, 0xffffff).strokeCircle(ORIGIN.x, ORIGIN.y, 22);
        }
        if (this.engine.specialArmed || this.engine.specialMs > 0) {
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const moving = reduced ? 0 : this.hero.time / 650;
            const target = this.engine.flight?.trajectory.target;
            const impact = target ? center(target, this.engine.drops) : { x: 180, y: 552 };
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + moving;
                let x = impact.x + Math.cos(a) * 55, y = impact.y + Math.sin(a) * 38, size = 28;
                if (this.hero.id === 'panda') { x = 32 + i * 59; y = 152 + (i % 3) * 42 + (reduced ? 0 : (moving * 55) % 95); }
                if (this.hero.id === 'dragon') { x = impact.x + Math.cos(a) * (25 + i * 7); y = impact.y + Math.sin(a) * (25 + i * 7); size = i === 0 ? 58 : 26; }
                if (this.hero.id === 'singe') { x = 35 + i * 58; y = 415 + Math.sin(a) * 20; }
                if (this.hero.id === 'licorne') { x = impact.x; y = impact.y - 40; size = 112; if (i > 0) continue; }
                this.paint?.draw(this.specialTexture, x, y, size, reduced || this.hero.id === 'licorne' ? 0 : a, .8, 1.8);
            }
        }
        const projectile = this.engine.projectile();
        if (projectile && this.engine.flight)
            this.bubble(projectile.x, projectile.y, this.engine.flight.color);
        this.bubble(300, 585, this.engine.queued, 0.9, 0.8);
        const mechanic = LEVELS[this.engine.level]?.mechanics?.at(-1), catalogue = LEVELS[this.engine.level]?.catalogue;
        const hint = catalogue ? CATALOGUE_HINTS[catalogue] ?? '' : mechanic ? HINTS[mechanic] ?? '' : '';
        this.hud?.setText(`NIVEAU ${String(this.engine.level + 1)} · ${LEVELS[this.engine.level]?.name ?? ''}\nDESCENTE ${String(this.engine.shotsBeforeDrop ?? '—')} · ${LEVELS[this.engine.level]?.mechanics?.includes('star') ? 'LIBÉRER LES ÉTOILES' : 'VIDER LE PLAFOND'}\nJOKER ${String(this.engine.specialUses)}/1${this.engine.specialArmed ? ' · prêt' : ''} · SCORE ${String(this.engine.score)}\n${livery.joker} · TIRS ${String(this.engine.shots)}\n${hint}`);
        const status = document.querySelector('#status');
        const text = `Score : ${String(this.engine.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
        if (status && status.textContent !== text)
            status.textContent = text;
    }
}
