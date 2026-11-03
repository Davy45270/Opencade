import { test, expect } from './fixture';
import { Finger } from './finger-stepped';
import { gourmandisesFinger } from './gourmandises-finger-driver';

for (const level of [0, 9]) test(`niveau ${String(level + 1)} : doigt bruité, deux touchers, outil et glisser`, async ({ page, isMobile }, info) => {
    test.skip(!isMobile, 'Parcours tactile');
    test.setTimeout(180000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        localStorage.setItem('arcade-lab:character:v1', 'panda');
        localStorage.setItem('arcade-lab:gourmandises:mode:v1', 'discovery');
        localStorage.removeItem('arcade-lab:gourmandises:run:v1');
    });
    await Finger.prepare(page);
    await page.goto('/?test=1#/gourmandises');
    await expect.poll(() => page.evaluate(() => Boolean(window.__GOURMANDISES_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page);
    try {
        const finger = await Finger.create(page, cdp);
        const resumeBox = await page.locator('#resume').boundingBox();
        await finger.press(['#resume']);
        await page.evaluate(index => window.__GOURMANDISES_TEST__?.loadLevel(index, 6), level);
        await page.screenshot({ path: `test-results/screenshots/gourmandises-finger-${String(level + 1)}-before.png` });
        const boxes = await page.evaluate(() => Object.fromEntries(['#resume', '#gourmandises-hammer', '#game canvas'].map(selector => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            if (!r) throw new Error(selector);
            return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }];
        })));
        if (resumeBox) boxes['#resume'] = resumeBox;
        await info.attach(`gourmandises-geometry-${String(level + 1)}.json`, { contentType: 'application/json', body: JSON.stringify(boxes) });
        try {
            const result = await gourmandisesFinger(page, finger);
            expect(finger.entries.filter(entry => entry.missed)).toEqual([]);
            await info.attach(`gourmandises-decisions-${String(level + 1)}.json`, { contentType: 'application/json', body: JSON.stringify(result, null, 2) });
            await page.screenshot({ path: `test-results/screenshots/gourmandises-finger-${String(level + 1)}-after.png` });
        } finally {
            await finger.release();
            await finger.attach(info, `gourmandises-stepped-${String(level + 1)}.json`);
        }
    } finally { await cdp.detach(); }
});
