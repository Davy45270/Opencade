import { bindSessionUpdate } from './shell/scene-update';
import { setupCharacters } from './characters/panel';
import { startThumbnail, browserThumbnailPorts } from './shell/thumbnails';
import './shell/pwa';
import Phaser from 'phaser';
import { games, type GameTestHook } from './games/registry';
import { readSave, browserStorage } from './shell/storage';
import { setupSound, sound, device } from './shell/services';
import './style.css';
import './games/gourmandises/style.css';
import { Inputs } from './shell/input';
import { PlaySession, setupPause } from './shell/pause';
import { setupGameMenu } from './shell/menu';
declare global {
    interface Window {
        __ARCADE_TEST__?: { open(id: string): void; current(): string | null; thumbnails(): Record<string, number>; games: Record<string, GameTestHook | undefined> };
    }
}
setupSound();
let game: Phaser.Game | undefined;
let current: string | null = null;
let thumbnails: { stop(): void }[] = [];
const thumbnailFrames: Record<string, number> = {};
let gameResizeObserver: ResizeObserver | undefined;
let sessionInputs = new Inputs();
const testing = new URLSearchParams(location.search).get('test') === '1';
const hooks: Record<string, GameTestHook | undefined> = {};
if (testing) {
    for (const entry of games) Object.defineProperty(hooks, entry.id, { enumerable: true, get: () => entry.testHook?.() });
    window.__ARCADE_TEST__ = { open: id => { location.hash = `/${id}`; }, current: () => current, games: hooks, thumbnails: () => ({ ...thumbnailFrames }) };
}
function route(): void {
    for (const thumbnail of thumbnails) thumbnail.stop();
    thumbnails = [];
    document.querySelector('#game-cards')?.replaceChildren();
    gameResizeObserver?.disconnect();
    gameResizeObserver = undefined;
    sessionInputs.dispose();
    sessionInputs = new Inputs();
    const id = location.hash.replace(/^#\/?/, '');
    const definition = games.find(entry => entry.id === id);
    current = definition?.id ?? null;
    const heading = document.querySelector('h1');
    if (heading) heading.textContent = definition?.name ?? 'Opencade';
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
        setupCharacters(sessionInputs, testing);
        const cards = document.querySelector('#game-cards');
        cards?.replaceChildren();
        for (const entry of games) {
            const save = readSave(browserStorage(), entry.id, entry.levelCount);
            const button = document.createElement('button');
            button.className = 'game-card';
            const icon = document.createElement('canvas');
            icon.className = 'game-thumbnail'; icon.setAttribute('aria-hidden', 'true');
            icon.dataset.game = entry.id;
            const content = document.createElement('span'); content.className = 'card-content';
            const name = document.createElement('strong'); name.textContent = entry.name;
            const stats = document.createElement('small');
            stats.textContent = `Meilleur score : ${String(save.best)} · Niveaux débloqués : ${String(save.unlocked)}/${String(entry.levelCount)}`;
            content.append(name, stats); button.append(icon, content);
            button.addEventListener('click', () => { location.hash = `/${entry.id}`; });
            cards?.append(button);
            thumbnailFrames[entry.id] ??= 0;
            thumbnails.push(startThumbnail(icon, entry.thumbnail(), browserThumbnailPorts(), () => { thumbnailFrames[entry.id] = (thumbnailFrames[entry.id] ?? 0) + 1; }));
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
    bindSessionUpdate(scene, session);
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
