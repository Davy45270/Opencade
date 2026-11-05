// Targeted E2E selection: which Playwright specs a change needs, and never the whole suite.
//
//   node scripts/e2e-impact.js --base <rev> [--head <rev>]     diff base..head (merge base), human report
//   node scripts/e2e-impact.js --files a.ts b.ts                same, from an explicit file list
//   node scripts/e2e-impact.js --base <rev> --args              spec arguments only (empty for N0: then run nothing)
//   node scripts/e2e-impact.js ... --github                     writes level/specs/count/shards/parts to $GITHUB_OUTPUT
//   node scripts/e2e-impact.js --specs "tests/e2e/x.spec.ts"    explicit list (workflow_dispatch), validated
//   node scripts/e2e-impact.js --base <rev> --run [-- <playwright options>]   builds the PWA fixtures and runs the
//       selection; an empty selection runs nothing (a bare `playwright test` would run the whole suite).
//
// Levels, from the lightest:
//   N0  documentation (markdown, docs/, doc images, LICENSE): no E2E.
//   N1  one game's files (src/games/<id>/, src/engines/<id>/, docs/<id>*, scripts/validate-<id>*, tests/<id>*),
//       or a test file: that game's specs + the light cross-game specs (mobile-layout, mobile, home, thumbnails).
//   N2  shared shell (src/shell/, src/main.ts, src/style.css, index.html, registry, src/characters/, shared E2E helpers):
//       the specs of the games named in the diff + the light cross-game specs (+ the specs of a named shell zone).
//   N3  dependencies, tooling, CI and any file that cannot be classified: home + thumbnails + ONE short test per game.
// The full suite is never selected: more than MAX_FULL_GAMES games named fall back to their short test, and
// select() refuses a result that would cover every spec file.
// CI parts: partition() spreads the selection over the parts by estimated seconds (largest first, to the lightest part),
// not by file count like playwright --shard; a spec of SPLIT_SPECS is cut by game id with --grep-invert.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

export const E2E_DIR = 'tests/e2e';
export const MAX_FULL_GAMES = 3;
/** One CI shard per started quarter hour of estimated run time (2-CPU runner), at most four. */
export const SHARD_SECONDS = 900;
export const MAX_SHARDS = 4;

/** Spec files of each game (ids of src/games/registry.ts). */
export const GAME_SPECS = {
    'alunir': ['alunir', 'alunir-levels'],
    'artificiers': ['artificiers', 'artificiers-finger'],
    'bombercade': ['bombercade', 'bombercade-finger', 'bombercade-touch'],
    'briqueterie': ['briqueterie'],
    'bubble': ['bubble-catalogue', 'bubble-snap-finger', 'bubble-touch'],
    'caisses': ['caisses'],
    'collier': ['collier', 'collier-finger'],
    'dedale': ['dedale'],
    'derapage': ['derapage', 'derapage-3d', 'derapage-catalogue', 'derapage-touch'],
    'empilo': ['empilo'],
    'essaim': ['essaim', 'essaim-signature', 'essaim-touch'],
    'ferraille': ['ferraille', 'ferraille-levels'],
    'gourmandises': ['gourmandises', 'gourmandises-finger', 'gourmandises-touch'],
    'marmaille': ['marmaille'],
    'orbite': ['orbite'],
    'pepites': ['pepites', 'pepites-finger'],
    'petits-pompiers': ['petits-pompiers', 'petits-pompiers-finger', 'petits-pompiers-touch'],
    'serpentin': ['serpentin'],
};
/** Games held out of the public catalogue (absent from the registry) until they return; their specs stay owned here. */
export const HELD_BACK = {
    'traverse': ['traverse'],
};
/** Cross-game specs, grouped by what they exercise. None is tied to a single game. */
export const CROSS_SPECS = {
    'accueil': ['arcade', 'autres-jeux', 'thumbnails'],
    'coquille': ['mobile-layout', 'mobile', 'game', 'levels', 'sound', 'device', 'touch-edges', 'pause-page'],
    'personnages': ['characters', 'character-pixels', 'character-finger', 'character-finger-2', 'character-finger-3', 'character-finger-4', 'habillage', 'habillage-action'],
    'pwa': ['offline', 'pwa-update'],
    'mesure': ['perf-fps'],
};
/** Light cross-game specs run with every N1 and N2 selection: other games' layout did not move. */
export const LIGHT_SPECS = ['mobile-layout', 'mobile', 'arcade', 'thumbnails'];
/** N3 smoke: home and thumbnails, then one test per game. */
export const SMOKE_SPECS = ['arcade', 'thumbnails'];
/**
 * Shortest passing test of each game whose title is written literally once in its spec (a title built in a loop
 * cannot be addressed alone). Seconds are the sum over the Playwright projects that run it, measured on a
 * 2-CPU Linux container (Playwright 1.64.1) on 2026-11-04. The line is found again at run time.
 */
