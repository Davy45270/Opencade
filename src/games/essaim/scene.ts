import Phaser from 'phaser';
import { Engine, LEVELS, CANNON_Y, WEAPONS, difficulty, type Weapon } from '../../engines/essaim/engine';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
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
}
declare global { interface Window { __ESSAIM_TEST__?: EssaimHook } }
const OPTIONS_KEY = 'arcade-lab:essaim:options:v1';
export class EssaimScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'essaim', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private left = false;
    private right = false;
    private firing = false;
    private autoFire = readValue(browserStorage(), OPTIONS_KEY) === 'on';
    private glow = 0;
    private glowColor = 0x78ead5;
    private sparks: { x: number; y: number; age: number }[] = [];
    constructor(private session = new PlaySession(true)) { super('essaim'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false;
        this.left = this.right = this.firing = false; this.sparks = []; this.panels(); this.draw();
    }
    private fire(held: boolean): void {
        if (held && this.session.state === 'ready') this.session.send('start');
        this.firing = held;
        if (!this.session.paused && !this.selecting) this.engine.holdFire(held);
        if (!this.session.paused && !this.selecting && held && this.engine.fire()) sound.playEffect('fire');
    }
    create(): void {
        document.body.classList.add('essaim');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('essaim'); delete window.__ESSAIM_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
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
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); release(); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        area.setAttribute('aria-label', 'Essaim : guider le vaisseau en bas et tirer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ESSAIM_TEST__ = {
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
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        if (!this.selecting) {
            if (this.left || this.right) this.engine.move(this.left === this.right ? 0 : this.right ? 1 : -1);
            else if (this.engine.state.move) this.engine.move(0);
            this.engine.holdFire(this.firing || this.autoFire);
            const before = this.engine.state.enemies;
            this.engine.step(delta);
            for (const event of new Set(this.engine.events)) {
                sound.playEffect(event);
                if (['life', 'enemy', 'armor', 'bonus'].includes(event)) { this.glow = 1; this.glowColor = event === 'life' ? 0xff8da9 : event === 'bonus' ? 0xffdb89 : 0x78ead5; }
            }
            for (const probe of before) if (!this.engine.state.enemies.includes(probe)) this.sparks.push({ x: probe.x, y: probe.y, age: 0 });
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'essaim'); sound.playEffect(this.engine.status);
        }
        this.glow = Math.max(0, this.glow - delta / 250); for (const spark of this.sparks) spark.age += delta;
        this.sparks = this.sparks.filter(s => s.age < 350);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state;
        g.clear(); g.fillStyle(0x102339); g.fillRoundedRect(0, 0, 360, 640, 16);
        for (let i = 0; i < 48; i++) { g.fillStyle(0x6e91b0, 0.25 + (i % 3) * 0.15); g.fillCircle(14 + (i * 97) % 332, 80 + (i * 61) % 540, i % 4 === 0 ? 1.5 : 0.7); }
        g.lineStyle(1, 0x244c61, 0.35); for (let y = 210; y < 490; y += 40) { g.lineBetween(24, y, 336, y); }
        g.lineStyle(1, 0x78ead5, 0.3); g.lineBetween(20, 590, 340, 590);
        for (const p of s.enemies) {
            const color = p.phase === 'dive' ? 0xff9ebb : p.type === 'armor' ? 0xbaadff : p.type === 'split' ? 0xffdb89 : 0x78ead5;
            g.lineStyle(2, color); g.strokeEllipse(p.x, p.y, 26, 20);
            g.fillStyle(color); g.fillTriangle(p.x, p.y - 12, p.x - 10, p.y + 7, p.x + 10, p.y + 7);
            g.fillStyle(0x102339); g.fillCircle(p.x, p.y, 4);
            if (p.hp > 1) { g.lineStyle(2, 0xffffff); g.strokeCircle(p.x, p.y, 15); }
            if (p.type === 'turret') { g.lineStyle(2, 0xffdb89); g.strokeRect(p.x+12,p.y-5,12,10); }
            if (p.captured) { g.lineStyle(1, 0xffdb89); g.lineBetween(p.x, p.y + 10, p.x, p.y + 22); g.strokeRoundedRect(p.x - 6, p.y + 18, 12, 10, 3); }
        }
        const colors = [0xc2fff2, 0xffdb89, 0xbaadff, 0x78ead5, 0xff9ebb, 0xffffff];
        for (const p of s.pickups) { g.lineStyle(2, (colors[WEAPONS.indexOf(p.kind)] ?? 0xffffff)); g.strokeRect(p.x-9, p.y-9, 18, 18); }
        if (s.beam) { g.lineStyle(5, 0xc2fff2, 0.8); g.lineBetween(s.cannon, CANNON_Y-20, s.cannon, 35); }
        if (this.engine.has('slow')) { g.lineStyle(2, 0x78ead5, 0.6); g.strokeCircle(s.cannon, CANNON_Y-140, 125); }
        if (this.engine.has('magnet')) { g.lineStyle(1, 0xff9ebb, 0.6); g.strokeCircle(s.cannon, CANNON_Y, 145); }
        if (this.engine.has('drones')) for (const p of this.engine.dronePositions()) { g.fillStyle(0xbaadff); g.fillCircle(p.x, p.y, 7); }
        if (s.charge > 0) { g.lineStyle(3, 0xffffff); g.strokeCircle(s.cannon, CANNON_Y-18, 4+s.charge/1500*14); }
        if (s.rescue) { g.lineStyle(2, 0x78ead5); g.strokeRect(s.rescue.x-22, s.rescue.y-10, 44, 20); }
        if (s.boss) { const b = s.boss; g.lineStyle(3, b.exposed ? 0xffdb89 : 0xbaadff); g.strokeEllipse(b.x, b.y, 60, 38); g.fillStyle(0xff9ebb); g.fillRect(b.x-30,b.y-30,60*b.hp/b.maxHp,4); }
        for (const p of s.enemies) if (p.type === 'shield' && (p.clock ?? 0) % 6000 < 5500) { g.lineStyle(3, 0xbaadff); g.lineBetween(p.x-16,p.y+16,p.x+16,p.y+16); }
        for (const p of s.shots) if (p.radius) { g.lineStyle(2, 0xffffff); g.strokeCircle(p.x,p.y,p.radius); }
        for (const shot of s.shots) { g.fillStyle(shot.owner === 'player' ? 0xc2fff2 : 0xff91ac); g.fillRoundedRect(shot.x - 1.5, shot.y - 5, 3, 10, 1.5); }
        if (s.invulnerable === 0 || s.ticks % 8 < 4) {
            g.fillStyle(0x78ead5); g.fillTriangle(s.cannon, CANNON_Y - 14, s.cannon - 15, CANNON_Y + 10, s.cannon + 15, CANNON_Y + 10);
            g.fillStyle(0x102339); g.fillTriangle(s.cannon, CANNON_Y - 2, s.cannon - 6, CANNON_Y + 9, s.cannon + 6, CANNON_Y + 9);
            g.lineStyle(2, 0xc2fff2); g.lineBetween(s.cannon, CANNON_Y - 17, s.cannon, CANNON_Y - 6);
        }
        for (const spark of this.sparks) { g.lineStyle(2, 0xffdb89, 1 - spark.age / 350); for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3, radius = 8 + spark.age / 15; g.lineBetween(spark.x + Math.cos(angle) * radius, spark.y + Math.sin(angle) * radius, spark.x + Math.cos(angle) * (radius + 5), spark.y + Math.sin(angle) * (radius + 5)); } }
        g.lineStyle(2, this.glow ? this.glowColor : 0x42718b, this.glow ? this.glow : 0.7); g.strokeRoundedRect(2, 2, 356, 636, 14);
        const labels: Record<Weapon, string> = { beam: 'Rayon', bounce: 'Rebond', drones: 'Drones', slow: 'Onde', magnet: 'Aimant', charge: 'Charge' };
        const weapons = s.weapons.map(w => `${labels[w.kind]} ${String(Math.ceil(w.remaining/1000))}s${w.kind === 'beam' ? ` ${String(Math.round(s.heat))}%${s.overheated ? ' BLOQUÉ' : ''}` : w.kind === 'charge' ? ` ${String(Math.round(s.charge/15))}%` : ''}`).join(' · ');
        this.hud?.setText(`${weapons}\n${s.double > 0 ? 'DOUBLE ' : ''}${this.engine.challenge ? 'DÉFI ' : ''}ESSAIM ${String(this.engine.level + 1)}     VIES ${'◆'.repeat(s.lives)}\nSCORE ${String(s.score)}     VAGUE ${String(s.wave)} · ${String(s.enemies.length)}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : 'En jeu'}`;
    }
}
