/* global URL, URLSearchParams */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const compile = path => ts.transpile(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
});
const originalSource = readFileSync(new URL('../src/shell/pwa.ts', import.meta.url), 'utf8');
const helpers = { exports: {} };
runInNewContext(compile('../src/shell/pwa-utils.ts'), helpers);
export const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

export function harness({ sw = true, waiting = false, offline = false, playing = false } = {}, sourceText = originalSource) {
    const source = ts.transpile(sourceText, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS });
    const elements = new Map();
    function element(id) {
        const node = { hidden: true, disabled: false, textContent: '', listeners: {},
            addEventListener(type, fn) { this.listeners[type] = fn; },
            focus() { document.activeElement = this; },
            contains(node) { return node === elements.get('#pwa-dismiss') || node === elements.get('#pwa-apply'); },
        };
        elements.set(id, node);
        return node;
    }
    for (const id of ['#pwa-update', '#pwa-message', '#pwa-apply', '#pwa-dismiss', '#sound', '#home-menu summary']) element(id);
    const builds = [element('footer'), element('home-menu'), element('game-menu')];
    const buttons = [element('force-home'), element('force-game')];
    const events = {}, swEvents = {}, timers = [], storage = new Map();
    const calls = { updates: 0, reloads: 0, messages: [], fetches: [], cleanup: [] };
    const worker = { postMessage(message) { calls.messages.push(message.type); } };
    const registration = { scope: 'https://example.test/Opencade/', waiting: waiting ? worker : null,
        update: async () => { calls.updates++; if (offline) throw Error('offline'); },
        unregister: async () => { calls.cleanup.push('unregister'); return true; },
    };
    const document = { visibilityState: 'visible', activeElement: null,
        body: { classList: { contains: () => playing } },
        querySelector: selector => elements.get(selector),
        querySelectorAll: selector => selector === '[data-build]' ? builds : selector === '#home footer > [data-build]' ? builds.slice(0, 1) : selector === '[data-force-update]' ? buttons : [],
        addEventListener: (type, fn) => { events[type] = fn; },
    };
    let now = 0;
    const window = {
        setInterval(fn, delay) { timers.push({ fn, delay, next: now + delay }); },
        setTimeout() { throw Error('Unexpected installation timeout'); },
    };
    const context = { exports: {}, require: name => {
        if (name === './pwa-utils') return helpers.exports;
        if (name === 'virtual:pwa-register') return { registerSW: options => options.onRegisteredSW('sw.js', registration) };
        throw Error(name);
    }, __APP_VERSION__: '0.3.2', __BUILD_DATE__: '2026-10-30T14:05:00Z',
    document, window, URL, URLSearchParams,
    navigator: sw ? { serviceWorker: { addEventListener: (type, fn) => { swEvents[type] = fn; } } } : {},
    location: { search: '', reload: () => { calls.reloads++; } },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    fetch: async (url, options) => { calls.fetches.push({ url: String(url), cache: options.cache }); return { ok: true, json: async () => ({ version: '0.3.3' }) }; },
    caches: { keys: async () => ['foreign', 'opencade-proof'], delete: async name => { calls.cleanup.push(name); return true; } },
    };
    runInNewContext(source, context);
    return { calls, registration, worker, document, builds, buttons, elements, swEvents,
        click: id => elements.get(id).listeners.click(),
        visibility(state) { document.visibilityState = state; events.visibilitychange(); },
        async tick(ms) {
            now += ms;
            for (const timer of timers) while (timer.next <= now) { timer.next += timer.delay; timer.fn(); await settle(); }
        },
    };
}

