import { renderCharacter as render2D } from '../src/characters/canvas';
import { renderCharacter as renderGraphics } from '../src/characters/phaser';
import { ids, poses, expressions, animations, characters, drawList, others, specialCycleMs, type CharacterId, type Primitive, type Point } from '../src/characters/model';
import { selectedCharacter, selectCharacter } from '../src/characters/selection';
function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
const json = (value: unknown): string => JSON.stringify(value);
// Sample the actual contour, including cubic curves and rotated ellipses.
function bounds(list: readonly Primitive[]): { width: number; height: number } {
    const points: Point[] = [];
    for (const p of list) {
        const start = points.length;
        if (p.kind === 'ellipse' || p.kind === 'circle') {
            const rx = p.kind === 'circle' ? p.r : p.rx, ry = p.kind === 'circle' ? p.r : p.ry, r = p.kind === 'circle' ? 0 : p.rotation;
            for (let i = 0; i < 128; i++) { const a = i * Math.PI / 64, x = rx * Math.cos(a), y = ry * Math.sin(a); points.push([p.x + x * Math.cos(r) - y * Math.sin(r), p.y + x * Math.sin(r) + y * Math.cos(r)]); }
        } else if (p.kind === 'path') {
            let previous: Point = [0, 0];
            for (const c of p.commands) {
                if (c.op === 'C') for (let i = 0; i <= 32; i++) { const t = i / 32, u = 1 - t; points.push([u ** 3 * previous[0] + 3 * u * u * t * c.a[0] + 3 * u * t * t * c.b[0] + t ** 3 * c.p[0], u ** 3 * previous[1] + 3 * u * u * t * c.a[1] + 3 * u * t * t * c.b[1] + t ** 3 * c.p[1]]); }
                else points.push(c.p);
                previous = c.p;
            }
        } else points.push(...p.points);
        const padding = p.width / 2;
        for (const v of points.slice(start)) { points.push([v[0] - padding, v[1] - padding], [v[0] + padding, v[1] + padding]); }
    }
    return { width: Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])), height: Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1])) };
}
const span = (values: number[]): number => Math.max(...values) - Math.min(...values);
export function deterministic(id: CharacterId, draw = drawList): void {
    for (const pose of poses) for (const expression of expressions) for (const anim of animations) {
        const a = draw(id, pose, expression, anim, 173);
        check(a.length >= 8, `C01 ${id}/${pose}/${expression}/${anim}: substantial drawing`);
        check(json(a) === json(draw(id, pose, expression, anim, 173)), 'C01 deterministic');
        check(!/null|undefined/.test(json(a)), 'C01 finite geometry');
    }
}
export function distinct(palette = characters, draw = drawList): void {
    const counts = ids.map(id => draw(id).length);
    check(new Set(counts).size === 5, 'C02 five different primitive counts');
    const rgb = (value: string): number[] => [1, 3, 5].map(i => Number.parseInt(value.slice(i, i + 2), 16));
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
        const a = rgb(palette[ids[i] ?? 'panda'].accent), b = rgb(palette[ids[j] ?? 'panda'].accent);
        check(Math.hypot(...a.map((v, k) => v - (b[k] ?? 0))) > 75, 'C02 RGB distance above 75');
    }
    const unicorn = draw('licorne');
    for (const color of ['#f18cbd', '#f4a153', '#f5d65d', '#72c88b', '#75bce4', '#ac87db'])
        check(unicorn.filter(p => p.kind === 'path' && p.fill === color && p.width === 12).length === 1, `C02 mane ${color}`);
    check(draw('dragon').filter(p => p.kind === 'path' && p.fill === '#efbd43').length === 2, 'C02 two golden horns');
    check(draw('singe').some(p => p.kind === 'path' && p.fill === '#f59bc7'), 'C02 pink tutu');
    check(draw('singe').filter(p => p.kind === 'ellipse' && p.fill === '#f28aba').length === 5, 'C02 five pink flower petals');
    check(draw('pandaroux').filter(p => p.kind === 'ellipse' && p.fill === '#ffe6be' && p.ry === 6).length === 4, 'C02 striped tail');
    const patches = draw('panda').filter(p => p.kind === 'ellipse' && p.fill === '#49383e' && p.rx === 20 && p.ry === 24);
    check(patches.length === 2 && patches.some(p => p.kind === 'ellipse' && p.x === 97) && patches.some(p => p.kind === 'ellipse' && p.x === 145), 'C02 paired panda eye patches');
    check(json(others('dragon')) === json(['panda', 'pandaroux', 'singe', 'licorne']), 'C02 stable others');
    for (const id of ids) {
        check(others(id).length === 4 && !others(id).includes(id), 'C02 four others');
        check(json(draw(id, 'face')) !== json(draw(id, 'profil')) && json(draw(id, 'profil')) !== json(draw(id, 'dos')), 'C02 three orientations');
        check(new Set(expressions.map(e => json(draw(id, 'face', e)))).size === 5, 'C02 five expressions');
    }
}
export function moving(id: CharacterId, draw = drawList): void {
    for (const anim of ['repos', 'marche', 'saut', 'celebration', 'special'] as const) {
        check(json(draw(id, 'face', 'joie', anim, 0)) !== json(draw(id, 'face', 'joie', anim, 300)), `C03 ${id}/${anim} moves`);
        for (const pose of poses) for (const expression of expressions) check(json(draw(id, pose, expression, anim, 0, 'reduce')) === json(draw(id, pose, expression, anim, 300, 'reduce')), 'C03 reduce is fixed');
        check(json(draw(id, 'face', 'joie', anim, 300, 'reduce')) === json(draw(id, 'face', 'joie', 'repos', 0, 'reduce')), 'C03 reduce has no special particles');
    }
    const times = Array.from({ length: 49 }, (_, i) => i * 40);
    const body = (anim: 'saut' | 'repos' | 'celebration', t: number): number => {
        const p = draw(id, 'face', 'joie', anim, t).find(p => p.kind === 'ellipse' && p.fill === characters[id].coat && p.ry === (id === 'panda' ? 49 : 44));
        check(p?.kind === 'ellipse', 'C03 body exists'); return p?.kind === 'ellipse' ? p.y : 0;
    };
    check(span(times.map(t => body('repos', t))) >= 3, `C03 ${id} breathing amplitude`);
    check(span(times.map(t => body('celebration', t))) >= 7, `C03 ${id} celebration amplitude`);
    check(span(times.map(t => body('saut', t) - body('repos', t))) >= 22, `C03 ${id} jump height`);
    for (const x of [92, 146]) {
        const steps = times.map(t => { const p = draw(id, 'face', 'joie', 'marche', t).find(p => p.kind === 'ellipse' && p.rx === 19 && p.x === x); return p?.kind === 'ellipse' ? p.y : 0; });
        check(span(steps) >= 16, `C03 ${id} walking foot amplitude`);
    }
    const special = draw(id, 'face', 'joie', 'special', 300);
    const effects = special.filter(p => p.effect);
    const count = (color: string, kind: Primitive['kind']): number => effects.filter(p => p.fill === color && p.kind === kind).length;
    if (id === 'panda') check(count('#65b85e', 'ellipse') === 10, 'C03 bamboo leaf shower');
    if (id === 'dragon') {
        check(count('#f5a243', 'path') === 1, 'C03 fire');
        check(effects.some(p => p.kind === 'ellipse' && p.stroke === '#69bce7') && count('#69bce7', 'polygon') === 8, 'C03 rune circle');
    }
    if (id === 'licorne') {
        for (const color of ['#f18cbd', '#f4a153', '#f5d65d', '#72c88b', '#75bce4', '#ac87db']) check(count(color, 'path') === 1, 'C03 rainbow');
        check(count('#ffda60', 'polygon') === 1, 'C03 shooting star');
        const starY = times.map(t => { const p = draw(id, 'face', 'joie', 'special', t).find(p => p.effect && p.kind === 'polygon' && p.fill === '#ffda60'); return p?.kind === 'polygon' ? p.points[0]?.[1] ?? 0 : 0; });
        check(span(starY) > 20, 'C03 star travels');
    }
    if (id === 'singe') {
        check(count('#efbd43', 'polygon') === 5, 'C03 pirouette stars');
        const cycle = Array.from({ length: 49 }, (_, i) => i * specialCycleMs.singe / 48);
        const angles = cycle.map(t => { const p = draw(id, 'face', 'joie', 'special', t).find(p => p.kind === 'ellipse' && p.rx === 43 && p.ry === 44); return p?.kind === 'ellipse' ? p.rotation : 0; });
        check(span(angles) >= 2 * Math.PI - 1e-9, 'C03 full 360 degree pirouette per cycle');
        const skirt = (anim: 'special' | 'repos') => bounds(draw(id, 'face', 'joie', anim, 0).filter(p => p.fill === '#f59bc7')).width;
        check(skirt('special') > skirt('repos') * 1.3, 'C03 centrifugal tutu flare');
    }
    if (id === 'pandaroux') {
        check(count('#f397ad', 'path') === 3 && effects.filter(p => p.kind === 'line').length === 3, 'C03 hearts and rolling trail');
        const standing = bounds(draw(id));
        const cycle = Array.from({ length: 49 }, (_, i) => i * specialCycleMs.pandaroux / 48);
        for (const t of cycle) {
            const b = bounds(draw(id, 'face', 'joie', 'special', t).filter(p => !p.effect));
            check(b.width / b.height >= 0.85 && b.width / b.height <= 1.15, 'C03 curled ball nearly circular');
            check(b.width < standing.width && b.height < standing.height, 'C03 ball smaller than standing');
        }
        const centers = cycle.map(t => draw(id, 'face', 'joie', 'special', t)[0]).flatMap(p => p?.kind === 'circle' ? [p] : []);
        check(span(centers.map(p => p.x)) > 30, 'C03 rolling displacement');
        const rotations = cycle.map(t => { const p = draw(id, 'face', 'joie', 'special', t)[1]; return p?.kind === 'ellipse' ? p.rotation : 0; });
        check(span(rotations) >= Math.PI * 2 - 1e-9, 'C03 full rolling rotation');
        const ball = special.filter(p => !p.effect);
        check(ball.some(p => p.kind === 'ellipse' && p.fill === '#ffe6be' && p.rx === 22) && ball.filter(p => p.kind === 'ellipse' && p.fill === '#ffe6be' && p.rx === 8).length === 6, 'C03 tucked head and wrapped striped tail');
    }

}
export function persistence(read = selectedCharacter, write = selectCharacter): void {
    const data = new Map([['arcade-lab:bubble:v1', '{"best":123,"unlocked":3}'], ['arcade-lab:sound:v1', 'off'], ['bubble-lab:v1', 'legacy']]);
    const untouched = [...data];
    const calls: string[] = [];
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { calls.push(key); data.set(key, value); } };
    check(read(storage) === 'panda', 'C04 default panda');
    for (const id of ids) {
        write(id, storage);
        check(data.get('arcade-lab:character:v1') === id, 'C04 exact public key');
        check(read(storage) === id, 'C04 persisted selection');
    }
    data.set('arcade-lab:character:v1', 'unknown'); check(read(storage) === 'panda', 'C04 invalid selection');
    data.set('arcade-lab:character:v1', ''); check(read(storage) === 'panda', 'C04 empty selection');
    for (const [key, value] of untouched) check(data.get(key) === value, 'C04 other saves intact');
    check(data.size === 4 && calls.length === 5 && calls.every(key => key === 'arcade-lab:character:v1'), 'C04 only own key written');
    const broken = { getItem(): never { throw new Error('unavailable'); }, setItem(): never { throw new Error('unavailable'); } };
    write('dragon', broken); check(read(broken) === 'dragon', 'C04 unavailable storage retains session choice');
    const readOnly = { getItem: () => 'panda', setItem(): never { throw new Error('quota'); } };
    write('dragon', readOnly); check(read(readOnly) === 'dragon', 'C04 failed write overrides stale persisted choice in session');
    write('panda', undefined);
}

