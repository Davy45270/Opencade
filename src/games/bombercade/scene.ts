import Phaser from 'phaser';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { characters } from '../../characters/model';
import { Engine, LEVELS, WIDTH, type Direction } from '../../engines/bombercade/engine';
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
import { color, drawBomb } from './art';
import { ArenaLayer } from './arena';
import { cardinalDirection } from './controls';
export const bombercadeButtons: readonly TouchButton[] = [
    { id: 'bombercade-bomb', label: 'Bombe', ariaLabel: 'Poser une bombe', size: 64, placement: 'right', mode: 'tap' },
    { id: 'bombercade-special', label: '✦', ariaLabel: 'Pouvoir spécial', size: 56, placement: 'right', mode: 'tap' },
];
export interface BombercadeHook {
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { paused: boolean; bombRequests: number; specialRequests: number; receipts: { sequence: number; events: { sequence: number; pointerId: number; type: string; x: number; y: number; control: string | null; target: string | null; path: (string | null)[] }[] } } };
    renderStats(): { dynamicCommands: number };
    pilotAction(): Action;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    advance(ms: number): void;
    scenario(name: 'finish' | 'danger'): void;
}
declare global { interface Window { __BOMBERCADE_TEST__?: BombercadeHook } }
export class BombercadeScene extends Phaser.Scene {
    private engine = new Engine(selectedCharacter());
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
    private fuseBeat = 0;
    private visualTime = 0;
    constructor(private session = new PlaySession(true)) { super('bombercade'); }
    private start(index: number, seed = 28, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.testPilot = new Pilot(false); this.cast = this.engine.actors.map(a => new GameCharacter(a.character));
        this.arena?.reset();
        this.selecting = false; this.sync();
    }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.score, this.progress.total, this.selecting); }
    create(): void {
        document.body.classList.add('bombercade');
        const style = document.createElement('style');
        // Keep the 120 px hit surface rectangular. Only its non-interactive
        // decoration is rounded, so the visible outer ring remains a target.
        style.textContent = 'body.bombercade #touch-controls{height:120px;min-height:120px;flex-basis:120px;margin-bottom:max(12px,env(safe-area-inset-bottom))}body.bombercade #touch-controls #bombercade-bomb{width:64px;height:64px;min-width:64px!important;min-height:64px!important}body.bombercade #touch-controls .left{flex:0 0 120px}body.bombercade .joystick{position:relative;touch-action:none;border:0;border-radius:0;background:none}body.bombercade .joystick::before{content:"";position:absolute;inset:0;box-sizing:border-box;border:3px solid #64e4cc;border-radius:50%;background:radial-gradient(circle,#546c86 0 14%,#173b50 15% 62%,#80c9bf 63% 66%,#173b50 67%);pointer-events:none}body.bombercade .joystick span{position:absolute;color:#fff;font-size:24px;line-height:28px;pointer-events:none}body.bombercade .joystick span:nth-child(1){top:5px;left:43px}body.bombercade .joystick span:nth-child(2){bottom:5px;left:43px}body.bombercade .joystick span:nth-child(3){left:7px;top:42px}body.bombercade .joystick span:nth-child(4){right:7px;top:42px}';
        document.head.append(style);
        const cleanup = (): void => { this.arena?.destroy(); this.inputs.dispose(); style.remove(); document.body.classList.remove('bombercade'); delete window.__BOMBERCADE_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.arena = new ArenaLayer(this);
        this.graphics = this.add.graphics().setDepth(3);
        this.hud = this.add.text(14, 16, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff6de', lineSpacing: 7 });
        this.hint = this.add.text(15, 552, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff6de', wordWrap: { width: 330 }, lineSpacing: 5 });
        const action = (special: boolean): void => { if (this.session.paused || this.selecting) return; this.engine.events = []; if (special) this.specialRequests++; else this.bombRequests++; if (special) this.engine.special(); else this.engine.requestBomb(); this.feedback(); this.sync(); };
        renderTouchControls(this.inputs, bombercadeButtons, (id, held) => { if (held) action(id === 'bombercade-special'); });
        const slot = document.querySelector<HTMLElement>('#touch-controls .left');
        if (slot) virtualJoystick(this.inputs, slot, dir => {
            if (this.session.paused || this.selecting) { this.engine.input(null); return; }
            this.engine.input(cardinalDirection(dir));
        });
        const stick = slot?.querySelector('.joystick');
        // Chromium's touch adjustment needs a click candidate to keep edge taps on the joystick.
        if (stick) this.inputs.on(stick, 'click', () => {});
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
            read: () => ({ ...this.engine.snapshot(), fingerInput: { paused: this.session.paused, bombRequests: this.bombRequests, specialRequests: this.specialRequests, receipts: { sequence: this.receipts.sequence, events: [...this.receipts.events] } } }),
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
            const x = ox + power.at % WIDTH * unit, y = oy + Math.floor(power.at / WIDTH) * unit;
            g.fillStyle(0xffefb6); g.fillCircle(x + 15, y + 15, 10); g.lineStyle(2, color(e.player.character));
            if (power.kind === 'range') { g.lineBetween(x + 9, y + 15, x + 21, y + 15); g.lineBetween(x + 15, y + 9, x + 15, y + 21); }
            if (power.kind === 'capacity') { g.strokeCircle(x + 12, y + 15, 3); g.strokeCircle(x + 19, y + 15, 3); }
            if (power.kind === 'speed') for (let n = 0; n < 2; n++) { g.lineBetween(x + 10 + n * 6, y + 10, x + 14 + n * 6, y + 15); g.lineBetween(x + 14 + n * 6, y + 15, x + 10 + n * 6, y + 20); }
            if (power.kind === 'special') { g.fillStyle(color(e.player.character)); g.fillTriangle(x + 15, y + 7, x + 10, y + 21, x + 22, y + 12); }
        }
        const decorated = new Set<number>();
        for (const fire of e.fires) {
            const x = ox + fire.at % WIDTH * unit + 15, y = oy + Math.floor(fire.at / WIDTH) * unit + 15;
            g.fillStyle(color(fire.character), .8); g.fillRoundedRect(x - 14, y - 12, 28, 24, 8); g.fillStyle(0xffefb6, .9); g.fillCircle(x, y, 5 + Math.sin(e.time / 45) * 2);
            if (!decorated.has(fire.owner)) { this.cast.find(a => a.id === fire.character)?.drawEffect(g, x - 22, y - 22, 44); decorated.add(fire.owner); }
        }
        for (const bomb of e.bombs) drawBomb(g, bomb.character, ox + bomb.at % WIDTH * unit + 15, oy + Math.floor(bomb.at / WIDTH) * unit + 16, 9 + Math.sin(e.time / 100) * .8, e.time);
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
        this.hud?.setText(text); const status = document.querySelector('#status'); if (status) status.textContent = text;
        const special = document.querySelector<HTMLButtonElement>('#bombercade-special'); if (special) { special.disabled = e.player.charges === 0; special.hidden = e.player.charges === 0; }
    }
}
