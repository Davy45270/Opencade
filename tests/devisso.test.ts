import { describe, expect, test } from 'vitest';
import { Engine, LEVELS, HEARTS, RESCUE_STEPS, stars } from '../src/engines/devisso/engine';
import { BASE_BUFFER, blocker, initial, legal, parse, stuck, unscrew, won, type LevelDef } from '../src/engines/devisso/rules';
import { layoutProblems } from '../src/engines/devisso/check';
import { NOVELTY, workshopTip } from '../src/engines/devisso/tips';
import { devissoDiversity } from '../scripts/devisso-diversity.js';
const level = (over: Partial<LevelDef>): LevelDef => ({ name: 'Essai', en: 'Test', theme: 'atelier', picture: 'essai', plates: [], colors: '', queue: '', boosts: [1, 1, 1, 1, 1], moves: 0, trap: 0, ...over });
/** Taps screws in order, failing loudly on a refused tap. */
function play(board: ReturnType<typeof parse>, taps: number[]) {
    let s = initial(board);
    for (const i of taps) { const m = unscrew(board, s, i); if (!m) throw new Error(`vis ${String(i)} refusée`); s = m.state; }
    return s;
}
describe('Dévisso : règles', () => {
    test('DV01 une vis libre file dans la boîte de sa couleur, sinon dans la réserve ; trois vis ferment la boîte', () => {
        const b = parse(level({ plates: [['bar3', 0, 0, 0, 0], ['bar3', 0, 2, 0, 1]], colors: 'RRBBBR', queue: 'RB' }));
        let s = initial(b);
        expect(s.slots).toEqual([{ color: 0, filled: 0 }]);
        s = play(b, [2]);
        expect(s.buffer).toEqual([1]);
        s = play(b, [2, 0, 1, 5]);
        // The red box closes, the blue one arrives and takes the buffered blue screw at once.
        expect(s.boxes).toBe(1); expect(s.slots).toEqual([{ color: 1, filled: 1 }]); expect(s.buffer).toEqual([]);
        expect(s.coins).toBe(4 * 10 + 25);
    });
    test('DV02 seule une vis que rien ne recouvre se dévisse ; une plaque sans vis tombe et découvre la suivante', () => {
        const b = parse(level({ plates: [['bar2', 0, 0, 0, 0], ['ring', 0, 0, 1, 1]], colors: 'RRR', queue: 'R' }));
        const s = initial(b);
        expect(blocker(b, s, 0)).toBe('covered'); expect(blocker(b, s, 2)).toBeNull();
        expect(unscrew(b, s, 0)).toBeNull();
        const m = unscrew(b, s, 2); if (!m) throw new Error('vis du dessus');
        expect(m.fell).toEqual([1]); expect(m.events).toContain('fall');
        expect(blocker(b, m.state, 0)).toBeNull();
        expect(won(play(b, [2, 0, 1]))).toBe(true);
    });
    test('DV03 réserve pleine et aucune vis pour la boîte : « Aucun coup possible ! »', () => {
        // Red screws under the top bar, red box first: five other screws fill the buffer, the sixth has no room.
        const b = parse(level({ plates: [['bar3', 0, 0, 0, 0], ['bar6', 0, 0, 1, 1]], colors: 'RRRBBBYYY', queue: 'RBY' }));
        const s = play(b, [3, 4, 5, 6, 7]);
        expect(s.buffer).toHaveLength(BASE_BUFFER);
        expect(legal(b, s)).toEqual([]); expect(stuck(b, s)).toBe(true);
    });
    test('DV04 cadenas et clé, glace, chaîne, caisse', () => {
        const b = parse(level({ plates: [['bar6', 0, 0, 0, 0]], crates: [[5, 2, 2]], colors: 'RRRRRR', queue: 'RR',
            specials: { '0,0': 'key', '1,0': 'lock', '2,0': { ice: 2 }, '3,0': { chain: '4,0' } } }));
        const s = initial(b);
        expect([blocker(b, s, 1), blocker(b, s, 2), blocker(b, s, 3)]).toEqual(['lock', 'ice', 'chain']);
        const after = play(b, [0, 4]);
        expect(after.unlocked).toBe(true);
        expect([blocker(b, after, 1), blocker(b, after, 2), blocker(b, after, 3)]).toEqual([null, null, null]);
        // The crate at (5, 2) is out of reach (1.6) of both screws taken: it keeps its two hits.
        expect(after.crates).toEqual([2]);
    });
    test('DV05 arc-en-ciel (complète la boîte à qui il manque une vis), or, TNT, engrenage, téléporteur', () => {
        const b = parse(level({ plates: [['bar3', 0, 0, 0, 0], ['bar3', 0, 3, 0, 1], ['bar3', 4, 6, 0, 2]], crates: [[1, 2, 3]], colors: 'RR*BBBRBB', queue: 'RBB',
            specials: { '2,0': 'rainbow', '0,3': 'gold', '1,3': 'tnt', '2,3': { portal: '6,6' }, '1,0': { gear: [2, -1, 0] } } }));
        // Blue lacks one screw, red none: the rainbow waits in the buffer for the blue box, which takes it on arrival.
        let s = play(b, [2]);
        expect(s.slots[0]).toEqual({ color: 0, filled: 0 }); expect(s.buffer).toEqual([8]);
        expect(play(b, [2, 0, 1, 6]).slots[0]).toEqual({ color: 1, filled: 1 });
        s = play(b, [2, 3]);
        expect(s.cap).toBe(BASE_BUFFER + 1); expect(s.gold).toBe(1);
        const m = unscrew(b, s, 4); if (!m) throw new Error('TNT');
        // The gold screw at (0, 3) cracked the crate once; the TNT next to it clears what is left.
        expect(s.crates).toEqual([2]); expect(m.state.crates).toEqual([0]); expect(m.events).toContain('tnt');
        const pair = unscrew(b, m.state, 5); if (!pair) throw new Error('téléporteur');
        expect(pair.removed).toEqual([5, 8]); expect(pair.events).toContain('portal');
        const g = unscrew(b, initial(b), 1); if (!g) throw new Error('engrenage');
        expect(g.state.shift[2]).toEqual([-1, 0]);
    });
});
/** The dead end of DV03, loaded into a real engine. */
function dead(e: Engine): void {
    e.board = parse(level({ plates: [['bar3', 0, 0, 0, 0], ['bar6', 0, 0, 1, 1]], colors: 'RRRBBBYYY', queue: 'RBY' }));
    e.state = initial(e.board); e.status = 'playing'; e.hearts = HEARTS;
}
describe('Dévisso : moteur', () => {
    test('DV06 annuler coûte un bonus, un cœur reprend trois coups dans l’impasse, étoiles selon l’aide', () => {
        const e = new Engine(); e.loadLevel(0);
        const first = e.board.screws.findIndex((_, i) => e.blocker(i) === null);
        expect(e.tap(first)).toBe(true);
        expect(e.undo()).toBe(true); expect(e.state.moves).toBe(0); expect(e.helps).toBe(1); expect(e.stars).toBe(2);
        expect([stars(0), stars(2), stars(3)]).toEqual([3, 2, 1]);
        dead(e);
        for (const i of [3, 4, 5, 6, 7]) e.tap(i);
        expect(e.stuck).toBe(true); expect(e.status).toBe('playing');
        const moves = e.state.moves;
        expect(e.rescue()).toBe(true);
        expect(e.hearts).toBe(HEARTS - 1); expect(e.state.moves).toBe(moves - RESCUE_STEPS);
    });
    test('DV07 sans cœur ni bonus utile, l’impasse est une défaite', () => {
        const e = new Engine(); e.loadLevel(0);
        dead(e); e.hearts = 0; e.boosts = { undo: 0, hint: 1, hammer: 0, bomb: 0, drill: 0 };
        for (const i of [3, 4, 5, 6]) e.tap(i);
        expect(e.status).toBe('playing');
        e.tap(7);
        expect(e.status).toBe('lost');
    });
    test('DV08 marteau, explosion et perçage passent outre ce qui bloque', () => {
        const e = new Engine(); e.loadLevel(0);
        const covered = e.board.screws.findIndex((_, i) => e.blocker(i) === 'covered');
        expect(covered).toBeGreaterThanOrEqual(0);
        expect(e.drill(covered)).toBe(true); expect(e.state.present[covered]).toBe(false); expect(e.boosts.drill).toBe(0);
        const plates = e.state.plates.filter(Boolean).length;
        const [x, y] = e.position(e.board.screws.findIndex((_, i) => e.state.present[i]));
        expect(e.hammer(x, y)).toBe(true); expect(e.state.plates.filter(Boolean).length).toBe(plates - 1);
    });
});
describe('Dévisso : campagne', () => {
    test('DV09 trente assemblages lisibles, nommés en français et en anglais, comptes de vis exacts', () => {
        expect(LEVELS).toHaveLength(30);
        expect(new Set(LEVELS.map(l => l.name)).size).toBe(30); expect(new Set(LEVELS.map(l => l.en)).size).toBe(30);
        LEVELS.forEach((l, i) => {
            const b = parse(l);
            expect(layoutProblems(b), `niveau ${String(i + 1)}`).toEqual([]);
            expect(l.trap, `piège ${String(i + 1)}`).toBeGreaterThan(0);
            expect(l.moves, `coups ${String(i + 1)}`).toBe(b.screws.length - b.screws.filter((s, k) => s.portal >= 0 && s.portal < k).length);
            expect(workshopTip(i)).not.toBe('');
        });
    });
    test('DV10 une nouveauté à la fois, montrée seule avant d’être combinée ; diversité mesurée sans clone', () => {
        const report = devissoDiversity(LEVELS);
        const seen = new Set<string>();
        LEVELS.forEach((l, i) => {
            const kinds = new Set(Object.values(l.specials ?? {}).map(s => typeof s === 'string' ? s : Object.keys(s)[0] ?? ''));
            if (l.crates?.length) kinds.add('crate');
            if (l.plates.some(p => p[5] === 'metal')) kinds.add('reinforced');
            kinds.delete('key');
            const fresh = [...kinds].filter(k => !seen.has(k));
            // The level that introduces a mechanism introduces only that one; TNT comes with known crates to blow.
            expect(fresh, `niveau ${String(i + 1)}`).toEqual(Object.entries(NOVELTY).filter(([, at]) => at === i).map(([k]) => k));
            if (fresh.length) expect(report.noveltyLevels).toContain(i + 1);
            for (const k of kinds) seen.add(k);
        });
        expect(report.score).toBeLessThanOrEqual(22); expect(report.cloneShare).toBe(0); expect(report.maxGapWithoutNovelty).toBeLessThanOrEqual(5);
        expect(devissoDiversity(LEVELS, Array<number>(30).fill(6)).cloneShare).toBe(1);
    });
});
