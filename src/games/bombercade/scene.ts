import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { characters } from '../../characters/model';
import { Engine, LEVELS, WIDTH, type Block, type Bomb, type Fire, type Direction } from '../../engines/bombercade/engine';
import { Pilot, type Action } from '../../engines/bombercade/pilot';
import { GAME_NAME } from '../../engines/bombercade/levels';
import { Inputs, renderTouchControls, virtualJoystick, type TouchButton } from '../../shell/input';
import { swipeDirection } from '../../shell/gestures';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { color, drawBomb, heart, star, powerIcon, palettes } from './art';
import { ArenaLayer } from './arena';
import { cardinalDirection } from './controls';
export const bombercadeButtons: readonly TouchButton[] = [
    { id: 'bombercade-bomb', label: 'Bombe', ariaLabel: 'Poser une bombe', size: 64, placement: 'right', mode: 'tap' },
    { id: 'bombercade-special', label: '✦', ariaLabel: 'Pouvoir spécial', size: 56, placement: 'right', mode: 'tap' },
];
export interface BombercadeHook {
    fingerReceipts(): { bombRequests: number; specialRequests: number; sequence: number; events: { sequence: number; pointerId: number; type: string; x: number; y: number; control: string | null; target: string | null; path: (string | null)[] }[] };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean } };
    renderStats(): { dynamicCommands: number };
    pilotAction(): Action;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    advance(ms: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __BOMBERCADE_TEST__?: BombercadeHook } }
