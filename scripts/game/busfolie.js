// Bus en folie adapter of scripts/game.js: every rule comes from the game's own modules (generator, rules, solver,
// search-busfolie.js, busfolie-diversity.js); this file only wraps them in receipts and writes them to an output
// directory, never to src/. Campaign 2 is levels 31-60 (slots 30-59, 0-based).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATOR_VERSION } from '../../src/engines/busfolie/generator.ts';
import { ENGINE_VERSION, SCHEMA_VERSION, applyAction, initialState, validateLevel } from '../../src/engines/busfolie/rules.ts';
import { LIMITS, analyse, difficulty, solve } from '../../src/engines/busfolie/solver.ts';
import { SLOTS } from '../../src/engines/busfolie/slots.ts';
import { DATA } from '../../src/engines/busfolie/data.ts';
import { parseEntry, toEntry } from '../../src/engines/busfolie/format.ts';
import { MAX_STATES, cost, diagnose, minExtra, moveText, searchSlot, target } from '../search-busfolie.js';
import { busfolieDiversity, busfolieFeatures } from '../busfolie-diversity.js';

export { ENGINE_VERSION };
export const CAMPAIGN = { id: 'busfolie-c2', first: 31, last: 60 };
/** Levels frozen before campaign 2: they never change (their hash is in the campaign receipt). */
export const FROZEN_BEFORE = 30;
export const SOLVER_NODES = 200000;
const id3 = n => String(n).padStart(3, '0');
const sha = text => createHash('sha256').update(text).digest('hex');
/** The board alone, in the frozen text format: map, vehicles, exits, line (no seed, no measure). */
export const boardOf = level => { const e = toEntry(level, { par: 0, difficulty: 0, solution: '', trap: null }); return { map: e.map, vehicles: e.vehicles, exits: e.exits, queue: e.queue }; };
export const boardHash = level => sha(JSON.stringify(boardOf(level)));
export const entryHash = entry => sha(JSON.stringify({ map: entry.map, vehicles: entry.vehicles, exits: entry.exits, queue: entry.queue }));
/** Hash of the frozen entries before campaign 2, in data.ts order. */
export const frozenHash = () => sha(JSON.stringify(DATA.slice(0, FROZEN_BEFORE)));
const parseMove = text => { const [busId, how] = text.split(' '); return { busId, direction: how.startsWith('f') ? 'forward' : 'backward', distance: Number(how.slice(1)) }; };

export const capabilities = {
    capabilitiesVersion: 1, gameId: 'busfolie', levelCount: SLOTS.length, levelOrigin: 'frozen',
    generator: { supported: true, seeded: true, version: GENERATOR_VERSION, profile: 'Template', source: 'src/engines/busfolie/generator.ts:generateLevel' },
    validator: { schema: null, rules: 'src/engines/busfolie/rules.ts:validateLevel', node: 'scripts/validate-busfolie.js' },
    solver: { supported: true, source: 'src/engines/busfolie/solver.ts:solve', verdicts: ['solved', 'unsolvable', 'unknown'], budget: 'nodes', evidence: 'proof+replay', defaultNodes: LIMITS.nodes },
    search: { script: 'scripts/search-busfolie.js:searchSlot', outDir: true, writesSrc: false },
    replay: { fixtures: ['src/engines/busfolie/campaigns/campaign-2.receipt.json'], recorder: 'scripts/game/busfolie.js:solveReceipt' },
    diversity: 'scripts/busfolie-diversity.js:busfolieDiversity',
    preview: { hook: '__BUSFOLIE_TEST__', loadLevel: 'index', loadDefinition: false },
    campaign: { ...CAMPAIGN, validator: 'scripts/validate-busfolie-campaign.js' },
};
/** `--check`: every `path:symbol` source names an exported symbol. */
export async function checkCapabilities(root) {
    const sources = [capabilities.generator.source, capabilities.validator.rules, capabilities.solver.source, capabilities.search.script, capabilities.replay.recorder, capabilities.diversity];
    const missing = [];
    for (const s of sources) {
        const [file, symbol] = s.split(':');
        const mod = await import(join(root, file));
        if (!(symbol in mod)) missing.push(s);
    }
    for (const file of [capabilities.validator.node, capabilities.campaign.validator]) if (!existsSync(join(root, file))) missing.push(file);
    return missing;
}

