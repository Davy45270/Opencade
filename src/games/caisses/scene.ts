import Phaser from 'phaser';
import { Engine, LEVELS, type Direction } from '../../engines/caisses/engine';
import { Inputs, renderTouchControls, directionalSwipe, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, writeSave } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
export const caissesButtons: readonly TouchButton[] = [
    { id: 'caisses-left', label: '←', ariaLabel: 'Aller à gauche', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-up', label: '↑', ariaLabel: 'Monter', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-down', label: '↓', ariaLabel: 'Descendre', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-right', label: '→', ariaLabel: 'Aller à droite', size: 56, placement: 'left', mode: 'tap' },
    { id: 'caisses-undo', label: '↶', ariaLabel: 'Annuler', size: 56, placement: 'right', mode: 'tap' },
];
export interface CaissesHook {
    read(): ReturnType<Engine['snapshot']> & { cumulativeScore: number; progression: string };
    loadLevel(index: number, seed?: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    scenario(name: 'finish' | 'corner'): void;
}
declare global { interface Window { __CAISSES_TEST__?: CaissesHook } }
export class CaissesScene extends Phaser.Scene {
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'caisses', 30), 30);
    private inputs = new Inputs();
    private selecting = false;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Text;
    constructor(private session = new PlaySession(false)) { super('caisses'); }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.engine.level, this.engine.state.score, this.progress.total, this.selecting); }
    private start(index: number, seed?: number, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index, seed); this.selecting = false; this.sync();
    }
    create(): void {
        document.body.classList.add('caisses');
        const cleanup = (): void => { this.inputs.dispose(); document.body.classList.remove('caisses'); delete window.__CAISSES_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.graphics = this.add.graphics();
        this.hud = this.add.text(12, 20, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#e5f3ff', lineSpacing: 8 });
        const action = (d: Direction | 'undo'): void => {
            if (this.session.paused || this.selecting) return;
            if (d === 'undo') {
                if (this.engine.status === 'won') this.progress.retry();
                this.engine.undo(); sound.playEffect('undo');
            } else {
                const before = this.engine.state.pushes; this.engine.input(d);
                sound.playEffect(this.engine.state.pushes > before ? 'push' : 'move');
            }
            this.sync();
        };
        renderTouchControls(this.inputs, caissesButtons, (id, held) => { if (held) action(id.replace('caisses-', '') as Direction | 'undo'); });
        const area = document.querySelector<HTMLElement>('#game');
        if (area) directionalSwipe(this.inputs, area, action, 20, false);
        const keys: Record<string, Direction> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyQ: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        const retry = (): void => { this.progress.retry(); this.engine.loadLevel(this.engine.level, this.engine.seed); this.sync(); };
        this.inputs.on(document, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (e.repeat || this.session.paused || this.selecting) return;
            if (e.code === 'KeyR') { e.preventDefault(); retry(); }
            else if (e.code === 'Backspace' || e.code === 'KeyZ') { e.preventDefault(); action(e.code === 'KeyZ' && e.shiftKey ? 'up' : 'undo'); }
            else if (keys[e.code]) { e.preventDefault(); action(keys[e.code] ?? 'up'); }
        });
        const choose = (): void => { this.selecting = !this.selecting; renderLevels(LEVELS, this.progress.save, index => { this.start(index, undefined, true); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.start(this.engine.level + 1); });
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.game.canvas.setAttribute('aria-label', 'Caisses : pousser les caisses dorées sur les cibles turquoise');
        if (new URLSearchParams(location.search).get('test') === '1') window.__CAISSES_TEST__ = {
            read: () => ({ ...this.engine.snapshot(), cumulativeScore: this.progress.total, progression: this.progress.state }),
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
    update(): void { this.scale.refresh(); }
    private sync(): void {
        if (this.engine.status === 'won' && this.progress.state === 'playing') {
            this.progress.finish('won', this.engine.state.score); writeSave(browserStorage(), this.progress.save, 'caisses'); sound.playEffect('won');
        }
        this.panels(); this.draw();
    }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const b = this.engine.board, s = this.engine.state;
        g.clear(); g.fillStyle(0x101827); g.fillRect(0, 0, 360, 640);
        const unit = Math.min(336 / b.width, 490 / b.height), ox = (360-b.width*unit)/2, oy = 120+(490-b.height*unit)/2;
        for (let p=0; p<b.width*b.height; p++) {
            const x=ox+p%b.width*unit, y=oy+Math.floor(p/b.width)*unit;
            g.fillStyle(b.walls.includes(p)?0x52647c:0x20394c); g.fillRoundedRect(x+1,y+1,unit-2,unit-2,3);
            if (b.targets.includes(p)) { g.lineStyle(3,0x64e4cc); g.strokeCircle(x+unit/2,y+unit/2,unit*.3); }
            if (s.boxes.includes(p)) {
                g.fillStyle(b.targets.includes(p)?0x64e4cc:0xffb867); g.fillRoundedRect(x+4,y+4,unit-8,unit-8,3);
                g.lineStyle(2,0x6a4a35); g.lineBetween(x+7,y+7,x+unit-7,y+unit-7); g.lineBetween(x+unit-7,y+7,x+7,y+unit-7);
            }
            if (s.player===p) { g.fillStyle(0xe5fff7); g.fillCircle(x+unit/2,y+unit/2,unit*.32); g.fillStyle(0x20394c); g.fillCircle(x+unit*.6,y+unit*.4,2); }
        }
        const text = `CAISSES · ${String(this.engine.level+1)}/30 · SCORE ${String(s.score)}\nPAS ${String(s.moves)} · POUSSÉES ${String(s.pushes)}\nRecord possible : ${String((LEVELS[this.engine.level]?.minimumPushes ?? 0))} poussées${this.engine.snapshot().deadlocked ? '\nCoin bloqué : annulez ↶' : ''}`;
        this.hud?.setText(text);
        const status = document.querySelector('#status'); if (status) status.textContent = text;
    }
}
