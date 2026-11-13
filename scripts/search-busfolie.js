/* global console, process */
// node --import ./scripts/ts-loader.js scripts/search-busfolie.js --slots=1,2,3 --out=<dir>   (offline, never in CI)
// node --import ./scripts/ts-loader.js scripts/search-busfolie.js --write=<dir>                    (freezes data.ts)
// Bus en folie: for each slot, the best of 60 generator seeds, then a deterministic local search (relocate or slide a
// vehicle, turn a bus round, swap two groups, move a cone; exits follow the buses) that keeps a board only if the whole
// reachable space is solved and, from level 2, if a real dead end hides along the shortest line. The board kept is the
// one whose measured difficulty is closest to a rising target (6.5 + 0.65 per level for the first 30 levels, then the
// gentler slope of target() for the second campaign). Fixed seeds: same output each run. The functions are exported
// for scripts/game.js; --write keeps the frozen entry of every slot whose file is absent from <dir>.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Random } from '../src/engines/shared/random.ts';
import { generateLevel, hopeless, laneExits } from '../src/engines/busfolie/generator.ts';
import { analyse, difficulty } from '../src/engines/busfolie/solver.ts';
import { initialState, validateLevel, cellsOf } from '../src/engines/busfolie/rules.ts';
import { SLOTS } from '../src/engines/busfolie/slots.ts';
import { toEntry } from '../src/engines/busfolie/format.ts';
import { DATA } from '../src/engines/busfolie/data.ts';
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
export const MAX_STATES = 60000;
/** Difficulty wanted at slot i (0-based): the first campaign's slope, then CAMPAIGN_2_SLOPE per level from level 30's. */
export const CAMPAIGN_2_SLOPE = 0.1;
export const target = i => i < 30 ? 6.5 + 0.65 * i : 6.5 + 0.65 * 29 + CAMPAIGN_2_SLOPE * (i - 29);
/** Traffic moves wanted beyond the departures: 1 at the start, up to 6. */
export const minExtra = i => Math.min(6, 1 + Math.floor(i / 4));
export const cost = (m, i) => Math.abs(m.d - target(i)) + 3 * Math.max(0, minExtra(i) - m.extra);
export const moveText = m => `${m.busId} ${m.direction === 'forward' ? 'f' : 'b'}${m.distance}`;
/** Why a board is kept or not, as a structured diagnostic: `ok` with its measure, or the first rule it breaks. */
export function diagnose(level, i) {
    const errors = validateLevel(level);
    if (errors.length) return { ok: false, reason: 'invalid', errors };
    if (hopeless(level)) return { ok: false, reason: 'hopeless', errors: ['a cone or a parallel parked car lies in the road ahead of a bus'] };
    const a = analyse(level, initialState(level), MAX_STATES);
    if (a.status !== 'solved') return { ok: false, reason: a.status === 'unknown' ? 'state_limit' : 'unsolvable', errors: [`${a.status} (${a.states} states, limit ${MAX_STATES})`] };
    if (i >= 1 && !a.trap) return { ok: false, reason: 'no_trap', errors: ['no dead end along the shortest line'] };
    if (i === 0 && (a.optimal < 4 || a.optimal > 7)) return { ok: false, reason: 'par_range', errors: [`par ${a.optimal} outside 4-7`] };
    // Moves beyond one departure per bus: the traffic part of the puzzle.
    const extra = a.optimal - level.buses.filter(b => b.color !== 'gris').length;
    return { ok: true, m: { a, d: difficulty(a), extra } };
}
export function measure(level, i) {
    const r = diagnose(level, i);
    return r.ok ? r.m : null;
}
export function mutate(level, r, coloured) {
    const pick = n => Math.floor(r.next() * n), L = structuredClone(level), w = L.board.width, h = L.board.height;
    const busy = skip => { const s = new Set(L.obstacles.map(o => o.y * w + o.x)); for (const b of L.buses) if (b !== skip) for (const [x, y] of cellsOf(b, b.x, b.y)) s.add(y * w + x); return s; };
    const op = pick(5), b = L.buses[pick(L.buses.length)];
    if (op === 0 || op === 1) {
        const others = busy(b);
        for (let t = 0; t < 40; t++) {
            const hz = op === 1 ? b.orientation === 'horizontal' : r.next() < 0.5;
            const x = op === 1 && !hz ? b.x : pick(hz ? w - b.length + 1 : w), y = op === 1 && hz ? b.y : pick(hz ? h : h - b.length + 1);
            const probe = { ...b, x, y, orientation: hz ? 'horizontal' : 'vertical' };
            if (cellsOf(probe, x, y).some(([cx, cy]) => others.has(cy * w + cx))) continue;
            Object.assign(b, probe);
            if ((b.orientation === 'horizontal') !== (b.facing === 'left' || b.facing === 'right')) b.facing = hz ? (r.next() < 0.5 ? 'right' : 'left') : (r.next() < 0.5 ? 'down' : 'up');
            if (b.color === 'gris') b.facing = hz ? 'right' : 'down';
            break;
        }
    } else if (op === 2) {
        if (b.color !== 'gris') b.facing = { right: 'left', left: 'right', up: 'down', down: 'up' }[b.facing];
    } else if (op === 3) {
        const q = L.passengerQueue, k = pick(Math.max(1, q.length - 1));
        if (q.length > 1) { [q[k], q[k + 1]] = [q[k + 1], q[k]]; q.forEach((g, j) => { g.id = `G${j + 1}`; }); }
    } else if (L.obstacles.length) {
        const o = L.obstacles[pick(L.obstacles.length)], others = busy(null);
        for (let t = 0; t < 20; t++) { const c = pick(w * h); if (!others.has(c)) { o.x = c % w; o.y = Math.floor(c / w); break; } }
    }
    L.exits = laneExits(L.buses, coloured);
    return L;
}
/** One slot: generator seeds `1000 * (i + 1) + first` onwards (`count` of them, up to 400 while none is kept), then
 * `iterations` mutations seeded by the slot. `onCandidate` sees every generated board and its diagnostic. */