/** Slots (1-based level numbers) from "31-60" or "31,32". */
export function parseSlots(text) {
    const out = [];
    for (const part of String(text).split(',')) {
        const [a, b] = part.split('-').map(Number);
        for (let n = a; n <= (b ?? a); n++) out.push(n);
    }
    if (!out.length || out.some(n => !Number.isInteger(n) || n < 1 || n > SLOTS.length)) throw new RangeError(`slots: ${text} (1-${SLOTS.length})`);
    return out;
}

function receipt(n, level, extra) {
    const slot = SLOTS[n - 1];
    return {
        receiptVersion: 1, gameId: 'busfolie', campaignId: n > FROZEN_BEFORE ? CAMPAIGN.id : 'busfolie-c1', slot: n,
        candidateId: `busfolie-${id3(n)}-${String(level?.seed ?? extra.seed)}${extra.searched ? '-s' : ''}`,
        levelHash: level ? boardHash(level) : null, board: level ? boardOf(level) : null,
        provenance: { profile: { name: slot.name, template: slot.template }, seed: level?.seed ?? extra.seed, generatorVersion: GENERATOR_VERSION, engineVersion: ENGINE_VERSION, schemaVersion: SCHEMA_VERSION, ...extra.provenance },
        status: extra.status, validation: extra.validation, level,
        ...extra.more,
    };
}

/** generate: for each slot, the generator's seeded boards (every one gets a receipt, rejected ones with their
 * diagnostic), then the deterministic local search of search-busfolie.js from the best of them. */
export function generate({ slots, seed, count, iterations, maxCandidates, out, log }) {
    let budget = maxCandidates, total = 0, valid = 0;
    const summary = [];
    for (const n of slots) {
        if (budget <= 0) { summary.push({ slot: n, skipped: 'max-candidates' }); continue; }
        const candidates = [];
        const r = searchSlot(n - 1, {
            first: seed, count: Math.min(count, budget), iterations,
            onCandidate: ({ seed: s, level, diagnostic }) => {
                candidates.push(receipt(n, level, {
                    seed: s, status: diagnostic.ok ? 'candidate' : 'rejected',
                    validation: diagnostic.ok ? { errors: [] } : { reason: diagnostic.reason, errors: diagnostic.errors },
                    more: diagnostic.ok ? { metrics: { difficulty: diagnostic.m.d, par: diagnostic.m.a.optimal, states: diagnostic.m.a.states, cost: Math.round(100 * cost(diagnostic.m, n - 1)) / 100 } } : {},
                }));
            },
        });
        budget -= r.tried; total += r.tried; valid += r.kept;
        mkdirSync(join(out, 'candidates'), { recursive: true });
        writeFileSync(join(out, 'candidates', `${id3(n)}-${String(seed)}.json`), `${JSON.stringify(candidates, null, 1)}\n`);
        const row = { slot: n, tried: r.tried, valid: r.kept, iterations: r.iterations, accepted: r.accepted };
        if (r.best) {
            const start = candidates.find(c => c.provenance.seed === r.best.seed);
            const searched = receipt(n, r.best.level, {
                searched: true, status: 'candidate', validation: { errors: validateLevel(r.best.level) },
                provenance: { search: { source: 'scripts/search-busfolie.js:searchSlot', first: seed, count, mutationSeed: 7919 * n, iterations: r.iterations, accepted: r.accepted, startHash: start?.levelHash ?? null } },
                more: { metrics: { difficulty: r.best.m.d, par: r.best.m.a.optimal, target: Math.round(100 * target(n - 1)) / 100, cost: Math.round(100 * cost(r.best.m, n - 1)) / 100, minExtra: minExtra(n - 1), extra: r.best.m.extra } },
            });
            mkdirSync(join(out, 'searched'), { recursive: true });
            writeFileSync(join(out, 'searched', `${id3(n)}-${String(seed)}.json`), `${JSON.stringify(searched, null, 1)}\n`);
            row.hash = searched.levelHash; row.difficulty = r.best.m.d; row.target = searched.metrics.target;
        }
        summary.push(row);
        log(`niveau ${n} ${SLOTS[n - 1].name} : ${r.kept}/${r.tried} valides, ${r.accepted}/${r.iterations} mutations gardées${r.best ? `, difficulté ${r.best.m.d} (cible ${target(n - 1).toFixed(2)})` : ', aucun candidat'}`);
    }
    return { slots: summary, generated: total, valid, validRate: total ? Math.round(1000 * valid / total) / 1000 : 0 };
}

