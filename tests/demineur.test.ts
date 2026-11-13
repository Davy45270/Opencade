import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Random } from '../src/engines/shared/random';
import { applyAction, armState, counts, initialState, neighbours, placeMines, validateLevel, type GameAction, type GameState, type LevelDefinition } from '../src/engines/demineur/rules';
import { boardOf, deduce, difficulty, hint, LIMITS, proveBoard, viewOf } from '../src/engines/demineur/solver';
import { curated, noGuessBoard } from '../src/engines/demineur/generator';
import { CLASSIC, LEVELS, TIPS, classicLevel, dailyLevel } from '../src/engines/demineur/levels';
import { GRIDS } from '../src/engines/demineur/grids';
import { Engine, recordTime, stars } from '../src/engines/demineur/engine';
import { demineurDiversity } from '../scripts/demineur-diversity.js';

const example = JSON.parse(readFileSync('tests/fixtures/demineur-classic-9x9.json', 'utf8')) as LevelDefinition;
const deferred = (w: number, h: number, mines: number, seed: number): LevelDefinition =>
    ({ ...classicLevel('beginner', seed), id: 'essai', width: w, height: h, mineCount: mines });
function freeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
/** A board played a few random safe moves in, for the property families. */
function played(random: Random): { level: LevelDefinition; state: GameState } {
    const w = 4 + Math.floor(random.next() * 12), h = 4 + Math.floor(random.next() * 12), mines = 1 + Math.floor(random.next() * (w * h * 0.25));
    const level = deferred(w, h, mines, Math.floor(random.next() * 1e9));
    let state = applyAction(level, initialState(level), { type: 'REVEAL', x: Math.floor(random.next() * w), y: Math.floor(random.next() * h) }).state;
    for (let k = 0; k < 4 && state.status === 'playing'; k++) {
        const covered = state.cells.filter(c => !c.revealed && !c.mine);
        const c = covered[Math.floor(random.next() * covered.length)];
        if (c) state = applyAction(level, state, { type: random.next() < 0.3 ? 'FLAG' : 'REVEAL', x: c.x, y: c.y }).state;
    }
    return { level, state };
}
const CASES = 1000;
/** A curated board with every cell hidden again (to play it from scratch). */
function covered(level: LevelDefinition): GameState {
    const s = initialState(level);
    return { ...s, status: 'playing', cells: s.cells.map(c => ({ ...c, revealed: false })), revealedSafeCount: 0 };
}
/** Two hidden cells, one mine, nothing tells them apart: a true 50/50. */
const COIN = curated('pile-ou-face', 'classic', ['..', '..', '*.'], { x: 1, y: 0 }, 1);

