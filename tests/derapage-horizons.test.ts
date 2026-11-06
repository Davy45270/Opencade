import { expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { HORIZONS, HORIZON_FILE, HORIZON_TURN, HORIZON_WIDTH, SKY, horizonLeft, horizonOf } from '../src/games/derapage/horizon-sprites';
import { circuits } from '../src/engines/derapage/circuits';
import { createTrack as buildTrack } from '../src/engines/derapage/track';

/** Width and height of an opaque lossy WebP (VP8 key frame header). */
function webpSize(path: string): { w: number; h: number } {
    const b = readFileSync(path);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 8, 16)).toBe('WEBPVP8 ');
    expect([b[23], b[24], b[25]]).toEqual([0x9d, 0x01, 0x2a]);
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

test('Z45 David\'s horizons: one opaque WebP per cup, 1024×128, 520 kB in all at most', () => {
    let bytes = 0;
    for (const key of HORIZONS) {
        const path = `src/games/derapage/horizons/${key}.webp`;
        expect(webpSize(path)).toEqual(HORIZON_FILE);
        bytes += readFileSync(path).length;
    }
    expect(readdirSync('src/games/derapage/horizons').sort()).toEqual(HORIZONS.map(key => `${key}.webp`).sort());
    expect(bytes).toBeLessThan(520_000);
});

test('Z45 one horizon per cup; every horizon is used', () => {
    // Circuit index -> horizon: one circuit of each cup, and the three kart circuits.
    const cases: [number, string][] = [[1, 'urbaine'], [5, 'rapide'], [8, 'technique'], [12, 'ovales'], [16, 'nature'], [20, 'quais'], [24, 'falaises'], [28, 'slalom'], [17, 'bambou'], [19, 'feuilles'], [26, 'volcan']];
    for (const [level, key] of cases) expect([level, horizonOf(buildTrack(level))]).toEqual([level, key]);
    expect(new Set(circuits.map((_, i) => horizonOf(buildTrack(i))))).toEqual(new Set(HORIZONS));
});

test('Z45 the horizon fills the sky band and scrolls two copies per camera turn', () => {
    expect(SKY).toEqual({ top: 96, height: 116 });
    expect(HORIZON_WIDTH).toBe(928);
    expect(HORIZON_TURN).toBe(2 * HORIZON_WIDTH);
    for (let a = -7; a < 7; a += .37) {
        const x = horizonLeft(a);
        expect(x).toBeLessThanOrEqual(0);
        expect(x).toBeGreaterThan(-HORIZON_WIDTH);
        expect(horizonLeft(a + 2 * Math.PI)).toBeCloseTo(x, 6);
    }
    expect(horizonLeft(0) - horizonLeft(.1)).toBeCloseTo(.1 * HORIZON_TURN / (2 * Math.PI), 6);
});
