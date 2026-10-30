/* global URL, URLSearchParams */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const compile = path => ts.transpile(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
});
const source = compile('../src/shell/pwa.ts');
const helpers = { exports: {} };
runInNewContext(compile('../src/shell/pwa-utils.ts'), helpers);
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

function harness({ sw = true, waiting = false, offline = false, playing = false } = {}) {
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
        querySelectorAll: selector => selector === '[data-build]' ? builds : buttons,
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

test('check runs on startup, every 30 minutes, and only on becoming visible', async () => {
    const h = harness();
    await settle();
    assert.equal(h.calls.updates, 1);
    await h.tick(30 * 60 * 1000 - 1);
    assert.equal(h.calls.updates, 1);
    await h.tick(1);
    assert.equal(h.calls.updates, 2);
    await h.tick(30 * 60 * 1000);
    assert.equal(h.calls.updates, 3);
    h.visibility('hidden'); await settle();
    assert.equal(h.calls.updates, 3);
    h.visibility('visible'); await settle();
    assert.equal(h.calls.updates, 4);
});

test('force activates an already waiting worker while update rejects offline', async () => {
    const h = harness({ waiting: true, offline: true });
    await settle();
    assert.equal(h.calls.updates, 1); // The automatic check really did reject.
    h.click('force-home'); await settle();
    assert.deepEqual(h.calls.messages, ['SKIP_WAITING']);
    assert.equal(h.calls.reloads, 0);
    h.swEvents.controllerchange();
    assert.equal(h.calls.reloads, 1);
    assert.deepEqual(h.calls.cleanup, []);
});

test('force also activates a worker that becomes waiting during a rejected update', async () => {
    const h = harness(); await settle();
    h.registration.update = async () => { h.registration.waiting = h.worker; throw Error('offline'); };
    h.click('force-game'); await settle();
    assert.deepEqual(h.calls.messages, ['SKIP_WAITING']);
});

test('force without a waiting worker unregisters and clears only app caches before reload', async () => {
    const h = harness(); await settle();
    h.click('force-home'); await settle();
    assert.deepEqual(h.calls.cleanup, ['unregister', 'opencade-proof']);
    assert.equal(h.calls.reloads, 1);
});

test('offline failure without a waiting worker reports a retryable error', async () => {
    const h = harness({ offline: true }); await settle();
    assert.equal(h.elements.get('#pwa-update').hidden, true);
    h.click('force-home'); await settle();
    assert.match(h.elements.get('#pwa-message').textContent, /Mise à jour impossible/);
    assert.ok(h.buttons.every(button => !button.disabled));
    assert.equal(h.calls.reloads, 0);
});

test('version request explicitly bypasses the client HTTP cache', async () => {
    const h = harness({ waiting: true }); await settle();
    assert.deepEqual(h.calls.fetches, [{ url: 'https://example.test/Opencade/version.json', cache: 'no-store' }]);
    assert.match(h.elements.get('#pwa-message').textContent, /0.3.3/);
    assert.equal(h.elements.get('#pwa-update').hidden, false);
});

for (const playing of [false, true]) {
    test(`dismiss hides the banner and restores focus (playing=${playing})`, async () => {
        const h = harness({ waiting: true, playing }); await settle();
        h.elements.get('#pwa-dismiss').focus();
        h.click('#pwa-dismiss');
        assert.equal(h.elements.get('#pwa-update').hidden, true);
        assert.equal(h.document.activeElement, h.elements.get(playing ? '#sound' : '#home-menu summary'));
    });
}

test('the injected version and date reach footer and both menus', () => {
    const h = harness({ sw: false });
    const expected = helpers.exports.formatBuild('0.3.2', '2026-10-30T14:05:00Z');
    assert.equal(h.builds.length, 3);
    for (const node of h.builds) assert.equal(node.textContent, expected);
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /<details id="home-menu">[\s\S]*?<p data-build>/);
    assert.match(html, /<small data-build><\/small><button data-force-update/);
});

test('claude.ai page stub without serviceWorker never displays an update banner', async () => {
    const h = harness({ sw: false }); await settle();
    h.click('force-home'); await settle();
    assert.equal(h.elements.get('#pwa-update').hidden, true);
    assert.ok(h.buttons.every(button => button.hidden));
    assert.equal(h.calls.updates, 0);
    assert.deepEqual(h.calls.fetches, []);
});
