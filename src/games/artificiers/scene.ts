import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { Engine, chooseShot, WEAPONS } from '../../engines/artificiers/engine';
import { LEVELS, GAME_NAME } from '../../engines/artificiers/levels';
import { CELL, COLS } from '../../engines/artificiers/terrain';
import { selectedCharacter } from '../../characters/selection';
import { characters, ids, drawList } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { AimDriver } from './driver';
import { countedGraphics, drawDynamic, drawScenery, themes, WORLD_SCALE, screenY } from './art';
export const artificiersButtons: readonly TouchButton[] = [
    { id: 'artificiers-left', label: '←', ariaLabel: 'Marcher à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'artificiers-right', label: '→', ariaLabel: 'Marcher à droite', size: 56, placement: 'left', mode: 'hold' },
    { id: 'artificiers-jump', label: 'Saut', ariaLabel: 'Sauter ou lâcher la corde', size: 56, placement: 'right', mode: 'tap' },
    { id: 'artificiers-weapon', label: 'Arme', ariaLabel: 'Changer d’arme', size: 56, placement: 'center', mode: 'tap' },
    { id: 'artificiers-rope', label: 'Corde', ariaLabel: 'Lancer ou lâcher le grappin', size: 56, placement: 'right', mode: 'tap' },
    { compactMenu: true, id: 'artificiers-mode', label: '1 / 2', ariaLabel: 'Changer entre solo et deux joueurs', size: 56, placement: 'center', mode: 'tap' },
];
export interface ArtificiersHook {
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean; aiming: { id: number; x: number; y: number } | null } };
    renderedFrames(): number;
    hudText(): string;
    heroBounds(): { id: number; x: number; y: number; width: number; height: number; visible: boolean }[];
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    advance(ms: number): void;
    suggestion(): ReturnType<typeof chooseShot>;
    renderBudget(): { calls: number; limit: number; terrainPixels: number };
}
declare global { interface Window { __ARTIFICIERS_TEST__?: ArtificiersHook } }
export class ArtificiersScene extends Phaser.Scene {
    private aiming: { id: number; x: number; y: number } | null = null;
    private frames = 0;
    private engine = new Engine(0, 220, 'solo', selectedCharacter());
    private progress = new Progression(readSave(browserStorage(), 'artificiers', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private manual = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private terrainTexture?: Phaser.Textures.CanvasTexture;
    private scenery?: Phaser.GameObjects.Image;
    private budget = { calls: 0, limit: 500 };
    private terrainPixels = 0;
    private heroes: Phaser.GameObjects.Image[] = [];
    private textureKeys: string[] = [];
    private held = new Set<string>();
    private moveClock = 0;
    private reduced = false;
    private driver = new AimDriver(this.engine, () => this.canControl());
    constructor(private session = new PlaySession(true)) { super('artificiers'); }
    private cancelAim(): void { this.driver.cancel(); this.aiming = null; }
    private active(): boolean { return !this.session.paused && !this.selecting && this.engine.status === 'playing'; }
    private canControl(): boolean { return this.active() && (this.engine.mode === 'duo' || this.engine.actor.team === 0); }
    private panels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
        if (this.engine.mode === 'duo' && this.engine.status !== 'playing') {
            const title = document.querySelector('#result-title');
            if (title) title.textContent = `Équipe ${String((this.engine.winner ?? 0) + 1)} gagnante !`;
        }
    }
    private start(index: number, seed = 220, fresh = true): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index, seed, this.engine.mode, selectedCharacter());
        this.selecting = false; this.cancelAim(); this.held.clear(); this.moveClock = 0;
        this.scenery?.setTexture(`artificiers-scenery-${String(this.engine.config.world)}`);
        this.panels(); this.draw();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('artificiers');
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        for (const world of [0, 1, 2]) {
            const painter = this.add.graphics(), key = `artificiers-scenery-${String(world)}`;
            drawScenery(painter, world); painter.generateTexture(key, 360, 640); painter.destroy(); this.textureKeys.push(key);
        }
        this.scenery = this.add.image(0, 0, `artificiers-scenery-${String(this.engine.config.world)}`).setOrigin(0).setDepth(-3);
        this.terrainTexture = this.textures.createCanvas('artificiers-terrain', 360, 640) ?? undefined;
        this.add.image(0, 0, 'artificiers-terrain').setOrigin(0).setScale(1, WORLD_SCALE).setDepth(-2);
        // Rasterize the shared character artwork once per pose, then only move sprites.
        for (const hero of ids) for (const pose of ['repos', 'saut', 'celebration'] as const) {
            const key = `artificiers-${hero}-${pose}`, painter = this.add.graphics();
            renderCharacter(painter, drawList(hero, 'face', pose === 'celebration' ? 'joie' : 'concentre', pose, 0, 'reduce'), 0, 0, 42);
            painter.generateTexture(key, 42, 42); painter.destroy(); this.textureKeys.push(key);
        }
        this.heroes = Array.from({ length: 6 }, () => this.add.image(0, 0, 'artificiers-panda-repos').setOrigin(0).setScale(1, WORLD_SCALE));
        this.graphics = countedGraphics(this.add.graphics(), this.budget);
        this.hud = this.add.text(20, 14, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#fff8df', stroke: '#213445', strokeThickness: 4, lineSpacing: 4 });
        this.add.text(20, 536, 'Glisser depuis le héros, relâcher pour tirer', { fontFamily: 'system-ui', fontSize: '12px', color: '#e2f4ed' });
        const weapon = this.add.text(20, 558, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#fff3bd' });
        const power = this.add.text(238, 592, '', { fontFamily: 'system-ui', fontSize: '13px', color: '#fff3bd' });
        this.events.on('postupdate', () => { weapon.setText(`${WEAPONS[this.engine.weapon].name} ×${String(this.engine.actor.ammo[this.engine.weapon] ?? 0)}`); power.setText(`${String(Math.round((this.engine.power - 65) / 1.8))} %`); });
        renderTouchControls(this.inputs, artificiersButtons, (id, held) => {
            if (id === 'artificiers-mode' && held && this.active()) {
                this.engine.mode = this.engine.mode === 'solo' ? 'duo' : 'solo'; this.start(this.engine.level); return;
            }
            if (!this.canControl()) return;
            if (held) this.held.add(id); else this.held.delete(id);
            if (!held) return;
            if (id.endsWith('jump')) this.engine.jump();
            if (id.endsWith('weapon')) this.engine.cycleWeapon();
            if (id.endsWith('rope')) this.engine.grapple();
            if (id.endsWith('left')) this.engine.move(-1);
            if (id.endsWith('right')) this.engine.move(1);
        });
        const choose = (): void => {
            this.selecting = !this.selecting; this.cancelAim();
            renderLevels(LEVELS, this.progress.save, i => { this.start(i); }); this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.start(this.engine.level); });
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1, 220, false); });
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (this.driver.down({ x: p.x, y: p.y / WORLD_SCALE, id: p.id })) this.aiming = { id: p.id, x: p.x, y: p.y };
        });
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            this.driver.move({ x: p.x, y: p.y / WORLD_SCALE, id: p.id });
            if (this.aiming?.id === p.id && this.canControl() && this.engine.phase === 'aim') this.aiming = { id: p.id, x: p.x, y: p.y };
        });
        this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            this.driver.up({ x: p.x, y: p.y / WORLD_SCALE, id: p.id });
            if (this.aiming?.id === p.id) this.aiming = null;
        });
        this.input.on('pointerupoutside', () => { this.cancelAim(); });
        this.inputs.on(this.game.canvas, 'touchcancel', () => { this.cancelAim(); });
        this.inputs.on(document, 'keydown', event => {
            const k = event as KeyboardEvent;
            if (!this.canControl() || k.target instanceof HTMLElement && k.target.closest('button,select,input')) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k.code)) k.preventDefault();
            this.held.add(k.code);
            if (k.code === 'ArrowUp') this.engine.aim(this.engine.angle - .04, this.engine.power);
            if (k.code === 'ArrowDown') this.engine.aim(this.engine.angle + .04, this.engine.power);
            if (k.code === 'KeyW') this.engine.aim(this.engine.angle, this.engine.power + 8);
            if (k.code === 'KeyS') this.engine.aim(this.engine.angle, this.engine.power - 8);
            if (!k.repeat) {
                if (k.code === 'Space') this.engine.shoot();
                if (k.code === 'KeyJ') this.engine.jump();
                if (k.code === 'KeyG') this.engine.grapple();
                if (k.code === 'KeyX') this.engine.cycleWeapon();
            }
        });
        this.inputs.on(document, 'keyup', event => this.held.delete((event as KeyboardEvent).code));
        this.inputs.on(window, 'blur', () => { this.held.clear(); this.cancelAim(); });
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : glisser du héros vers le ciel pour viser, relâcher pour tirer`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__ARTIFICIERS_TEST__ = {
            read: () => ({ ...this.engine.snapshot(), fingerInput: { receipts: receipts(), paused: this.session.paused, aiming: this.aiming && { ...this.aiming } } }),
            renderedFrames: () => this.frames, hudText: () => this.hud?.text ?? '',
            heroBounds: () => this.heroes.flatMap((sprite, i) => {
                const u = this.engine.units[i]; if (!u) return [];
                const r = sprite.getBounds();
                return [{ id: u.id, x: r.x, y: r.y, width: r.width, height: r.height,
                    visible: sprite.visible && sprite.alpha > 0 && sprite.texture.key.startsWith(`artificiers-${u.hero}-`) }];
            }),
            usefulArea: () => ({ x: 0, y: 80, width: 360, height: 432 }),
            loadLevel: (i, seed) => { this.manual = true; this.start(i, seed); },
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Durée invalide');
                this.manual = true; this.tick(ms);
            },
            suggestion: () => chooseShot(this.engine),
            renderBudget: () => ({ ...this.budget, terrainPixels: this.terrainPixels }),
        };
        const rendered = (): void => { this.frames++; };
        this.game.events.on('postrender', rendered);
        let disposed = false;
        const cleanup = (): void => {
            if (disposed) return;
            disposed = true; this.game.events.off('postrender', rendered);
            this.inputs.dispose(); document.body.classList.remove('artificiers'); this.input.removeAllListeners(); this.events.removeAllListeners('postupdate');
            for (const key of this.textureKeys) this.textures.remove(key);
            this.terrainTexture?.destroy(); delete window.__ARTIFICIERS_TEST__; sound.stop();
        };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.panels(); this.draw();
    }
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void { this.tick(this.manual ? 0 : Math.min(delta, 100)); }
    private tick(ms: number): void {
        if (this.active()) {
            let remaining = ms;
            while (remaining > 0) {
                const slice = Math.min(20, remaining);
                remaining -= slice; this.moveClock += slice;
                while (this.moveClock >= 65) {
                    this.moveClock -= 65;
                    if (this.canControl()) {
                        if (this.held.has('artificiers-left') || this.held.has('ArrowLeft')) this.engine.move(-1);
                        if (this.held.has('artificiers-right') || this.held.has('ArrowRight')) this.engine.move(1);
                    }
                }
                this.engine.step(slice);
            }
        } else { this.held.clear(); this.cancelAim(); }
        for (const event of this.engine.events.splice(0)) sound.playEffect(event);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score); writeSave(browserStorage(), this.progress.save, 'artificiers');
        }
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics, e = this.engine, texture = this.terrainTexture;
        if (!g || !texture) return;
        this.terrainPixels = 0;
        const ctx = texture.context, t = themes[e.config.world] ?? themes[0];
        if (!t) return;
        for (const rect of e.terrain.dirty.splice(0)) {
            const x0 = Math.floor(rect.x / CELL) * CELL, y0 = Math.floor(rect.y / CELL) * CELL;
            const x1 = Math.min(360, Math.ceil((rect.x + rect.width) / CELL) * CELL), y1 = Math.min(640, Math.ceil((rect.y + rect.height) / CELL) * CELL);
            ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
            this.terrainPixels += (x1 - x0) * (y1 - y0);
            for (let y = y0; y < y1; y += CELL) for (let x = x0; x < x1; x += CELL) {
                const i = y / CELL * COLS + x / CELL;
                if (!e.terrain.mask[i]) continue;
                const material = e.terrain.material[i];
                ctx.fillStyle = material === 3 ? '#c49359' : material === 2 ? t.rock : !e.terrain.solid(x, y - 2) ? t.grass : t.soil;
                ctx.fillRect(x, y, CELL, CELL);
                if ((x * 13 + y * 7) % 34 === 0) { ctx.fillStyle = 'rgba(255,240,200,.18)'; ctx.fillRect(x, y, 1, 1); }
            }
        }
        if (this.terrainPixels) texture.refresh();
        this.budget.calls = 0; drawDynamic(g, e, this.reduced, true);
        this.heroes.forEach((sprite, i) => {
            const u = e.units[i]; sprite.setVisible(!!u && u.hp > 0);
            if (!u) return;
            const pose = e.status === 'won' ? 'celebration' : u.vy ? 'saut' : 'repos';
            sprite.setTexture(`artificiers-${u.hero}-${pose}`).setPosition(u.x - 21, screenY(u.y - 29)).setFlipX(u.team === 1);
        });
        const a = e.actor, mission = e.config.mission === 'survive' ? `Tenir ${String(e.config.goal)} manches` : e.config.mission === 'structure' ? 'Détruire la tour en bois' : e.config.mission === 'target' ? 'Toucher la cible' : 'Dernière équipe debout';
        this.hud?.setText(`N${String(e.level + 1)} · ${e.config.name} · ${String(e.score)} pts\n${mission}\n${e.mode === 'duo' ? '2 joueurs · ' : ''}Équipe ${String(a.team + 1)} · ${characters[a.hero].fr} · ${String(Math.ceil(e.timer / 1000))} s\nVent ${e.wind < 0 ? '←' : '→'} ${String(Math.abs(e.wind))} · Tour ${String(e.turn + 1)}${e.turn >= e.config.sudden ? ' · Eau montante !' : ''}`);
    }
}
