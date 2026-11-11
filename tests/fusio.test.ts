import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { Random } from '../src/engines/shared/random';
import { DIRECTIONS, applyAction, canMove, initialState, maxTile, mixSeed, slide, validateConfig, validateState, type Direction, type GameConfig, type GameState } from '../src/engines/fusio/rules';
import { CHALLENGES, THEMES, challengeConfig, classicConfig, themeOf } from '../src/engines/fusio/challenges';
import { Engine, LEVELS, stars } from '../src/engines/fusio/engine';
import { bestMove, evaluate, hint, playAgent } from '../src/engines/fusio/solver';
import { createDemo } from '../src/engines/fusio/demo';
import { BUTTON_DIRECTIONS, keyAction, swipe } from '../src/games/fusio/controls';
import { fusioDiversity } from '../scripts/fusio-diversity.js';

const example = JSON.parse(readFileSync('tests/fixtures/fusio-classic-4x4.json', 'utf8')) as GameConfig;
const base = (o: Partial<GameConfig> = {}): GameConfig => ({ ...classicConfig(1), continueAfterWin: false, ...o });
/** A one-row board (the other rows empty) on a 4 × 4: easy to read moves. */
const row = (values: number[]): number[] => [...values, ...new Array<number>(12).fill(0)];
const at = (config: GameConfig, board: number[], extra: Partial<GameState> = {}): GameState => ({ ...initialState(config), board, ...extra });
const sum = (b: readonly number[]): number => b.reduce((a, v) => a + v, 0);
function freeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
const CASES = 1000;
/** A random board for a random config: sizes 4–6, some walls, density 0–90 %, values 2–1024. */
function randomCase(random: Random): { config: GameConfig; state: GameState } {
    const size = [4, 5, 6][Math.floor(random.next() * 3)] as 4 | 5 | 6, n = size * size;
    const walls = random.next() < 0.4 ? [...new Set(Array.from({ length: 1 + Math.floor(random.next() * 3) }, () => Math.floor(random.next() * n)))] : undefined;
    const config = base({ size, walls, seed: Math.floor(random.next() * 2 ** 32), spawnWeights: random.next() < 0.3 ? { '2': 50, '4': 50 } : { '2': 90, '4': 10 } });
    const density = random.next() * 0.9;
    const board = Array.from({ length: n }, (_, i) => walls?.includes(i) || random.next() > density ? 0 : 2 ** (1 + Math.floor(random.next() * 10)));
    return { config, state: at(config, board, { prngState: Math.floor(random.next() * 2 ** 32) }) };
}
const move = (config: GameConfig, state: GameState, direction: Direction) => applyAction(config, state, { type: 'MOVE', direction });

