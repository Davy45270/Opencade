/**
 * Independent no-guess check of a Démineur grid, written apart from the game's solver (src/engines/demineur/solver.ts)
 * and generator: it only shares the board rules (neighbours, opening, flood). It plays from the real opening of the
 * game with what the player sees (the revealed numbers and, as a separate last resort, the mine counter), and records
 * the hardest rule each grid needs:
 *   1 `single`: one number alone (all its hidden cells are mines, or none is);
 *   2 `two`: two numbers compared (subset, difference, overlap);
 *   3 `local`: every placement of the mines around a connected group of numbers, mine counter ignored;
 *   4 `counter`: the same with the mine counter shown to the player.
 * A grid is `guess` when nothing decides a cell any more, `unknown` when the step budget runs out (never a pass).
 * The budget counts search nodes, never time: the verdict is the same on every machine.
 */
import { cascade, initialState, layoutMines, neighbours, type CellState, type LevelDefinition } from '../src/engines/demineur/rules';

export type OracleRule = 'single' | 'two' | 'local' | 'counter';
export const ORACLE_RULES: readonly OracleRule[] = ['single', 'two', 'local', 'counter'];
export interface OracleVerdict { status: 'solved' | 'guess' | 'unknown'; hardest: OracleRule | null; uses: Record<OracleRule, number>; revealed: number; safe: number }
interface Rule { cells: number[]; mines: number }

/** Constraints of the revealed numbers: hidden, not yet proven cells around each, and the mines they still miss. */
function rulesOf(w: number, h: number, cells: readonly CellState[], mines: ReadonlySet<number>): Rule[] {
    const out: Rule[] = [], seen = new Set<string>();
    cells.forEach((c, i) => {
        if (!c.revealed || c.mine) return;
        const around = neighbours(w, h, i).filter(j => !cells[j]?.revealed);
        const open = around.filter(j => !mines.has(j)), left = c.adjacent - (around.length - open.length);
        if (!open.length) return;
        const key = `${open.join(',')}:${String(left)}`;
        if (!seen.has(key)) { seen.add(key); out.push({ cells: open, mines: left }); }
    });
    return out;
}
function single(rules: readonly Rule[]): { safe: number[]; mines: number[] } {
    const safe: number[] = [], mines: number[] = [];
    for (const r of rules) { if (r.mines === 0) safe.push(...r.cells); else if (r.mines === r.cells.length) mines.push(...r.cells); }
    return { safe, mines };
}
/** Two numbers: the shared part holds between max(0, a − |A only|, b − |B only|) and min(|shared|, a, b) mines; each part
 * is decided when its bounds force 0 or all of it (this covers subset and difference as special cases). */