export function searchSlot(i, { first = 1, count = 60, iterations = 700, onCandidate } = {}) {
    const slot = SLOTS[i], t = slot.template;
    let best = null, tried = 0, kept = 0;
    for (let seed = first; seed < first + 400 && (seed < first + count || !best); seed++) {
        const generatorSeed = 1000 * (i + 1) + seed, level = generateLevel(t, generatorSeed, `BUS-${String(i + 1).padStart(3, '0')}`);
        tried++;
        const diagnostic = level ? diagnose(level, i) : { ok: false, reason: 'generator', errors: ['the generator found no valid board for this seed'] };
        const m = diagnostic.ok ? diagnostic.m : null;
        onCandidate?.({ seed: generatorSeed, level, diagnostic });
        if (!m) continue;
        kept++;
        if (!best || cost(m, i) < cost(best.m, i)) best = { level, m, seed: generatorSeed };
    }
    if (!best) return { best: null, tried, kept, iterations: 0, accepted: 0 };
    const r = new Random(7919 * (i + 1));
    let it = 0, accepted = 0;
    for (; it < iterations && cost(best.m, i) > 0.4; it++) {
        const level = mutate(best.level, r, t.coloured), m = measure(level, i);
        if (m && cost(m, i) <= cost(best.m, i)) { best = { level, m, seed: best.seed }; accepted++; }
    }
    return { best, tried, kept, iterations: it, accepted };
}
export const entryOf = (level, a, d) => toEntry(level, {
    par: a.optimal, difficulty: d, solution: a.solution.map(moveText).join(', '),
    trap: a.trap ? { at: a.trap.before.length, move: moveText(a.trap.move) } : null,
});
function search(i) {
    const slot = SLOTS[i], goal = target(i), started = Date.now();
    const { best } = searchSlot(i);
    if (!best) { console.log(`niveau ${i + 1} : aucun candidat`); return null; }
    const { a, d } = best.m;
    console.log(`niveau ${i + 1} ${slot.name} : coups ${a.optimal} (+${best.m.extra}), états ${a.states}, impasses ${a.dead}, difficulté ${d} (cible ${goal.toFixed(1)}), ${((Date.now() - started) / 1000).toFixed(0)} s`);
    return entryOf(best.level, a, d);
}
/** data.ts body, one entry per line, in the frozen format. */
export const dataBody = entries => entries.map(e => `    ${JSON.stringify(e).replace(/"(\w+)":/g, '$1: ').replace(/,(\w+): /g, ', $1: ').replaceAll('"', '\'')},`).join('\n');
const write = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href ? arg('write') : undefined;
if (write) {
    const entries = SLOTS.map((_, i) => existsSync(`${write}/${i + 1}.json`) ? JSON.parse(readFileSync(`${write}/${i + 1}.json`, 'utf8')) : DATA[i]);
    const missing = entries.findIndex(e => !e); if (missing >= 0) throw new Error(`niveau ${missing + 1} : ni figé ni dans ${write}`);
    const file = 'src/engines/busfolie/data.ts', head = readFileSync(file, 'utf8').split('export const DATA')[0];
    writeFileSync(file, `${head}export const DATA: readonly Entry[] = [\n${dataBody(entries)}\n];\n`);
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const out = arg('out') ?? 'busfolie-search', slots = (arg('slots') ?? SLOTS.map((_, i) => i + 1).join(',')).split(',').map(Number);
    mkdirSync(out, { recursive: true });
    for (const n of slots) { const entry = search(n - 1); if (entry) writeFileSync(`${out}/${n}.json`, JSON.stringify(entry)); }
}