describe('Fusio : critères d’acceptation', () => {
    test('AC01 [2,2,2,2] vers la gauche donne [4,4,0,0] et +8, sans seconde fusion', () => {
        const c = base(), r = move(c, at(c, row([2, 2, 2, 2])), 'left');
        expect(r.accepted).toBe(true);
        if (!r.accepted) return;
        expect(r.state.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
        expect(r.state.score).toBe(8);
        expect(r.events.filter(e => e.type === 'TILE_MERGED')).toHaveLength(2);
    });
    test('AC02 [4,4,8,0] vers la gauche donne [8,8,0,0] et +8', () => {
        const c = base(), r = slide(row([4, 4, 8, 0]), 4, 'left');
        expect(r.board.slice(0, 4)).toEqual([8, 8, 0, 0]);
        expect(r.gained).toBe(8);
        expect(slide(row([2, 2, 4, 4]), 4, 'right').board.slice(0, 4)).toEqual([0, 0, 4, 8]);
        expect(slide(row([2, 0, 2, 2]), 4, 'left').board.slice(0, 4)).toEqual([4, 2, 0, 0]);
        expect(slide(row([2, 0, 2, 2]), 4, 'right').board.slice(0, 4)).toEqual([0, 0, 2, 4]);
        expect(move(c, at(c, row([4, 4, 8, 0])), 'left').state.score).toBe(8);
    });
    test('AC03 un coup sans changement ne crée rien et ne change ni score, ni coups, ni PRNG', () => {
        const c = base(), s = freeze(at(c, row([2, 4, 8, 16]), { score: 12, moves: 3 }));
        for (const d of ['left', 'right'] as const) {
            const r = move(c, s, d);
            expect(r.accepted).toBe(false);
            if (r.accepted) continue;
            expect(r.reason).toBe('NO_CHANGE'); expect(r.state).toBe(s); expect(r.events).toEqual([]);
        }
    });
    test('AC04 un coup valide crée exactement une tuile, 2 ou 4, dans une case libre', () => {
        const random = new Random(4);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), d = DIRECTIONS[k % 4] ?? 'left';
            const s = slide(state.board, config.size, d, config.walls), r = move(config, state, d);
            if (!s.changed) { expect(r.accepted).toBe(false); continue; }
            if (!r.accepted) throw new Error('refusé');
            const born = r.events.filter(e => e.type === 'TILE_SPAWNED');
            expect(born).toHaveLength(1);
            const p = born[0]?.payload as { at: number; value: number };
            expect([2, 4]).toContain(p.value);
            expect(s.board[p.at]).toBe(0);
            expect(config.walls ?? []).not.toContain(p.at);
            expect(r.state.board.filter((v, i) => v !== s.board[i])).toEqual([p.value]);
        }
    });
    test('AC05 même état, même graine, même direction : même résultat', () => {
        const random = new Random(5);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), d = DIRECTIONS[k % 4] ?? 'up';
            expect(move(config, structuredClone(state), d)).toEqual(move(config, structuredClone(state), d));
        }
        expect(initialState(classicConfig(45270))).toEqual(initialState(classicConfig(45270)));
        expect(initialState(classicConfig(45270)).board).not.toEqual(initialState(classicConfig(45271)).board);
    });
    test('AC06 plateau plein sans voisins égaux : perdu ; avec voisins égaux : jouable', () => {
        const c = base();
        const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 0];
        // The last move fills the hole with a value that leaves no pair: the generator decides, so search a state.
        expect(canMove([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 8], 4)).toBe(false);
        expect(canMove([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 8, 8], 4)).toBe(true);
        let lost = 0;
        for (let seed = 0; seed < 200 && !lost; seed++) {
            const s = at(c, [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 0, 8, 2, 4], { prngState: seed });
            const r = move(c, s, 'left');
            if (r.accepted && r.state.status === 'lost') { lost++; expect(r.state.lostBy).toBe('blocked'); expect(r.events.map(e => e.type)).toContain('LOST'); expect(canMove(r.state.board, 4)).toBe(false); }
        }
        expect(lost).toBe(1);
        expect(move(c, at(c, stuck.map(v => v), { status: 'lost' }), 'right')).toMatchObject({ accepted: false, reason: 'GAME_OVER' });
    });
    test('AC07 cible atteinte : gagné ; le classique peut continuer, sans second WON', () => {
        const classic = classicConfig(3), s = at(classic, row([1024, 1024, 0, 0]));
        const r = move(classic, s, 'left');
        if (!r.accepted) throw new Error('refusé');
        expect(r.state.status).toBe('won'); expect(r.events.map(e => e.type)).toContain('WON');
        expect(move(classic, r.state, 'right')).toMatchObject({ accepted: false, reason: 'GAME_OVER' });
        const going = applyAction(classic, r.state, { type: 'CONTINUE' });
        expect(going.accepted).toBe(true);
        expect(going.state.status).toBe('playing'); expect(going.state.endless).toBe(true);
        const twice = move(classic, { ...going.state, board: row([2048, 1024, 1024, 0]) }, 'right');
        expect(twice.events.map(e => e.type)).not.toContain('WON');
        // A challenge stops at the win.
        const ch = challengeConfig(0), w = move(ch, at(ch, row([64, 64, 0, 0])), 'left');
        expect(w.state.status).toBe('won');
        expect(applyAction(ch, w.state, { type: 'CONTINUE' })).toMatchObject({ accepted: false, reason: 'INVALID_ACTION' });
    });
    test('AC08 annuler restaure plateau, score, coups, PRNG et statut ; rejouer donne la même apparition', () => {
        const random = new Random(8);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), d = DIRECTIONS[k % 4] ?? 'down';
            const r = move(config, state, d);
            if (!r.accepted) continue;
            const u = applyAction(config, r.state, { type: 'UNDO' });
            if (!u.accepted) throw new Error('annulation refusée');
            for (const key of ['board', 'score', 'moves', 'prngState', 'status', 'reached'] as const) expect(u.state[key], key).toEqual(state[key]);
            expect(move(config, u.state, d).state.board).toEqual(r.state.board);
        }
        const off = { ...challengeConfig(25) }, s = initialState(off);
        const r = move(off, s, bestMove(off, s.board)?.direction ?? 'left');
        expect(off.undoEnabled).toBe(false);
        expect(applyAction(off, r.state, { type: 'UNDO' })).toMatchObject({ accepted: false, reason: 'UNDO_UNAVAILABLE' });
        expect(applyAction(base(), initialState(base()), { type: 'UNDO' })).toMatchObject({ accepted: false, reason: 'UNDO_UNAVAILABLE' });
    });
    test('AC09 somme des tuiles après le coup = somme avant + valeur de l’apparition', () => {
        const random = new Random(9);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), r = move(config, state, DIRECTIONS[k % 4] ?? 'left');
            if (!r.accepted) continue;
            const born = r.events.find(e => e.type === 'TILE_SPAWNED')?.payload as { value: number } | undefined;
            expect(sum(r.state.board)).toBe(sum(state.board) + (born?.value ?? 0));
        }
    });
    test('AC10 pivoter le plateau et la direction donne le même coup', () => {
        const rotate = (b: readonly number[], n: number): number[] => b.map((_, i) => b[(n - 1 - (i % n)) * n + Math.floor(i / n)] ?? 0);
        const rotIndex = (i: number, n: number): number => (i % n) * n + (n - 1 - Math.floor(i / n));
        const turn: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };
        const random = new Random(10);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), n = config.size, d = DIRECTIONS[k % 4] ?? 'left';
            const walls = (config.walls ?? []).map(i => rotIndex(i, n)).sort((a, b) => a - b);
            expect(rotate(state.board, n).every((v, i) => !walls.includes(i) || v === 0)).toBe(true);
            const a = slide(state.board, n, d, config.walls), b = slide(rotate(state.board, n), n, turn[d], walls);
            expect(b.board).toEqual(rotate(a.board, n)); expect(b.gained).toBe(a.gained); expect(b.changed).toBe(a.changed);
        }
    });
    test('AC11 clavier, glisser et boutons donnent les mêmes directions', () => {
        const keys: Record<Direction, string[]> = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] };
        const swipes: Record<Direction, [number, number]> = { up: [3, -60], down: [-5, 48], left: [-70, 10], right: [40, -12] };
        for (const d of DIRECTIONS) {
            for (const code of keys[d]) expect(keyAction({ code })).toEqual({ type: 'move', direction: d });
            expect(swipe(...swipes[d])).toBe(d);
            expect(Object.entries(BUTTON_DIRECTIONS).filter(([, v]) => v === d)).toHaveLength(1);
        }
        expect(swipe(10, 8)).toBeNull(); expect(swipe(40, 38)).toBeNull(); expect(swipe(-30, 32)).toBeNull();
        expect(keyAction({ code: 'KeyZ', ctrlKey: true })).toEqual({ type: 'undo' });
        expect(keyAction({ code: 'KeyU' })).toEqual({ type: 'undo' }); expect(keyAction({ code: 'KeyH' })).toEqual({ type: 'hint' });
        expect(keyAction({ code: 'KeyW', ctrlKey: true })).toBeNull();
        // The three ways reach the same engine call: the same move on the same state gives the same state.
        const c = classicConfig(11), s = initialState(c);
        const viaKey = keyAction({ code: 'ArrowLeft' }), viaSwipe = swipe(-50, 4), viaButton = BUTTON_DIRECTIONS['fusio-left'];
        if (viaKey?.type !== 'move' || !viaSwipe || !viaButton) throw new Error('entrée');
        expect(move(c, s, viaKey.direction)).toEqual(move(c, s, viaSwipe)); expect(move(c, s, viaSwipe)).toEqual(move(c, s, viaButton));
    });
    test('AC12 sauvegarde et reprise préservent tout l’état et les versions', () => {
        const e = new Engine(); e.loadChallenge(6);
        for (let k = 0; k < 40; k++) { const d = e.nextMove(); if (d) e.move(d); }
        e.undo(); e.hint();
        const save = JSON.parse(JSON.stringify(e.serialize())) as unknown;
        const back = Engine.restore(save);
        expect(back?.snapshot()).toEqual({ ...e.snapshot(), hint: null, events: [], refused: null });
        expect(back?.state).toEqual(e.state);
        // Replaying from the restored game gives the same spawns.
        const d = e.nextMove() ?? 'left'; e.move(d); back?.move(d);
        expect(back?.state.board).toEqual(e.state.board);
        for (const broken of [{ ...e.serialize(), engineVersion: '0.9.0' }, { ...e.serialize(), state: { ...e.state, board: [3, ...e.state.board.slice(1)] } }, { ...e.serialize(), state: { ...e.state, board: e.state.board.slice(1) } }, { ...e.serialize(), kind: 'enfant' }, null, 'x'])
            expect(Engine.restore(broken)).toBeNull();
    });
    test('AC14 pas de chrono imposé, indices facultatifs, aucune collecte de données', () => {
        for (let i = 0; i < CHALLENGES.length; i++) expect(challengeConfig(i).timerSeconds).toBeNull();
        expect(classicConfig(1).timerSeconds).toBeNull();
        // Won without a single hint by the agent's own play.
        const e = new Engine(); e.loadChallenge(0);
        while (e.status === 'playing') { const d = e.nextMove(); if (!d) break; e.move(d); }
        expect(e.status).toBe('won'); expect(e.hints).toBe(0); expect(e.stars).toBe(3);
        const sources = ['src/engines/fusio', 'src/games/fusio'].flatMap(dir => readdirSync(dir).map(f => readFileSync(`${dir}/${f}`, 'utf8')));
        for (const text of sources) expect(text).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.geolocation/);
    });
    test('AC15 le schéma refuse taille hors 4/5/6, mode inconnu, champ absent ; validation métier des poids, cible et plateau', () => {
        expect(validateConfig(example)).toEqual([]);
        expect(example).toMatchObject({ mode: 'classic', size: 4, target: 2048, seed: 45270 });
        expect(validateConfig({ ...example, size: 3 })).toContain('taille hors 4/5/6');
        expect(validateConfig({ ...example, size: 8 })).toContain('taille hors 4/5/6');
        expect(validateConfig({ ...example, mode: 'zen' })).toContain('mode inconnu');
        for (const key of ['schemaVersion', 'mode', 'size', 'target', 'seed', 'spawnWeights'] as const) {
            const partial = Object.fromEntries(Object.entries(example).filter(([k]) => k !== key));
            expect(validateConfig(partial)).toContain(`${key} absent`);
        }
        expect(validateConfig({ ...example, extra: 1 })).toContain('clé inconnue extra');
        expect(validateConfig({ ...example, spawnWeights: { '2': 90, '4': 20 } })).toContain('somme des poids ≠ 100');
        expect(validateConfig({ ...example, target: 1000 })).toContain('cible : puissance de 2 ≥ 128');
        expect(validateConfig({ ...example, target: 64 })).toContain('cible : puissance de 2 ≥ 128');
        expect(validateConfig({ ...example, start: [2, 2] })).toContain('plateau de départ : dimensions');
        expect(validateConfig({ ...example, start: [3, ...new Array<number>(15).fill(0)] })).toContain('plateau de départ : valeurs');
        expect(validateConfig({ ...example, walls: [0], start: [2, ...new Array<number>(15).fill(0)] })).toContain('plateau de départ : tuile sur une case bloquée');
        expect(validateConfig({ ...example, walls: [16] })).toContain('cases bloquées');
        expect(validateState(example, { ...initialState(example), board: [5, ...new Array<number>(15).fill(0)] })).toContain('plateau');
        expect(validateState(example, initialState(example))).toEqual([]);
    });
});

