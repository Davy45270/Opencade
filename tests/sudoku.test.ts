import { describe, expect, test } from 'vitest';
import { Random } from '../src/engines/shared/random';
import { applyAction, createState, hintFor, prepare, restore, score, stars, type Prepared, type SudokuAction, type SudokuState } from '../src/engines/sudoku/engine';
import { SudokuGame } from '../src/engines/sudoku/game';
import { dig, fullGrid, generate, GENERATOR_VERSION, PROFILES, type Profile } from '../src/engines/sudoku/generator';
import { bit, candidates, complete, conflicts, geometry, gridText, parseGrid, topology, validateLevel, type Size } from '../src/engines/sudoku/grid';
import * as levels from '../src/engines/sudoku/levels';
import { GRIDS, levelRecord } from '../src/engines/sudoku/levels';
import { deduce, rate, tierOf } from '../src/engines/sudoku/logic';
import { provedUnique, solve } from '../src/engines/sudoku/solver';
import { cellLook, hitTest, layout } from '../src/games/sudoku/art';
import { keyAction } from '../src/games/sudoku/controls';
import { Progression } from '../src/shell/progression';
import { readSave, writeSave, type StoragePort } from '../src/shell/storage';
import { sudokuDiversity } from '../scripts/sudoku-diversity.js';

/** Property families run this many seeded cases each (dossier: at least 1000). */
const CASES = 1000;
const level = (i: number): Prepared => prepare(levelRecord(i));
const freeze = <T>(value: T): T => {
    if (value && typeof value === 'object') { Object.freeze(value); for (const v of Object.values(value)) freeze(v); }
    return value;
};
const ok = (p: Prepared, s: SudokuState, a: SudokuAction): SudokuState => {
    const r = applyAction(p, s, a);
    if (!r.accepted) throw new Error(`refusé : ${r.reason}`);
    return r.state;
};
/** Every unit of a complete grid holds 1..N once. */
function valid(size: Size, values: readonly number[]): boolean { return complete(geometry(size), values); }

