import { test, expect } from './fixture';
import type {} from '../../src/games/ferraille/scene';

// Éditeur de relief de la préversion : toucher une case puis « Jouer » doit lancer Ferraille avec CE relief.
test('éditeur : une case touchée puis « Jouer » lance Ferraille avec le relief retouché', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Éditeur tactile : 390×844 seulement');
    await page.goto('/pilote.html?test=1');
    const toile = page.locator('#toile');
    await expect(toile).toBeVisible();
    // Case libre (non hachurée) : la première de la grille dont le masque « fixe » vaut ','.
    const cible = await page.evaluate(async () => {
        const niveaux = await (await fetch('./pilote-niveaux.json')).json() as { fixe: string[]; rows: string[] }[];
        const n = niveaux[0]; if (!n) throw new Error('aucun niveau');
        for (const [y, ligne] of n.fixe.entries()) for (const [x, f] of ligne.split('').entries())
            if (f === ',' && n.rows[y]?.[x] !== 'X') return { x, y, avant: n.rows };
        throw new Error('aucune case libre');
    });
    const r = await toile.boundingBox(); if (!r) throw new Error('grille absente');
    const c = r.height / cible.avant.length;
    await page.locator('.grille').evaluate((el, left) => { el.scrollLeft = left; }, Math.max(0, cible.x * c - 100));
    const r2 = await toile.boundingBox(); if (!r2) throw new Error('grille absente');
    await page.touchscreen.tap(r2.x + (cible.x + 0.5) * c, r2.y + (cible.y + 0.5) * c);
    const attendu = cible.avant.map((l, y) => y === cible.y ? l.slice(0, cible.x) + 'X' + l.slice(cible.x + 1) : l);
    const jouer = await page.locator('#jouer').boundingBox(); if (!jouer) throw new Error('« Jouer » absent');
    await page.touchscreen.tap(jouer.x + jouer.width / 2, jouer.y + jouer.height / 2);
    await page.waitForURL(/[?&]relief=/);
    await expect.poll(() => page.evaluate(() => window.__FERRAILLE_TEST__?.pilote())).toEqual(expect.objectContaining({ rows: attendu }));
    expect(await page.evaluate(() => window.__FERRAILLE_TEST__?.pilote()?.nom)).toContain('(retouché)');
});
