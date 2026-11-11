/* global console, process */
// Offline colouring of the Dévisso assemblies (never run by the tests): for a hand-drawn layout of
// src/engines/devisso/levels.ts, draws seeded removal orders, colours the screws along each order with
// a buffer pressure that grows over the campaign, and keeps a colouring whose recorded order wins
// without boost, whose dead end is real (solver), and whose naive greedy play fails from level 9 on.
// Writes colors, queue, moves and trap back into levels.ts.
//   node --import ./scripts/ts-loader.js scripts/search-devisso.js [--only=3,4] [--force] [--tries=300]
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/engines/devisso/levels.ts';
import { parse, initial, unscrew, blocker, won, COLOR_LETTERS, RAINBOW, BASE_BUFFER, ACTIVE } from '../src/engines/devisso/rules.ts';
import { layoutProblems } from '../src/engines/devisso/check.ts';
import { shortestTrap, trap as deepTrap, solve } from '../src/engines/devisso/solver.ts';
import { greedy } from '../src/engines/devisso/metrics.ts';
import { Random } from '../src/engines/shared/random.ts';

const args = process.argv.slice(2);
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',').map(n => Number(n) - 1);
const force = args.includes('--force');
const tries = Number(args.find(a => a.startsWith('--tries='))?.slice(8) ?? 300);
const pick = (random, list) => list[Math.floor(random.next() * list.length)];

