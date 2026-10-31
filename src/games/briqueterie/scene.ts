import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { DecorCache } from '../ferraille/decor-cache';
import { brickView, brickGarden, brickBackdrop, brickParticles, drawBrickBody, brickKey } from './presentation';
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
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    hudText(): string;
    art(): ReturnType<ActionPaint['stats']>;
    power(kind: 'wide' | 'multi' | 'life'): void;
    usefulArea(): { x: number; y: number; width: number; height: number };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
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
    private decor?: DecorCache;
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
        const receipts = fingerReceipts(this.inputs);
        this.specialGraphics = this.add.graphics().setDepth(4);
        const cleanup = (): void => { this.inputs.dispose(); this.art?.destroy(); this.decor?.destroy(); delete window.__BRIQUETERIE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.art = new ActionPaint(this, 160);
        this.decor = new DecorCache(this, 160);
        for (const id of [this.art.id, 'licorne', 'pandaroux'] as const) for (let band = 0; band < 5; band++) for (let part = 0; part < 5; part++) {
            if (id !== this.art.id && band !== 2) continue;
            this.decor.bake(`brick-118-${id}-${String(band)}-${String(part)}`, part >= 1 && part <= 3 ? 440 : 360, 640, g => { brickBackdrop(g, id, band, 0, true, part); });
        }
        for (const theme of [this.art.id, 'feast', 'autumn', 'stars']) this.decor.bake(`garden-118-${theme}`, 360, 640, g => { brickGarden(g, theme); });
        const preview = new Engine();
        const color = Number.parseInt(this.art.colors.light.slice(1), 16);
        for (let level = 0; level < 30; level++) {
            preview.loadLevel(level, 28);
            const view = brickView(level), catalogue = level === 0 ? 'feast' : level === 17 ? 'autumn' : level === 14 ? 'stars' : '';
            for (const source of preview.state.bricks) for (const hp of source.kind === 'regen' ? [1, 2] : [source.hp]) for (const healAt of source.kind === 'regen' ? [0, 1] : [0]) {
                const b = { ...source, hp, healAt, x: 2, y: 8, w: view.width, h: view.y(source.y + source.h) - view.y(source.y) };
                this.decor.bake(brickKey(b, source, catalogue, color), 48, Math.ceil(b.h + 16), g => { drawBrickBody(g, b, source, catalogue, color); });
            }
        }

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
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.engine.snapshot().ticks * 1000 / 60 }),
            read: () => ({ fingerInput: { receipts: receipts(), paused: this.session.paused }, character: this.hero.snapshot(), ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
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
        const view = brickView(this.engine.level, s.balls[0]?.x ?? s.paddle);
        this.art?.begin();
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        g.clear();
        if (this.decor) {
            this.decor.begin();
            const id = this.engine.level === 14 ? 'licorne' : this.engine.level === 17 ? 'pandaroux' : this.art?.id ?? 'panda';
            for (let part = 0; part < 5; part++) {
                const width = part >= 1 && part <= 3 ? 440 : 360;
                const shift = reduced || part === 0 || part === 4 ? 0 : this.artClock / 1000 * part * 2 % width;
                for (let x = -shift; x < 360; x += width) this.decor.draw(`brick-118-${id}-${String(Math.floor(this.engine.level / 6))}-${String(part)}`, x, 0, width, 640, -6 + part * .1);
            }
        } else actionBackdrop(g, this.engine.level === 14 ? 'licorne' : this.engine.level === 17 ? 'pandaroux' : this.art?.id ?? 'panda', Math.floor(this.engine.level / 6), this.artClock, reduced);
        if (this.decor) brickParticles(g, this.engine.level === 14 ? 'licorne' : this.engine.level === 17 ? 'pandaroux' : this.art?.id ?? 'panda', Math.floor(this.engine.level / 6), this.artClock, reduced);
        g.lineStyle(2, 0x70cfff); g.strokeRoundedRect(2, 2, 356, 636, 14);
        for (const source of s.bricks.filter(b => b.kind === 'gravity')) {
            const b = { ...source, x: view.x(source.x), w: source.w * view.zoom, y: view.y(source.y), h: view.y(source.y + source.h) - view.y(source.y) };
            g.fillStyle(0x68d9ff, 0.12); g.fillRect(Math.max(6, b.x + b.w / 2 - 52), b.y + b.h, 104, view.y(source.y + 160) - b.y - b.h);
            g.lineStyle(1, 0x68d9ff, 0.5);
            for (let logicalY = source.y + 45; logicalY < source.y + 150; logicalY += 30) { const x = b.x + b.w / 2, y = view.y(logicalY); g.lineBetween(x - 6, y + 6, x, y); g.lineBetween(x, y, x + 6, y + 6); }
        }
        const catalogue = this.engine.level === 0 ? 'feast' : this.engine.level === 17 ? 'autumn' : this.engine.level === 14 ? 'stars' : '';
        if (this.decor) this.decor.draw(`garden-118-${catalogue || this.art?.id || 'panda'}`, 0, 0, 360, 640, -1);
        else brickGarden(g, catalogue || this.art?.id || 'panda');
        if (catalogue === 'stars') for (let i = 0; i < 8; i++) {
            const x = 28 + i * 43, y = 275 + (i * 53) % 145;
            g.lineStyle(1, 0x8b81d2, .18); g.lineBetween(x, y, x + 43, 275 + ((i + 1) * 53) % 145);
            this.art?.icon('etoile', x, y, 19, 0, .22);
        }
        if (catalogue === 'autumn') for (let i = 0; i < 8; i++) this.art?.icon('feuille', 25 + i * 46, 290 + i % 3 * 59, 29, reduced ? 0 : this.artClock / 7000 + i, .16);
        if (catalogue === 'feast') for (let i = 0; i < 5; i++) this.art?.icon(i % 2 ? 'bao' : 'bambou', 30 + i * 75, 340 + i % 2 * 61, 55, 0, .12);
        for (let i = 0; i < 24; i++) {
            const x = i % 2 ? 338 : 22, y = 70 + Math.floor(i / 2) * 44;
            this.art?.icon(catalogue === 'stars' ? 'etoile' : catalogue === 'autumn' ? 'feuille' : this.art.theme.primary, x, y, 46, i % 2 ? .3 : -.3, .65);
        }

        for (const source of s.bricks) {
            const b = { ...source, x: view.x(source.x - 2), y: view.y(source.y), w: view.width, h: view.y(source.y + source.h) - view.y(source.y) };
            const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            if (!b.solid && (!b.kind || b.kind === 'plain') && !(catalogue === 'stars' && Math.floor(source.x / 34) % 2)) this.art?.icon(catalogue === 'stars' ? 'etoile' : catalogue === 'autumn' ? 'feuille' : catalogue === 'feast' && b.y > 110 ? 'bao' : this.art.theme.primary, cx, cy - 1, Math.min(34, b.h - 4));
            if (!b.solid && b.kind === 'plain' && b.h > 44) for (const dy of [-b.h / 2 + 13, b.h / 2 - 13]) this.art?.icon(catalogue === 'feast' ? (Math.floor(source.x / 34) % 2 ? 'bao' : 'bambou') : catalogue === 'stars' ? 'etoile' : catalogue === 'autumn' ? 'feuille' : this.art.theme.primary, cx, cy + dy, 22);
            if (b.kind === 'multi') this.art?.icon('etoile', cx, cy, 30);
            const color = Number.parseInt((this.art?.colors.light ?? '#ffb867').slice(1), 16);
            if (this.decor && this.textures.exists(brickKey(b, source, catalogue, color))) this.decor.draw(brickKey(b, source, catalogue, color), b.x - 2, b.y - 8, 48, Math.ceil(b.h + 16), .5);
            else drawBrickBody(g, b, source, catalogue, color);
        }
        for (const drop of s.bonuses) {
            const kind = drop.kind === 'life' ? 'coeur' : drop.kind === 'wide' ? this.art?.theme.primary ?? 'bambou' : this.art?.theme.special ?? 'bao';
            this.art?.icon(kind, view.x(drop.x, drop.y), view.y(drop.y), 29);
            g.lineStyle(2, 0xfff3c4); g.strokeRoundedRect(view.x(drop.x, drop.y) - 13, view.y(drop.y) - 13, 26, 26, 7);
        }
        // The bright gold rail is exactly the unchanged collision surface.
        this.art?.craft('paddles', this.left ? 'gauche' : this.right ? 'droite' : 'face', s.paddle, 584, s.width * 1.08, 72);
        g.fillStyle(0xffe693); g.fillRoundedRect(s.paddle - s.width / 2, 586, s.width, 4, 2);
        for (const ball of s.balls) {
            this.art?.ball(view.x(ball.x, ball.y), view.y(ball.y), ball.vx, ball.vy, (ball.pierce ?? 0) > 0 || s.balls.length > 1 || s.wideUntil > 0, reduced);
            g.lineStyle(1, 0xffffff, .8); g.strokeCircle(view.x(ball.x, ball.y), view.y(ball.y), 10);
            this.art?.icon(this.art.id === 'panda' ? 'bao' : this.art.id === 'pandaroux' ? 'feuille' : this.art.id === 'dragon' ? 'feu' : this.art.id === 'singe' ? 'coeur' : 'etoile', view.x(ball.x, ball.y), view.y(ball.y), 24);
        }
        if (this.glow) { g.lineStyle(4, 0xffe0b5, this.glow); g.strokeRoundedRect(3, 3, 354, 634, 14); }
        this.specialGraphics?.clear();
        this.hero.advance(0, this.session.paused, this.engine.status, (s.strongPending || s.balls.some(b => (b.pierce ?? 0) > 0)));
        if ((s.strongPending || s.balls.some(b => (b.pierce ?? 0) > 0)) && this.specialGraphics) this.hero.drawEffect(this.specialGraphics, view.x(s.balls[0]?.x ?? s.paddle, s.balls[0]?.y ?? 560) - 32.5, view.y(s.balls[0]?.y ?? 560) - 32.5, 65);
        this.hud?.setText(`Balle forte ${s.specialUsed ? 'UTILISÉE' : 'PRÊTE'} · N${String(this.engine.level + 1)}   VIES ${String(s.lives)}   SCORE ${String(s.score)}   ×${String(s.balls.length)}\n${LEVELS[this.engine.level]?.name ?? ''}`);
        this.prompt?.setText(s.ready && this.engine.status === 'playing' ? `${designs[this.engine.level]?.rest ? 'Respiration · ' : (this.engine.level + 1) % 5 === 0 ? 'Défi · ' : ''}À vous de lancer !\n${[...new Set(s.bricks.map(b => b.kind))].filter(k => k && k !== 'plain').map(k => ({ moving: '↔ coulisse', explosive: '✳ explosion', regen: '+ repousse rapide', portal: '◉ portail', angle: '/ déviation', key: '⚿ ouvre les verrous', locked: '× verrou', multi: '••• multi-balle', gravity: '↑ zone inversée', anchor: '○ attache', hanging: '│ suspension' } as Record<string, string>)[k ?? 'plain']).join(' · ')}\nTap · Espace · Lancer` : '');
        const status = document.querySelector('#status'); if (status) status.textContent = `Score : ${String(s.score)} · Vies : ${String(s.lives)} · ${this.engine.status === 'won' ? 'Victoire' : this.engine.status === 'lost' ? 'Défaite' : s.ready ? 'Prêt' : 'En jeu'}`;
    }
}
