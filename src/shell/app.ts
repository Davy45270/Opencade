import { bindSessionUpdate } from './scene-update';
import { setupCharacters } from '../characters/panel';
import { startThumbnail, browserThumbnailPorts } from './thumbnails';
import './pwa';
import Phaser from 'phaser';
import type { CatalogueLink, GameDefinition, GameTestHook } from '../games/definition';
import { readSave, browserStorage } from './storage';
import { setupSound, sound, device } from './services';
import '../style.css';
import { Inputs } from './input';
import { PlaySession, setupPause } from './pause';
import { setupGameMenu } from './menu';
import { installAdaptiveLayout } from './layout';
import { clearHud } from './hud';
declare global {
    interface Window {
        __ARCADE_TEST__?: { open(id: string): void; current(): string | null; thumbnails(): Record<string, number>; games: Record<string, GameTestHook | undefined> };
    }
}
/** Catalogue (every game of `games`, plus `links` to games that have their own site) or, with `single`, the only game of `games`. */
export function startApp({ games, links = [], order = games.map(entry => entry.id), single = false }: { games: readonly GameDefinition[]; links?: readonly CatalogueLink[]; order?: readonly string[]; single?: boolean }): void {
    const rank = (id: string): number => { const at = order.indexOf(id); return at < 0 ? order.length : at; };
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
        clearHud();
        const id = location.hash.replace(/^#\/?/, '');
        // A game that moved to its own site: the old #/<id> address goes there, test parameters kept.
        const moved = links.find(link => link.id === id);
        if (moved) { location.replace(`${moved.href}${location.search}`); return; }
        const definition = single ? games[0] : games.find(entry => entry.id === id);
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
        document.body.classList.toggle('fill-screen', definition?.fill === true);
        if (!definition) {
            setupCharacters(sessionInputs, testing);
            const cards = document.querySelector('#game-cards');
            cards?.replaceChildren();
            for (const entry of [...links, ...games].sort((a, b) => rank(a.id) - rank(b.id))) {
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
                const href = 'href' in entry ? entry.href : undefined;
                button.addEventListener('click', () => { if (href) location.assign(`${href}${location.search}`); else location.hash = `/${entry.id}`; });
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
            // A full-screen game draws at the play area's size; the others keep their 360×640 world scaled to fit.
            scale: definition.fill ? { mode: Phaser.Scale.RESIZE } : { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
            render: { antialias: true }, input: { activePointers: 2 },
        });
        const container = document.querySelector('#game');
        const activeGame = game;
        if (container) {
            // FIT and RESIZE must follow container changes even without a window resize.
            gameResizeObserver = new ResizeObserver(() => {
                activeGame.scale.getParentBounds();
                activeGame.scale.refresh();
            });
            gameResizeObserver.observe(container);
        }
    }
    window.addEventListener('hashchange', route);
    // On a single-game site, home is the Opencade catalogue, one level up (test parameters kept). Offline, it is reached
    // only through the catalogue's own service worker; without it, home falls back to the game's start screen (its levels).
    const catalogue = async (): Promise<void> => {
        const url = new URL(`../${location.search}`, location.href).href;
        const cached = navigator.onLine || ('serviceWorker' in navigator && Boolean((await navigator.serviceWorker.getRegistration(url).catch(() => undefined))?.active));
        if (cached) location.assign(url); else route();
    };
    document.querySelectorAll('[data-home]').forEach(button => {
        button.addEventListener('click', () => { if (single) void catalogue(); else location.hash = '/'; });
    });
    const allGames = document.querySelector<HTMLButtonElement>('#all-games');
    if (allGames) allGames.hidden = !single;
    allGames?.addEventListener('click', () => { void catalogue(); });
    route();
    installAdaptiveLayout();
}
