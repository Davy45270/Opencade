import { fingerReceipts } from '../finger-receipts';
import Phaser from 'phaser';
import { pullRecords } from '../../engines/caisses/records';
import { GameCharacter } from '../../characters/game';
import { Engine, LEVELS, type Direction } from '../../engines/caisses/engine';
import { doorOpen } from '../../engines/caisses/rules';
import { workshopTip } from '../../engines/caisses/tips';
import { Inputs, renderTouchControls, directionalSwipe, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const caissesButtons: readonly TouchButton[] = [
    { id: 'caisses-special', label: 'Tirer', ariaLabel: 'Tirer une caisse', size: 56, placement: 'right', mode: 'tap' },
    { id: 'caisses-left', label: '←', ariaLabel: 'Aller à gauche', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-up', label: '↑', ariaLabel: 'Monter', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-down', label: '↓', ariaLabel: 'Descendre', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-right', label: '→', ariaLabel: 'Aller à droite', size: 56, placement: 'left', mode: 'tap' },
    { compactMenu: true, id: 'caisses-undo', label: '↶', ariaLabel: 'Annuler', size: 56, placement: 'right', mode: 'tap' },
];
export interface CaissesHook {
    performance(): { frames: number; gameMs: number };
    advance(ms: number): void;
    bounds(): { hero: { x: number; y: number; width: number; height: number } };
    read(): ReturnType<Engine['snapshot']> & { fingerInput: { receipts: ReturnType<ReturnType<typeof fingerReceipts>>; paused: boolean; pulling: boolean }; cumulativeScore: number; progression: string; character: ReturnType<GameCharacter['snapshot']> };
    loadLevel(index: number, seed?: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    scenario(name: 'finish' | 'corner'): void;
}
declare global { interface Window { __CAISSES_TEST__?: CaissesHook } }
export class CaissesScene extends Phaser.Scene {
    private engine = new Engine();
    private hero = new GameCharacter();
    private progress = new Progression(readSave(browserStorage(), 'caisses', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private testManual = false;
    private pulling = false;
    private heroBounds = { x: 0, y: 0, width: 0, height: 0 };
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    constructor(private session = new PlaySession(false)) { super('caisses'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.pulling = false; this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.sync();
    }
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('caisses');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('caisses'); delete window.__CAISSES_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(12, 20, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#e5f3ff', lineSpacing: 6 });
        const action = (d: Direction | 'undo' | 'special'): void => {
            if (this.session.paused || this.selecting) return;
            if (d === 'special') { this.pulling = this.engine.specialUses > 0 && !this.pulling; } else if (d === 'undo') {
                if (this.engine.status !== 'playing') this.progress.retry();
                this.engine.undo(); sound.playEffect('undo');
            } else {
                const before = this.engine.state.pushes, position = this.engine.state.player;
                if (this.pulling) { this.engine.special(d); this.pulling = false; } else this.engine.input(d);
                if (position !== this.engine.state.player) this.hero.move(this.engine.state.player % this.engine.board.width - position % this.engine.board.width);
                else this.hero.impact = 350;
                sound.playEffect(this.engine.state.pushes > before ? 'push' : 'move');
                for (const event of this.engine.events) sound.playEffect(event);
            }
            this.sync();
        };
        renderTouchControls(this.inputs, caissesButtons, (id, held) => { if (held) action(id.replace('caisses-', '') as Direction | 'undo' | 'special'); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) directionalSwipe(this.inputs, area, action, 20, false);
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyQ: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        const retry = (): void => { this.pulling = false; this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.sync(); };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (e.repeat || this.session.paused || this.selecting) return;
            if (e.code === 'Space') { e.preventDefault(); action('special'); }
            else if (e.code === 'KeyR') { e.preventDefault(); retry(); }
            else if (e.code === 'Backspace' || e.code === 'KeyZ') { e.preventDefault(); action(e.code === 'KeyZ' && e.shiftKey ? 'up' : 'undo'); }
            else if (keys[e.code]) { e.preventDefault(); action(keys[e.code] ?? 'up'); }
        });
        const choose = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Caisses : pousser les caisses dorées sur les cibles turquoise');
        if (new URLSearchParams(location.search).get('test') === '1') window.__CAISSES_TEST__ = {
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.testManual = true;
                const step = 1000 / 60;
                for (let i = 0; i < Math.ceil(ms / step); i++) this.tick(Math.min(step, ms - i * step));
            },
            bounds: () => ({ hero: { ...this.heroBounds } }),
            performance: () => ({ frames: this.game.loop.frame, gameMs: this.hero.time }),
            read: () => ({ fingerInput: { receipts: receipts(), paused: this.session.paused, pulling: this.pulling }, ...this.engine.snapshot(), character: this.hero.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
            loadLevel: (index, seed) => { this.start(index, seed, true); },
            hudText: () => this.hud?.text ?? '', usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            scenario: name => {
                this.start(0, 28, true);
                // Ordinary legal moves only; level one is already one approach step from its push.
                if (name === 'finish') action('right');
                else { this.engine.loadPuzzle('######\n# $@ #\n# .  #\n######'); this.sync(); }
            },
        };
        this.sync();
    }
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void {
        this.tick(this.testManual ? 0 : delta);
    }
    private tick(delta: number): void {
        const paused = this.session.paused || this.selecting;
        if (!paused) this.engine.advance(delta);
        this.hero.advance(delta, paused, this.engine.status, this.engine.specialMs > 0);
        this.scale.refresh(); this.draw();
    }
    private sync(): void {
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') {
            this.progress.finish(this.engine.status, this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'caisses'); sound.playEffect(this.engine.status);
        }
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        this.hero.advance(0, this.session.paused || this.selecting, this.engine.status, this.engine.specialMs > 0);
        const b = this.engine.board, s = this.engine.state;
        g.clear(); g.fillStyle(0x101827); g.fillRect(0, 0, 360, 640);
        const unit = Math.min(336 / b.width, 490 / b.height), ox = (360-b.width*unit)/2, oy = 120+(490-b.height*unit)/2;
        const open = doorOpen(b, { player: s.player, boxes: s.boxes, colors: s.colors, filled: s.filled });
        const red = 0xff6b6b;
        for (let p=0; p<b.width*b.height; p++) {
            const x=ox+p%b.width*unit, y=oy+Math.floor(p/b.width)*unit, cx = x+unit/2, cy = y+unit/2;
            g.fillStyle(b.walls.includes(p)?0x52647c:b.ice.includes(p)?0x9fd8ff:0x20394c); g.fillRoundedRect(x+1,y+1,unit-2,unit-2,3);
            if (b.ice.includes(p)) { g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(x+unit*.2,y+unit*.7,x+unit*.45,y+unit*.3); g.lineBetween(x+unit*.55,y+unit*.8,x+unit*.8,y+unit*.4); }
            const arrow = b.arrows.find(a => a.at === p);
            if (arrow) { const [dx, dy] = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const)[arrow.direction]; g.fillStyle(0x7fdcff, 0.85); g.fillTriangle(cx+dx*unit*.3, cy+dy*unit*.3, cx-dx*unit*.15-dy*unit*.22, cy-dy*unit*.15-dx*unit*.22, cx-dx*unit*.15+dy*unit*.22, cy-dy*unit*.15+dx*unit*.22); }
            if (b.plates.includes(p)) { g.fillStyle(0xffd166); g.fillCircle(cx, cy, unit*.22); g.lineStyle(2, 0x8a6d1f); g.strokeCircle(cx, cy, unit*.22); }
            if (b.doors.includes(p)) { g.lineStyle(3, 0xffd166); g.strokeRect(x+3, y+3, unit-6, unit-6); if (!open) { g.fillStyle(0xb8892a); g.fillRect(x+5, y+5, unit-10, unit-10); } }
            if (b.pits.includes(p)) { g.fillStyle(s.filled.includes(p) ? 0x5b4636 : 0x05080d); g.fillRoundedRect(x+3, y+3, unit-6, unit-6, unit*.3); }
            const pad = b.pads.indexOf(p);
            if (pad >= 0) { g.lineStyle(3, 0xd29af2); g.strokeCircle(cx, cy, unit*.32); g.strokeCircle(cx, cy, unit*.16); }
            const target = b.targets.indexOf(p);
            if (target >= 0) { g.lineStyle(3, b.targetColors[target] ? red : 0x64e4cc); g.strokeCircle(cx, cy, unit*.3); }
            const box = s.boxes.indexOf(p);
            if (box >= 0) {
                const isRed = (s.colors[box] ?? 0) === 1, home = target >= 0 && (b.targetColors[target] ?? 0) === (s.colors[box] ?? 0);
                g.fillStyle(home ? 0x64e4cc : isRed ? red : 0xffb867); g.fillRoundedRect(x+4,y+4,unit-8,unit-8,3);
                g.lineStyle(2,0x6a4a35); g.lineBetween(x+7,y+7,x+unit-7,y+unit-7); g.lineBetween(x+unit-7,y+7,x+7,y+unit-7);
            }
            if (s.player===p) {
                this.heroBounds = { x: x-unit*.1, y: y-unit*.15, width: unit*1.2, height: unit*1.2 };
                this.hero.draw(g, x-unit*.1, y-unit*.15, unit*1.2);
            }
        }
        const left = this.engine.budgetLeft(), tip = this.engine.status === 'lost' ? 'Budget épuisé : annulez ↶ ou recommencez' : workshopTip(this.engine.level);
        const text = `CAISSES · ${String(this.engine.level+1)}/30 · ${LEVELS[this.engine.level]?.name ?? ''} · SCORE ${String(s.score)}\nPAS ${String(s.moves)}${left > 0 || this.engine.status === 'lost' ? ` (reste ${String(left)})` : ''} · POUSSÉES ${String(s.pushes)}\nTIRER ${String(this.engine.specialUses)}/1${this.pulling ? ' : direction ?' : ''}\nRecords sans/avec : ${String(LEVELS[this.engine.level]?.minimumPushes ?? 0)}/${String(pullRecords[this.engine.level]?.pushes ?? 0)} poussées${this.engine.snapshot().deadlocked ? '\nCoin bloqué : annulez ↶' : `\n${tip}`}`;
        this.hud?.setText(text);
        const status = document.querySelector('#status'); if (status) status.textContent = text;
    }
}
