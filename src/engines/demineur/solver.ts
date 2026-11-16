import { cascade, counts, initialState, layoutMines, neighbours, type CellState, type LevelDefinition } from './rules';
/** Frontier solver. Constraints: for each revealed number, (hidden unknown neighbours that are mines) = number − proven
 * mines around it. Techniques, cheapest first: `simple` (one constraint), `pair` (two overlapping constraints),
 * `enumeration` (every placement of a bounded local system, node limit), `count` (global mine count). Player flags are
 * never taken as proof. Nothing is called safe or mined unless every placement agrees: no guess, no probability. */
export type Technique = 'simple' | 'pair' | 'enumeration' | 'count';
export const TECHNIQUES: readonly Technique[] = ['simple', 'pair', 'enumeration', 'count'];
/** How two numbers decide a group of cells, for the hint text: `subset` (every hidden cell of one number is also around
 * the other, same mines: the rest is safe), `difference` (same inclusion, more mines: the rest is mined), `overlap`
 * (one number forces mines into the shared cells, which settles the other). */
export type PairKind = 'subset' | 'difference' | 'overlap';
/** One number of a comparison: the cell it sits on, its hidden unproven cells, the mines it still misses, the proven ones. */
export interface Side { source: number; cells: number[]; count: number; known: number }
export interface Deduction {
    technique: Technique; safe: number[]; mines: number[]; sources: number[]; known: number;
    /** Two numbers compared: `decided` is the number whose other cells are settled, `by` the one that settles them. */
    pair?: { kind: PairKind; decided: Side; by: Side; shared: number[]; low: number; high: number };
}
export interface View { width: number; height: number; mineCount: number; numbers: readonly number[] }
/** Numbers of the revealed cells, −1 for a hidden one. */
export const viewOf = (level: { width: number; height: number; mineCount: number }, cells: readonly CellState[]): View =>
    ({ width: level.width, height: level.height, mineCount: level.mineCount, numbers: cells.map(c => c.revealed && !c.mine ? c.adjacent : -1) });
type Constraint = Side;
/** Bounds of the local enumeration: variables per system and search nodes per system (beyond: skipped, never guessed). */
export const LIMITS = { variables: 22, nodes: 40000 } as const;
function constraints(view: View, mines: ReadonlySet<number>, safe: ReadonlySet<number>): Constraint[] {
    const out: Constraint[] = [];
    view.numbers.forEach((n, i) => {
        if (n < 0) return;
        const around = neighbours(view.width, view.height, i), hidden = around.filter(j => (view.numbers[j] ?? 0) < 0 && !safe.has(j));
        const known = hidden.filter(j => mines.has(j)).length, cells = hidden.filter(j => !mines.has(j));
        if (cells.length) out.push({ cells, count: n - known, source: i, known });
    });
    return out;
}
const key = (d: Deduction): string => `${d.safe.join(',')}|${d.mines.join(',')}`;
function simple(list: readonly Constraint[]): Deduction[] {
    const out: Deduction[] = [];
    for (const c of list) {
        if (c.count === 0) out.push({ technique: 'simple', safe: [...c.cells], mines: [], sources: [c.source], known: c.known });
        else if (c.count === c.cells.length) out.push({ technique: 'simple', safe: [], mines: [...c.cells], sources: [c.source], known: c.known });
    }
    return out;
}
/** Two overlapping constraints: the shared cells hold between `low` and `high` mines (each number's other cells
 * bound them); a number whose other cells must then hold 0 mines (or all of them) has them decided. One deduction per
 * decided group, with what the hint needs to tell the computation. */
