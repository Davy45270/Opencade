/* global console, process */
// Level Factory command line: npm run game -- <command> <game> [options]   (offline, never writes to src/)
// One JSON document on stdout ({ command, gameId, ok, exitCode, result, toolVersions }); logs on stderr.
// Exit codes: 0 success · 1 a candidate rejected or a validator failed · 2 usage, or a capability the game lacks ·
// 3 an `unknown` verdict where a proof was required. Run `npm run game -- --help` for the commands.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = { busfolie: () => import('./game/busfolie.js') };
const HELP = {
    '': `npm run game -- <command> <game> [options]

Commands (game: ${Object.keys(GAMES).join(', ')}):
  capabilities <game> [--check]                 what the game offers; --check: every cited source exists
  generate <game> --out <dir> [--count N] [--seed S] [--slots 31-60] [--iterations N] [--max-candidates N]
                                                seeded candidates and a local search per slot, with receipts
  validate <game> [--file f.json | --level N]   the level rules on one candidate; without a file: the validators
  solve <game> (--in <dir> | --file f.json | --level N) [--moves "BA f1, BB b2"] [--nodes N]
                                                node-bounded solver, replay of its line to the win, metrics
  rank <game> --in <dir> [--expect N]           deduplicate, pick one board per slot, progression and diversity
  report <game> [--in <dir>]                    difficulty curve and diversity, frozen levels plus <dir>

Common options: --help, --dry-run (say what would be read and written, do nothing), --max-candidates N.
Exit codes: 0 success, 1 rejected candidate or failed validator, 2 usage or missing capability, 3 unknown verdict.`,
};
const log = (...a) => console.error(...a);
function parse(argv) {
    const [command = '', gameId = '', ...rest] = argv.filter(a => a !== '--');
    const o = { _: [] };
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (!a.startsWith('--')) { o._.push(a); continue; }
        const [k, v] = a.slice(2).split('=');
        if (v !== undefined) o[k] = v;
        else if (rest[i + 1] !== undefined && !rest[i + 1].startsWith('--')) o[k] = rest[++i];
        else o[k] = true;
    }
    return { command, gameId, o };
}
function emit(doc) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
    process.exitCode = doc.exitCode;
}
/** Output directories stay outside src/ (the freeze is the game's own `--write`). */
function outside(dir) {
    const rel = relative(ROOT, resolve(dir));
    if (rel === 'src' || rel.startsWith(`src/`)) throw new UsageError(`refuse to write in ${rel}: the CLI never writes to src/`);
    return resolve(dir);
}
class UsageError extends Error {}
const int = (v, name, fallback) => {
    if (v === undefined) return fallback;
    const n = Number(v); if (!Number.isInteger(n) || n < 0) throw new UsageError(`--${name} expects a non-negative integer`); return n;
};

