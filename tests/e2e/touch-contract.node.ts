import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { renderTouchControls, virtualJoystick, type Inputs, type TouchButton } from '../../src/shell/input';

const registry = readFileSync('src/games/registry.ts', 'utf8');
const scenes = [...new Set([...registry.matchAll(/from '\.\/([^/]+)\/scene'/g)].map(match => `src/games/${match[1] ?? ''}/scene.ts`))];
function parse(file: string) { return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); }
function walk(node: ts.Node, visit: (node: ts.Node) => void) { visit(node); node.forEachChild(child => { walk(child, visit); }); }

function literal(node: ts.Expression): unknown {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
        assert.ok(ts.isPropertyAssignment(property), 'literal button property');
        return [property.name.getText(), literal(property.initializer)];
    }));
    throw new Error(`Nonliteral touch definition: ${node.getText()}`);
}

void test('registry scenes expose receipts separately and never return them from read()', () => {
    assert.ok(scenes.length > 0);
    for (const file of scenes) {
        let reads = 0, receipts = 0;
        walk(parse(file), node => {
            if (!ts.isPropertyAssignment(node)) return;
            if (node.name.getText() === 'fingerReceipts') receipts++;
            if (node.name.getText() !== 'read') return;
            reads++;
            walk(node.initializer, child => {
                if ((ts.isPropertyAssignment(child) || ts.isShorthandPropertyAssignment(child) || ts.isPropertyAccessExpression(child))
                    && /receipts|bombRequests|specialRequests/i.test(child.name.getText())) assert.fail(`${file}: diagnostic in read(): ${child.getText()}`);
                if (ts.isCallExpression(child)) assert.doesNotMatch(child.expression.getText(), /receipts/i, file);
            });
        });
        assert.equal(reads, 1, `${file}: read() inspected`);
        assert.equal(receipts, 1, `${file}: fingerReceipts() exposed`);
    }
});

void test('every registered touch button and shared joystick is a Chromium click candidate', () => {
    class Element {
        tagName: string; id = ''; className = ''; style = {}; children: Element[] = [];
        attributes = new Map<string, string>(); listeners = new Set<string>();
        classList = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
        remove() {}
        constructor(tag: string) { this.tagName = tag.toUpperCase(); }
        setAttribute(key: string, value: string) { this.attributes.set(key, value); }
        append(child: Element) { this.children.push(child); }
        replaceChildren() { this.children = []; }
    }
    const prior = ['document', 'matchMedia'].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    // Settings (setting: true) are rendered in the pause page (#game-menu); the ⏸ is absent here, so corner buttons stay in their slot.
    const root = new Element('div'), menu = new Element('div'), body = new Element('body');
    const select = (selector: string) => selector === '#game-menu' ? menu : selector === '#topbar #pause' ? null : root;
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { body, querySelector: select, createElement: (tag: string) => new Element(tag) } });
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    const inputs = { on: (target: { listeners?: Set<string> } | null, event: string) => { target?.listeners?.add(event); }, cleanup() {} } as unknown as Inputs;
    try {
        const sources = [...scenes, 'src/games/registry.ts'];
        let checked = 0;
        for (const file of sources) walk(parse(file), node => {
            if (!ts.isVariableDeclaration(node) || !node.name.getText().endsWith('Buttons') || !node.initializer || !ts.isArrayLiteralExpression(node.initializer)) return;
            // Read literal definitions without importing Phaser.
            const buttons = literal(node.initializer) as TouchButton[];
            menu.replaceChildren();
            renderTouchControls(inputs, buttons, () => {});
            const rendered = [...root.children.flatMap(slot => slot.children), ...menu.children];
            assert.equal(rendered.length, buttons.length, file);
            for (const button of rendered) {
                assert.ok(button.tagName === 'BUTTON' || (button.attributes.get('role') === 'button' && button.listeners.has('click')), `${file}: ${button.id}`);
                checked++;
            }
        });
        assert.ok(checked > scenes.length);
        const parent = new Element('div');
        virtualJoystick(inputs, parent as unknown as HTMLElement, () => {});
        const stick = parent.children[0]; assert.ok(stick);
        assert.ok(stick.tagName === 'BUTTON' || (stick.attributes.get('role') === 'button' && stick.listeners.has('click')), 'joystick');
    } finally {
        ['document', 'matchMedia'].forEach((key, index) => {
            const descriptor = prior[index];
            if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
        });
    }
});
