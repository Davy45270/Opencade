import { parseSync } from 'rolldown/utils';
import { transpile } from './transpile.js';

// ES module (TypeScript or JavaScript) -> CommonJS script, for harnesses that run a source in
// vm.runInNewContext or new Function with their own `exports` and stub `require`.
// Only static top-level import/export forms are rewritten; anything else is refused, never guessed.
export function toCommonJS(source) {
    const code = transpile(source);
    const { program, errors } = parseSync('module.js', code, { lang: 'js', sourceType: 'module' });
    if (errors.length) throw new Error(`toCommonJS: ${errors[0].message}`);
    const refuse = (node, what) => { throw new Error(`toCommonJS: unsupported ${what} at ${node.start}: ${code.slice(node.start, node.end).slice(0, 80)}`); };
    const scan = node => {
        if (Array.isArray(node)) { node.forEach(scan); return; }
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ImportExpression') refuse(node, 'dynamic import');
        if (node.type === 'MetaProperty' && node.meta.name === 'import') refuse(node, 'import.meta');
        for (const value of Object.values(node)) if (value && typeof value === 'object') scan(value);
    };
    scan(program);
    const name = node => node.type === 'Identifier' ? node.name : node.value;
    const edits = [], hoisted = [], trailing = [];
    let imports = 0;
    for (const node of program.body) {
        if (node.type === 'ImportDeclaration') {
            const module = `require(${JSON.stringify(node.source.value)})`;
            if (!node.specifiers.length) { edits.push([node.start, node.end, `${module};`]); continue; }
            const id = `__import${imports++}`, lines = [`const ${id} = ${module};`];
            for (const specifier of node.specifiers) {
                const local = specifier.local.name;
                if (specifier.type === 'ImportDefaultSpecifier') lines.push(`const ${local} = ${id} && ${id}.__esModule ? ${id}.default : ${id};`);
                else if (specifier.type === 'ImportNamespaceSpecifier') lines.push(`const ${local} = ${id};`);
                else lines.push(`const ${local} = ${id}[${JSON.stringify(name(specifier.imported))}];`);
            }
            edits.push([node.start, node.end, lines.join(' ')]);
        } else if (node.type === 'ExportNamedDeclaration') {
            if (node.source) refuse(node, 're-export');
            const declaration = node.declaration;
            if (declaration) {
                edits.push([node.start, declaration.start, '']);
                if (declaration.type === 'FunctionDeclaration') hoisted.push(declaration.id.name);
                else if (declaration.type === 'ClassDeclaration') edits.push([declaration.end, declaration.end, ` exports.${declaration.id.name} = ${declaration.id.name};`]);
                else if (declaration.type === 'VariableDeclaration') {
                    const names = declaration.declarations.map(d => d.id.type === 'Identifier' ? d.id.name : refuse(d, 'destructured export'));
                    edits.push([declaration.end, declaration.end, names.map(n => ` exports.${n} = ${n};`).join('')]);
                } else refuse(declaration, declaration.type);
            } else {
                edits.push([node.start, node.end, '']);
                for (const specifier of node.specifiers) trailing.push(`exports[${JSON.stringify(name(specifier.exported))}] = ${name(specifier.local)};`);
            }
        } else if (node.type === 'ExportDefaultDeclaration') {
            const declaration = node.declaration;
            if ((declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') && declaration.id) {
                edits.push([node.start, declaration.start, '']);
                trailing.push(`exports.default = ${declaration.id.name};`);
            } else edits.push([node.start, declaration.start, 'exports.default = ']);
        } else if (node.type === 'ExportAllDeclaration') refuse(node, 'export *');
    }
    let out = code;
    for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])) out = out.slice(0, start) + text + out.slice(end);
    const header = ['"use strict";', 'Object.defineProperty(exports, "__esModule", { value: true });', ...hoisted.map(n => `exports.${n} = ${n};`)];
    return `${header.join('\n')}\n${out}\n${trailing.join('\n')}\n`;
}