describe('critères d’acceptation du dossier', () => {
    test('AC01 une case donnée ne peut pas être modifiée : refus sans mutation', () => {
        const p = level(11), s = freeze(createState(p)), given = p.givens.findIndex(v => v > 0), before = JSON.stringify(s);
        for (const a of [{ type: 'SET_VALUE', index: given, value: 1 }, { type: 'CLEAR_VALUE', index: given }, { type: 'TOGGLE_NOTE', index: given, value: 2 }] as const) {
            const r = applyAction(p, s, a);
            expect(r.accepted).toBe(false);
            if (!r.accepted) expect(r.reason).toBe('given');
            expect(r.state).toBe(s);
            expect(r.events).toEqual([]);
        }
        expect(JSON.stringify(s)).toBe(before);
    });
    test('AC02 une saisie dans une case vide met à jour la grille et l’historique', () => {
        const p = level(0), s = createState(p), empty = p.givens.indexOf(0);
        const r = applyAction(p, s, { type: 'SET_VALUE', index: empty, value: p.solution[empty] ?? 1 });
        expect(r.accepted).toBe(true);
        expect(r.state.values[empty]).toBe(p.solution[empty]);
        expect(r.state.history).toHaveLength(1);
        expect(r.state.history[0]?.values).toEqual(s.values);
        expect(r.state.moves).toBe(1);
        expect(s.values[empty]).toBe(0);
    });
    test('AC03 conflit ligne, colonne ou bloc détecté et signalé autrement que par la couleur', () => {
        const p = level(11), n = p.size, t = topology(p);
        for (const kind of ['row', 'col', 'box'] as const) {
            // An empty cell and a given that shares only this unit kind with it.
            const pair = (() => {
                for (let i = 0; i < n * n; i++) {
                    if (p.givens[i]) continue;
                    const mine: readonly number[] = t.unitsOf[i] ?? [0, 0, 0], [r = 0, c = 0, b = 0] = mine, unit = kind === 'row' ? r : kind === 'col' ? c : b;
                    const other = (t.units[unit] ?? []).find(j => p.givens[j] && (t.unitsOf[j] ?? []).filter(u => mine.includes(u)).length === 1
                        && (t.peers[i] ?? []).filter(q => p.givens[q] === p.givens[j]).length === 1);
                    if (other !== undefined) return [i, other] as const;
                }
                throw new Error('aucune paire');
            })();
            const r = applyAction(p, createState(p), { type: 'SET_VALUE', index: pair[0], value: p.givens[pair[1]] ?? 0 });
            expect(r.accepted).toBe(true);
            expect(r.events.map(e => e.type)).toContain('conflict');
            expect(conflicts(p, r.state.values).sort()).toEqual([...pair].sort());
            expect(r.state.mistakes).toBe(1);
        }
        // The look of a conflicting cell carries a hatch pattern and a "!" badge; colour removed, it still differs.
        const base = { given: false, value: 5, selected: false, peer: false, same: false, hint: false, altBox: false };
        const bad = cellLook({ ...base, conflict: true }), good = cellLook({ ...base, conflict: false });
        expect(bad.pattern).toBe('hatch'); expect(bad.badge).toBe('!');
        expect({ pattern: good.pattern, badge: good.badge }).toEqual({ pattern: null, badge: null });
    });
    test('AC04 victoire seulement grille complète et contraintes respectées', () => {
        const p = level(0);
        let s = createState(p);
        const empties = p.givens.flatMap((v, i) => v ? [] : [i]);
        // Complete but wrong: two cells swapped in one row keep the grid full with conflicts.
        for (const i of empties) s = ok(p, s, { type: 'SET_VALUE', index: i, value: p.solution[i] === 1 ? 2 : 1 });
        expect(s.values.every(v => v > 0)).toBe(true);
        expect(s.status).toBe('playing');
        for (const i of empties) s = ok(p, s, { type: 'SET_VALUE', index: i, value: p.solution[i] ?? 0 });
        expect(s.status).toBe('won');
        expect(complete(p, s.values)).toBe(true);
        // Finished: entries are refused without change.
        const r = applyAction(p, s, { type: 'CLEAR_VALUE', index: empties[0] ?? 0 });
        expect(r.accepted).toBe(false); expect(r.state).toBe(s);
    });
    test('AC05 annuler restaure valeurs et notes de l’action précédente', () => {
        const p = level(11), i = p.givens.indexOf(0);
        const peer = (topology(p).peers[i] ?? []).find(j => !p.givens[j]) ?? 0;
        let s = createState(p);
        s = ok(p, s, { type: 'TOGGLE_NOTE', index: peer, value: 4 });
        s = ok(p, s, { type: 'TOGGLE_NOTE', index: i, value: 7 });
        const before = { values: [...s.values], notes: s.notes.map(n => [...n]) };
        s = ok(p, s, { type: 'SET_VALUE', index: i, value: 4 });
        expect(s.notes[i]).toEqual([]); expect(s.notes[peer]).toEqual([]);
        s = ok(p, s, { type: 'UNDO' });
        expect({ values: s.values, notes: s.notes }).toEqual(before);
        s = ok(p, s, { type: 'UNDO' }); expect(s.notes[i]).toEqual([]);
        s = ok(p, s, { type: 'UNDO' }); expect(s.notes[peer]).toEqual([]);
        const r = applyAction(p, s, { type: 'UNDO' });
        expect(r.accepted).toBe(false);
    });
    test('AC06 4×4, 6×6 et 9×9 tiennent dans l’écran sans débordement, cibles du pavé ≥ 44 px', () => {
        for (const [w, h] of [[320, 568], [360, 640], [390, 844], [480, 640], [768, 1024], [1280, 900]] as const) for (const size of [4, 6, 9]) {
            const l = layout(size, w, h);
            const boxes = [l.grid, l.panel, l.hud, l.hero, l.bubble, ...l.pad, ...l.actions];
            for (const b of boxes) {
                expect(b.x, `${String(size)} ${String(w)}×${String(h)}`).toBeGreaterThanOrEqual(0);
                expect(b.y).toBeGreaterThanOrEqual(0);
                expect(b.x + b.w).toBeLessThanOrEqual(w + 1e-9);
                expect(b.y + b.h).toBeLessThanOrEqual(h + 1e-9);
            }
            for (const k of [...l.pad, ...l.actions]) { expect(k.w).toBeGreaterThanOrEqual(44); expect(k.h).toBeGreaterThanOrEqual(44); }
            // Bands never overlap: board panel above the pad, pad above the actions.
            expect(l.panel.y + l.panel.h).toBeLessThanOrEqual(Math.min(...l.pad.map(k => k.y)));
            expect(Math.max(...l.pad.map(k => k.y + k.h))).toBeLessThanOrEqual(Math.min(...l.actions.map(a => a.y)));
            expect(l.grid.cell).toBeGreaterThanOrEqual(size === 9 ? 24 : size === 6 ? 32 : 40);
        }
    });
    test('AC07 chaque indice désigne une déduction logique valide et expliquée', () => {
        for (let i = 0; i < GRIDS.length; i++) {
            const p = level(i);
            let s = createState(p), guard = 0;
            while (s.status === 'playing' && guard++ < 100) {
                const hint = hintFor(p, s.values);
                expect(hint?.kind, `niveau ${String(i + 1)}`).toBe('logic');
                if (!hint?.value) throw new Error('indice sans valeur');
                expect(hint.value).toBe(p.solution[hint.index]);
                expect(hint.lines.join(' ').length).toBeGreaterThan(20);
                // The claim of a single is checked on the grid itself.
                const masks = candidates(p, s.values);
                if (hint.technique === 'naked-single') expect(masks[hint.index]).toBe(bit(hint.value));
                if (hint.technique === 'hidden-single' && hint.lines.length === 1) {
                    const unit = hint.cells.filter(c => c !== hint.index && !s.values[c]);
                    expect(unit.every(c => !((masks[c] ?? 0) & bit(hint.value ?? 0)))).toBe(true);
                }
                s = ok(p, s, { type: 'SET_VALUE', index: hint.index, value: hint.value });
            }
            expect(s.status).toBe('won');
        }
        // A conflict is pointed at first, then an entry the grid cannot keep: both explained.
        const p = level(11), i = p.givens.indexOf(0), clash = (topology(p).peers[i] ?? []).find(j => p.givens[j]) ?? 0;
        const conflicted = ok(p, createState(p), { type: 'SET_VALUE', index: i, value: p.givens[clash] ?? 0 });
        expect(hintFor(p, conflicted.values)?.kind).toBe('conflict');
        const wrongValue = [...Array(p.size).keys()].map(v => v + 1).find(v => v !== p.solution[i] && !(topology(p).peers[i] ?? []).some(j => p.givens[j] === v)) ?? 0;
        const wrong = ok(p, createState(p), { type: 'SET_VALUE', index: i, value: wrongValue });
        const h = hintFor(p, wrong.values);
        expect(h?.kind).toBe('wrong'); expect(h?.index).toBe(i);
        expect(solve({ ...p, givens: wrong.values }).status).toBe('unsolvable');
    });
    test('AC08 le solveur prouve 0, 1 ou au moins 2 solutions, ou rend unknown sur limite', () => {
        const g = geometry(9), empty = Array<number>(81).fill(0);
        expect(solve({ ...g, givens: empty })).toMatchObject({ status: 'solved', solutionCount: 2 });
        const unique = level(29);
        expect(solve(unique)).toMatchObject({ status: 'solved', solutionCount: 1, solution: unique.solution });
        const twin = [...empty]; twin[0] = 5; twin[1] = 5;
        expect(solve({ ...g, givens: twin })).toMatchObject({ status: 'unsolvable', solutionCount: 0 });
        // No candidate left without any repeated given: row 0 holds 1..8, column 8 already has a 9.
        const dead = [...empty]; for (let c = 0; c < 8; c++) dead[c] = c + 1; dead[9 * 4 + 8] = 9;
        expect(solve({ ...g, givens: dead }).status).toBe('unsolvable');
        const limited = solve({ ...g, givens: empty }, { maxNodes: 1 });
        expect(limited).toMatchObject({ status: 'unknown', reason: 'node_limit' });
        let now = 0;
        expect(solve({ ...g, givens: empty }, { maxDurationMs: 5, now: () => (now += 10) })).toMatchObject({ status: 'unknown', reason: 'timeout' });
        expect(provedUnique({ ...g, givens: empty }, { maxNodes: 1 })).toBeNull();
    });
    test('AC09 le générateur ne publie que des grilles à solution unique prouvée', () => {
        for (const [name, profile] of Object.entries(PROFILES)) for (const seed of [1, 2, 3]) {
            const made = generate(profile, seed);
            const proof = solve(made.level);
            expect(proof, name).toMatchObject({ status: 'solved', solutionCount: 1, solution: made.solution });
            expect(validateLevel(made.level)).toEqual(made.level);
            expect(made.level.generatorVersion).toBe(GENERATOR_VERSION);
        }
    });
    test('AC10 même seed et mêmes versions : même grille et même solution', () => {
        // Frozen outputs: a change of the generator or of the shared PRNG must bump GENERATOR_VERSION and these lines.
        const frozen = {
            easy: generate(PROFILES.easy, 20261111).text,
            medium: generate(PROFILES.medium, 7).text,
            hard: generate(PROFILES.hard, 42).text,
        };
        expect(frozen).toMatchInlineSnapshot(`
          {
            "easy": "..4.897.1/2.91.4.../....3...9/..64...73/...3.7.../57...18../4...1..../...6.51.2/3.189.6..",
            "hard": "..7...5../.1....8.6/52.....41/6..41..../...8.2.../....93..7/19.....32/2.6....9./..8...7..",
            "medium": "7.2.49.6./....35.../.6......./.7.4....8/48.....53/1....3.4./.......2./...31..../.9.82.3.4",
          }
        `);
        for (const [name, profile] of Object.entries(PROFILES)) {
            const a = generate(profile, 99), b = generate(profile, 99);
            expect(a.text, name).toBe(b.text); expect(a.solution).toEqual(b.solution); expect(a.level).toEqual(b.level);
        }
    });
    test('AC11 sauvegarde et reprise : valeurs, notes, compteurs et progression', () => {
        const p = level(11), i = p.givens.indexOf(0), j = p.givens.indexOf(0, i + 1);
        let s = createState(p);
        s = ok(p, s, { type: 'SET_VALUE', index: i, value: p.solution[i] ?? 0 });
        s = ok(p, s, { type: 'TOGGLE_NOTE', index: j, value: 3 });
        s = ok(p, s, { type: 'REQUEST_HINT' });
        s = ok(p, s, { type: 'TICK', ms: 4321 });
        const back = restore(p, JSON.parse(JSON.stringify(s)));
        expect(back).toEqual({ ...s, hint: null });
        // Another grid, edited givens or garbage: refused, the grid starts fresh.
        expect(restore(level(12), JSON.parse(JSON.stringify(s)))).toBeNull();
        expect(restore(p, { ...s, values: s.values.map((v, k) => k === p.givens.findIndex(x => x > 0) ? 0 : v) })).toBeNull();
        expect(restore(p, 'nope')).toBeNull();
        // Progression: the shared save under arcade-lab:sudoku:v1.
        const store = new Map<string, string>(), storage: StoragePort = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } };
        const progress = new Progression(readSave(storage, 'sudoku', 30), 30);
        progress.start(0, true); progress.finish('won', 500); writeSave(storage, progress.save, 'sudoku');
        expect(store.has('arcade-lab:sudoku:v1')).toBe(true);
        expect(readSave(storage, 'sudoku', 30)).toEqual({ unlocked: 2, best: 500 });
    });
    test('AC12 clavier complet et cibles tactiles', () => {
        const k = (code: string, extra: Partial<Parameters<typeof keyAction>[0]> = {}) => keyAction({ code, key: '', ...extra }, 9);
        expect(k('ArrowLeft')).toEqual({ type: 'move', dx: -1, dy: 0 });
        expect(k('ArrowDown')).toEqual({ type: 'move', dx: 0, dy: 1 });
        expect(k('Digit7')).toEqual({ type: 'digit', value: 7, note: false });
        expect(k('Numpad3', { shiftKey: true })).toEqual({ type: 'digit', value: 3, note: true });
        expect(keyAction({ code: 'Digit7', key: '7' }, 4)).toBeNull();
        for (const code of ['Delete', 'Backspace', 'Digit0']) expect(k(code)).toEqual({ type: 'erase' });
        expect(k('KeyN')).toEqual({ type: 'notes' });
        expect(k('KeyZ', { ctrlKey: true })).toEqual({ type: 'undo' });
        expect(k('KeyZ', { metaKey: true })).toEqual({ type: 'undo' });
        expect(k('KeyH')).toEqual({ type: 'hint' });
        expect(k('KeyR', { ctrlKey: true })).toBeNull();
        // Every cell, key and button is reached by a tap at its centre.
        const l = layout(9, 390, 800);
        for (let i = 0; i < 81; i++) expect(hitTest(l, l.grid.x + (i % 9 + .5) * l.grid.cell, l.grid.y + (Math.floor(i / 9) + .5) * l.grid.cell)).toEqual({ kind: 'cell', index: i });
        for (const key of l.pad) expect(hitTest(l, key.x + key.w / 2, key.y + key.h / 2)).toEqual({ kind: 'pad', value: key.value });
        for (const a of l.actions) expect(hitTest(l, a.x + a.w / 2, a.y + a.h / 2)).toEqual({ kind: 'action', id: a.id });
        // Cursor: wraps around the edges, through the game's own helper.
        const game = new SudokuGame(); game.loadLevel(11);
        game.select(0); game.move(-1, 0); expect(game.state.selectedIndex).toBe(8);
        game.move(0, -1); expect(game.state.selectedIndex).toBe(80);
    });
});

