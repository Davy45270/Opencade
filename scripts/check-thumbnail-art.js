/* global console, process */
// Catalogue cards must not drift from their games: each thumbnail paints with drawing code
// the game's own scene reaches (its art module, the shared world art, the cast drawings),
// or the scene paints with the thumbnail's code. Hand-copied palettes are capped.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = file => { const path = file.replaceAll('\\', '/'), at = path.lastIndexOf('/src/'); return at >= 0 ? path.slice(at + 1) : path; };
const read = file => readFileSync(file, 'utf8');
const COLOUR_BUDGET = 4;
function file(base) {
    for (const candidate of [`${base}.ts`, `${base}.js`, base, join(base, 'index.ts')]) if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    return null;
}
/** Runtime (not type-only) relative imports of a source file, resolved to files. */
export function runtimeImports(path) {
    const out = [];
    for (const m of read(path).matchAll(/^\s*import\s+(?!type\b)([^;]*?)\s+from\s+'([^']+)'/gms)) {
        const specifier = m[2];
        if (!specifier.startsWith('.')) continue;
        const target = file(resolve(dirname(path), specifier));
        if (target) out.push(target);
    }
    return out;
}
const NEUTRAL = [/^src\/engines\//, /^src\/shell\//, /^src\/games\/thumbnail(-art)?\.ts$/, /^src\/games\/registry\.ts$/, /^src\/games\/finger-receipts\.ts$/,
    /\/(sound|finger|driver|controls|joystick|lessons)\.ts$/, /^src\/characters\/(selection|panel|index)\.ts$/, /^src\/games\/universal\/(?!art\.ts$)/];
const neutral = path => NEUTRAL.some(re => re.test(rel(path)));
/** Every drawing module the scene reaches through runtime imports (neutral modules are not followed). */
export function sceneVisuals(scene) {
    const seen = new Set(), stack = [scene];
    while (stack.length) {
        const current = stack.pop();
        for (const target of runtimeImports(current)) {
            if (seen.has(target) || neutral(target)) continue;
            seen.add(target); stack.push(target);
        }
    }
    return seen;
}
export function colours(source) {
    return (source.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|0x[0-9a-fA-F]{6}\b/g) ?? []).length;
}
export function checkGame(id, base = root) {
    const dir = join(base, 'src/games', id), thumbnail = join(dir, 'thumbnail.ts'), scene = join(dir, 'scene.ts');
    if (!existsSync(thumbnail)) return [`${id}: thumbnail.ts absent`];
    if (!existsSync(scene)) return [`${id}: scene.ts absent`];
    const visuals = sceneVisuals(scene);
    if (visuals.has(thumbnail)) return []; // the scene paints with the thumbnail's own drawing code
    const used = runtimeImports(thumbnail).filter(target => visuals.has(target));
    const problems = [];
    if (!used.length) problems.push(`${id}: la vignette n'importe aucune ressource visuelle de son jeu (${[...visuals].map(rel).join(', ') || 'aucune'})`);
    const count = colours(read(thumbnail));
    if (count > COLOUR_BUDGET) problems.push(`${id}: ${String(count)} couleurs recopiées dans la vignette (plafond ${String(COLOUR_BUDGET)})`);
    return problems;
}
export function registeredIds(base = root) {
    // Catalogue games, then games with their own site (src/games/<id>/definition.ts).
    const sites = readdirSync(join(base, 'src/games')).filter(id => existsSync(join(base, 'src/games', id, 'definition.ts')));
    return [...[...read(join(base, 'src/games/registry.ts')).matchAll(/from '\.\/([a-z-]+)\/thumbnail'/g)].map(m => m[1]), ...sites];
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const base = process.argv[2] ? resolve(process.argv[2]) : root;
    const ids = registeredIds(base);
    if (!ids.length) throw new Error('Aucune vignette trouvée dans le registre');
    const problems = ids.flatMap(id => checkGame(id, base));
    // Witness: a thumbnail that imports nothing of its game and copies its colours must be refused.
    const witness = join(base, 'src/games', ids[0] ?? '', 'thumbnail.ts');
    const fake = runtimeImports(witness).filter(target => !neutral(target));
    if (sceneVisuals(join(base, 'src/games', ids[0] ?? '', 'scene.ts')).size === 0 && fake.length) problems.push('témoin : le graphe de la scène est vide');
    if (colours("c.fillStyle = '#123456'; g.fillStyle(0xabcdef); '#fff'") !== 3) problems.push('témoin : comptage des couleurs faux');
    for (const p of problems) console.log(`ÉCHEC ${p}`);
    console.log(`check-thumbnail-art : ${String(ids.length)} vignettes, ${String(problems.length)} écart(s)`);
    if (problems.length) process.exit(1);
}