function pair(list: readonly Constraint[]): Deduction[] {
    const out: Deduction[] = [], seen = new Set<string>();
    for (const a of list) for (const b of list) {
        if (a === b || a.source > b.source) continue;
        const inB = new Set(b.cells), shared = a.cells.filter(c => inB.has(c));
        if (!shared.length) continue;
        const onlyA = a.cells.filter(c => !inB.has(c)), inA = new Set(a.cells), onlyB = b.cells.filter(c => !inA.has(c));
        const low = Math.max(0, a.count - onlyA.length, b.count - onlyB.length), high = Math.min(shared.length, a.count, b.count);
        if (low > high) continue;
        for (const [x, y, only, onlyY] of [[a, b, onlyA, onlyB], [b, a, onlyB, onlyA]] as const) {
            if (!only.length) continue;
            const safe = low === x.count, mined = x.count - high === only.length;
            if (!safe && !mined) continue;
            const kind: PairKind = onlyY.length === 0 ? safe ? 'subset' : 'difference' : 'overlap';
            const d: Deduction = {
                technique: 'pair', safe: safe ? [...only].sort((p, q) => p - q) : [], mines: mined && !safe ? [...only].sort((p, q) => p - q) : [],
                sources: [y.source, x.source], known: a.known + b.known, pair: { kind, decided: x, by: y, shared: [...shared].sort((p, q) => p - q), low, high },
            };
            if (!seen.has(key(d))) { seen.add(key(d)); out.push(d); }
        }
    }
    return out;
}
/** Every placement of the constraint `c` and of the constraints that share a cell with it (bounded). */
function enumeration(list: readonly Constraint[]): { found: Deduction[]; limited: boolean } {
    const found: Deduction[] = [], seen = new Set<string>();
    let limited = false;
    for (const c of list) {
        const inC = new Set(c.cells), system = list.filter(d => d === c || d.cells.some(x => inC.has(x)));
        const vars = [...new Set(system.flatMap(d => d.cells))].sort((x, y) => x - y);
        if (vars.length > LIMITS.variables) { limited = true; continue; }
        const index = new Map(vars.map((v, k) => [v, k])), value = new Array<number>(vars.length).fill(-1);
        const rows = system.map(d => d.cells.map(x => index.get(x) ?? 0));
        const mineIn = new Array<number>(vars.length).fill(0);
        const run = { solutions: 0, nodes: 0, aborted: false };
        const ok = (): boolean => rows.every((row, r) => {
            let set = 0, open = 0;
            for (const k of row) { const v = value[k] ?? -1; if (v === 1) set++; else if (v < 0) open++; }
            const need = system[r]?.count ?? 0;
            return set <= need && set + open >= need;
        });
        const walk = (k: number): void => {
            if (run.aborted) return;
            if (++run.nodes > LIMITS.nodes) { run.aborted = true; return; }
            if (k === vars.length) { run.solutions++; value.forEach((v, j) => { if (v === 1) mineIn[j] = (mineIn[j] ?? 0) + 1; }); return; }
            for (const v of [0, 1]) { value[k] = v; if (ok()) walk(k + 1); }
            value[k] = -1;
        };
        walk(0);
        if (run.aborted) { limited = true; continue; }
        if (!run.solutions) continue;
        const safe = vars.filter((_, k) => mineIn[k] === 0), mines = vars.filter((_, k) => mineIn[k] === run.solutions);
        if (!safe.length && !mines.length) continue;
        const d: Deduction = { technique: 'enumeration', safe, mines, sources: system.map(s => s.source), known: 0 };
        if (!seen.has(key(d))) { seen.add(key(d)); found.push(d); }
    }
    return { found, limited };
}
/** Global count: every mine found (the rest is safe), or as many mines left as hidden cells. */
function count(view: View, mines: ReadonlySet<number>, safe: ReadonlySet<number>): Deduction[] {
    const hidden = view.numbers.map((n, i) => n < 0 && !mines.has(i) && !safe.has(i) ? i : -1).filter(i => i >= 0), left = view.mineCount - mines.size;
    if (!hidden.length) return [];
    if (left === 0) return [{ technique: 'count', safe: hidden, mines: [], sources: [], known: mines.size }];
    if (left === hidden.length) return [{ technique: 'count', safe: [], mines: hidden, sources: [], known: mines.size }];
    return [];
}
/** The deductions of the cheapest technique that finds any, given proven mines and proven safe hidden cells.
 * `limited`: a bounded search was cut short (the answer is then "unknown", never a claim). */