describe('les trente grilles écrites', () => {
    test('S-LVL-01 schéma strict, unicité prouvée, technique annoncée, progression de 4×4 à 9×9', () => {
        expect(GRIDS).toHaveLength(30);
        const sizes = GRIDS.map((_, i) => levelRecord(i).size);
        expect(sizes.slice(0, 5)).toEqual([4, 4, 4, 4, 4]);
        expect(sizes.slice(5, 11)).toEqual([6, 6, 6, 6, 6, 6]);
        expect(sizes.slice(11).every(s => s === 9)).toBe(true);
        const ids = new Set<string>(), texts = new Set<string>();
        for (let i = 0; i < GRIDS.length; i++) {
            const record = levelRecord(i), data = GRIDS[i];
            expect(validateLevel(JSON.parse(JSON.stringify(record)))).toEqual(record);
            const proof = solve(record);
            expect(proof.status === 'solved' && proof.solutionCount, `niveau ${String(i + 1)}`).toBe(1);
            const r = rate(record, record.givens);
            expect(r.solved).toBe(true);
            expect(r.hardest).toBe(data?.technique);
            expect(data?.title.fr.length).toBeGreaterThan(2); expect(data?.title.en.length).toBeGreaterThan(2);
            expect(gridText(record, record.givens)).toBe(data?.grid);
            ids.add(record.id); texts.add(record.givens.join(''));
        }
        expect(ids.size).toBe(30); expect(texts.size).toBe(30);
    });
    test('S-LVL-02 difficulté mesurée : une grille n’est jamais plus facile que celle cinq rangs avant', () => {
        // Score = size first, then the hardest technique (tier), then fine steps and empty cells (logic.ts rate()).
        const scores = GRIDS.map((_, i) => { const r = levelRecord(i); return rate(r, r.givens).score; });
        for (let i = 5; i < scores.length; i++) expect(scores[i], `niveau ${String(i + 1)}`).toBeGreaterThanOrEqual(scores[i - 5] ?? 0);
        // Techniques never go back within the 9 × 9 part, and the last grids need the X-wing.
        const tiers = GRIDS.map(g => tierOf(g.technique));
        for (let i = 12; i < 30; i++) expect(tiers[i] ?? 0).toBeGreaterThanOrEqual(tiers[i - 1] ?? 0);
        expect(GRIDS.slice(-2).every(g => g.technique === 'x-wing')).toBe(true);
    });
    test('S-LVL-03 diversité mesurée et témoin de clones', () => {
        const r = sudokuDiversity({ ...levels, rate });
        expect(r.cloneShare).toBe(0);
        expect(r.maxGapWithoutNovelty).toBeLessThanOrEqual(13);
        expect(r.score).toBeLessThanOrEqual(30);
        const clones = sudokuDiversity({ ...levels, rate }, Array<number>(30).fill(6));
        expect(clones.cloneShare).toBe(1);
    });
    test('S-LVL-04 validation stricte : refus des niveaux mal formés', () => {
        const good = JSON.parse(JSON.stringify(levelRecord(0))) as Record<string, unknown>;
        const bad: Record<string, unknown>[] = [
            { ...good, extra: 1 }, { ...good, schemaVersion: '2.0.0' }, { ...good, size: 5 }, { ...good, boxRows: 3 }, { ...good, givens: [1, 2] },
            { ...good, givens: Array<number>(16).fill(9) }, { ...good, difficulty: 'easyish' }, { ...good, mode: 'arcade' }, { ...good, id: '' },
            { ...good, givens: [1, 1, ...Array<number>(14).fill(0)] }, { ...good, givens: Array<string>(16).fill('1') }, { ...good, seed: 1.5 },
        ];
        const noId = { ...good }; Reflect.deleteProperty(noId, 'id');
        for (const b of [...bad, noId, null, [], 'x', { ...good, id: 'x'.repeat(5000) }]) expect(() => validateLevel(b)).toThrow(RangeError);
    });
});

