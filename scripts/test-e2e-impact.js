// Checks of scripts/e2e-impact.js on file lists taken from real commits (frozen here: CI clones are shallow).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { CROSS_SPECS, GAME_SPECS, HELD_BACK, LIGHT_SPECS, SMOKE_TESTS, SPEC_SECONDS, SPLIT_SPECS, changedFiles, classify, manual, registryIds, select, testLine } from './e2e-impact.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const allSpecs = readdirSync(join(root, 'tests/e2e')).filter(f => f.endsWith('.spec.ts')).map(f => f.slice(0, -8));
const path = s => `tests/e2e/${s}.spec.ts`;
const light = LIGHT_SPECS.map(path);
const files = list => list.map(f => f.replace(/:\d+$/, ''));
const notFull = r => assert.ok(new Set(files(r.specs)).size < allSpecs.length, `${r.specs.length} cibles : suite complète ?`);

// git diff --name-only 3737b5d f49f464 (Petits Pompiers full-screen layout, public head of 2026-11-05).
const POMPIERS = ['scripts/petits-pompiers-scene-oracle.js', 'src/games/petits-pompiers/scene.ts', 'src/games/petits-pompiers/view.ts', 'src/games/registry.ts',
    'src/main.ts', 'src/style.css', 'tests/e2e/mobile-layout.spec.ts', 'tests/e2e/petits-pompiers-touch.spec.ts', 'tests/e2e/petits-pompiers.spec.ts'];
// The PT01 fix (reload the page for each viewport size), published right after f49f464.
const PT01 = ['tests/e2e/petits-pompiers-touch.spec.ts'];
// git diff --name-only 43031be d719c8c (targeted E2E in CI): N3 with a Pompiers spec, 25 targets, two parts.
const TARGETED = ['.github/workflows/ci.yml', 'CONTRIBUTING.md', 'docs/node-tests.md', 'scripts/e2e-impact.js', 'scripts/node-checks.js',
    'scripts/test-e2e-impact.js', 'tests/e2e/petits-pompiers-touch.spec.ts'];
// d8168da (docs: changelog for 0.3.2).
const DOC = ['CHANGELOG.md'];
// A release commit: changelog and package files (chore(release): 0.4.0).
const RELEASE = ['CHANGELOG.md', 'package-lock.json', 'package.json'];