async function main() {
    const { command, gameId, o } = parse(process.argv.slice(2));
    if (!command || command === '--help' || o.help || gameId === '--help') { process.stdout.write(`${HELP['']}\n`); return; }
    const base = { command, gameId };
    if (!GAMES[gameId]) return emit({ ...base, ok: false, exitCode: 2, error: `no Level Factory adapter for "${gameId}" (generator.supported = false)`, toolVersions: { cli: 1 } });
    const g = await GAMES[gameId]();
    const toolVersions = { cli: 1, generator: g.capabilities.generator.version, engine: g.ENGINE_VERSION, solverBudget: g.capabilities.solver.budget, node: process.version };
    const done = (ok, exitCode, result) => emit({ ...base, ok, exitCode, result, toolVersions });
    const dry = (reads, writes) => done(true, 0, { dryRun: true, reads, writes });
    try {
        if (command === 'capabilities') {
            if (o['dry-run']) return dry(['scripts/game/busfolie.js'], []);
            const missing = o.check ? await g.checkCapabilities(ROOT) : [];
            return done(!missing.length, missing.length ? 1 : 0, { capabilities: g.capabilities, ...(o.check ? { missing } : {}) });
        }
        if (command === 'generate') {
            const slots = g.parseSlots(o.slots ?? `${g.CAMPAIGN.first}-${g.CAMPAIGN.last}`), seed = int(o.seed, 'seed', 1), count = int(o.count, 'count', 60);
            const iterations = int(o.iterations, 'iterations', 700), maxCandidates = int(o['max-candidates'], 'max-candidates', Infinity);
            if (!o.out) throw new UsageError('generate needs --out <dir>');
            const out = outside(o.out);
            if (o['dry-run']) return dry(['src/engines/busfolie/slots.ts', 'src/engines/busfolie/generator.ts'], slots.flatMap(n => [`${out}/candidates/${String(n).padStart(3, '0')}.json`, `${out}/searched/${String(n).padStart(3, '0')}.json`]));
            mkdirSync(out, { recursive: true });
            const started = process.cpuUsage();
            const result = g.generate({ slots, seed, count, iterations, maxCandidates, out, log });
            const cpu = process.cpuUsage(started);
            log(`CPU ${((cpu.user + cpu.system) / 1e6).toFixed(1)} s · ${result.valid}/${result.generated} candidats valides (${(100 * result.validRate).toFixed(1)} %)`);
            return done(result.slots.every(s => s.hash), result.slots.every(s => s.hash) ? 0 : 1, { request: { slots, seed, count, iterations, maxCandidates: Number.isFinite(maxCandidates) ? maxCandidates : null }, ...result });
        }
        if (command === 'validate') {
            if (o.file || o.level) {
                if (o['dry-run']) return dry([o.file ?? `level ${o.level}`], []);
                const { level, slot } = await loadLevel(g, o);
                const validation = g.validate(level, slot);
                return done(!validation.errors.length, validation.errors.length ? 1 : 0, { candidate: o.file ?? `level ${o.level}`, validation });
            }
            const scripts = ['scripts/validate-busfolie.js', 'scripts/validate-busfolie-campaign.js'];
            if (o['dry-run']) return dry(scripts, []);
            const runs = scripts.map(s => { const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.js', s], { cwd: ROOT, encoding: 'utf8' }); process.stderr.write(r.stdout); process.stderr.write(r.stderr); return { script: s, exitCode: r.status }; });
            const ok = runs.every(r => r.exitCode === 0);
            return done(ok, ok ? 0 : 1, { validators: runs });
        }
        if (command === 'solve') {
            const nodes = int(o.nodes, 'nodes', g.SOLVER_NODES);
            if (o.in) {
                const dir = outside(o.in), files = g.listJson(join(dir, 'searched'));
                if (o['dry-run']) return dry(files, files.map(f => f.replace('/searched/', '/solved/')));
                mkdirSync(join(dir, 'solved'), { recursive: true });
                const rows = [];
                for (const f of files) {
                    const r = g.readJson(f), v = g.solveReceipt(r.level, { nodes, index: r.slot - 1 });
                    const next = { ...r, ...v, metrics: { ...r.metrics, ...v.metrics } };
                    writeFileSync(f.replace('/searched/', '/solved/'), `${JSON.stringify(next, null, 1)}\n`);
                    rows.push({ slot: r.slot, status: next.status, verdict: v.solving.verdict, used: v.solving.used, par: next.metrics?.par ?? null, errors: v.validation.errors });
                    log(`niveau ${r.slot} : ${next.status} (${v.solving.verdict}, ${v.solving.used} nœuds)`);
                }
                const code = rows.some(r => r.verdict === 'unknown') ? 3 : rows.some(r => r.status !== 'verified') ? 1 : 0;
                return done(code === 0, code, { nodes, receipts: rows });
            }
            if (o['dry-run']) return dry([o.file ?? `level ${o.level}`], []);
            const { level, slot } = await loadLevel(g, o);
            const moves = typeof o.moves === 'string' ? o.moves.split(',').map(m => m.trim()).filter(Boolean) : [];
            const v = g.solveReceipt(level, { nodes, moves, index: slot === null ? null : slot - 1 });
            const code = v.solving.verdict === 'unknown' ? 3 : v.status === 'verified' || (moves.length && v.solving.verdict === 'unsolvable') ? 0 : 1;
            return done(code === 0, code, { candidate: o.file ?? `level ${o.level}`, moves, ...v });
        }
        if (command === 'rank') {
            if (!o.in) throw new UsageError('rank needs --in <dir>');
            const dir = outside(o.in), files = g.listJson(join(dir, 'solved'));
            const expect = int(o.expect, 'expect', g.CAMPAIGN.last - g.CAMPAIGN.first + 1);
            if (o['dry-run']) return dry(files, [join(dir, 'ranking.json'), join(dir, 'entries/<slot>.json'), join(dir, 'campaign-2.receipt.json')]);
            const receipts = files.map(g.readJson), r = g.rank(receipts);
            const unknown = receipts.filter(x => x.solving?.verdict === 'unknown').length;
            const div = r.diversity ? { score: r.diversity.score, cloneShare: r.diversity.cloneShare, maxGapWithoutNovelty: r.diversity.maxGapWithoutNovelty, noveltyLevels: r.diversity.noveltyLevels.map(n => n + g.CAMPAIGN.first - 1) } : null;
            const failures = [...r.progression];
            if (r.selected.length < expect) failures.push(`${r.selected.length} levels selected, ${expect} expected`);
            if (div && div.cloneShare !== 0) failures.push(`clones ${div.cloneShare}`);
            if (div && div.maxGapWithoutNovelty > 5) failures.push(`gap without novelty ${div.maxGapWithoutNovelty} > 5`);
            mkdirSync(join(dir, 'entries'), { recursive: true });
            for (const s of r.selected) writeFileSync(join(dir, 'entries', `${s.slot}.json`), JSON.stringify(g.entryOfReceipt(s)));
            const campaign = g.campaignReceipt(r.selected, dir);
            writeFileSync(join(dir, 'campaign-2.receipt.json'), `${JSON.stringify(campaign, null, 1)}\n`);
            const result = { selected: r.selected.map(s => ({ slot: s.slot, candidateId: s.candidateId, difficulty: s.metrics.difficulty, par: s.metrics.par, hash: s.levelHash })), rejected: r.rejected, failures, diversity: div };
            writeFileSync(join(dir, 'ranking.json'), `${JSON.stringify(result, null, 1)}\n`);
            const code = unknown ? 3 : failures.length ? 1 : 0;
            return done(code === 0, code, result);
        }
        if (command === 'report') {
            if (o['dry-run']) return dry(['src/engines/busfolie/data.ts', ...(o.in ? [join(o.in, 'campaign-2.receipt.json')] : [])], []);
            const result = g.report(o.in ? g.readJson(join(resolve(o.in), 'campaign-2.receipt.json')) : null);
            log(result.chart);
            return done(result.failures.length === 0, result.failures.length ? 1 : 0, result);
        }
        throw new UsageError(`unknown command "${command}"`);
    } catch (e) {
        if (e instanceof UsageError || e instanceof RangeError) return done(false, 2, { error: e.message });
        throw e;
    }
}
/** A candidate from --file (a receipt with `level`, or a bare level) or a frozen level from --level N (1-based). */
async function loadLevel(g, o) {
    if (o.file) {
        const data = g.readJson(resolve(o.file)), level = data.level ?? data;
        return { level, slot: typeof data.slot === 'number' ? data.slot : null };
    }
    const n = int(o.level, 'level', 0), { LEVELS } = await import('../src/engines/busfolie/levels.ts');
    if (!LEVELS[n - 1]) throw new UsageError(`--level ${n}: 1-${LEVELS.length}`);
    return { level: LEVELS[n - 1], slot: n };
}
await main();
