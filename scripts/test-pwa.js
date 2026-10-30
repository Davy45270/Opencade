/* global URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { harness, settle } from './pwa-harness.js';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const helpers = { exports: {} };
runInNewContext(ts.transpile(readFileSync(new URL('../src/shell/pwa-utils.ts', import.meta.url), 'utf8'), { module: ts.ModuleKind.CommonJS }), helpers);

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
