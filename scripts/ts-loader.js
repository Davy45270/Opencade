/* global URL */
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
registerHooks({
    resolve(specifier, context, next) {
        if (context.parentURL?.endsWith('.ts') && !context.parentURL.includes('/node_modules/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) specifier += '.ts';
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url.endsWith('.ts')) return { format: 'module', source: transpile(readFileSync(new URL(url), 'utf8')), shortCircuit: true };
        return next(url, context);
    },
});
