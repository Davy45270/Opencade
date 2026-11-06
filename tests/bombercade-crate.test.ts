import { expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DRAWN_CRATE, drawnCrate } from '../src/games/bombercade/art';
import type { Block } from '../src/engines/bombercade/engine';

/** Width and height of a WebP with alpha (VP8X header). */
function webpSize(path: string): { w: number; h: number } {
    const b = readFileSync(path);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 12, 16)).toBe('VP8X');
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}
/** A 2D context that records what is drawn. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: string[] } {
    const calls: string[] = [];
    const ctx = new Proxy({}, {
        get: (_target, name) => (...args: unknown[]) => { calls.push(`${String(name)}(${args.filter(a => typeof a !== 'object').join(',')})`); },
        set: (_target, name, value) => { calls.push(`${String(name)}=${String(value)}`); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
}

test('B-CAISSE David\'s crate with its "?": one WebP with alpha, the size of the table, 6 kB at most', () => {
    expect(readdirSync('src/games/bombercade/crate')).toEqual(['caisse.webp']);
    expect(webpSize('src/games/bombercade/crate/caisse.webp')).toEqual(DRAWN_CRATE);
    expect(readFileSync('src/games/bombercade/crate/caisse.webp').length).toBeLessThan(6_000);
});

test('B-CAISSE every block kind keeps its cue on David\'s crate (rules unchanged, only the drawing)', () => {
    const draw = (block: Block): string[] => { const { ctx, calls } = recorder(); drawnCrate(ctx, {} as CanvasImageSource, block); return calls; };
    const normal = draw({ at: 0, hp: 1, kind: 'normal' });
    // The drawing on the vector crate's footprint, its shadow under it, no tint, no band, no star.
    expect(normal).toContain('drawImage(2,2,26,24)');
    expect(normal).toContain('globalCompositeOperation=destination-over');
    expect(normal.some(c => c.startsWith('fillStyle=rgba(160') || c.startsWith('fillStyle=rgba(255,208'))).toBe(false);
    expect(normal).not.toContain('strokeStyle=#647080');
    expect(draw({ at: 0, hp: 1, kind: 'ice' })).toContain('fillStyle=rgba(160,232,255,.55)');
    const gold = draw({ at: 0, hp: 1, kind: 'gold' });
    expect(gold).toContain('fillStyle=rgba(255,208,64,.5)');
    expect(gold).toContain('fillStyle=#fffaac');
    const strong = draw({ at: 0, hp: 2, kind: 'reinforced' }), cracked = draw({ at: 0, hp: 1, kind: 'reinforced' });
    expect(strong).toContain('strokeStyle=#647080'); expect(strong).toContain('lineWidth=4');
    expect(cracked).toContain('lineWidth=2');
});