describe('propriétés sur cas seedés', () => {
    const sizes: Size[] = [4, 6, 9];
    test(`S-PROP-01 ${String(CASES)} grilles générées : solution unique, données respectées, invariants de taille`, () => {
        const loose = (size: Size): Profile => ({ size, minTier: 1, maxTier: 6, minGivens: size === 9 ? 24 : 4, difficulty: 'easy' });
        for (let seed = 1; seed <= CASES; seed++) {
            const size = sizes[seed % 3] ?? 4, made = generate(loose(size), seed, `P${String(seed)}`, 1), lv = made.level;
            expect(lv.givens).toHaveLength(size * size);
            expect(lv.boxRows * lv.boxCols).toBe(size);
            expect(lv.givens.every((v, i) => v === 0 || v === made.solution[i])).toBe(true);
            expect(valid(size, made.solution)).toBe(true);
            const proof = solve(lv);
            expect(proof.status === 'solved' && proof.solutionCount === 1).toBe(true);
        }
    });
    test(`S-PROP-02 ${String(CASES)} actions refusées ne modifient rien (états gelés)`, () => {
        const random = new Random(5);
        const puzzles = [level(0), level(7), level(20)];
        let refused = 0;
        for (let k = 0; k < CASES; k++) {
            const p = puzzles[k % 3] ?? level(0), n = p.size * p.size;
            let s = createState(p);
            for (let m = Math.floor(random.next() * 6); m > 0; m--) {
                const i = p.givens.indexOf(0, Math.floor(random.next() * n)); if (i < 0) continue;
                const r = applyAction(p, s, { type: 'SET_VALUE', index: i, value: 1 + Math.floor(random.next() * p.size) }); s = r.state;
            }
            freeze(s);
            const before = JSON.stringify(s), i = Math.floor(random.next() * (n + 4)) - 2;
            const actions: SudokuAction[] = [
                { type: 'SET_VALUE', index: i, value: Math.floor(random.next() * (p.size + 3)) - 1 }, { type: 'CLEAR_VALUE', index: i },
                { type: 'TOGGLE_NOTE', index: i, value: Math.floor(random.next() * (p.size + 2)) }, { type: 'TICK', ms: -1 },
            ];
            for (const a of actions) {
                const r = applyAction(p, s, a);
                if (!r.accepted) { refused++; expect(r.state).toBe(s); }
                expect(JSON.stringify(s)).toBe(before);
            }
        }
        expect(refused).toBeGreaterThan(CASES);
    });
    test(`S-PROP-03 ${String(CASES)} annulations : chaque action annulable est exactement défaite`, () => {
        const random = new Random(11);
        for (let k = 0; k < CASES; k++) {
            const p = level(k % 30), n = p.size * p.size;
            let s = createState(p);
            for (let m = 0; m < 4; m++) {
                const i = p.givens.indexOf(0, Math.floor(random.next() * n)); if (i < 0) continue;
                const v = 1 + Math.floor(random.next() * p.size), kind = random.next();
                const a: SudokuAction = kind < .5 ? { type: 'SET_VALUE', index: i, value: v } : kind < .8 ? { type: 'TOGGLE_NOTE', index: i, value: v } : { type: 'CLEAR_VALUE', index: i };
                const r = applyAction(p, s, a);
                if (!r.accepted) continue;
                const back = ok(p, r.state, { type: 'UNDO' });
                expect({ v: back.values, n: back.notes }).toEqual({ v: s.values, n: s.notes });
                s = r.state;
            }
        }
    });
    test(`S-PROP-04 ${String(CASES)} grilles quelconques : le solveur ne rend que des solutions valides qui gardent les données`, () => {
        const random = new Random(23);
        let solved = 0, none = 0;
        for (let k = 0; k < CASES; k++) {
            const size = sizes[k % 3] ?? 4, g = geometry(size), base = fullGrid(size, random);
            // Keep a random share of a valid grid, then break one cell in a third of the cases.
            const givens = base.map(v => random.next() < .35 ? v : 0);
            if (k % 3 === 0) { const i = Math.floor(random.next() * givens.length); givens[i] = 1 + Math.floor(random.next() * size); }
            const r = solve({ ...g, givens });
            if (r.status === 'solved') {
                solved++;
                expect(valid(size, r.solution)).toBe(true);
                expect(givens.every((v, i) => !v || r.solution[i] === v)).toBe(true);
            } else if (r.status === 'unsolvable') { none++; expect(conflicts(g, givens).length > 0 || k % 3 === 0).toBe(true); }
            else throw new Error('limite atteinte sur une petite grille');
        }
        expect(solved).toBeGreaterThan(CASES / 2); expect(none).toBeGreaterThan(0);
    });
    test(`S-PROP-05 ${String(CASES)} positions de partie : l’indice logique place toujours la bonne valeur`, () => {
        const random = new Random(31);
        for (let k = 0; k < CASES; k++) {
            const p = level(k % 30), values = p.givens.map((v, i) => v || (random.next() < .4 ? p.solution[i] ?? 0 : 0));
            if (values.every(v => v)) continue;
            const hint = hintFor(p, values);
            expect(hint?.kind).toBe('logic');
            expect(hint?.value).toBe(p.solution[hint?.index ?? 0]);
            const chain = deduce(p, values);
            expect(chain?.[chain.length - 1]?.kind).toBe('place');
        }
    });
});