export function renderers(canvas = render2D, phaser = renderGraphics): void {
    const fixture: Primitive[] = [
        { kind: 'ellipse', x: 20, y: 30, rx: 12, ry: 6, rotation: Math.PI / 2, fill: '#123456', stroke: '#abcdef', width: 3 },
        { kind: 'path', commands: [{ op: 'M', p: [10, 20] }, { op: 'C', a: [30, 80], b: [70, 100], p: [90, 40] }], closed: false, fill: '', stroke: '#abcdef', width: 2 },
    ];
    for (const size of [32, 160, 480]) {
        const calls: { name: string; args: unknown[] }[] = [];
        const port = new Proxy({}, { get: (_, name) => (...args: unknown[]) => { calls.push({ name: String(name), args }); }, set: (_, name, value) => { calls.push({ name: String(name), args: [value] }); return true; } });
        canvas(port as CanvasRenderingContext2D, fixture, 13, 27, size);
        const has = (name: string, args: unknown[]) => calls.some(c => c.name === name && json(c.args) === json(args));
        check(has('translate', [13, 27]) && has('scale', [size / 240, size / 240]), 'C06 Canvas destination transform');
        check(has('ellipse', [20, 30, 12, 6, Math.PI / 2, 0, Math.PI * 2]), 'C06 Canvas rotated ellipse');
        check(has('moveTo', [10, 20]) && has('bezierCurveTo', [30, 80, 70, 100, 90, 40]), 'C06 Canvas curve controls');
        check(has('fillStyle', ['#123456']) && has('strokeStyle', ['#abcdef']), 'C06 Canvas paint');
        const vertices: { x: number; y: number }[][] = [], colors: number[] = [], widths: number[] = [];
        const graphics = { fillStyle(c: number) { colors.push(c); }, lineStyle(w: number, c: number) { widths.push(w); colors.push(c); }, fillPoints() {}, strokePoints(points: { x: number; y: number }[]) { vertices.push(points); } } as unknown as Parameters<typeof renderGraphics>[0];
        phaser(graphics, fixture, 13, 27, size);
        const near = (p: { x: number; y: number } | undefined, x: number, y: number): boolean => !!p && Math.abs(p.x - (13 + x * size / 240)) < 1e-8 && Math.abs(p.y - (27 + y * size / 240)) < 1e-8;
        check(json(widths) === json([Math.max(3 * size / 240, 0.75), Math.max(2 * size / 240, 0.75)]), 'C06 Phaser scaled stroke width');
        check(near(vertices[0]?.[0], 20, 42), 'C06 Phaser rotated ellipse and destination scale');
        const segments = Math.max(16, Math.ceil(size / 8)), t = 1 / segments, u = 1 - t;
        check(near(vertices[1]?.[0], 10, 20) && near(vertices[1]?.[1], u ** 3 * 10 + 3 * u * u * t * 30 + 3 * u * t * t * 70 + t ** 3 * 90, u ** 3 * 20 + 3 * u * u * t * 80 + 3 * u * t * t * 100 + t ** 3 * 40), 'C06 Phaser cubic control points');
        check(near(vertices[1]?.at(-1), 90, 40) && colors.includes(0x123456) && colors.includes(0xabcdef), 'C06 Phaser endpoints and colors');
    }

    for (const id of ids) {
        const list = drawList(id, 'face', 'joie', 'special', 300), before = json(list);
        for (const size of [32, 160, 480]) {
            const calls: { name: string; args: unknown[] }[] = [];
            const port = new Proxy({}, {
                get: (_target, name) => (...args: unknown[]) => { calls.push({ name: String(name), args }); },
                set: () => true,
            });
            canvas(port as CanvasRenderingContext2D, list, 3, 5, size);
            check(calls[0]?.name === 'save' && calls.at(-1)?.name === 'restore', 'C06 balanced state');
            check(calls.filter(c => c.name === 'beginPath').length === list.length, 'C06 every primitive rendered');
            check(json(calls.find(c => c.name === 'scale')?.args) === json([size / 240, size / 240]), 'C06 destination resolution');
            let vertices = 0, fills = 0, strokes = 0;
            const graphics = {
                fillStyle() {}, lineStyle() {},
                fillPoints(points: { x: number; y: number }[]) { fills++; vertices += points.length; check(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), 'C06 finite graphics'); },
                strokePoints() { strokes++; },
            } as unknown as Parameters<typeof renderGraphics>[0];
            phaser(graphics, list, 3, 5, size);
            check(fills === list.filter(p => p.fill).length && strokes === list.filter(p => p.width > 0).length, 'C06 matching paint count');
            check(vertices > 100, 'C06 vector geometry');
            check(json(list) === before, 'C06 renderers leave list intact');
        }
    }
}
