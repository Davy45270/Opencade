import { createRequire, stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import process from 'node:process';

const require = createRequire(import.meta.url);
let ts;

// Shared by source loading and in-memory mutations. The source (including rewritten
// imports) is the key, so a mutant can never reuse the original module's output.
export function transpile(source) {
    const cache = process.env.OPENCADE_TS_CACHE;
    const path = cache && `${cache}/${createHash('sha256').update('native-transform-v2\0' + source).digest('hex')}.js`;
    if (path) {
        try { return readFileSync(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    let code;
    try { code = stripTypeScriptTypes(source, { mode: 'strip' }); }
    catch (error) {
        if (error.code !== 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') throw error;
        ts ??= require('typescript');
        code = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    }
    if (path) {
        const temporary = `${path}.${process.pid}`;
        writeFileSync(temporary, code); renameSync(temporary, path);
    }
    return code;
}
