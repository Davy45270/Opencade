/* global structuredClone */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { Engine } from '../src/engines/orbite/engine.ts';
import { replay as rawReplay } from '../tests/orbite-replay.ts';

// A successful identical replay is shared only within this test:node invocation.
// Include all source/oracle dependencies, the complete recording and engine identity;
// mutated constructors always execute the real oracle and never consult this cache.
const cache = process.env.OPENCADE_TS_CACHE;
const fingerprint = createHash('sha256');
function hashTree(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) hashTree(file);
        else if (/\.(ts|js)$/.test(file)) fingerprint.update(file).update(readFileSync(file));
    }
}
if (cache) for (const path of ['src', 'scripts', 'tests']) hashTree(path);
const version = fingerprint.digest('hex'), memory = new Map();
export function verifiedReplay(record) {
    const key = createHash('sha256').update(version).update(JSON.stringify(record)).digest('hex');
    if (memory.has(key)) return structuredClone(memory.get(key));
    const path = cache && `${cache}/orbite-replay-${key}.json`;
    let proof;
    if (path) {
        try { proof = JSON.parse(readFileSync(path, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!proof) {
        const engines = [];
        class Witness extends Engine { constructor(level, seed) { super(level, seed); engines.push(this); } }
        const result = rawReplay(record, Witness);
        proof = { result, final: engines[0].snapshot() };
        if (path) {
            const temporary = `${path}.${process.pid}`;
            writeFileSync(temporary, JSON.stringify(proof)); renameSync(temporary, path);
        }
    }
    memory.set(key, proof);
    return structuredClone(proof);
}
export function replay(record, E = Engine) {
    return E === Engine ? verifiedReplay(record).result : rawReplay(record, E);
}