function two(rules: readonly Rule[]): { safe: number[]; mines: number[] } {
    const safe: number[] = [], mines: number[] = [];
    for (let p = 0; p < rules.length; p++) for (let q = p + 1; q < rules.length; q++) {
        const a = rules[p], b = rules[q];
        if (!a || !b) continue;
        const inB = new Set(b.cells), shared = a.cells.filter(c => inB.has(c));
        if (!shared.length) continue;
        const onlyA = a.cells.filter(c => !inB.has(c)), inA = new Set(a.cells), onlyB = b.cells.filter(c => !inA.has(c));
        const low = Math.max(0, a.mines - onlyA.length, b.mines - onlyB.length), high = Math.min(shared.length, a.mines, b.mines);
        if (low > high) continue;
        const decide = (group: number[], min: number, max: number): void => {
            if (!group.length) return;
            if (max === 0) safe.push(...group); else if (min === group.length) mines.push(...group);
        };
        decide(shared, low, high);
        decide(onlyA, a.mines - high, a.mines - low);
        decide(onlyB, b.mines - high, b.mines - low);
    }
    return { safe, mines };
}
/** Connected groups of frontier cells (two cells are linked when one number sees both). */
function groups(rules: readonly Rule[]): Rule[][] {
    const parent = new Map<number, number>();
    const find = (x: number): number => { let r = x; while (parent.get(r) !== r) r = parent.get(r) ?? r; parent.set(x, r); return r; };
    for (const r of rules) for (const c of r.cells) if (!parent.has(c)) parent.set(c, c);
    for (const r of rules) for (const c of r.cells.slice(1)) parent.set(find(c), find(r.cells[0] ?? c));
    const by = new Map<number, Rule[]>();
    for (const r of rules) { const k = find(r.cells[0] ?? 0); by.set(k, [...(by.get(k) ?? []), r]); }
    return [...by.values()];
}
/** Every placement of one group: for each mine total k, which cells can be a mine and which can be empty. */
function placements(group: readonly Rule[], budget: { nodes: number }): Map<number, { mine: Set<number>; empty: Set<number> }> | null {
    const vars = [...new Set(group.flatMap(r => r.cells))], index = new Map(vars.map((v, k) => [v, k]));
    const rows = group.map(r => ({ cells: r.cells.map(c => index.get(c) ?? 0), mines: r.mines }));
    const byVar = vars.map((_, k) => rows.filter(r => r.cells.includes(k)));
    const value = new Array<number>(vars.length).fill(-1), out = new Map<number, { mine: Set<number>; empty: Set<number> }>();
    const fits = (k: number): boolean => (byVar[k] ?? []).every(r => {
        let set = 0, open = 0;
        for (const x of r.cells) { const v = value[x] ?? -1; if (v === 1) set++; else if (v < 0) open++; }
        return set <= r.mines && set + open >= r.mines;
    });
    const run = { aborted: false };
    const walk = (k: number, total: number): void => {
        if (run.aborted) return;
        if (--budget.nodes < 0) { run.aborted = true; return; }
        if (k === vars.length) {
            const entry = out.get(total) ?? { mine: new Set<number>(), empty: new Set<number>() };
            value.forEach((v, j) => { (v === 1 ? entry.mine : entry.empty).add(vars[j] ?? 0); });
            out.set(total, entry); return;
        }
        for (const v of [0, 1]) { value[k] = v; if (fits(k)) walk(k + 1, total + v); }
        value[k] = -1;
    };
    walk(0, 0);
    return run.aborted ? null : out;
}
/** Exact deductions over the frontier groups; with `counter`, the mine total must also fit the hidden interior. */
function exact(rules: readonly Rule[], counter: { left: number; interior: number[] } | null, budget: { nodes: number }): { safe: number[]; mines: number[] } | null {
    const all = groups(rules).map(g => placements(g, budget));
    if (all.some(p => p === null)) return null;
    const parts = all as Map<number, { mine: Set<number>; empty: Set<number> }>[];
    const safe: number[] = [], mines: number[] = [];
    // Totals reachable by every group but one (and by all of them), to test each group's own totals against the counter.
    const sums = (skip: number): Set<number> => {
        let reach = new Set([0]);
        parts.forEach((p, g) => { if (g === skip) return; const next = new Set<number>(); for (const r of reach) for (const k of p.keys()) next.add(r + k); reach = next; });
        return reach;
    };
    const room = (rest: number): boolean => !counter || (counter.left - rest >= 0 && counter.left - rest <= counter.interior.length);
    parts.forEach((p, g) => {
        const others = sums(g), mine = new Set<number>(), empty = new Set<number>();
        for (const [k, e] of p) if ([...others].some(o => room(o + k))) { e.mine.forEach(c => mine.add(c)); e.empty.forEach(c => empty.add(c)); }
        for (const c of new Set([...mine, ...empty])) { if (!mine.has(c)) safe.push(c); else if (!empty.has(c)) mines.push(c); }
    });
    if (counter && counter.interior.length) {
        const totals = [...sums(-1)].filter(t => room(t)).map(t => counter.left - t);
        if (totals.length && totals.every(m => m === 0)) safe.push(...counter.interior);
        else if (totals.length && totals.every(m => m === counter.interior.length)) mines.push(...counter.interior);
    }
    return { safe, mines };
}
/** Plays `level` from its opening by proof only. Throws if a rule contradicts the hidden board (a bug, never a verdict). */
export function checkGrid(level: LevelDefinition, nodes = 2_000_000): OracleVerdict {
    const w = level.width, h = level.height, truth = layoutMines(level.layout ?? []), total = w * h - level.mineCount;
    let cells = initialState(level).cells;
    const mines = new Set<number>(), uses: Record<OracleRule, number> = { single: 0, two: 0, local: 0, counter: 0 }, budget = { nodes };
    let hardest: OracleRule | null = null;
    const revealed = (): number => cells.filter(c => c.revealed).length;
    while (revealed() < total) {
        const rules = rulesOf(w, h, cells, mines), frontier = new Set(rules.flatMap(r => r.cells));
        const interior = cells.flatMap((c, i) => !c.revealed && !mines.has(i) && !frontier.has(i) ? [i] : []);
        let step: { safe: number[]; mines: number[] } | null = null, rule: OracleRule = 'single';
        for (const [name, run] of [
            ['single', () => single(rules)], ['two', () => two(rules)], ['local', () => exact(rules, null, budget)],
            ['counter', () => exact(rules, { left: level.mineCount - mines.size, interior }, budget)],
        ] as const) {
            const found = run();
            if (found === null) return { status: 'unknown', hardest, uses, revealed: revealed(), safe: total };
            const fresh = { safe: found.safe.filter(c => !cells[c]?.revealed), mines: found.mines.filter(c => !mines.has(c)) };
            if (fresh.safe.length || fresh.mines.length) { step = fresh; rule = name; break; }
        }
        if (!step) return { status: 'guess', hardest, uses, revealed: revealed(), safe: total };
        uses[rule]++;
        if (!hardest || ORACLE_RULES.indexOf(rule) > ORACLE_RULES.indexOf(hardest)) hardest = rule;
        for (const c of step.safe) if (truth[c]) throw new Error(`${level.id} : case ${String(c)} dite sûre, minée`);
        for (const c of step.mines) if (!truth[c]) throw new Error(`${level.id} : case ${String(c)} dite minée, sûre`);
        step.mines.forEach(c => mines.add(c));
        cells = cascade(level, cells, step.safe).cells;
    }
    return { status: 'solved', hardest, uses, revealed: revealed(), safe: total };
}