export function deduce(view: View, mines: ReadonlySet<number> = new Set(), safe: ReadonlySet<number> = new Set()): { found: Deduction[]; limited: boolean } {
    const list = constraints(view, mines, safe);
    const fresh = (ds: Deduction[]): Deduction[] => ds.filter(d => d.safe.some(i => !safe.has(i)) || d.mines.some(i => !mines.has(i)));
    for (const run of [() => simple(list), () => pair(list)]) { const found = fresh(run()); if (found.length) return { found, limited: false }; }
    const e = enumeration(list), found = fresh(e.found);
    if (found.length) return { found, limited: e.limited };
    return { found: fresh(count(view, mines, safe)), limited: e.limited };
}
export interface Proof {
    status: 'solvable' | 'unknown'; reason?: 'ambiguous' | 'node_limit';
    /** Rounds won by each technique (a round applies every deduction of the cheapest technique available). */
    rounds: Record<Technique, number>;
    /** Cells decided by each technique. */
    cells: Record<Technique, number>;
    steps: number; revealed: number;
}
/** No-guess check of a curated board from its opening: deduce, reveal the safe cells (flood included), repeat.
 * `solvable` only when every safe cell is revealed by proof; a stall or a cut search is `unknown`. Throws if a
 * deduction contradicts the hidden board (a false proof is a bug, never a result). */
export function proveBoard(level: LevelDefinition, maxSteps = 4000): Proof {
    const w = level.width, h = level.height, total = w * h - level.mineCount;
    let cells = initialState(level).cells;
    const mines = new Set<number>(), rounds = { simple: 0, pair: 0, enumeration: 0, count: 0 }, decided = { simple: 0, pair: 0, enumeration: 0, count: 0 };
    const truth = layoutMines(level.layout ?? []);
    let revealed = cells.filter(c => c.revealed).length, steps = 0, limited = false;
    while (revealed < total) {
        if (++steps > maxSteps) return { status: 'unknown', reason: 'node_limit', rounds, cells: decided, steps, revealed };
        const { found, limited: cut } = deduce(viewOf(level, cells), mines);
        limited ||= cut;
        if (!found.length) return { status: 'unknown', reason: limited ? 'node_limit' : 'ambiguous', rounds, cells: decided, steps, revealed };
        const technique = found[0]?.technique ?? 'simple';
        rounds[technique]++;
        const safe = new Set<number>(), newMines = new Set<number>();
        for (const d of found) { d.safe.forEach(i => safe.add(i)); d.mines.forEach(i => { if (!mines.has(i)) newMines.add(i); }); }
        for (const i of safe) if (truth[i]) throw new Error(`Preuve fausse : case ${String(i)} dite sûre`);
        for (const i of newMines) if (!truth[i]) throw new Error(`Preuve fausse : case ${String(i)} dite minée`);
        newMines.forEach(i => mines.add(i));
        const opened = cascade(level, cells, [...safe].filter(i => !cells[i]?.revealed));
        cells = opened.cells; revealed += opened.list.length;
        decided[technique] += safe.size + newMines.size;
    }
    return { status: 'solvable', rounds, cells: decided, steps, revealed };
}
/** Difficulty of a proved board: the "aha" rounds weighted by technique, plus a little for size. */
export function difficulty(p: Proof, cells: number): number {
    return Math.round(10 * (p.rounds.simple * 0.35 + p.rounds.pair * 3 + p.rounds.enumeration * 7 + p.rounds.count * 4 + cells / 60)) / 10;
}
/** Hint for a live board: the first deduction that tells the player something new (a hidden safe cell to open, an
 * unflagged mine, a flag on a proven safe cell). Mines the player already flagged count as known only once proven. */
