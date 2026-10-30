import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, CANNON_Y, difficulty, type Weapon } from '../../engines/essaim/engine';
import { Inputs, horizontalDrag, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { EssaimArt } from './art';
export const essaimButtons: readonly TouchButton[] = [
    { id: 'essaim-special', label: 'Écu', ariaLabel: 'Bouclier', size: 56, placement: 'right', mode: 'tap' },
    { id: 'essaim-left', label: '←', ariaLabel: 'Vaisseau à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'essaim-right', label: '→', ariaLabel: 'Vaisseau à droite', size: 56, placement: 'left', mode: 'hold' },
    { id: 'essaim-fire', label: 'Tir', ariaLabel: 'Tir', size: 64, placement: 'right', mode: 'hold' },
];
export interface EssaimHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; autoFire: boolean; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger' | 'special'): void;
    weapon(kind: Weapon): void;
    command(): void;
    lastWave(): void;
    art(): ReturnType<EssaimArt['stats']>;
    timing(reset?: boolean): { frames: number; updateMs: number; drawMs: number; meanMs: number };
    artScenario(name: 'play' | 'boss' | 'weapons'): void;
}
declare global { interface Window { __ESSAIM_TEST__?: EssaimHook } }
const OPTIONS_KEY = 'arcade-lab:essaim:autofire:v1';
export class EssaimScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private specialGraphics?: Phaser.GameObjects.Graphics;
    private progress = new Progression(readSave(browserStorage(), 'essaim', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private panelKey = '';
    private testTiming = { frames: 0, updateMs: 0, drawMs: 0 };
    private timingFrame = false;
    private testManual = false;
    private testAdvancing = false;
    private art?: EssaimArt;
    private hud?: Phaser.GameObjects.Text;
    private left = false;
    private right = false;
    private firing = false;
    private signatureHeld = false;
    private autoFire = (readValue(browserStorage(), OPTIONS_KEY) ?? readValue(browserStorage(), 'arcade-lab:essaim:options:v1')) !== 'off';
    constructor(private session = new PlaySession(true)) { super('essaim'); }
    private panels(): void {
        const key = `${this.engine.status}:${this.progress.state}:${String(this.engine.level)}:${String(this.engine.state.score)}:${String(this.progress.total)}:${String(this.selecting)}`;
        if (key === this.panelKey) return;
        this.panelKey = key;
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting);
    }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.engine.enableSignature(this.hero.id); this.selecting = false;
        this.left = this.right = this.firing = this.signatureHeld = false; this.art?.reset(); this.art?.update(this.engine.state, 0, []); this.panels(); this.draw();
    }
    private fire(held: boolean): void {
        if (held && this.session.state === 'ready') this.session.send('start');
        this.firing = held; this.signatureHeld = held;
        if (!this.session.paused && !this.selecting) { this.engine.holdFire(held); this.engine.holdSignature(held); }
        if (!this.session.paused && !this.selecting && held && this.engine.fire()) sound.playEffect('fire');
    }
    private special(): void {
        if (this.session.state === 'ready') this.session.send('start');
        if (!this.session.paused && !this.selecting && this.engine.special()) { sound.playEffect('bonus'); this.draw(); }
    }
    create(): void {
        this.engine.enableSignature(this.hero.id);
        this.specialGraphics = this.add.graphics().setDepth(4);
        document.body.classList.add('essaim');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('essaim'); delete window.__ESSAIM_TEST__; sound.stop(); this.art?.destroy(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.art = new EssaimArt(this);
        this.hud = this.add.text(12, 592, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 1 }).setDepth(5);
        renderTouchControls(this.inputs, essaimButtons, (id, held) => {
            if (id === 'essaim-special') { if (held) this.special(); } else if (id === 'essaim-fire') this.fire(held);
            else if (id === 'essaim-left') this.left = held;
            else this.right = held;
        });
        const steering = document.querySelector<HTMLElement>('#touch-controls .left');
        if (steering) {
            steering.id = 'essaim-steer'; steering.setAttribute('aria-label', 'Glisser au pouce gauche pour guider');
            let origin = this.engine.state.cannon;
            this.inputs.on(steering, 'pointerdown', () => { origin = this.engine.state.cannon; }, { capture: true });
            horizontalDrag(this.inputs, steering, 120, x => {
                if (this.session.paused || this.selecting) return;
                this.left = this.right = false;
                this.engine.moveTo(origin + x - 60);
            });
        }
        const options = document.createElement('label'); options.className = 'essaim-options';
        const auto = document.createElement('input'); auto.id = 'essaim-auto'; auto.type = 'checkbox'; auto.checked = this.autoFire;
        options.append(auto, document.createTextNode('Tir auto')); document.querySelector('#game-menu')?.append(options); this.inputs.cleanup(() => { options.remove(); });
        this.inputs.on(auto, 'change', () => { this.autoFire = auto.checked; writeValue(browserStorage(), OPTIONS_KEY, this.autoFire ? 'on' : 'off'); });
        const area = this.game.canvas;
        let pointer: number | null = null;
        const move = (e: PointerEvent): void => {
            if (this.session.paused || this.selecting) return;
            const rect = area.getBoundingClientRect();
            // Touch coordinates lose precision through the browser and fractional FIT scale.
            const x = (e.clientX - rect.left) * 360 / rect.width;
            this.engine.moveTo(e.pointerType === 'touch' ? Math.round(x) : x);
        };
        this.inputs.on(area, 'pointerdown', event => {
            const e = event as PointerEvent, rect = area.getBoundingClientRect();
            const minimumY = e.pointerType === 'touch' ? CANNON_Y + 34 : 320;
            if (pointer !== null || e.clientY < rect.top + rect.height * minimumY / 640) return;
            e.preventDefault(); pointer = e.pointerId; area.setPointerCapture(e.pointerId);
            if (this.session.state === 'ready') this.session.send('start'); this.firing = true; move(e);
        });
        this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerId === pointer || e.pointerType === 'mouse' && e.buttons === 0) move(e); });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.inputs.on(area, type, event => { if ((event as PointerEvent).pointerId === pointer) { pointer = null; this.firing = false; } });
        this.inputs.on(area, 'click', event => { if ((event as MouseEvent).detail && (event as PointerEvent).pointerType !== 'touch') { this.fire(true); this.fire(false); } });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent; if (e.code === 'KeyC' && !e.repeat) this.special();
            if ((e.target as HTMLElement).matches('input:not([type=checkbox])')) return;
            if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
            if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = true;
            if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = true;
            if (e.code === 'Space' && !e.repeat) this.fire(true);
        });
        this.inputs.on(document, 'keyup', event => { const e = event as KeyboardEvent; if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = false; if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = false; if (e.code === 'Space') this.fire(false); });
        const release = (): void => { this.engine.holdSignature(false); this.left = this.right = this.firing = this.signatureHeld = false; this.engine.move(0); };
        this.inputs.on(globalThis, 'blur', release);
        this.inputs.on(document, 'visibilitychange', () => { if (document.hidden) release(); });
        const choose = (): void => { this.selecting = !this.selecting; release(); renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.engine.enableSignature(this.hero.id); this.art?.reset(); this.art?.update(this.engine.state, 0, []); release(); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        area.setAttribute('aria-label', 'Essaim : guider le vaisseau en bas et tirer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ESSAIM_TEST__ = {
            timing: (reset = false) => {
                if (reset) this.testTiming = { frames: 0, updateMs: 0, drawMs: 0 };
                const t = this.testTiming;
                return { ...t, meanMs: t.frames ? (t.updateMs + t.drawMs) / t.frames : 0 };
            },
            art: () => { if (!this.art) throw new Error('Rendu absent'); return this.art.stats(); },
            artScenario: name => {
                this.start(name === 'boss' ? 29 : 26, 458, true);
                this.engine.step(1600);
                if (name === 'play') {
                    const types = ['shield', 'miner', 'split', 'spiral', 'turret', 'mirror', 'armor'] as const;
                    const template = this.engine.state.enemies[0];
                    if (template) this.engine.state.enemies = types.map((type, i) => ({ ...template, id: i, type, x: 65 + i % 3 * 112, homeX: 65 + i % 3 * 112, y: 100 + Math.floor(i / 3) * 76, homeY: 100 + Math.floor(i / 3) * 76, phase: 'formation', hp: type === 'armor' ? 2 : 1, captured: false }));
                    this.engine.state.shots.push({ x: 95, y: 350, owner: 'enemy' }, { x: 255, y: 410, owner: 'enemy', mine: 900 });
                } else if (name === 'boss') {
                    this.engine.state.boss = { x: 180, y: 70, hp: 12, maxHp: 24, phase: 2, clock: 1900, exposed: true, pattern: 6 };
                } else {
                    this.engine.state.pickups = []; this.engine.equip('drones'); this.engine.equip('bounce');
                    this.engine.state.shots.push({ x: 100, y: 340, owner: 'player', vx: 420, vy: -350, bounces: 1 });
                }
                this.art?.reset(); this.art?.update(this.engine.state, 0, []);
                if (name === 'play' && this.art) this.art.pool.burst(235, 320, this.art.reduced);
                this.draw();
            },
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ character: this.hero.snapshot(), ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state, autoFire: this.autoFire }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            weapon: kind => { this.start(0, 458, true); this.engine.state.pickups = []; this.engine.step(1200); this.engine.equip(kind); this.draw(); },
            lastWave: () => {
                this.engine.state.enemies = []; this.engine.state.boss = null;
                this.engine.state.wave = difficulty(this.engine.level).waves - 1;
                this.engine.step(1000 / 60); this.art?.reset(); this.art?.update(this.engine.state, 0, []); this.draw();
            },
            command: () => {
                this.start(29, 458, true);
                this.engine.loadState({ ...this.engine.state, wave: difficulty(29).waves, pickups: [], enemies: [], boss: { x:180,y:65,hp:12,maxHp:24,phase:2,clock:1900,exposed:true,pattern:6 } });
                this.engine.equip('charge'); this.draw();
            },
            scenario: name => {
                this.start(0, 457, true);
                const first = this.engine.state.enemies[0]; if (!first) throw new Error('Ennemi absent');
                this.engine.loadState({ ...this.engine.state, enemies: [{ ...first, id: 0, x: name === 'danger' ? 70 : 180, y: name === 'special' ? 100 : 440, homeX: name === 'danger' ? 70 : 180, homeY: name === 'special' ? 100 : 440, phase: 'formation', type: 'scout', hp: 1, captured: false }], wave: 2,
                    pickups: name === 'special' ? [] : this.engine.state.pickups, lives: name === 'finish' ? 3 : 1, enemyTimer: 1e6, diveTimer: 1e6,
                    shots: name === 'special' ? [{ x: 180, y: 470, owner: 'enemy', vy: 120 }] : name === 'danger' ? [{ x: 240, y: 490, owner: 'enemy' }] : [],
                }); this.art?.reset(); this.art?.update(this.engine.state, 0, []); this.draw();
            },
        };
        this.art.update(this.engine.state, 0, []); this.panels(); this.draw();
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
        this.timingFrame = Boolean(window.__ESSAIM_TEST__) && !this.testManual && !this.session.paused && !this.selecting && this.engine.status === 'playing';
        const start = this.timingFrame ? performance.now() : 0, beforeDraw = this.testTiming.drawMs;
        this.tick(this.testManual ? 0 : delta);
        if (this.timingFrame) {
            this.testTiming.updateMs += performance.now() - start - (this.testTiming.drawMs - beforeDraw);
            this.testTiming.frames++;
        }
        this.timingFrame = false;
    }
    private tick(delta: number): void {
        if (!this.session.paused && !this.selecting) this.engine.holdSignature(this.signatureHeld);
        this.hero.advance(delta, this.session.paused, this.engine.status, false);
        if (!this.selecting && !this.session.paused) {
            if (this.left || this.right) this.engine.move(this.left === this.right ? 0 : this.right ? 1 : -1);
            else if (this.engine.state.move) this.engine.move(0);
            this.engine.holdFire(this.engine.has('charge') ? this.firing || this.autoFire && this.engine.state.ticks % 100 < 90 : this.firing || this.autoFire);
            this.engine.step(delta);
            for (const event of new Set(this.engine.events)) {
                sound.playEffect(event);
            }
            this.art?.update(this.engine.state, delta, this.engine.events);
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'essaim'); sound.playEffect(this.engine.status);
        }
        if (this.testAdvancing) return;
        // FIT is refreshed by the shell ResizeObserver, not on every rendered frame.
        this.panels(); this.draw();
    }
    private draw(): void {
        const start = this.timingFrame ? performance.now() : 0;
        const s = this.engine.state;
        this.art?.draw(s, this.engine.level, this.engine.dronePositions());
        const labels: Record<Weapon, string> = { beam: 'Rayon', bounce: 'Rebond', drones: 'Drones', slow: 'Onde', magnet: 'Aimant', charge: 'Charge' };
        const weapons = s.weapons.map(w => `${labels[w.kind]} ${String(Math.ceil(w.remaining/1000))}s${w.kind === 'beam' ? ` ${String(Math.round(s.heat))}%${s.overheated ? ' BLOQUÉ' : ''}` : w.kind === 'charge' ? ` ${String(Math.round(s.charge/15))}%` : ''}`).join(' · ');
        this.specialGraphics?.clear();
        this.hero.advance(0, this.session.paused, this.engine.status, (s.specialTicks ?? 0) > 0);
        if ((s.specialTicks ?? 0) > 0 && this.specialGraphics) this.hero.drawEffect(this.specialGraphics, s.cannon - 46, CANNON_Y - 46, 92);
        this.hud?.setText(`${weapons} · Signature ${s.signature?.cooldown ? `${String(Math.ceil(s.signature.cooldown / 1000))}s` : `${String(Math.round((s.signature?.charge ?? 0) * 100))}%`}\n${s.double > 0 ? 'DOUBLE ' : ''}${this.engine.challenge ? 'DÉFI ' : ''}${LEVELS[this.engine.level]?.name ?? 'Essaim'}     VIES ${'◆'.repeat(s.lives)}\nSCORE ${String(s.score)}     VAGUE ${String(s.wave)} · ${String(s.enemies.length)} · Bouclier ${(s.specialTicks ?? 0) > 0 ? `${String(Math.ceil((s.specialTicks ?? 0) / 60))}s` : s.specialUsed ? 'UTILISÉ' : 'PRÊT'}`);
        const fireButton = document.querySelector('#essaim-fire'); if (fireButton) fireButton.textContent = this.autoFire ? 'Charge' : 'Tir';
        const status = document.querySelector('#status');
        const statusText = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : 'En jeu'}`;
        if (status && status.textContent !== statusText) status.textContent = statusText;
        if (this.timingFrame) this.testTiming.drawMs += performance.now() - start;
    }
}
