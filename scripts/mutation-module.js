/* global URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
export async function mutationModule(path, before, after, imports = {}) {
    const url = new URL(path, import.meta.url), source = readFileSync(url, 'utf8');
    assert.ok(source.includes(before), `Missing mutation anchor: ${before}`);
    const changed = source.replace(before, after).replace(/from '([^']+)'/g,
        (_, name) => `from ${JSON.stringify(imports[name] ?? new URL(`${name}.ts`, url).href)}`);
    const js = transpile(changed);
    return { url: `data:text/javascript,${encodeURIComponent(js)}`, module: await import(`data:text/javascript,${encodeURIComponent(js)}`) };
}