export type Hint =
    | { status: 'safe_move'; x: number; y: number; proof: string; cells: number[]; sources: number[]; shared: number[]; technique: Technique; wrongFlag: boolean }
    | { status: 'mine_proven'; x: number; y: number; proof: string; cells: number[]; sources: number[]; shared: number[]; technique: Technique }
    | { status: 'unknown'; reason: 'ambiguous' | 'timeout' | 'node_limit'; proof: string };
const plural = (n: number, one: string, many: string): string => n === 1 ? one : many;
/** "2 mines", plus the mines already proven around that number when there are some. */
function minesOf(side: Side): string {
    const known = side.known ? ` (en plus ${plural(side.known, 'de la mine déjà prouvée', `des ${String(side.known)} mines déjà prouvées`)})` : '';
    return `${String(side.count)} ${plural(side.count, 'mine', 'mines')}${known}`;
}
/** The computation of a comparison, in two sentences: what the settling number forces into the shared cells, then why
 * the other number's remaining cells are all safe or all mined. The numbers named are the circled ones; the shared
 * cells and the `k` cells decided are the ones outlined. */
function explainPair(p: NonNullable<Deduction['pair']>, view: View, k: number, mine: boolean): string {
    const ny = String(view.numbers[p.by.source] ?? 0), nx = String(view.numbers[p.decided.source] ?? 0), s = p.shared.length;
    const others = plural(k, 'son autre case', `ses ${String(k)} autres cases`), y = p.by.cells.length;
    const verdict = mine ? plural(k, 'est forcément une mine', 'sont toutes des mines') : plural(k, 'est sûre', 'sont sûres');
    const hidden = `${String(y)} ${plural(y, 'case cachée', 'cases cachées')}`, sharedCells = `${String(s)} ${plural(s, 'case', 'cases')}`;
    const atLeast = (n: number): string => n === 1 ? 'une est' : `${String(n)} sont`;
    if (p.kind === 'subset') return `Les ${hidden} du ${ny} touchent toutes aussi le ${nx}, et le ${ny} y place ${minesOf(p.by)} : c’est tout ce qu’il faut au ${nx}. ${plural(k, 'L’autre case', `Les ${String(k)} autres cases`)} du ${nx} ${verdict}.`;
    if (p.kind === 'difference') {
        const more = p.decided.count - p.by.count;
        return `Les ${hidden} du ${ny} touchent toutes aussi le ${nx}, et le ${ny} y place ${minesOf(p.by)}. Il en faut ${String(more)} de plus au ${nx} : ${others} ${verdict}.`;
    }
    if (!mine) return `Le ${ny} n’a que ${hidden} pour ${minesOf(p.by)} : au moins ${atLeast(p.low)} dans les ${sharedCells} qu’il partage avec le ${nx}. Le ${nx} a donc déjà ${p.decided.count === 1 ? 'sa mine' : `ses ${String(p.decided.count)} mines`} là : ${others} ${verdict}.`;
    const missing = p.decided.count - p.high;
    return `Le ${ny} n’a que ${minesOf(p.by)} : au plus ${String(p.high)} dans les ${sharedCells} qu’il partage avec le ${nx}. Il manque donc ${String(missing)} ${plural(missing, 'mine', 'mines')} au ${nx} ailleurs : ${others} ${verdict}.`;
}
function explain(d: Deduction, view: View, mine: boolean): string {
    const k = mine ? d.mines.length : d.safe.length, n = view.numbers[d.sources[0] ?? -1] ?? 0;
    const these = plural(k, 'cette case', `ces ${String(k)} cases`);
    if (d.technique === 'simple') {
        if (mine) return d.known
            ? `Le ${String(n)} entouré a déjà ${String(d.known)} ${plural(d.known, 'mine prouvée', 'mines prouvées')} ; il ne lui reste ${k === 1 ? 'qu’une case cachée' : `que ${String(k)} cases cachées`} : ${these} autour du ${String(n)} ${plural(k, 'est forcément une mine', 'sont forcément des mines')}.`
            : `Le ${String(n)} entouré n’a ${k === 1 ? 'qu’une case cachée' : `que ${String(k)} cases cachées`} autour de lui : ${these} ${plural(k, 'est forcément une mine', 'sont forcément des mines')}.`;
        return n === 0 ? `Ce 0 n’a aucune mine autour de lui : ${these} ${plural(k, 'est sûre', 'sont sûres')}.`
            : `Le ${String(n)} entouré a déjà ${n === 1 ? 'sa mine prouvée' : `ses ${String(n)} mines prouvées`} : ${these} ${plural(k, 'est sûre', 'sont sûres')}.`;
    }
    if (d.technique === 'pair' && d.pair) return explainPair(d.pair, view, k, mine);
    if (d.technique === 'enumeration') return `Toutes les façons de placer les mines autour de ces ${String(d.sources.length)} chiffres ${mine ? `mettent une mine sur ${these}` : `laissent ${these} sans mine`}.`;
    return mine ? `Il reste autant de mines que de cases cachées : ${these} ${plural(k, 'est une mine', 'sont des mines')}.` : `Toutes les mines sont prouvées : ${these} ${plural(k, 'est sûre', 'sont sûres')}.`;
}
export function hint(level: { width: number; height: number; mineCount: number }, cells: readonly CellState[], maxRounds = 200): Hint {
    const view = viewOf(level, cells), flagged = (i: number): boolean => cells[i]?.mark === 'flag';
    const mines = new Set<number>(), at = (i: number) => ({ x: i % level.width, y: Math.floor(i / level.width) });
    let limited = false;
    for (let round = 0; round < maxRounds; round++) {
        const result = deduce(view, mines);
        limited ||= result.limited;
        // New information first: a hidden safe cell (a wrong flag included), then a mine the player has not flagged.
        for (const d of result.found) {
            const open = d.safe.filter(i => !cells[i]?.revealed);
            if (open.length) {
                // The cells outlined are exactly the cells the text counts; a wrong flag among them is said first.
                const wrong = open.filter(flagged), first = wrong[0] ?? open[0] ?? 0, text = explain({ ...d, safe: open }, view, false);
                const proof = wrong.length ? `${plural(wrong.length, 'Un drapeau est faux', `${String(wrong.length)} drapeaux sont faux`)}. ${text}` : text;
                return { status: 'safe_move', ...at(first), proof, cells: open, sources: d.sources, shared: d.pair?.shared ?? [], technique: d.technique, wrongFlag: wrong.length > 0 };
            }
        }
        for (const d of result.found) {
            const unflagged = d.mines.filter(i => !flagged(i));
            if (unflagged.length) return { status: 'mine_proven', ...at(unflagged[0] ?? 0), proof: explain({ ...d, mines: d.mines }, view, true), cells: d.mines, sources: d.sources, shared: d.pair?.shared ?? [], technique: d.technique };
        }
        // Everything proven so far is already flagged: take those mines as known, and look one step further.
        const before = mines.size;
        for (const d of result.found) d.mines.forEach(i => mines.add(i));
        if (mines.size === before) break;
    }
    return { status: 'unknown', reason: limited ? 'node_limit' : 'ambiguous', proof: 'Aucune déduction certaine ici : il faudrait deviner. Le jeu ne devine pas à votre place.' };
}
/** A hidden board for tests and tools: the mines and numbers of a curated layout (no reveal). */
export function boardOf(level: LevelDefinition): { mines: boolean[]; numbers: number[] } {
    const mines = layoutMines(level.layout ?? []);
    return { mines, numbers: counts(level.width, level.height, mines) };
}