describe('partie, score et vignette', () => {
    test('S-GAME-01 étoiles et score : erreurs et indices comptent, le chrono jamais', () => {
        const p = level(0);
        const won = (mistakes: number, hintsUsed: number, elapsedMs: number): SudokuState => ({ ...createState(p), values: [...p.solution], status: 'won', mistakes, hintsUsed, elapsedMs });
        expect(stars(won(0, 0, 0))).toBe(3); expect(stars(won(1, 1, 0))).toBe(2); expect(stars(won(2, 1, 0))).toBe(1);
        expect(score(p, won(0, 0, 10))).toBe(score(p, won(0, 0, 10_000_000)));
        expect(score(p, won(1, 0, 0))).toBeLessThan(score(p, won(0, 0, 0)));
        expect(score(p, createState(p))).toBe(0);
    });
    test('S-GAME-02 grille du jour et grille infinie : générées, uniques, reprise', () => {
        const game = new SudokuGame();
        game.loadGenerated('daily', 20261111);
        expect(game.record.origin).toBe('generated'); expect(game.record.seed).toBe(20261111);
        expect(provedUnique(game.puzzle)).toEqual(game.puzzle.solution);
        game.select(game.puzzle.givens.indexOf(0)); game.input(3, true);
        const saved = JSON.parse(JSON.stringify(game.state)) as unknown;
        const again = new SudokuGame(); again.loadGenerated('daily', 20261111);
        expect(again.resume(saved)).toBe(true);
        expect(again.state.notes).toEqual(game.state.notes);
        again.loadGenerated('endless', 7919);
        expect(again.resume(saved)).toBe(false);
    });
    test('S-GAME-03 le texte des grilles relit exactement les données', () => {
        for (const g of GRIDS) expect(gridText(geometry(g.grid.split('/').length as Size), parseGrid(g.grid))).toBe(g.grid);
        // dig() keeps uniqueness at every removal (spot check on a fixed seed).
        const random = new Random(3), solution = fullGrid(9, random), givens = dig(9, solution, random, 22, 'mirror');
        expect(provedUnique({ ...geometry(9), givens })).toEqual(solution);
    });
});