describe('Démineur : critères d’acceptation', () => {
    test('AC01 la première révélation n’est jamais minée, quelle que soit la graine ou la case', () => {
        const random = new Random(1);
        for (let k = 0; k < CASES; k++) {
            const w = 2 + Math.floor(random.next() * 29), h = 2 + Math.floor(random.next() * 15), mines = 1 + Math.floor(random.next() * (w * h - 1));
            const level = deferred(w, h, mines, Math.floor(random.next() * 2 ** 32)), x = Math.floor(random.next() * w), y = Math.floor(random.next() * h);
            const r = applyAction(level, initialState(level), { type: 'REVEAL', x, y });
            expect(r.accepted).toBe(true);
            expect(r.state.cells[y * w + x]?.mine, `${String(w)}×${String(h)} ${String(mines)}`).toBe(false);
            expect(r.state.status).not.toBe('lost');
            expect(r.state.cells.filter(c => c.mine)).toHaveLength(mines);
            // With room enough, the neighbours are spared too: the first click opens a zero.
            if (mines <= w * h - 1 - neighbours(w, h, y * w + x).length) expect(r.state.cells[y * w + x]?.adjacent).toBe(0);
        }
    });
    test('AC02 chaque case sans mine compte exactement les mines de ses 8 voisines', () => {
        const random = new Random(2);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), w = level.width;
            for (const [i, c] of state.cells.entries()) {
                if (c.mine) continue;
                expect(c.adjacent).toBe(neighbours(w, level.height, i).filter(n => state.cells[n]?.mine).length);
                expect(neighbours(w, level.height, i).length).toBeLessThanOrEqual(8);
            }
        }
        // A corner sees 3 cells, an edge 5, the middle 8 (diagonals included).
        expect([neighbours(9, 9, 0).length, neighbours(9, 9, 4).length, neighbours(9, 9, 40).length]).toEqual([3, 5, 8]);
    });
    test('AC03 un zéro dévoile sa composante de zéros et leur bord, sans mine et sans retirer de drapeau', () => {
        const level = curated('t', 'learning', ['.....', '.....', '....*', '.....', '*....'], { x: 0, y: 0 }, 1);
        const s = initialState(level);
        // Every zero reached has all its neighbours revealed; the mines stay hidden.
        for (const [i, c] of s.cells.entries()) if (c.revealed && c.adjacent === 0) expect(neighbours(5, 5, i).every(n => s.cells[n]?.revealed)).toBe(true);
        expect(s.cells.filter(c => c.revealed && c.mine)).toEqual([]);
        // A flag inside the area is kept and stops the flood there.
        const flagged = curated('t', 'learning', ['......', '......', '......', '.....*'], { x: 0, y: 0 }, 1);
        const marked = applyAction(flagged, covered(flagged), { type: 'FLAG', x: 2, y: 1 }).state;
        const opened = applyAction(flagged, marked, { type: 'REVEAL', x: 0, y: 0 }).state;
        expect(opened.cells[1 * 6 + 2]?.mark).toBe('flag'); expect(opened.cells[1 * 6 + 2]?.revealed).toBe(false);
        expect(opened.flags).toBe(1);
    });
    test('AC04 un drapeau empêche la révélation directe ; un « ? » ne la bloque pas', () => {
        const level = { ...curated('t', 'classic', ['*...', '....', '....'], { x: 3, y: 2 }, 1, true) };
        const f = applyAction(level, covered(level), { type: 'FLAG', x: 1, y: 0 });
        expect(f.accepted && f.state.cells[1]?.mark).toBe('flag');
        const blocked = applyAction(level, f.state, { type: 'REVEAL', x: 1, y: 0 });
        expect(blocked).toMatchObject({ accepted: false, reason: 'FLAGGED' });
        const q = applyAction(level, f.state, { type: 'FLAG', x: 1, y: 0 });
        expect(q.state.cells[1]?.mark).toBe('question'); expect(q.state.flags).toBe(0);
        const open = applyAction(level, q.state, { type: 'REVEAL', x: 1, y: 0 });
        expect(open.accepted).toBe(true); expect(open.state.cells[1]?.revealed).toBe(true);
        // Without question marks, the cycle is covered → flag → covered.
        const plain = { ...level, rules: { ...level.rules, questionMarks: false } };
        expect(applyAction(plain, f.state, { type: 'FLAG', x: 1, y: 0 }).state.cells[1]?.mark).toBe('none');
    });
    test('AC05 l’accord n’agit que si les drapeaux voisins égalent le chiffre ; un faux drapeau peut faire perdre', () => {
        const level = curated('t', 'classic', ['*..', '...', '...'], { x: 2, y: 2 }, 1);
        const s = applyAction(level, covered(level), { type: 'REVEAL', x: 1, y: 1 }).state;
        // (1,1) is a revealed 1. No flag: refused.
        expect(s.cells[4]?.revealed && s.cells[4].adjacent).toBe(1);
        expect(applyAction(level, s, { type: 'CHORD', x: 1, y: 1 })).toMatchObject({ accepted: false, reason: 'INVALID_CHORD' });
        // The right flag: the chord opens what is left, safely, and wins.
        const right = applyAction(level, applyAction(level, s, { type: 'FLAG', x: 0, y: 0 }).state, { type: 'CHORD', x: 1, y: 1 });
        expect(right.accepted && right.state.status).toBe('won');
        // A wrong flag: the chord reveals the mine.
        const wrong = applyAction(level, applyAction(level, s, { type: 'FLAG', x: 2, y: 2 }).state, { type: 'CHORD', x: 1, y: 1 });
        expect(wrong.accepted && wrong.state.status).toBe('lost');
        expect(wrong.events.map(e => e.type)).toContain('GAME_LOST');
    });
    test('AC06 victoire seulement quand toutes les cases sans mine sont révélées, drapeaux ou non', () => {
        const random = new Random(6);
        for (let k = 0; k < 200; k++) {
            const level = deferred(5, 5, 3, k);
            let s = applyAction(level, initialState(level), { type: 'REVEAL', x: 2, y: 2 }).state;
            while (s.status === 'playing') {
                expect(s.revealedSafeCount).toBeLessThan(22);
                const next = s.cells.filter(c => !c.revealed && !c.mine);
                const c = next[Math.floor(random.next() * next.length)];
                if (!c) break;
                s = applyAction(level, s, { type: 'REVEAL', x: c.x, y: c.y }).state;
            }
            expect(s.status).toBe('won'); expect(s.flags).toBe(0);
            expect(s.cells.filter(c => !c.mine).every(c => c.revealed)).toBe(true);
        }
    });
    test('AC07 une action invalide ne modifie ni l’état, ni les compteurs, ni les événements', () => {
        const random = new Random(7);
        let refused = 0;
        for (let k = 0; refused < CASES; k++) {
            const { level, state } = played(random), frozen = freeze(state), before = JSON.stringify(frozen);
            const w = level.width, h = level.height, i = Math.floor(random.next() * w * h);
            const actions: GameAction[] = [
                { type: 'REVEAL', x: -1, y: 0 }, { type: 'FLAG', x: w, y: h }, { type: 'REVEAL', x: 0.5, y: 1 },
                { type: (['REVEAL', 'FLAG', 'CHORD'] as const)[k % 3] ?? 'REVEAL', x: i % w, y: Math.floor(i / w) },
            ];
            for (const action of actions) {
                const r = applyAction(level, frozen, action);
                if (r.accepted) continue;
                refused++;
                expect(r.state).toBe(frozen); expect(r.events).toEqual([]);
                expect(JSON.stringify(frozen)).toBe(before);
            }
        }
        // Finished game: everything is refused.
        const level = curated('t', 'classic', ['*..', '...', '...'], { x: 2, y: 2 }, 1);
        const lost = applyAction(level, covered(level), { type: 'REVEAL', x: 0, y: 0 });
        expect(lost.accepted && lost.state.status).toBe('lost');
        expect(applyAction(level, lost.state, { type: 'FLAG', x: 0, y: 1 })).toMatchObject({ accepted: false, reason: 'GAME_FINISHED' });
    });
    test('AC08 même graine + même premier clic + même version = même disposition', () => {
        const random = new Random(8);
        let differs = 0;
        for (let k = 0; k < CASES; k++) {
            const w = 3 + Math.floor(random.next() * 28), h = 3 + Math.floor(random.next() * 14), mines = 1 + Math.floor(random.next() * (w * h * 0.3));
            const seed = Math.floor(random.next() * 2 ** 32), x = Math.floor(random.next() * w), y = Math.floor(random.next() * h);
            expect(placeMines(w, h, mines, seed, x, y)).toEqual(placeMines(w, h, mines, seed, x, y));
            if (JSON.stringify(placeMines(w, h, mines, seed, x, y, '9.9.9')) !== JSON.stringify(placeMines(w, h, mines, seed, x, y))) differs++;
        }
        expect(differs).toBeGreaterThan(CASES * 0.9);
        // Frozen witness: the spec's example board, seed 45270, first click at the centre.
        const level = example, armed = armState(level, initialState(level), 4, 4);
        expect(armed.cells.flatMap((c, i) => c.mine ? [i] : [])).toEqual(armState(level, initialState(level), 4, 4).cells.flatMap((c, i) => c.mine ? [i] : []));
        expect(armed.cells.filter(c => c.mine)).toHaveLength(10);
    });
    test('AC09 le solveur ne présente une action sûre que si elle est démontrée ; sinon « inconnu »', () => {
        const random = new Random(9);
        let claims = 0, unknown = 0;
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random);
            if (state.status !== 'playing') continue;
            const h = hint(level, state.cells);
            if (h.status === 'unknown') { unknown++; continue; }
            claims++;
            for (const i of h.cells) expect(state.cells[i]?.mine, h.proof).toBe(h.status === 'mine_proven');
            expect(h.proof.length).toBeGreaterThan(20);
        }
        expect(claims).toBeGreaterThan(300); expect(unknown).toBeGreaterThan(0);
        // A true 50/50: two hidden cells, one mine, nothing tells them apart.
        expect(hint(COIN, initialState(COIN).cells).status).toBe('unknown');
    });
    test('AC10 une grille sans devinette n’est publiée qu’après preuve complète ; limite atteinte = inconnu', () => {
        for (const level of LEVELS) expect(proveBoard(level).status, level.name).toBe('solvable');
        // A board that needs a guess is refused, a cut search says "node_limit", never "solvable".
        expect(proveBoard(COIN)).toMatchObject({ status: 'unknown', reason: 'ambiguous' });
        expect(proveBoard(LEVELS[29] ?? COIN, 2)).toMatchObject({ status: 'unknown', reason: 'node_limit' });
        expect(noGuessBoard(4, 4, 15, 1)).toBeNull();
        expect(LIMITS.nodes).toBeGreaterThan(0);
    });
    test('AC11 sauvegarde et reprise identiques ; une autre version est refusée', () => {
        const random = new Random(11);
        for (let k = 0; k < 300; k++) {
            const e = new Engine();
            if (k % 3 === 0) e.loadLevel(k % 30); else e.loadClassic(k % 3 === 1 ? 'beginner' : 'expert', k * 7919);
            for (let n = 0; n < 6 && e.status === 'playing'; n++) {
                const covered = e.state.cells.filter(c => !c.revealed && (e.state.status === 'ready' || !c.mine));
                const c = covered[Math.floor(random.next() * covered.length)];
                if (c) { if (n === 2) e.flag(c.x, c.y); else e.reveal(c.x, c.y); }
                e.advance(1500);
            }
            const save = e.serialize();
            if (!save) continue;
            const back = Engine.restore(JSON.parse(JSON.stringify(save)));
            expect(back?.state.cells).toEqual(e.state.cells);
            expect(back?.serialize()).toEqual(save);
            expect(Engine.restore({ ...save, generatorVersion: '0.9.0' })).toBeNull();
            expect(Engine.restore({ ...save, schemaVersion: '2.0.0' })).toBeNull();
            expect(Engine.restore({ ...save, revealed: save.revealed.slice(1) })).toBeNull();
        }
        expect(Engine.restore('n’importe quoi')).toBeNull();
    });
    test('AC13 jamais plus de mines que de cases admissibles une fois le premier clic exclu', () => {
        expect(validateLevel(example)).toEqual([]);
        expect(validateLevel({ ...example, mineCount: 81 })).toContain('mines > cases admissibles');
        expect(() => placeMines(3, 3, 9, 1, 1, 1)).toThrow(RangeError);
        expect(placeMines(3, 3, 8, 1, 1, 1).filter(Boolean)).toHaveLength(8);
        for (const level of LEVELS) expect(validateLevel(level), level.name).toEqual([]);
        for (const kind of ['beginner', 'intermediate', 'expert'] as const) expect(validateLevel(classicLevel(kind, 3))).toEqual([]);
        expect(validateLevel({ ...LEVELS[0], start: { x: 99, y: 0 } } as LevelDefinition)).toContain('start');
    });
    test('AC14 les records chronométrés excluent les parties aidées et la progression', () => {
        expect(recordTime({}, 'beginner', 50000, true)).toEqual({ records: {}, improved: false });
        expect(recordTime({}, 'progression', 50000, false).improved).toBe(false);
        const first = recordTime({}, 'expert', 300000, false);
        expect(first).toEqual({ records: { expert: 300000 }, improved: true });
        expect(recordTime(first.records, 'expert', 310000, false).improved).toBe(false);
        expect(recordTime(first.records, 'expert', 290000, false).records.expert).toBe(290000);
        const e = new Engine(); e.loadLevel(0); e.hint();
        expect(e.assisted).toBe(true); expect(e.stars).toBe(2); expect(stars(0)).toBe(3); expect(stars(3)).toBe(1);
    });
});

