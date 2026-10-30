import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import ts from 'typescript';

/** Inspect syntax rather than comments or strings that merely mention imports. */
export function checkEngineImports(source: string, file: string): void {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const check = (specifier: string): void => {
        const target = posix.normalize(specifier.startsWith('.') ? posix.join(posix.dirname(file), specifier) : specifier);
        assert.doesNotMatch(target, /(?:^|\/)games(?:\/|$)|(?:^|\/)(?:view3d|road|scene|joystick|kart-art)(?:\.[^/]*)?(?:\/|$)/i,
            `${file}: engine must not depend on a game or view (${specifier})`);
    };
    const visit = (node: ts.Node): void => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) check(node.moduleSpecifier.text);
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
            const argument = node.arguments[0];
            assert.ok(argument && ts.isStringLiteralLike(argument), `${file}: imports must be statically inspectable`);
            check(argument.text);
        }
        if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
            const argument = node.moduleReference.expression;
            if (ts.isStringLiteralLike(argument)) check(argument.text);
        }
        if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) check(node.argument.literal.text);
        ts.forEachChild(node, visit);
    };
    visit(ast);
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
