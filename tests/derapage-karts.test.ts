import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { KART_SPRITES, KART_VIEWS, kartSprite, kartView } from '../src/games/derapage/kart-sprites';

const q = Math.PI / 4;

test('Z40 the drawn kart view follows the heading relative to the camera, 8 sectors of 45°', () => {
    // Relative heading 0 = the kart drives away from the camera; +π/2 = it drives to screen right, its right side faces us.
    const expected: [number, string][] = [[0, 'back'], [q, 'backRight'], [2 * q, 'right'], [3 * q, 'frontRight'], [4 * q, 'front'],
        [-3 * q, 'frontLeft'], [-2 * q, 'left'], [-q, 'backLeft'], [-4 * q, 'front']];
    for (const [angle, view] of expected) {
        expect(kartView(angle)).toBe(view);
        // Any whole turn gives the same view, and each sector spans ±22.5° around its centre.
        expect(kartView(angle + 2 * Math.PI)).toBe(view);
        expect(kartView(angle - 4 * Math.PI)).toBe(view);
        expect(kartView(angle + q * .45)).toBe(view);
        expect(kartView(angle - q * .45)).toBe(view);
    }
    expect(kartView(q * .55)).toBe('backRight');
});

test('Z41 the five mascots (Boubou, CaliRoux, Pestouille, Lumi, Tutu) have the 8 views and the top view; a kart without a mascot keeps the vector kart', () => {
    for (const id of ['panda', 'pandaroux', 'dragon', 'licorne', 'singe'] as const) {
        for (const view of [...KART_VIEWS, 'top'] as const) {
            const key = kartSprite(id, view);
            expect(key).toBe(`${id}_${view}`);
            const s = key && KART_SPRITES[key];
            expect(s).toBeDefined();
            expect(existsSync(`src/games/derapage/karts/${String(key)}.webp`)).toBe(true);
            // One scale: every view has the same height; side views stand on the ground, the top view turns about its centre.
            expect(s?.h).toBe(84);
            if (view === 'top') { expect(s?.ox).toBe(.5); expect(s?.oy).toBe(.5); expect(s?.w).toBeLessThan(s?.h ?? 0); }
            else { expect(s?.oy).toBe(1); expect(s?.ox).toBeGreaterThan(.4); expect(s?.ox).toBeLessThan(.6); }
        }
        // A profile is longer than the back view is wide.
        expect(KART_SPRITES[`${id}_right`].w).toBeGreaterThan(KART_SPRITES[`${id}_back`].w * 1.2);
    }
    expect(kartSprite(undefined, 'back')).toBeUndefined();
});
