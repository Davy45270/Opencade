/* global console, process, URL, setTimeout, clearTimeout */
// Offline calibration of Bubble levels 31-130 (not part of test:node: minutes of solver time).
// 1. Screening: every shape × colour motif of each level is played by the greedy player on its real deal.
// 2. Choice: the winning variant closest to the target shot count of its slot (tiers of ten rise, each
//    opened by a breather at about 55 % of the tier), preferring shapes and motifs not yet used nearby.
// 3. Margin: the chosen variant must also be won with a ceiling that descends 20 % more often
//    (greedy, then beam search). Otherwise the next variant is tried; with none left, the ceiling slows.
// Writes docs/bubble-extension-calibration.json and tests/bubble-extension-solutions.ts, and rewrites the
// literal table of src/engines/bubble/extension.ts.   node scripts/bubble-extension-calibrate.js [--jobs=16]
import './ts-loader.js';
import { Worker } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const jobs = Number(arg('jobs') ?? Math.max(1, availableParallelism() - 4));
const { EXTENSION_START } = await import('../src/engines/bubble/levels.ts');
const { EXTENSION, TIER_SIZE } = await import('../src/engines/bubble/extension.ts');
const { encodeShots, handicapInterval } = await import('../tests/bubble-extension-format.ts');
const SHAPES = 10, MOTIFS = 6;
/** Target shots of extension level i: tiers rise from 16 to 47.5, breathers at 55 % of their tier. */
export function targetShots(i) {
    const tier = Math.floor(i / TIER_SIZE), k = i % TIER_SIZE, base = 16 + 3.5 * tier;
    return k === 0 ? base * 0.55 : base + (k - 5) * 0.6;
}
const pool = [];
async function spawn() {
    const worker = new Worker(new URL('./bubble-extension-worker.js', import.meta.url));
    await new Promise(resolve => worker.once('message', resolve));
    return worker;
}
const idle = [], waiting = [];
let started = 0;
async function acquire() {
    if (idle.length) return idle.pop();
    if (started < jobs) { started++; const w = await spawn(); pool.push(w); return w; }
    return new Promise(resolve => waiting.push(resolve));
}
function release(worker) { const next = waiting.shift(); if (next) next(worker); else idle.push(worker); }
async function run(task, timeoutMs) {
    const worker = await acquire();
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            void worker.terminate();
            const at = pool.indexOf(worker); if (at >= 0) pool.splice(at, 1);
            resolve({ won: false, timedOut: true });
            void spawn().then(w => { pool.push(w); release(w); });
        }, timeoutMs);
        worker.once('message', result => { clearTimeout(timer); release(worker); resolve(result); });
        worker.postMessage(task);
    });
}
async function screen(i, params) {
    const variants = [];
    for (let shape = 0; shape < SHAPES; shape++) for (let motif = 0; motif < MOTIFS; motif++) variants.push({ shape, motif });
    return Promise.all(variants.map(async v => ({ ...v, ...await run({ index: EXTENSION_START + i, ...params, ...v, full: false }, 20000) })));
}
async function tier(t) {
    const chosen = [];
    for (let k = 0; k < TIER_SIZE; k++) {
        const i = t * TIER_SIZE + k, row = EXTENSION[i], target = targetShots(i);
        let picked = null;
        for (let slow = 0; slow <= 4 && !picked; slow++) {
            const params = { colors: row[1], rows: row[2], interval: row[3] + slow };
            const results = (await screen(i, params)).filter(r => r.won);
            const used = new Set(chosen.map(c => c.shape)), last = chosen.at(-1);
            const cost = r => Math.abs(r.shots - target) / target + (used.has(r.shape) ? 0.35 : 0) + (last && last.motif === r.motif ? 0.2 : 0);
            for (const r of results.sort((a, b) => cost(a) - cost(b)).slice(0, 6)) {
                const harder = await run({ index: EXTENSION_START + i, ...params, interval: handicapInterval(params.interval), shape: r.shape, motif: r.motif, full: true }, 90000);
                if (!harder.won) continue;
                picked = { level: EXTENSION_START + i + 1, name: row[0], ...params, shape: r.shape, motif: r.motif, target: Math.round(target * 10) / 10,
                    normal: { shots: r.shots, method: r.method, sequence: encodeShots(r.sequence) },
                    margin: { interval: handicapInterval(params.interval), shots: harder.shots, method: harder.method, sequence: encodeShots(harder.sequence) } };
                break;
            }
        }
        if (!picked) throw new Error(`L${String(EXTENSION_START + i + 1)}: no provable variant`);
        chosen.push(picked);
        console.log(`L${String(picked.level)} ${String(picked.colors)}c ${String(picked.rows)}r /${String(picked.interval)} forme ${String(picked.shape)} motif ${String(picked.motif)} : ${String(picked.normal.shots)} tirs (cible ${String(picked.target)}), marge /${String(picked.margin.interval)} : ${String(picked.margin.shots)} tirs (${picked.margin.method})`);
    }
    return chosen;
}
const levels = (await Promise.all(Array.from({ length: EXTENSION.length / TIER_SIZE }, (_, t) => tier(t)))).flat();
await Promise.all(pool.map(w => w.terminate()));
writeFileSync(new URL('../docs/bubble-extension-calibration.json', import.meta.url), JSON.stringify({ levels }, null, 1) + '\n');
writeFileSync(new URL('../tests/bubble-extension-solutions.ts', import.meta.url),
    '// Generated by scripts/bubble-extension-calibrate.js: levels 31-130, real deal (own seed).\n' +
    '// normal: won with the level\'s ceiling; margin: won with a ceiling 20 % faster (handicapInterval).\n' +
    'export const extensionSolutions: readonly { readonly normal: string; readonly margin: string }[] = [\n' +
    levels.map(l => `    { normal: '${l.normal.sequence}', margin: '${l.margin.sequence}' },`).join('\n') + '\n];\n');
const source = new URL('../src/engines/bubble/extension.ts', import.meta.url);
let text = readFileSync(source, 'utf8');
for (const l of levels) {
    const name = l.name.replace(/'/g, "\\'");
    const at = text.indexOf(`['${name}', `);
    if (at < 0) throw new Error(`Row not found: ${l.name}`);
    const end = text.indexOf(']', at);
    text = text.slice(0, at) + `['${name}', ${String(l.colors)}, ${String(l.rows)}, ${String(l.interval)}, ${String(l.shape)}, ${String(l.motif)}` + text.slice(end);
}
writeFileSync(source, text);
console.log(`${String(levels.length)} niveaux calibrés.`);
