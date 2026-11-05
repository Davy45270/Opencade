import Phaser from 'phaser';
import { Engine, FIXED, LEVELS, IDLE, ABILITIES, type Mode, type Intent } from '../../engines/petits-pompiers/engine';
import { Pilot } from '../../engines/petits-pompiers/pilot';
import { TouchPilot } from './driver';
import { selectedCharacter } from '../../characters/selection';
import { Inputs, renderTouchControls, virtualJoystick, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { Progression } from '../../shell/progression';
import { readSave, writeSave, browserStorage } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { fingerReceipts } from '../finger-receipts';
import { fingerProof } from './finger';
import { contextualAction, actionIcons, sectorDirection } from './controls';
import { firefighter, drop, flame, victim, toolArt, UNIT } from './art';
import { ArenaLayer, spriteKey } from './arena';
import { ActorLayer } from './actors';
import { BACKGROUND, STICK_ARROWS, worldOf } from './iso';
import { mascotGallery } from './gallery';
import { cameraView, edgeGuide, hudLayout, onScreen, playerPoint, tutorialAction, type Frame, type View } from './view';
/** Rendered size of the HUD counters, in CSS px. */
const COUNTER_PX = 18;
export const pompiersButtons: readonly TouchButton[] = [
    { id: 'pompiers-action', label: '💧', ariaLabel: 'Action contextuelle', size: 64, placement: 'right', mode: 'hold' },
    { id: 'pompiers-tool', label: '🧰', ariaLabel: 'Changer d’outil', size: 56, placement: 'right', mode: 'hold' },
];
export interface PompiersHook {
    read(): ReturnType<Engine['snapshot']> & { levelIndex: number; actionContext: ReturnType<typeof contextualAction>; fingerInput: Intent & { paused: boolean } };
    load(level: number, seed?: number, mode?: Mode): void;
    loadLevel(level: number, seed?: number): void;
    hudText(): string;
    hudCells(): ReturnType<typeof hudLayout>;
    /** Rendered (CSS px) font size of the HUD counters. */
    counterPx(): number;
    /** Canvas frame (CSS px), HUD box and map zoom: the full-screen shell's measurements. */
    frame(): Frame & { hud: { x: number; y: number; width: number; height: number }; tilePx: number };
    usefulArea(): { x: number; y: number; width: number; height: number };
    advance(ms: number): void;
    pilotAction(): Intent;
    scenario(name: 'finish' | 'timeout'): void;
    renderStats(): { backgroundBakes: number; dynamicCommands: number };
    playerArea(): { x: number; y: number; width: number; height: number };
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    fingerReceived: typeof fingerProof.fingerReceived;
    fingerReleased: typeof fingerProof.fingerReleased;
}
declare global { interface Window { __PETITS_POMPIERS_TEST__?: PompiersHook } }
export class PetitsPompiersScene extends Phaser.Scene {
    private engine = new Engine(selectedCharacter());
    private inputs = new Inputs();
    private progress = new Progression(readSave(browserStorage(), 'petits-pompiers', LEVELS.length), LEVELS.length);
    private arena?: ArenaLayer;
    private actors?: ActorLayer;
    private front?: Phaser.GameObjects.Graphics;
    private graphics?: Phaser.GameObjects.Graphics;
    private hud?: Phaser.GameObjects.Graphics;
    private hudLabels: Phaser.GameObjects.Text[] = [];
    private hudLayer?: Phaser.GameObjects.Container;
    private overlay?: Phaser.GameObjects.Graphics;
    private safe?: HTMLElement;
    private view?: View;
    private gallery?: HTMLCanvasElement;
    private instruction?: Phaser.GameObjects.Text;
    private selecting = false;
    private mode: Mode = 'detente';
    private index = 0;
    private held: Intent = { ...IDLE };
    private keys = new Set<string>();
    private manual = false;
    private pilot = new TouchPilot();
    private context: ReturnType<typeof contextualAction> = 'spray';
    private contextTick = -1;
    private modePanel?: HTMLElement;
    constructor(private session = new PlaySession(true)) { super('petits-pompiers'); }
    private clearInput(): void { this.held = { ...IDLE }; this.keys.clear(); this.engine.input(IDLE); }
    private start(index: number, seed = 28, mode = this.mode): void {
        this.engine.character = selectedCharacter(); this.clearInput(); this.index = index; this.mode = mode; this.progress.start(index, true);
        this.engine.loadLevel(index, seed, mode); this.pilot = new TouchPilot(); this.contextTick = -1; this.view = undefined;
        if (this.gallery) document.querySelector('#level-select')?.prepend(this.gallery);
        this.selecting = false; this.modePanel?.remove(); this.modePanel = undefined;
        this.cameras.main.setBackgroundColor(BACKGROUND[worldOf(this.engine)]);
        this.arena?.load(this.engine); this.sync();
    }
    private panels(): void { renderPanels(this.engine.status, this.progress.state, this.index, this.engine.stars * 100, this.progress.total, this.selecting); }
    private chooseMode(index: number): void {
        this.selecting = true; this.session.state = 'playing'; this.session.onChange?.(); this.clearInput(); this.panels();
        const levelPanel = document.querySelector<HTMLElement>('#level-select'); if (levelPanel) levelPanel.hidden = true;
        this.modePanel?.remove();
        const panel = document.createElement('div'); panel.id = 'pompiers-mode'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Choisir le mode');
        if (this.gallery) panel.append(this.gallery);
        for (const [mode, icon, label] of [['detente', '☁', 'Détente'], ['defi', '⏱', 'Défi']] as const) {
            const button = document.createElement('button'); button.id = `pompiers-${mode}`; button.textContent = `${icon} ${label}`; button.setAttribute('aria-pressed', String(mode === this.mode));
            this.inputs.on(button, 'click', () => { this.start(index, 28, mode); this.session.menuOpen = false; this.session.state = 'ready'; this.session.onChange?.(); }); panel.append(button);
        }
        document.querySelector('#play-area')?.append(panel); this.modePanel = panel;
    }
    create(): void {
        document.body.classList.add('petits-pompiers');
        // Full-screen shell: the safe-area insets are read from a probe, the canvas cannot read env().
        this.safe = document.createElement('div'); this.safe.setAttribute('aria-hidden', 'true');
        this.safe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:env(safe-area-inset-top);left:env(safe-area-inset-left);right:env(safe-area-inset-right);height:0';
        document.body.append(this.safe);
        const style = document.createElement('style');
        style.textContent = 'body.petits-pompiers #touch-controls{height:120px;min-height:120px;flex-basis:120px;margin-bottom:max(12px,env(safe-area-inset-bottom));touch-action:none}body.petits-pompiers #touch-controls .left{flex:0 0 120px}body.petits-pompiers .joystick{position:relative;border:0;border-radius:0;background:none;touch-action:none}body.petits-pompiers .joystick::before{content:"";position:absolute;inset:0;border:3px solid #ffe095;border-radius:50%;background:radial-gradient(circle,#8bbcac 0 16%,#295e69 17% 61%,#7ab8b7 62%);pointer-events:none}body.petits-pompiers .joystick .pompiers-arrow{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px;line-height:28px;text-align:center;color:#fff0ba;font-size:22px;pointer-events:none}body.petits-pompiers #touch-controls #pompiers-action{width:80px;height:80px;min-width:80px!important;min-height:80px!important;position:relative;border-radius:50%;font-size:16px;background:#f2bf63;color:#253d50;border:3px solid #fff0b7}body.petits-pompiers #pompiers-action[data-tutorial="true"]::after{content:"👇";position:absolute;left:20px;top:-42px;font-size:32px;pointer-events:none}body.petits-pompiers #touch-controls #pompiers-tool{border-radius:18px;background:#9fd3e0;border:3px solid #fff0b7;font-size:16px}#pompiers-mode{flex-wrap:wrap;align-content:center;padding:12px;box-sizing:border-box;position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;gap:16px;background:#183b4fed}#pompiers-mode button{min-width:130px;min-height:130px;font-size:24px;border-radius:26px;background:#ffdf91;color:#253d50;touch-action:none}';
        document.head.append(style);
        this.arena = new ArenaLayer(this); this.actors = new ActorLayer(this); this.graphics = this.add.graphics().setDepth(3); this.front = this.add.graphics().setDepth(800);
        // Sprites arrive in their own chunk; the map is rebuilt once they are loaded.
        if (!this.arena.ready()) void import('./atlas').then(({ sprites }) => {
            if (!this.sys.isActive()) return;
            for (const [key, url] of Object.entries(sprites)) if (!this.textures.exists(spriteKey(key))) this.load.image(spriteKey(key), url);
            this.load.once('complete', () => { if (this.sys.isActive()) { this.arena?.load(this.engine); this.draw(); } });
            this.load.start();
        }).catch(() => undefined);
        this.hud = this.add.graphics();
        for (let i = 0; i < 7; i++) this.hudLabels.push(this.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '18px', fontStyle: 'bold', color: '#263c51' }));
        // The HUD cells float over the map in the top-left corner, scaled to the screen, never under the ⏸.
        this.hudLayer = this.add.container(0, 0, [this.hud, ...this.hudLabels]).setDepth(1000);
        this.overlay = this.add.graphics().setDepth(950);
        this.cameras.main.setBackgroundColor('#eef4e9');
        this.instruction = this.add.text(180, 455, '', { fontFamily: 'system-ui', fontSize: '30px', color: '#263c51' }).setOrigin(.5, 0).setDepth(1000);
        this.gallery = mascotGallery(); document.querySelector('#level-select')?.prepend(this.gallery);
        renderTouchControls(this.inputs, pompiersButtons, (id, held) => { if (this.session.paused || this.selecting) return; if (id === 'pompiers-action') this.held.action = held; else this.held.tool = held; });
        const toolButton = document.querySelector('#pompiers-tool'); if (toolButton) toolButton.innerHTML = '<span aria-hidden="true" style="font-size:26px;pointer-events:none">🧰</span>';
        const slot = document.querySelector<HTMLElement>('#touch-controls .left');
        if (slot) virtualJoystick(this.inputs, slot, sector => { const d = sectorDirection(sector); this.held.dx = d.dx; this.held.dy = d.dy; });
        // The stick reads the grid axes: each arrow sits where the finger pushes and points along the iso axis it follows on screen.
        const stick = slot ? Array.from(slot.children).find(child => child.classList.contains('joystick')) : undefined;
        if (stick) for (const arrow of STICK_ARROWS) {
            const span = document.createElement('span'); span.className = 'pompiers-arrow'; span.setAttribute('aria-hidden', 'true'); span.textContent = '➤';
            span.dataset.axis = arrow.name; span.style.transform = `translate(${String(arrow.dx * 38)}px,${String(arrow.dy * 38)}px) rotate(${arrow.angle.toFixed(2)}deg)`; stick.append(span);
        }
        const allowed = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyW', 'KeyS', 'KeyD', 'KeyQ', 'KeyA', 'Space'];
        this.inputs.on(document, 'keydown', event => { const e = event as KeyboardEvent; if (allowed.includes(e.code) && !this.session.paused && !this.selecting) { e.preventDefault(); this.keys.add(e.code); } });
        this.inputs.on(document, 'keyup', event => { this.keys.delete((event as KeyboardEvent).code); });
        this.inputs.on(window, 'blur', () => { this.clearInput(); });
        const choose = (): void => { if (this.selecting) { this.selecting = false; this.session.menuOpen = false; this.session.onChange?.(); this.panels(); return; } this.selecting = true; this.session.state = 'playing'; this.session.onChange?.(); this.clearInput(); renderLevels(LEVELS, this.progress.save, index => { this.chooseMode(index); }); this.panels(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', choose);
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', () => { this.start(this.index); });
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.chooseMode(this.index + 1); });
        this.game.canvas.setAttribute('aria-label', 'Petits Pompiers : secourir et éteindre les incendies');
        const receipts = fingerReceipts(this.inputs);
        if (new URLSearchParams(location.search).get('test') === '1') window.__PETITS_POMPIERS_TEST__ = {
            ...fingerProof, fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), levelIndex: this.index, actionContext: this.actionContext(), fingerInput: { ...this.intent(), paused: this.session.paused || this.selecting } }),
            load: (level, seed, mode) => { this.start(level, seed, mode); this.session.menuOpen = false; this.session.onChange?.(); },
            loadLevel: (level, seed) => { this.start(level, seed); this.session.menuOpen = false; this.session.onChange?.(); },
            hudText: () => `Petits Pompiers · SCORE ${String(this.engine.stars * 100)}`,
            hudCells: () => hudLayout(this.engine),
            counterPx: () => parseFloat(String(this.hudLabels[0]?.style.fontSize ?? 0)) * this.hudScale().scale * this.cssScale(),
            frame: () => {
                const f = this.frame(), h = this.hudScale(), k = this.cssScale(), view = this.view ?? cameraView(this.engine, undefined, true, f);
                return { width: f.width * k, height: f.height * k, top: f.top * k, hud: { x: h.x * k, y: h.y * k, width: 352 * h.scale * k, height: (f.top - h.y) * k }, tilePx: UNIT * view.scale * k };
            },
            usefulArea: () => { const f = this.frame(); return { x: 0, y: f.top, width: f.width, height: f.height - f.top }; },
            advance: ms => { if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Durée'); this.manual = true; this.advance(ms); },
            pilotAction: () => this.pilot.readAction(this.engine),
            scenario: name => {
                this.manual = true;
                this.start(this.index, 28, this.mode);
                // Reach a nearly finished ordinary state through public input and fixed steps.
                const pilot = new Pilot();
                for (let i = 0; i < 36000 && !this.engine.objectivesDone() && this.engine.status === 'playing'; i++) { this.engine.input(pilot.readAction(this.engine)); this.engine.step(FIXED); }
                this.engine.input(IDLE);
                if (name === 'timeout') this.engine.time = this.engine.level.seconds * 1000 - FIXED;
                this.contextTick = -1; this.draw();
            },
            renderStats: () => ({ backgroundBakes: this.arena?.bakes ?? 0, dynamicCommands: (this.graphics?.commandBuffer.length ?? 0) + (this.front?.commandBuffer.length ?? 0) + (this.hud?.commandBuffer.length ?? 0) }),
            playerArea: () => { const view = this.view ?? cameraView(this.engine), p = onScreen(view, playerPoint(this.engine)); return { x: Math.max(0, p.x - 26 * view.scale), y: Math.max(this.frame().top, p.y - 38 * view.scale), width: 52 * view.scale, height: 56 * view.scale }; },
        };
        const cleanup = (): void => { this.arena?.destroy(); this.actors?.destroy(); this.inputs.dispose(); this.modePanel?.remove(); this.gallery?.remove(); style.remove(); this.safe?.remove(); document.body.classList.remove('petits-pompiers'); delete window.__PETITS_POMPIERS_TEST__; sound.stop(); };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        this.start(Math.max(0, this.progress.save.unlocked - 1));
        this.selecting = true; this.session.state = 'playing'; this.session.onChange?.(); renderLevels(LEVELS, this.progress.save, index => { this.chooseMode(index); }); this.panels();
    }
    private intent(): Intent {
        const keys = this.keys;
        return { dx: this.held.dx || Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyQ')),
            dy: this.held.dy || Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyZ') || keys.has('KeyW')),
            action: this.held.action || keys.has('Space'), tool: this.held.tool || keys.has('KeyA') };
    }
    private actionContext(): ReturnType<typeof contextualAction> {
        if (this.contextTick !== this.engine.ticks) { this.context = contextualAction(this.engine); this.contextTick = this.engine.ticks; }
        return this.context;
    }
    private advance(ms: number): void {
        if (this.session.paused || this.selecting) { this.clearInput(); return; }
        this.engine.input(this.intent());
        // Read every fixed-step event, including brief work completed inside a long test advance.
        for (let remaining = ms; remaining > 0 && this.engine.status === 'playing'; remaining -= FIXED) {
            this.engine.input(this.intent()); this.engine.step(Math.min(FIXED, remaining));
            for (const event of this.engine.events) sound.playEffect(event.type);
        }
        this.sync();
    }
    private sync(): void {
        if (this.engine.status !== 'playing' && this.progress.state === 'playing') { this.progress.finish(this.engine.status, this.engine.stars * 100); writeSave(browserStorage(), this.progress.save, 'petits-pompiers'); this.clearInput(); }
        this.panels(); this.draw();
    }
    updatePaused(): void { this.clearInput(); this.draw(); }
    update(_time: number, delta: number): void { if (!this.manual) this.advance(Math.min(delta, 100)); else this.draw(); }
    /** Canvas px per CSS px (1 in RESIZE; kept general). */
    private cssScale(): number { const w = this.game.canvas.getBoundingClientRect().width; return w > 0 ? w / this.scale.width : 1; }
    /** HUD placement: inside the safe area, 0.6× to 1.4× its 352 px design, leaving 60 px for the ⏸. */
    private hudScale(): { x: number; y: number; scale: number } {
        const r = this.safe?.getBoundingClientRect(), canvas = this.game.canvas.getBoundingClientRect(), k = 1 / this.cssScale();
        const left = Math.max(0, (r?.left ?? 0) - canvas.left) * k, top = Math.max(0, (r?.top ?? 0) - canvas.top) * k, right = Math.max(0, canvas.right - (r?.right ?? canvas.right)) * k;
        // Landscape: the HUD keeps at most a third of the height so the map stays playable.
        return { x: left, y: top, scale: Math.min(1.4, Math.max(.6, Math.min((this.scale.width - left - right - 60) / 352, (this.scale.height - top) * .32 / 104))) };
    }
    /** The map covers the whole canvas; the camera centres the player in the part under the HUD. */
    private frame(): Frame { const h = this.hudScale(); return { width: this.scale.width, height: this.scale.height, top: h.y + 104 * h.scale }; }
    private draw(): void {
        const g = this.graphics; if (!g) return;
        const e = this.engine, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, frame = this.frame(), place = this.hudScale();
        this.view = cameraView(e, this.view, reduced, frame);
        this.hudLayer?.setPosition(place.x, place.y).setScale(place.scale);
        const overlay = this.overlay; overlay?.clear();
        this.arena?.sync(e); this.arena?.view(this.view, e);
        if (this.front) this.actors?.draw(e, this.view, g, this.front, reduced);
        const hud = this.hud;
        if (hud) {
            hud.clear();
            const cells = hudLayout(e);
            // Counters are read by children: at least 18 px on screen, whatever the HUD scale.
            const shown = place.scale * this.cssScale(), font = Math.min(28, Math.max(18, Math.ceil(COUNTER_PX / (shown || 1))));
            this.hudLabels.forEach((label, i) => {
                const cell = cells[i]; label.setText(cell?.text ?? '');
                if (label.style.fontSize !== `${String(font)}px`) label.setFontSize(font);
                if (!cell) return;
                const { x, y, width, height } = cell.box;
                hud.fillStyle(cell.done ? 0xc9ebd1 : 0xffffff); hud.fillRoundedRect(x, y, width, height, 12);
                if (cell.id === 'water') {
                    drop(hud, x + 17, y + 19, 13); hud.fillStyle(0xc7d8d5); hud.fillRoundedRect(x + 33, y + 10, width - 43, 14, 7);
                    hud.fillStyle(0x49bce4); hud.fillRoundedRect(x + 33, y + 10, (width - 43) * e.player.water / ABILITIES[e.character].water, 14, 7);
                } else if (cell.id === 'extinguish') flame(hud, x + 19, y + 26, 18);
                else if (cell.id === 'rescue_person' || cell.id === 'rescue_animal') victim(hud, x + 19, y + 23, cell.id === 'rescue_person' ? 'person' : 'cat', 24);
                else if (cell.id === 'heal') toolArt(hud, 'kit', x + 19, y + 25);
                label.setOrigin(0, .5).setPosition(x + (['hearts', 'time'].includes(cell.id) ? 7 : 37), y + height / 2);
                if (cell.done) { hud.lineStyle(3, 0x258653); hud.lineBetween(x + width - 17, y + 9, x + width - 12, y + 14); hud.lineBetween(x + width - 12, y + 14, x + width - 5, y + 5); }
            });
            if (e.status === 'won' && overlay) firefighter(overlay, e.character, frame.width / 2, frame.height - 74, 110, reduced ? 0 : e.time, 0, 1, false, true, false);
            const guide = edgeGuide(e, this.view, frame);
            if (overlay && e.status === 'playing' && (guide.outside || e.nextObjective().type === 'exit')) {
                const { x, y, angle } = guide, dx = Math.cos(angle), dy = Math.sin(angle);
                overlay.lineStyle(7, 0x263c51); overlay.lineBetween(x - dx * 15, y - dy * 15, x + dx * 9, y + dy * 9);
                overlay.fillStyle(0xffdc65); overlay.fillTriangle(x + dx * 16, y + dy * 16, x - dx * 5 - dy * 11, y - dy * 5 + dx * 11, x - dx * 5 + dy * 11, y - dy * 5 - dx * 11);
            }
        }
        const context = this.actionContext(), button = document.querySelector('#pompiers-action');
        if (button) { button.innerHTML = `<span aria-hidden="true" style="font-size:34px;pointer-events:none">${actionIcons[context]}</span>`; button.setAttribute('data-action', context); button.setAttribute('aria-label', `Action : ${{ spray: 'jet d’eau', foam: 'mousse', refill: 'remplir', pickup: 'porter', deposit: 'déposer', heal: 'soigner', break: 'déblayer', climb: 'monter', call: 'appeler' }[context]}`); }
        const showAction = this.index === 0 && tutorialAction(e, context);
        button?.setAttribute('data-tutorial', String(showAction));
        this.instruction?.setText(e.status === 'won' ? '⭐'.repeat(e.stars) : '').setPosition(frame.width / 2, frame.height * .71);
        const status = document.querySelector('#status'); if (status) status.textContent = `${e.level.name} · ${e.mode} · eau ${String(Math.round(e.player.water))} · ${e.status}`;
    }
}
