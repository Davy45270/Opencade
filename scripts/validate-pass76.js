/* global console, Event, EventTarget */
import { Buffer } from 'node:buffer';
// Browser-free checks: CDP protocol sequencing and declared mobile flex geometry.
import { transpile } from './transpile.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
const helper = transpile(readFileSync('tests/e2e/character-finger-input.ts', 'utf8'));
const { Finger } = await import(`data:text/javascript;base64,${Buffer.from(helper).toString('base64')}`);

const packets = [];
let active = false;
const cdp = { async send(method, packet) {
    assert.equal(method, 'Input.dispatchTouchEvent');
    if (packet.type === 'touchStart') { assert.equal(active, false); active = true; }
    else { assert.equal(active, true, `${packet.type} without touchStart`); }
    if (packet.type === 'touchEnd') active = false;
    packets.push(packet.type);
} };
const page = {
    async waitForTimeout() {},
    locator() { return { async boundingBox() { return { x: 0, y: 0, width: 56, height: 56 }; } }; },
    async evaluate(argument, targets) {
        if (Array.isArray(targets)) return { points: targets.map((_, id) => ({ id, x: 28, y: 28 })), missed: false };
        return true;
    },
};
const finger = new Finger(page, cdp);
await finger.release();
await finger.press(['tap']);
await finger.release();
await finger.steer(['left', 'thrust']);
await finger.steer(['right']);
await finger.steer([]);
await finger.release();
await finger.touch('touchStart', [{ id: 9, x: 10, y: 10 }]);
await finger.touch('touchMove', [{ id: 9, x: 20, y: 20 }]);
await finger.release();
await assert.rejects(() => finger.touch('touchMove', [{ id: 9, x: 20, y: 20 }]));
await assert.rejects(() => finger.press(['tap'], async () => { throw new Error('capture failed'); }), /capture failed/);
await finger.release();
assert.equal(active, false);
assert.deepEqual(packets, ['touchStart', 'touchEnd', 'touchStart', 'touchEnd', 'touchStart', 'touchEnd', 'touchStart', 'touchMove', 'touchEnd', 'touchStart', 'touchEnd']);

