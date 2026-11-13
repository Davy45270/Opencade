/* global console, process */
// node scripts/test-game.js
// The Level Factory command line (scripts/game.js) on Bus en folie: one JSON document on stdout and the documented
// exit codes; an invalid candidate is rejected with a structured diagnostic; the solver's three verdicts on real
// positions, `unknown` only on its node budget; two generations from the same seeds are identical to the byte; an
// `unknown` receipt is never ranked; the command line refuses to write in src/ and --dry-run writes nothing.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const game = (...args) => {
    const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.js', 'scripts/game.js', ...args], { encoding: 'utf8' });
    let doc = null;
    try { doc = JSON.parse(r.stdout); } catch { /* --help prints text */ }
    return { code: r.status, doc, stdout: r.stdout, stderr: r.stderr };
};
const tmp = mkdtempSync(join(tmpdir(), 'game-cli-'));
const files = dir => readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.json')).sort();
try {
    const help = game('--help');
    assert.equal(help.code, 0); assert.match(help.stdout, /Exit codes/);
    const caps = game('capabilities', 'busfolie', '--check');
    assert.equal(caps.code, 0, caps.stdout); assert.deepEqual(caps.doc.result.missing, []);
    assert.equal(caps.doc.result.capabilities.solver.budget, 'nodes');
    assert.equal(game('generate', 'derapage', '--out', tmp).code, 2, 'a game without generator');
    assert.equal(game('generate', 'busfolie', '--out', 'src/engines/busfolie/x').code, 2, 'no output in src/');
    assert.equal(game('generate', 'busfolie', '--slots', '99', '--out', tmp).code, 2, 'slot out of range');
    // --dry-run: lists, writes nothing.
    const dry = game('generate', 'busfolie', '--slots', '31', '--out', join(tmp, 'dry'), '--dry-run');
    assert.equal(dry.code, 0); assert(dry.doc.result.writes.length > 0); assert(!existsSync(join(tmp, 'dry')));
    // An invalid candidate: a bus on a cone.
    const level1 = game('solve', 'busfolie', '--level', '1').doc;
    assert.equal(level1.result.solving.verdict, 'solved'); assert.equal(level1.result.status, 'verified'); assert.equal(level1.exitCode, 0);
    const { LEVELS } = await import('../src/engines/busfolie/levels.ts');
    const bad = structuredClone(LEVELS[0]);
    bad.obstacles.push({ x: bad.buses[0].x, y: bad.buses[0].y });
    writeFileSync(join(tmp, 'bad.json'), JSON.stringify(bad));
    const invalid = game('validate', 'busfolie', '--file', join(tmp, 'bad.json'));
    assert.equal(invalid.code, 1); assert.equal(invalid.doc.result.validation.reason, 'invalid'); assert(invalid.doc.result.validation.errors.length > 0);
    // The three verdicts, on real positions: level 1 solved, level 2 after its trap move unsolvable, a 10-node budget unknown.
    const trap = LEVELS[1].trap, moves = [...LEVELS[1].solution.split(', ').slice(0, trap.at), trap.move].join(', ');
    const dead = game('solve', 'busfolie', '--level', '2', '--moves', moves);
    assert.equal(dead.code, 0); assert.equal(dead.doc.result.solving.verdict, 'unsolvable');
    const unknown = game('solve', 'busfolie', '--level', '30', '--nodes', '10');
    assert.equal(unknown.code, 3); assert.equal(unknown.doc.result.solving.verdict, 'unknown'); assert.equal(unknown.doc.result.solving.native.reason, 'node_limit');
    // Two generations from the same five seeds: the same files, byte for byte.
    const a = join(tmp, 'a'), b = join(tmp, 'b'), args = ['generate', 'busfolie', '--slots', '33', '--count', '5', '--seed', '1', '--iterations', '20'];
    const ga = game(...args, '--out', a), gb = game(...args, '--out', b);
    assert.equal(ga.stdout, gb.stdout); assert.deepEqual(files(a), files(b)); assert(files(a).length >= 2);
    for (const f of files(a)) assert.equal(readFileSync(join(a, f), 'utf8'), readFileSync(join(b, f), 'utf8'), f);
    assert(ga.doc.result.generated >= 5, 'at least the five seeds asked for');
    // An unknown verdict is never ranked: solve with a 10-node budget, then rank exits 3 and selects nothing.
    assert.equal(game('solve', 'busfolie', '--in', a, '--nodes', '10').code, 3);
    const ranked = game('rank', 'busfolie', '--in', a, '--expect', '1');
    assert.equal(ranked.code, 3); assert.deepEqual(ranked.doc.result.selected, []);
    assert(ranked.doc.result.rejected.some(r => /candidate \(unknown\)/.test(r.why)));
    console.log(`game.js : aide, capacités, codes 0/1/2/3, diagnostic structuré, trois verdicts, génération identique à l’octet (${files(a).length} fichiers), unknown jamais classé`);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