/** solve: validation, the node-bounded solver, the replay of its line by the rules' reducer, the exhaustive analysis.
 * `state` (optional): a position reached by `moves` from the start. */
export function solveReceipt(level, { nodes, moves = [], index = null }) {
    const errors = validateLevel(level);
    if (errors.length) return { status: 'rejected', validation: { errors }, solving: { verdict: 'not-applicable', evidence: 'none' } };
    let state = initialState(level);
    for (const text of moves) {
        const m = parseMove(text), r = applyAction(level, state, { type: 'MOVE_BUS', ...m });
        if (!r.accepted) return { status: 'rejected', validation: { errors: [`move "${text}" refused: ${r.reason}`] }, solving: { verdict: 'not-applicable', evidence: 'none' } };
        state = r.state;
    }
    const s = solve(level, { ...state, status: 'playing' }, { nodes });
    const solving = { verdict: s.status, evidence: s.status === 'solved' ? 'proof+replay' : s.status === 'unsolvable' ? 'proof' : 'none', native: { status: s.status, reason: s.reason ?? null, exploredNodes: s.exploredNodes }, budget: { nodes }, used: s.exploredNodes };
    if (s.status !== 'solved') return { status: s.status === 'unknown' ? 'candidate' : 'rejected', validation: { errors: [] }, solving };
    // Replay by the rules' reducer, from the same position, to the win.
    let r = state;
    for (const m of s.actions) { const x = applyAction(level, r, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance }); if (!x.accepted) return { status: 'rejected', validation: { errors: [`replay refused ${moveText(m)}`] }, solving }; r = x.state; }
    solving.line = s.actions.map(moveText);
    solving.replay = { status: r.status, moves: s.actions.length };
    if (r.status !== 'won') return { status: 'rejected', validation: { errors: ['replay did not win'] }, solving };
    const out = { status: 'verified', validation: { errors: [] }, solving };
    if (!moves.length) {
        const a = analyse(level, state, MAX_STATES);
        out.metrics = { difficulty: difficulty(a), par: a.optimal, states: a.states, dead: a.dead, trap: a.trap ? { at: a.trap.before.length, move: moveText(a.trap.move) } : null, solution: a.solution.map(moveText), features: busfolieFeatures({ ...level, par: a.optimal }).elements };
        if (a.status !== 'solved' || a.optimal !== s.actions.length) { out.status = 'rejected'; out.validation.errors.push(`analysis ${a.status}, ${a.states} states (limit ${MAX_STATES})`); }
        if (index !== null && index >= 1 && !a.trap) { out.status = 'rejected'; out.validation.errors.push('no dead end along the shortest line'); }
    }
    return out;
}

export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export const listJson = dir => existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => join(dir, f)) : [];

/** rank: the verified receipts, deduplicated by board hash (among themselves and against the frozen levels); then,
 * slot by slot, the board closest to the target among those not easier than the level five ranks before (frozen
 * levels included), else the closest one; then the progression and diversity rules of the game. */