const css = postcss.parse(readFileSync('src/style.css', 'utf8'));
const input = readFileSync('src/shell/input.ts', 'utf8');
const compactBreakpoint = Number(input.match(/matchMedia\('\(width < (\d+)px\)'\)/)[1]);
const games = ['caisses', 'traverse', 'alunir', 'derapage', 'bubble', 'serpentin'];
function matches(part, node) {
    if (part.includes(':not') || part.includes(':') || part.includes('>')) return false;
    const tag = part.match(/^[a-z]+/)?.[0];
    if (tag && tag !== node.tag) return false;
    if ([...part.matchAll(/#([\w-]+)/g)].some(m => m[1] !== node.id)) return false;
    if ([...part.matchAll(/\.([\w-]+)/g)].some(m => !node.classes.includes(m[1]))) return false;
    if ([...part.matchAll(/\[([\w-]+)="([^"]+)"\]/g)].some(m => node[m[1]] !== m[2])) return false;
    return true;
}
function style(path, width) {
    const result = {}, priority = {};
    css.walkRules(rule => {
        for (let parent = rule.parent; parent; parent = parent.parent) {
            if (parent.type !== 'atrule' || parent.name !== 'media') continue;
            const enabled = parent.params.split(',').some(query => {
                if (query.includes('pointer: coarse')) return true;
                const limit = query.match(/(?:width < |max-width:\s*)(\d+)px/);
                if (limit) return query.includes('width <') ? width < Number(limit[1]) : width <= Number(limit[1]);
                const min = query.match(/min-width:\s*(\d+)px/);
                return min && width >= Number(min[1]);
            });
            if (!enabled) return;
        }
        for (const selector of rule.selectors) {
            const parts = selector.trim().split(/\s+/);
            let index = path.length - 1;
            if (!matches(parts.pop(), path[index--])) continue;
            let matched = true;
            for (const part of parts.reverse()) {
                while (index >= 0 && !matches(part, path[index])) index--;
                if (index < 0) { matched = false; break; }
                index--;
            }
            if (!matched) continue;
            const specificity = [...selector.matchAll(/#/g)].length * 100 + [...selector.matchAll(/\.|\[/g)].length * 10 + selector.split(/\s+/).filter(p => /^[a-z]/.test(p)).length;
            rule.walkDecls(decl => {
                const rank = specificity + (decl.important ? 10000 : 0);
                if (rank >= (priority[decl.prop] ?? -1)) { result[decl.prop] = decl.value; priority[decl.prop] = rank; }
            });
        }
    });
    return result;
}
const node = (tag, id = '', classes = []) => ({ tag, id, classes });
for (const [width, height] of [[360, 640], [390, 844], [390, 600]]) for (const game of games) {
    const source = readFileSync(game === 'bubble' ? 'src/games/registry.ts' : `src/games/${game}/scene.ts`, 'utf8');
    const declaration = source.match(new RegExp(`export const ${game}Buttons[^=]*= \\[([\\s\\S]*?)\\n\\];`))[1];
    const buttons = [...declaration.matchAll(/\{([^}]+)\}/g)].map(([, spec]) => ({
        id: spec.match(/id: '([^']+)'/)[1], label: spec.match(/ariaLabel: '([^']+)'/)[1],
        size: Number(spec.match(/size: (\d+)/)[1]), placement: spec.match(/placement: '([^']+)'/)[1],
        menu: spec.includes('compactMenu: true') && width < compactBreakpoint,
    }));
    const path = [node('body', '', ['playing', 'touch', game]), node('main'), node('section', 'play'), node('div', 'touch-controls')];
    const row = style(path, width), gap = parseFloat(row.gap);
    const slots = ['left', 'center', 'right'].map(placement => {
        const slotPath = [...path, node('div', '', ['touch-slot', placement])];
        const slot = style(slotPath, width), sizes = buttons.filter(b => b.placement === placement && !b.menu).map(b => {
            const button = node('button', b.id); button['aria-label'] = b.label;
            const s = style([...slotPath, button], width);
            const w = Math.max(parseFloat(s.width), parseFloat(s['min-width'] ?? b.size));
            const h = Math.max(parseFloat(s.height), parseFloat(s['min-height'] ?? b.size));
            assert.ok(w >= 56 && h >= 56, `${b.id}: target ${w}x${h}`);
            return [w, h];
        });
        if (game === 'derapage' && placement === 'left') {
            const s = style([...slotPath, node('output', 'derapage-steering')], width);
            sizes.push([parseFloat(s.width), parseFloat(s['min-height'])]);
        }
        if (!sizes.length) return [0, 0];
        const column = slot['flex-direction']?.startsWith('column');
        const sum = axis => sizes.reduce((n, s) => n + s[axis], 0) + (sizes.length - 1) * parseFloat(slot.gap);
        return column ? [Math.max(...sizes.map(s => s[0])), sum(1)] : [sum(0), Math.max(...sizes.map(s => s[1]))];
    });
    // Caisses hides empty slots; other games retain all three flex slots.
    const present = game === 'caisses' ? slots.filter(s => s[0]) : slots;
    const used = present.reduce((n, s) => n + s[0], 0) + (present.length - 1) * gap;
    const rowHeight = parseFloat(row.height);
    assert.ok(used <= width - 32, `${game} ${width}: ${used} > ${width - 32}`);
    assert.ok(Math.max(...slots.map(s => s[1])) <= rowHeight, `${game}: vertical overflow`);
    assert.ok(rowHeight <= (game === 'derapage' ? 156 : 64), `${game}: row too tall`);
    assert.ok(height - 44 - rowHeight > 0);
    console.log(`${game} ${width}x${height}: controls ${used}/${width - 32}px, row ${rowHeight}px, menu: ${buttons.filter(b => b.menu).map(b => b.id).join(',') || '—'}`);
}
console.log('CDP sequencing and 18 declared mobile layouts passed (no browser; text metrics/safe areas are not simulated).');

// Exercise responsive reparenting, actual input handlers and disposal without a DOM renderer.
await import('./ts-loader.js');
const { Inputs, renderTouchControls } = await import('../src/shell/input.ts');
class Element extends EventTarget {
    children = []; style = {}; parent = null; classes = new Set();
    classList = {
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
        contains: name => this.classes.has(name),
    };
    append(child) { child.remove(); this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    replaceChildren() { for (const child of [...this.children]) child.remove(); }
    setAttribute(name, value) { this[name] = value; }
    click() { this.dispatchEvent(new Event('click')); }
    setPointerCapture() {}
}
const root = new Element(), menu = new Element(), toggle = new Element();
const media = new EventTarget(); media.matches = true;
let menuOpen = true;
toggle.addEventListener('click', () => { menuOpen = !menuOpen; });
globalThis.document = {
    querySelector: selector => ({ '#touch-controls': root, '#game-menu': menu, '#game-menu-toggle': toggle })[selector] ?? null,
    createElement: () => new Element(),
};
globalThis.matchMedia = () => media;
const inputs = new Inputs(), actions = [];
renderTouchControls(inputs, [{ id: 'undo', label: '↶', ariaLabel: 'Annuler', size: 56, placement: 'right', mode: 'tap', compactMenu: true }], (id, held) => {
    assert.equal(menuOpen, false, 'Close the pause gate before executing the menu command'); actions.push([id, held]);
});
const control = menu.children[0];
assert.ok(control);
control.dispatchEvent(new Event('pointerdown'));
assert.deepEqual(actions, []);
control.click();
assert.deepEqual(actions, [['undo', true]]);
media.matches = false; media.dispatchEvent(new Event('change'));
assert.equal(menu.children.length, 0);
assert.equal(root.children[2].children[0], control);
media.matches = true; media.dispatchEvent(new Event('change'));
assert.equal(menu.children[0], control);
inputs.dispose();
assert.equal(menu.children.length, 0);
assert.equal(root.children.length, 0);
media.matches = false; media.dispatchEvent(new Event('change'));
assert.equal(control.parent, null, 'No relocation listener survives scene shutdown');
console.log('Compact menu command, resize and scene cleanup passed.');
