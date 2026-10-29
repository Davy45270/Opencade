import { describe, it, expect } from 'vitest';
import { Engine, difficulty, generate, transition, filled, submerged, type Board, type Lane } from '../src/engines/traverse/engine';
import { solve } from '../src/engines/traverse/solver';
const quantum = (e: Engine) => { e.step(difficulty(e.level).flowFrames * 1000 / 60); };
const road: Lane = { y: 9, kind: 'road', direction: 1, offset: 0, diver: false };
const river: Lane = { y: 7, kind: 'river', direction: 1, offset: 0, diver: false };
const board = (lane: Lane): Board => ({ lanes: [lane], shelters: [1, 4, 7] });
function position(e: Engine, x: number, y: number) { e.loadState({ ...e.state, player: { x, y }, previous: { x, y } }); }
describe('Traverse', () => {
    it('R01 une entrée = une case, pas de répétition automatique ni sortie latérale', () => {
        const e = new Engine(); position(e, 0, 14); e.input('left'); quantum(e); expect(e.state.player).toEqual({ x: 0, y: 14 });
        e.input('right'); quantum(e); expect(e.state.player).toEqual({ x: 1, y: 14 }); quantum(e); expect(e.state.player).toEqual({ x: 1, y: 14 });
        position(e, 8, 14); e.input('right'); quantum(e); expect(e.state.player.x).toBe(8);
    });
    it('R02 R09 véhicule : une vie et retour exact au départ', () => {
        const e = new Engine(); e.board = board(road); position(e, 0, 10); e.input('up'); e.input('right'); quantum(e);
        expect(e.state.lives).toBe(2); expect(e.state.player).toEqual({ x: 4, y: 14 }); expect(e.state.time).toBe(60000); expect(e.snapshot().queue).toEqual([]);
        expect(transition(board(road), { x: 2, y: 10 }, 0, 'up', 0)).toBeNull(); // contact après déplacement du véhicule
    });
    it('R03 transport et sortie mortelle aux deux bords', () => {
        expect(transition(board(river), { x: 2, y: 8 }, 0, 'up', 0)).toEqual({ x: 3, y: 7 });
        expect(transition(board({ ...river, offset: 1 }), { x: 8, y: 8 }, 0, 'up', 0)).toBeNull();
        expect(transition(board({ ...river, direction: -1 }), { x: 0, y: 8 }, 0, 'up', 0)).toBeNull();
    });
    it('R04 eau nue mortelle, berge sûre', () => {
        expect(transition(board(river), { x: 8, y: 8 }, 0, 'up', 0)).toBeNull();
        expect(transition(board(river), { x: 4, y: 12 }, 0, 'wait', 0)).toEqual({ x: 4, y: 12 });
    });
    it('R05 cycle des plongeurs dès le niveau 10 et pendant cinq quanta au niveau 30', () => {
        const l = { ...river, diver: true };
        expect(submerged(l, 0, 8)).toBe(false); expect(submerged(l, 0, 9)).toBe(true); expect(submerged(l, 1, 9)).toBe(false);
        for (const t of [0, 1, 2, 3, 4, 18, 19, 20, 21, 22]) expect(submerged(l, t, 29)).toBe(true);
        expect(submerged(l, 5, 29)).toBe(false); expect(filled(l, 2, 0, 9)).toBe(false);
        expect(transition(board(l), { x: 2, y: 8 }, 0, 'up', 9)).toBeNull();
        expect(transition(board(l), { x: 1, y: 7 }, 17, 'wait', 29)).toBeNull(); // immersion au quantum suivant
    });
    it('R06 R08 tous les abris requis, doublon mortel, victoire gelée', () => {
        const e = new Engine(); position(e, 1, 1); e.input('up'); quantum(e); expect(e.state.occupied).toEqual([1]); expect(e.status).toBe('playing');
        position(e, 1, 1); e.input('up'); quantum(e); expect(e.state.lives).toBe(2); expect(e.state.occupied).toEqual([1]);
        for (const x of [4, 7]) { position(e, x, 1); e.input('up'); quantum(e); }
        expect(e.status).toBe('won'); expect(e.state.score).toBe(300); const s = e.snapshot(); e.input('down'); e.step(10000); expect(e.snapshot()).toEqual(s);
        const wall = new Engine(); position(wall, 2, 1); wall.input('up'); quantum(wall); expect(wall.state.lives).toBe(2);
    });
    it('R07 R08 R09 échéance exacte, trois vies puis défaite et gel', () => {
        const e = new Engine(); e.step(59999); expect(e.state.lives).toBe(3); e.step(1); expect(e.state.lives).toBe(2); expect(e.state.time).toBe(60000);
        e.step(120000); expect(e.status).toBe('lost'); expect(e.state.lives).toBe(0); expect(e.state.player).toEqual({ x: 4, y: 14 });
        const s = e.snapshot(); e.step(5000); expect(e.snapshot()).toEqual(s);
    });
    it('R10 BFS espace-temps : chaque abri des 30 graines témoins, puis rejeu exact', () => {
        const lengths: number[] = [], waits: number[] = [];
        const layouts = new Set<string>(), divers = new Set<string>();
        for (let level = 0; level < 30; level++) {
            const e = new Engine(level, 28);
            layouts.add(JSON.stringify(e.board.lanes.map(l => [l.y, l.kind])));
            divers.add(JSON.stringify(e.board.lanes.filter(l => l.diver).map(l => l.y)));
            // Ordinary two-cell vehicles always leave gaps across the screen.
            for (const lane of e.board.lanes.filter(l => l.kind === 'road')) {
                for (let phase = 0; phase < 90; phase++) {
                    expect(Array.from({ length: 9 }, (_, x) => filled(lane, x, phase, level)).every(Boolean)).toBe(false);
                }
            }
            const start = performance.now();
            for (const target of e.board.shelters) {
                const proof = solve(level, 28, target); expect(proof, `niveau ${String(level + 1)} abri ${String(target)}`).not.toBeNull();
                if (!proof) throw new Error('Absence de témoin');
                const replay = new Engine(level, 28);
                for (const a of proof.path) { if (a !== 'wait') replay.input(a); quantum(replay); }
                expect(replay.state.occupied).toEqual([target]); expect(replay.state.lives).toBe(3);
                if (target === e.board.shelters[Math.floor(e.board.shelters.length / 2)]) { lengths.push(proof.path.length); waits.push(proof.waits); }
            }
            expect(performance.now() - start).toBeLessThan(1000);
        }
        expect(lengths).toEqual([16,16,16,16,16,18,18,18,18,18,20,20,20,20,20,22,22,22,22,22,24,24,24,24,24,26,26,26,26,26]);
        expect(waits).toEqual([0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5]);
        expect(layouts.size).toBeGreaterThan(20); expect(divers.size).toBeGreaterThan(10);

    });
    it('R11 sens de chaque paramètre, extrêmes stricts et 30 niveaux', () => {
        const signs = { flowFrames: -1, spacing: -1, logLength: -1, diveDuration: 1, timeMs: -1, shelters: 1, mixedLanes: 1 } as const;
        expect(difficulty(0)).toEqual({ flowFrames: 30, spacing: 6, logLength: 8, diveDuration: 0, timeMs: 60000, shelters: 3, mixedLanes: 1 });
        expect(difficulty(29)).toEqual({ flowFrames: 13, spacing: 4, logLength: 5, diveDuration: 5, timeMs: 31000, shelters: 5, mixedLanes: 6 });
        for (const key of Object.keys(signs) as (keyof typeof signs)[]) {
            expect((difficulty(29)[key] - difficulty(0)[key]) * signs[key]).toBeGreaterThan(0);
            for (let i = 1; i < 30; i++) expect((difficulty(i)[key] - difficulty(i-1)[key]) * signs[key]).toBeGreaterThanOrEqual(0);
        }
        expect(() => difficulty(30)).toThrow(RangeError);
    });
    it('R12 graine, sérialisation, copie et regroupement des pas fixes', () => {
        const a = new Engine(9, 42), b = new Engine(9, 42);
        for (const d of ['left', 'right', 'up'] as const) { a.input(d); b.input(d); }
        a.step(5000); for (let i = 0; i < 300; i++) b.step(1000 / 60);
        expect(a.snapshot()).toEqual(b.snapshot()); expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
        const s = a.snapshot(); s.player.x = -99; expect(a.state.player.x).not.toBe(-99);
        expect(generate(9, 42)).not.toEqual(generate(9, 43));
        for (const t of [-1, Infinity, NaN]) expect(() => { a.step(t); }).toThrow(RangeError);
    });
});
