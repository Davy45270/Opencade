import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { test, expect } from './fixture';
import { Finger } from './finger-stepped';

// Read the registry without importing scene modules (and Phaser) in Node.
// Games with their own site (src/games/<id>/definition.ts) are read from their definition, after the catalogue's.
const gamesDir = new URL('../../src/games/', import.meta.url);
const sites = readdirSync(gamesDir).filter(id => existsSync(new URL(`${id}/definition.ts`, gamesDir))).map(id => readFileSync(new URL(`${id}/definition.ts`, gamesDir), 'utf8'));
const catalogue = readFileSync(new URL('../../src/games/registry.ts', import.meta.url), 'utf8');
const registry = [catalogue.slice(catalogue.indexOf('export const games:')), ...sites].join('\n');
const ids = [...registry.matchAll(/\bid: '([^']+)'/g)].map(([, id]) => {
    if (!id) throw new Error('Identifiant de jeu absent');
    return id;
});
if (!ids.length) throw new Error('Registre vide');
const edges = ['left', 'right', 'top', 'bottom'] as const;
// A game may declare no touch control at all (Collier: aim anywhere, touch the shooter to swap).
const noControls = (id: string): boolean => {
    const entry = registry.split('\n').find(line => line.includes(`id: '${id}'`)) ?? '';
    const name = /touchControls: (\w+)/.exec(entry)?.[1];
    if (!name) return false;
    const scene = readFileSync(new URL(`../../src/games/${id}/scene.ts`, import.meta.url), 'utf8');
    return new RegExp(`export const ${name}: readonly TouchButton\\[\\] = \\[\\];`).test(scene);
};
const selector = '#touch-controls button, #touch-controls [role="button"]';

for (const id of ids) test(`bord tactile ${id} : quatre bords de chaque commande`, async ({ page, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'Sonde CDP Chromium');
    test.setTimeout(120000); // Startup safety net, never an assertion oracle.
    await page.setViewportSize({ width: 390, height: 844 });
    await Finger.prepare(page);
    await page.goto(`/?test=1#/${id}`);
    // Only startup waits for the hook; no rendering waits inside the probe.
    await page.waitForFunction(id => Boolean(window.__ARCADE_TEST__?.games[id]), id);
    const cdp = await page.context().newCDPSession(page);
    const evidence: unknown[] = [];
    const skipped: unknown[] = [];
    let touches = 0;
    let budget = 0;
    try {
        await Finger.create(page, cdp); // advance(0), then freeze browser timers too.
        const count = await page.locator(selector).count();
        if (noControls(id)) { expect(count, 'Aucune commande déclarée, aucune affichée').toBe(0); return; }
        expect(count, 'Commandes présentes').toBeGreaterThan(0);
        // One optional resume and one edge touch per sample; no level search/retry.
        budget = 2 * edges.length * count;
        test.setTimeout(120000 + 15000 * budget);
        const tap = async <T>(x: number, y: number, read: () => Promise<T>): Promise<T> => {
            if (touches >= budget) throw new Error('Budget de touchers épuisé');
            touches++;
            // Set before sending: a rejected packet may already have reached CDP.
            let active = true;
            try {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
                const result = await read();
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                active = false;
                return result;
            } finally {
                // Never send an unconditional end, nor continue after failed cleanup.
                if (active) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
            }
        };
        for (let index = 0; index < count; index++) for (const edge of edges) {
            // Reset only between complete gestures. No simulation or frame advances.
            await page.evaluate(id => {
                const hook = window.__ARCADE_TEST__?.games[id];
                if (!hook) throw new Error('Crochet absent');
                hook.loadLevel(0);
                (hook as typeof hook & { advance(ms: number): void }).advance(0);
            }, id);
            const resume = await page.evaluate(() => {
                const button = document.querySelector<HTMLElement>('#resume');
                if (!button || !button.checkVisibility()) return null;
                const r = button.getBoundingClientRect();
                return r.width > 0 && r.height > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
            });
            if (resume) await tap(resume.x, resume.y, () => page.evaluate(id => {
                const hook = window.__ARCADE_TEST__?.games[id];
                if (!hook) throw new Error('Crochet absent après reprise');
                return hook.fingerReceipts();
            }, id));
            // Snapshot the live DOM after reset, without locator auto-waits.
            const point = await page.evaluate(({ selector, index, edge, id }) => {
                const button = document.querySelectorAll<HTMLElement>(selector)[index];
                if (!button) throw new Error(`Commande disparue : ${String(index)}`);
                const r = button.getBoundingClientRect();
                const name = button.id || button.className || `control-${String(index)}`;
                const reason = r.width <= 0 || r.height <= 0 ? 'zero-size'
                    : !button.checkVisibility({ visibilityProperty: true, opacityProperty: true }) ? 'hidden'
                    : button.matches(':disabled, [aria-disabled="true"]') ? 'disabled' : null;
                // Remain inside even a control smaller than four CSS pixels.
                const x = edge === 'left' ? r.left + Math.min(2, r.width / 2) : edge === 'right' ? r.right - Math.min(2, r.width / 2) : r.left + r.width / 2;
                const y = edge === 'top' ? r.top + Math.min(2, r.height / 2) : edge === 'bottom' ? r.bottom - Math.min(2, r.height / 2) : r.top + r.height / 2;
                const hook = window.__ARCADE_TEST__?.games[id];
                if (!hook) throw new Error('Crochet absent');
                return { x, y, name, reason, hit: button.contains(document.elementFromPoint(x, y)), sequence: hook.fingerReceipts().sequence };
            }, { selector, index, edge, id });
            if (point.reason) { skipped.push({ index, edge, ...point }); continue; }
            await tap(point.x, point.y, async () => {
                const received = await page.evaluate(({ id, selector, index, sequence }) => {
                    const hook = window.__ARCADE_TEST__?.games[id];
                    if (!hook) throw new Error('Crochet absent pendant le toucher');
                    const receipt = hook.fingerReceipts().events.at(-1);
                    const button = document.querySelectorAll(selector)[index];
                    const target = receipt?.target;
                    return { receipt, fresh: Boolean(receipt && receipt.sequence > sequence),
                        targetHit: Boolean(button && target && [button, ...button.querySelectorAll('*')].some(element => element.matches(target))) };
                }, { id, selector, index, sequence: point.sequence });
                evidence.push({ index, edge, ...point, ...received });
                const label = `${id} ${point.name} ${edge}`;
                expect(point.hit, `${label} elementFromPoint`).toBe(true);
                expect(received.fresh, `${label} nouveau reçu`).toBe(true);
                expect(received.receipt?.type, `${label} pointerdown`).toBe('pointerdown');
                expect(received.targetHit, `${label} cible du reçu`).toBe(true);
                expect(Math.abs((received.receipt?.x ?? Infinity) - point.x), `${label} x`).toBeLessThan(1);
                expect(Math.abs((received.receipt?.y ?? Infinity) - point.y), `${label} y`).toBeLessThan(1);
            });
        }
    } finally {
        try {
            await info.attach('touch-edges.json', { contentType: 'application/json', body: JSON.stringify({ id, clock: 'manual', level: 0, budget, touches, evidence, skipped }, null, 2) });
        } finally { await cdp.detach(); }
    }
});
