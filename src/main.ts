import Phaser from 'phaser';
import { games, type GameTestHook } from './games/registry';
import { readSave, browserStorage } from './shell/storage';
import { setupSound, sound, device } from './shell/services';
import './style.css';
import { Inputs } from './shell/input';
import { PlaySession, setupPause } from './shell/pause';
import { setupGameMenu } from './shell/menu';
declare global {
    interface Window {
        __ARCADE_TEST__?: { open(id: string): void; current(): string | null; games: Record<string, GameTestHook | undefined> };
    }
}
setupSound();
let game: Phaser.Game | undefined;
let current: string | null = null;
let gameResizeObserver: ResizeObserver | undefined;
let sessionInputs = new Inputs();
const testing = new URLSearchParams(location.search).get('test') === '1';
const hooks: Record<string, GameTestHook | undefined> = {};
if (testing) {
    for (const entry of games) Object.defineProperty(hooks, entry.id, { enumerable: true, get: () => entry.testHook?.() });
    window.__ARCADE_TEST__ = { open: id => { location.hash = `/${id}`; }, current: () => current, games: hooks };
}
function route(): void {
    gameResizeObserver?.disconnect();
    gameResizeObserver = undefined;
    sessionInputs.dispose();
    sessionInputs = new Inputs();
    const id = location.hash.replace(/^#\/?/, '');
    const definition = games.find(entry => entry.id === id);
    current = definition?.id ?? null;
    const heading = document.querySelector('h1');
    if (heading) heading.textContent = definition?.name ?? 'Arcade Lab';
    if (game) {
        game.destroy(true);
        game = undefined;
    }
    const home = document.querySelector<HTMLElement>('#home');
    const play = document.querySelector<HTMLElement>('#play');
    if (home) home.hidden = Boolean(definition);
    if (play) play.hidden = !definition;
    document.body.classList.toggle('playing', Boolean(definition));
    if (!definition) {
        const cards = document.querySelector('#game-cards');
        cards?.replaceChildren();
        for (const entry of games) {
            const save = readSave(browserStorage(), entry.id, entry.levelCount);
            const button = document.createElement('button');
            button.className = 'game-card';
            // Original bubble motif drawn directly with CSS.
            const icon = document.createElement('span');
            icon.className = 'game-icon'; icon.setAttribute('aria-hidden', 'true');
            const content = document.createElement('span'); content.className = 'card-content';
            const name = document.createElement('strong'); name.textContent = entry.name;
            const stats = document.createElement('small');
            stats.textContent = `Meilleur score : ${String(save.best)} · Niveaux débloqués : ${String(save.unlocked)}/${String(entry.levelCount)}`;
            content.append(name, stats); button.append(icon, content);
            button.addEventListener('click', () => { location.hash = `/${entry.id}`; });
            cards?.append(button);
        }
        return;
    }
    const keyboardHelp = document.querySelector('#keyboard-help');
    const touchHelp = document.querySelector('#touch-help');
    if (keyboardHelp) keyboardHelp.textContent = definition.keyboardHelp;
    if (touchHelp) touchHelp.textContent = definition.touchHelp;
    sound.effects = definition.effects;
    const session = new PlaySession(definition.realtime, device);
    device.setFinished(false);
    setupPause(sessionInputs, session);
    for (const selector of ['#play', '#topbar']) sessionInputs.on(document.querySelector(selector), 'contextmenu', event => { event.preventDefault(); });
    const fullscreen = document.querySelector<HTMLButtonElement>('#fullscreen');
    if (fullscreen) fullscreen.hidden = !device.fullscreenAvailable || !matchMedia('(pointer: coarse), (width < 600px)').matches;
    sessionInputs.on(fullscreen, 'click', () => { void device.fullscreen(); });
    setupGameMenu(sessionInputs, session);
    const scene = definition.createScene(session);
    const update = scene.update.bind(scene);
    scene.update = (time: number, delta: number): void => { if (!session.paused) update(time, delta); };
    game = new Phaser.Game({
        type: Phaser.AUTO, parent: 'game', width: 360, height: 640,
        backgroundColor: '#101827', scene: [scene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true }, input: { activePointers: 2 },
    });
    const container = document.querySelector('#game');
    const activeGame = game;
    if (container) {
        // FIT must follow container changes even without a window resize.
        gameResizeObserver = new ResizeObserver(() => {
            activeGame.scale.getParentBounds();
            activeGame.scale.refresh();
        });
        gameResizeObserver.observe(container);
    }
}
window.addEventListener('hashchange', route);
document.querySelectorAll('[data-home]').forEach(button => {
    button.addEventListener('click', () => { location.hash = '/'; });
});
route();
