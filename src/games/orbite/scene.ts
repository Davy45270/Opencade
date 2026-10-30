import Phaser from 'phaser';
import { Engine, LEVELS, SHIELD_Y, CANNON_Y } from '../../engines/orbite/engine';
import { stage } from '../../engines/orbite/campaign';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave, readValue, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const orbiteButtons: readonly TouchButton[] = [
    { id: 'orbite-left', label: '←', ariaLabel: 'Canon à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'orbite-right', label: '→', ariaLabel: 'Canon à droite', size: 56, placement: 'left', mode: 'hold' },
    { id: 'orbite-fire', label: 'Tir', ariaLabel: 'Tir', size: 64, placement: 'right', mode: 'hold' },
];
export interface OrbiteHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; autoFire: boolean };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __ORBITE_TEST__?: OrbiteHook } }
const OPTIONS_KEY = 'arcade-lab:orbite:options:v1';
export class OrbiteScene extends Phaser.Scene {
    private engine = new Engine();
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
    private autoFire = readValue(browserStorage(), OPTIONS_KEY) === 'on';
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
        document.body.classList.add('orbite');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('orbite'); delete window.__ORBITE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(16, 14, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', lineSpacing: 3 });
        renderTouchControls(this.inputs, orbiteButtons, (id, held) => {
            if (id === 'orbite-fire') this.fire(held);
            else if (id === 'orbite-left') this.left = held;
            else this.right = held;
        });
        const options = document.createElement('label'); options.className = 'orbite-options';
        const auto = document.createElement('input'); auto.id = 'orbite-auto'; auto.type = 'checkbox'; auto.checked = this.autoFire;
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
            if (pointer !== null || e.clientY < rect.top + rect.height / 2) return;
            e.preventDefault(); pointer = e.pointerId; area.setPointerCapture(e.pointerId);
            if (this.session.state === 'ready') this.session.send('start'); move(e);
        });
        this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerId === pointer || e.pointerType === 'mouse' && e.buttons === 0) move(e); });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.inputs.on(area, type, event => { if ((event as PointerEvent).pointerId === pointer) pointer = null; });
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
        area.setAttribute('aria-label', 'Orbite : flotte de sondes, guider le canon en bas et tirer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__ORBITE_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state, autoFire: this.autoFire }),
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
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        if (!this.selecting) {
            if (this.left || this.right) this.engine.move(this.left === this.right ? 0 : this.right ? 1 : -1);
            else if (this.engine.state.move) this.engine.move(0);
            this.engine.holdFire(this.firing || this.autoFire);
            const before = this.engine.state.probes;
            this.engine.step(delta);
            for (const event of new Set(this.engine.events)) {
                sound.playEffect(event);
                if (['life', 'probe', 'armor', 'bonus', 'shield'].includes(event)) { this.glow = 1; this.glowColor = event === 'life' ? 0xff8da9 : event === 'bonus' ? 0xffdb89 : 0x78ead5; }
            }
            for (const probe of before) if (!this.engine.state.probes.includes(probe)) this.sparks.push({ x: probe.x, y: probe.y, age: 0 });
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'orbite'); sound.playEffect(this.engine.status);
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
        g.lineStyle(1, 0x244c61); g.strokeEllipse(180, 290, 320, 350); g.strokeEllipse(180, 290, 220, 350);
        g.lineStyle(1, 0x78ead5, 0.3); g.lineBetween(12, SHIELD_Y, 348, SHIELD_Y);
        for (const cell of s.shields) { g.fillStyle(0x78ead5); g.fillRect(cell.x, cell.y, 4, 4); g.fillStyle(0xc4fff0, 0.4); g.fillRect(cell.x, cell.y, 4, 1); }
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
        for (const p of s.probes) {
            if (!this.engine.visible(p)) continue;
            const color = [0xffdb89, 0xbaadff, 0xff9ebb, 0x87d8ff, 0xa5f0ca][p.row] ?? 0xffffff;
            g.fillStyle(color); g.fillTriangle(p.x, p.y - 10, p.x - 11, p.y + 4, p.x + 11, p.y + 4); g.fillTriangle(p.x, p.y + 10, p.x - 7, p.y, p.x + 7, p.y);
            g.fillStyle(0x102339); g.fillCircle(p.x, p.y, 3); g.lineStyle(1, color); g.strokeCircle(p.x, p.y, 12 + Math.sin(s.ticks / 12 + p.column) * 1.5);
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
            g.fillStyle(0x78ead5); g.fillTriangle(s.cannon, CANNON_Y - 14, s.cannon - 15, CANNON_Y + 10, s.cannon + 15, CANNON_Y + 10);
            g.fillStyle(0x102339); g.fillTriangle(s.cannon, CANNON_Y - 2, s.cannon - 6, CANNON_Y + 9, s.cannon + 6, CANNON_Y + 9);
            g.lineStyle(2, 0xc2fff2); g.lineBetween(s.cannon, CANNON_Y - 17, s.cannon, CANNON_Y - 6);
        }
        for (const spark of this.sparks) { g.lineStyle(2, 0xffdb89, 1 - spark.age / 350); for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3, radius = 8 + spark.age / 15; g.lineBetween(spark.x + Math.cos(angle) * radius, spark.y + Math.sin(angle) * radius, spark.x + Math.cos(angle) * (radius + 5), spark.y + Math.sin(angle) * (radius + 5)); } }
        g.lineStyle(2, this.glow ? this.glowColor : 0x42718b, this.glow ? this.glow : 0.7); g.strokeRoundedRect(2, 2, 356, 636, 14);
        const c = stage(this.engine.level);
        const names = { rotor: 'Rotors : attendre l’ouverture', split: 'Scindées : finir les fragments', asteroid: 'Astéroïdes : tirs déviés', gravity: 'Gravité : viser en avance', stealth: 'Furtives : guetter le retour', repair: 'Réparateurs : priorité', satellite: 'Protéger le satellite : intercepter', spiral: 'Essaim : suivre les courbes' };
        const hint = s.boss ? s.probes.length ? 'GARDIEN : éliminer les escortes' : `CŒUR : viser au vert · PHASE ${String(s.boss.phase)}` : c.rest ? 'RESPIRATION · ' + (names[c.mechanics[0] ?? 'rotor']) : names[c.mechanics[0] ?? 'rotor'];
        this.hud?.setText(`ORBITE ${String(this.engine.level + 1)}     VIES ${'◆'.repeat(s.lives)}\nSCORE ${String(s.score)}     SONDES ${String(s.probes.length)}\n${this.engine.level < 3 ? 'Défendre les quatre abris' : hint}`);
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : 'En jeu'}`;
    }
}
