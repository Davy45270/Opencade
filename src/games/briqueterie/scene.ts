import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { ActionPaint, actionBackdrop } from '../../characters/action-phaser';
import { designs } from '../../engines/briqueterie/levels';
import { Engine, LEVELS } from '../../engines/briqueterie/engine';
import { Inputs, horizontalDrag, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const briqueterieButtons: readonly TouchButton[] = [
    { id: 'briqueterie-special', label: 'Balle forte', ariaLabel: 'Balle forte', size: 56, placement: 'right', mode: 'tap' },
    { id: 'briqueterie-left', label: '←', ariaLabel: 'Raquette à gauche', size: 56, placement: 'left', mode: 'hold' },
    { id: 'briqueterie-launch', label: 'Lancer', ariaLabel: 'Lancer la balle', size: 56, placement: 'center', mode: 'tap' },
    { id: 'briqueterie-right', label: '→', ariaLabel: 'Raquette à droite', size: 56, placement: 'right', mode: 'hold' },
];
export interface BriqueterieHook {
    advance(ms: number): void;
    hudText(): string;
    art(): ReturnType<ActionPaint['stats']>;
    power(kind: 'wide' | 'multi' | 'life'): void;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
    scenario(name: 'finish' | 'fall'): void;
}
declare global { interface Window { __BRIQUETERIE_TEST__?: BriqueterieHook } }
export class BriqueterieScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private specialGraphics?: Phaser.GameObjects.Graphics;
    private progress = new Progression(readSave(browserStorage(), 'briqueterie', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private testAdvancing = false;
    private art?: ActionPaint;
    private artClock = 0;
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
    private special(): void {
        if (this.session.state === 'ready') this.session.send('start');
        if (!this.session.paused && !this.selecting && this.engine.special()) { sound.playEffect('bonus'); this.draw(); }
    }
    create(): void {
        this.specialGraphics = this.add.graphics().setDepth(4);
        const cleanup = (): void => { this.inputs.dispose(); this.art?.destroy(); delete window.__BRIQUETERIE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.art = new ActionPaint(this, 160);
        this.hud = this.add.text(14, 14, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#e5f3ff', wordWrap: { width: 332 } }).setDepth(5);
        this.prompt = this.add.text(180, 500, '', { fontFamily: 'system-ui', fontSize: '14px', wordWrap: { width: 330 }, color: '#ffe0b5', align: 'center' }).setOrigin(0.5).setDepth(5);
        renderTouchControls(this.inputs, briqueterieButtons, (id, held) => { if (id.endsWith('special')) { if (held) this.special(); } else if (id.endsWith('launch')) { if (held) this.launch(); } else if (id.endsWith('left')) this.left = held; else this.right = held; });
        const area = this.game.canvas;
        const move = (x: number): void => { if (!this.session.paused && !this.selecting) { this.engine.move(x); this.draw(); } };
        horizontalDrag(this.inputs, area, 360, move);
        this.inputs.on(area, 'pointermove', event => { const e = event as PointerEvent; if (e.pointerType === 'mouse') { const r = area.getBoundingClientRect(); move((e.clientX - r.left) * 360 / r.width); } });
        this.inputs.on(area, 'pointerup', () => { this.launch(); });
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent; if (e.code === 'KeyC' && !e.repeat) this.special();
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
            art: () => { if (!this.art) throw new Error('Atlas absent'); return this.art.stats(); },
            power: kind => { this.engine.spawnBonus(this.engine.state.paddle, 470, kind); this.draw(); },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            read: () => ({ character: this.hero.snapshot(), ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
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
        this.hero.advance(delta, this.session.paused, this.engine.status, false);
        if (!this.session.paused) this.artClock += delta;
        if (!this.selecting) {
            if (this.left !== this.right) this.engine.move(this.engine.state.paddle + (this.right ? 1 : -1) * delta * 0.4);
            this.engine.step(delta);
            for (const event of new Set(this.engine.events)) { sound.playEffect(event); if (event === 'brick' || event === 'bonus' || event === 'life') this.glow = 1; }
        }
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') { this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'briqueterie'); sound.playEffect(this.engine.status); }
        this.glow = Math.max(0, this.glow - delta / 250);
        if (this.testAdvancing) return;
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const s = this.engine.state;
        this.art?.begin();
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        g.clear(); actionBackdrop(g, this.engine.level === 14 ? 'licorne' : this.engine.level === 17 ? 'pandaroux' : this.art?.id ?? 'panda', Math.floor(this.engine.level / 6), this.artClock, reduced);
        g.lineStyle(2, 0x70cfff); g.strokeRoundedRect(2, 2, 356, 636, 14);
        for (const b of s.bricks.filter(b => b.kind === 'gravity')) {
            g.fillStyle(0x68d9ff, 0.12); g.fillRect(Math.max(6, b.x + b.w / 2 - 52), b.y + b.h, 104, 142);
            g.lineStyle(1, 0x68d9ff, 0.5);
            for (let y = b.y + 45; y < b.y + 150; y += 30) { const x = b.x + b.w / 2; g.lineBetween(x - 6, y + 6, x, y); g.lineBetween(x, y, x + 6, y + 6); }
        }
        const catalogue = this.engine.level === 0 ? 'feast' : this.engine.level === 17 ? 'autumn' : this.engine.level === 14 ? 'stars' : '';
        if (catalogue === 'stars') for (let i = 0; i < 8; i++) {
            const x = 28 + i * 43, y = 275 + (i * 53) % 145;
            g.lineStyle(1, 0x8b81d2, .18); g.lineBetween(x, y, x + 43, 275 + ((i + 1) * 53) % 145);
            this.art?.icon('etoile', x, y, 19, 0, .22);
        }
        if (catalogue === 'autumn') for (let i = 0; i < 8; i++) this.art?.icon('feuille', 25 + i * 46, 290 + i % 3 * 59, 29, reduced ? 0 : this.artClock / 7000 + i, .16);
        if (catalogue === 'feast') for (let i = 0; i < 5; i++) this.art?.icon(i % 2 ? 'bao' : 'bambou', 30 + i * 75, 340 + i % 2 * 61, 55, 0, .12);
        const palette: Record<string, number> = { moving: 0x64e4cc, explosive: 0xff785c, regen: 0x8ae873, portal: 0xbfa2ff, angle: 0xffdf78, key: 0xffdf78, locked: 0x6977a8, multi: 0xf080cf, gravity: 0x68d9ff, anchor: 0xeedac0, hanging: 0xd6bc9a };
        for (const b of s.bricks) {
            g.fillStyle(palette[b.kind ?? ''] ?? (b.solid ? 0x617b96 : b.hp === 2 ? 0xf080ab : Number.parseInt((this.art?.colors.light ?? '#ffb867').slice(1), 16))); g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
            g.lineStyle(2, 0x162134); g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
            g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(b.x + 4, b.y + 3, b.x + b.w - 4, b.y + 3);
            const cx = b.x + b.w / 2, cy = b.y + 10;
            g.lineStyle(2, 0x132438);
            if (!b.solid && (!b.kind || b.kind === 'plain')) this.art?.icon(catalogue === 'stars' ? 'etoile' : catalogue === 'autumn' ? 'feuille' : catalogue === 'feast' && b.y > 110 ? 'bao' : this.art.theme.primary, cx, cy - 1, 15);
            if (b.kind === 'portal') { g.strokeEllipse(cx, cy, 14, 10); g.strokeEllipse(cx, cy, 5, 10); }
            if (b.kind === 'angle') g.lineBetween(b.x + 5, b.y + 14, b.x + b.w - 5, b.y + 5);
            if (b.kind === 'explosive') { g.strokeCircle(cx, cy, 4); g.lineBetween(cx - 7, cy, cx + 7, cy); g.lineBetween(cx, cy - 7, cx, cy + 7); }
            if (b.kind === 'regen') { g.lineBetween(cx - 5, cy, cx + 5, cy); g.lineBetween(cx, cy - 5, cx, cy + 5); if (b.healAt) { g.lineStyle(2, 0xffffff); g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4); } }
            if (b.kind === 'key') { g.strokeCircle(cx - 4, cy, 4); g.lineBetween(cx, cy, cx + 7, cy); g.lineBetween(cx + 6, cy, cx + 6, cy + 4); }
            if (b.kind === 'moving') { g.lineBetween(cx - 8, cy, cx + 8, cy); g.lineBetween(cx - 8, cy, cx - 4, cy - 4); g.lineBetween(cx + 8, cy, cx + 4, cy + 4); }
            if (b.kind === 'multi') { for (const dx of [-7, 0, 7]) { g.fillStyle(0x132438); g.fillCircle(cx + dx, cy, 2); } }
            if (b.kind === 'anchor' || b.kind === 'hanging') { g.lineBetween(cx, b.y - 8, cx, b.y + 6); g.strokeCircle(cx, cy, 3); }
            if (b.kind === 'gravity') { g.lineBetween(cx, cy - 5, cx, cy + 5); g.lineBetween(cx - 4, cy - 1, cx, cy - 5); g.lineBetween(cx + 4, cy - 1, cx, cy - 5); }
            if (b.solid) { g.lineStyle(2, 0x132438); g.lineBetween(b.x + 8, b.y + 4, b.x + 24, b.y + 14); g.lineBetween(b.x + 24, b.y + 4, b.x + 8, b.y + 14); }
            else if (!b.kind || b.kind === 'plain' || b.kind === 'regen') for (let i = 0; i < b.hp; i++) { g.fillStyle(0x132438); g.fillCircle(b.x + b.w / 2 + (i - (b.hp - 1) / 2) * 6, b.y + 11, 1.5); }
        }
        for (const drop of s.bonuses) {
            const kind = drop.kind === 'life' ? 'coeur' : drop.kind === 'wide' ? this.art?.theme.primary ?? 'bambou' : this.art?.theme.special ?? 'bao';
            this.art?.icon(kind, drop.x, drop.y, 29);
            g.lineStyle(2, 0xfff3c4); g.strokeRoundedRect(drop.x - 13, drop.y - 13, 26, 26, 7);
        }
        // The bright gold rail is exactly the unchanged collision surface.
        this.art?.craft('paddles', this.left ? 'gauche' : this.right ? 'droite' : 'face', s.paddle, 584, s.width * 1.08, 72);
        g.fillStyle(0xffe693); g.fillRoundedRect(s.paddle - s.width / 2, 586, s.width, 4, 2);
        for (const ball of s.balls) {
            this.art?.ball(ball.x, ball.y, ball.vx, ball.vy, (ball.pierce ?? 0) > 0 || s.balls.length > 1 || s.wideUntil > 0, reduced);
            g.lineStyle(1, 0xffffff, .8); g.strokeCircle(ball.x, ball.y, 6);
        }
        if (this.glow) { g.lineStyle(4, 0xffe0b5, this.glow); g.strokeRoundedRect(3, 3, 354, 634, 14); }
        this.specialGraphics?.clear();
        this.hero.advance(0, this.session.paused, this.engine.status, (s.strongPending || s.balls.some(b => (b.pierce ?? 0) > 0)));
        if ((s.strongPending || s.balls.some(b => (b.pierce ?? 0) > 0)) && this.specialGraphics) this.hero.drawEffect(this.specialGraphics, (s.balls[0]?.x ?? s.paddle) - 32.5, (s.balls[0]?.y ?? 560) - 32.5, 65);
        this.hud?.setText(`Balle forte ${s.specialUsed ? 'UTILISÉE' : 'PRÊTE'} · N${String(this.engine.level + 1)}   VIES ${String(s.lives)}   SCORE ${String(s.score)}   ×${String(s.balls.length)}\n${LEVELS[this.engine.level]?.name ?? ''}`);
        this.prompt?.setText(s.ready && this.engine.status === 'playing' ? `${designs[this.engine.level]?.rest ? 'Respiration · ' : (this.engine.level + 1) % 5 === 0 ? 'Défi · ' : ''}À vous de lancer !\n${[...new Set(s.bricks.map(b => b.kind))].filter(k => k && k !== 'plain').map(k => ({ moving: '↔ coulisse', explosive: '✳ explosion', regen: '+ repousse rapide', portal: '◉ portail', angle: '/ déviation', key: '⚿ ouvre les verrous', locked: '× verrou', multi: '••• multi-balle', gravity: '↑ zone inversée', anchor: '○ attache', hanging: '│ suspension' } as Record<string, string>)[k ?? 'plain']).join(' · ')}\nTap · Espace · Lancer` : '');
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : s.ready ? 'Prêt' : 'En jeu'}`;
    }
}
