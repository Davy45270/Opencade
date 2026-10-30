import Phaser from 'phaser';
import { bossAppearance, PALETTES, backdropX } from '../../engines/ferraille/appearance';
import { Engine, LEVELS, TILE, type Input } from '../../engines/ferraille/engine';
import { Inputs, renderTouchControls, virtualJoystick, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const ferrailleButtons: readonly TouchButton[] = [
    { id: 'ferraille-jump', label: 'Saut', ariaLabel: 'Sauter', size: 64, placement: 'right', mode: 'hold' },
    { id: 'ferraille-fire', label: 'Tir', ariaLabel: 'Tirer', size: 64, placement: 'right', mode: 'hold' },
];
const HUD = { x: 10, y: 8, width: 340, height: 98 };
const VIEW = { scale: 1.4, worldTop: 112, width: 360, height: 640 };
export interface FerrailleHook {
    layout(): {
        world: { x: number; y: number; width: number; height: number };
        hud: { x: number; y: number; width: number; height: number };
        ground: { x: number; y: number; width: number; height: number };
        visibleWorldBottom: number;
    };
    advance(ms: number): void;
    hudText(): string;
    rendering(): FerrailleScene['rendering'];
    inspect(change: { heroX?: number; weapon?: 'grenade'; ammo?: number; score?: number; bossHp?: number; bossClock?: number }): void;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger' | 'showcase'): void;
}
declare global { interface Window { __FERRAILLE_TEST__?: FerrailleHook } }
export class FerrailleScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'ferraille', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private panelSignature = '';
    private keys = new Set<string>();
    private stick: number | null = null;
    private jump = false;
    private fire = false;
    private flash = 0;
    constructor(private session = new PlaySession(true)) { super('ferraille'); }
    private panels(): void {
        const signature = `${this.engine.status}|${this.progress.state}|${String(this.engine.level)}|${String(this.engine.state.score)}|${String(this.progress.total)}|${String(this.selecting)}`;
        if (signature === this.panelSignature) return;
        this.panelSignature = signature;
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting);
    }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false;
        this.keys.clear(); this.stick = null; this.jump = this.fire = false; this.panels(); this.draw();
    }
    create(): void {
        document.body.classList.add('ferraille');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('ferraille'); delete window.__FERRAILLE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.add.text(HUD.x + 12, HUD.y + 68, 'CAP SUR LA PORTE · GARDEZ VOTRE ÉLAN', { fontFamily: 'system-ui', fontSize: '12px', color: '#a6cccf' });
        this.hud = this.add.text(14, 16, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 6 });
        const activate = (): void => { if (this.session.state === 'ready') this.session.send('start'); };
        renderTouchControls(this.inputs, ferrailleButtons, (id, held) => { if (held) activate(); if (id === 'ferraille-jump') this.jump = held; else this.fire = held; });
        const slot = document.querySelector<HTMLElement>('#touch-controls .left');
        if (slot) virtualJoystick(this.inputs, slot, direction => { this.stick = direction; if (direction !== null) activate(); }, 120);
        const codes = ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'Space', 'KeyZ', 'KeyX', 'KeyJ'];
        this.inputs.on(document, 'keydown', event => { const e = event as KeyboardEvent; if (!codes.includes(e.code)) return; e.preventDefault(); this.keys.add(e.code); activate(); });
        this.inputs.on(document, 'keyup', event => { this.keys.delete((event as KeyboardEvent).code); });
        this.inputs.on(window, 'blur', () => { this.keys.clear(); this.jump = this.fire = false; this.stick = null; });
        const choose = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Ferraille : robot dans les ateliers suspendus');
        if (new URLSearchParams(location.search).get('test') === '1') window.__FERRAILLE_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            layout: () => ({
                world: { x: 0, y: VIEW.worldTop, width: VIEW.width, height: VIEW.height - VIEW.worldTop },
                hud: { ...HUD },
                ground: { x: 0, y: 16 * TILE * VIEW.scale + VIEW.worldTop, width: VIEW.width, height: 4 * TILE * VIEW.scale },
                visibleWorldBottom: (VIEW.height - VIEW.worldTop) / VIEW.scale,
            }),
            hudText: () => this.hud?.text ?? '',
            rendering: () => structuredClone(this.rendering),
            inspect: change => {
                const s = this.engine.state;
                if (change.heroX !== undefined) s.hero.x = change.heroX;
                if (change.weapon !== undefined) s.weapon = change.weapon;
                if (change.ammo !== undefined) s.ammo = change.ammo;
                if (change.score !== undefined) s.score = change.score;
                if (s.boss) {
                    if (change.bossHp !== undefined) { s.boss.hp = change.bossHp; s.boss.phase = s.boss.hp <= s.boss.maxHp / 3 ? 3 : s.boss.hp <= s.boss.maxHp * 2 / 3 ? 2 : 1; }
                    if (change.bossClock !== undefined) { s.boss.clock = change.bossClock; s.boss.exposed = s.boss.clock % 2400 >= 1200; }
                }
                this.draw();
            },
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                if (name === 'showcase') {
                    const s = structuredClone(this.engine.state);
                    s.hero.x = s.boss ? s.boss.x - 150 : s.cages[0] ? s.cages[0].x - 70 : 300;
                    s.hero.y = 234; s.hero.vx = s.hero.vy = 0;
                    this.engine.loadState(s); this.draw(); return;
                }
                this.start(0, 460, true); const s = structuredClone(this.engine.state);
                s.enemies = []; s.bonuses = []; s.platforms = []; s.hero.x = s.door - (name === 'finish' ? 50 : 120); s.hero.y = 234;
                s.checkpoint = s.hero.x; s.checkpoints = []; s.lives = name === 'danger' ? 1 : 3;
                if (name === 'danger') { for (let x = Math.floor((s.hero.x + 24) / TILE); x < s.columns; x++) for (let y = 16; y < 20; y++) s.tiles[y * s.columns + x] = false; }
                this.engine.loadState(s); this.draw();
            },
        };
        this.scale.refresh(); this.panels(); this.draw();
    }
    private controls(): Input {
        const has = (...codes: string[]): boolean => codes.some(c => this.keys.has(c));
        const angle = this.stick === null ? null : this.stick * Math.PI / 4;
        return { x: angle === null ? Number(has('ArrowRight', 'KeyD')) - Number(has('ArrowLeft', 'KeyA')) : Math.round(Math.cos(angle)),
            y: angle === null ? Number(has('ArrowDown', 'KeyS')) - Number(has('ArrowUp', 'KeyW')) : Math.round(Math.sin(angle)),
            jump: this.jump || has('Space', 'KeyZ'), fire: this.fire || has('KeyX', 'KeyJ') };
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
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        if (!this.selecting && !this.session.paused) {
            this.engine.input(this.controls()); this.engine.step(delta);
            for (const event of new Set(this.engine.events)) { sound.playEffect(event); if (['life', 'hit', 'bonus', 'checkpoint'].includes(event)) this.flash = 1; }
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') { this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'ferraille'); sound.playEffect(this.engine.status); }
        this.flash = Math.max(0, this.flash - delta / 300); if (!this.testAdvancing) { this.panels(); this.draw(); }
    }
    rendering: { palette: number[]; layers: { factor: number; x: number }[]; camera: number; boss: ReturnType<typeof bossAppearance> | null; reducedMotion: boolean } = { palette: [], layers: [], camera: 0, boss: null, reducedMotion: false };
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state, h = s.hero, camera = Math.max(0, Math.min(s.columns * TILE - VIEW.width / VIEW.scale, h.x - 76));
        const xx = (x: number): number => (x - camera) * VIEW.scale, yy = (y: number): number => y * VIEW.scale + VIEW.worldTop;
        const palette = PALETTES[s.theme];
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.rendering = { palette, camera, layers: [], boss: s.boss ? bossAppearance(s.boss, s.ticks, reducedMotion) : null, reducedMotion };
        g.clear(); g.fillStyle(palette[0]); g.fillRoundedRect(0, 0, 360, 640, 16);
        g.fillStyle(0x142a3d); g.fillRoundedRect(HUD.x, HUD.y, HUD.width, HUD.height, 10);
        for (const layer of [0.15, 0.3]) {
            g.fillStyle(palette[1], layer === 0.15 ? 0.5 : 1);
            for (let i = 0; i < 8; i++) {
                const x = backdropX(i, camera, layer), y = 210 + i % 3 * 23;
                if (i === 0) this.rendering.layers.push({ factor: layer, x });
                if (s.theme === 'desert') g.fillTriangle(x - 30, 500, x + 35, y, x + 110, 500);
                else if (s.theme === 'jungle') { g.fillRect(x + 20, y, 10, 300); g.fillCircle(x + 25, y, 38); }
                else { g.fillRect(x, y, 46, 300); if (s.theme === 'night') { g.fillStyle(0xd5dbaa); g.fillRect(x + 12, y + 18, 5, 12); g.fillStyle(palette[1]); } else g.fillRect(x + 10, y - 48, 12, 50); }
            }
        }
        g.lineStyle(1, 0x3d6970); g.lineBetween(0, 512, 360, 512);
        const first = Math.max(0, Math.floor(camera / TILE)), last = Math.min(s.columns, first + Math.ceil(VIEW.width / (TILE * VIEW.scale)) + 1);
        for (let y = 0; y < 20; y++) for (let x = first; x < last; x++) if (s.tiles[y * s.columns + x]) {
            g.fillStyle(y === 16 || !s.tiles[(y - 1) * s.columns + x] ? palette[2] : palette[1]); g.fillRect(xx(x * TILE), yy(y * TILE), TILE * VIEW.scale - 1, TILE * VIEW.scale - 1);
            g.fillStyle(0xb3d5c3); g.fillCircle(xx(x * TILE) + 5, yy(y * TILE) + 5, 1.5);
        }
        for (const p of s.platforms) { g.fillStyle(0xefd77c); g.fillRoundedRect(xx(p.x), yy(p.y), p.w * VIEW.scale, 12, 4); }
        for (const x of s.checkpoints) if (Math.abs(x - camera) < 260) { g.lineStyle(2, 0x74f1c7); g.lineBetween(xx(x), yy(220), xx(x), yy(256)); g.fillStyle(x <= s.checkpoint ? 0x74f1c7 : 0x61768d); g.fillTriangle(xx(x), yy(220), xx(x + 14), yy(226), xx(x), yy(232)); }
        for (const b of s.bonuses) {
            const x = xx(b.x), y = yy(b.y);
            g.fillStyle(b.kind === 'flame' ? 0xffa45c : b.kind === 'bounce' ? 0x8bbfff : b.kind === 'grenade' ? 0xa4dc76 : b.kind === 'fan' ? 0xffc66e : b.kind === 'burst' ? 0xf688b1 : 0x74f1c7);
            g.fillRoundedRect(x, y, 24, 36, 4); g.lineStyle(2, 0x132c3d); g.strokeRect(x + 6, y + 7, 12, 20);
            g.fillStyle(0x132c3d);
            if (b.kind === 'flame') g.fillTriangle(x + 8, y + 24, x + 12, y + 9, x + 17, y + 24);
            else if (b.kind === 'grenade') { g.fillCircle(x + 12, y + 20, 5); g.fillRect(x + 11, y + 10, 3, 6); }
            else if (b.kind === 'bounce') { g.lineBetween(x + 8, y + 10, x + 16, y + 18); g.lineBetween(x + 16, y + 18, x + 8, y + 26); }
        }
        g.fillStyle(0x67e9c8); g.fillRoundedRect(xx(s.door), yy(216), 28, 60, 8); g.fillStyle(0x132e3f); g.fillRect(xx(s.door) + 6, yy(222), 16, 45);
        for (const cage of s.cages) {
            const x = xx(cage.x), y = yy(cage.y);
            g.fillStyle(cage.rescued ? 0x74f1c7 : 0xffde93); g.fillCircle(x + 16, y + 18, 7);
            if (!cage.rescued) { g.lineStyle(2, 0xa6cccf); g.strokeRect(x, y, 34, 44); for (let bar = 1; bar < 4; bar++) g.lineBetween(x + bar * 8, y, x + bar * 8, y + 44); }
        }
        if (s.vehicle) { g.fillStyle(0xd4a568); g.fillRect(xx(h.x - 10), yy(h.y + h.h), 48, 12); g.fillStyle(0x182e43); g.fillCircle(xx(h.x), yy(h.y + h.h) + 16, 7); g.fillCircle(xx(h.x + 18), yy(h.y + h.h) + 16, 7); }
        for (const e of s.enemies) {
            const x = xx(e.x), y = yy(e.y);
            g.fillStyle(e.kind === 'crawler' ? 0xffb266 : e.kind === 'turret' ? 0xf789ad : 0xba9bff);
            if (e.kind === 'drone') { g.fillEllipse(x + 10, y + 10, 30, 16); g.lineStyle(2, 0xdfceff); g.lineBetween(x - 8, y, x + 30, y); }
            else { g.fillRoundedRect(x, y, 21, 21, e.kind === 'crawler' ? 8 : 2); g.fillStyle(0x182e43); g.fillRect(x + 3, y + 17, 15, 5); }
            if (e.kind === 'armored') { g.fillStyle(e.turned ? 0x74f1c7 : 0xa6cccf); g.fillRect(x + ((e.facing ?? -1) < 0 ? -4 : 17), y - 2, 7, 26); }
            if (e.kind === 'kamikaze') { g.lineStyle(3, 0xff6b8b); g.lineBetween(x - 4, y - 6, x + 20, y + 20); }
            if (e.kind === 'shooter' || e.kind === 'turret') { g.lineStyle(4, e.clock > 600 ? 0xffde93 : 0xa6cccf); g.lineBetween(x + 8, y + 8, x + 8 + Math.cos(e.aim ?? 0) * 22, y + 8 + Math.sin(e.aim ?? 0) * 22); }
            g.fillStyle(0xffffff); g.fillCircle(x + 7, y + 7, 3);
        }
        const b = s.boss;
        const appearance = this.rendering.boss;
        if (b && appearance) {
            for (const [index, part] of appearance.parts.entries()) {
                g.fillStyle(appearance.colors[index % 2] ?? 0xffffff);
                const x = xx(b.x + part.x), y = yy(b.y + part.y), w = part.w * VIEW.scale, h = part.h * VIEW.scale;
                if (part.shape === 'ellipse') g.fillEllipse(x + w / 2, y + h / 2, w, h);
                else if (part.shape === 'triangle') g.fillTriangle(x, y + h, x + w / 2, y, x + w, y + h);
                else g.fillRect(x, y, w, h);
            }
            const core = appearance.core, x = xx(b.x + core.x), y = yy(b.y + core.y);
            g.fillStyle(0x101e30); g.fillCircle(x, y, 14);
            g.lineStyle(2, core.color); g.strokeCircle(x, y, 14);
            g.fillStyle(core.color, core.alpha); g.fillCircle(x, y, core.radius * VIEW.scale);
            if (!core.exposed) { g.lineStyle(3, appearance.colors[1] ?? 0xffffff); g.lineBetween(x - 10, y - 10, x + 10, y + 10); g.lineBetween(x + 10, y - 10, x - 10, y + 10); }
            g.fillStyle(0x3e405a); g.fillRect(HUD.x + 6, HUD.y + 86, HUD.width - 12, 8);
            g.fillStyle(appearance.colors[0] ?? 0xffffff); g.fillRect(HUD.x + 6, HUD.y + 86, (HUD.width - 12) * b.hp / b.maxHp, 8);
        }
        for (const p of s.shots) { g.fillStyle(p.friendly ? 0xffeb99 : 0xff6b8b); g.fillCircle(xx(p.x) + 3, yy(p.y) + 3, p.kind === 'flame' ? 8 : p.kind === 'grenade' ? 6 : p.friendly ? 3 : 5); }
        if (reducedMotion || !(s.grace > 0 && s.ticks % 8 < 3)) {
            const x = xx(h.x), y = yy(h.y);
            g.fillStyle(0x6ce5d6); g.fillRoundedRect(x, y + 9, h.w * VIEW.scale, h.h * VIEW.scale - 9, 4);
            g.fillStyle(0xffde93); g.fillRoundedRect(x - 2, y, 22, 15, 5); g.fillStyle(0x122c3e); g.fillRect(x + 2, y + 5, 14, 5);
            g.fillStyle(0xf6fcff); g.fillCircle(x + (s.facing > 0 ? 13 : 5), y + 7, 2);
            g.lineStyle(3, 0x88b6c7); g.lineBetween(x + 9, y - 1, x + 12, y - 7);
            g.fillStyle(0xf8a75d); g.fillRect(x + (s.facing > 0 ? 14 : -8), y + 15, 12, 6);
            if (s.shield) { g.lineStyle(2, 0x89f8ff); g.strokeEllipse(x + 9, y + 14, 38, 48); }
        }
        g.fillStyle(0x3b6070); g.fillRect(HUD.x + 12, HUD.y + 58, HUD.width - 24, 5); g.fillStyle(0x74f1c7); g.fillRect(HUD.x + 12, HUD.y + 58, (HUD.width - 24) * Math.min(1, h.x / s.door), 5);
        if (this.flash && !reducedMotion) { g.lineStyle(3, 0xffe8ad, this.flash); g.strokeRoundedRect(3, 3, 354, 634, 16); }
        this.hud?.setText(`ATELIER ${String(this.engine.level + 1)}     ${'◆'.repeat(s.lives)}     ${String(s.score)} pts\n${({ single: 'IMPULSION', fan: 'ÉVENTAIL', burst: 'RAFALE', flame: 'FLAMMES', bounce: 'RICOCHET', grenade: 'GRENADES' })[s.weapon]}${s.weapon !== 'single' ? ` · ${String(s.ammo)}` : ''}${s.shield ? ' · BOUCLIER' : ''}${b ? `\n${appearance?.name ?? ''} · P${String(b.phase)} ${b.exposed ? 'OUVERT' : 'BLINDÉ'}` : s.vehicle ? ' · WAGON' : s.cages.length ? ` · OTAGES ${String(s.rescued)}/3` : s.recovery ? ' · RESPIRATION' : ''}`);
        // One persistent label; graphics and camera remain independent of DOM panels.
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'playing' ? 'En jeu' : this.engine.status === 'won' ? 'Victoire' : 'Défaite'}`;
    }
}
