import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { parseSync } from 'rolldown/utils';

type Node = { type: string; [key: string]: unknown };
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
/** Static module specifier: a string literal or a template without substitutions. */
function staticText(node: unknown): string | undefined {
    if (!isNode(node)) return undefined;
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
    const quasis = node.quasis as { value: { cooked: string | null } }[] | undefined;
    if (node.type === 'TemplateLiteral' && (node.expressions as unknown[]).length === 0 && quasis?.length === 1) return quasis[0]?.value.cooked ?? undefined;
    return undefined;
}

/** Inspect syntax rather than comments or strings that merely mention imports. */
export function checkEngineImports(source: string, file: string): void {
    const { program, errors } = parseSync(file, source);
    assert.equal(errors.length, 0, `${file}: ${errors[0]?.message ?? ''}`);
    const check = (specifier: string): void => {
        const target = posix.normalize(specifier.startsWith('.') ? posix.join(posix.dirname(file), specifier) : specifier);
        assert.doesNotMatch(target, /(?:^|\/)games(?:\/|$)|(?:^|\/)(?:view3d|road|scene|joystick|kart-art)(?:\.[^/]*)?(?:\/|$)/i,
            `${file}: engine must not depend on a game or view (${specifier})`);
    };
    const visit = (node: Node): void => {
        // import/export ... from, including `import type` and `export type`.
        if ((node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source) {
            const specifier = staticText(node.source);
            if (specifier !== undefined) check(specifier);
        }
        const callee = node.callee as Node | undefined;
        if (node.type === 'ImportExpression' || (node.type === 'CallExpression' && callee?.type === 'Identifier' && callee.name === 'require')) {
            const specifier = staticText(node.type === 'ImportExpression' ? node.source : (node.arguments as unknown[])[0]);
            assert.ok(specifier !== undefined, `${file}: imports must be statically inspectable`);
            check(specifier);
        }
        const reference = node.moduleReference as Node | undefined;
        if (node.type === 'TSImportEqualsDeclaration' && reference?.type === 'TSExternalModuleReference') {
            const specifier = staticText(reference.expression);
            if (specifier !== undefined) check(specifier);
        }
        if (node.type === 'TSImportType') {
            const specifier = staticText(node.source);
            if (specifier !== undefined) check(specifier);
        }
        for (const [key, value] of Object.entries(node)) {
            if (key === 'parent') continue;
            if (Array.isArray(value)) { for (const child of value) if (isNode(child)) visit(child); }
            else if (isNode(value)) visit(value);
        }
    };
    visit(program as unknown as Node);
}

export function checkEngineUnchanged(): void {
    const walk = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const file = join(directory, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (/\.[cm]?[jt]s$/.test(file)) checkEngineImports(readFileSync(file, 'utf8'), file);
        }
    };
    walk('src/engines/derapage');
    for (const source of [
        "import { draw3d } from '../../games/derapage/view3d';",
        "export * from './scene';",
        "const view = import('./nested/../road');",
        "import type { View } from './kart-art';",
    ]) assert.throws(() => { checkEngineImports(source, 'src/engines/derapage/fake.ts'); }, { name: 'AssertionError' }, 'engine-to-view dependency rejected');
    checkEngineImports("// import './scene'\nimport type { Kart } from './types';", 'src/engines/derapage/fake.ts');
}
