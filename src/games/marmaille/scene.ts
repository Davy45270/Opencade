import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { Engine, COLS, ROWS, ROLES, type Role, type Kid } from '../../engines/marmaille/engine';
import { GAME_NAME, LEVELS } from '../../engines/marmaille/levels';
import { GameCharacter } from '../../characters/game';
import { drawList } from '../../characters/model';
import { ArcadePaint } from '../../characters/arcade-phaser';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { MOBILE_PLAY, PlaySession } from '../../shell/pause';
import { setBrief, setHud } from '../../shell/hud';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { backdrop, CARD, paintCell, repaintBox, portals, roleProp, worldOf, WORLD_NAME, type World } from './art';
/** Field geometry: 20 × 22 cells of 18 px under a 40 px band. */
import { CELL, FIELD_Y } from './layout';
export { CELL, FIELD_Y };
export const ROLE_SYMBOL: Record<Role, string> = { block: '✋', build: '▟', dig: '⇣', bash: '⇢', float: '☂', climb: '⇡' };
export const ROLE_NAME: Record<Role, string> = { block: 'Bloqueur', build: 'Bâtisseur', dig: 'Creuseur', bash: 'Mineur', float: 'Parachute', climb: 'Grimpeur' };
/** Three role slots (a board never offers more than three roles) and the speed toggle. */
export const marmailleButtons: readonly TouchButton[] = [
    { id: 'marmaille-r0', label: '·', ariaLabel: 'Rôle 1', size: 56, placement: 'left', mode: 'tap' },
    { id: 'marmaille-r1', label: '·', ariaLabel: 'Rôle 2', size: 56, placement: 'center', mode: 'tap' },
    { id: 'marmaille-r2', label: '·', ariaLabel: 'Rôle 3', size: 56, placement: 'center', mode: 'tap' },
    { id: 'marmaille-fast', label: '⏩', ariaLabel: 'Accélérer le temps', size: 44, placement: 'right', mode: 'tap', corner: true },
];
/** Roles offered by a level, in the fixed role order: slot i is the i-th of them. */
export function levelRoles(level: number): Role[] { return ROLES.filter(r => (LEVELS[level]?.roles[r] ?? 0) > 0); }
/** The kid a tap designates: nearest living walker or faller within one and a half cells of the tapped cell centre. */
export function kidAt(kids: readonly Kid[], x: number, y: number): Kid | undefined {
    let best: Kid | undefined, bestD = 1.5 * CELL;
    for (const k of kids) {
        if (k.state === 'saved' || k.state === 'dead') continue;
        const d = Math.hypot(k.x * CELL + CELL / 2 - x, FIELD_Y + k.y * CELL + CELL / 2 - y);
        if (d < bestD) { best = k; bestD = d; }
    }
    return best;
}
export interface MarmailleHook {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { selected: Role | null; fast: boolean; character: ReturnType<GameCharacter['snapshot']>; progression: string };
    hudText(): string;
    /** Whether the canvas text panel (lower third) is drawn. */
    textPanel(): boolean;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    advance(ms: number): void;
    /** Screen position (logical canvas pixels) of a kid's centre, for real taps. */
    kidPoint(id: number): { x: number; y: number } | null;
}
declare global { interface Window { __MARMAILLE_TEST__?: MarmailleHook } }
export class MarmailleScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'marmaille', LEVELS.length), LEVELS.length);
    private inputs = new Inputs();
    private selecting = false;
    private brief = '';
    private manual = false;
    private fast = false;
    private selected: Role | null = null;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private title?: Phaser.GameObjects.Text;
    /** Static layers: the backdrop is one baked image per world and companion; terrain cells live in a
     * render texture and are repainted only where a digger, miner or builder changed them. */
    private backdropImage?: Phaser.GameObjects.Image;
    private terrain?: Phaser.GameObjects.RenderTexture;
    private scratch?: Phaser.GameObjects.Graphics;
    /** Kids and the companion are baked sprites (a few frames per pose), not tessellated every frame. */
    private paint?: ArcadePaint;
    private painted: string[] = [];
    private paintedLevel = -1;
    /** Cells painted per frame (terrain layer), for the cost checks. */
    repaints = 0;
    private time0 = 0;
    constructor(private session = new PlaySession(true)) { super('marmaille'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting); }
    private start(index: number, fresh = false): void {
        this.manual = false; this.progress.start(index, fresh); this.engine.loadLevel(index); this.selecting = false;
        this.selected = levelRoles(index)[0] ?? null; this.syncButtons(); this.panels();
    }
    private active(): boolean { return !this.session.paused && !this.selecting && this.engine.status === 'playing'; }
    /** Slot labels follow the level: symbol and remaining stock; unused slots are hidden. */
    private syncButtons(): void {
        const roles = levelRoles(this.engine.level);
        for (let i = 0; i < 3; i++) {
            const b = document.querySelector<HTMLButtonElement>(`#marmaille-r${String(i)}`), r = roles[i];
            if (!b) continue;
            b.hidden = !r;
            if (r) {
                b.textContent = `${ROLE_SYMBOL[r]}${String(this.engine.roles[r])}`;
                b.setAttribute('aria-label', `${ROLE_NAME[r]} (${String(this.engine.roles[r])} restants)`);
                b.setAttribute('aria-pressed', String(this.selected === r));
            }
        }
        document.querySelector('#marmaille-fast')?.setAttribute('aria-pressed', String(this.fast));
    }
    private choose(i: number): void { const r = levelRoles(this.engine.level)[i]; if (r) { this.selected = r; this.syncButtons(); } }
    /** A tap on the field hands the selected role to the designated kid. */
    private tap(x: number, y: number): void {
        if (!this.active() || !this.selected) return;
        const k = kidAt(this.engine.kids, x, y);
        if (k && this.engine.assign(k.id, this.selected)) this.syncButtons();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('marmaille');
        this.backdropImage = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(0);
        this.terrain = this.add.renderTexture(0, 0, 360, 640).setOrigin(0).setDepth(1);
        this.scratch = this.make.graphics({}, false);
        this.paint = new ArcadePaint(this, 10);
        this.graphics = this.add.graphics().setDepth(3);
        this.title = this.add.text(22, FIELD_Y + ROWS * CELL + 12, '', { fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setDepth(4);
        this.hud = this.add.text(26, FIELD_Y + ROWS * CELL + 48, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#fff6e0', lineSpacing: 5, wordWrap: { width: 308 } }).setDepth(4);
        const cleanup = (): void => { this.inputs.dispose(); this.input.removeAllListeners(); document.body.classList.remove('marmaille'); delete window.__MARMAILLE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        renderTouchControls(this.inputs, marmailleButtons, (id, held) => {
            if (!held || this.selecting || this.session.paused) return;
            if (id === 'marmaille-fast') { this.fast = !this.fast; this.syncButtons(); return; }
            this.choose(Number(id.slice(-1)));
        });
        const levels = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won' && this.engine.level + 1 < LEVELS.length) this.start(this.engine.level + 1); });
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.progress.retry(); this.start(this.engine.level); });
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.tap(p.x, p.y); });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (!this.active() || (e.target instanceof HTMLElement && e.target.closest('button,select,input'))) return;
            if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) this.choose(Number(e.code.slice(-1)) - 1);
            if (e.code === 'KeyV') { this.fast = !this.fast; this.syncButtons(); }
        });
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : choisir un rôle puis toucher un enfant`);
        if (new URLSearchParams(location.search).get('test') === '1')
            window.__MARMAILLE_TEST__ = {
                fingerReceipts: receipts,
                read: () => ({ ...this.engine.snapshot(), selected: this.selected, fast: this.fast, character: this.hero.snapshot(), progression: this.progress.state }),
                textPanel: () => Boolean(this.hud?.visible || this.title?.visible),
                hudText: () => `${this.title?.text ?? ''}\n${this.hud?.text ?? ''}`,
                usefulArea: () => ({ x: 0, y: FIELD_Y, width: COLS * CELL, height: ROWS * CELL }),
                // Test clock: a loaded board stays frozen until advance() drives it (recorded ticks stay exact).
                loadLevel: index => { this.start(index, true); this.manual = true; this.tick(0); },
                advance: ms => { this.manual = true; this.tick(ms); },
                kidPoint: id => { const k = this.engine.kids.find(c => c.id === id); return k ? { x: k.x * CELL + CELL / 2, y: FIELD_Y + k.y * CELL + CELL / 2 } : null; },
            };
        this.start(0);
    }
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void { this.tick(this.manual ? 0 : Math.min(delta, 100)); }
    private tick(delta: number): void {
        const ms = delta * (this.fast ? 2 : 1);
        if (!this.session.paused && !this.selecting) { this.engine.step(ms); this.time0 += delta; }
        let changed = false;
        for (const event of this.engine.events.splice(0)) { sound.playEffect(event, this.engine.saved); if (event === 'role') changed = true; }
        if (changed) this.syncButtons();
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(browserStorage(), this.progress.save, 'marmaille');
        }
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, false);
        this.panels(); this.draw();
    }
    /** Bakes the world backdrop once per world and companion. */
    private ensureBackdrop(world: World): void {
        const key = `marmaille-bg-${world}-${this.hero.id}`;
        if (!this.textures.exists(key)) {
            const g = this.make.graphics({}, false);
            backdrop(g, world, CARD[this.hero.id] ?? 0x2f7a3a, FIELD_Y + ROWS * CELL);
            g.generateTexture(key, 360, 640); g.destroy();
        }
        this.backdropImage?.setTexture(key);
    }
    /** Repaints changed terrain cells (all of them on a new board) into the render texture. */
    private syncTerrain(): void {
        const e = this.engine, def = e.def, rt = this.terrain, g = this.scratch;
        if (!rt || !g) return;
        const world = worldOf(e.level), fresh = this.paintedLevel !== e.level || this.painted.length === 0;
        const box = fresh ? { x0: 0, y0: 0, x1: COLS - 1, y1: ROWS - 1 } : repaintBox(this.painted, e.tiles);
        if (fresh) { this.ensureBackdrop(world); this.paintedLevel = e.level; }
        if (!box) { this.repaints = 0; return; }
        // One clear only (a dynamic texture ignores further clears until it is drawn again), then every cell of the box.
        if (fresh) rt.clear();
        else (rt.texture as Phaser.Textures.DynamicTexture).clear(box.x0 * CELL, FIELD_Y + box.y0 * CELL, (box.x1 - box.x0 + 1) * CELL, (box.y1 - box.y0 + 1) * CELL);
        const cells: [number, number][] = [];
        for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) cells.push([x, y]);
        this.repaints = cells.length;
        g.clear();
        for (const [x, y] of cells) {
            const t = e.tile(x, y), built = t === '#' && (def.map[y]?.[x] ?? '.') === '.';
            paintCell(g, world, t, { up: y > 0 ? e.tile(x, y - 1) : ' ', left: e.tile(x - 1, y), right: e.tile(x + 1, y) }, built, x, y, CELL, FIELD_Y);
        }
        portals(g, def.spawn, def.exit, def.dir ?? 1, CELL, FIELD_Y);
        rt.draw(g);
        this.painted = e.tiles.map(r => r.join(''));
    }
    private draw(): void {
        const g = this.graphics, e = this.engine, def = e.def;
        if (!g) return;
        this.syncTerrain();
        g.clear();
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, world = worldOf(e.level);
        // Moving glints on water (or lava): one short line per liquid cell.
        if (!reduced) for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (e.tile(x, y) === '~') {
            g.fillStyle(world === 'mine' ? 0xffd060 : 0xffffff, .7); g.fillRect(x * CELL + ((this.time0 / 60 + x * 5) % (CELL - 5)), FIELD_Y + y * CELL + CELL * .45, 5, 1.5);
        }
        // The chosen companion keeps watch beside the trapdoor; the troop is a band of little ones of the same kind.
        const paint = this.paint, id = this.hero.id;
        paint?.begin();
        const sprite = (pose: 'face' | 'profil', mood: 'joie' | 'surprise', anim: 'repos' | 'marche' | 'special', phase: number): string => {
            const frame = reduced ? 0 : Math.floor(phase / 110) % 6;
            return paint?.texture(`marmaille-${id}-${pose}-${mood}-${anim}-${String(frame)}`, drawList(id, pose, mood, anim, frame * 110)) ?? '';
        };
        paint?.draw(sprite('face', 'joie', 'repos', this.time0), def.spawn.x * CELL + CELL / 2 - (def.dir ?? 1) * 26, FIELD_Y + def.spawn.y * CELL - 26, 60, 0, 1, 2);
        for (const k of e.kids) {
            if (k.state === 'saved' || k.state === 'dead') continue;
            const animation = k.state === 'walk' || k.state === 'climb' ? 'marche' : k.state === 'block' || k.state === 'fall' ? 'repos' : 'special';
            const cx = k.x * CELL + CELL / 2, top = FIELD_Y + k.y * CELL + CELL;
            paint?.draw(sprite(k.state === 'block' ? 'face' : 'profil', k.state === 'fall' && k.fall > 3 && !k.float ? 'surprise' : 'joie', animation, this.time0 + k.id * 90), cx, top - 18, k.dir < 0 ? -40 : 40, 0, 1, 2, 40);
            roleProp(g, k.state, k.float, k.state === 'fall', cx, top - 16, k.dir, reduced ? 0 : this.time0);
            if (this.selected && e.status === 'playing' && (k.state === 'walk' || k.state === 'fall')) { g.fillStyle(0xffffff, .18); g.fillEllipse(cx, top, 20, 5); }
        }
        const roles = levelRoles(e.level).map(r => `${ROLE_SYMBOL[r]} ${ROLE_NAME[r]} ${String(e.roles[r])}`).join('   ');
        this.title?.setText(`${GAME_NAME} ${String(e.level + 1)} · ${def.name}`);
        // Touch screens: no text panel in the lower third; the counters go to the HUD row, the lesson to the pause page.
        const touch = matchMedia(MOBILE_PLAY).matches;
        this.title?.setVisible(!touch); this.hud?.setVisible(!touch);
        if (touch) {
            setHud('left', [{ icon: '🏠', value: `${String(e.saved)}/${String(def.needed)}`, label: 'Sauvés' }, { icon: '🚪', value: `${String(e.spawned)}/${String(def.count)}`, label: 'Sortis' }]);
            setHud('center', [{ icon: '⏱', value: String(Math.ceil(e.timeLeftMs / 1000)), label: 'Secondes' }]);
            setHud('right', [{ icon: '★', value: String(e.score), label: 'Score' }]);
            const brief = `${GAME_NAME} ${String(e.level + 1)} · ${def.name}. ${def.lesson}`;
            if (brief !== this.brief) { this.brief = brief; setBrief(brief); }
        }
        this.hud?.setText(`${WORLD_NAME[world]}\nSAUVÉS ${String(e.saved)}/${String(def.needed)} · SORTIS ${String(e.spawned)}/${String(def.count)} · ${String(Math.ceil(e.timeLeftMs / 1000))} s · SCORE ${String(e.score)}\n${roles || 'Aucun rôle : regarder la marmaille'}${this.fast ? ' · ×2' : ''}\n${def.lesson}`);
    }
}
