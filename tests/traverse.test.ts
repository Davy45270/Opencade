import { describe, it, expect } from 'vitest';
import * as traverse from '../src/engines/traverse/engine';
import { Engine, difficulty, generate, transition, filled, submerged, travel, castawayAt, shelterOpen, PLANS, type Board, type Lane } from '../src/engines/traverse/engine';
import { traverseDiversity } from '../scripts/traverse-diversity.js';
import campaign from './fixtures/traverse-campaign.json';
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
    it('R05 cycle des plongeurs dès le niveau 7 et pendant quatre quanta au niveau 30', () => {
        const l = { ...river, diver: true };
        expect(submerged(l, 0, 5)).toBe(false); expect(submerged(l, 0, 6)).toBe(true); expect(submerged(l, 1, 6)).toBe(false);
        for (const t of [0, 1, 2, 3, 18, 19, 20, 21]) expect(submerged(l, t, 29)).toBe(true);
        expect(submerged(l, 4, 29)).toBe(false); expect(filled(l, 2, 0, 9)).toBe(false);
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
    it('R10 chaque traversée gagnée par sa preuve enregistrée, vies intactes', () => {
        for (let level = 0; level < 30; level++) {
            const e = new Engine(level, 28), paths = campaign.traverse[level] ?? [];
            for (const lane of e.board.lanes.filter(l => l.kind === 'road')) for (let phase = 0; phase < 90; phase++) {
                expect(Array.from({ length: 9 }, (_, x) => filled(lane, x, phase, level)).every(Boolean)).toBe(false);
            }
            for (const path of paths) for (const a of path) { if (a !== 'wait') e.input(a as 'up'); quantum(e); }
            expect(e.status).toBe('won'); expect(e.state.lives).toBe(difficulty(level).lives);
            // Score: 100 per shelter, plus 300 for the castaway, times the level number.
            expect(e.state.score).toBe((100 * e.board.shelters.length + (PLANS[level]?.rescue ? 300 : 0)) * (level + 1));
        }
        const one = solve(0, 28, 4); expect(one?.path.length).toBe(16);
    });
    it('R11 calendrier : une règle neuve tous les 4 à 5 niveaux, défi à une vie tous les 5, respiration après chaque défi', () => {
        const first = (has: (i: number) => boolean) => Array.from({ length: 30 }, (_, i) => i).find(has);
        expect(first(i => !!PLANS[i]?.lights)).toBe(3); expect(first(i => difficulty(i).diveDuration > 0)).toBe(6);
        expect(first(i => !!PLANS[i]?.fast)).toBe(7); expect(first(i => !!PLANS[i]?.tide)).toBe(11);
        expect(first(i => !!PLANS[i]?.rocks)).toBe(15); expect(first(i => !!PLANS[i]?.rescue)).toBe(20); expect(first(i => !!PLANS[i]?.ordered)).toBe(25);
        expect(Array.from({ length: 30 }, (_, i) => i).filter(i => difficulty(i).lives === 1)).toEqual([4, 9, 14, 19, 24]);
        for (const c of [4, 9, 14, 19, 24]) expect(difficulty(c + 1).flowFrames).toBeGreaterThan(difficulty(c).flowFrames);
        // Every introduction is a calmer crossing too.
        for (const intro of [3, 6, 7, 11, 15, 20, 25]) expect(PLANS[intro]?.slower ?? 0).toBeGreaterThan(0);
        const last = PLANS[29]; expect(Boolean(last?.ordered && last.rescue && last.lights && last.fast && last.tide && last.rocks)).toBe(true);
        expect(difficulty(0)).toEqual({ flowFrames: 30, spacing: 6, logLength: 8, diveDuration: 0, timeMs: 60000, shelters: 3, mixedLanes: 1, lives: 3 });
        for (const key of ['spacing', 'logLength', 'timeMs'] as const) for (let i = 1; i < 30; i++) expect(difficulty(i)[key]).toBeLessThanOrEqual(difficulty(i - 1)[key]);
        expect(new Set(PLANS.map(p => p.name)).size).toBe(30); expect(() => difficulty(30)).toThrow(RangeError);
        const r = traverseDiversity(traverse); expect(r.score).toBeLessThanOrEqual(25); expect(r.cloneShare).toBe(0);
        expect(traverseDiversity(traverse, Array<number>(30).fill(6)).cloneShare).toBe(1);
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
    it('R13 feu : la voie reste immobile 2 quanta sur 6', () => {
        const lit: Lane = { ...road, light: { period: 6, red: 2 } };
        expect([0, 1, 2, 3, 4, 5, 6, 8, 9].map(t => travel(lit, t))).toEqual([0, 0, 0, 1, 2, 3, 4, 4, 5]);
        expect(filled(lit, 0, 2, 0)).toBe(filled(lit, 0, 0, 0));
    });
    it('R14 rapides : deux cases par quantum, et le rondin emporte de deux', () => {
        const fast: Lane = { ...river, speed: 2 }; expect(travel(fast, 3)).toBe(6);
        expect(transition(board(fast), { x: 2, y: 8 }, 0, 'up', 0)).toEqual({ x: 4, y: 7 });
    });
    it('R15 marée : le courant s\'inverse toutes les N quanta', () => {
        const tide: Lane = { ...river, tide: 3 };
        expect([0, 1, 2, 3, 4, 5, 6, 7].map(t => travel(tide, t))).toEqual([0, 1, 2, 3, 2, 1, 0, 1]);
        expect(transition(board(tide), { x: 5, y: 8 }, 3, 'up', 0)).toEqual({ x: 4, y: 7 });
    });
    it('R16 rocher : bloque le pas sans coûter de vie', () => {
        const b: Board = { lanes: [], shelters: [1, 4, 7], rocks: [{ x: 4, y: 13 }] };
        expect(transition(b, { x: 4, y: 14 }, 0, 'up', 0)).toEqual({ x: 4, y: 14 });
        const e = new Engine(); e.board = b; e.input('up'); quantum(e); expect(e.state.player).toEqual({ x: 4, y: 14 }); expect(e.state.lives).toBe(3);
    });
    it('R17 naufragé : abris fermés tant qu\'il n\'est pas recueilli, +300 × niveau à la récupération', () => {
        const e = new Engine(20, 28), c = e.board.castaway; expect(c).not.toBeNull();
        expect(shelterOpen(e.board, [], false, 1)).toBe(false); expect(shelterOpen(e.board, [], true, 1)).toBe(true);
        position(e, 1, 1); e.input('up'); quantum(e); expect(e.state.lives).toBe(2); expect(e.state.occupied).toEqual([]);
        const at = castawayAt(e.board, 0); expect(at && filled(e.board.lanes[c?.lane ?? 0] as Lane, at.x, 0, 20)).toBe(true);
        const proof = solve(20, 28, e.board.shelters[0] ?? 0), r = new Engine(20, 28);
        for (const a of proof?.path ?? []) { if (a !== 'wait') r.input(a); quantum(r); }
        expect(r.state.rescued).toBe(true); expect(r.state.occupied).toHaveLength(1); expect(r.state.score).toBe(300 * 21 + 100 * 21);
    });
    it('R18 abris en file : seul le premier abri libre est ouvert', () => {
        for (let seed = 1; seed <= 80; seed++) for (const level of [20, 29]) expect(generate(level, seed).castaway).not.toBeNull();
        const e = new Engine(25, 28); expect(e.board.ordered).toBe(true);
        expect(shelterOpen(e.board, [], true, 2)).toBe(false); expect(shelterOpen(e.board, [], true, 0)).toBe(true); expect(shelterOpen(e.board, [0], true, 2)).toBe(true);
        position(e, 2, 1); e.input('up'); quantum(e); expect(e.state.lives).toBe(2);
        expect(shelterOpen(e.board, [0], true, 0)).toBe(false); // un abri occupé reste fermé en file
    });
    it('R19 défi : une seule vie, la première faute termine', () => {
        const e = new Engine(4, 28); expect(e.state.lives).toBe(1); position(e, 2, 1); e.input('up'); quantum(e); expect(e.status).toBe('lost');
    });
});
