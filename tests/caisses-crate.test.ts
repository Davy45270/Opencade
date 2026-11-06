import { expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DRAWN_CRATE, crateTone, paintCrate, type CrateTone } from '../src/games/caisses/art';
import { Engine } from '../src/engines/caisses/engine';

/** Width and height of a WebP with alpha (VP8X header). */
function webpSize(path: string): { w: number; h: number } {
    const b = readFileSync(path);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 12, 16)).toBe('VP8X');
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

test('C-CAISSE David\'s crate from above: one WebP with alpha, the size of the table, 8 kB at most', () => {
    expect(readdirSync('src/games/caisses/crate')).toEqual(['caisse.webp']);
    expect(webpSize('src/games/caisses/crate/caisse.webp')).toEqual(DRAWN_CRATE);
    expect(readFileSync('src/games/caisses/crate/caisse.webp').length).toBeLessThan(8_000);
});

test('C-CAISSE the crate keeps its cue: wood, red for a red crate, green once home', () => {
    const paint = (tone: CrateTone): string[] => {
        const calls: string[] = [];
        const ctx = new Proxy({}, {
            get: (_target, name) => (...args: unknown[]) => { calls.push(`${String(name)}(${args.filter(a => typeof a !== 'object').join(',')})`); },
            set: (_target, name, value) => { calls.push(`${String(name)}=${String(value)}`); return true; },
        }) as unknown as CanvasRenderingContext2D;
        paintCrate(ctx, {} as CanvasImageSource, tone); return calls;
    };
    expect(paint('wood')).toContain(`drawImage(0,0,${String(DRAWN_CRATE.w)},${String(DRAWN_CRATE.h)})`);
    expect(paint('wood').some(c => c.startsWith('fillStyle='))).toBe(false);
    expect(paint('red')).toContain('fillStyle=rgba(210,40,32,.6)');
    expect(paint('home')).toContain('fillStyle=rgba(60,200,96,.55)');
    // Level 26 has a red crate, level 29 two crates already home: the tone follows the rules' colours.
    const e = new Engine();
    e.loadLevel(25, 28);
    expect(e.state.boxes.map((p, box) => crateTone(e.board, e.state, box, p)).sort()).toEqual(['red', 'wood']);
    e.loadLevel(28, 28);
    expect(e.state.boxes.map((p, box) => crateTone(e.board, e.state, box, p)).filter(t => t === 'home')).toHaveLength(2);
});

test('C-CAISSE-V the catalogue card shows David\'s crate once its image is there, the vector crate before', async () => {
    const { createThumbnail, useThumbnailCrate } = await import('../src/games/caisses/thumbnail');
    const { useSurfaces } = await import('../src/games/thumbnail-art');
    const { testSurfaces } = await import('./raster-context');
    const baked = (): string[] => {
        const keys: string[] = [];
        const context = new Proxy({}, { get: (_t, name) => (...args: unknown[]) => {
            const image = args[0] as { baked?: string } | undefined;
            if (name === 'drawImage' && typeof image?.baked === 'string' && image.baked.startsWith('caisses-crate')) keys.push(image.baked);
            return name === 'createLinearGradient' || name === 'createRadialGradient' ? { addColorStop: () => undefined } : undefined;
        }, set: () => true }) as unknown as CanvasRenderingContext2D;
        const thumbnail = createThumbnail(28); thumbnail.step(); thumbnail.draw(context);
        return keys;
    };
    useSurfaces(testSurfaces());
    try {
        useThumbnailCrate(null);
        const vector = baked();
        expect(vector.length).toBeGreaterThan(0);
        expect(vector.some(k => k.includes('-drawn-'))).toBe(false);
        useThumbnailCrate({} as CanvasImageSource);
        const drawn = baked();
        expect(drawn).toHaveLength(vector.length);
        expect(drawn.every(k => k.startsWith('caisses-crate-drawn-'))).toBe(true);
    } finally { useThumbnailCrate(null); useSurfaces(null); }
});
