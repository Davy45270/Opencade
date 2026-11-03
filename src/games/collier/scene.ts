import type { FingerProof } from '../finger-receipts';
import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import { readDriver } from './driver';
import { canvasSize, fieldView, logicalPoint, shooterLayout, themeIndex, themes } from './presentation';
import { drawDecor, drawMotif, drawBonus } from './art';
import Phaser from 'phaser';
import { Engine, DIAMETER } from '../../engines/collier/engine';
import { GAME_NAME, LEVELS } from '../../engines/collier/levels';
import { GameCharacter } from '../../characters/game';
import { actorLayers } from './actor-art';
import { renderCharacter } from '../../characters/phaser';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const collierButtons: readonly TouchButton[] = [{
        id: 'collier-swap',
        label: '⇄',
        ariaLabel: 'Échanger les perles',
        size: 56,
        placement: 'center',
        mode: 'tap'
    }];
const palette = [
    0x65e4d0,
    0xffb867,
    0xf080ab,
    0x92a8ff,
    0xd8a4ff,
    0xffee91
];
interface CollierFingerInput {
    paused: boolean;
    pointer: { x: number; y: number } | null;
    view: ReturnType<typeof fieldView>;
    canvas: typeof canvasSize;
}
export interface CollierHook extends FingerProof {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & {
        character: ReturnType<GameCharacter['snapshot']>;
        leader: ReturnType<GameCharacter['snapshot']>;
        progression: string;
        fingerInput: CollierFingerInput;
    };
    readDriver(): ReturnType<typeof readDriver>;
    view(): ReturnType<typeof fieldView>;
    hudText(): string;
    geometry(): { input: { x: number; y: number; scaleX: number; scaleY: number }; canvas: typeof canvasSize; view: ReturnType<typeof fieldView>; targets: ReturnType<typeof shooterLayout> };
    usefulArea(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    loadLevel(index: number, seed?: number): void;
    advance(ms: number): void;
    scenario(name: 'finish' | 'loss' | 'combo'): void;
}
declare global {
    interface Window {
        __COLLIER_TEST__?: CollierHook;
    }
}
export class CollierScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private leader = new GameCharacter(this.hero.id === 'singe' ? 'panda' : 'singe');
    private helper = new GameCharacter('pandaroux');
    private progress = new Progression(readSave(browserStorage(), 'collier', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private manual = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private sight?: Phaser.GameObjects.TileSprite;
    private actorEffects?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private pearlLabel?: Phaser.GameObjects.Text;
    private scoreLabel?: Phaser.GameObjects.Text;
    private shapeLabel?: Phaser.GameObjects.Text;
    private helpLabel?: Phaser.GameObjects.Text;
    private quotaBar?: Phaser.GameObjects.Image;
    private hudPanel?: Phaser.GameObjects.Image;
    private pointer: {
        id: number;
        x: number;
        y: number;
        time: number;
        moved: number;
    } | null = null;
    private background?: Phaser.GameObjects.Image;
    private track?: Phaser.GameObjects.Image;
    private universe = -1;
    private beadImages: Phaser.GameObjects.Image[] = [];
    private beadCount = 0;
    private actorImages: Phaser.GameObjects.Image[] = [];
    private actorCount = 0;
    private particleImages: Phaser.GameObjects.Image[] = [];
    private particleCount = 0;
    private reducedMotion = false;
    private comboLabel?: Phaser.GameObjects.Text;
    private visualTime = 0;
    private lostAt = 0;
    constructor(private session = new PlaySession(true)) {
        super('collier');
    }
    private panels(): void {
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting);
    }
    private start(index: number, seed = 300, fresh = false): void {
        this.manual = false;
        this.pointer = null;
        this.progress.start(index, fresh);
        this.engine.loadLevel(index, seed);
        this.selecting = false;
        this.panels();
    }
    private active(): boolean {
        return !this.session.paused && !this.selecting && this.engine.status === 'playing';
    }
    create(): void {
        this.scale.setGameSize(canvasSize.width, canvasSize.height);
        const receipts = fingerReceipts(this.inputs);
        this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.beadImages = [];
        this.actorImages = [];
        this.particleImages = [];
        this.track = undefined;
        this.actorEffects = undefined;
        this.sight = undefined;
        this.hudPanel = undefined;
        this.quotaBar = undefined;
        this.background = undefined;
        this.universe = -1;
        this.graphics = this.add.graphics();
        this.graphics.setDepth(.2);
        // Prepare the small atlas before the first frame, including bonus variants.
        for (let color = 0; color < palette.length; color++)
            for (const bonus of [undefined, 'slow', 'reverse', 'bomb', 'aim'] as const)
                this.beadTexture(color, bonus);
        for (let color = 0; color < palette.length; color++)
            for (let frame = 0; frame <= 60; frame++) {
                this.particleTexture(color, true, frame);
                this.particleTexture(color, false, frame);
            }
        this.comboLabel = this.add.text(180, 565, '', {
            fontFamily: 'system-ui', fontSize: '28px', fontStyle: 'bold',
            color: '#f45eaa', stroke: '#672653', strokeThickness: 7
        }).setOrigin(.5);
        const textStyle = { fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#fff5db' };
        this.hud = this.add.text(180, 618, '', textStyle).setOrigin(.5);
        this.pearlLabel = this.add.text(53, 650, '', textStyle);
        this.scoreLabel = this.add.text(212, 650, '', textStyle);
        this.shapeLabel = this.add.text(180, 596, '', { ...textStyle, fontSize: '13px' }).setOrigin(.5);
        this.helpLabel = this.add.text(180, 720, '', { ...textStyle, fontSize: '13px' }).setOrigin(.5);
        const cleanup = (): void => {
            this.scale.setGameSize(360, 640);
            this.inputs.dispose();
            this.input.removeAllListeners();
            delete window.__COLLIER_TEST__;
            sound.stop();
        };
        this.events.once('shutdown', cleanup);
        this.events.once('destroy', cleanup);
        renderTouchControls(this.inputs, collierButtons, (_id, held) => {
            if (held && this.active())
                this.engine.swap();
        });
        const choose = (): void => {
            this.selecting = !this.selecting;
            renderLevels(LEVELS, this.progress.save, index => {
                this.start(index, 300, true);
            });
            this.panels();
        };
        for (const id of ['levels', 'result-levels', 'close-levels'])
            this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => {
            if (this.progress.state === 'won')
                this.start(this.engine.level + 1);
        });
        for (const id of ['retry-level', 'replay-level', 'restart'])
            this.inputs.on(document.querySelector(`#${id}`), 'click', () => {
                this.progress.retry();
                this.engine.loadLevel(this.engine.level, this.engine.seed);
                this.manual = false;
                this.panels();
            });
        const aim = (p: { x: number; y: number }): void => {
            const o = this.engine.config.shooter;
            this.engine.aim(Math.atan2(p.y - o.y, p.x - o.x));
        };
        this.input.on('pointerdown', (raw: Phaser.Input.Pointer) => {
            const p = {
                ...logicalPoint(raw, fieldView(this.engine.config)),
                id: raw.id,
                downTime: raw.downTime,
                upTime: raw.upTime,
                wasTouch: raw.wasTouch
            };
            if (!this.active() || this.pointer)
                return;
            this.pointer = {
                id: p.id,
                x: p.x,
                y: p.y,
                time: p.downTime,
                moved: 0
            };
            aim(p);
        });
        this.input.on('pointermove', (raw: Phaser.Input.Pointer) => {
            const p = {
                ...logicalPoint(raw, fieldView(this.engine.config)),
                id: raw.id,
                downTime: raw.downTime,
                upTime: raw.upTime,
                wasTouch: raw.wasTouch
            };
            if (!this.active())
                return;
            if (this.pointer?.id === p.id) {
                this.pointer.moved = Math.max(this.pointer.moved, Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y));
                aim(p);
            }
            else if (!p.wasTouch)
                aim(p);
        });
        this.input.on('pointerup', (raw: Phaser.Input.Pointer) => {
            const p = {
                ...logicalPoint(raw, fieldView(this.engine.config)),
                id: raw.id,
                downTime: raw.downTime,
                upTime: raw.upTime,
                wasTouch: raw.wasTouch
            };
            const down = this.pointer;
            if (!down || down.id !== p.id)
                return;
            this.pointer = null;
            if (!this.active())
                return;
            const view = fieldView(this.engine.config);
            const o = this.engine.config.shooter;
            const layout = shooterLayout(o, this.engine.angle, view.scale);
            const tap = Math.max(down.moved, Math.hypot(p.x - down.x, p.y - down.y)) * view.scale < 10;
            if (tap && (Math.hypot(down.x - o.x, down.y - o.y) * view.scale < 30 || Math.hypot(down.x - layout.next.x, down.y - layout.next.y) * view.scale < 24))
                this.engine.swap();
            else {
                // The release may carry newer coordinates than the last movement.
                aim(p);
                this.engine.shoot();
            }
        });
        this.input.on('pointerupoutside', () => {
            this.pointer = null;
        });
        this.inputs.on(this.game.canvas, 'touchcancel', () => {
            this.pointer = null;
        });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (!this.active() || e.target instanceof HTMLElement && e.target.closest('button,select,input'))
                return;
            if ([
                'ArrowLeft',
                'ArrowRight',
                'Space',
                'KeyX'
            ].includes(e.code))
                e.preventDefault();
            if (e.code === 'ArrowLeft')
                this.engine.aim(this.engine.angle - .06);
            if (e.code === 'ArrowRight')
                this.engine.aim(this.engine.angle + .06);
            if (e.code === 'Space' && !e.repeat)
                this.engine.shoot();
            if (e.code === 'KeyX' && !e.repeat)
                this.engine.swap();
        });
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : viser partout, relâcher pour tirer ; toucher le tireur pour échanger`);
        if (new URLSearchParams(location.search).get('test') === '1')
            window.__COLLIER_TEST__ = {
                ...fingerProof,
                fingerReceipts: receipts,
                read: () => ({
                    ...this.engine.snapshot(),
                    character: this.hero.snapshot(),
                    leader: this.leader.snapshot(),
                    progression: this.progress.state,
                    fingerInput: {
                        paused: this.session.paused,
                        pointer: this.pointer ? { x: this.pointer.x, y: this.pointer.y } : null,
                        view: fieldView(this.engine.config),
                        canvas: canvasSize
                    }
                }),
                readDriver: () => readDriver(this.engine),
                view: () => fieldView(this.engine.config),
                geometry: () => ({
                    input: {
                        x: this.scale.canvasBounds.left, y: this.scale.canvasBounds.top,
                        scaleX: this.scale.displayScale.x, scaleY: this.scale.displayScale.y
                    },
                    canvas: canvasSize,
                    view: fieldView(this.engine.config),
                    targets: shooterLayout(this.engine.config.shooter, this.engine.angle, fieldView(this.engine.config).scale)
                }),
                hudText: () => `SCORE ${String(this.engine.score)}\n` + [this.hud, this.pearlLabel, this.scoreLabel, this.shapeLabel, this.helpLabel].map(label => label?.text ?? '').join('\n'),
                usefulArea: () => ({
                    x: 0,
                    // Shell hooks use a 360 × 640 reference, even for taller canvases.
                    y: 24 * 640 / canvasSize.height,
                    width: 360,
                    height: 708 * 640 / canvasSize.height
                }),
                loadLevel: (i, seed) => {
                    this.start(i, seed, true);
                    this.tick(0);
                },
                advance: ms => {
                    this.manual = true;
                    this.tick(ms);
                },
                scenario: name => {
                    this.start(0, 300, true);
                    const path = this.engine.config.paths[0];
                    if (!path)
                        return;
                    if (name === 'loss')
                        this.engine.loadState([{
                                id: 1,
                                color: 0,
                                s: path.length - 1
                            }], 24, 0, 0);
                    else if (name === 'finish')
                        this.engine.loadState([{
                                id: 1,
                                color: 0,
                                s: 260
                            }, {
                                id: 2,
                                color: 0,
                                s: 280
                            }], 24, 0, 0);
                    else
                        this.engine.loadState([
                            {
                                id: 1,
                                color: 1,
                                s: 220
                            },
                            {
                                id: 2,
                                color: 1,
                                s: 240
                            },
                            {
                                id: 3,
                                color: 0,
                                s: 260
                            },
                            {
                                id: 4,
                                color: 0,
                                s: 280
                            },
                            {
                                id: 5,
                                color: 1,
                                s: 300
                            }
                        ], 24, 0, 1);
                    this.tick(0);
                }
            };
        this.panels();
        this.draw();
    }
    updatePaused(): void {
        this.tick(0);
    }
    update(_time: number, delta: number): void {
        this.tick(this.manual ? 0 : Math.min(delta, 100));
    }
    private tick(delta: number): void {
        if (!this.session.paused && !this.selecting) {
            this.engine.step(delta);
            this.visualTime += delta;
        }
        for (const event of this.engine.events.splice(0))
            sound.playEffect(event, this.engine.combo);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.score);
            writeSave(browserStorage(), this.progress.save, 'collier');
            this.lostAt = this.visualTime;
        }
        for (const actor of [this.hero, this.leader, this.helper])
            actor.advance(delta, this.session.paused || this.selecting, this.engine.status, false);
        if (this.engine.status === 'playing' && !this.session.paused) {
            this.leader.animation = this.engine.maxCombo >= 3 && this.engine.bursts.length ? 'celebration' : 'marche';
            this.leader.expression = this.engine.danger ? 'surprise' : this.engine.bursts.length ? 'joie' : 'concentre';
        }
        if (this.engine.danger && !this.reducedMotion)
            this.leader.time += delta * 1.5;
        this.panels();
        this.draw();
    }
    private draw(): void {
        const g = this.graphics, e = this.engine;
        if (!g)
            return;
        g.clear();
        this.actorEffects?.clear();
        this.sight?.setVisible(false);
        for (const image of this.beadImages) image.setVisible(false);
        this.beadCount = 0;
        for (const image of [...this.actorImages, ...this.particleImages]) image.setVisible(false);
        this.actorCount = 0;
        this.particleCount = 0;
        const universe = themeIndex(e.level);
        if (universe !== this.universe) {
            this.universe = universe;
            const theme = themes[universe] ?? themes[0];
            this.comboLabel?.setColor(`#${theme.accent.toString(16).padStart(6, '0')}`);
            this.background?.destroy();
            const key = `collier-decor-${String(universe)}`;
            if (!this.textures.exists(key)) {
                const decor = this.add.graphics();
                drawDecor(decor, universe);
                decor.generateTexture(key, 360, 640);
                decor.destroy();
            }
            this.background = this.add.image(0, 0, key).setOrigin(0).setDisplaySize(360, 736).setDepth(-1);
        }
        this.prepareHud();
        const view = fieldView(e.config);
        g.setPosition(view.x, view.y);
        g.setScale(view.scale);
        if (!this.reducedMotion && e.combo > 1 && e.bursts.length)
            g.setPosition(view.x + Math.sin(this.visualTime / 30) * 2, view.y);
        this.comboLabel?.setText(e.combo > 1 && e.bursts.length ? `Combo ×${String(e.combo)}` : '');
        // Relief is baked with the course, not tessellated again every frame.
        const trackKey = `collier-track-${String(e.level)}-${String(e.danger)}`;
        for (const danger of [false, true]) {
            const key = `collier-track-${String(e.level)}-${String(danger)}`;
            if (!this.textures.exists(key)) {
                const texture = this.add.graphics();
                this.paintTrack(texture, danger);
                texture.generateTexture(key, 360, 640);
                texture.destroy();
            }
        }
        this.track ??= this.add.image(0, 0, trackKey).setOrigin(0).setDepth(-.5);
        this.track.setTexture(trackKey).setPosition(view.x, view.y).setScale(view.scale);
        e.config.paths.forEach((path, ci) => {
            const chain = e.chains[ci];
            if (!chain)
                return;
            for (const b of chain.beads) {
                if (e.hidden(b.s))
                    continue;
                const s = b.s + (e.status === 'lost' ? Math.max(0, this.visualTime - this.lostAt) * .3 : 0);
                if (e.status === 'lost' && s >= path.length)
                    continue;
                const p = path.pointAt(s);
                this.bead(p.x, p.y, b.color, b.bonus);
            }
            if (chain.beads.length) {
                const p = path.pointAt((chain.beads.at(-1)?.s ?? 0) + 24);
                const size = 80 / view.scale;
                this.drawActor(this.leader, p.x - size / 2, p.y - size * .7, size);
            }
            if (e.reverseMs > 0) {
                const p = path.pointAt(chain.beads[0]?.s ?? 0);
                g.lineStyle(2, 0xffb867);
                g.lineBetween(p.x, p.y, p.x - 28, p.y + 15);
                this.drawActor(this.helper, p.x - 60, p.y, 38);
            }
        });
        const o = e.config.shooter, impact = e.trace();
        if (e.status === 'playing' && !e.flight) {
            const length = e.aimMs > 0 ? Math.hypot(impact.x - o.x, impact.y - o.y) : 800;
            const dots = [];
            for (let s = 60 / view.scale; s < length; s += 12) {
                const x = o.x + Math.cos(e.angle) * s, y = o.y + Math.sin(e.angle) * s;
                const screenX = x * view.scale + view.x, screenY = y * view.scale + view.y;
                if (screenX < 8 || screenX > 352 || screenY < 20 || screenY > 580) continue;
                dots.push({ x, y });
            }
            const first = dots[0], last = dots.at(-1);
            if (first && last) {
                const key = 'collier-sight-dot';
                if (!this.textures.exists(key)) {
                    const texture = this.add.graphics();
                    texture.fillStyle(0xf8f1cd);
                    texture.fillCircle(6, 3, 2);
                    texture.generateTexture(key, 12, 6);
                    texture.destroy();
                }
                this.sight ??= this.add.tileSprite(0, 0, 12, 6, key).setDepth(.1);
                const shake = !this.reducedMotion && e.combo > 1 && e.bursts.length ? Math.sin(this.visualTime / 30) * 2 : 0;
                this.sight.setSize(dots.length * 12, 6).setScale(view.scale)
                    .setPosition((first.x + last.x) / 2 * view.scale + view.x + shake, (first.y + last.y) / 2 * view.scale + view.y)
                    .setRotation(e.angle).setAlpha(e.aimMs > 0 ? .95 : .5).setVisible(true);
            }
            if (e.aimMs > 0) {
                g.lineStyle(2, 0xffffff);
                g.strokeCircle(impact.x, impact.y, 8);
            }
        }
        this.drawShooter();
        if (e.flight && Math.hypot(e.flight.x - o.x, e.flight.y - o.y) > 60 / view.scale)
            this.bead(e.flight.x, e.flight.y, e.flight.color);
        for (const b of e.bursts) {
            const age = (e.time - b.time) / 500;
            this.particle(b.x, b.y, b.color, true, this.reducedMotion ? 0 : age, 1 - age);
            if (!this.reducedMotion)
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    this.particle(b.x + Math.cos(angle) * age * 32, b.y + Math.sin(angle) * age * 32,
                        b.color, false, age, 1);
                }
        }
        const active = [
            e.slowMs > 0 ? 'Ralentir' : '',
            e.reverseMs > 0 ? 'Reculer' : '',
            e.bomb ? 'Bombe' : '',
            e.aimMs > 0 ? 'Viser' : ''
        ].filter(Boolean).join(' · ');
        const emitted = e.chains.reduce((total, chain) => total + chain.emitted, 0);
        const remaining = Math.max(0, e.config.quota - emitted);
        this.hud?.setText(`Niveau ${String(e.level + 1)}`);
        this.pearlLabel?.setText(`Perles
${String(remaining)} / ${String(e.config.quota)}`);
        const stars = Math.min(3, Math.floor(e.score / Math.max(1, e.config.quota * 10)));
        this.scoreLabel?.setText(`Score  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}
${String(e.score)}`);
        this.shapeLabel?.setText(e.config.name);
        this.helpLabel?.setText(e.danger ? 'DANGER !' : active || (e.level === 0 && e.shots === 0 ? 'Viser partout · relâcher pour tirer' : ''));
        this.quotaBar?.setDisplaySize(136 * Math.max(.001, remaining / e.config.quota), 7);
        const status = document.querySelector('#status');
        if (status)
            status.textContent = `Score : ${String(e.score)} · ${e.status === 'won' ? 'Victoire' : e.status === 'lost' ? 'Défaite' : 'En jeu'}`;
    }
    /** Card frames, pearl and gauge pigment are baked once per level. */
    private prepareHud(): void {
        const key = `collier-hud-${String(this.engine.level)}`;
        const theme = themes[themeIndex(this.engine.level)] ?? themes[0];
        if (!this.textures.exists(key)) {
            const g = this.add.graphics();
            g.fillStyle(0x201b3e, .94);
            g.fillRoundedRect(76, 583, 208, 25, 10);
            g.fillStyle(theme.accent);
            g.fillRoundedRect(119, 605, 122, 27, 13);
            for (const x of [12, 188]) {
                g.fillStyle(0x181d38, .95);
                g.fillRoundedRect(x, 638, 160, 68, 14);
                g.lineStyle(2, theme.light, .9);
                g.strokeRoundedRect(x, 638, 160, 68, 14);
                g.fillStyle(theme.accent, .15);
                g.fillRoundedRect(x + 4, 642, 152, 23, 9);
            }
            this.paintBead(g, 33, 658, 0, 12);
            g.fillStyle(0x080e24);
            g.fillRoundedRect(24, 693, 136, 7, 3);
            g.generateTexture(key, 360, 736);
            g.destroy();
        }
        if (!this.hudPanel) this.hudPanel = this.add.image(0, 0, key).setOrigin(0).setDepth(-.25);
        this.hudPanel.setTexture(key);
        const gaugeKey = 'collier-quota-pigment';
        if (!this.textures.exists(gaugeKey)) {
            const g = this.add.graphics();
            g.fillStyle(0x65e4d0);
            g.fillRect(0, 0, 136, 7);
            g.fillStyle(0xffffff, .55);
            g.fillRect(0, 0, 136, 2);
            g.generateTexture(gaugeKey, 136, 7);
            g.destroy();
        }
        this.quotaBar ??= this.add.image(24, 693, gaugeKey).setOrigin(0);
    }
    private paintTrack(g: Phaser.GameObjects.Graphics, danger: boolean): void {
        const universe = themeIndex(this.engine.level);
        const theme = themes[universe] ?? themes[0];
        for (const path of this.engine.config.paths) {
            g.lineStyle(16, 0x291d45, .65);
            g.beginPath();
            const first = path.samples[0];
            if (first) g.moveTo(first.x, first.y);
            for (let i = 1; i < path.samples.length; i++) {
                const a = path.samples[i - 1], b = path.samples[i];
                if (a && b)
                    g.lineTo(b.x, b.y);
            }
            g.strokePath();
            for (const [width, color] of [[13, 0x57304f], [11, theme.light], [7, theme.accent], [2, theme.light]] as const) {
                g.lineStyle(width, color, .95);
                g.beginPath();
                if (first) g.moveTo(first.x, first.y);
                for (let i = 1; i < path.samples.length; i++) {
                    const a = path.samples[i - 1], b = path.samples[i];
                    if (a && b) g.lineTo(b.x, b.y);
                }
                g.strokePath();
            }
            // Tunnel bodies and their tent entrances belong to the baked course.
            for (const [a, b] of this.engine.config.tunnels) {
                g.lineStyle(28, 0x432956);
                for (let s = a; s < b; s += 5) {
                    const p = path.pointAt(s), q = path.pointAt(Math.min(s + 5, b));
                    g.lineBetween(p.x, p.y, q.x, q.y);
                }
                const p = path.pointAt(a);
                g.fillStyle(0x30214d, .35);
                g.fillEllipse(p.x + 3, p.y + 21, 56, 15);
                g.fillStyle(0x38204b);
                g.fillRoundedRect(p.x - 23, p.y - 37, 46, 57, 10);
                g.lineStyle(3, theme.light);
                g.strokeRoundedRect(p.x - 23, p.y - 37, 46, 57, 10);
                g.fillStyle(theme.accent);
                g.fillTriangle(p.x, p.y - 62, p.x - 32, p.y - 32, p.x + 32, p.y - 32);
                g.fillStyle(theme.light);
                g.fillTriangle(p.x, p.y - 62, p.x - 9, p.y - 32, p.x + 9, p.y - 32);
                // Parted curtains reveal a recessed doorway, never a slate block.
                g.fillStyle(theme.accent);
                g.fillTriangle(p.x - 21, p.y - 30, p.x - 21, p.y + 16, p.x - 7, p.y - 24);
                g.fillTriangle(p.x + 21, p.y - 30, p.x + 21, p.y + 16, p.x + 7, p.y - 24);
                g.fillStyle(theme.light);
                g.fillCircle(p.x, p.y - 62, 4);
            }
            const hole = path.pointAt(path.length);
            g.fillStyle(theme.accent);
            if (universe === 1) {
                g.fillEllipse(hole.x, hole.y + 8, 44, 30);
                g.lineStyle(2, theme.light);
                for (let x = -14; x <= 14; x += 7)
                    g.lineBetween(hole.x + x, hole.y, hole.x + x, hole.y + 18);
            } else if (universe === 2) {
                g.fillRoundedRect(hole.x - 18, hole.y - 2, 36, 26, 4);
                g.fillEllipse(hole.x, hole.y + 21, 58, 12);
                g.fillStyle(theme.light);
                g.fillRect(hole.x - 18, hole.y + 12, 36, 5);
            } else if (universe === 3) {
                g.fillStyle(0x353264, .3);
                g.fillEllipse(hole.x + 3, hole.y + 24, 68, 16);
                g.fillStyle(0xb5b5e6);
                g.fillEllipse(hole.x, hole.y + 13, 62, 29);
                g.fillStyle(theme.light);
                g.fillCircle(hole.x - 17, hole.y + 9, 13);
                g.fillCircle(hole.x + 17, hole.y + 9, 13);
                g.fillEllipse(hole.x, hole.y + 9, 44, 32);
            } else {
                g.fillRoundedRect(hole.x - 21, hole.y - 8, 42, 28, 6);
                g.lineStyle(3, theme.light);
                g.strokeRoundedRect(hole.x - 21, hole.y - 8, 42, 28, 6);
                g.lineBetween(hole.x - 21, hole.y - (danger ? 26 : 14), hole.x + 21, hole.y - (danger ? 26 : 14));
            }
            // Recessed mouth: pale lip, dark cavity and a soft inner rim.
            g.fillStyle(0x8e689d);
            g.fillEllipse(hole.x, hole.y - 2, 48, danger ? 42 : 24);
            g.fillStyle(theme.light, .8);
            g.fillEllipse(hole.x, hole.y - 6, 44, danger ? 38 : 18);
            g.fillStyle(0x241735);
            g.fillEllipse(hole.x, hole.y - 7, 40, danger ? 34 : 14);
            g.fillStyle(0x090e24, .6);
            g.fillEllipse(hole.x, hole.y - 9, 32, danger ? 24 : 8);
        }
        const o = this.engine.config.shooter;
        const view = fieldView(this.engine.config);
        const layout = shooterLayout(o, this.engine.angle, view.scale);
        g.lineStyle(5 / view.scale, 0x36213e, .7);
        g.strokeCircle(o.x, o.y + 1 / view.scale, layout.size * .56);
        g.lineStyle(3 / view.scale, theme.light, .95);
        g.strokeCircle(o.x, o.y, layout.size * .56);
        g.lineStyle(1 / view.scale, theme.accent);
        g.strokeCircle(o.x, o.y, layout.size * .56 - 2 / view.scale);
    }
    private drawShooter(): void {
        const g = this.graphics;
        if (!g) return;
        const e = this.engine, o = e.config.shooter;
        const view = fieldView(e.config);
        const theme = themes[themeIndex(e.level)] ?? themes[0];
        const layout = shooterLayout(o, e.angle, view.scale);
        g.fillStyle(theme.accent);
        const a = layout.arrow, t = e.angle;
        g.fillTriangle(a.x + Math.cos(t) * 9, a.y + Math.sin(t) * 9,
            a.x + Math.cos(t + 2.2) * 8, a.y + Math.sin(t + 2.2) * 8,
            a.x + Math.cos(t - 2.2) * 8, a.y + Math.sin(t - 2.2) * 8);
        this.drawActor(this.hero, o.x - layout.size / 2, o.y - layout.size / 2, layout.size);
        this.bead(layout.current.x, layout.current.y, e.current);
        this.bead(layout.next.x, layout.next.y, e.next);
    }
    /** Cache rigid layers, so continuous bobs, feet and orbits only move images. */
    private drawActor(actor: GameCharacter, x: number, y: number, size: number): void {
        const view = fieldView(this.engine.config);
        const { layers, live } = actorLayers(actor, this.reducedMotion);
        for (const layer of layers) {
            const key = `collier-actor-${actor.id}-${actor.pose}-${actor.expression}-${actor.animation}-${String(actor.flip)}-${String(this.reducedMotion)}-${String(size)}-${layer.key}`;
            const width = Math.ceil(size * 2);
            if (!this.textures.exists(key)) {
                const g = this.add.graphics();
                renderCharacter(g, layer.list, (width - size) / 2, (width - size) / 2, size, actor.flip);
                g.generateTexture(key, width, width);
                g.destroy();
            }
            let image = this.actorImages[this.actorCount++];
            if (!image) {
                image = this.add.image(0, 0, key);
                this.actorImages.push(image);
            }
            const dx = (actor.flip ? -layer.x : layer.x) * size / 240;
            const dy = layer.y * size / 240;
            const shake = !this.reducedMotion && this.engine.combo > 1 && this.engine.bursts.length ? Math.sin(this.visualTime / 30) * 2 : 0;
            image.setDepth(actor === this.hero ? .5 : -.1).setTexture(key).setPosition((x + size / 2 + dx) * view.scale + view.x + shake,
                (y + size / 2 + dy) * view.scale + view.y).setScale(view.scale)
                .setRotation(actor.flip ? -layer.rotation : layer.rotation).setVisible(true);
        }
        if (live.length) {
            this.actorEffects ??= this.add.graphics().setDepth(.75);
            const shake = !this.reducedMotion && this.engine.combo > 1 && this.engine.bursts.length ? Math.sin(this.visualTime / 30) * 2 : 0;
            this.actorEffects.setPosition(view.x + shake, view.y).setScale(view.scale);
            renderCharacter(this.actorEffects, live, x, y, size, actor.flip);
        }
    }
    /** 120 Hz effect atlas: the largest radius rounding is below .17 logical px.
     * Pigment and the constant one/two-pixel strokes are baked at their final size.
     */
    private particleTexture(color: number, ring: boolean, frame: number): string {
        const key = `collier-particle-${String(color)}-${String(ring)}-${String(frame)}`;
        if (!this.textures.exists(key)) {
            const g = this.add.graphics(), age = frame / 60;
            const width = ring ? 64 : 12;
            if (ring) {
                g.lineStyle(2, palette[color] ?? 0xffffff);
                g.strokeCircle(width / 2, width / 2, DIAMETER * (.5 + age));
            } else drawMotif(g, width / 2, width / 2, color, 3 * (1 - age));
            g.generateTexture(key, width, width);
            g.destroy();
        }
        return key;
    }
    private particle(x: number, y: number, color: number, ring: boolean, age: number, alpha: number): void {
        const key = this.particleTexture(color, ring, Math.max(0, Math.min(60, Math.round(age * 60))));
        let image = this.particleImages[this.particleCount++];
        if (!image) {
            image = this.add.image(0, 0, key).setDepth(2);
            this.particleImages.push(image);
        }
        const view = fieldView(this.engine.config);
        const shake = !this.reducedMotion && this.engine.combo > 1 && this.engine.bursts.length ? Math.sin(this.visualTime / 30) * 2 : 0;
        image.setTexture(key).setPosition(x * view.scale + view.x + shake, y * view.scale + view.y)
            .setScale(view.scale).setAlpha(alpha).setVisible(true);
    }
    private bead(x: number, y: number, color: number, bonus?: Parameters<typeof drawBonus>[3]): void {
        const g = this.graphics;
        if (!g)
            return;
        const view = fieldView(this.engine.config);
        const key = this.beadTexture(color, bonus);
        let image = this.beadImages[this.beadCount++];
        if (!image) {
            image = this.add.image(0, 0, key).setOrigin(.5, .45).setDepth(1);
            this.beadImages.push(image);
        }
        image.setTexture(key).setPosition(x * view.scale + view.x, y * view.scale + view.y)
            .setDisplaySize(40, 40).setVisible(true);
    }
    private beadTexture(color: number, bonus?: Parameters<typeof drawBonus>[3]): string {
        const key = `collier-pearl-${String(color)}-${bonus ?? 'plain'}`;
        if (!this.textures.exists(key)) {
            const texture = this.add.graphics();
            this.paintBead(texture, 20, 18, color, 11.5);
            if (bonus) {
                texture.fillStyle(palette[color] ?? 0xffffff);
                texture.fillCircle(20, 18, 9);
                drawBonus(texture, 20, 18, bonus);
            }
            texture.generateTexture(key, 40, 40);
            texture.destroy();
        }
        return key;
    }
    /** Radial shading and soft shadow are rasterised once, never per frame. */
    private paintBead(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, radius: number): void {
        for (const [spread, alpha] of [[1.2, .06], [1, .1], [.8, .13]] as const) {
            g.fillStyle(0x16142e, alpha);
            g.fillEllipse(x + 1, y + radius * .7, radius * 2.2 * spread, radius * spread);
        }
        const base = palette[color] ?? 0xffffff;
        // Nested off-centre discs sample a radial gradient from shade to light.
        for (let i = 0; i < 16; i++) {
            const t = i / 15;
            const channel = (shift: number): number => {
                const c = (base >> shift) & 255;
                return Math.round(c * (.55 + .45 * t) + (255 - c) * t * .28);
            };
            g.fillStyle((channel(16) << 16) | (channel(8) << 8) | channel(0));
            g.fillCircle(x - t * radius * .27, y - t * radius * .3, radius * (1 - t * .72));
        }
        g.lineStyle(1, 0x152532, .7);
        g.strokeCircle(x, y, radius);
        drawMotif(g, x, y, color, radius);
        g.fillStyle(0xffffff, .85);
        g.fillEllipse(x - radius * .32, y - radius * .48, radius * .48, radius * .24);
        g.fillStyle(0xffffff, .45);
        g.fillCircle(x + radius * .42, y + radius * .5, radius * .12);
    }
}
