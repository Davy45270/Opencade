import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { arcadeArt, emblems, liveries, launcherViews, launcherDrawing, aimBarrelDrawing } from '../../characters/arcade-art';
import { expressions } from '../../characters/model';
import { ArcadePaint } from '../../characters/arcade-phaser';
import { bubbleBackdropKey, drawBubbleBackdrop } from './backdrop';
import { Settle, settleTarget } from './settle';
import { MOBILE_PLAY, PlaySession } from '../../shell/pause';
import { setBrief, setHud } from '../../shell/hud';
import { bubbleButtons } from '../registry';
import Phaser from 'phaser';
import { sound } from '../../shell/services';
import { Inputs, renderTouchControls } from '../../shell/input';
import { renderLevels } from '../../shell/levels';
import { renderPanels } from '../../shell/panels';
import { CANCEL_RADIUS, touchAim, type TouchAim } from './aiming';
import { Engine, center, key, ORIGIN, ROW_STEP, LOSS_LINE, type Cell, type Color, type Point } from '../../engines/bubble/engine';
import { LEVELS } from '../../engines/bubble/levels';
import { Progression } from '../../shell/progression';
import { readSave, writeSave, type StoragePort } from '../../shell/storage';
import { PRISM_MARK, SPECIAL, SPECIALS, SpecialTips, canvasGraphics, cellSpecial, drawGlyph, type SpecialId } from './specials';
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
/** David's marbles: one per engine colour, then the wild prism. The disc fills the texture edge to edge. */
const COLOR_MARBLES = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'] as const;
const MARBLE_KEYS = [...COLOR_MARBLES, 'prism'] as const;
const MARBLE_SIZE = 38;
/** Legend: the glyphs that ride on a colour are shown on the plain blue marble. */
const LEGEND_BASE = 'c5';
const marbleKey = (name: string): string => `bubble-marble-${name}`;
/** Level list tiers of ten, named after their scenery. */
const TIER_NAMES = ['Atelier', 'Lucioles', 'Dégel', 'Jungle', 'Automne', 'Volcan', 'Cirque', 'Ciel', 'Jungle de nuit', 'Automne tardif', 'Mont de feu', 'Cirque de nuit', 'Ciel profond'] as const;
export interface Drawn { lossLine: 'calm' | 'danger'; culprits: number; sling: boolean; cancel: boolean; guide: number; ghost: { alpha: number; ring: number } | null; attached: Point | null; decor: string[]; icons: Record<'crystal' | 'prism' | 'leaf' | 'lock', number>; prismArcAlpha: number; specials: Partial<Record<SpecialId, number>> }
const onScreen = (p: Point): boolean => p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 640;
const GHOST_ALPHA = 0.35, GHOST_RING_ALPHA = 0.85;
interface Effect {
    cell: Cell;
    drops: number;
    age: number;
    fall: boolean;
}
export interface TestHook {
    performance(): { frames: number; gameMs: number };
    art(): string[];
    /** True once David's drawn marbles are loaded (the code drawings stand in until then). */
    marbles(): boolean;
    load: (grid: Cell[], next?: Color, seed?: number) => void;
    setNext: (color: Color) => void;
    setSeed: (seed: number) => void;
    loadLevel: (index: number, seed?: number) => void;
    advance(ms: number): void;
    hudText(): string;
    /** First-time tip on screen (one line), or null. */
    specialTip(): string | null;
    visuals(): { guide: ReturnType<Engine['trace']>['segments']; falling: number; ghost: Cell | null; settling: Point | null; drawn: Drawn };
    usefulArea(): { x: number; y: number; width: number; height: number };
    lastAttached(): Cell | null;
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read: () => ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean; aimingPointer: number | null }; character: ReturnType<GameCharacter['snapshot']>; cumulativeScore: number; progression: string };
}
declare global {
    interface Window {
        __BUBBLE_TEST__?: TestHook;
    }
}
/** Next (queued) bubble: tap it to swap; the reach makes a ≥ 56 px target on the Fold cover screen. */
const NEXT = { x: 300, y: 585 }, NEXT_REACH = 42;
/** Features drawn in each baked scenery texture (textures outlive a scene restart, so this map does too). */
const decorFeatures = new Map<string, string[]>();
export class LabScene extends Phaser.Scene {
    private backdropImage?: Phaser.GameObjects.Image;
    private hero = new GameCharacter();
    private engine = new Engine();
    private progress = new Progression();
    private storage?: StoragePort;
    private selecting = false;
    private tapToShoot = false;
    private aimingPointer: number | null = null;
    /** What the aiming finger does now (touch only), and where it pulls the sling. */
    private aimMode: TouchAim['mode'] | null = null;
    private pull: Point | null = null;
    private cancelElement?: HTMLElement;
    private reasonElement?: HTMLElement;
    private testManual = false;
    private testAdvancing = false;
    private inputs = new Inputs();
    private tips = new SpecialTips(() => this.storage);
    private tipElement?: HTMLElement;
    private startLevel(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh);
        this.engine.loadLevel(index, seed);
        this.effects = []; this.settle.clear(); this.tips.clear();
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
    /** David's marbles: colour textures, the wild prism, and their decoded images for the legend. */
    private marbleTextures: string[] = [];
    private prismTexture = '';
    private marbleImages: Partial<Record<'base' | 'prism', HTMLImageElement>> = {};
    private legend?: HTMLElement;
    private alive = true;
    private launcherTextures = new Map<string, string>();
    private specialTexture = '';
    private barrelTexture = '';
    private hud?: Phaser.GameObjects.Text;
    private effects: Effect[] = [];
    /** Last attached bubble glides from its impact point to its socket (visual only). */
    private settle = new Settle();
    private drawn: Drawn = { lossLine: 'calm', culprits: 0, sling: false, cancel: false, guide: 0, ghost: null, attached: null, decor: [], icons: { crystal: 0, prism: 0, leaf: 0, lock: 0 }, prismArcAlpha: 0, specials: {} };
    private frame: Drawn = this.drawn;
    constructor(private session = new PlaySession(false)) {
        super('lab');
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('bubble');
        try { this.storage = window.localStorage; } catch { /* Unavailable storage. */ }
        this.tips = new SpecialTips(() => this.storage);
        const legend = this.mountSpecials(); this.legend = legend; this.mountCues();
        const cleanup = (): void => {
            this.alive = false;
            this.paint?.destroy();
            this.inputs.dispose(); document.body.classList.remove('bubble');
            legend?.remove(); this.tipElement?.remove(); this.tipElement = undefined;
            this.cancelElement?.remove(); this.reasonElement?.remove(); this.cancelElement = this.reasonElement = undefined;
            document.querySelector('#level-tiers')?.remove(); document.querySelector('#level-list')?.classList.remove('grouped');
            sound.stop();
            delete window.__BUBBLE_TEST__;
        };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        renderTouchControls(this.inputs, bubbleButtons, (id, held) => {
            if (!held) return;
            // A setting, changed from the pause page.
            if (id === 'touch-mode') {
                this.tapToShoot = !this.tapToShoot;
                document.querySelector('#touch-mode')?.setAttribute('aria-pressed', String(this.tapToShoot));
                return;
            }
            if (this.selecting || this.session.paused) return;
            if (id === 'bubble-special') this.engine.special();
        });
        document.querySelector('#touch-mode')?.setAttribute('aria-pressed', 'false');
        this.progress = new Progression(readSave(this.storage, 'bubble', LEVELS.length), LEVELS.length);
        const showLevels = (): void => {
            this.selecting = !this.selecting;
            // 130 levels: tabs of ten, opened on the tier of the next level to play.
            renderLevels(LEVELS, this.progress.save, index => { this.startLevel(index, undefined, true); },
                { size: 10, names: TIER_NAMES, current: Math.min(LEVELS.length - 1, this.progress.save.unlocked - 1) });
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
        this.loadMarbles();
        this.barrelTexture = this.paint.texture(`barrel-${this.hero.id}`, aimBarrelDrawing(this.hero.id));
        this.obstacles = this.add.graphics().setDepth(3);
        this.hud = this.add.text(18, 482, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff' });
        this.hud.setDepth(4);
        const nextLabel = this.add.text(266, 612, 'SUIVANTE', { fontFamily: 'system-ui', fontSize: '11px', color: '#e5f3ff' }).setDepth(4);
        // Touch play: the canvas text would render at 6-8 px over the trajectory; the DOM HUD and
        // the pause page carry it instead (the text keeps updating for hudText()).
        const mobile = matchMedia(MOBILE_PLAY);
        const placeHud = (): void => { this.hud?.setVisible(!mobile.matches); nextLabel.setVisible(!mobile.matches); };
        this.inputs.on(mobile, 'change', placeHud);
        placeHud();
        const aim = (pointer: Phaser.Input.Pointer): void => {
            if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15)
                this.engine.aim(Math.atan2(pointer.x - ORIGIN.x, ORIGIN.y - pointer.y));
        };
        // Touch: above the launcher the finger points at the target; below it the finger pulls a sling
        // (the board stays visible); released on the launcher, the shot is cancelled, and it says so.
        const touchMove = (pointer: Phaser.Input.Pointer): void => {
            if (this.session.paused || this.selecting) return;
            const aimed = touchAim(pointer);
            this.aimMode = aimed.mode;
            this.pull = aimed.mode === 'pull' ? { x: pointer.x, y: pointer.y } : null;
            if ('angle' in aimed) this.engine.aim(aimed.angle);
        };
        const endTouch = (): void => { this.aimingPointer = null; this.aimMode = null; this.pull = null; };
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.wasTouch) aim(pointer);
            else if (this.aimingPointer === pointer.id) touchMove(pointer);
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.aimingPointer !== null) return;
            // Tapping the next bubble swaps it (below the aiming line, so no shot is lost).
            if (!this.session.paused && !this.selecting && Math.hypot(pointer.x - NEXT.x, pointer.y - NEXT.y) <= NEXT_REACH) { this.engine.swap(); return; }
            if (!this.session.paused && !this.selecting && pointer.wasTouch && !this.tapToShoot) {
                this.aimingPointer = pointer.id;
                touchMove(pointer);
            } else if (!this.session.paused && !this.selecting && pointer.y < ORIGIN.y - 15) {
                aim(pointer);
                this.engine.shoot();
            }
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.aimingPointer !== pointer.id) return;
            const cancelled = this.aimMode === 'cancel' || touchAim(pointer).mode === 'cancel';
            endTouch();
            // Commit the displayed guide. A finger can drift while lifting; the
            // release packet must not silently select a different rebound socket.
            if (!this.session.paused && !this.selecting && !cancelled) this.engine.shoot();
        });
        this.input.on('pointerupoutside', endTouch);
        this.inputs.on(this.game.canvas, 'touchcancel', endTouch);
        // Arrows turn the launcher by 0.08 rad; Shift + arrows and the wheel jump to the next socket.
        const fineAim = (dir: 1 | -1): void => { if (!this.session.paused && !this.selecting && !this.engine.flight) this.engine.aim(this.engine.nextSocketAngle(dir)); };
        this.inputs.on(document, 'keydown', (event: Event) => {
            const k = event as KeyboardEvent;
            if (k.target instanceof HTMLElement && k.target.closest('button')) return;
            if (['ArrowLeft', 'ArrowRight', 'Space'].includes(k.code)) k.preventDefault();
            const dir = k.code === 'ArrowLeft' ? -1 : k.code === 'ArrowRight' ? 1 : 0;
            if (dir && k.shiftKey) fineAim(dir);
            else if (dir && !this.session.paused && !this.selecting) this.engine.aim(this.engine.angle + dir * 0.08);
            if (k.code === 'Space' && !this.session.paused && !this.selecting) this.engine.shoot();
        });
        this.inputs.on(this.game.canvas, 'wheel', (event: Event) => {
            const wheel = event as WheelEvent;
            if (!wheel.deltaY || this.session.paused || this.selecting) return;
            wheel.preventDefault();
            fineAim(wheel.deltaY > 0 ? 1 : -1);
        }, { passive: false });
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
        canvas.setAttribute('aria-label', 'Aire de jeu Bubble Lab : glisser puis relâcher pour tirer, ou tirer en arrière sous le lanceur ; relâcher sur le lanceur annule ; souris : viser et cliquer');
        canvas.setAttribute('role', 'img');
        if (new URLSearchParams(location.search).get('test') === '1') {
            window.__BUBBLE_TEST__ = {
            ...fingerProof,
                // Draws the current state first: a board loaded by the hook is reported even before the next animation frame.
                art: () => { this.tick(0); return this.paint?.keys() ?? []; },
                marbles: () => this.marbleTextures.length === COLOR_MARBLES.length && Boolean(this.prismTexture),
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
                specialTip: () => this.tips.current ? SPECIAL[this.tips.current].line : null,
                lastAttached: () => this.engine.last.attached ? { ...this.engine.last.attached } : null,
                visuals: () => ({ guide: this.guide(), falling: this.effects.filter(e => e.fall).length, ghost: this.ghost(), settling: this.settling(), drawn: { ...this.drawn } }),
                usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
                performance: () => ({ frames: this.game.loop.frame, gameMs: this.hero.time }),
                fingerReceipts: receipts,
                read: () => ({ fingerInput: { paused: this.session.paused, aimingPointer: this.aimingPointer }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            };
        }
    }
    /** Touch play: level, score and drop countdown in the DOM HUD; goal and tip in the pause page; Joker stock as a badge. */
    private touchHud(hint: string): void {
        const level = LEVELS[this.engine.level];
        setHud('left', [{ icon: 'N', value: String(this.engine.level + 1), label: `Niveau ${String(this.engine.level + 1)}` }]);
        setHud('center', [{ icon: '★', value: String(this.engine.score), label: 'Score' }]);
        setHud('right', [{ icon: '↓', value: String(this.engine.shotsBeforeDrop ?? '—'), label: 'Tirs avant la descente' }]);
        setBrief([`${level?.name ?? ''} : ${level?.mechanics?.includes('star') ? 'libérer les étoiles' : 'vider le plafond'}.`, hint].filter(Boolean).join(' '));
        const joker = document.querySelector('#bubble-special');
        if (joker) {
            const count = String(this.engine.specialUses);
            if (joker.getAttribute('data-count') !== count) joker.setAttribute('data-count', count);
            const armed = String(this.engine.specialArmed);
            if (joker.getAttribute('aria-pressed') !== armed) joker.setAttribute('aria-pressed', armed);
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
    /** Fixed crystal: a faceted hexagon, never a colour bubble. */
    private drawCrystal(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.crystal++;
        drawGlyph(g, SPECIAL.crystal.glyph, p.x, p.y);
    }
    /** Wild prism: a pale bubble wrapped in six rainbow segments around a dark sparkle. */
    private drawPrism(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.prism++;
        this.frame.prismArcAlpha = 1;
        if (this.prismTexture) { this.paint?.draw(this.prismTexture, p.x, p.y, MARBLE_SIZE, 0, 1, 2); drawGlyph(g, PRISM_MARK, p.x, p.y); }
        else drawGlyph(g, SPECIAL.prism.glyph, p.x, p.y);
    }
    /** Leaf bubble: an outlined leaf with arrows to both sides (it sweeps its row). */
    private drawLeaf(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.leaf++;
        drawGlyph(g, SPECIAL.leaf.glyph, p.x, p.y);
    }
    /** P02 locked bubble: an outlined padlock over the colour (same rule as one-layer ice). */
    private drawLock(p: Point): void {
        const g = this.obstacles; if (!g) return;
        if (onScreen(p)) this.frame.icons.lock++;
        drawGlyph(g, SPECIAL.lock.glyph, p.x, p.y);
    }
    /** The cancel label near the launcher and the reason line of the defeat screen. */
    private mountCues(): void {
        const area = document.querySelector('#play-area');
        if (area) {
            const cancel = document.createElement('p');
            cancel.id = 'bubble-cancel'; cancel.setAttribute('role', 'status'); cancel.hidden = true; cancel.textContent = 'Relâchez ici pour annuler';
            cancel.style.cssText = 'position:absolute;z-index:3;left:50%;transform:translate(-50%,-100%);margin:0;padding:6px 12px;white-space:nowrap;pointer-events:none;'
                + 'background:#10161ff0;color:#fff;border:2px solid #ff3b5c;border-radius:18px;font:600 14px/1.2 system-ui,sans-serif;box-shadow:0 2px 8px #0008';
            area.append(cancel); this.cancelElement = cancel;
        }
        const title = document.querySelector('#result-title');
        if (title) {
            const reason = document.createElement('p');
            reason.id = 'result-reason'; reason.hidden = true;
            title.after(reason); this.reasonElement = reason;
        }
    }
    /** Sling band, cancel ring and label, and the bubbles that lost the game. */
    private drawCues(drawn: Drawn): void {
        const g = this.obstacles, aiming = this.engine.status === 'playing' && !this.engine.flight;
        if (g && aiming && this.pull) {
            g.lineStyle(3, 0xffd23f, 0.9).lineBetween(ORIGIN.x, ORIGIN.y, this.pull.x, this.pull.y);
            g.fillStyle(0xffd23f, 0.9).fillCircle(this.pull.x, this.pull.y, 6);
            drawn.sling = true;
        }
        drawn.cancel = aiming && this.aimMode === 'cancel';
        if (g && drawn.cancel) g.lineStyle(3, 0xff3b5c, 1).strokeCircle(ORIGIN.x, ORIGIN.y, CANCEL_RADIUS);
        const label = this.cancelElement;
        if (label && label.hidden === drawn.cancel) {
            label.hidden = !drawn.cancel;
            const canvas = this.game.canvas.getBoundingClientRect(), area = label.parentElement?.getBoundingClientRect();
            if (area) label.style.top = `${String(canvas.top - area.top + (ORIGIN.y - CANCEL_RADIUS - 8) * canvas.height / 640)}px`;
        }
        const culprits = this.engine.status === 'lost' ? this.engine.culprits() : [];
        if (g) for (const cell of culprits) {
            const p = center(cell, this.engine.drops);
            g.lineStyle(4, 0xff3b5c, 1).strokeCircle(p.x, p.y, 23);
        }
        drawn.culprits = culprits.length;
        const reason = this.reasonElement;
        if (reason) {
            const text = this.engine.status !== 'lost' ? '' : culprits.length ? 'Une bulle a franchi la ligne (entourée en rouge).' : 'Plus aucune place pour tirer.';
            if (reason.textContent !== text) { reason.textContent = text; reason.hidden = !text; }
        }
    }
    /** Pause legend (game menu, which is the pause page on touch screens) and the first-time tip bubble. */
    private mountSpecials(): HTMLElement | undefined {
        const area = document.querySelector('#play-area');
        if (area) {
            const tip = document.createElement('p');
            tip.id = 'bubble-tip'; tip.setAttribute('role', 'status'); tip.hidden = true;
            tip.style.cssText = 'position:absolute;z-index:3;top:58px;left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);box-sizing:border-box;margin:0;padding:6px 12px;'
                + 'display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;'
                + 'background:#10161ff0;color:#fff;border:2px solid #ffd23f;border-radius:18px;font:600 14px/1.2 system-ui,sans-serif;box-shadow:0 2px 8px #0008';
            area.append(tip); this.tipElement = tip;
        }
        const menu = document.querySelector('#game-menu');
        if (!menu) return undefined;
        const legend = document.createElement('section');
        legend.id = 'bubble-legend'; legend.setAttribute('aria-label', 'Billes spéciales');
        legend.style.cssText = 'grid-column:1/-1;order:1;margin:4px;padding:6px 8px;border:1px solid #64e4cc88;border-radius:10px;background:#0d1a29cc;color:#e5f3ff;font:14px/1.2 system-ui,sans-serif';
        const title = document.createElement('h3');
        title.textContent = 'Billes spéciales'; title.style.cssText = 'margin:0 0 4px;font-size:15px';
        legend.append(title);
        for (const special of SPECIALS) {
            const row = document.createElement('p');
            row.setAttribute('data-special', special.id);
            row.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:2px 0;text-align:left';
            row.append(specialIcon(special.id, 30));
            const text = document.createElement('span'); text.textContent = special.line; text.style.cssText = 'flex:1;min-width:0';
            row.append(text); legend.append(row);
        }
        menu.append(legend);
        return legend;
    }
    /** Specials on screen now: board cells, the rainbow shot and the bumpers. */
    private presentSpecials(): SpecialId[] {
        const catalogue = LEVELS[this.engine.level]?.catalogue, found = new Set<SpecialId>();
        for (const cell of this.engine.grid) { const id = cellSpecial(cell, catalogue); if (id) found.add(id); }
        if (this.engine.rainbow) found.add('rainbow');
        if (this.engine.bumpers.length) found.add('bumper');
        return SPECIALS.map(s => s.id).filter(id => found.has(id));
    }
    private syncTip(delta: number): void {
        // A tip never outlives play: it goes with the end screen, it waits during a pause.
        if (this.engine.status !== 'playing' || this.selecting) this.tips.clear();
        const playing = this.engine.status === 'playing' && !this.selecting && !this.session.paused;
        const id = playing || this.tips.current ? this.tips.update(playing ? this.presentSpecials() : [], playing ? delta : 0) : null;
        const tip = this.tipElement; if (!tip) return;
        const text = id ? SPECIAL[id].line : '';
        if (tip.getAttribute('data-special') === (id ?? '')) return;
        tip.setAttribute('data-special', id ?? '');
        tip.replaceChildren();
        if (id) { tip.append(specialIcon(id, 28, this.marbleImages)); const span = document.createElement('span'); span.textContent = text; tip.append(span); }
        tip.hidden = !id;
    }
    private bubble(x: number, y: number, color: Color, alpha = 1, scale = 1): void {
        const marble = this.marbleTextures[color], key = marble ?? this.bubbleTextures[color];
        if (key) this.paint?.draw(key, x, y, (marble ? MARBLE_SIZE : 40) * scale, 0, alpha, 2);
    }
    /** David's marbles arrive in their own chunk; the code drawings stand in until they are loaded. */
    private loadMarbles(): void {
        const ready = (): void => {
            if (!MARBLE_KEYS.every(name => this.textures.exists(marbleKey(name)))) return;
            this.marbleTextures = COLOR_MARBLES.map(marbleKey); this.prismTexture = marbleKey('prism');
            const image = (name: string): HTMLImageElement | undefined => {
                const source = this.textures.get(marbleKey(name)).getSourceImage();
                return source instanceof HTMLImageElement ? source : undefined;
            };
            this.marbleImages = { base: image(LEGEND_BASE), prism: image('prism') };
            this.refreshLegend();
        };
        if (MARBLE_KEYS.every(name => this.textures.exists(marbleKey(name)))) { ready(); return; }
        // Decoded outside the scene loader: the scene waits paused on its start banner, and the loader only runs in update.
        void import('./marbles').then(({ marbles }) => Promise.all(MARBLE_KEYS.map(async name => {
            const url = marbles[name]; if (!url) return;
            const image = new Image(); image.src = url; await image.decode();
            if (!this.textures.exists(marbleKey(name))) this.textures.addImage(marbleKey(name), image);
        }))).then(() => { if (this.alive) ready(); }).catch(() => undefined);
    }
    /** Legend icons drawn again on David's marbles once they are loaded. */
    private refreshLegend(): void {
        for (const row of this.legend?.querySelectorAll<HTMLElement>('[data-special]') ?? []) {
            const id = row.getAttribute('data-special') as SpecialId | null;
            if (id && id in SPECIAL) row.querySelector('img')?.replaceWith(specialIcon(id, 30, this.marbleImages));
        }
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
        this.syncTip(delta);
        if (this.testAdvancing) return;
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const g = this.graphics;
        if (!g)
            return;
        g.clear();
        this.obstacles?.clear();
        const drawn: Drawn = { lossLine: 'calm', culprits: 0, sling: false, cancel: false, guide: 0, ghost: null, attached: null, decor: [], icons: { crystal: 0, prism: 0, leaf: 0, lock: 0 }, prismArcAlpha: 0, specials: {} };
        this.frame = drawn;
        const attachedKey = this.engine.last.attached ? key(this.engine.last.attached) : '';
        this.paint?.begin();
        // Scenery is baked once per world (and catalogue board) and shown as a single image.
        const decorKey = bubbleBackdropKey(this.engine.level);
        if (!this.textures.exists(decorKey)) { const b = this.make.graphics({}, false); decorFeatures.set(decorKey, drawBubbleBackdrop(b, this.engine.level)); b.generateTexture(decorKey, 360, 640); b.destroy(); }
        this.backdropImage ??= this.add.image(0, 0, decorKey).setOrigin(0).setDepth(-1);
        this.backdropImage.setTexture(decorKey);
        drawn.decor = [...(decorFeatures.get(decorKey) ?? [])];
        g.lineStyle(2, 0x64e4cc, 0.6);
        g.lineBetween(0, 0, 0, 455);
        g.lineBetween(359, 0, 359, 455);
        const ceiling = this.engine.drops * ROW_STEP;
        g.fillStyle(0x24415a, 0.75);
        g.fillRect(0, 0, 360, ceiling);
        g.lineBetween(0, ceiling + 1, 360, ceiling + 1);
        // The loss line blinks red while a bubble is one row from it (steady red without motion).
        const danger = this.engine.danger();
        drawn.lossLine = danger ? 'danger' : 'calm';
        if (danger) g.lineStyle(3, 0xff3b5c, still ? 1 : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.hero.time / 110)));
        else g.lineStyle(2, 0xf080ab, 0.65);
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
        // Bumpers: outlined striped bars, readable by their shape alone.
        for (const bumper of this.engine.bumpers) {
            g.fillStyle(0xffb867); g.fillRoundedRect(bumper.x - 5, bumper.top, 10, bumper.bottom - bumper.top, 4);
            g.lineStyle(2, 0x10161f); g.strokeRoundedRect(bumper.x - 5, bumper.top, 10, bumper.bottom - bumper.top, 4);
            for (let y = bumper.top + 10; y < bumper.bottom - 4; y += 12) g.lineBetween(bumper.x - 4, y + 4, bumper.x + 4, y - 2);
            drawn.specials.bumper = (drawn.specials.bumper ?? 0) + 1;
        }
        for (const cell of this.engine.grid) {
            const p = this.settle.point(key(cell)) ?? center(cell, this.engine.drops);
            if (key(cell) === attachedKey) drawn.attached = { ...p };
            const catalogue = LEVELS[this.engine.level]?.catalogue, id = cellSpecial(cell, catalogue);
            if (id && onScreen(p)) drawn.specials[id] = (drawn.specials[id] ?? 0) + 1;
            if (cell.kind === 'crystal') this.drawCrystal(p);
            else if (cell.kind === 'prism') this.drawPrism(p);
            else this.bubble(p.x, p.y, cell.color);
            if (cell.kind === 'leaf') this.drawLeaf(p);
            else if (cell.kind === 'ice' && catalogue === 'P02') this.drawLock(p);
            else if (id && id !== 'crystal' && id !== 'prism' && this.obstacles) drawGlyph(this.obstacles, SPECIAL[id].glyph, p.x, p.y, still ? 0 : this.hero.time);
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
            if (this.obstacles) drawGlyph(this.obstacles, SPECIAL.rainbow.glyph, ORIGIN.x, ORIGIN.y, still ? 0 : this.hero.time);
            drawn.specials.rainbow = 1;
        }
        if (this.engine.specialArmed || this.engine.specialMs > 0) {
            const reduced = still;
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
        this.drawCues(drawn);
        const projectile = this.engine.projectile();
        if (projectile && this.engine.flight)
            this.bubble(projectile.x, projectile.y, this.engine.flight.color);
        this.bubble(NEXT.x, NEXT.y, this.engine.queued, 0.9, 0.8);
        const mechanic = LEVELS[this.engine.level]?.mechanics?.at(-1), catalogue = LEVELS[this.engine.level]?.catalogue;
        const hint = catalogue ? CATALOGUE_HINTS[catalogue] ?? '' : mechanic ? HINTS[mechanic] ?? '' : '';
        this.hud?.setText(`NIVEAU ${String(this.engine.level + 1)} · ${LEVELS[this.engine.level]?.name ?? ''}\nDESCENTE ${String(this.engine.shotsBeforeDrop ?? '—')} · ${LEVELS[this.engine.level]?.mechanics?.includes('star') ? 'LIBÉRER LES ÉTOILES' : 'VIDER LE PLAFOND'}\nJOKER ${String(this.engine.specialUses)}/1${this.engine.specialArmed ? ' · prêt' : ''} · SCORE ${String(this.engine.score)}\n${livery.joker} · TIRS ${String(this.engine.shots)}\n${hint}`);
        this.touchHud(hint);
        const status = document.querySelector('#status');
        const text = `Score : ${String(this.engine.score)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
        if (status && status.textContent !== text)
            status.textContent = text;
    }
}
/**
 * A legend icon: the glyph drawn on a detached 2D canvas (a neutral bubble under the glyphs that ride
 * on a colour), shown as an image so the play canvas stays the only canvas of the page.
 */
function specialIcon(id: SpecialId, size: number, marbles: Partial<Record<'base' | 'prism', HTMLImageElement>> = {}): HTMLElement {
    const canvas = document.createElement('canvas'), special = SPECIAL[id], ratio = 2;
    canvas.width = size * ratio; canvas.height = size * ratio;
    const c = canvas.getContext('2d');
    if (c) {
        const g = canvasGraphics(c), scale = size * ratio / 56, mid = size * ratio / 2, marble = id === 'prism' ? marbles.prism : special.onBubble ? marbles.base : undefined;
        const side = MARBLE_SIZE * scale;
        if (marble) c.drawImage(marble, mid - side / 2, mid - side / 2, side, side);
        else if (special.onBubble) { g.fillStyle(0x5f86b8); g.fillCircle(mid, mid, 20 * scale); g.lineStyle(1.5 * scale, 0xffffff, 0.8); g.strokeCircle(mid, mid, 20 * scale); }
        drawGlyph(g, id === 'prism' && marble ? PRISM_MARK : special.glyph, mid, mid, 0, scale);
    }
    const image = document.createElement('img');
    image.src = canvas.toDataURL('image/png'); image.alt = ''; image.width = size; image.height = size;
    image.style.cssText = `width:${String(size)}px;height:${String(size)}px;flex:none`;
    image.setAttribute('aria-hidden', 'true');
    return image;
}