// Presentation metadata stays outside the engine. Its explosion event carries no
// position, so observe the bomb argument before it is removed (including chains).
export function trackExplosionOrigins(engine: Engine): WeakMap<Fire, boolean> {
    const origins = new WeakMap<Fire, boolean>();
    const emitter = engine as unknown as { explode(bomb: Bomb, only?: Direction): void };
    const explode = emitter.explode.bind(engine);
    emitter.explode = function (bomb, only) {
        const first = engine.fires.length;
        explode(bomb, only);
        if (!only) for (let i = first; i < engine.fires.length; i++) {
            const fire = engine.fires[i];
            // Recursive chain explosions have already recorded their own origin.
            if (fire && !origins.has(fire)) origins.set(fire, i === first && fire.at === bomb.at);
        }
    };
    return origins;
}
export class BombercadeScene extends Phaser.Scene {
    private engine = new Engine(selectedCharacter());
    private explosionOrigins = trackExplosionOrigins(this.engine);
    private cast = this.engine.actors.map(a => new GameCharacter(a.character));
    private progress = new Progression(readSave(browserStorage(), 'bombercade', 30), 30);
    private inputs = new Inputs();
    private testPilot = new Pilot(false);
    private selecting = false;
    private manual = false;
    private bombRequests = 0;
    private specialRequests = 0;
    private receipts = { sequence: 0, events: [] as { sequence: number; pointerId: number; type: string; x: number; y: number; control: string | null; target: string | null; path: (string | null)[] }[] };
    private arena?: ArenaLayer;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    private hint?: Phaser.GameObjects.Text;
    private heading?: Phaser.GameObjects.Text;
    private counter?: Phaser.GameObjects.Text;
    private timer?: Phaser.GameObjects.Text;
    private powerLabel?: Phaser.GameObjects.Text;
    private debris = { events: [] as string[], cursor: 0, blocks: new Set<Block>(), particles: [] as { at: number; born: number }[] };
    private fuseBeat = 0;
    private visualTime = 0;
    constructor(private session = new PlaySession(true)) { super('bombercade'); }
    private start(index: number, seed = 28, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.testPilot = new Pilot(false); this.cast = this.engine.actors.map(a => new GameCharacter(a.character));
        this.arena?.reset();
        this.debris = { events: this.engine.events, cursor: 0, blocks: new Set(this.engine.board.blocks), particles: [] };
        this.selecting = false; this.sync();
    }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting); }
    create(): void {
        document.body.classList.add('bombercade');
        const style = document.createElement('style');
        // Keep the 120 px hit surface rectangular. Only its non-interactive
        // decoration is rounded, so the visible outer ring remains a target.
        style.textContent = 'body.bombercade #touch-controls{height:120px;min-height:120px;flex-basis:120px;margin-bottom:max(12px,env(safe-area-inset-bottom))}body.bombercade #touch-controls #bombercade-bomb{width:64px;height:64px;min-width:64px!important;min-height:64px!important}body.bombercade #touch-controls .left{flex:0 0 120px}body.bombercade .joystick{position:relative;touch-action:none;border:0;border-radius:0;background:none}body.bombercade .joystick::before{content:"";position:absolute;inset:0;box-sizing:border-box;border:3px solid #64e4cc;border-radius:50%;background:radial-gradient(circle,#546c86 0 14%,#173b50 15% 62%,#80c9bf 63% 66%,#173b50 67%);pointer-events:none}body.bombercade .joystick span{position:absolute;color:#fff;font-size:24px;line-height:28px;pointer-events:none}body.bombercade .joystick span:nth-child(1){top:5px;left:43px}body.bombercade .joystick span:nth-child(2){bottom:5px;left:43px}body.bombercade .joystick span:nth-child(3){left:7px;top:42px}body.bombercade .joystick span:nth-child(4){right:7px;top:42px}';
        style.textContent += 'body.bombercade #touch-controls #bombercade-bomb{position:relative;border-radius:50%;font-size:16px;background:radial-gradient(circle at 35% 25%,#ffe4a3,#edab4c 65%,#b96830);border:3px solid #fff0b2;box-shadow:0 4px 0 #744527,inset 0 2px 0 #fff6d8}body.bombercade #bombercade-bomb svg{width:44px;height:44px;pointer-events:none}';
        document.head.append(style);
        const cleanup = (): void => { this.arena?.destroy(); this.inputs.dispose(); style.remove(); document.body.classList.remove('bombercade'); delete window.__BOMBERCADE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.arena = new ArenaLayer(this);
        this.graphics = this.add.graphics().setDepth(3);
        this.hud = this.add.text(14, 16, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff6de', lineSpacing: 7 }).setVisible(false);
        this.heading = this.add.text(24, 22, '', { fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#fff3cf' }).setDepth(5);
        this.counter = this.add.text(24, 48, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#c5d8dc' }).setDepth(5);
        this.timer = this.add.text(335, 49, '', { fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#ffdf9c' }).setOrigin(1, 0).setDepth(5);
        this.powerLabel = this.add.text(49, 95, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff3cf' }).setDepth(5);
        this.hint = this.add.text(29, 563, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#263447', wordWrap: { width: 302 }, lineSpacing: 4 }).setDepth(5);
        const action = (special: boolean): void => { if (this.session.paused || this.selecting) return; this.engine.events = []; if (special) this.specialRequests++; else this.bombRequests++; if (special) this.engine.special(); else this.engine.requestBomb(); this.feedback(); this.sync(); };
        renderTouchControls(this.inputs, bombercadeButtons, (id, held) => { if (held) action(id === 'bombercade-special'); });
        const bombButton = document.querySelector('#bombercade-bomb');
        if (bombButton) bombButton.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M27 13q-2-8 7-8" fill="none" stroke="#583c25" stroke-width="3"/><path d="m35 1 2 4 5 1-5 2-2 4-2-4-4-2 4-1Z" fill="#fff9d1"/><circle cx="23" cy="29" r="15" fill="#172d47"/><ellipse cx="18" cy="23" rx="6" ry="4" fill="#9cc6d1"/><path d="m21 15 8-1" stroke="#526c81" stroke-width="5"/></svg>';
        const slot = document.querySelector<HTMLElement>('#touch-controls .left');
        if (slot) virtualJoystick(this.inputs, slot, dir => {
            if (this.session.paused || this.selecting) { this.engine.input(null); return; }
            this.engine.input(cardinalDirection(dir));
        });
        const stick = slot?.querySelector('.joystick');
        if (stick) for (const arrow of ['↑', '↓', '←', '→']) { const label = document.createElement('span'); label.textContent = arrow; label.setAttribute('aria-hidden', 'true'); stick.append(label); }
        const area = document.querySelector<HTMLElement>('#game');
        let origin: { x: number; y: number; id: number; moved: boolean } | null = null;
        this.inputs.on(area, 'pointerdown', event => { const e = event as PointerEvent; if (this.session.paused) return; origin = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }; area?.setPointerCapture(e.pointerId); });
        this.inputs.on(area, 'pointermove', event => {
            const e = event as PointerEvent; if (!origin || e.pointerId !== origin.id || this.session.paused) return;
            const direction = swipeDirection(e.clientX - origin.x, e.clientY - origin.y, 16);
            if (direction) { origin.moved = true; this.engine.input(direction); }
        });
        for (const type of ['pointerup', 'pointercancel']) this.inputs.on(area, type, event => {
            if (!origin || (event as PointerEvent).pointerId !== origin.id) return;
            if (!origin.moved && type === 'pointerup') action(false); this.engine.input(null); origin = null;
        });
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyZ: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyQ: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        this.inputs.on(document, 'keydown', event => { const e = event as KeyboardEvent; if (this.session.paused || this.selecting) return;
            const d = keys[e.code]; if (d) { e.preventDefault(); this.engine.input(d); }
            if (!e.repeat && (e.code === 'Space' || e.code === 'KeyX')) { e.preventDefault(); action(e.code === 'KeyX'); }
        });
        this.inputs.on(document, 'keyup', event => { if (keys[(event as KeyboardEvent).code]) this.engine.input(null); });
        this.inputs.on(window, 'blur', () => { this.engine.input(null); });
        const retry = (): void => { this.progress.retry(); this.start(this.engine.level, this.engine.seed); };
        const choose = (): void => { this.engine.input(null); this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, 28, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : labyrinthe de bombes et compagnons`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__BOMBERCADE_TEST__ = {
            fingerReceipts: () => ({ bombRequests: this.bombRequests, specialRequests: this.specialRequests, sequence: this.receipts.sequence, events: [...this.receipts.events] }),
            read: () => ({ ...this.engine.snapshot(), fingerInput: { paused: this.session.paused } }),
            renderStats: () => ({ dynamicCommands: this.graphics?.commandBuffer.length ?? 0 }),
            pilotAction: () => {
                // Forecast the held controls during the finger's 150 ms reaction delay.
                // Search only cloned state; no gameplay input or time is applied here.
                return this.testPilot.readAction(this.engine);
            },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 15, y: 140, width: 330, height: 390 }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            advance: ms => { if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide'); this.manual = true; if (!this.session.paused && !this.selecting) { this.engine.advance(ms); this.feedback(); this.sync(); } },
            scenario: name => {
                this.manual = true;
                this.start(name === 'danger' ? 10 : 0, 28, true);
                // Small ordinary rooms, resolved solely by the normal movement, fuse and damage rules.
                this.engine.board.blocks = []; this.engine.board.conveyors = []; this.engine.board.portals = [];
                const enemy = this.engine.actors[1]; if (!enemy) return;
                if (name === 'finish') {
                    enemy.at = 15; enemy.from = 15; enemy.think = 0;
                    this.engine.board.walls.push(14, 16, 26); this.engine.player.at = 13; this.engine.player.from = 13;
                    // Enemy's corridor has one exit through the future bomb cell: a legal trap.
                    this.engine.board.walls = this.engine.board.walls.filter(p => p !== 14); this.engine.board.walls.push(25);
                } else { this.engine.place(); this.engine.step(2200); }
                this.draw();
            },
        };
        const describeTarget = (target: EventTarget | null): string | null => target instanceof Element
            ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${Array.from(target.classList, name => `.${name}`).join('')}`.slice(0, 80) : null;
        if (window.__BOMBERCADE_TEST__) for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
            // Observe before the shell's tap-to-start capture stops propagation.
            this.inputs.on(window, type, event => {
                const e = event as PointerEvent; if (e.pointerType !== 'touch') return;
                const target = (e.target as Element | null)?.closest('.joystick, #bombercade-bomb, #bombercade-special, #resume');
                const control = target?.id || (target?.classList.contains('joystick') ? '.joystick' : null);
                this.receipts.events.push({ sequence: ++this.receipts.sequence, pointerId: e.pointerId, type, x: e.clientX, y: e.clientY, control,
                    target: describeTarget(e.target), path: e.composedPath().filter(target => target instanceof Element).slice(0, 4).map(describeTarget) });
                this.receipts.events = this.receipts.events.slice(-32);
            }, { capture: true });
        }
        this.start(Math.max(0, this.progress.save.unlocked - 1));
    }
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void {
        if (!this.session.paused && !this.selecting) { this.visualTime += this.manual ? 0 : delta; this.engine.step(this.manual ? 0 : Math.min(delta, 100)); this.feedback(); if (this.engine.status !== 'playing' && this.progress.state === 'playing') this.sync(); }
        this.draw();
    }
    private feedback(): void {
        for (const event of this.engine.events) sound.playEffect(event);
        const beat = Math.floor(this.engine.time / 500);
        if (this.engine.bombs.length && beat !== this.fuseBeat) sound.playEffect('fuse'); this.fuseBeat = beat;
    }
    private sync(): void {
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') { this.progress.finish(this.engine.status, this.engine.score); writeSave(browserStorage(), this.progress.save, 'bombercade'); }
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const e = this.engine, level = LEVELS[e.level]; if (!level) return;
        this.arena?.sync(e);
        g.clear();
        const unit = 30, ox = 15, oy = 140;
        for (const power of e.pickups) {
            const x = ox + power.at % WIDTH * unit + 15, y = oy + Math.floor(power.at / WIDTH) * unit + 15 + Math.sin(e.time / 240 + power.at) * 1.7;
            const tint = { range: 0xd47935, capacity: 0x4c93b8, speed: 0x387fb8, special: 0x9b59bc }[power.kind];
            g.fillStyle(0x071526, .5); g.fillEllipse(x, y + 10, 23, 7);
            g.fillStyle(tint); g.fillRoundedRect(x - 11, y - 11, 22, 22, 5);
            g.lineStyle(1.5, 0xfff3bf); g.strokeRoundedRect(x - 11, y - 11, 22, 22, 5);
            powerIcon(g, power.kind, x, y, 7);
        }
        if (level.arena === 'château') for (const x of [30, 330]) for (const y of [215, 455]) {
            const sway = Math.sin(this.visualTime / 130 + y) * 2;
            g.fillStyle(0xff932b, .22); g.fillEllipse(x, y - 4, 18, 25);
            g.fillStyle(0xff8a20); g.fillTriangle(x - 5, y, x + 5, y, x + sway, y - 18);
            g.fillStyle(0xfff2a0); g.fillTriangle(x - 2, y, x + 2, y, x - sway, y - 10);
        }
        // Neighboring cells connect into a cross; walls and crates keep the engine's exact footprint.
        const burning = new Set(e.fires.map(f => `${String(f.owner)}/${String(f.at)}`));
        for (const fire of e.fires) {
            const x = ox + fire.at % WIDTH * unit + 15, y = oy + Math.floor(fire.at / WIDTH) * unit + 15;
            const alpha = Math.min(1, fire.left / 180), tint = fire.character === 'panda' ? 0xc6ef58 : fire.character === 'pandaroux' ? 0xff9c3d : fire.character === 'dragon' ? 0xff5b27 : fire.character === 'singe' ? 0xff66c9 : 0x9c8bff;
            g.fillStyle(tint, .22 * alpha); g.fillRoundedRect(x - 15, y - 15, 30, 30, 9);
            const neighbors = [1, -1, WIDTH, -WIDTH].map(step =>
                Math.abs(step) !== 1 || Math.floor((fire.at + step) / WIDTH) === Math.floor(fire.at / WIDTH)
                    ? burning.has(`${String(fire.owner)}/${String(fire.at + step)}`) : false);
            for (const [axis, dx, dy] of [[0, 1, 0], [2, 0, 1]] as const) {
                const positive = neighbors[axis], negative = neighbors[axis + 1];
                if (!positive && !negative) continue;
                const flicker = Math.sin(e.time / 65 + fire.at) * 1.2;
                // Shared boundaries have identical width; only exposed tips taper.
                const shape = [[-15, negative ? -6 : 0], [-9, -8 - flicker], [0, -6], [9, -8 + flicker], [15, positive ? -6 : 0],
                    [15, positive ? 6 : 0], [9, 8 + flicker], [0, 6], [-9, 8 - flicker], [-15, negative ? 6 : 0]];
                const points = shape.map(([along = 0, across = 0]) => ({ x: x + dx * along - dy * across, y: y + dy * along + dx * across }));
                g.fillStyle(0xff8a26, alpha); g.fillPoints(points, true);
                const core = [[-15, negative ? -2.5 : 0], [0, -3], [15, positive ? -2.5 : 0], [15, positive ? 2.5 : 0], [0, 3], [-15, negative ? 2.5 : 0]];
                g.fillStyle(0xfff4b0, alpha); g.fillPoints(core.map(([along = 0, across = 0]) => ({ x: x + dx * along - dy * across, y: y + dy * along + dx * across })), true);
            }
            // Bomb stars follow actual origins; untagged dragon breath keeps its shape rule.
            const origin = this.explosionOrigins.get(fire);
            if (origin ?? (neighbors.slice(0, 2).some(Boolean) && neighbors.slice(2).some(Boolean) || !neighbors.some(Boolean))) {
                star(g, x, y, 12 + Math.sin(e.time / 55), 0xfffbd5, alpha);
                if (fire.character === 'singe') heart(g, x, y - 2, 4, 0xffb6df, alpha);
            }
        }
        for (const bomb of e.bombs) drawBomb(g, bomb.character, ox + bomb.at % WIDTH * unit + 15, oy + Math.floor(bomb.at / WIDTH) * unit + 16, 9 + Math.sin(e.time / (bomb.fuse < 650 ? 45 : 140)) * (bomb.fuse < 650 ? 1.4 : .4), e.time);
        const debris = this.debris;
        const current = new Set(e.board.blocks);
        if (debris.events !== e.events) { debris.events = e.events; debris.cursor = 0; }
        const breaks = e.events.slice(debris.cursor).filter(event => event === 'block').length;
        debris.cursor = e.events.length;
        if (breaks) for (const block of debris.blocks) {
            if (!current.has(block) && e.fires.some(f => f.at === block.at)) debris.particles.push({ at: block.at, born: e.time });
        }
        debris.blocks = current;
        debris.particles = debris.particles.filter(p => e.time - p.born < 380).slice(-12);
        for (const p of debris.particles) {
            const age = (e.time - p.born) / 380;
            g.fillStyle(palettes[level.arena as keyof typeof palettes][3], 1 - age);
            for (let n = 0; n < 3; n++) {
                const a = n * 2.1 + p.at;
                g.fillRect(ox + p.at % WIDTH * unit + 13 + Math.cos(a) * age * 22, oy + Math.floor(p.at / WIDTH) * unit + 13 + Math.sin(a) * age * 18 + age * age * 9, 4, 3);
            }
        }
        const danger = e.danger();
        e.actors.forEach((a, i) => {
            const actor = this.cast[i]; if (!actor) return;
            actor.time = this.visualTime; actor.animation = e.status === 'won' && !i ? 'celebration' : a.travel ? 'marche' : 'repos';
            actor.expression = !a.hearts || e.status === 'lost' && !i || a.hurt > 0 ? 'triste' : e.status === 'won' && !i || a.joy > 0 ? 'joie' : (danger.get(a.at) ?? Infinity) < 1200 ? 'surprise' : 'concentre';
            if (!a.hearts && a.hurt <= 0 || a.immune > 0 && Math.floor(e.time / 90) % 2) return;
            const x = (a.at % WIDTH) * (1 - a.travel) + (a.from % WIDTH) * a.travel;
            const y = Math.floor(a.at / WIDTH) * (1 - a.travel) + Math.floor(a.from / WIDTH) * a.travel;
            actor.pose = a.direction === 'up' ? 'dos' : a.direction === 'down' ? 'face' : 'profil'; actor.flip = a.direction === 'left';
            if (!i) { g.fillStyle(color(a.character), .45); g.fillEllipse(ox + x * unit + 15, oy + y * unit + 23, 31, 13); }
            actor.draw(g, ox + x * unit - 21, oy + y * unit - 35, 72);
            if (!i) { g.lineStyle(2, 0xffed8d); g.strokeCircle(ox + x * unit + 15, oy + y * unit + 15, 14); }
            if (a.shield > 0) { g.lineStyle(2, 0xffc4ec); g.strokeCircle(ox + x * unit + 15, oy + y * unit + 15, 19); }
        });
        const tips = { special: 'Bonus ✦ : une charge de pouvoir.', reinforced: 'Blocs cerclés : deux impacts.', conveyor: 'Tapis : un pas supplémentaire.', portal: 'Anneaux : transport par paire.', ice: 'Glaçons : un impact les pousse.', gold: 'Objectif : casse tous les blocs dorés.', sudden: 'Dernières secondes : attention aux anneaux !', candy: 'Pousse les bombes : elles rebondissent !' };
        const newest = level.mechanics.at(-1);
        this.hint?.setText(newest ? tips[newest] : 'Pose une bombe, éloigne-toi et tourne dans un autre couloir !');
        const remain = Math.max(0, Math.ceil((level.deadline - e.time) / 1000));
        const specialNames = { panda: 'Pluie de bambous', pandaroux: 'Roulade', dragon: 'Souffle', singe: 'Pirouette', licorne: 'Étoile filante' };
        const text = `${GAME_NAME} · ${String(e.level + 1)}/30 · SCORE ${String(e.score)}\n${characters[e.player.character].fr} · ${'♥'.repeat(Math.max(0, e.player.hearts))} · ${String(e.actors.slice(1).filter(a => a.hearts).length)} rival(aux) · ${String(remain)} s\n${level.arena} · ${level.name}\n${specialNames[e.player.character]} : ${String(e.player.charges)}${remain <= 10 && e.has('sudden') ? ' · Anneau imminent !' : ''}`;
        this.heading?.setText(`${String(e.level + 1).padStart(2, '0')}  ${level.name}`);
        this.counter?.setText(`${level.arena.toLocaleUpperCase('fr')}   ·   SCORE ${String(e.score)}`);
        this.timer?.setText(`${String(remain)} s`);
        this.powerLabel?.setText(`${specialNames[e.player.character]}  ·  ${String(e.player.charges)}`);
        for (let n = 0; n < 2; n++) heart(g, 32 + n * 23, 78, 8, n < e.player.hearts ? 0xff748d : 0x3d4b60);
        const rivals = e.actors.slice(1).filter(a => a.hearts);
        rivals.forEach((a, n) => {
            const x = 114 + n * 25;
            g.fillStyle(color(a.character)); g.fillCircle(x, 77, 9);
            g.fillStyle(0x132536); g.fillCircle(x - 3, 76, 1.6); g.fillCircle(x + 3, 76, 1.6);
            g.lineStyle(1, 0xfff0ce); g.strokeCircle(x, 77, 9);
        });
        // Clock silhouette and a charge gauge give quick information beside the exact text.
        if (remain <= 10) { g.lineStyle(2, 0xff8b73); g.strokeCircle(308, 77, 9); }
        star(g, 32, 105, 8, e.player.charges ? 0xffdd7e : 0x7b8a9e);
        if (e.player.charges) { g.fillStyle(color(e.player.character)); g.fillRoundedRect(24, 115, 312, 3, 1); }
        this.hud?.setText(text); const status = document.querySelector('#status'); if (status) status.textContent = text;
        const special = document.querySelector<HTMLButtonElement>('#bombercade-special'); if (special) { special.disabled = e.player.charges === 0; special.hidden = e.player.charges === 0; }
    }
}