export const SMOKE_TESTS = {
    'alunir': ['alunir', 'U06 U07 U09 victoire, défaite et progression par entrées réelles', 67.7],
    'artificiers': ['artificiers', 'Artificiers : ouverture, glisser réel et trois ambiances', 31.9],
    'bombercade': ['bombercade', 'B crochet réservé au paramètre test', 0.9],
    'briqueterie': ['briqueterie', 'K12 crochet inerte sans mode test et sortie nettoyée', 8.8],
    'bubble': ['bubble-snap-finger', 'B-SNAP-04 doigt bruité : la case fantôme est la case remplie', 23.3],
    'caisses': ['caisses', 'C12 crochet absent sans paramètre test', 0.7],
    'collier': ['collier', 'C16 Collier : le choix réel de chacun des cinq compagnons conserve les règles', 17.0],
    'dedale': ['dedale', 'D12 crochet inerte et nettoyage lors du retour à l’accueil', 5.0],
    'derapage': ['derapage', 'Z30 Z34 porte et saut en vue de jeu', 2.9],
    'empilo': ['empilo', 'E11 E08 niveau 30 et mise en page', 5.6],
    'essaim': ['essaim', 'G12 crochet inerte sans test et nettoyage à la sortie', 7.3],
    'ferraille': ['ferraille', 'F-SCENE-03 les six descriptions de rendu sont distinctes deux à deux', 3.0],
    'gourmandises': ['gourmandises', 'canyon des flèches, boucle et permutation réelle sur le tapis', 6.5],
    'marmaille': ['marmaille', 'MA-E2 sans rôle, la falaise est perdue', 2.3],
    'orbite': ['orbite', 'V12 crochet inerte sans test et nettoyage à la sortie', 5.5],
    'pepites': ['pepites', 'P13 mise en page : mine entière visible, boutons de 56 px sous le canevas, HUD lisible', 14.4],
    'petits-pompiers': ['petits-pompiers', 'Petits Pompiers : défi choisi par deux gros boutons, crochet réservé aux tests', 12.7],
    'serpentin': ['serpentin', 'N14 écluses : ouverte, clignotante la dernière demi-seconde, puis fermée', 5.9],
};
/** Seconds per spec file (all projects), same measurements; used only to size CI shards. */
export const SPEC_SECONDS = {
    'alunir-levels': 70, 'alunir': 68, 'arcade': 120, 'artificiers-finger': 87, 'artificiers': 32, 'autres-jeux': 6, 'bombercade-finger': 8,
    'bombercade': 14, 'briqueterie': 141, 'bubble-catalogue': 422, 'bubble-snap-finger': 23, 'caisses': 21, 'character-finger-2': 323,
    'character-finger-3': 208, 'character-finger-4': 1041, 'character-finger': 407, 'character-pixels': 23, 'characters': 19, 'collier-finger': 48,
    'collier': 42, 'dedale': 61, 'derapage-3d': 116, 'derapage-catalogue': 58, 'derapage': 63, 'device': 56, 'empilo': 56, 'essaim-signature': 57,
    'essaim': 269, 'ferraille-levels': 245, 'ferraille': 342, 'game': 23, 'gourmandises-finger': 17, 'gourmandises': 32, 'habillage-action': 221,
    'habillage': 19, 'levels': 18, 'marmaille': 19, 'mobile-layout': 721, 'mobile': 3, 'offline': 6, 'orbite': 143, 'pepites-finger': 107,
    'pepites': 34, 'perf-fps': 86, 'petits-pompiers-finger': 62, 'petits-pompiers-touch': 9, 'petits-pompiers': 118, 'pwa-update': 36,
    'serpentin': 73, 'sound': 9, 'thumbnails': 44, 'touch-edges': 27, 'traverse': 21,
    // Touch-shell specs: provisional estimates until a measured run replaces them.
    'bombercade-touch': 15, 'bubble-touch': 15, 'derapage-touch': 15, 'essaim-touch': 15, 'gourmandises-touch': 15, 'pause-page': 30,
};
/**
 * Specs split across CI parts by game id: their per-id tests are titled `... <id> <width>x<height>`. Weights are the
 * seconds of each id's tests on the GitHub runner (CI run 42019649998, 2026-11-05), scaled to SPEC_SECONDS; '' is the
 * rest of the spec (other titles, ids missing here), which stays whole in one part.
 */
