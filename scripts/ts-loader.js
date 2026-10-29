/* global URL */
import { registerHooks } from 'node:module';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
registerHooks({
    resolve(specifier, context, next) {
        if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) specifier += '.ts';
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url.endsWith('.ts')) return { format: 'module', source: ts.transpile(readFileSync(new URL(url), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }), shortCircuit: true };
        return next(url, context);
    },
});
