/* global document, console */
import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { Finger } from '../tests/e2e/finger-stepped.ts';
import { gourmandisesFinger } from '../tests/e2e/gourmandises-finger-driver.ts';
import { fingerReceipts } from '../src/games/finger-receipts.ts';

/** Real scene rules and feedback; only DOM geometry and CDP transport are adapted. */
export async function fingerReplay(module, level, boxes = {
    '#resume': { x: 120, y: 200, width: 150, height: 56 },
    '#gourmandises-hammer': { x: 80, y: 760, width: 56, height: 56 },
    '#game canvas': { x: 15, y: 60, width: 360, height: 640 },
}) {
    const globals = ['window', 'document', 'location'];
    const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    const define = (key, value) => Object.defineProperty(globalThis, key, { configurable: true, value });
    const listeners = new Map();
    let selector = '#resume', active = [], report;
    define('location', { search: '?test=1' });
    define('window', {});
    define('document', {
        querySelector: target => boxes[target] ? { getBoundingClientRect: () => boxes[target] } : null,
        elementFromPoint: (x, y) => ({ closest: target => {
            const b = boxes[target];
            return b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
        } }),
    });
    try {
        const scene = new module.GourmandisesScene();
        scene.draw = () => {};
        scene.sync = () => {};
        const receipts = fingerReceipts({ on: (_target, type, listener) => listeners.set(type, listener) });
        const hook = scene.testHook(receipts);
        define('window', { __GOURMANDISES_TEST__: hook, __ARCADE_TEST__: { current: () => 'gourmandises', games: { gourmandises: hook } } });
        const page = {
            clock: { install: async () => {}, pauseAt: async () => {}, runFor: async () => { scene.update(0, 17); } },
            evaluate: async (fn, arg) => fn(arg),
            locator: target => ({ boundingBox: async () => boxes[target] }),
        };
        const cdp = { send: async (_method, packet) => {
            const points = packet.type === 'touchEnd' ? active : packet.touchPoints;
            const type = packet.type === 'touchStart' ? 'pointerdown' : packet.type === 'touchMove' ? 'pointermove' : 'pointerup';
            for (const intended of points) {
                // Chromium stores dispatched touch positions as FloatPoint (CSS pixels).
                const p = { x: Math.fround(intended.x), y: Math.fround(intended.y) };
                listeners.get(type)({ pointerType: 'touch', clientX: p.x, clientY: p.y });
                if (packet.type === 'touchStart') {
                    selector = scene.ready ? '#resume' : document.elementFromPoint(p.x, p.y).closest('#gourmandises-hammer') ? '#gourmandises-hammer' : '#game canvas';
                    if (selector === '#gourmandises-hammer') { scene.tool = 'hammer'; scene.selected = -1; scene.animation = 0; }
                }
                if (selector === '#game canvas') {
                    const b = boxes[selector], x = (p.x - b.x) * 360 / b.width, y = (p.y - b.y) * 640 / b.height;
                    if (type === 'pointerdown') scene.pointerDown(x, y);
                    if (type === 'pointerup') scene.pointerUp(x, y);
                }
                if (selector === '#resume' && type === 'pointerup') scene.ready = false;
            }
            active = packet.touchPoints;
        } };
        await Finger.prepare(page);
        const finger = await Finger.create(page, cdp);
        await finger.press(['#resume']);
        hook.loadLevel(level, 6);
        const decisions = await gourmandisesFinger(page, finger);
        await finger.attach({ attach: async (_name, options) => { report = JSON.parse(options.body); } });
        assert.equal(report.misses, 0);
        assert.equal(report.outcome, 'won');
        return { decisions, report };
    } finally {
        globals.forEach((key, i) => previous[i] ? Object.defineProperty(globalThis, key, previous[i]) : Reflect.deleteProperty(globalThis, key));
    }
}

export async function checkFingerReplay(module) {
    // Same decisions and engine fingerprints; event receipts no longer enter the report hash.
    const expected = [750437986, 535026349];
    for (const [i, level] of [0, 9].entries()) {
        const a = await fingerReplay(module, level), b = await fingerReplay(module, level);
        assert.deepEqual(a, b, 'Même pilote, même horloge, même bruit');
        assert.equal(a.report.fingerprint, expected[i]);
        console.log(`Gourmandises doigt niveau ${level + 1}: ${a.report.fingerprint}, moteur ${a.decisions.engineFingerprint}`);
    }
    // Optional browser evidence: geometry JSON and unmodified Finger.attach JSON.
    const args = process.argv.slice(2);
    if (args.length === 3) {
        const [level, geometry, attachment] = args;
        const actual = JSON.parse(readFileSync(attachment, 'utf8'));
        const replay = await fingerReplay(module, Number(level) - 1, JSON.parse(readFileSync(geometry, 'utf8')));
        assert.deepEqual(replay.report, actual, 'Rejeu Node identique au JSON CDP, empreinte comprise');
    }
}
