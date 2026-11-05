import { expect, test } from 'vitest';
import { KINDS } from '../src/engines/bubble/engine';
import { SPECIALS, SPECIAL, SpecialTips, TIP_KEY, cellSpecial, drawGlyph, type Prim } from '../src/games/bubble/specials';
const INK = 0x10161f, WHITE = 0xffffff;
// Colour-blind view of a glyph: its geometry only, every colour removed.
const geometry = (glyph: readonly Prim[]): string => JSON.stringify(glyph.map(p => Object.fromEntries(Object.entries(p).filter(([k]) => !['fill', 'stroke', 'fillAlpha'].includes(k)))));
test('B-SPE-01 chaque bille spéciale du moteur a un symbole, un nom et une ligne d’aide', () => {
    for (const kind of KINDS) {
        const ids = kind === 'ice' ? [cellSpecial({ kind, ice: 2 }), cellSpecial({ kind, ice: 1 }), cellSpecial({ kind, ice: 1 }, 'P02')] : [cellSpecial({ kind })];
        for (const id of ids) {
            expect(id, kind).not.toBeNull();
            if (id) expect(SPECIAL[id].glyph.length, id).toBeGreaterThan(0);
        }
    }
    expect([cellSpecial({ kind: 'ice', ice: 2 }), cellSpecial({ kind: 'ice', ice: 1 }), cellSpecial({ kind: 'ice', ice: 1 }, 'P02')]).toEqual(['ice2', 'ice1', 'lock']);
    expect(cellSpecial({})).toBeNull();
    for (const id of ['rainbow', 'bumper'] as const) expect(SPECIAL[id].glyph.length).toBeGreaterThan(0);
    for (const s of SPECIALS) {
        // One line on a 390 px phone (tip and legend).
        expect(s.line, s.id).not.toMatch(/\n/); expect(s.line.length, s.id).toBeLessThanOrEqual(40);
        expect(s.shape.length, s.id).toBeGreaterThan(3);
    }
    expect(new Set(SPECIALS.map(s => s.id)).size).toBe(SPECIALS.length);
});
test('B-SPE-02 sans la couleur, chaque symbole reste distinct et cerné de noir ou de blanc', () => {
    expect(new Set(SPECIALS.map(s => geometry(s.glyph))).size).toBe(SPECIALS.length);
    for (const s of SPECIALS) expect(s.glyph.some(p => 'stroke' in p && (p.stroke === INK || p.stroke === WHITE)), s.id).toBe(true);
    // The bomb spark blinks and the rainbow ring turns: two frames differ; time 0 is still.
    const frames = (id: 'bomb' | 'rainbow', time: number): string => { const calls: unknown[][] = []; const g = new Proxy({}, { get: (_, m) => (...a: unknown[]) => { calls.push([m, ...a]); return g; } }); drawGlyph(g as never, SPECIAL[id].glyph, 0, 0, time); return JSON.stringify(calls); };
    for (const id of ['bomb', 'rainbow'] as const) { expect(frames(id, 0)).toBe(frames(id, 0)); expect(frames(id, 300)).not.toBe(frames(id, 0)); }
});
test('B-SPE-03 bulle de première apparition : une seule fois, mémorisée, et sans localStorage', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    const tips = new SpecialTips(() => storage, 1000);
    expect(tips.update(['bomb', 'stone'], 0)).toBe('bomb');
    expect(tips.update(['bomb', 'stone'], 500)).toBe('bomb');
    expect(tips.update(['bomb', 'stone'], 600)).toBe('stone');
    expect(tips.update(['bomb', 'stone'], 1000)).toBeNull();
    expect(JSON.parse(values.get(TIP_KEY) ?? '[]')).toEqual(['bomb', 'stone']);
    expect(new SpecialTips(() => storage).update(['bomb', 'stone', 'leaf'], 0)).toBe('leaf');
    // Storage that throws on every access (private mode, blocked site data), and a corrupt record.
    const broken = { getItem: (): string => { throw new Error('Unavailable'); }, setItem: (): void => { throw new Error('Unavailable'); } };
    const offline = new SpecialTips(() => broken, 1000);
    expect(offline.update(['ice2'], 0)).toBe('ice2');
    expect(offline.update(['ice2'], 1000)).toBeNull();
    expect(new SpecialTips(() => { throw new Error('No storage'); }).update(['prism'], 0)).toBe('prism');
    values.set(TIP_KEY, '{oops');
    expect(new SpecialTips(() => storage).update(['crystal'], 0)).toBe('crystal');
});