export function rank(receipts) {
    const frozen = new Map(DATA.slice(0, FROZEN_BEFORE).map((e, i) => [entryHash(e), i + 1]));
    const seen = new Map(), rejected = [], bySlot = new Map();
    for (const r of receipts) {
        if (r.status !== 'verified') { rejected.push({ slot: r.slot, candidateId: r.candidateId, why: `status ${r.status} (${r.solving?.verdict ?? 'n/a'})` }); continue; }
        if (frozen.has(r.levelHash)) { rejected.push({ slot: r.slot, candidateId: r.candidateId, why: `duplicate of level ${frozen.get(r.levelHash)}` }); continue; }
        if (seen.has(r.levelHash)) { rejected.push({ slot: r.slot, candidateId: r.candidateId, why: `duplicate of ${seen.get(r.levelHash)}` }); continue; }
        seen.set(r.levelHash, r.candidateId);
        bySlot.set(r.slot, [...bySlot.get(r.slot) ?? [], r]);
    }
    // Progression: no level easier than the one five ranks before it, frozen levels included.
    const curve = new Map(DATA.slice(0, FROZEN_BEFORE).map((e, i) => [i + 1, e.difficulty])), selected = [];
    for (const slot of [...bySlot.keys()].sort((a, b) => a - b)) {
        const gap = r => Math.abs(r.metrics.difficulty - target(slot - 1)), floor = curve.get(slot - 5) ?? -Infinity;
        const all = [...bySlot.get(slot)].sort((a, b) => gap(a) - gap(b) || a.candidateId.localeCompare(b.candidateId));
        const pick = all.find(r => r.metrics.difficulty >= floor) ?? all[0];
        for (const r of all) if (r !== pick) rejected.push({ slot, candidateId: r.candidateId, why: `ranked below ${pick.candidateId} (difficulty ${r.metrics.difficulty}, target ${target(slot - 1).toFixed(2)})` });
        selected.push(pick); curve.set(slot, pick.metrics.difficulty);
    }
    const progression = [];
    for (const r of selected) { const before = curve.get(r.slot - 5); if (before !== undefined && r.metrics.difficulty < before) progression.push(`level ${r.slot} (${r.metrics.difficulty}) easier than level ${r.slot - 5} (${before})`); }
    const levels = selected.map(r => ({ ...parseEntry({ ...r.board, seed: r.provenance.seed, par: r.metrics.par, difficulty: r.metrics.difficulty, solution: '', trap: null }, `BUS-${id3(r.slot)}`), par: r.metrics.par }));
    const diversity = levels.length > 1 ? busfolieDiversity(levels) : null;
    return { selected, rejected, progression, diversity };
}

