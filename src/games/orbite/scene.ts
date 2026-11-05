import { fingerProof } from './finger';
import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, SHIELD_Y, CANNON_Y } from '../../engines/orbite/engine';
import { stage } from '../../engines/orbite/campaign';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { backdrop, playerShip, probeShip, shieldCells, worldOf, PROBE_COLORS, SHIP_COLORS } from './art';
export const orbiteButtons: readonly TouchButton[] = [
    // The cannon follows a horizontal drag in the lower half; it fires on its own by default.
    { id: 'orbite-special', label: 'Rafale', ariaLabel: 'Rafale : tir doublé', size: 56, placement: 'right', mode: 'tap' },
    { id: 'orbite-auto', label: 'Tir auto', ariaLabel: 'Tir automatique', size: 56, placement: 'right', mode: 'tap', setting: true },
];
export interface OrbiteHook {
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    hudText(): string;
    renderedProbeIds(): number[];
    usefulArea(): { x: number; y: number; width: number; height: number };
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean; firing: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']>; specialUses: number; specialTicks: number; autoFire: boolean };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __ORBITE_TEST__?: OrbiteHook } }
const OPTIONS_KEY = 'arcade-lab:orbite:options:v1';
/** Ship hull in each companion's colour (charter: one ship per companion). */
const SHIP = SHIP_COLORS;
export class OrbiteScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'orbite', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private left = false;
    private right = false;
    private firing = false;
    // On unless turned off: a finger steering the cannon is enough to play.
    private autoFire = readValue(browserStorage(), OPTIONS_KEY) !== 'off';
    private renderedProbes: number[] = [];
    private glow = 0;
    private glowColor = 0x78ead5;
    private sparks: { x: number; y: number; age: number }[] = [];
    constructor(private session = new PlaySession(true)) { super('orbite'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false;
        this.left = this.right = this.firing = false; this.sparks = []; this.panels(); this.draw();
    }
    private fire(held: boolean): void {
        if (held && this.session.state === 'ready') this.session.send('start');
        this.firing = held;
        if (!this.session.paused && !this.selecting && held && this.engine.fire()) sound.playEffect('fire');
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('orbite');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('orbite'); delete window.__ORBITE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.backdropImage = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(-1);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(16, 14, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 3 });
        renderTouchControls(this.inputs, orbiteButtons, (id, held) => {
            if (!held) return;
            if (id === 'orbite-special') { if (!this.session.paused && !this.selecting) this.engine.special(); return; }
            // A setting, changed from the pause page.
            this.autoFire = !this.autoFire; writeValue(browserStorage(), OPTIONS_KEY, this.autoFire ? 'on' : 'off');
            document.querySelector('#orbite-auto')?.setAttribute('aria-pressed', String(this.autoFire));
        });
        document.querySelector('#orbite-auto')?.setAttribute('aria-pressed', String(this.autoFire));
        const area = this.game.canvas;
        let pointer: number | null = null;
        const move = (e: PointerEvent): void => {
            if (this.session.paused || this.selecting) return;
            const rect = area.getBoundingClientRect();
            // Touch coordinates lose precision through the browser and fractional FIT scale.
            const x = (e.clientX - rect.left) * 360 / rect.width;
            this.engine.moveTo(e.pointerType === 'touch' ? Math.round(x) : x);
        };
        let trigger: number | null = null;
        this.inputs.on(area, 'pointerdown', event => {
            const e = event as PointerEvent, rect = area.getBoundingClientRect();
            // Without automatic fire, a finger held on the upper half fires.
            if (e.pointerType === 'touch' && e.clientY < rect.top + rect.height / 2 && !this.autoFire && trigger === null) { e.preventDefault(); trigger = e.pointerId; this.fire(true); return; }
            if (pointer !== null || e.clientY < rect.top + rect.height / 2) return;
            e.preventDefault(); pointer = e.pointerId; area.setPointerCapture(e.pointerId);
            if (this.session.state === 'ready') this.session.send('start'); move(e);
        });
        this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerId === pointer || e.pointerType === 'mouse' && e.buttons === 0) move(e); });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.inputs.on(area, type, event => {
            const id = (event as PointerEvent).pointerId;
            if (id === pointer) pointer = null;
            if (id === trigger) { trigger = null; this.fire(false); }
        });
        this.inputs.on(area, 'click', event => { if ((event as MouseEvent).detail && (event as PointerEvent).pointerType !== 'touch') { this.fire(true); this.fire(false); } });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if ((e.target as HTMLElement).matches('input')) return;
            if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
            if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = true;
            if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = true;
            if (e.code === 'KeyE' && !e.repeat && !this.session.paused && !this.selecting) this.engine.special();
            if (e.code === 'Space' && !e.repeat) this.fire(true);
        });
        this.inputs.on(document, 'keyup', event => { const e = event as KeyboardEvent; if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = false; if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = false; if (e.code === 'Space') this.fire(false); });
        const release = (): void => { this.left = this.right = this.firing = false; this.engine.move(0); };
        this.inputs.on(globalThis, 'blur', release);
        this.inputs.on(document, 'visibilitychange', () => { if (document.hidden) release(); });
        const choose = (): void => { this.selecting = !this.selecting; release(); renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); release(); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        area.setAttribute('aria-label', 'Orbite : flotte de sondes, guider le canon en bas et tirer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ORBITE_TEST__ = {
            ...fingerProof,
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            renderedProbeIds: () => [...this.renderedProbes],
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.engine.state.ticks * 1000 / 60 }),
            fingerReceipts: receipts,
            read: () => ({ fingerInput: { paused: this.session.paused, firing: this.firing }, ...this.engine.snapshot(), character: this.hero.snapshot(), specialUses: this.engine.specialUses, specialTicks: this.engine.specialTicks, cumulativeScore: this.progress.total, progression: this.progress.state, autoFire: this.autoFire }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                this.start(0, 457, true);
                this.engine.loadState({ ...this.engine.state, probes: [{ id: 0, x: name === 'finish' ? 180 : 70, y: 440, row: 2, column: 0, hp: 1 }], initialCount: 1,
                    lives: name === 'danger' ? 1 : 3, shields: [], enemyTimer: 1e6, cometTimer: 1e6,
                    shots: name === 'danger' ? [{ x: 240, y: 540, owner: 'enemy' }] : [],
                }); this.draw();
            },
        };
        this.panels(); this.draw();
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
    updatePaused(): void { this.tick(0); }
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        if (!this.session.paused && !this.selecting) {
            if (this.left || this.right) this.engine.move(this.left === this.right ? 0 : this.right ? 1 : -1);
            else if (this.engine.state.move) this.engine.move(0);
            this.engine.holdFire(this.firing || this.autoFire);
            const before = this.engine.state.probes;
            const cannon = this.engine.state.cannon;
            this.engine.step(delta);
            if (cannon !== this.engine.state.cannon) this.hero.move(Math.sign(this.engine.state.cannon - cannon));
            for (const event of new Set(this.engine.events)) {
                sound.playEffect(event);
                if (event === 'life') this.hero.impact = 500;
                if (event === 'fire' && cannon === this.engine.state.cannon) this.hero.move(0);
                if (event === 'probe' || event === 'bonus') { this.hero.moving = 350; this.hero.animation = 'celebration'; }
                if (['life', 'probe', 'armor', 'bonus', 'shield'].includes(event)) { this.glow = 1; this.glowColor = event === 'life' ? 0xff8da9 : event === 'bonus' ? 0xffdb89 : 0x78ead5; }
            }
            for (const probe of before) if (!this.engine.state.probes.includes(probe)) this.sparks.push({ x: probe.x, y: probe.y, age: 0 });
        }
        this.hero.advance(delta, this.session.paused || this.selecting, this.engine.status, this.engine.specialTicks > 0);
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'orbite'); sound.playEffect(this.engine.status);
        }
        this.glow = Math.max(0, this.glow - delta / 250); for (const spark of this.sparks) spark.age += delta;
        this.sparks = this.sparks.filter(s => s.age < 350);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    /** Sky, nebula, planets and stars: baked once per world, shown as one image. */
    private backdropImage?: Phaser.GameObjects.Image;
    private ensureBackdrop(): void {
        const world = worldOf(this.engine.level), key = `orbite-bg-${world}`;
        if (!this.textures.exists(key)) { const b = this.make.graphics({}, false); backdrop(b, world); b.generateTexture(key, 360, 640); b.destroy(); }
        this.backdropImage?.setTexture(key);
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state, world = worldOf(this.engine.level);
        this.ensureBackdrop();
        g.clear();
        shieldCells(g, world, s.shields, SHIELD_Y);
        for (const well of s.wells ?? []) {
            for (const radius of [18, 30, 44]) { g.lineStyle(2, 0xbaadff, 0.6); g.strokeEllipse(well.x, well.y, radius * 2, radius); }
            g.fillStyle(0x080b20); g.fillCircle(well.x, well.y, 10);
        }
        for (const rock of s.asteroids ?? []) {
            g.fillStyle(0x937d70); g.fillCircle(rock.x, rock.y, 22);
            g.lineStyle(2, 0xffdb89); g.strokeCircle(rock.x, rock.y, 23);
            g.fillStyle(0x564957); g.fillCircle(rock.x - 7, rock.y - 5, 6); g.fillCircle(rock.x + 8, rock.y + 7, 4);
        }
        if (s.satellite) {
            const a = s.satellite; g.fillStyle(0x78ead5); g.fillRoundedRect(a.x - 10, a.y - 7, 20, 14, 4);
            g.fillStyle(0x87d8ff); g.fillRect(a.x - 24, a.y - 4, 11, 8); g.fillRect(a.x + 13, a.y - 4, 11, 8);
            for (let i = 0; i < a.hp; i++) { g.fillStyle(0x78ead5); g.fillCircle(a.x - 12 + i * 8, a.y + 14, 2); }
        }
        if (s.boss) {
            const b = s.boss, open = !s.probes.length && this.engine.bossOpen();
            g.fillStyle(b.phase === 2 ? 0xff8da9 : 0xbaadff); g.fillRoundedRect(b.x - 28, b.y - 15, 56, 30, 9);
            g.fillStyle(open ? 0x78ead5 : 0x564957); g.fillCircle(b.x, b.y + 3, 10);
            g.lineStyle(2, open ? 0xffffff : 0xffdb89); g.strokeCircle(b.x, b.y + 3, 12);
            g.fillStyle(0x312e52); g.fillRect(b.x - 26, b.y - 23, 52, 4);
            g.fillStyle(0xff8da9); g.fillRect(b.x - 26, b.y - 23, 52 * b.hp / b.maxHp, 4);
        }
        this.renderedProbes = [];
        for (const p of s.probes) {
            if (!this.engine.visible(p)) continue;
            this.renderedProbes.push(p.id);
            const color = PROBE_COLORS[p.row] ?? 0xffffff;
            probeShip(g, p.x, p.y, color, Math.sin(s.ticks / 6 + p.column));
            if (p.kind === 'rotor') { g.lineStyle(3, 0x87d8ff); g.beginPath(); const start = Math.PI / 2 - (s.ticks + p.id * 11) % 120 * Math.PI / 60; g.arc(p.x, p.y, 16, start, start + Math.PI * 0.75); g.strokePath(); }
            if (p.kind === 'split') { g.lineStyle(2, 0xff8da9); g.lineBetween(p.x - 6, p.y - 5, p.x + 6, p.y + 5); g.lineBetween(p.x + 6, p.y - 5, p.x - 6, p.y + 5); }
            if (p.kind === 'repair') { g.fillStyle(0x78ead5); g.fillRect(p.x - 7, p.y - 2, 14, 4); g.fillRect(p.x - 2, p.y - 7, 4, 14); }
            if (p.kind === 'stealth') { g.lineStyle(2, 0xbaadff); g.strokeCircle(p.x, p.y, 16); }
            if (p.kind === 'fragment') { g.lineStyle(1, 0xff8da9); g.strokeTriangle(p.x, p.y - 7, p.x - 5, p.y + 5, p.x + 5, p.y + 5); }
            if (p.hp > 1) { g.lineStyle(2, 0xffffff); g.strokeRoundedRect(p.x - 13, p.y - 13, 26, 26, 5); }
        }
        if (s.comet) {
            const c = s.comet; g.lineStyle(5, 0xffdb89, 0.25); g.lineBetween(c.x - c.direction * 24, c.y, c.x, c.y);
            g.fillStyle(0xffdb89); g.fillEllipse(c.x, c.y, 28, 12); g.fillStyle(0xffffff); g.fillCircle(c.x + c.direction * 5, c.y, 3);
        }
        for (const shot of s.shots) { g.fillStyle(shot.owner === 'player' ? 0xc2fff2 : 0xff91ac); g.fillRoundedRect(shot.x - 1.5, shot.y - 5, 3, 10, 1.5); }
        if (s.invulnerable === 0 || s.ticks % 8 < 4) {
            playerShip(g, s.cannon, CANNON_Y, SHIP[this.hero.id] ?? 0x78ead5, Math.abs(Math.sin(s.ticks / 4)));
        }
        this.hero.draw(g, s.cannon - 14, CANNON_Y - 44, 28);
        if (this.engine.specialTicks > 0) for (const shot of s.shots) if (shot.owner === 'player') this.hero.drawEffect(g, shot.x - 14, shot.y - 14, 28);
        for (const spark of this.sparks) { g.lineStyle(2, 0xffdb89, 1 - spark.age / 350); for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3, radius = 8 + spark.age / 15; g.lineBetween(spark.x + Math.cos(angle) * radius, spark.y + Math.sin(angle) * radius, spark.x + Math.cos(angle) * (radius + 5), spark.y + Math.sin(angle) * (radius + 5)); } }
        if (this.glow) { g.lineStyle(3, this.glowColor, this.glow); g.strokeRoundedRect(2, 2, 356, 636, 14); }
        const c = stage(this.engine.level);
        const names = { rotor: 'Rotors : attendre l’ouverture', split: 'Scindées : finir les fragments', asteroid: 'Astéroïdes : tirs déviés', gravity: 'Gravité : viser en avance', stealth: 'Furtives : guetter le retour', repair: 'Réparateurs : priorité', satellite: 'Protéger le satellite : intercepter', spiral: 'Essaim : suivre les courbes' };
        const mechanicHint = c.mechanics[0] ? names[c.mechanics[0]] : 'Défendre les quatre abris';
        const hint = s.boss ? s.probes.length ? 'GARDIEN : éliminer les escortes' : `CŒUR : viser au vert · PHASE ${String(s.boss.phase)}` : c.rest ? 'RESPIRATION · ' + mechanicHint : mechanicHint;
        this.hud?.setText(`ORBITE ${String(this.engine.level + 1)} · RAFALE ${String(this.engine.specialUses)}/1 (${(this.engine.specialTicks / 60).toFixed(1)} s)
VIES ${'◆'.repeat(s.lives)}\nSCORE ${String(s.score)}     SONDES ${String(s.probes.length)}\n${this.engine.level < 3 ? 'Défendre les quatre abris' : hint}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : 'En jeu'}`;
    }
}