/** A removal order that respects every blocker (no boxes: an endless buffer). */
export function order(board, random) {
    let s = initial(board); s.slots = [null, null]; s.cap = 1e9;
    const taps = [], flat = [];
    while (s.present.some(Boolean)) {
        const free = board.screws.flatMap((_, i) => s.present[i] && blocker(board, s, i) === null ? [i] : []);
        if (!free.length) return null;
        const i = pick(random, free), moved = unscrew(board, s, i);
        if (!moved) return null;
        taps.push(i); flat.push(...moved.removed); s = moved.state;
    }
    return { taps, flat };
}
/** Colours along the order: `p` is the chance that a screw waits in the buffer for a later box. */
function colour(board, flat, palette, p, random, slots = ACTIVE) {
    const total = board.screws.length / 3, colors = board.screws.map(s => s.color === RAINBOW ? RAINBOW : -1);
    const queue = [], future = [];
    let created = 0, buffered = 0;
    const newBox = exclude => { const c = pick(random, palette.filter(c => !exclude.includes(c))); if (c === undefined) return null; queue.push(c); created++; return c; };
    const active = [];
    for (let k = 0; k < slots && created < total; k++) { const c = newBox(active.map(b => b.color)); active.push({ color: c, filled: 0 }); }
    const arrive = slot => {
        const f = future.shift();
        if (f) { active[slot] = { color: f.color, filled: f.reserved }; buffered -= f.reserved; queue.push(f.color); if (f.reserved === 3) complete(slot); return; }
        if (created < total) { const c = newBox([]); active[slot] = { color: c, filled: 0 }; return; }
        active[slot] = null;
    };
    // Boxes arriving from `future` were pushed to the queue at arrival: keep creation order apart.
    const complete = slot => arrive(slot);
    for (const i of flat) {
        if (colors[i] === RAINBOW) {
            let slot = -1, best = -1;
            active.forEach((b, k) => { if (b && b.filled < 3 && b.filled > best) { best = b.filled; slot = k; } });
            if (slot < 0) return null;
            if (++active[slot].filled === 3) complete(slot);
            continue;
        }
        const direct = active.flatMap((b, k) => b && b.filled < 3 ? [k] : []);
        const activeColours = active.filter(Boolean).map(b => b.color);
        const waiting = buffered < BASE_BUFFER ? future.filter(f => f.reserved < 3) : [];
        const fresh = buffered < BASE_BUFFER && created < total ? palette.filter(c => !activeColours.includes(c) && !future.some(f => f.color === c)) : [];
        const wait = (waiting.length || fresh.length) && (!direct.length || random.next() < p);
        if (wait) {
            let f = waiting.length && (!fresh.length || random.next() < 0.6) ? pick(random, waiting) : null;
            if (!f) { const c = pick(random, fresh); f = { color: c, reserved: 0 }; future.push(f); created++; }
            f.reserved++; buffered++; colors[i] = f.color;
        } else if (direct.length) {
            const slot = pick(random, direct); colors[i] = active[slot].color;
            if (++active[slot].filled === 3) complete(slot);
        } else return null;
    }
    return { colors };
}
export function replay(board, taps, slots = ACTIVE) {
    let s = initial(board, slots), peak = 0;
    for (const i of taps) { const m = unscrew(board, s, i); if (!m) return null; s = m.state; peak = Math.max(peak, s.buffer.length); }
    return won(s) ? { peak } : null;
}
/** Boxes per colour used: a colouring that leans on one colour reads poorly. */
function queueCounts(queue) { const n = {}; for (const c of queue) n[c] = (n[c] ?? 0) + 1; return Object.values(n); }
function letters(colors) { return colors.map(c => c === RAINBOW ? '*' : COLOR_LETTERS[c]).join(''); }
if (process.argv[1]?.endsWith('search-devisso.js')) main();
function main() {
const fields = /colors: '[^']*', queue: '[^']*', boosts: (\[[^\]]*\]), moves: \d+, trap: \d+/g;
for (const [index, level] of LEVELS.entries()) {
    if (only && !only.includes(index)) continue;
    if (level.colors && !force) continue;
    const board = parse({ ...level, colors: '', queue: '' });
    const problems = layoutProblems(board);
    console.log(`\n${index + 1}. ${level.name}: ${board.screws.length} vis, ${board.plates.length} plaques${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
    if (board.screws.length % 3) { console.log('  nombre de vis non multiple de 3'); continue; }
    if (problems.length) continue;
    const kinds = Math.min(8, 4 + Math.floor(index / 4), board.screws.length / 3);
    const pressure = 0.25 + 0.25 * index / 29, band = index < 5 ? [2, 4] : index < 15 ? [3, 5] : [4, 5];
    let best = null;
    for (let t = 0; t < tries; t++) {
        const random = new Random(1000 * (index + 1) + t);
        const palette = [...Array(8).keys()].sort(() => random.next() - 0.5).slice(0, kinds).sort((a, b) => a - b);
        const removal = order(board, random); if (!removal) continue;
        const coloured = colourAndQueue(board, removal.flat, palette, pressure, random); if (!coloured) continue;
        const candidate = { ...level, colors: letters(coloured.colors), queue: coloured.queue.map(c => COLOR_LETTERS[c]).join('') };
        let b; try { b = parse(candidate); } catch { continue; }
        const run = replay(b, removal.taps); if (!run) continue;
        const start = initial(b);
        const dead = deepTrap(b, start, 20000);
        if (!dead) continue;
        const naive = greedy(b);
        const proof = solve(b, start, 20000);
        if (!proof || !proof.moves.length) continue;
        const counts = queueCounts(candidate.queue), balance = Math.max(...counts) - Math.min(...counts) > 1 ? 2 : 0;
        const score = balance + (run.peak >= band[0] && run.peak <= band[1] ? 0 : 5) + (index >= 8 && naive.won ? 3 : 0) + (index < 3 && !naive.won ? 2 : 0) + proof.visited / 1e6;
        if (!best || score < best.score) best = { score, candidate, taps: removal.taps, peak: run.peak, greedy: naive.won, visited: proof.visited, used: palette.length };
        if (score < 0.5) break;
    }
    if (!best) { console.log('  aucune coloration retenue'); continue; }
    { const b = parse(best.candidate); const start = initial(b); best.trap = (shortestTrap(b, start, 40000) ?? deepTrap(b, start, 20000) ?? []).length; }
    console.log(`  ${best.candidate.colors} / ${best.candidate.queue} — ${best.taps.length} coups, pic ${best.peak}, piège ${best.trap} coups, glouton ${best.greedy ? 'gagne' : 'perd'}, solveur ${best.visited} positions`);
    // Re-read before each write: several searches (--only) may run side by side, each level is written as soon as found.
    const current = readFileSync('src/engines/devisso/levels.ts', 'utf8'), match = [...current.matchAll(fields)][index];
    if (!match) throw new Error('champ introuvable');
    const replacement = `colors: '${best.candidate.colors}', queue: '${best.candidate.queue}', boosts: ${match[1]}, moves: ${best.taps.length}, trap: ${best.trap}`;
    writeFileSync('src/engines/devisso/levels.ts', current.slice(0, match.index) + replacement + current.slice(match.index + match[0].length));
}
}

/** Colouring plus the exact arrival queue (fresh boxes join the queue when they become active or are planned). */
export function colourAndQueue(board, flat, palette, p, random, slots = ACTIVE) {
    const r = colour(board, flat, palette, p, random, slots); if (!r) return null;
    return { colors: r.colors, queue: queueFor(board, flat, r.colors, slots) };
}
/** Arrival order the engine will follow for this colouring along this order: simulate, and whenever a slot
 * empties, the next box is the colour of the oldest buffered screw, else the colour of the next screw
 * in the order that has no room in an active box. */
function queueFor(board, flat, colors, slots) {
    const total = colors.length / 3, queue = [], active = Array(slots).fill(null), buffer = [];
    let made = 0;
    const need = from => {
        if (buffer.length) return buffer[0];
        for (let k = from; k < flat.length; k++) { const c = colors[flat[k]]; if (c !== RAINBOW && !active.some(b => b && b.color === c && b.filled < 3)) return c; }
        for (let k = from; k < flat.length; k++) { const c = colors[flat[k]]; if (c !== RAINBOW) return c; }
        return undefined;
    };
    const arrive = (slot, from) => {
        if (made >= total) { active[slot] = null; return; }
        const c = need(from); if (c === undefined) { active[slot] = null; return; }
        queue.push(c); made++; active[slot] = { color: c, filled: 0 };
        for (let k = 0; k < buffer.length && active[slot].filled < 3;) { if (buffer[k] === c) { buffer.splice(k, 1); active[slot].filled++; } else k++; }
        if (active[slot].filled === 3) arrive(slot, from);
    };
    for (let k = 0; k < slots; k++) arrive(k, 0);
    flat.forEach((i, n) => {
        const c = colors[i];
        let slot = -1;
        if (c === RAINBOW) { let best = -1; active.forEach((b, k) => { if (b && b.filled < 3 && b.filled > best) { best = b.filled; slot = k; } }); }
        else slot = active.findIndex(b => b && b.color === c && b.filled < 3);
        if (slot < 0) { buffer.push(c); return; }
        if (++active[slot].filled === 3) arrive(slot, n + 1);
    });
    return queue;
}
