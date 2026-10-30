import process from 'node:process';
import { readFileSync, writeFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { spawn } from 'node:child_process';

// JSON: [{ "name": "example", "file": "src/example.ts", "before": "...", "after": "..." }]
const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
if (process.argv.length !== 3) throw new Error('Usage: node scripts/mutate.js <mutations.json>');
const input = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
const mutations = Array.isArray(input) ? input : input.mutations;
if (!Array.isArray(mutations) || mutations.length === 0) throw new Error('Expected a nonempty mutations array');
// Validate every anchor before starting: a malformed mutation is never reported as killed.
const prepared = mutations.map((mutation, index) => {
    const { file, before, after } = mutation;
    if (typeof file !== 'string' || typeof before !== 'string' || !before || typeof after !== 'string' || before === after) {
        throw new Error(`Invalid mutation ${index + 1}: expected file, nonempty before and different after`);
    }
    const path = realpathSync(resolve(root, file));
    const local = relative(root, path);
    if (local.startsWith('..') || isAbsolute(local) || local.split(/[\\/]/).includes('.git') || !statSync(path).isFile()) {
        throw new Error(`Mutation outside repository files: ${file}`);
    }
    const original = readFileSync(path);
    const text = original.toString('utf8');
    if (text.split(before).length !== 2) throw new Error(`Expected exactly one anchor: ${file}, mutation ${index + 1}`);
    return { path, original, text: text.replace(before, after), name: mutation.name ?? mutation.id ?? `${index + 1}: ${file}` };
});

let child;
let interrupted;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
        interrupted = signal;
        // Signal npm and its test processes together on POSIX; restoration waits for exit.
        if (child?.pid) {
            try {
                if (process.platform === 'win32') child.kill(signal);
                else process.kill(-child.pid, signal);
            } catch (error) { if (error.code !== 'ESRCH') throw error; }
        }
    });
}
function run(args) {
    return new Promise((resolveRun, reject) => {
        child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
            cwd: root, stdio: 'inherit', detached: process.platform !== 'win32',
        });
        child.once('error', reject);
        child.once('close', (code, signal) => {
            child = undefined;
            if (signal || interrupted) reject(new Error(`Test command interrupted: ${signal ?? interrupted}`));
            else resolveRun(code === 0);
        });
    });
}

let survivors = 0;
for (const mutation of prepared) {
    if (interrupted) throw new Error(`Interrupted: ${interrupted}`);
    // Refuse to overwrite an edit made since preflight (also protects repeated targets).
    if (!readFileSync(mutation.path).equals(mutation.original)) throw new Error(`File changed: ${mutation.path}`);
    let survived;
    try {
        writeFileSync(mutation.path, mutation.text);
        survived = await run(['test']) && !interrupted && await run(['run', 'test:node']);
    } finally {
        writeFileSync(mutation.path, mutation.original);
    }
    if (interrupted) throw new Error(`Interrupted: ${interrupted}`);
    if (survived) survivors++;
    process.stdout.write(`${mutation.name}: ${survived ? 'survit' : 'tuée'}\n`);
}
process.stdout.write(`${prepared.length - survivors} tuée(s), ${survivors} survit/survivent\n`);
process.exitCode = survivors ? 1 : 0;