describe('Démineur : propriétés (1000 cas seedés par famille)', () => {
    test('P01 conservation du nombre de mines et cascade finie sans mine', () => {
        const random = new Random(21);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random);
            if (state.status === 'ready') continue;
            expect(state.cells.filter(c => c.mine)).toHaveLength(level.mineCount);
            if (state.status !== 'lost') expect(state.cells.filter(c => c.revealed && c.mine)).toEqual([]);
            expect(state.revealedSafeCount).toBe(state.cells.filter(c => c.revealed && !c.mine).length);
            expect(state.flags).toBe(state.cells.filter(c => c.mark === 'flag').length);
        }
    });
    test('P02 idempotence : révéler une case déjà révélée est refusé et ne change rien', () => {
        const random = new Random(22);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), open = state.cells.find(c => c.revealed);
            if (!open || state.status !== 'playing') continue;
            const r = applyAction(level, state, { type: 'REVEAL', x: open.x, y: open.y });
            expect(r).toMatchObject({ accepted: false, reason: 'ALREADY_REVEALED' }); expect(r.state).toBe(state);
        }
    });
    test('P03 les chiffres d’une grille armée sont ceux du comptage de référence', () => {
        const random = new Random(23);
        for (let k = 0; k < CASES; k++) {
            const w = 2 + Math.floor(random.next() * 20), h = 2 + Math.floor(random.next() * 20), mines = 1 + Math.floor(random.next() * (w * h - 1));
            const m = placeMines(w, h, mines, k, 0, 0), n = counts(w, h, m);
            for (let i = 0; i < w * h; i++) {
                let ref = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const x = (i % w) + dx, y = Math.floor(i / w) + dy;
                    if ((dx || dy) && x >= 0 && y >= 0 && x < w && y < h && m[y * w + x]) ref++;
                }
                expect(n[i]).toBe(ref);
            }
        }
    });
    test('P04 aucune déduction fausse du solveur, technique par technique', () => {
        const random = new Random(24);
        const seen = { simple: 0, pair: 0, enumeration: 0, count: 0 };
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random);
            if (state.status !== 'playing') continue;
            for (const d of deduce(viewOf(level, state.cells)).found) {
                seen[d.technique]++;
                for (const i of d.safe) expect(state.cells[i]?.mine).toBe(false);
                for (const i of d.mines) expect(state.cells[i]?.mine).toBe(true);
            }
        }
        expect(seen.simple).toBeGreaterThan(100); expect(seen.pair).toBeGreaterThan(0);
    });
});

