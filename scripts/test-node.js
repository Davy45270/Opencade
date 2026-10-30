import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { execFile } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { enableCompileCache, flushCompileCache } from 'node:module';
import { nodeChecks } from './node-checks.js';
import { transpile } from './transpile.js';

const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
const selectedChecks = only ? nodeChecks.filter(([file]) => only.includes(file)) : nodeChecks;
if (only && (selectedChecks.length !== only.length || !selectedChecks.length)) throw new Error('Unknown Node validator');
const root = fileURLToPath(new URL('../', import.meta.url));
const started = performance.now();
const cache = mkdtempSync(join(tmpdir(), 'opencade-ts-'));
// Compile source modules once before workers start: constructor-property fallbacks
// then load from disk without loading the TypeScript compiler in each process.
process.env.OPENCADE_TS_CACHE = cache;
process.env.NODE_COMPILE_CACHE = join(cache, 'v8');
enableCompileCache(process.env.NODE_COMPILE_CACHE);
function warm(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) warm(file);
        else if (file.endsWith('.ts')) transpile(readFileSync(file, 'utf8'));
    }
}
let failed = false, cursor = 0;
const durations = [];
async function run([file, ...args]) {
    const start = performance.now();
    const result = await new Promise(resolve => {
        execFile(process.execPath, ['--import', './scripts/ts-loader.js', `scripts/${file}`, ...args], {
            cwd: root, env: { ...process.env, OPENCADE_TS_CACHE: cache }, encoding: 'utf8', timeout: 120_000, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
        }, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
    });
    const ok = !result.error, elapsed = (performance.now() - start) / 1000;
    failed ||= !ok; durations.push([file, elapsed]);
    process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${file}: ${elapsed.toFixed(2)} s\n`);
    if (!ok) {
        process.stdout.write(result.stdout ?? '');
        process.stderr.write(result.stderr ?? '');
        if (result.error) process.stderr.write(`${result.error.message}\n`);
    }
}
async function worker() {
    while (cursor < selectedChecks.length) await run(selectedChecks[cursor++]);
}
// At most TEST_NODE_JOBS validators at once (default 2: one test slot has 2 CPUs), never more than the CPUs available.
const requestedJobs = Number.parseInt(process.env.TEST_NODE_JOBS ?? '2', 10);
const jobs = Math.max(1, Math.min(Number.isFinite(requestedJobs) ? requestedJobs : 2, availableParallelism()));
try {
    warm(join(root, 'src')); warm(join(root, 'tests'));
    flushCompileCache();
    await Promise.all(Array.from({ length: jobs }, () => worker()));
} finally {
    rmSync(cache, { recursive: true, force: true });
}
const seconds = (performance.now() - started) / 1000;
process.stdout.write(`test:node: ${selectedChecks.length} validateurs, ${jobs} en parallèle, durée totale ${seconds.toFixed(2)} s (indicatif : 180 s)\n`);
// The 180 s target is indicative: a busy host must not fail correct checks. Over it, list the slowest validators.
if (seconds >= 180) {
    process.stdout.write(`AVERTISSEMENT test:node au-delà de 180 s ; durées par validateur :\n`);
    for (const [file, elapsed] of durations.sort((a, b) => b[1] - a[1])) process.stdout.write(`  ${elapsed.toFixed(2)} s ${file}\n`);
}
process.exitCode = failed ? 1 : 0;
