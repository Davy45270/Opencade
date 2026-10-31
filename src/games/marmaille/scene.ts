import Phaser from 'phaser';
import { Engine, COLS, ROWS, ROLES, type Role, type Kid } from '../../engines/marmaille/engine';
import { GAME_NAME, LEVELS } from '../../engines/marmaille/levels';
import { GameCharacter } from '../../characters/game';
import { drawList } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
/** Field geometry: 20 × 22 cells of 18 px under a 40 px band. */
export const CELL = 18, FIELD_Y = 40;
export const ROLE_SYMBOL: Record<Role, string> = { block: '✋', build: '▟', dig: '⇣', bash: '⇢', float: '☂', climb: '⇡' };
export const ROLE_NAME: Record<Role, string> = { block: 'Bloqueur', build: 'Bâtisseur', dig: 'Creuseur', bash: 'Mineur', float: 'Parachute', climb: 'Grimpeur' };
/** Three role slots (a board never offers more than three roles) and the speed toggle. */
export const marmailleButtons: readonly TouchButton[] = [
    { id: 'marmaille-r0', label: '·', ariaLabel: 'Rôle 1', size: 56, placement: 'left', mode: 'tap' },
    { id: 'marmaille-r1', label: '·', ariaLabel: 'Rôle 2', size: 56, placement: 'center', mode: 'tap' },
    { id: 'marmaille-r2', label: '·', ariaLabel: 'Rôle 3', size: 56, placement: 'center', mode: 'tap' },
    { id: 'marmaille-fast', label: '»', ariaLabel: 'Accélérer le temps', size: 56, placement: 'right', mode: 'tap' },
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
    read(): ReturnType<Engine['snapshot']> & { selected: Role | null; fast: boolean; character: ReturnType<GameCharacter['snapshot']>; progression: string };
    hudText(): string;
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
    private manual = false;
    private fast = false;
    private selected: Role | null = null;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
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
        document.body.classList.add('marmaille');
        this.graphics = this.add.graphics();
        this.hud = this.add.text(12, FIELD_Y + ROWS * CELL + 8, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#f3f0dc', lineSpacing: 4 });
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
                read: () => ({ ...this.engine.snapshot(), selected: this.selected, fast: this.fast, character: this.hero.snapshot(), progression: this.progress.state }),
                hudText: () => this.hud?.text ?? '',
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
    private draw(): void {
        const g = this.graphics, e = this.engine, def = e.def;
        if (!g) return;
        g.clear();
        g.fillStyle(0x1d2a33); g.fillRect(0, 0, 360, 640);
        g.fillStyle(0x27404b); g.fillRect(0, FIELD_Y, COLS * CELL, ROWS * CELL);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            const t = e.tile(x, y), px = x * CELL, py = FIELD_Y + y * CELL;
            if (t === '#') { g.fillStyle(0x8a5a32); g.fillRect(px, py, CELL, CELL); g.fillStyle(0xa8743f); g.fillRect(px + 2, py + 2, CELL - 8, 4); }
            else if (t === 'X') { g.fillStyle(0x5c6670); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0x3c444c); g.strokeRect(px + .5, py + .5, CELL - 1, CELL - 1); }
            else if (t === '~') { g.fillStyle(0x3d8fd6); g.fillRect(px, py + 4, CELL, CELL - 4); g.fillStyle(0x9fd3ff, .7); g.fillRect(px + 2, py + 5, CELL - 6, 2); }
        }
        // Trapdoor and exit door.
        g.fillStyle(0x3a2a20); g.fillRect(def.spawn.x * CELL - 6, FIELD_Y + def.spawn.y * CELL - 4, CELL + 12, 6);
        const ex = def.exit.x * CELL, ey = FIELD_Y + def.exit.y * CELL;
        g.fillStyle(0xf2c45a); g.fillRoundedRect(ex - 2, ey - CELL, CELL + 4, CELL * 2, 6); g.fillStyle(0x3a2a20); g.fillRoundedRect(ex + 3, ey - CELL + 5, CELL - 6, CELL * 2 - 5, 4);
        // The chosen companion keeps watch above the trapdoor; the troop is a band of little ones of the same kind.
        this.hero.draw(g, def.spawn.x * CELL - 14, FIELD_Y + Math.max(0, def.spawn.y - 3) * CELL, 34);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        for (const k of e.kids) {
            if (k.state === 'saved' || k.state === 'dead') continue;
            const animation = k.state === 'walk' || k.state === 'climb' ? 'marche' : 'repos';
            const list = drawList(this.hero.id, k.state === 'block' ? 'face' : 'profil', k.state === 'fall' && k.fall > 3 && !k.float ? 'surprise' : 'joie', animation, reduced ? 0 : this.time0 + k.id * 90);
            renderCharacter(g, list, k.x * CELL - 2, FIELD_Y + k.y * CELL - 4, CELL + 4, k.dir < 0);
            if (k.float && k.state === 'fall') { g.fillStyle(0xf080ab); g.fillTriangle(k.x * CELL - 2, FIELD_Y + k.y * CELL - 6, k.x * CELL + CELL + 2, FIELD_Y + k.y * CELL - 6, k.x * CELL + CELL / 2, FIELD_Y + k.y * CELL - 16); }
            if (k.state !== 'walk' && k.state !== 'fall') { g.fillStyle(0xffffff, .9); g.fillCircle(k.x * CELL + CELL / 2, FIELD_Y + k.y * CELL - 8, 3); }
        }
        const roles = levelRoles(e.level).map(r => `${ROLE_SYMBOL[r]} ${ROLE_NAME[r]} ${String(e.roles[r])}`).join(' · ');
        this.hud?.setText(`${GAME_NAME.toLocaleUpperCase('fr')} ${String(e.level + 1)} · ${def.name}\nSAUVÉS ${String(e.saved)}/${String(def.needed)} · SORTIS ${String(e.spawned)}/${String(def.count)} · ${String(Math.ceil(e.timeLeftMs / 1000))} s · SCORE ${String(e.score)}\n${roles || 'Aucun rôle : regarder la marmaille'}${this.fast ? ' · ×2' : ''}\n${def.lesson}`);
    }
}