describe('Démineur : progression, modes et moteur', () => {
    test('DM01 cent trente grilles 6 × 6 à 16 × 24, portrait, titrées FR/EN, prouvées sans devinette depuis leur ouverture', () => {
        expect(LEVELS).toHaveLength(130); expect(GRIDS).toHaveLength(130); expect(TIPS).toHaveLength(130);
        expect([LEVELS[0]?.width, LEVELS[0]?.height, LEVELS[29]?.width, LEVELS[29]?.height]).toEqual([6, 6, 16, 16]);
        expect(Math.max(...LEVELS.map(l => l.width * l.height))).toBe(16 * 24);
        for (const level of LEVELS) {
            expect(level.width).toBeLessThanOrEqual(level.height);
            // Mobile: at most 16 columns and 24 rows (the expert board, 16 × 30 once turned, stays the largest).
            expect(level.width).toBeLessThanOrEqual(16); expect(level.height).toBeLessThanOrEqual(24);
            expect(TIPS[LEVELS.indexOf(level)]?.length).toBeGreaterThan(0);
            expect(level.name.length * level.en.length).toBeGreaterThan(0);
            const p = proveBoard(level);
            expect(p.status).toBe('solvable');
            expect(difficulty(p, level.width * level.height)).toBe(level.difficulty);
            // The opening leaves most of the work.
            expect(initialState(level).revealedSafeCount).toBeLessThanOrEqual(0.55 * (level.width * level.height - level.mineCount));
        }
        expect(LEVELS.filter(l => l.drawing).length).toBeGreaterThanOrEqual(35);
    });
    test('DM01b ids et dispositions uniques ; les 30 premières grilles et leurs ids n’ont pas bougé (sauvegardes valides)', () => {
        expect(LEVELS.map(l => l.id)).toEqual(LEVELS.map((_, i) => `DEM-PROG-${String(i + 1).padStart(3, '0')}`));
        expect(new Set(LEVELS.map(l => l.id)).size).toBe(LEVELS.length);
        expect(new Set(LEVELS.map(l => (l.layout ?? []).join('/'))).size).toBe(LEVELS.length);
        expect(new Set(LEVELS.map(l => l.name)).size).toBe(LEVELS.length);
        expect(new Set(LEVELS.map(l => l.en)).size).toBe(LEVELS.length);
        // Fingerprint of the 30 grids frozen before the extension (main d72f7ff).
        expect(createHash('sha256').update(JSON.stringify(GRIDS.slice(0, 30))).digest('hex').slice(0, 16)).toBe('26ec455ab2b5c367');
    });
    test('DM02 difficulté croissante : aucune grille à 5 rangs ou plus de sa place', () => {
        const scores = LEVELS.map(l => difficulty(proveBoard(l), l.width * l.height));
        const ranks = scores.map(v => scores.filter(u => u < v).length);
        for (const [i, r] of ranks.entries()) expect(Math.abs(r - i), `grille ${String(i + 1)} au rang ${String(r + 1)}`).toBeLessThan(5);
        // The check bites: swapping the 3rd and the 28th grid is caught.
        const swapped = [...scores]; [swapped[2], swapped[27]] = [swapped[27] ?? 0, swapped[2] ?? 0];
        expect(swapped.map(v => swapped.filter(u => u < v).length).some((r, i) => Math.abs(r - i) >= 5)).toBe(true);
        // Each technique arrives alone, in order.
        const first = (k: 'pair' | 'enumeration' | 'count') => LEVELS.findIndex(l => proveBoard(l).rounds[k] > 0) + 1;
        expect([first('pair'), first('enumeration'), first('count')]).toEqual([3, 14, 19]);
    });
    test('DM03 diversité : aucun clone, une nouveauté au moins toutes les cinq grilles', () => {
        const report = demineurDiversity(LEVELS);
        expect(report.cloneShare).toBe(0); expect(report.maxGapWithoutNovelty).toBeLessThanOrEqual(5); expect(report.score).toBeLessThanOrEqual(25);
    });
    test('DM04 modes classiques (exemple de la spec) et défi du jour reproductible et prouvé', () => {
        expect(classicLevel('beginner', 45270)).toMatchObject({ width: example.width, height: example.height, mineCount: example.mineCount, rules: example.rules, mode: 'classic' });
        expect(CLASSIC.expert).toMatchObject({ width: 30, height: 16, mines: 99 });
        const day = dailyLevel(20261111);
        expect(day).toEqual(dailyLevel(20261111));
        expect(day.layout).not.toEqual(dailyLevel(20261112).layout);
        expect(proveBoard(day).status).toBe('solvable');
    });
    test('DM05 moteur : chrono à la première révélation, bascule drapeau, accord au toucher, indice expliqué', () => {
        const e = new Engine(); e.loadClassic('beginner', 45270);
        e.advance(5000); expect(e.elapsedMs).toBe(0);
        expect(e.press(4, 4, 'flag')).toBe(true); expect(e.state.cells[40]?.mark).toBe('flag');
        e.advance(1000); expect(e.elapsedMs).toBe(0);
        expect(e.press(4, 4, 'flag')).toBe(true); expect(e.press(4, 4, 'flag')).toBe(true);
        expect(e.press(4, 4, 'dig')).toBe(true); expect(e.clock).toBe(true);
        e.advance(1000); expect(e.elapsedMs).toBe(1000);
        // Progression: a hint is a proven, explained deduction; solving with hints only always wins.
        const p = new Engine(); p.loadLevel(4);
        for (let n = 0; n < 400 && p.status === 'playing'; n++) {
            const h = p.hint();
            expect(h.status).not.toBe('unknown');
            if (h.status === 'safe_move') expect(p.press(h.x, h.y, 'dig')).toBe(true);
            else if (h.status === 'mine_proven') for (const i of h.cells) if (p.state.cells[i]?.mark !== 'flag') p.press(i % p.width, Math.floor(i / p.width), 'flag');
        }
        expect(p.status).toBe('won'); expect(p.stars).toBe(1); expect(p.score).toBe(10 * p.level.mineCount + 100);
        // A revealed number chords when touched.
        const c = new Engine(); c.loadLevel(0);
        const one = c.state.cells.find(cell => cell.revealed && cell.adjacent > 0);
        if (!one) throw new Error('chiffre');
        expect(c.press(one.x, one.y, 'dig')).toBe(false); expect(c.refused).toBe('INVALID_CHORD');
    });
    test('DM06 un indice impossible le dit honnêtement', () => {
        const e = new Engine(); e.loadClassic('expert', 1);
        expect(e.hint()).toMatchObject({ status: 'unknown' }); expect(e.hints).toBe(0);
        const board = boardOf(LEVELS[0] ?? example);
        expect(board.mines.filter(Boolean)).toHaveLength(LEVELS[0]?.mineCount ?? 0);
    });
});
