import { test, expect } from 'vitest';
import { Engine, SHAPES, BOMB, TILE, STRATA, emptyBoard, rotate, difficulty, settle, slide, stratum, type State } from '../src/engines/empilo/engine';
import { strataTip } from '../src/engines/empilo/tips';
function row(s: State, y: number): number[] { const value = s.board[y]; if (!value) throw new Error("Rangée absente"); return value; }
function position(e = new Engine()): State { return { ...e.state, board: emptyBoard(), active: { id: 0, cells: [{ x: 0, y: 0 }], x: 4, y: 15 }, score: 0, lines: 0, lockMs: 0, resets: 0 }; }
test('E01 collisions murs et blocs, déplacements refusés sans mutation', () => {
    const e = new Engine(); const s = position(e); s.active.x = 0; row(s, 15)[1] = 1; e.loadState(s);
    expect(e.input('left')).toBe(false); expect(e.input('right')).toBe(false); expect(e.state.active.x).toBe(0);
    e.state.active.y = 14; expect(e.input('right')).toBe(true); expect(e.input('soft')).toBe(false);
});
test('E02 rotation géométrique inverse et décalages 0, -1, +1, -2, +2 puis échec propre', () => {
    const bar = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
    expect(rotate(rotate(bar, 1), -1)).toEqual(bar);
    for (const [x, expected] of [[8, 6], [7, 6], [4, 4]]) {
        const e = new Engine(); const s = position(e); s.active = { id: 0, cells: bar, x: x ?? 0, y: 10 }; e.loadState(s);
        expect(e.input('clockwise')).toBe(true); expect(e.state.active.x).toBe(expected);
    }
    for (const offset of [1, 2]) {
        const e = new Engine(); const s = position(e); s.active = { id: 0, cells: [...(SHAPES[0] ?? [])], x: 3, y: 10 };
        for (let x = 1; x < 3 + offset; x++) row(s, 11)[x] = 1;
        e.loadState(s); expect(e.fits(e.state.active)).toBe(true);
        expect(e.input('counterclockwise')).toBe(true); expect(e.state.active.x).toBe(3 + offset);
    }
    const e = new Engine(); const s = position(e); s.active = { id: 0, cells: [...(SHAPES[0] ?? [])], x: 4, y: 10 }; s.board[11] = Array<number>(9).fill(1); e.loadState(s);
    expect(e.fits(e.state.active)).toBe(true);
    const before = e.snapshot(); expect(e.input('clockwise')).toBe(false); expect(e.snapshot()).toEqual(before);
});
test('E03 gravité fixe, verrouillage à 500 ms et plafond de 15 remises', () => {
    const e = new Engine(); const s = position(e); s.active.y = 0; e.loadState(s); e.step(1000); expect(e.state.active.y).toBe(1);
    e.loadState(position(e)); e.step(1000 / 60 * 29); expect(e.state.board.flat().some(Boolean)).toBe(false); e.step(1000 / 60); expect(e.state.board[15]?.[4]).toBe(1);
    e.loadState(position(e));
    for (let i = 0; i < 15; i++) { e.step(400); expect(e.input(i % 2 ? 'right' : 'left')).toBe(true); expect(e.state.lockMs).toBe(0); }
    expect(e.state.resets).toBe(15); e.step(400); e.input('right'); expect(e.state.lockMs).toBeCloseTo(400); e.step(100); expect(e.state.board.flat().filter(Boolean)).toHaveLength(1);
});
for (let count = 1; count <= 5; count++) test(`E04 effacement de ${String(count)} lignes et score`, () => {
    const e = new Engine(1); const s = position(e);
    for (let y = 16 - count; y < 16; y++) { s.board[y] = Array<number>(9).fill(1); row(s, y)[4] = 0; }
    s.active = { id: 0, x: 4, y: 16 - count, cells: Array.from({ length: count }, (_, y) => ({ x: 0, y })) }; e.loadState(s); e.input('drop');
    expect(e.state.lines).toBe(count); expect(e.state.score).toBe(([100, 300, 600, 1000, 1500][count - 1] ?? 0) * 2); expect(e.state.board.flat().some(Boolean)).toBe(false);
});
test('E05 points de descente et chute, aucun point contre le sol', () => {
    const e = new Engine(); const s = position(e); s.active.y = 10; e.loadState(s);
    expect(e.input('soft')).toBe(true); expect(e.state.score).toBe(1); e.input('drop'); expect(e.state.score).toBe(9);
    e.loadState(position(e)); expect(e.input('soft')).toBe(false); expect(e.state.score).toBe(0);
});
test('E06 sacs complets et fréquence déterministe sur plusieurs graines', () => {
    // Strata without bombs: the bag alone deals the pieces.
    for (const level of [0, 6, 11, 15, 25]) {
        expect(stratum(level).bomb).toBe(0);
        const size = difficulty(level).shapes; const counts = Array<number>(size).fill(0); const first = new Set<number>();
        for (let seed = 0; seed < 40; seed++) {
            const e = new Engine(level, seed); first.add(e.state.active.id); const sequence: number[] = [];
            for (let i = 0; i < size * 3; i++) {
                sequence.push(e.state.active.id); counts[e.state.active.id] = (counts[e.state.active.id] ?? 0) + 1;
                const s = position(e); s.active = { ...e.state.active, y: 0 }; e.loadState(s); e.input('drop');
            }
            for (let i = 0; i < 3; i++) expect(new Set(sequence.slice(i * size, (i + 1) * size)).size).toBe(size);
        }
        expect(first.size).toBe(size); expect(counts).toEqual(Array<number>(size).fill(120));
    }
});
test('E07 apparition bloquée, plateau saturé et positions interdites', () => {
    for (let seed = 0; seed < 80; seed++) {
        const e = new Engine(29, seed); const s = position(e);
        s.board[0] = Array<number>(9).fill(1); row(s, 0)[0] = 0;
        e.loadState(s); e.input('drop'); expect(e.status).toBe('lost'); expect(e.fits(e.state.active)).toBe(false);
        expect(e.input('drop')).toBe(false);
        const fresh = new Engine(29, seed); expect(fresh.fits(fresh.state.active)).toBe(true);
        for (const id of fresh.state.next) expect(id === BOMB || id < difficulty(29).shapes).toBe(true);
    }
});
test('E08 victoire seulement à l’objectif', () => {
    const e = new Engine(); const s = position(e); s.lines = 4; s.board[15] = Array<number>(9).fill(1); row(s, 15)[4] = 0; e.loadState(s);
    expect(e.status).toBe('playing'); e.input('drop'); expect(e.status).toBe('won'); expect(e.state.lines).toBe(5); expect(e.input('left')).toBe(false);
});
test('E09 gravats à graine, trous garantis dans chaque rangée', () => {
    const holes = new Set<number>();
    for (let level = 0; level < 30; level++) for (let seed = 0; seed < 20; seed++) {
        const e = new Engine(level, seed); const rows = e.state.board.filter(row => row.some(Boolean)); expect(rows).toHaveLength(difficulty(level).rubble);
        for (const row of rows) { expect(row.filter(v => v === 0)).toHaveLength(difficulty(level).holes); holes.add(row.indexOf(0)); }
    }
    expect(holes.size).toBe(9);
});
test('E10b une gemme dans une ligne scellée est libérée à la première complétion', () => {
    const board = emptyBoard(); board[15] = [2, 3, 1, 1, 0, 1, 1, 1, 1];
    const r = settle(board, [{ x: 0, y: 0 }], 4, 15); expect(r.gems).toBe(1); expect(r.cleared).toBe(0); expect(r.board[15]).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0]);
});
test('E10 sceaux : première complétion fragilise, seconde efface', () => {
    const e = new Engine(); const s = position(e); s.board[15] = Array<number>(9).fill(2); row(s, 15)[4] = 0; e.loadState(s); e.input('drop');
    expect(e.state.lines).toBe(0); expect(e.state.score).toBe(0); expect(e.state.board[15]).toEqual([1, 1, 1, 1, 0, 1, 1, 1, 1]);
    e.state.active = position(e).active; e.input('drop'); expect(e.state.lines).toBe(1); expect(e.state.score).toBe(100);
});
test('E11 campagne : une règle neuve tous les 4 à 5 niveaux, défi chronométré tous les 5, respiration après chaque nouveauté', () => {
    const first = (has: (i: number) => boolean) => Array.from({ length: 30 }, (_, i) => i).find(has);
    expect(first(i => stratum(i).bomb > 0)).toBe(3);
    expect(first(i => stratum(i).objective === 'gems')).toBe(7);
    expect(first(i => stratum(i).conveyors.length > 0)).toBe(11);
    expect(first(i => stratum(i).rise > 0)).toBe(15);
    expect(first(i => stratum(i).locks > 0)).toBe(20);
    expect(first(i => stratum(i).preview < 3)).toBe(25);
    expect(STRATA.flatMap((l, i) => l.timeMs ? [i] : [])).toEqual([4, 9, 14, 19, 24]);
    for (const intro of [3, 7, 11, 15, 20, 25]) expect(stratum(intro).gravity).toBeLessThanOrEqual(stratum(intro - 1).gravity);
    // Respiration : la strate qui suit chaque défi tombe plus lentement que lui.
    for (const challenge of [4, 9, 14, 19, 24]) expect(stratum(challenge + 1).gravity).toBeLessThan(stratum(challenge).gravity);
    expect(Math.max(...STRATA.map(l => l.gravity))).toBeLessThanOrEqual(5);
    const last = stratum(29); expect(last.objective === 'gems' && last.locks > 0 && last.bomb > 0 && last.conveyors.length > 0 && last.rise > 0 && last.preview === 1).toBe(true);
    const d0 = difficulty(0); expect([d0.gravity, d0.goal, d0.rubble, d0.sealed, d0.shapes, d0.bomb]).toEqual([1, 5, 0, 0, 4, 0]);
    expect(new Set(STRATA.map(l => l.name)).size).toBe(30);
    for (let i = 0; i < 30; i++) expect(strataTip(i).length).toBeLessThanOrEqual(40);
    expect([strataTip(3), strataTip(20), strataTip(25)].map(t => t.split(' ')[0])).toEqual(['Bombe', 'Cadenas', 'Brouillard']);
    expect(() => difficulty(30)).toThrow();
});
test('E12 déterminisme des entrées horodatées et pas indépendants de l’affichage', () => {
    const a = new Engine(12, 98), b = new Engine(12, 98);
    for (const action of ['left', 'clockwise', 'soft', 'drop', 'right', 'counterclockwise', 'drop'] as const) { a.step(100); for (let i = 0; i < 6; i++) b.step(1000 / 60); a.input(action); b.input(action); expect(a.snapshot()).toEqual(b.snapshot()); }
    expect(new Engine(12, 99).snapshot()).not.toEqual(new Engine(12, 98).snapshot());
    expect(SHAPES).toHaveLength(9); expect(SHAPES.map(s => s.length)).toEqual([3, 3, 4, 4, 5, 5, 5, 5, 1]); expect(BOMB).toBe(8);
    expect(SHAPES.filter(s => s.length === 4)).toHaveLength(2);
    for (const shape of SHAPES.slice(0, BOMB)) { expect(new Set(shape.map(c => `${String(c.x)},${String(c.y)}`)).size).toBe(shape.length); expect(shape.length).toBeGreaterThanOrEqual(3); expect(shape.length).toBeLessThanOrEqual(5); }
    expect(() => { a.step(-1); }).toThrow();
});
test('E13 bombe : toutes les N pièces, souffle 3 × 3, gemmes et clé comptées, cadenas intacts, aucune ligne', () => {
    const e = new Engine(3, 28), ids: number[] = [];
    for (let i = 0; i < 12; i++) { ids.push(e.state.active.id); const s = position(e); s.active = { ...e.state.active, y: 0 }; e.loadState(s); e.input('drop'); }
    expect(ids.flatMap((id, i) => id === BOMB ? [i] : [])).toEqual([5, 11]);
    const board = emptyBoard(); board[14] = [0, 0, 1, 3, 4, 0, 0, 0, 0]; board[15] = [1, 1, 1, 5, 2, 1, 1, 1, 0];
    const r = settle(board, [{ x: 0, y: 0 }], 3, 14, true);
    expect(r.gems).toBe(1); expect(r.key).toBe(true); expect(r.cleared).toBe(0);
    // Le cadenas a survécu au souffle puis la clé l'a changé en cristal.
    expect(r.board[14]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]); expect(r.board[15]).toEqual([1, 1, 0, 0, 0, 1, 1, 1, 0]);
});
test('E14 fouille : victoire quand toutes les gemmes sont libérées, gemmes exactes sur 30 strates et 20 graines', () => {
    for (let level = 0; level < 30; level++) for (let seed = 0; seed < 20; seed++) {
        const e = new Engine(level, seed), l = stratum(level), flat = e.state.board.flat();
        expect(flat.filter(v => v === TILE.gem)).toHaveLength(l.gems);
        if (l.objective === 'gems') expect(l.goal).toBe(l.gems);
        expect(flat.filter(v => v === TILE.lock)).toHaveLength(l.locks); expect(flat.filter(v => v === TILE.key)).toHaveLength(l.locks ? 1 : 0);
    }
    const e = new Engine(7); const s = position(e); s.board[15] = [3, 1, 1, 1, 0, 1, 1, 1, 1]; s.gems = 2; e.loadState(s);
    e.input('drop'); expect(e.state.gems).toBe(3); expect(e.status).toBe('won'); expect(e.state.score).toBe((100 + 250) * 8);
    const one = new Engine(7); const t = position(one); t.board[15] = [3, 1, 1, 1, 0, 1, 1, 1, 1]; one.loadState(t); one.input('drop'); expect(one.status).toBe('playing');
});
test('E15 tapis : la rangée glisse d\'une colonne après chaque pièce, avec bouclage et sens', () => {
    const board = emptyBoard(); board[14] = [1, 2, 3, 0, 0, 0, 0, 0, 5];
    expect(slide(board, [{ y: 14, direction: 1 }])[14]).toEqual([5, 1, 2, 3, 0, 0, 0, 0, 0]);
    expect(slide(board, [{ y: 14, direction: -1 }])[14]).toEqual([2, 3, 0, 0, 0, 0, 0, 5, 1]);
    expect(slide(board, [])).toBe(board);
    const e = new Engine(11); const s = position(e); s.board[14] = [1, 0, 0, 0, 0, 0, 0, 0, 0]; s.active = { id: 0, cells: [{ x: 0, y: 0 }], x: 6, y: 0 }; e.loadState(s);
    e.input('drop'); expect(e.state.board[14]).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0]); expect(e.state.board[15]?.[6]).toBe(1);
});
test('E16 marée : une rangée à un trou monte toutes les N pièces ; plus de place = défaite', () => {
    const e = new Engine(15); const s = position(e); e.loadState(s);
    for (let i = 0; i < 6; i++) { e.state.active = { id: 0, cells: [{ x: 0, y: 0 }], x: i, y: 0 }; e.input('drop'); }
    expect(e.state.locked).toBe(6); expect(e.state.board[15]?.filter(v => v === 0)).toHaveLength(1);
    expect(e.state.board[14]?.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    const full = new Engine(15); const t = position(full); t.locked = 5; t.board[0] = [0, 0, 0, 0, 0, 0, 0, 0, 1]; full.loadState(t); full.input('drop');
    expect(full.status).toBe('lost'); expect(full.reason).toBe('rise');
});
test('E17 cadenas : la rangée reste tant que la clé n\'est pas libérée, la clé change tout cadenas en cristal', () => {
    const e = new Engine(20); const s = position(e); s.board[15] = [4, 1, 1, 1, 0, 1, 1, 1, 1]; s.board[14] = [1, 1, 1, 1, 0, 1, 5, 1, 1]; e.loadState(s);
    e.state.active = { id: 0, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }], x: 4, y: 14 }; e.input('drop');
    expect(e.state.lines).toBe(1); expect(e.state.board[15]).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    for (let seed = 0; seed < 20; seed++) {
        const f = new Engine(21, seed), top = 16 - stratum(21).rubble;
        const at = (v: number) => f.state.board.flatMap((r, y) => r.flatMap(c => c === v ? [y] : []));
        expect(at(TILE.key)).toEqual([top]); for (const y of at(TILE.lock)) expect(y).toBeGreaterThan(top);
    }
});
test('E18 chrono : défaite exactement à zéro, rien sur une strate sans chrono', () => {
    const e = new Engine(4); expect(e.state.timeLeft).toBe(60000); const s = position(e); s.timeLeft = 100; s.active.y = 0; e.loadState(s);
    e.step(5 * 1000 / 60); expect(e.status).toBe('playing'); e.step(1000 / 60); expect(e.status).toBe('lost'); expect(e.reason).toBe('time');
    const free = new Engine(3); free.step(5000); expect(free.state.timeLeft).toBe(0); expect(free.status).toBe('playing');
    // Every timed stratum really counts down (a challenge whose clock stood still would pass the paced replays).
    for (const level of [4, 9, 14, 19, 24]) { const t = new Engine(level); t.step(1000); expect(Math.round(t.state.timeLeft ?? 0)).toBe(stratum(level).timeMs - 1000); }
});