describe('Fusio : propriétés seedées (1000 cas par famille)', () => {
    test('P01 conservation de la somme hors apparition (glisser seul)', () => {
        const random = new Random(101);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random);
            for (const d of DIRECTIONS) expect(sum(slide(state.board, config.size, d, config.walls).board)).toBe(sum(state.board));
        }
    });
    test('P02 une seule fusion par tuile et par coup', () => {
        const random = new Random(102);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), d = DIRECTIONS[k % 4] ?? 'left', r = slide(state.board, config.size, d, config.walls);
            const sources = r.merged.flatMap(m => m.from), targets = r.merged.map(m => m.to);
            expect(new Set(sources).size).toBe(sources.length);
            expect(new Set(targets).size).toBe(targets.length);
            for (const m of r.merged) { expect(state.board[m.from[0]]).toBe(m.value / 2); expect(state.board[m.from[1]]).toBe(m.value / 2); expect(r.board[m.to]).toBe(m.value); }
            expect(r.gained).toBe(r.merged.reduce((a, m) => a + m.value, 0));
            // No produced tile merges again in the same move: the count of tiles drops by exactly the merges.
            expect(r.board.filter(Boolean).length).toBe(state.board.filter(Boolean).length - r.merged.length);
            for (const w of config.walls ?? []) expect(r.board[w]).toBe(0);
        }
    });
    test('P03 aucun spawn, aucun coup compté, PRNG intact sur un coup nul', () => {
        const random = new Random(103);
        let nulls = 0;
        for (let k = 0; nulls < CASES; k++) {
            const { config, state } = randomCase(random), d = DIRECTIONS[k % 4] ?? 'left';
            if (slide(state.board, config.size, d, config.walls).changed) continue;
            nulls++;
            const r = move(config, freeze(state), d);
            expect(r).toEqual({ accepted: false, state, reason: 'NO_CHANGE', events: [] });
            expect(r.state).toBe(state);
        }
    });
    test('P04 annulation exacte, plusieurs coups en arrière', () => {
        const random = new Random(104);
        for (let k = 0; k < CASES; k++) {
            const { config } = randomCase(random);
            let s = initialState(config);
            const trail: GameState[] = [];
            for (let m = 0; m < 6; m++) { const r = move(config, s, DIRECTIONS[Math.floor(random.next() * 4)] ?? 'left'); if (r.accepted) { trail.push(s); s = r.state; } }
            while (trail.length) {
                const u = applyAction(config, s, { type: 'UNDO' }), prev = trail.pop();
                if (!u.accepted || !prev) throw new Error('annulation');
                for (const key of ['board', 'score', 'moves', 'prngState', 'status'] as const) expect(u.state[key]).toEqual(prev[key]);
                s = u.state;
            }
        }
    });
    test('P05 une action refusée ne mute jamais l’état (objets gelés)', () => {
        const random = new Random(105);
        for (let k = 0; k < CASES; k++) {
            const { config, state } = randomCase(random), frozen = freeze(structuredClone(state));
            for (const action of [{ type: 'MOVE', direction: DIRECTIONS[k % 4] ?? 'up' }, { type: 'UNDO' }, { type: 'CONTINUE' }, { type: 'MOVE', direction: 'diagonal' }] as const) {
                const r = applyAction(config, frozen, action as Parameters<typeof applyAction>[2]);
                if (!r.accepted) { expect(r.state).toBe(frozen); expect(r.events).toEqual([]); }
            }
        }
    });
});

