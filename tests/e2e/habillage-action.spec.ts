import { test, expect } from './fixture';
import { ids } from '../../src/characters/model';
import { levelCatalogue } from '../../src/content/level-catalogue';
import type {} from '../../src/games/ferraille/scene';
import type {} from '../../src/games/briqueterie/scene';
import type {} from '../../src/games/essaim/scene';

for (const [index, id] of ids.entries()) {
    for (const game of ['ferraille', 'briqueterie', 'essaim'] as const) test(`habillage-${game}-${id}`, async ({ page }, info) => {
        test.setTimeout(15_000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(id => {
            localStorage.setItem('arcade-lab:character:v1', id);
            localStorage.setItem('arcade-lab:sound:v1', 'off');
        }, id);
        await page.goto(`/?test=1#/${game}`);
        await expect(page.locator('#resume')).toBeVisible();
        await page.evaluate(({ game, index }) => {
            if (game === 'ferraille') {
                const h = window.__FERRAILLE_TEST__; h?.loadLevel(13, 28); h?.scenario('showcase'); h?.inspect({ weapon: 'grenade', ammo: 12 });
            } else if (game === 'briqueterie') {
                const h = window.__BRIQUETERIE_TEST__; h?.loadLevel(index * 6, 28); h?.power('wide');
            } else window.__ESSAIM_TEST__?.weapon(index % 2 ? 'bounce' : 'drones');
        }, { game, index });
        await page.locator('#resume').click();
        await page.keyboard.down(game === 'ferraille' ? 'KeyX' : 'Space');
        await page.evaluate(game => {
            if (game === 'ferraille') window.__FERRAILLE_TEST__?.advance(150);
            else if (game === 'briqueterie') window.__BRIQUETERIE_TEST__?.advance(900);
            else window.__ESSAIM_TEST__?.advance(150);
        }, game);
        await page.keyboard.up(game === 'ferraille' ? 'KeyX' : 'Space');
        const art = await page.evaluate(game => game === 'ferraille' ? window.__FERRAILLE_TEST__?.art() : game === 'briqueterie' ? window.__BRIQUETERIE_TEST__?.art() : window.__ESSAIM_TEST__?.art().livery, game);
        expect(art?.character).toBe(id); expect(art?.used).toBeGreaterThan(1);
        expect(art?.used).toBeLessThanOrEqual(art?.capacity ?? 0);
        const state = await page.evaluate(game => {
            if (game === 'ferraille') { const s = window.__FERRAILLE_TEST__?.read(); return { playing: s?.status, effect: s?.shots.some(p => p.friendly) }; }
            if (game === 'briqueterie') { const s = window.__BRIQUETERIE_TEST__?.read(); return { playing: s?.status, effect: (s?.wideUntil ?? 0) > 0 }; }
            const s = window.__ESSAIM_TEST__?.read(); return { playing: s?.status, effect: s?.shots.some(p => p.owner === 'player') };
        }, game);
        expect(state.playing).toBe('playing'); expect(state.effect).toBe(true);
        await page.locator('#game canvas').screenshot({ path: info.outputPath(`habillage-${game}-${id}.png`) });
    });
}

// Only the three action games are driven here; other catalogue games (Kart, ...) have their own specs.
for (const entry of levelCatalogue.filter(e => e.game === 'ferraille' || e.game === 'briqueterie' || e.game === 'essaim')) test(`level-catalogue-${entry.code}`, async ({ page }, info) => {
    // The first visit of a theme bakes its scenery textures once (software rendering on the test host).
    test.setTimeout(30_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(game => {
        localStorage.setItem('arcade-lab:character:v1', game === 'essaim' ? 'licorne' : game === 'ferraille' ? 'pandaroux' : 'panda');
        localStorage.setItem('arcade-lab:sound:v1', 'off');
    }, entry.game);
    await page.goto(`/?test=1#/${entry.game}`);
    await expect(page.locator('#resume')).toBeVisible();
    await page.evaluate(({ game, index, code }) => {
        if (game === 'ferraille') { const h = window.__FERRAILLE_TEST__; h?.loadLevel(index, 28); h?.scenario('showcase'); h?.inspect({ heroX: code === 'R02' ? 420 : code === 'R03' ? 440 : 300, weapon: 'flame', ammo: 180 }); }
        else if (game === 'briqueterie') window.__BRIQUETERIE_TEST__?.loadLevel(index, 28);
        else { const h = window.__ESSAIM_TEST__; h?.loadLevel(index, 28); if (code === 'G03') h?.lastWave(); }
    }, entry);
    await page.locator('#resume').click();
    await page.keyboard.down(entry.game === 'ferraille' ? 'KeyX' : 'Space');
    await page.evaluate(game => {
        if (game === 'ferraille') window.__FERRAILLE_TEST__?.advance(200);
        else if (game === 'briqueterie') window.__BRIQUETERIE_TEST__?.advance(200);
        else window.__ESSAIM_TEST__?.advance(1600);
    }, entry.game);
    await page.keyboard.up(entry.game === 'ferraille' ? 'KeyX' : 'Space');
    const level = await page.evaluate(game => (game === 'ferraille' ? window.__FERRAILLE_TEST__?.read() : game === 'briqueterie' ? window.__BRIQUETERIE_TEST__?.read() : window.__ESSAIM_TEST__?.read())?.level, entry.game);
    expect(level).toBe(entry.index);
    if (entry.game === 'ferraille') {
        const bake = await page.evaluate(() => window.__FERRAILLE_TEST__?.bake());
        await info.attach(`bake-${entry.code}.json`, { body: JSON.stringify({ ...bake, userAgent: await page.evaluate(() => navigator.userAgent) }), contentType: 'application/json' });
    }
    const status = await page.evaluate(game => (game === 'ferraille' ? window.__FERRAILLE_TEST__?.read() : game === 'briqueterie' ? window.__BRIQUETERIE_TEST__?.read() : window.__ESSAIM_TEST__?.read())?.status, entry.game);
    expect(status).toBe('playing');
    if (entry.code === 'G03') expect(await page.evaluate(() => window.__ESSAIM_TEST__?.read().boss?.hp)).toBeGreaterThan(0);
    await page.locator('#game canvas').screenshot({ path: info.outputPath(`level-catalogue-${entry.code}.png`) });
});

for (const id of ids) test(`habillage-ferraille-${id}-vehicule`, async ({ page }, info) => {
    test.setTimeout(15_000);
    await page.addInitScript(id => { localStorage.setItem('arcade-lab:character:v1', id); }, id);
    await page.goto('/?test=1#/ferraille');
    await expect(page.locator('#resume')).toBeVisible();
    await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(11, 28); h?.scenario('showcase'); h?.inspect({ weapon: 'bounce', ammo: 36 }); });
    await page.locator('#resume').click(); await page.keyboard.down('KeyX');
    await page.evaluate(() => window.__FERRAILLE_TEST__?.advance(150)); await page.keyboard.up('KeyX');
    expect(await page.evaluate(() => window.__FERRAILLE_TEST__?.read().vehicle)).toBe(true);
    expect(await page.evaluate(() => window.__FERRAILLE_TEST__?.art().visible.some(k => k.includes('vehicles')))).toBe(true);
    await page.locator('#game canvas').screenshot({ path: info.outputPath(`habillage-ferraille-${id}-vehicule.png`) });
});