/** validate: the rules' validator, then the search's own acceptance rules, as one structured diagnostic. */
export function validate(level, slot) {
    const d = diagnose(level, Math.max(0, (slot ?? 2) - 1));
    return d.ok ? { reason: null, errors: [] } : { reason: d.reason, errors: d.errors };
}
/** The data.ts entry of a verified receipt (the input of `search-busfolie.js --write`). */
export const entryOfReceipt = r => ({ seed: r.provenance.seed, ...r.board, par: r.metrics.par, difficulty: r.metrics.difficulty, solution: r.metrics.solution.join(', '), trap: r.metrics.trap });
const levelOf = (entry, n) => ({ ...parseEntry(entry, `BUS-${id3(n)}`), par: entry.par });
/** The receipt committed with the campaign: one slim receipt per level, plus what the generation cost. */
export function campaignReceipt(selected, dir) {
    let generated = 0, valid = 0;
    const reasons = {};
    for (const f of listJson(join(dir, 'candidates'))) for (const c of readJson(f)) {
        generated++; if (c.status === 'candidate') valid++; else reasons[c.validation.reason] = (reasons[c.validation.reason] ?? 0) + 1;
    }
    return {
        receiptVersion: 1, gameId: 'busfolie', campaignId: CAMPAIGN.id, levels: `${CAMPAIGN.first}-${CAMPAIGN.last}`,
        generatorVersion: GENERATOR_VERSION, engineVersion: ENGINE_VERSION, schemaVersion: SCHEMA_VERSION, maxStates: MAX_STATES,
        frozenBefore: { levels: FROZEN_BEFORE, hash: frozenHash() },
        generation: { generated, valid, validRate: generated ? Math.round(1000 * valid / generated) / 1000 : 0, rejected: Object.fromEntries(Object.entries(reasons).sort()) },
        receipts: selected.map(r => ({
            slot: r.slot, name: SLOTS[r.slot - 1].name, candidateId: r.candidateId, levelHash: r.levelHash, board: r.board,
            provenance: r.provenance, status: 'selected',
            solving: { verdict: r.solving.verdict, evidence: r.solving.evidence, budget: r.solving.budget, used: r.solving.used, line: r.solving.line },
            metrics: { difficulty: r.metrics.difficulty, par: r.metrics.par, target: Math.round(100 * target(r.slot - 1)) / 100, states: r.metrics.states, dead: r.metrics.dead, trap: r.metrics.trap, solution: r.metrics.solution, features: r.metrics.features },
        })),
    };
}
/** report: the difficulty curve 1-60 (frozen levels, then the campaign receipt when given), progression, diversity. */
export function report(campaign) {
    const entries = DATA.map((e, i) => ({ n: i + 1, entry: e }));
    if (campaign) for (const r of campaign.receipts) entries[r.slot - 1] = { n: r.slot, entry: entryOfReceipt(r) };
    const rows = entries.filter(Boolean).map(({ n, entry }) => ({ level: n, name: SLOTS[n - 1]?.name ?? '', difficulty: entry.difficulty, target: Math.round(100 * target(n - 1)) / 100, par: entry.par, trap: entry.trap !== null }));
    const failures = [];
    for (const r of rows) { const before = rows.find(x => x.level === r.level - 5); if (before && r.difficulty < before.difficulty) failures.push(`level ${r.level} easier than level ${before.level}`); }
    const diversityOf = (from, to) => {
        const levels = entries.slice(from - 1, to).filter(Boolean).map(({ n, entry }) => levelOf(entry, n));
        if (levels.length < 2) return null;
        const d = busfolieDiversity(levels);
        return { levels: `${from}-${from + levels.length - 1}`, score: d.score, cloneShare: d.cloneShare, maxGapWithoutNovelty: d.maxGapWithoutNovelty, noveltyLevels: d.noveltyLevels.map(k => k + from - 1), novelty: d.novelty.map(x => ({ level: x.level + from - 1, elements: x.elements })) };
    };
    const c1 = diversityOf(1, FROZEN_BEFORE), c2 = diversityOf(CAMPAIGN.first, CAMPAIGN.last);
    if (c2 && c2.cloneShare !== 0) failures.push(`campaign 2 clones ${c2.cloneShare}`);
    if (c2 && c2.maxGapWithoutNovelty > 5) failures.push(`campaign 2 gap without novelty ${c2.maxGapWithoutNovelty}`);
    const max = Math.max(...rows.map(r => r.difficulty)), chart = rows.map(r => `${String(r.level).padStart(2)} ${'#'.repeat(Math.round(50 * r.difficulty / max)).padEnd(50)} ${r.difficulty.toFixed(1).padStart(5)} (cible ${r.target.toFixed(1)})`).join('\n');
    return { curve: rows, progression: failures.filter(f => f.startsWith('level')).length ? 'broken' : 'no level easier than the one five ranks before', diversity: { campaign1: c1, campaign2: c2 }, frozenBefore: { levels: FROZEN_BEFORE, hash: frozenHash() }, failures, chart };
}