export const SPLIT_SPECS = {
    'mobile-layout': {
        'ferraille': 38.0, 'alunir': 33.9, 'briqueterie': 33.9, 'petits-pompiers': 24.7, 'pepites': 24.5, 'essaim': 22.8, 'collier': 22.5,
        'derapage': 18.1, 'bombercade': 17.6, 'gourmandises': 16.7, 'orbite': 16.4, 'marmaille': 15.0, 'dedale': 14.2, 'serpentin': 13.8,
        'bubble': 13.3, 'caisses': 12.7, 'empilo': 11.7, '': 5.1,
    },
};
/** N2 shell zones: the specs that exercise that part of the shell, added to the N2 selection. */
const ZONES = [
    [/^src\/characters\//, CROSS_SPECS.personnages],
    [/^(src\/shell\/pwa[^/]*|pwa-manifest\.ts|public\/icons\/.*)$/, CROSS_SPECS.pwa],
    [/^(src\/shell\/other-games[^/]*|public\/autres-jeux\/.*)$/, ['autres-jeux']],
    [/^src\/shell\/sound\.ts$/, ['sound']],
    [/^src\/shell\/(levels|progression|storage)\.ts$/, ['levels']],
    [/^src\/shell\/(device|gestures|input)\.ts$/, ['device', 'touch-edges']],
    [/^src\/shell\/(menu|panels|pause)\.ts$/, ['game']],
];
const SHELL = /^(src\/shell\/|src\/main\.ts$|src\/style\.css$|src\/vite-env\.d\.ts$|index\.html$|pwa-manifest\.ts$|public\/|src\/characters\/|src\/content\/|src\/engines\/shared\/|src\/games\/universal\/|src\/games\/[^/]+\.ts$)/;
const DOCS = /(\.md$|^docs\/|^LICENSE$)/;
const TOOLING = /^(package(-lock)?\.json$|playwright\.config\.|vite\.config\.|vitest\.config\.|tsconfig[^/]*$|eslint[^/]*$|\.github\/|\.nvmrc$|\.editorconfig$|\.gitignore$|scripts\/)/;
const SPEC_ARG = /^tests\/e2e\/[A-Za-z0-9._-]+\.spec\.ts(:\d+)?$/;
const LEVELS = ['N0', 'N1', 'N2', 'N3'];

const specPath = name => `${E2E_DIR}/${name}.spec.ts`;
const ownerOf = spec => Object.keys(GAME_SPECS).find(id => GAME_SPECS[id].includes(spec));
const idPattern = id => new RegExp(`^${id.replace(/[-]/g, '\\-')}([-._/]|$)`);
const idsByLength = () => Object.keys(GAME_SPECS).sort((a, b) => b.length - a.length);
const gameIn = name => idsByLength().find(id => idPattern(id).test(name));

/** Ids of the games array in src/games/registry.ts (drift check against GAME_SPECS). */
export function registryIds(root) {
    const source = readFileSync(join(root, 'src/games/registry.ts'), 'utf8');
    const block = source.slice(source.indexOf('export const games'));
    return [...block.matchAll(/^\s*(?:\{[^\n]*?\bid: '([a-z-]+)'|id: '([a-z-]+)',$)/gm)].map(m => m[1] ?? m[2]);
}
/** Line of the test() call whose title is `title`: what `playwright test file:line` addresses. */
export function testLine(root, spec, title) {
    const source = readFileSync(join(root, specPath(spec)), 'utf8');
    const at = source.indexOf(title);
    if (at < 0 || source.indexOf(title, at + 1) >= 0) throw new Error(`${spec}: title not found exactly once: ${title}`);
    const before = source.slice(0, at);
    const calls = [...before.matchAll(/\btest(?:\.\w+)?\s*\(/g)];
    const call = calls[calls.length - 1];
    if (!call) throw new Error(`${spec}: no test() before: ${title}`);
    const line = before.slice(0, call.index).split('\n').length;
    if (before.split('\n').length - line > 2) throw new Error(`${spec}: test() too far from its title: ${title}`);
    return line;
}
/** E2E helper files (non-spec .ts/.js) and the spec names that import them, transitively. */
function helperImporters(root) {
    const dir = join(root, E2E_DIR);
    const files = readdirSync(dir).filter(f => /\.(ts|js)$/.test(f));
    const imports = new Map(files.map(f => [f, [...readFileSync(join(dir, f), 'utf8').matchAll(/from '\.\/([^']+)'/g)].map(m => m[1].replace(/\.(js|ts)$/, ''))]));
    const base = f => f.replace(/\.d\.ts$|\.(ts|js)$/, '');
    const users = helper => {
        const seen = new Set(), todo = [base(helper)];
        while (todo.length) {
            const target = todo.pop();
            for (const [file, list] of imports) if (list.includes(target) && !seen.has(file)) { seen.add(file); todo.push(base(file)); }
        }
        return [...seen].filter(f => f.endsWith('.spec.ts')).map(f => f.slice(0, -8));
    };
    return users;
}

/** Classifies one path: { level, games, specs, why }. */
export function classify(path, root, users = helperImporters(root)) {
    const r = (level, why, games = [], specs = []) => ({ file: path, level, why, games, specs });
    const e2e = path.startsWith(`${E2E_DIR}/`) ? path.slice(E2E_DIR.length + 1) : null;
    if (e2e !== null && !e2e.includes('/')) {
        if (e2e.endsWith('.spec.ts')) {
            const spec = e2e.slice(0, -8), owner = ownerOf(spec);
            const held = Object.keys(HELD_BACK).find(id => HELD_BACK[id].includes(spec));
            if (held) return r('N0', `spec du jeu retenu ${held}`);
            if (owner) return r('N1', `spec de ${owner}`, [owner]);
            return r('N1', 'spec transverse', [], [spec]);
        }
        if (e2e.endsWith('.node.ts')) return r('N0', 'test Node (job rapide)');
        const importers = users(e2e), owners = [...new Set(importers.map(ownerOf))];
        if (importers.length && owners.length === 1 && owners[0]) return r('N1', `aide E2E de ${owners[0]}`, [owners[0]]);
        return r('N2', `aide E2E partagée (${importers.length} specs)`, [], importers.length <= 4 ? importers : []);
    }
    const area = /^src\/(games|engines)\/([^/]+)\//.exec(path);
    if (area && area[2] !== 'shared' && area[2] !== 'universal') {
        if (GAME_SPECS[area[2]]) return r('N1', `jeu ${area[2]}`, [area[2]]);
        if (HELD_BACK[area[2]]) return r('N0', `jeu retenu hors catalogue : ${area[2]}`);
        return r('N3', `jeu absent de la table : ${area[2]}`);
    }
    const named = /^(?:docs\/(?!screenshots\/)|tests\/(?:fixtures\/)?|scripts\/(?:(?:validate|check|record|measure|audit|test)-)?)([^/]+)$/.exec(path);
    const id = named && gameIn(named[1]);
    if (id) return r('N1', `fichier du jeu ${id}`, [id]);
    if (DOCS.test(path)) return r('N0', 'documentation');
    if (SHELL.test(path)) {
        const zone = ZONES.find(([pattern]) => pattern.test(path));
        return r('N2', 'socle', [], zone ? zone[1] : []);
    }
    if (TOOLING.test(path)) return r('N3', 'dépendances, outillage ou CI');
    return r('N3', 'fichier non classé');
}

/** Selection for a list of changed files, or null (no usable base): N3 smoke. */
export function select(files, root) {
    const allSpecs = readdirSync(join(root, E2E_DIR)).filter(f => f.endsWith('.spec.ts')).map(f => f.slice(0, -8));
    const users = helperImporters(root);
    const reasons = files === null ? [{ file: '(base absente)', level: 'N3', why: 'pas de base de comparaison', games: [], specs: [] }] : files.map(f => classify(f, root, users));
    const level = reasons.reduce((top, x) => LEVELS.indexOf(x.level) > LEVELS.indexOf(top) ? x.level : top, 'N0');
    const games = [...new Set(reasons.flatMap(x => x.games))].sort();
    const specs = new Set(reasons.flatMap(x => x.specs));
    const tests = new Map();
    const notes = [];
    if (level !== 'N0') for (const s of LIGHT_SPECS) if (level !== 'N3' || reasons.some(x => x.level === 'N1' || x.level === 'N2')) specs.add(s);
    if (level === 'N3') for (const s of SMOKE_SPECS) specs.add(s);
    const full = games.length <= MAX_FULL_GAMES ? games : [];
    if (games.length > MAX_FULL_GAMES) notes.push(`${games.length} jeux nommés (> ${MAX_FULL_GAMES}) : un test court par jeu, pas leurs specs`);
    for (const id of full) for (const s of GAME_SPECS[id]) specs.add(s);
    const shortGames = level === 'N3' ? Object.keys(SMOKE_TESTS) : games.length > MAX_FULL_GAMES ? games : [];
    for (const id of shortGames) {
        if (full.includes(id)) continue;
        const [spec, title, seconds] = SMOKE_TESTS[id];
        if (specs.has(spec)) continue;
        tests.set(`${specPath(spec)}:${testLine(root, spec, title)}`, seconds);
    }
    const missing = [...specs].filter(s => !allSpecs.includes(s));
    if (missing.length) throw new Error(`specs absentes de ${E2E_DIR} : ${missing.join(', ')}`);
    if (allSpecs.every(s => specs.has(s))) throw new Error('la sélection couvrirait toute la suite E2E : refusé');
    const list = [...[...specs].sort().map(specPath), ...[...tests.keys()].sort()];
    const cost = Object.fromEntries([...[...specs].map(s => [specPath(s), SPEC_SECONDS[s] ?? 120]), ...tests]);
    return result({ level, games, specs: list, reasons, notes }, cost);
}
function result(r, cost) {
    const seconds = r.specs.reduce((t, s) => t + cost[s], 0);
    const shards = shardCount(r.specs.length, seconds);
    return { ...r, seconds: Math.round(seconds), shards, parts: partition(r.specs, cost, shards) };
}
export function shardCount(count, seconds) {
    if (!count) return 0;
    return Math.max(1, Math.min(MAX_SHARDS, count, Math.ceil(seconds / SHARD_SECONDS)));
}
/** Explicit list (workflow_dispatch): every entry must be an existing spec file, optionally :line. */
export function manual(text, root) {
    const list = text.split(/[\s,]+/).filter(Boolean);
    const bad = list.filter(s => !SPEC_ARG.test(s) || !existsSync(join(root, s.replace(/:\d+$/, ''))));
    if (bad.length) throw new Error(`specs refusées : ${bad.join(' ')}`);
    const allSpecs = readdirSync(join(root, E2E_DIR)).filter(f => f.endsWith('.spec.ts'));
    if (allSpecs.every(f => list.includes(`${E2E_DIR}/${f}`))) throw new Error('la sélection couvrirait toute la suite E2E : refusé');
    const cost = Object.fromEntries(list.map(s => [s, s.includes(':') ? 30 : SPEC_SECONDS[s.slice(E2E_DIR.length + 1, -8)] ?? 120]));
    return result({ level: 'manuel', games: [], specs: [...new Set(list)], reasons: [], notes: ['liste donnée à la main'] }, cost);
}
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Spreads the selection over `count` CI parts by estimated seconds: units (a spec file, a file:line test, one game id of a
 * SPLIT_SPECS spec) from the longest, each to the lightest part. Each part gets its playwright arguments (`specs`, in
 * selection order) and, when it holds only some ids of a split spec, a `grepInvert` pattern on Playwright's grep title
 * (`<project> <file> <title>`): the part that holds the rest drops the other parts' ids, every other part drops all
 * but its own ids. The union of the parts is the selection, each test in exactly one part.
 */
export function partition(specs, cost, count) {
    if (!count) return [];
    const units = [];
    for (const arg of specs) {
        const split = arg.includes(':') ? undefined : SPLIT_SPECS[arg.slice(E2E_DIR.length + 1, -8)];
        if (!split || count < 2) { units.push({ arg, seconds: cost[arg] }); continue; }
        const weight = Object.values(split).reduce((t, w) => t + w, 0);
        for (const [id, w] of Object.entries(split)) units.push({ arg, id, seconds: cost[arg] * w / weight });
    }
    units.sort((a, b) => b.seconds - a.seconds || a.arg.localeCompare(b.arg) || (a.id ?? '').localeCompare(b.id ?? ''));
    const parts = Array.from({ length: count }, () => ({ units: [], seconds: 0 }));
    for (const unit of units) {
        const part = parts.reduce((low, p) => p.seconds < low.seconds ? p : low);
        part.units.push(unit); part.seconds += unit.seconds;
    }
    return parts.map(part => {
        const inverts = [];
        for (const arg of new Set(part.units.filter(u => u.id !== undefined).map(u => u.arg))) {
            const all = units.filter(u => u.arg === arg), mine = part.units.filter(u => u.arg === arg);
            if (mine.length === all.length) continue;
            const file = ` ${escape(arg.slice(E2E_DIR.length + 1))} `;
            const ids = list => `(?:${list.map(u => escape(u.id)).join('|')})`;
            inverts.push(mine.some(u => u.id === '')
                ? `${file}.* ${ids(all.filter(u => !mine.includes(u)))} \\d+x\\d+`
                : `${file}(?!.* ${ids(mine)} \\d+x\\d+)`);
        }
        return { specs: specs.filter(arg => part.units.some(u => u.arg === arg)), grepInvert: inverts.join('|'), seconds: Math.round(part.seconds) };
    });
}
/** Changed paths between the merge base of base and head, or null when base is absent, zero or unknown. */
export function changedFiles(base, head, root) {
    if (!base || /^0+$/.test(base)) return null;
    const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    try {
        git('cat-file', '-e', `${base}^{commit}`);
        const from = git('merge-base', base, head);
        return git('diff', '--name-only', '--no-renames', from, head).split('\n').filter(Boolean);
    } catch {
        return null;
    }
}

function option(args, name) {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1] ?? '';
}
function main(args) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const passthrough = args.includes('--') ? args.slice(args.indexOf('--') + 1) : [];
    if (args.includes('--')) args = args.slice(0, args.indexOf('--'));
    const fileArgs = args.includes('--files') ? args.slice(args.indexOf('--files') + 1).filter(a => !a.startsWith('--')) : null;
    const explicit = option(args, '--specs');
    let result;
    if (explicit && explicit.trim()) result = manual(explicit, root);
    else if (fileArgs) result = select(fileArgs, root);
    else result = select(changedFiles(option(args, '--base'), option(args, '--head') || 'HEAD', root), root);
    if (args.includes('--args')) { process.stdout.write(`${result.specs.join(' ')}\n`); return; }
    const lines = [`Niveau ${result.level} — ${result.specs.length} cible(s), ~${Math.round(result.seconds / 60)} min estimées (2 CPU), ${result.shards} part(s)`];
    if (result.games.length) lines.push(`Jeux nommés : ${result.games.join(', ')}`);
    for (const n of result.notes) lines.push(`Note : ${n}`);
    for (const x of result.reasons) lines.push(`  ${x.level} ${x.file} — ${x.why}`);
    lines.push(result.specs.length ? 'Specs :' : 'Aucun E2E à lancer.');
    for (const s of result.specs) lines.push(`  ${s}`);
    if (result.parts.length > 1) result.parts.forEach((p, i) => lines.push(`Part ${i + 1}/${result.parts.length} : ~${Math.round(p.seconds / 60)} min estimées, ${p.specs.join(' ')}${p.grepInvert ? ` --grep-invert '${p.grepInvert}'` : ''}`));
    process.stdout.write(`${lines.join('\n')}\n`);
    if (args.includes('--github')) {
        const out = process.env.GITHUB_OUTPUT;
        if (!out) throw new Error('GITHUB_OUTPUT absent');
        const shards = Array.from({ length: Math.max(1, result.shards) }, (_, i) => i + 1);
        const parts = result.parts.length ? result.parts : [{ specs: [], grepInvert: '' }];
        appendFileSync(out, `level=${result.level}\nspecs=${result.specs.join(' ')}\ncount=${result.specs.length}\ntotal=${Math.max(1, result.shards)}\nshards=${JSON.stringify(shards)}\nparts=${JSON.stringify(parts.map(p => ({ specs: p.specs, grepInvert: p.grepInvert })))}\n`);
        if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### E2E ciblé : ${result.level}\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
    }
    if (args.includes('--run') && result.specs.length) {
        const run = (cmd, list) => { const r = spawnSync(cmd, list, { cwd: root, stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status ?? 1); };
        run(process.execPath, ['scripts/build-pwa-fixture.js']);
        run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...result.specs, ...passthrough]);
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
