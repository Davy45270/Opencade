import { expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { TREE_SPRITES, ambiance, drawnTrees, treeEssence, treePanel, treeTop } from '../src/games/derapage/tree-sprites';
import { circuits } from '../src/engines/derapage/circuits';
import { createTrack as buildTrack } from '../src/engines/derapage/track';

/** Width and height of a WebP with alpha (VP8X header). */
function webpSize(path: string): { w: number; h: number } {
    const b = readFileSync(path);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 12, 16)).toBe('VP8X');
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

test('Z44 David\'s trees: one WebP with alpha per sprite, the size of the table, 60 kB in all at most', () => {
    let bytes = 0;
    for (const [key, size] of Object.entries(TREE_SPRITES)) {
        const path = `src/games/derapage/trees/${key}.webp`;
        expect(webpSize(path)).toEqual(size);
        bytes += readFileSync(path).length;
    }
    expect(readdirSync('src/games/derapage/trees').sort()).toEqual(Object.keys(TREE_SPRITES).map(key => `${key}.webp`).sort());
    expect(bytes).toBeLessThan(60_000);
});

test('Z44 the essences follow the ambiance of the circuit', () => {
    const essences = (name: string) => {
        const level = circuits.findIndex(c => c.name === name);
        return [...ambiance(buildTrack(level))].sort();
    };
    expect(essences('Les Sept lacets')).toEqual(['palmier']);
    expect(essences('Le Serpent des joncs')).toEqual(['palmier']);
    expect(essences('La Descente en ruban')).toEqual(['sapin']);
    expect(essences('La Côte des Ardennes')).toEqual(['feuillu', 'sapin']);
    expect(essences('Le Grand détour')).toEqual(['cerisier', 'feuillu']);
    expect(essences('Feuilles Folles')).toEqual(['erable']);
    expect(essences('Bambou Express')).toEqual(['bambou']);
    expect(essences('Volcan Turbo')).toEqual([]);
    expect(essences('Autour des Invalides')).toEqual([]);
});

test('Z44 every drawn tree has a stable essence of its ambiance; firs stay firs; bamboo has no top view', () => {
    for (let level = 0; level < circuits.length; level++) {
        const t = buildTrack(level), list = ambiance(t);
        for (const tree of drawnTrees(t)) expect(list).toContain(tree.essence);
        // The essence depends on the position only: a new track of the same circuit gives the same forest.
        expect(drawnTrees(buildTrack(level)).map(tree => tree.essence)).toEqual(drawnTrees(t).map(tree => tree.essence));
    }
    const ardennes = buildTrack(circuits.findIndex(c => c.name === 'La Côte des Ardennes'));
    expect(treeEssence(ardennes, { x: 1, y: 2 }, 'fir')).toBe('sapin');
    expect(new Set(drawnTrees(ardennes).map(tree => tree.essence))).toEqual(new Set(['sapin', 'feuillu']));
    expect(treePanel('palmier', 80)).toBe('palmier_side');
    expect(treePanel('palmier', 30)).toBe('palmier_side_far');
    expect(treeTop('sapin')).toBe('sapin_top');
    expect(treeTop('bambou')).toBeNull();
});
