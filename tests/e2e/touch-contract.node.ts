import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parseSync } from 'rolldown/utils';
import { renderTouchControls, virtualJoystick, type Inputs, type TouchButton } from '../../src/shell/input';

const registry = readFileSync('src/games/registry.ts', 'utf8');
// Catalogue scenes, then the scenes of games with their own site (src/games/<id>/definition.ts).
const siteGames = readdirSync('src/games').filter(id => existsSync(`src/games/${id}/definition.ts`));
const scenes = [...new Set([...[...registry.matchAll(/from '\.\/([^/]+)\/scene'/g)].map(match => match[1] ?? ''), ...siteGames].map(id => `src/games/${id}/scene.ts`))];
type Node = { type: string; start: number; end: number; [key: string]: unknown };
type Parsed = { text: string; program: Node };
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
function parse(file: string): Parsed {
    const text = readFileSync(file, 'utf8'), { program, errors } = parseSync(file, text);
    assert.equal(errors.length, 0, `${file}: ${errors[0]?.message ?? ''}`);
    return { text, program: program as unknown as Node };
}
function walk(node: Node, visit: (node: Node) => void) {
    visit(node);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (Array.isArray(value)) { for (const child of value) if (isNode(child)) walk(child, visit); }
        else if (isNode(value)) walk(value, visit);
    }
}
const source = (parsed: Parsed, node: Node) => parsed.text.slice(node.start, node.end);
const child = (node: Node, key: string) => node[key] as Node;
/** `key: value` in an object literal (not a method, accessor, shorthand or spread). */
const isPropertyAssignment = (node: Node) => node.type === 'Property' && node.kind === 'init' && node.method === false && node.shorthand === false;
/** Declared name without its type annotation (`fooButtons`, not `fooButtons: TouchButton[]`). */
const bindingName = (parsed: Parsed, node: Node) => node.type === 'Identifier' ? node.name as string : source(parsed, node);
/** Property name as written; a computed name keeps its brackets. */
const propertyName = (parsed: Parsed, node: Node) => node.computed === true ? `[${source(parsed, child(node, 'key'))}]` : source(parsed, child(node, 'key'));

function literal(parsed: Parsed, node: Node): unknown {
    if (node.type === 'Literal' && ['string', 'number', 'boolean'].includes(typeof node.value)) return node.value;
    if (node.type === 'ArrayExpression') return (node.elements as (Node | null)[]).map(element => {
        assert.ok(element && element.type !== 'SpreadElement', `Nonliteral touch definition: ${source(parsed, node)}`);
        return literal(parsed, element);
    });
    if (node.type === 'ObjectExpression') return Object.fromEntries((node.properties as Node[]).map(property => {
        assert.ok(isPropertyAssignment(property), 'literal button property');
        return [propertyName(parsed, property), literal(parsed, child(property, 'value'))];
    }));
    throw new Error(`Nonliteral touch definition: ${source(parsed, node)}`);
}

void test('registry scenes expose receipts separately and never return them from read()', () => {
    assert.ok(scenes.length > 0);
    for (const file of scenes) {
        let reads = 0, receipts = 0;
        const parsed = parse(file);
        walk(parsed.program, node => {
            if (!isPropertyAssignment(node)) return;
            if (propertyName(parsed, node) === 'fingerReceipts') receipts++;
            if (propertyName(parsed, node) !== 'read') return;
            reads++;
            walk(child(node, 'value'), inner => {
                // `name: value`, shorthand `name`, or `object.name` (not `object[name]`).
                const named = inner.type === 'Property' && inner.kind === 'init' && inner.method === false ? propertyName(parsed, inner)
                    : inner.type === 'MemberExpression' && inner.computed === false ? source(parsed, child(inner, 'property')) : undefined;
                if (named !== undefined && /receipts|bombRequests|specialRequests/i.test(named)) assert.fail(`${file}: diagnostic in read(): ${source(parsed, inner)}`);
                if (inner.type === 'CallExpression') assert.doesNotMatch(source(parsed, child(inner, 'callee')), /receipts/i, file);
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
        for (const file of sources) {
            const parsed = parse(file);
            walk(parsed.program, node => {
                const initializer = node.init as Node | null | undefined;
                if (node.type !== 'VariableDeclarator' || !bindingName(parsed, child(node, 'id')).endsWith('Buttons') || !initializer || initializer.type !== 'ArrayExpression') return;
                // Read literal definitions without importing Phaser.
                const buttons = literal(parsed, initializer) as TouchButton[];
                menu.replaceChildren();
                renderTouchControls(inputs, buttons, () => {});
                const rendered = [...root.children.flatMap(slot => slot.children), ...menu.children];
                assert.equal(rendered.length, buttons.length, file);
                for (const button of rendered) {
                    assert.ok(button.tagName === 'BUTTON' || (button.attributes.get('role') === 'button' && button.listeners.has('click')), `${file}: ${button.id}`);
                    checked++;
                }
            });
        }
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
