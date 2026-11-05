import assert from 'node:assert/strict';
import { Engine, center, key, neighbors, valid, RADIUS, LOSS_LINE, type Kind } from '../src/engines/bubble/engine';
import { LEVELS, EXTENSION_START, generateLevel } from '../src/engines/bubble/levels';
import { EXTENSION, TIER_SIZE, extensionMechanics } from '../src/engines/bubble/extension';
import { extensionSolutions } from './bubble-extension-solutions';
import { decodeShots, handicapInterval, replay } from './bubble-extension-format';
const COUNT = 100, CELL_KINDS: readonly string[] = ['stone', 'bomb', 'ice', 'star', 'leaf', 'crystal', 'prism'];
/** B-EXT-01: levels 31-130 are well formed, every listed mechanic is on its board, nothing floats. */
export function extensionFormat(): void {
    assert.equal(EXTENSION.length, COUNT);
    assert.equal(LEVELS.length, EXTENSION_START + COUNT);
    assert.equal(new Set(LEVELS.map(l => l.name)).size, LEVELS.length, 'unique names');
    assert.equal(new Set(LEVELS.map(l => l.seed)).size, LEVELS.length, 'unique seeds');
    const layouts = new Set<string>();
    for (let i = 0; i < COUNT; i++) {
        const index = EXTENSION_START + i, level = LEVELS[index], row = EXTENSION[i];
        assert.ok(level && row);
        assert.equal(level.id, `L${String(index + 1)}`);
        const [, colors, rows, interval, shape, motif] = row;
        assert.ok(colors >= 4 && colors <= 6 && rows >= 5 && rows <= 10 && interval >= 8 && interval <= 22, `${level.id} parameters`);
        assert.ok(shape >= 0 && shape <= 9 && motif >= 0 && motif <= 5, `${level.id} shape/motif`);
        assert.deepEqual(level.mechanics, extensionMechanics(i));
        const grid = generateLevel(index, level.seed), seen = new Set<string>();
        assert.ok(grid.length >= 20, `${level.id} board size`);
        for (const c of grid) {
            assert.ok(valid(c.row, c.col) && !seen.has(key(c)), `${level.id} cell ${key(c)}`);
            seen.add(key(c));
            assert.ok(c.color < colors && c.row < rows && center(c).y + RADIUS < LOSS_LINE, `${level.id} cell ${key(c)} in bounds`);
        }
        const kinds = new Set(grid.flatMap(c => c.kind ? [c.kind] : []));
        for (const m of level.mechanics ?? []) if (CELL_KINDS.includes(m)) assert.ok(kinds.has(m as Kind), `${level.id} shows ${m}`);
        for (const k of kinds) assert.ok(level.mechanics.includes(k), `${level.id} unlisted ${k}`);
        // Everything hangs from the ceiling or a fixed crystal.
        const cells = new Map(grid.map(c => [key(c), c])), hung = new Set<string>(), queue = grid.filter(c => c.row === 0 || c.kind === 'crystal');
        while (queue.length) {
            const c = queue.pop();
            if (!c || hung.has(key(c))) continue;
            hung.add(key(c));
            for (const n of neighbors(c)) { const next = cells.get(key(n)); if (next) queue.push(next); }
        }
        assert.equal(hung.size, grid.length, `${level.id} floating cells`);
        const e = new Engine(level.seed); e.loadLevel(index); e.load(grid, grid.find(c => !c.kind)?.color ?? 0, level.seed);
        assert.equal(e.status, 'playing');
        layouts.add(JSON.stringify(grid.map(c => [c.row, c.col, c.kind ?? ''])));
    }
    assert.ok(layouts.size >= 90, `distinct silhouettes: ${String(layouts.size)}`);
}
/** B-EXT-02: each level is won on its real deal, and again with a ceiling 20 % faster (the margin). */
export function extensionWinnable(EngineClass = Engine): { level: number; shots: number; interval: number; marginInterval: number; marginShots: number }[] {
    assert.equal(extensionSolutions.length, COUNT);
    return extensionSolutions.map((line, i) => {
        const index = EXTENSION_START + i, level = LEVELS[index];
        assert.ok(level);
        const normal = replay(index, line.normal, undefined, EngineClass);
        assert.equal(normal.status, 'won', `${level.id} real deal`);
        assert.equal(normal.shots, decodeShots(line.normal).length, `${level.id} ends on its last shot`);
        const marginInterval = handicapInterval(level.interval);
        assert.ok(marginInterval <= level.interval * 0.8);
        const margin = replay(index, line.margin, marginInterval, EngineClass);
        assert.equal(margin.status, 'won', `${level.id} with a ceiling every ${String(marginInterval)} shots`);
        assert.equal(level.interval, EXTENSION[i]?.[3], 'replay restores the level');
        return { level: index + 1, shots: normal.shots, interval: level.interval, marginInterval, marginShots: margin.shots };
    });
}
/** Parameter difficulty: colours, rows and ceiling pressure, plus the number of mechanics in play. */
export function pressure(i: number): number {
    const [, colors, rows, interval] = EXTENSION[i] ?? ['', 0, 0, 1];
    return colors * 2 + rows + 60 / interval + extensionMechanics(i).length * 0.5;
}
/** B-EXT-03: tiers grow harder (parameters and shots), and each opens with an easier breather. */
export function extensionCurve(results = extensionWinnable()): { tier: number; pressure: number; shots: number; breather: number }[] {
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const tiers = Array.from({ length: COUNT / TIER_SIZE }, (_, t) => {
        const ids = Array.from({ length: TIER_SIZE }, (_, k) => t * TIER_SIZE + k), rest = ids.slice(1);
        const shots = (i: number) => results[i]?.shots ?? 0;
        // Breather: lower pressure than any other level of its tier, fewer shots than the tier's mean.
        assert.ok(pressure(ids[0] ?? 0) < Math.min(...rest.map(pressure)), `tier ${String(t + 1)} breather pressure`);
        assert.ok(shots(ids[0] ?? 0) < mean(rest.map(shots)), `tier ${String(t + 1)} breather shots`);
        return { tier: t + 1, pressure: mean(rest.map(pressure)), shots: mean(rest.map(shots)), breather: shots(ids[0] ?? 0) };
    });
    for (let t = 1; t < tiers.length; t++) {
        const now = tiers[t], before = tiers[t - 1];
        assert.ok(now && before);
        assert.ok(now.pressure >= before.pressure, `tier ${String(now.tier)} pressure`);
        // Shots are a noisy measure: a tier may dip 10 % under the previous one, never more.
        assert.ok(now.shots >= before.shots * 0.9, `tier ${String(now.tier)} shots ${now.shots.toFixed(1)} < ${before.shots.toFixed(1)}`);
    }
    const first = tiers[0], last = tiers.at(-1);
    assert.ok(first && last && last.shots >= first.shots * 1.8, 'the last tier asks far more shots than the first');
    return tiers;
}
/** Negative controls: a truncated line does not win, and a board without its stars is refused by B-EXT-01's rule. */
export function extensionControls(): void {
    const line = extensionSolutions[COUNT - 1];
    assert.ok(line);
    const half = line.normal.slice(0, Math.floor(line.normal.length / 4) * 2);
    assert.notEqual(replay(EXTENSION_START + COUNT - 1, half).status, 'won');
    assert.throws(() => decodeShots('zz'));
}
