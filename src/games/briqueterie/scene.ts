import Phaser from 'phaser';
import { Engine, LEVELS } from '../../engines/briqueterie/engine';
import { Inputs, horizontalDrag, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const briqueterieButtons: readonly TouchButton[] = [
    { id: 'briqueterie-left', label: '←', ariaLabel: 'Raquette à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'briqueterie-launch', label: 'Lancer', ariaLabel: 'Lancer la balle', size: 56, placement: 'center', mode: 'tap' },
    { id: 'briqueterie-right', label: '→', ariaLabel: 'Raquette à droite', size: 56, placement: 'right', mode: 'hold' },
];
export interface BriqueterieHook {
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'fall'): void;
}
declare global { interface Window { __BRIQUETERIE_TEST__?: BriqueterieHook } }
export class BriqueterieScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'briqueterie', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private prompt?: Phaser.GameObjects.Text;
    private left = false;
    private right = false;
    private glow = 0;
    constructor(private session = new PlaySession(true)) { super('briqueterie'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void { this.testManual = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.left = this.right = false; this.panels(); this.draw(); }
    private launch(): void {
        if (this.session.state === 'ready') this.session.send('start');
        if (this.session.paused || this.selecting) return;
        this.engine.launch(); sound.playEffect('launch'); this.draw();
    }
    create(): void {
        const cleanup = (): void => { this.inputs.dispose(); delete window.__BRIQUETERIE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(14, 14, '', { fontFamily: 'system-ui', fontSize: '15px', color: '#e5f3ff' });
        this.prompt = this.add.text(180, 500, '', { fontFamily: 'system-ui', fontSize: '17px', color: '#ffe0b5', align: 'center' }).setOrigin(0.5);
        renderTouchControls(this.inputs, briqueterieButtons, (id, held) => { if (id.endsWith('launch')) { if (held) this.launch(); } else if (id.endsWith('left')) this.left = held; else this.right = held; });
        const area = this.game.canvas;
        const move = (x: number): void => { if (!this.session.paused && !this.selecting) { this.engine.move(x); this.draw(); } };
        horizontalDrag(this.inputs, area, 360, move);
        this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerType === 'mouse') { const r = area.getBoundingClientRect(); move((e.clientX - r.left) * 360 / r.width); } });
        this.inputs.on(area, 'pointerup', () => { this.launch(); });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
            if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = true;
            if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = true;
            if (e.code === 'Space' && !e.repeat) this.launch();
        });
        this.inputs.on(document, 'keyup', event => { const e = event as KeyboardEvent; if (['ArrowLeft', 'KeyA'].includes(e.code)) this.left = false; if (['ArrowRight', 'KeyD'].includes(e.code)) this.right = false; });
        this.inputs.on(globalThis, 'blur', () => { this.left = this.right = false; });
        const choose = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.panels(); this.draw(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        area.setAttribute('aria-label', 'Briqueterie : glisser pour déplacer la raquette, toucher pour lancer');
        if (new URLSearchParams(location.search).get('test') === '1') window.__BRIQUETERIE_TEST__ = {
            advance: ms => { this.advanceTest(ms); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            scenario: name => {
                this.start(0, 455, true);
                this.engine.loadState({ ...this.engine.state, bricks: [{ x: name === 'finish' ? 164 : 20, y: 530, w: 32, h: 18, hp: 1, solid: false }], lives: name === 'fall' ? 1 : 3, ready: true });
                this.draw();
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
            if (this.left !== this.right) this.engine.move(this.engine.state.paddle + (this.right ? 1 : -1) * delta * 0.4);
            this.engine.step(delta);
            for (const event of new Set(this.engine.events)) { sound.playEffect(event); if (event === 'brick' || event === 'bonus' || event === 'life') this.glow = 1; }
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') { this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'briqueterie'); sound.playEffect(this.engine.status); }
        this.glow = Math.max(0, this.glow - delta / 250);
        if (this.testAdvancing) return;
        this.scale.refresh(); this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state;
        g.clear(); g.fillStyle(0x132438); g.fillRoundedRect(0, 0, 360, 640, 16);
        g.lineStyle(1, 0x24415a); for (let y = 44; y < 640; y += 23) g.lineBetween(8, y, 352, y);
        g.lineStyle(2, 0x70cfff); g.strokeRoundedRect(2, 2, 356, 636, 14);
        for (const b of s.bricks) {
            g.fillStyle(b.solid ? 0x617b96 : b.hp === 3 ? 0xbfa2ff : b.hp === 2 ? 0xf080ab : 0xffb867); g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
            g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(b.x + 4, b.y + 3, b.x + b.w - 4, b.y + 3);
            if (b.solid) { g.lineStyle(2, 0x132438); g.lineBetween(b.x + 8, b.y + 4, b.x + 24, b.y + 14); g.lineBetween(b.x + 24, b.y + 4, b.x + 8, b.y + 14); }
            else for (let i = 0; i < b.hp; i++) { g.fillStyle(0x132438); g.fillCircle(b.x + b.w / 2 + (i - (b.hp - 1) / 2) * 6, b.y + 11, 1.5); }
        }
        for (const drop of s.bonuses) {
            g.fillStyle(drop.kind === 'life' ? 0xf080ab : drop.kind === 'wide' ? 0x64e4cc : 0xbfa2ff); g.fillRoundedRect(drop.x - 10, drop.y - 10, 20, 20, 5); g.lineStyle(2, 0x132438);
            if (drop.kind === 'wide') { g.lineBetween(drop.x - 7, drop.y, drop.x + 7, drop.y); }
            else if (drop.kind === 'life') { g.lineBetween(drop.x - 6, drop.y, drop.x + 6, drop.y); g.lineBetween(drop.x, drop.y - 6, drop.x, drop.y + 6); }
            else for (const dx of [-5, 0, 5]) { g.fillStyle(0x132438); g.fillCircle(drop.x + dx, drop.y, 2); }
        }
        g.fillStyle(0x64e4cc); g.fillRoundedRect(s.paddle - s.width / 2, 586, s.width, 12, 6);
        g.fillStyle(0xffffff); for (const ball of s.balls) { g.fillCircle(ball.x, ball.y, 6); g.lineStyle(2, 0x70cfff, 0.3); g.strokeCircle(ball.x, ball.y, 9); }
        if (this.glow) { g.lineStyle(4, 0xffe0b5, this.glow); g.strokeRoundedRect(3, 3, 354, 634, 14); }
        this.hud?.setText(`N${String(this.engine.level + 1)}   VIES ${String(s.lives)}   SCORE ${String(s.score)}   ×${String(s.balls.length)}`);
        this.prompt?.setText(s.ready && this.engine.status === 'playing' ? 'À vous de lancer !\nTap · Espace · Lancer' : '');
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : s.ready ? 'Prêt' : 'En jeu'}`;
    }
}
