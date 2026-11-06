import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import process from 'node:process';
// Loaded eagerly: a lazy require() from a load hook races with a test module importing it.
import { transformSync } from 'rolldown/utils';

// Full TypeScript -> ES2022 transform (parameter properties, enums, type-only imports elided):
// Oxc, the transformer Vite uses for the build.
export function transform(source) {
    const result = transformSync('source.ts', source, { lang: 'ts', sourceType: 'module', target: 'es2022', tsconfig: false });
    if (result.errors.length) throw result.errors[0];
    return result.code;
}

// Shared by source loading and in-memory mutations. The source (including rewritten
// imports) is the key, so a mutant can never reuse the original module's output.
export function transpile(source) {
    const cache = process.env.OPENCADE_TS_CACHE;
    const path = cache && `${cache}/${createHash('sha256').update('native-transform-v3\0' + source).digest('hex')}.js`;
    if (path) {
        try { return readFileSync(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    let code;
    try { code = stripTypeScriptTypes(source, { mode: 'strip' }); }
    catch (error) {
        if (error.code !== 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') throw error;
        code = transform(source);
    }
    if (path) {
        const temporary = `${path}.${process.pid}`;
        writeFileSync(temporary, code); renameSync(temporary, path);
    }
    return code;
}
