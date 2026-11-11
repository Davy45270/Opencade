/* global console, process */
// node --import ./scripts/ts-loader.js scripts/search-busfolie.js --slots=1,2,3 --out=<dir>   (offline, never in CI)
// node --import ./scripts/ts-loader.js scripts/search-busfolie.js --write=<dir>                    (freezes data.ts)
// Bus en folie: for each slot, the best of 60 generator seeds, then a deterministic local search (relocate or slide a
// vehicle, turn a bus round, swap two groups, move a cone; exits follow the buses) that keeps a board only if the whole
// reachable space is solved and, from level 2, if a real dead end hides along the shortest line. The board kept is the
// one whose measured difficulty is closest to a rising target (6.5 + 0.65 per level). Fixed seeds: same output each run.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { Random } from '../src/engines/shared/random.ts';
import { generateLevel, hopeless, laneExits } from '../src/engines/busfolie/generator.ts';
import { analyse, difficulty } from '../src/engines/busfolie/solver.ts';
import { initialState, validateLevel, cellsOf } from '../src/engines/busfolie/rules.ts';
import { SLOTS } from '../src/engines/busfolie/slots.ts';
import { toEntry } from '../src/engines/busfolie/format.ts';
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
export const MAX_STATES = 60000;
export const target = i => 6.5 + 0.65 * i;
/** Traffic moves wanted beyond the departures: 1 at the start, up to 6. */
export const minExtra = i => Math.min(6, 1 + Math.floor(i / 4));
const cost = (m, i) => Math.abs(m.d - target(i)) + 3 * Math.max(0, minExtra(i) - m.extra);
const moveText = m => `${m.busId} ${m.direction === 'forward' ? 'f' : 'b'}${m.distance}`;
function measure(level, i) {
    if (validateLevel(level).length || hopeless(level)) return null;
    const a = analyse(level, initialState(level), MAX_STATES);
    if (a.status !== 'solved') return null;
    if (i >= 1 && !a.trap) return null;
    if (i === 0 && (a.optimal < 4 || a.optimal > 7)) return null;
    // Moves beyond one departure per bus: the traffic part of the puzzle.
    const extra = a.optimal - level.buses.filter(b => b.color !== 'gris').length;
    return { a, d: difficulty(a), extra };
}
function mutate(level, r, coloured) {
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
function search(i) {
    const slot = SLOTS[i], t = slot.template, goal = target(i), started = Date.now();
    let best = null;
    for (let seed = 1; seed <= 400 && (seed <= 60 || !best); seed++) {
        const level = generateLevel(t, 1000 * (i + 1) + seed, `BUS-${String(i + 1).padStart(3, '0')}`); if (!level) continue;
        const m = measure(level, i); if (!m) continue;
        if (!best || cost(m, i) < cost(best.m, i)) best = { level, m };
    }
    if (!best) { console.log(`niveau ${i + 1} : aucun candidat`); return null; }
    const r = new Random(7919 * (i + 1));
    for (let it = 0; it < 700 && cost(best.m, i) > 0.4; it++) {
        const level = mutate(best.level, r, t.coloured), m = measure(level, i);
        if (m && cost(m, i) <= cost(best.m, i)) best = { level, m };
    }
    const { a, d } = best.m;
    console.log(`niveau ${i + 1} ${slot.name} : coups ${a.optimal} (+${best.m.extra}), états ${a.states}, impasses ${a.dead}, difficulté ${d} (cible ${goal.toFixed(1)}), ${((Date.now() - started) / 1000).toFixed(0)} s`);
    return toEntry(best.level, {
        par: a.optimal, difficulty: d, solution: a.solution.map(moveText).join(', '),
        trap: a.trap ? { at: a.trap.before.length, move: moveText(a.trap.move) } : null,
    });
}
const write = arg('write');
if (write) {
    const entries = SLOTS.map((_, i) => JSON.parse(readFileSync(`${write}/${i + 1}.json`, 'utf8')));
    const body = entries.map(e => `    ${JSON.stringify(e).replace(/"(\w+)":/g, '$1: ').replace(/,(\w+): /g, ', $1: ').replaceAll('"', '\'')},`).join('\n');
    const file = 'src/engines/busfolie/data.ts', head = readFileSync(file, 'utf8').split('export const DATA')[0];
    writeFileSync(file, `${head}export const DATA: readonly Entry[] = [\n${body}\n];\n`);
} else {
    const out = arg('out') ?? 'busfolie-search', slots = (arg('slots') ?? SLOTS.map((_, i) => i + 1).join(',')).split(',').map(Number);
    mkdirSync(out, { recursive: true });
    for (const n of slots) { const entry = search(n - 1); if (entry) writeFileSync(`${out}/${n}.json`, JSON.stringify(entry)); }
}