describe('Fusio : défis, agent, moteur', () => {
    test('FU01 trente défis valides, titres FR/EN, graines uniques, six thèmes de cinq', () => {
        expect(CHALLENGES).toHaveLength(30); expect(LEVELS).toBe(CHALLENGES);
        expect(new Set(CHALLENGES.map(c => c.seed)).size).toBe(30);
        expect(new Set(CHALLENGES.map(c => c.name)).size).toBe(30);
        for (const [i, c] of CHALLENGES.entries()) {
            expect(validateConfig(challengeConfig(i)), c.name).toEqual([]);
            expect(c.name.length).toBeGreaterThan(2); expect(c.en.length).toBeGreaterThan(2); expect(c.tip.length).toBeGreaterThan(10);
            expect(c.difficulty).toBeGreaterThanOrEqual(0); expect(c.difficulty).toBeLessThan(100);
        }
        expect(THEMES.map((t, k) => [0, 1, 2, 3, 4].every(j => themeOf(5 * k + j) === t))).toEqual(THEMES.map(() => true));
        // Undo disappears at challenge 21 and stays off.
        expect(CHALLENGES.map((_, i) => challengeConfig(i).undoEnabled)).toEqual(CHALLENGES.map((_, i) => i < 20));
    });
    test('FU02 la difficulté mesurée ne recule pas nettement sur cinq rangs (et le test sait échouer)', () => {
        const regress = (d: readonly number[]): number[] => d.flatMap((v, j) => d.slice(0, Math.max(0, j - 4)).some(u => v < u - 10) ? [j + 1] : []);
        const measured = CHALLENGES.map(c => c.difficulty);
        expect(regress(measured)).toEqual([]);
        expect(measured[29]).toBeGreaterThan(measured[0] ?? 0);
        // A swap of the first and last challenges must be caught.
        const swapped = [...measured]; [swapped[0], swapped[29]] = [swapped[29] ?? 0, swapped[0] ?? 0];
        expect(regress(swapped).length).toBeGreaterThan(0);
    });
    test('FU03 diversité : aucun clone, une nouveauté au moins tous les cinq défis', () => {
        const r = fusioDiversity(CHALLENGES);
        expect(r.cloneShare).toBe(0); expect(r.maxGapWithoutNovelty).toBeLessThanOrEqual(5); expect(r.score).toBeLessThanOrEqual(25);
    });
    test('FU04 même graine et mêmes coups : même partie (instantanés figés)', () => {
        const seq: Direction[] = ['left', 'down', 'right', 'down', 'left', 'up'];
        const play = (config: GameConfig) => {
            let s = initialState(config);
            for (let k = 0; k < 150 && s.status === 'playing'; k++) s = move(config, s, seq[k % seq.length] ?? 'left').state;
            return { board: s.board.join(' '), score: s.score, moves: s.moves, prngState: s.prngState, status: s.status };
        };
        expect(play(classicConfig(45270))).toEqual({ board: '8 4 2 2 2 128 32 8 8 32 8 8 4 16 64 2', score: 1396, moves: 141, prngState: 482120999, status: 'playing' });
        expect(play(classicConfig(1))).toEqual({ board: '2 8 16 2 8 16 64 8 128 32 32 4 2 4 0 0', score: 1428, moves: 144, prngState: 2219206663, status: 'playing' });
        expect(play(challengeConfig(6))).toEqual({ board: '2 4 32 2 0 64 8 0 32 8 0 0 4 8 0 32 2 0 2 0 0 0 0 0 0 0 0 0 0 0 0 128 0 0 2 0', score: 1472, moves: 149, prngState: 3332317300, status: 'playing' });
        expect(play(challengeConfig(12))).toEqual({ board: '2 32 32 4 2 4 128 64 8 4 8 2 32 2 0 256 4 0 0 2 16 0 0 0 0', score: 2028, moves: 144, prngState: 366615093, status: 'playing' });
        expect(mixSeed(0)).not.toBe(mixSeed(1));
    });
    test('FU05 l’agent propose un coup légal et l’explique en une phrase', () => {
        const random = new Random(105);
        let explained = 0;
        for (let k = 0; k < 200; k++) {
            const { config, state } = randomCase(random);
            const h = hint(config, state);
            if (!canMove(state.board, config.size, config.walls)) { expect(h).toBeNull(); continue; }
            if (!h) throw new Error('indice absent');
            expect(slide(state.board, config.size, h.direction, config.walls).changed).toBe(true);
            expect(h.text).toMatch(/^(Un seul coup possible|Glisser vers )/);
            explained++;
        }
        expect(explained).toBeGreaterThan(100);
        // Classic corner case: the big tile in its corner is kept there.
        const c = classicConfig(2), stair = [256, 64, 16, 4, 32, 8, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0], corner = hint(c, at(c, stair));
        expect(corner).not.toBeNull();
        expect(slide(stair, 4, corner?.direction ?? 'down').board[0]).toBe(256);
        expect(corner?.direction).not.toBe('down');
        expect(evaluate([256, 64, 16, 4, 32, 8, 2, 0, 4, 2, 0, 0, 2, 0, 0, 0], 4)).toBeGreaterThan(evaluate([2, 64, 16, 4, 32, 8, 256, 0, 4, 2, 0, 0, 2, 0, 0, 0], 4));
    });
    test('FU06 l’agent sans bruit gagne le défi 1 et le défi 3 (preuve empirique, pas une garantie)', () => {
        for (const i of [0, 2]) {
            const r = playAgent(challengeConfig(i), { depth: 'auto' });
            expect(r.won, `défi ${String(i + 1)}`).toBe(true);
        }
    });
    test('FU07 moteur : étoiles, coups restants, annulations comptées, démo qui redémarre', () => {
        expect([stars(0), stars(1), stars(2), stars(3)]).toEqual([3, 2, 2, 1]);
        const e = new Engine(); e.loadChallenge(5);
        expect(e.movesLeft).toBe(110);
        const d = e.nextMove() ?? 'left'; e.move(d);
        expect(e.movesLeft).toBe(109); expect(e.canUndo).toBe(true);
        e.undo(); expect(e.undos).toBe(1); expect(e.stars).toBe(2);
        e.restart(); expect(e.undos).toBe(0); expect(e.state.moves).toBe(0);
        e.loadClassic(9); expect(e.config).toMatchObject({ mode: 'classic', size: 4, target: 2048, continueAfterWin: true });
        const demo = createDemo();
        const before = maxTile(demo.engine.state.board);
        for (let k = 0; k < 900; k++) demo.step();
        expect(demo.restarts).toBeGreaterThan(0);
        expect(before).toBeLessThanOrEqual(4);
    });
});
