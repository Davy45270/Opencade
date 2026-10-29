import { expect, test } from 'vitest';
import { Engine, LEVELS, parse, deadlocked, difficulty, type Direction } from '../src/engines/caisses/engine';
import { solutionMetrics } from '../src/engines/caisses/metrics';
import { solve } from '../src/engines/caisses/solver';
function fixture(text: string): Engine {
    const e = new Engine(); e.board = parse(text); e.restart(); return e;
}
const room = '#######\n#     #\n# @$ .#\n#     #\n#######';
test('C01 déplacement et murs', () => {
    const e = fixture(room); e.input('left'); expect(e.state.player).toBe(15);
    const before=e.snapshot(); e.input('left'); expect(e.snapshot()).toEqual(before);
    e.input('up'); expect(e.state.player).toBe(8);
});
test('C02 pousser une seule caisse, jamais deux ni contre un mur', () => {
    const e=fixture(room); e.input('right'); expect(e.state.boxes).toEqual([18]); expect(e.state.pushes).toBe(1);
    for (const text of ['#######\n#@$$..#\n#######', '#####\n#@$##\n# . #\n#####']) {
        const blocked=fixture(text), before=blocked.snapshot(); blocked.input('right'); expect(blocked.snapshot()).toEqual(before);
    }
});
test('C03 aucune traction', () => {
    const e=fixture(room); e.input('left'); expect(e.state.boxes).toEqual([17]); expect(e.state.pushes).toBe(0);
});
test('C04 toutes les caisses requises et gel après victoire', () => {
    const e=fixture('########\n#@$. $.#\n########'); e.input('right'); expect(e.status).toBe('playing');
    const win=fixture(room); win.input('right'); win.input('right'); expect(win.status).toBe('won');
    const before=win.snapshot(); win.input('left'); expect(win.snapshot()).toEqual(before);
});
test('C05 annuler exactement chaque état, y compris victoire, recommencer', () => {
    const e=fixture(room), initial=e.snapshot(); e.input('right'); const one=e.snapshot(); e.input('right');
    e.undo(); expect(e.snapshot()).toEqual(one); e.undo(); expect(e.snapshot()).toEqual(initial);
    e.undo(); expect(e.snapshot()).toEqual(initial); e.input('right'); e.restart(); expect(e.snapshot()).toEqual(initial);
});
test('C06 compteurs, score relatif au minimum de pas', () => {
    const e=new Engine(); e.input('right'); e.input('left'); e.input('right'); e.input('right');
    expect(e.state.moves).toBe(4); expect(e.state.pushes).toBe(1); expect(e.state.score).toBe(500);
});
test('C07 validation des dimensions, symboles, occupants et fermeture', () => {
    for (const level of LEVELS) { const b=parse(level.text); expect(b.boxes.length).toBe(b.targets.length); }
    for (const text of ['###\n#@#\n###', '#####\n#@@$#\n# . #\n#####', '####\n#@$ .#\n####', '#####\n @$ .\n#####', '#####\n#@x.#\n#####']) expect(() => parse(text)).toThrow();
    expect(parse('#####\n#+* #\n# $ #\n#####').targets).toHaveLength(2);
});
for (const [i, level] of LEVELS.entries()) test(`C08 C09 soluble et minimum exact : ${String(i+1)}`, () => {
    const begin=performance.now(), e=new Engine(); e.loadLevel(i);
    const solution=solve(e.board); expect(solution).not.toBeNull(); expect(solution?.pushes).toBe(level.minimumPushes);
    for (const d of solution?.inputs ?? []) e.input(d);
    expect(e.status).toBe('won'); expect(performance.now()-begin).toBeLessThan(1000);
});
test('C06 C09 témoin du minimum de pas de chaque atelier', () => {
    for (const [i, level] of LEVELS.entries()) {
        const begin=performance.now(), e=new Engine(); e.loadLevel(i);
        const solution = solve(e.board, 'steps');
        expect(solution).not.toBeNull();
        for (const d of solution?.inputs ?? []) e.input(d);
        expect(e.status).toBe('won'); expect(e.state.moves).toBe(level.minimumSteps); expect(e.state.score).toBe(1000);
        expect(performance.now()-begin).toBeLessThan(1000);
    }
});
test('C10 chaque paramètre croît par paliers et strictement aux extrêmes', () => {
    for (const key of ['boxes','minimumPushes'] as const) {
        for (let i=1;i<30;i++) expect(difficulty(i)[key]).toBeGreaterThanOrEqual(difficulty(i-1)[key]);
        expect(difficulty(29)[key]).toBeGreaterThan(difficulty(0)[key]);
    }
});
test('C10b dès le quatrième atelier, tourner une caisse et contourner', () => {
    for (const level of LEVELS.slice(3)) {
        const board = parse(level.text), solution = solve(board);
        expect(solution).not.toBeNull();
        const m = solutionMetrics(board, solution?.inputs ?? []);
        expect(m.turns).toBeGreaterThan(0); expect(m.detours).toBeGreaterThan(0);
        expect(board.width).toBeLessThanOrEqual(10); expect(board.height).toBeLessThanOrEqual(10);
    }
});
test('C10c effort moyen non décroissant par paliers de cinq', () => {
    let previous = 0;
    for (let start = 0; start < 30; start += 5) {
        const effort = LEVELS.slice(start, start + 5).reduce((sum, l) => sum + (solve(parse(l.text))?.visited ?? 0), 0) / 5;
        expect(effort).toBeGreaterThanOrEqual(previous); previous = effort;
    }
});
test('C11 coin hors cible seulement et récupération', () => {
    const e=fixture('######\n# $@ #\n# .  #\n######');
    expect(deadlocked(e.board,e.state.boxes)).toBe(false); const before=e.snapshot(); e.input('left');
    expect(e.snapshot().deadlocked).toBe(true); expect(e.status).toBe('playing'); e.undo(); expect(e.snapshot()).toEqual(before);
    expect(deadlocked(parse('#####\n#*@ #\n#####'),[6])).toBe(false);
    expect(solve(parse('######\n#$ @ #\n# .  #\n######'))).toBeNull();
});
test('C12 déterminisme, graine, pas fixe et snapshots indépendants', () => {
    const a=new Engine(), b=new Engine(); a.loadLevel(4,17); b.loadLevel(4,17);
    const inputs: Direction[]=['right','right','down','left','up'];
    for (const d of inputs) { a.input(d); b.input(d); a.step(1000/60); b.step(1000/120); b.step(1000/120); expect(a.snapshot()).toEqual(b.snapshot()); }
    expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot()); const s=a.snapshot(); s.boxes.length=0; expect(a.state.boxes).toHaveLength(parse(LEVELS[4].text).boxes.length);
    for (const dt of [-1,NaN,Infinity]) expect(() => { a.step(dt); }).toThrow(RangeError);
});
