import Phaser from 'phaser';
import { Engine, LEVELS, CANNON_Y, difficulty, type Weapon } from '../../engines/essaim/engine';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { EssaimArt } from './art';
export const essaimButtons: readonly TouchButton[] = [
    { id: 'essaim-left', label: '←', ariaLabel: 'Vaisseau à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'essaim-right', label: '→', ariaLabel: 'Vaisseau à droite', size: 56, placement: 'left', mode: 'hold' },
    { id: 'essaim-fire', label: 'Tir', ariaLabel: 'Tir', size: 64, placement: 'right', mode: 'hold' },
];
export interface EssaimHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; autoFire: boolean };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
    weapon(kind: Weapon): void;
    command(): void;
    art(): ReturnType<EssaimArt['stats']>;
    artScenario(name: 'play' | 'boss' | 'weapons'): void;
}
declare global { interface Window { __ESSAIM_TEST__?: EssaimHook } }
const OPTIONS_KEY = 'arcade-lab:essaim:options:v1';
export class EssaimScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'essaim', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private panelKey = '';
    private testManual = false;
    private testAdvancing = false;
    private art?: EssaimArt;
    private hud?: Phaser.GameObjects.Text;
    private left = false;
    private right = false;
    private firing = false;
    private autoFire = readValue(browserStorage(), OPTIONS_KEY) === 'on';
    constructor(private session = new PlaySession(true)) { super('essaim'); }
    private panels(): void {
        const key = `${this.engine.status}:${this.progress.state}:${String(this.engine.level)}:${String(this.engine.state.score)}:${String(this.progress.total)}:${String(this.selecting)}`;
        if (key === this.panelKey) return;
        this.panelKey = key;
        renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting);
    }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false;
        this.left = this.right = this.firing = false; this.art?.reset(); this.art?.update(this.engine.state, 0, []); this.panels(); this.draw();
    }
    private fire(held: boolean): void {
        if (held && this.session.state === 'ready') this.session.send('start');
        this.firing = held;
        if (!this.session.paused && !this.selecting) this.engine.holdFire(held);
        if (!this.session.paused && !this.selecting && held && this.engine.fire()) sound.playEffect('fire');
    }
    create(): void {
        document.body.classList.add('essaim');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('essaim'); delete window.__ESSAIM_TEST__; sound.stop(); this.art?.destroy(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.art = new EssaimArt(this);
        this.hud = this.add.text(12, 592, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 1 });
        renderTouchControls(this.inputs, essaimButtons, (id, held) => {
            if (id === 'essaim-fire') this.fire(held);
            else if (id === 'essaim-left') this.left = held;
            else this.right = held;
        });
        const options = document.createElement('label'); options.className = 'essaim-options';
        const auto = document.createElement('input'); auto.id = 'essaim-auto'; auto.type = 'checkbox'; auto.checked = this.autoFire;
        options.append(auto, document.createTextNode('Tir auto')); document.querySelector('#touch-controls .center')?.append(options);
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
            const e = event as KeyboardEvent;
            if ((e.target as HTMLElement).matches('input')) return;
            if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
            if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = true;
            if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = true;
            if (e.code === 'Space' && !e.repeat) this.fire(true);
        });
        this.inputs.on(document, 'keyup', event => { const e = event as KeyboardEvent; if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = false; if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = false; if (e.code === 'Space') this.fire(false); });
        const release = (): void => { this.left = this.right = this.firing = false; this.engine.move(0); };
        this.inputs.on(globalThis, 'blur', release);
        this.inputs.on(document, 'visibilitychange', () => { if (document.hidden) release(); });
        const choose = (): void => { this.selecting = !this.selecting; release(); renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.art?.reset(); this.art?.update(this.engine.state, 0, []); release(); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        area.setAttribute('aria-label', 'Essaim : guider le vaisseau en bas et tirer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ESSAIM_TEST__ = {
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
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state, autoFire: this.autoFire }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            weapon: kind => { this.start(0, 458, true); this.engine.state.pickups = []; this.engine.step(1200); this.engine.equip(kind); this.draw(); },
            command: () => {
                this.start(29, 458, true);
                this.engine.loadState({ ...this.engine.state, wave: difficulty(29).waves, pickups: [], enemies: [], boss: { x:180,y:65,hp:12,maxHp:24,phase:2,clock:1900,exposed:true,pattern:6 } });
                this.engine.equip('charge'); this.draw();
            },
            scenario: name => {
                this.start(0, 457, true);
                const first = this.engine.state.enemies[0]; if (!first) throw new Error('Ennemi absent');
                this.engine.loadState({ ...this.engine.state, enemies: [{ ...first, id: 0, x: name === 'finish' ? 180 : 70, y: 440, homeX: name === 'finish' ? 180 : 70, homeY: 440, phase: 'formation', type: 'scout', hp: 1, captured: false }], wave: 2,
                    lives: name === 'danger' ? 1 : 3, enemyTimer: 1e6, diveTimer: 1e6,
                    shots: name === 'danger' ? [{ x: 240, y: 490, owner: 'enemy' }] : [],
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
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        if (!this.selecting) {
            if (this.left || this.right) this.engine.move(this.left === this.right ? 0 : this.right ? 1 : -1);
            else if (this.engine.state.move) this.engine.move(0);
            this.engine.holdFire(this.firing || this.autoFire);
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
        const s = this.engine.state;
        this.art?.draw(s, this.engine.level, this.engine.dronePositions());
        const labels: Record<Weapon, string> = { beam: 'Rayon', bounce: 'Rebond', drones: 'Drones', slow: 'Onde', magnet: 'Aimant', charge: 'Charge' };
        const weapons = s.weapons.map(w => `${labels[w.kind]} ${String(Math.ceil(w.remaining/1000))}s${w.kind === 'beam' ? ` ${String(Math.round(s.heat))}%${s.overheated ? ' BLOQUÉ' : ''}` : w.kind === 'charge' ? ` ${String(Math.round(s.charge/15))}%` : ''}`).join(' · ');
        this.hud?.setText(`${weapons}\n${s.double > 0 ? 'DOUBLE ' : ''}${this.engine.challenge ? 'DÉFI ' : ''}ESSAIM ${String(this.engine.level + 1)}     VIES ${'◆'.repeat(s.lives)}\nSCORE ${String(s.score)}     VAGUE ${String(s.wave)} · ${String(s.enemies.length)}`);
        const status = document.querySelector('#status');
        const statusText = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : 'En jeu'}`;
        if (status && status.textContent !== statusText) status.textContent = statusText;
    }
}
