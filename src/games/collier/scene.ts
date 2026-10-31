import { readDriver } from './driver';
import { fieldView, logicalPoint, shooterLayout, themeIndex, themes } from './presentation';
import { drawDecor, drawMotif, drawBonus } from './art';
import Phaser from 'phaser';
import { Engine, DIAMETER } from '../../engines/collier/engine';
import { GAME_NAME, LEVELS } from '../../engines/collier/levels';
import { GameCharacter } from '../../characters/game';
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
export interface CollierHook {
    read(): ReturnType<Engine['snapshot']> & {
        character: ReturnType<GameCharacter['snapshot']>;
        leader: ReturnType<GameCharacter['snapshot']>;
        progression: string;
    };
    readDriver(): ReturnType<typeof readDriver>;
    view(): ReturnType<typeof fieldView>;
    hudText(): string;
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
    private hud?: Phaser.GameObjects.Text;
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
        this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.beadImages = [];
        this.track = undefined;
        this.graphics = this.add.graphics();
        // Prepare the small atlas before the first frame, including bonus variants.
        for (let color = 0; color < palette.length; color++)
            for (const bonus of [undefined, 'slow', 'reverse', 'bomb', 'aim'] as const)
                this.beadTexture(color, bonus);
        this.comboLabel = this.add.text(180, 505, '', { fontFamily: 'system-ui', fontSize: '24px', color: '#fff4bc', stroke: '#482147', strokeThickness: 5 }).setOrigin(.5);
        this.hud = this.add.text(14, 558, '', {
            fontFamily: 'system-ui',
            fontSize: '14px',
            color: '#eff9ec',
            lineSpacing: 5
        });
        const cleanup = (): void => {
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
            const o = this.engine.config.shooter;
            const tap = Math.max(down.moved, Math.hypot(p.x - down.x, p.y - down.y)) < 10;
            if (tap && (Math.hypot(down.x - o.x, down.y - o.y) < 30 || Math.hypot(down.x - (o.x + 44), down.y - (o.y + 35)) < 24))
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
                read: () => ({
                    ...this.engine.snapshot(),
                    character: this.hero.snapshot(),
                    leader: this.leader.snapshot(),
                    progression: this.progress.state
                }),
                readDriver: () => readDriver(this.engine),
                view: () => fieldView(this.engine.config),
                hudText: () => this.hud?.text ?? '',
                usefulArea: () => ({
                    x: 0,
                    y: 40,
                    width: 360,
                    height: 510
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
        for (const image of this.beadImages) image.setVisible(false);
        this.beadCount = 0;
        const universe = themeIndex(e.level);
        if (universe !== this.universe) {
            this.universe = universe;
            this.background?.destroy();
            const key = `collier-decor-${String(universe)}`;
            if (!this.textures.exists(key)) {
                const decor = this.add.graphics();
                drawDecor(decor, universe);
                decor.generateTexture(key, 360, 640);
                decor.destroy();
            }
            this.background = this.add.image(0, 0, key).setOrigin(0).setDepth(-1);
        }
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
            for (const [a, b] of e.config.tunnels) {
                g.lineStyle(26, 0x3e5354);
                for (let s = a; s < b; s += 5) {
                    const p = path.pointAt(s), q = path.pointAt(Math.min(s + 5, b));
                    g.lineBetween(p.x, p.y, q.x, q.y);
                }
                const p = path.pointAt(a);
                g.lineStyle(3, 0xd4b879);
                g.strokeCircle(p.x, p.y, 14);
            }
            if (chain.beads.length) {
                const p = path.pointAt((chain.beads.at(-1)?.s ?? 0) + 24);
                const size = 64 / view.scale;
                this.leader.draw(g, p.x - size / 2, p.y - size * .7, size);
            }
            if (e.reverseMs > 0) {
                const p = path.pointAt(chain.beads[0]?.s ?? 0);
                g.lineStyle(2, 0xffb867);
                g.lineBetween(p.x, p.y, p.x - 28, p.y + 15);
                this.helper.draw(g, p.x - 60, p.y, 38);
            }
        });
        const o = e.config.shooter, impact = e.trace();
        if (e.status === 'playing' && !e.flight) {
            const length = e.aimMs > 0 ? Math.hypot(impact.x - o.x, impact.y - o.y) : 800;
            for (let s = 60 / view.scale; s < length; s += 12) {
                const x = o.x + Math.cos(e.angle) * s, y = o.y + Math.sin(e.angle) * s;
                g.fillStyle(0xf8f1cd, e.aimMs > 0 ? .95 : .5);
                g.fillCircle(x, y, 2);
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
            g.lineStyle(2, palette[b.color] ?? 0xffffff, 1 - age);
            g.strokeCircle(b.x, b.y, DIAMETER * (.5 + (this.reducedMotion ? 0 : age)));
            if (!this.reducedMotion)
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    drawMotif(g, b.x + Math.cos(angle) * age * 32, b.y + Math.sin(angle) * age * 32, b.color, 3 * (1 - age));
                }
        }
        const active = [
            e.slowMs > 0 ? 'Ralentir' : '',
            e.reverseMs > 0 ? 'Reculer' : '',
            e.bomb ? 'Bombe' : '',
            e.aimMs > 0 ? 'Viser' : ''
        ].filter(Boolean).join(' · ');
        const emitted = e.chains.reduce((total, chain) => total + chain.emitted, 0);
        const title = `NIVEAU ${String(e.level + 1)} · ${e.config.name}`;
        const counters = `SCORE ${String(e.score)} · PERLES ${String(emitted)}/${String(e.config.quota)}`;
        const warning = e.danger ? ' · DANGER !' : '';
        const guidance = active || 'Viser partout · relâcher pour tirer';
        const combo = e.maxCombo > 1 ? ` · COMBO ×${String(e.maxCombo)}` : '';
        this.hud?.setText([title, counters + warning, guidance + combo].join('\n'));
        const status = document.querySelector('#status');
        if (status)
            status.textContent = `Score : ${String(e.score)} · ${e.status === 'won' ? 'Victoire' : e.status === 'lost' ? 'Défaite' : 'En jeu'}`;
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
            g.fillStyle(theme.light, .8);
            g.fillEllipse(hole.x, hole.y - 6, 44, danger ? 38 : 18);
            g.fillStyle(0x241735);
            g.fillEllipse(hole.x, hole.y - 7, 40, danger ? 34 : 14);
            g.fillStyle(0x090e24, .6);
            g.fillEllipse(hole.x, hole.y - 9, 32, danger ? 24 : 8);
        }
    }
    private drawShooter(): void {
        const g = this.graphics;
        if (!g) return;
        const e = this.engine, o = e.config.shooter;
        const view = fieldView(e.config);
        const theme = themes[themeIndex(e.level)] ?? themes[0];
        const layout = shooterLayout(o, e.angle, view.scale);
        g.lineStyle(5 / view.scale, 0x36213e, .7);
        g.strokeCircle(o.x, o.y + 1 / view.scale, layout.size * .56);
        g.lineStyle(3 / view.scale, theme.light, .95);
        g.strokeCircle(o.x, o.y, layout.size * .56);
        g.lineStyle(1 / view.scale, theme.accent);
        g.strokeCircle(o.x, o.y, layout.size * .56 - 2 / view.scale);
        g.fillStyle(theme.accent);
        const a = layout.arrow, t = e.angle;
        g.fillTriangle(a.x + Math.cos(t) * 9, a.y + Math.sin(t) * 9,
            a.x + Math.cos(t + 2.2) * 8, a.y + Math.sin(t + 2.2) * 8,
            a.x + Math.cos(t - 2.2) * 8, a.y + Math.sin(t - 2.2) * 8);
        this.hero.draw(g, o.x - layout.size / 2, o.y - layout.size / 2, layout.size);
        this.bead(layout.current.x, layout.current.y, e.current);
        this.bead(layout.next.x, layout.next.y, e.next);
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