test('every spec file belongs to exactly one game or cross-game group', () => {
    const owned = [...Object.values(GAME_SPECS).flat(), ...Object.values(HELD_BACK).flat(), ...Object.values(CROSS_SPECS).flat()];
    assert.deepEqual([...owned].sort(), [...allSpecs].sort());
    assert.equal(new Set(owned).size, owned.length);
    for (const s of allSpecs) assert.ok(SPEC_SECONDS[s] > 0, `durée de ${s}`);
});
test('the game table matches src/games/registry.ts and every game has a short test', () => {
    assert.deepEqual(registryIds(root).sort(), Object.keys(GAME_SPECS).sort());
    for (const id of Object.keys(HELD_BACK)) assert.ok(!registryIds(root).includes(id) && !GAME_SPECS[id], `${id} retenu mais au registre`);
    for (const [id, [spec, title]] of Object.entries(SMOKE_TESTS)) {
        assert.ok(GAME_SPECS[id].includes(spec), `${id} : ${spec}`);
        assert.ok(testLine(root, spec, title) > 0);
    }
});
test('Pompiers 3737b5d..f49f464: N2, Pompiers specs plus the light cross-game specs', () => {
    const r = select(POMPIERS, root);
    assert.equal(r.level, 'N2');
    assert.deepEqual(r.games, ['petits-pompiers']);
    assert.deepEqual([...r.specs].sort(), [...new Set([...light, ...GAME_SPECS['petits-pompiers'].map(path)])].sort());
    assert.ok(r.specs.includes('tests/e2e/mobile-layout.spec.ts') && r.specs.includes('tests/e2e/mobile.spec.ts'));
    notFull(r);
});
test('PT01 fix alone (a Pompiers spec): N1 Pompiers', () => {
    const r = select(PT01, root);
    assert.equal(r.level, 'N1');
    assert.deepEqual(r.games, ['petits-pompiers']);
    assert.deepEqual([...r.specs].sort(), [...new Set([...light, ...GAME_SPECS['petits-pompiers'].map(path)])].sort());
});
test('documentation only (d8168da): N0, no E2E', () => {
    const r = select(DOC, root);
    assert.equal(r.level, 'N0');
    assert.deepEqual(r.specs, []);
    assert.equal(r.shards, 0);
    assert.equal(select(['docs/screenshots/home.png', 'README.fr.md', 'docs/node-tests.md'], root).level, 'N0');
});
test('package.json release: N3 smoke, home + thumbnails + one test per game', () => {
    const r = select(RELEASE, root);
    assert.equal(r.level, 'N3');
    const lines = r.specs.filter(s => /:\d+$/.test(s));
    assert.equal(lines.length, Object.keys(SMOKE_TESTS).length);
    assert.deepEqual(r.specs.filter(s => !/:\d+$/.test(s)), ['tests/e2e/arcade.spec.ts', 'tests/e2e/thumbnails.spec.ts']);
    assert.ok(r.seconds < 900, `${r.seconds} s`);
    notFull(r);
});
test('witnesses: unknown file, game missing from the table, no base: N3 smoke', () => {
    for (const f of [['Makefile'], ['src/games/nouveau-jeu/scene.ts'], ['src/engines/nouveau-jeu/engine.ts'], ['.github/workflows/ci.yml']]) {
        const r = select(f, root);
        assert.equal(r.level, 'N3', f[0]);
        assert.equal(r.specs.length, 2 + Object.keys(SMOKE_TESTS).length, f[0]);
    }
    assert.equal(select(null, root).level, 'N3');
    assert.equal(changedFiles('', 'HEAD', root), null);
    assert.equal(changedFiles('0000000000000000000000000000000000000000', 'HEAD', root), null);
    assert.equal(changedFiles('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'HEAD', root), null);
});
test('no case selects the whole suite', () => {
    const everything = [...allSpecs.map(path), 'src/main.ts', 'package.json', ...Object.keys(GAME_SPECS).map(id => `src/games/${id}/scene.ts`), 'src/characters/model.ts', 'src/shell/pwa.ts'];
    const r = select(everything, root);
    notFull(r);
    assert.ok(r.notes.some(n => n.includes('jeux nommés')));
    assert.throws(() => manual(allSpecs.map(path).join(' '), root), /toute la suite/);
    notFull(select(['tests/e2e/fixture.ts'], root));
});
test('single classifications', () => {
    assert.equal(classify('docs/petits-pompiers-api.md', root).level, 'N1');
    assert.equal(classify('scripts/validate-marmaille.js', root).games[0], 'marmaille');
    assert.equal(classify('tests/marmaille-cases.ts', root).games[0], 'marmaille');
    assert.equal(classify('src/engines/derapage/track.ts', root).games[0], 'derapage');
    assert.equal(classify('tests/e2e/collier-policy.ts', root).games[0], 'collier');
    assert.equal(classify('tests/e2e/fixture.ts', root).level, 'N2');
    assert.equal(classify('tests/e2e/finger-stepped.node.ts', root).level, 'N0');
    assert.equal(classify('src/engines/shared/random.ts', root).level, 'N2');
    assert.deepEqual(classify('src/characters/model.ts', root).specs, CROSS_SPECS.personnages);
    assert.equal(classify('vite.config.ts', root).level, 'N3');
    assert.equal(classify('tests/e2e/sound.spec.ts', root).specs[0], 'sound');
});
test('manual list is validated', () => {
    assert.deepEqual(manual('tests/e2e/arcade.spec.ts tests/e2e/caisses.spec.ts:70', root).specs, ['tests/e2e/arcade.spec.ts', 'tests/e2e/caisses.spec.ts:70']);
    assert.throws(() => manual('--grep .', root), /refusées/);
    assert.throws(() => manual('tests/e2e/absente.spec.ts', root), /refusées/);
});

/** Tests Playwright would run for these arguments (`--list`: no browser, no server), as `project › file:line › title`. */
function listed(args) {
    const r = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
    assert.equal(r.status, 0, r.stderr);
    const out = [];
    const walk = suite => {
        for (const spec of suite.specs ?? []) for (const t of spec.tests) out.push(`${t.projectName} › ${spec.file}:${String(spec.line)} › ${spec.title}`);
        for (const child of suite.suites ?? []) walk(child);
    };
    for (const suite of JSON.parse(r.stdout).suites) walk(suite);
    return out.sort();
}
const gap = parts => { const s = parts.map(p => p.seconds); return (Math.max(...s) - Math.min(...s)) / Math.max(...s); };
const partArgs = p => [...p.specs, ...(p.grepInvert ? ['--grep-invert', p.grepInvert] : [])];
for (const [name, list, level] of [['Pompiers N2 (3737b5d..f49f464)', POMPIERS, 'N2'], ['N3 ciblé (43031be..d719c8c)', TARGETED, 'N3'], ['N3 smoke (release)', RELEASE, 'N3']]) {
    test(`parts by duration, ${name}: gap under 30 %, union of the parts = the selection, no duplicate`, () => {
        const r = select(list, root);
        assert.equal(r.level, level);
        assert.equal(r.parts.length, r.shards);
        assert.ok(gap(r.parts) < 0.3, `écart estimé ${(100 * gap(r.parts)).toFixed(0)} % : ${r.parts.map(p => p.seconds).join(' / ')} s`);
        assert.equal(r.parts.reduce((t, p) => t + p.seconds, 0) - r.seconds <= r.parts.length, true);
        const whole = listed(r.specs), union = r.parts.flatMap(p => listed(partArgs(p))).sort();
        assert.ok(whole.length > 0);
        assert.deepEqual(union, whole);
        assert.equal(new Set(union).size, union.length, 'un test dans deux parts');
    });
}
test('partition: before the fix, file sharding left one part with mobile-layout alone; the split spec ids cover the registry', () => {
    const r = select(TARGETED, root);
    assert.equal(r.shards, 2);
    assert.ok(r.parts.every(p => p.specs.includes('tests/e2e/mobile-layout.spec.ts')), 'mobile-layout coupé entre les deux parts');
    assert.ok(r.parts.every(p => p.grepInvert));
    const ids = Object.keys(SPLIT_SPECS['mobile-layout']).filter(Boolean);
    for (const id of ids) assert.ok(GAME_SPECS[id], id);
    assert.deepEqual(select(['tests/e2e/mobile-layout.spec.ts'], root).parts.length, 1);
    assert.equal(select(['tests/e2e/mobile-layout.spec.ts'], root).parts[0].grepInvert, '');
    assert.deepEqual(select(DOC, root).parts, []);
});
