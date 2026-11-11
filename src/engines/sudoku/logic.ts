import { bit, bitCount, candidates, cellName, digits, topology, unitName, type Grid, type Topology } from './grid';
/**
 * Human techniques, from the easiest: what the hints explain and what the difficulty measures (dossier § Indices:
 * single candidate in a cell, unique place in a unit, then finer techniques). Every step is checkable on the grid.
 */
export const TECHNIQUES = ['hidden-single', 'naked-single', 'locked-candidates', 'pair', 'x-wing'] as const;
export type Technique = typeof TECHNIQUES[number];
/** Tier of a technique: 1 for the hidden single … 5 for the X-wing. */
export const tierOf = (t: Technique): number => TECHNIQUES.indexOf(t) + 1;
export const TECHNIQUE_NAMES: Record<Technique, { fr: string; en: string }> = {
    'hidden-single': { fr: 'Place unique', en: 'Hidden single' },
    'naked-single': { fr: 'Candidat unique', en: 'Naked single' },
    'locked-candidates': { fr: 'Alignement', en: 'Locked candidates' },
    'pair': { fr: 'Paire', en: 'Pair' },
    'x-wing': { fr: 'Croix', en: 'X-wing' },
};
export interface Placement { kind: 'place'; technique: 'hidden-single' | 'naked-single'; index: number; value: number; unit: number | null; text: string }
export interface Elimination { kind: 'eliminate'; technique: 'locked-candidates' | 'pair' | 'x-wing'; removed: { index: number; value: number }[]; cells: number[]; text: string }
export type Step = Placement | Elimination;
function placement(t: Topology, values: readonly number[], masks: readonly number[]): Placement | null {
    // Unique place in a unit: blocks first (the easiest to see), then rows and columns.
    const order = [...t.units.keys()].sort((a, b) => (t.kinds[a] === 'box' ? 0 : 1) - (t.kinds[b] === 'box' ? 0 : 1) || a - b);
    for (const u of order) {
        const unit = t.units[u] ?? [];
        for (let v = 1; v <= t.size; v++) {
            if (unit.some(i => values[i] === v)) continue;
            const spots = unit.filter(i => !values[i] && (masks[i] ?? 0) & bit(v));
            const at = spots[0];
            if (spots.length === 1 && at !== undefined) return { kind: 'place', technique: 'hidden-single', index: at, value: v, unit: u,
                text: `Dans ${unitName(t, u)}, le ${String(v)} ne peut aller qu'en ${cellName(t, at)}.` };
        }
    }
    for (let i = 0; i < t.cells; i++) {
        const m = masks[i] ?? 0;
        if (!values[i] && m && !(m & (m - 1))) {
            const v = digits(m)[0] ?? 0, others = digits(t.full & ~m);
            return { kind: 'place', technique: 'naked-single', index: i, value: v, unit: null,
                text: `En ${cellName(t, i)}, seul le ${String(v)} reste possible : ${others.join(', ')} ${others.length > 1 ? 'sont' : 'est'} déjà dans sa ligne, sa colonne ou son bloc.` };
        }
    }
    return null;
}
function spotsOf(t: Topology, values: readonly number[], masks: readonly number[], u: number, v: number): number[] {
    return (t.units[u] ?? []).filter(i => !values[i] && (masks[i] ?? 0) & bit(v));
}
function locked(t: Topology, values: readonly number[], masks: readonly number[]): Elimination | null {
    const n = t.size;
    for (let u = 0; u < 3 * n; u++) {
        for (let v = 1; v <= n; v++) {
            const spots = spotsOf(t, values, masks, u, v);
            if (spots.length < 2) continue;
            // Every place of v in unit u lies in one other unit w: v leaves the rest of w.
            for (const k of [0, 1, 2] as const) {
                const w = t.unitsOf[spots[0] ?? 0]?.[k] ?? -1;
                if (w === u || !spots.every(i => t.unitsOf[i]?.[k] === w)) continue;
                if ((t.kinds[u] === 'box') === (t.kinds[w] === 'box')) continue;
                const removed = spotsOf(t, values, masks, w, v).filter(i => !spots.includes(i)).map(index => ({ index, value: v }));
                if (removed.length) return { kind: 'eliminate', technique: 'locked-candidates', removed, cells: spots,
                    text: `Dans ${unitName(t, u)}, le ${String(v)} est forcément dans ${unitName(t, w)} : on l'écarte du reste de ${unitName(t, w)}.` };
            }
        }
    }
    return null;
}
function pairs(t: Topology, values: readonly number[], masks: readonly number[]): Elimination | null {
    for (let u = 0; u < t.units.length; u++) {
        const unit = (t.units[u] ?? []).filter(i => !values[i]);
        // Naked pair: two cells holding the same two candidates.
        for (const a of unit) for (const b of unit) {
            const m = masks[a] ?? 0;
            if (b <= a || bitCount(m) !== 2 || masks[b] !== m) continue;
            const removed = unit.filter(i => i !== a && i !== b).flatMap(i => digits((masks[i] ?? 0) & m).map(value => ({ index: i, value })));
            const [x, y] = digits(m);
            if (removed.length) return { kind: 'eliminate', technique: 'pair', removed, cells: [a, b],
                text: `${cellName(t, a)} et ${cellName(t, b)} ne peuvent contenir que ${String(x)} et ${String(y)} : ces chiffres sont exclus du reste de ${unitName(t, u)}.` };
        }
        // Hidden pair: two digits whose only places in the unit are the same two cells.
        for (let x = 1; x <= t.size; x++) for (let y = x + 1; y <= t.size; y++) {
            const sx = spotsOf(t, values, masks, u, x), sy = spotsOf(t, values, masks, u, y);
            const [a, b] = sx;
            if (sx.length !== 2 || sy.length !== 2 || a === undefined || b === undefined || sy[0] !== a || sy[1] !== b) continue;
            const keep = bit(x) | bit(y);
            const removed = [a, b].flatMap(i => digits((masks[i] ?? 0) & ~keep).map(value => ({ index: i, value })));
            if (removed.length) return { kind: 'eliminate', technique: 'pair', removed, cells: [a, b],
                text: `Dans ${unitName(t, u)}, le ${String(x)} et le ${String(y)} ne peuvent aller qu'en ${cellName(t, a)} et ${cellName(t, b)} : ces deux cases ne gardent qu'eux.` };
        }
    }
    return null;
}
function xWing(t: Topology, values: readonly number[], masks: readonly number[]): Elimination | null {
    const n = t.size;
    for (let v = 1; v <= n; v++) for (const base of [0, n]) {
        // base 0: rows carry the pattern, columns lose v; base n: the transpose.
        const cover = base === 0 ? n : 0, line = (i: number): number => base === 0 ? i % n : Math.floor(i / n);
        for (let a = base; a < base + n; a++) for (let b = a + 1; b < base + n; b++) {
            const sa = spotsOf(t, values, masks, a, v), sb = spotsOf(t, values, masks, b, v);
            if (sa.length !== 2 || sb.length !== 2) continue;
            const la = sa.map(line), lb = sb.map(line);
            if (la[0] !== lb[0] || la[1] !== lb[1]) continue;
            const corners = [...sa, ...sb];
            const removed = la.flatMap(l => spotsOf(t, values, masks, cover + l, v)).filter(i => !corners.includes(i)).map(index => ({ index, value: v }));
            if (removed.length) {
                const what = base === 0 ? ['lignes', 'colonnes'] : ['colonnes', 'lignes'], num = (u: number) => String(u - base + 1), other = (l: number) => String(l + 1);
                return { kind: 'eliminate', technique: 'x-wing', removed, cells: corners,
                    text: `Sur les ${what[0] ?? ''} ${num(a)} et ${num(b)}, le ${String(v)} ne peut aller que dans les ${what[1] ?? ''} ${other(la[0] ?? 0)} et ${other(la[1] ?? 0)} : on l'écarte de ces ${what[1] ?? ''} ailleurs.` };
            }
        }
    }
    return null;
}
/** The easiest step from these values and candidate masks, or null when only a trial would go on. */
export function nextStep(g: Grid, values: readonly number[], masks: readonly number[]): Step | null {
    const t = topology(g);
    return placement(t, values, masks) ?? locked(t, values, masks) ?? pairs(t, values, masks) ?? xWing(t, values, masks);
}
export interface Rating {
    solved: boolean;
    /** Hardest technique the logical solution needs (null: nothing to place). */
    hardest: Technique | null;
    tier: number;
    /** Uses of each technique on the way. */
    uses: Record<Technique, number>;
    steps: number;
    empties: number;
    /** Comparable difficulty: size first, then the hardest technique, then how often finer techniques were needed. */
    score: number;
}
/** Solve like a person, easiest step first; the rating is the path taken. */
export function rate(g: Grid, givens: readonly number[]): Rating {
    const t = topology(g), values = [...givens], masks = candidates(g, values);
    const uses: Record<Technique, number> = { 'hidden-single': 0, 'naked-single': 0, 'locked-candidates': 0, 'pair': 0, 'x-wing': 0 };
    let steps = 0, hardest = 0;
    for (;;) {
        const step = nextStep(g, values, masks);
        if (!step) break;
        steps++; uses[step.technique]++; hardest = Math.max(hardest, tierOf(step.technique));
        if (step.kind === 'place') {
            values[step.index] = step.value; masks[step.index] = 0;
            for (const p of t.peers[step.index] ?? []) masks[p] = (masks[p] ?? 0) & ~bit(step.value);
        } else for (const r of step.removed) masks[r.index] = (masks[r.index] ?? 0) & ~bit(r.value);
    }
    const solved = values.every(v => v > 0), empties = givens.filter(v => !v).length;
    const fine = uses['locked-candidates'] + uses.pair + uses['x-wing'];
    const sizeRank = g.size === 4 ? 0 : g.size === 6 ? 1 : 2;
    const technique = TECHNIQUES[hardest - 1] ?? null;
    return { solved, hardest: technique, tier: solved ? hardest : 6, uses, steps, empties,
        score: sizeRank * 1000 + (solved ? hardest : 6) * 100 + Math.min(60, fine * 4) + Math.round(empties / 4) };
}
/** Steps from these values up to the first placement: the eliminations that lead there, then the placement itself. */
export function deduce(g: Grid, values: readonly number[]): Step[] | null {
    const masks = candidates(g, values), chain: Step[] = [];
    for (let guard = 0; guard < 400; guard++) {
        const step = nextStep(g, values, masks);
        if (!step) return null;
        chain.push(step);
        if (step.kind === 'place') return chain;
        for (const r of step.removed) masks[r.index] = (masks[r.index] ?? 0) & ~bit(r.value);
    }
    return null;
}
