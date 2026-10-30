import { drawList, ids, type CharacterId, type Expression, type Point, type Primitive } from './model';

export const vehicleViews = ['avant', 'arriere', 'gauche', 'droite', 'dessus'] as const;
export type VehicleView = typeof vehicleViews[number];
export const launcherViews = ['face', 'dos', 'gauche', 'droite', 'tir'] as const;
export type LauncherView = typeof launcherViews[number];
export type Emblem = 'bambou' | 'bouclier' | 'coeur' | 'feu' | 'banane' | 'arc-en-ciel' | 'etoile' | 'bao' | 'feuille';
export const liveries = {
    panda: { name: 'Bolide Bambou', body: '#409f36', light: '#b8e866', trim: '#edbb45', motif: 'bambou', boost: 'bao', trap: 'bambou', shield: 'bouclier', joker: 'Pluie de bao', launcher: 'Canon Bambou' },
    pandaroux: { name: 'Chariot Feuille', body: '#d84326', light: '#ff9d3e', trim: '#ffd15a', motif: 'feuille', boost: 'coeur', trap: 'feuille', shield: 'coeur', joker: 'Feuilles tourbillonnantes', launcher: 'Lance-feuilles' },
    dragon: { name: 'Drakart', body: '#d92d29', light: '#ff733b', trim: '#ffcd45', motif: 'feu', boost: 'feu', trap: 'feu', shield: 'bouclier', joker: 'Explosion draconique', launcher: 'Canon Dragon' },
    singe: { name: 'Carrosse Tutu', body: '#df3897', light: '#fface0', trim: '#ffd358', motif: 'coeur', boost: 'coeur', trap: 'banane', shield: 'coeur', joker: 'Danse des bananes', launcher: 'Lanceur Tutu' },
    licorne: { name: "L’Étoilade", body: '#fff4ef', light: '#a4e8ff', trim: '#f9c84e', motif: 'etoile', boost: 'arc-en-ciel', trap: 'etoile', shield: 'arc-en-ciel', joker: 'Arc-en-ciel magique', launcher: 'Canon Étoilé' },
} as const satisfies Record<CharacterId, { name: string; body: string; light: string; trim: string; motif: Emblem; boost: Emblem; trap: Emblem; shield: Emblem; joker: string; launcher: string }>;
export function bonusEmblem(id: CharacterId, item: 'turbo' | 'ressort' | 'flaque' | 'bulle'): Emblem {
    const l = liveries[id];
    return item === 'turbo' ? l.boost : item === 'ressort' ? l.motif : item === 'flaque' ? l.trap : l.shield;
}
const ink = '#342539', white = '#ffffff', gold = '#ffcd45';
const rainbow = ['#ff579c', '#ffa147', '#ffe466', '#70df85', '#63cfff', '#ab80ff'];

class Pen {
    list: Primitive[] = [];
    ellipse(x: number, y: number, rx: number, ry: number, fill: string, width = 3, stroke = ink, rotation = 0): void {
        this.list.push({ kind: 'ellipse', x, y, rx, ry, fill, width, stroke, rotation });
    }
    poly(points: Point[], fill: string, width = 3, stroke = ink): void { this.list.push({ kind: 'polygon', points, fill, width, stroke }); }
    line(points: Point[], stroke: string, width = 3): void { this.list.push({ kind: 'line', points, fill: '', width, stroke }); }
    star(x: number, y: number, r: number, fill = gold): void {
        this.poly(Array.from({ length: 10 }, (_, i): Point => { const a = i * Math.PI / 5 - Math.PI / 2, s = i % 2 ? r * .45 : r; return [x + Math.cos(a) * s, y + Math.sin(a) * s]; }), fill, 2);
    }
    heart(x: number, y: number, r: number, fill = '#ff69b8'): void {
        this.list.push({ kind: 'path', fill, stroke: ink, width: 2, closed: true, commands: [
            { op: 'M', p: [x, y + r] }, { op: 'C', a: [x - r * 2, y - r * .2], b: [x - r, y - r * 1.7], p: [x, y - r * .4] },
            { op: 'C', a: [x + r, y - r * 1.7], b: [x + r * 2, y - r * .2], p: [x, y + r] },
        ] });
    }
}
/** Affine copy keeps the source drawings immutable and the description entirely pure. */
function place(list: readonly Primitive[], x: number, y: number, scale: number, flip = false): Primitive[] {
    const point = (p: Point): Point => [x + (flip ? 240 - p[0] : p[0]) * scale, y + p[1] * scale];
    return list.map(p => {
        const paint = { ...p, width: p.width * scale };
        if (p.kind === 'polygon' || p.kind === 'line') return { ...paint, kind: p.kind, points: p.points.map(point) };
        if (p.kind === 'path') return { ...paint, kind: p.kind, commands: p.commands.map(c => c.op === 'C' ? { ...c, a: point(c.a), b: point(c.b), p: point(c.p) } : { ...c, p: point(c.p) }) } as Primitive;
        const q = point([p.x, p.y]);
        return p.kind === 'circle' ? { ...paint, kind: p.kind, x: q[0], y: q[1], r: p.r * scale } : { ...paint, kind: p.kind, x: q[0], y: q[1], rx: p.rx * scale, ry: p.ry * scale, rotation: flip ? -p.rotation : p.rotation };
    });
}

export function emblem(kind: Emblem): Primitive[] {
    const p = new Pen();
    if (kind === 'etoile') p.star(120, 120, 78);
    if (kind === 'coeur') p.heart(120, 114, 65);
    if (kind === 'feuille') {
        p.poly([[120, 205], [110, 154], [51, 166], [70, 127], [35, 86], [91, 98], [106, 37], [129, 88], [174, 51], [163, 110], [209, 109], [161, 151], [139, 157]], '#ff7939');
        p.line([[120, 193], [124, 94], [78, 126]], gold, 5);
    }
    if (kind === 'feu') {
        p.poly([[119, 211], [57, 181], [48, 126], [84, 147], [77, 83], [109, 107], [137, 28], [158, 109], [184, 88], [194, 161], [167, 198]], '#ff7832');
        p.poly([[121, 193], [88, 164], [111, 113], [126, 146], [149, 96], [159, 166]], '#fff16c', 0);
    }
    if (kind === 'bambou') {
        p.ellipse(112, 133, 62, 57, '#65ad39');
        p.line([[80, 167], [150, 81]], '#edce63', 19);
        for (let i = 0; i < 3; i++) p.line([[84 + i * 23, 139 - i * 28], [108 + i * 23, 159 - i * 28]], '#518f2b', 6);
        p.line([[130, 78], [149, 52]], ink, 5); p.star(155, 45, 16);
    }
    if (kind === 'bao') {
        p.ellipse(120, 135, 76, 61, '#fff1cd');
        for (const x of [91, 120, 149]) p.line([[x, 88], [120, 64], [126, 87]], '#c8975b', 5);
        for (const x of [95, 145]) { p.ellipse(x, 139, 12, 15, ink, 0); p.ellipse(x - 3, 133, 4, 5, white, 0); }
        p.line([[111, 163], [120, 168], [129, 163]], ink, 4);
    }
    if (kind === 'bouclier') {
        p.poly([[120, 30], [192, 61], [178, 147], [120, 208], [62, 147], [48, 61]], '#4bafff', 5, '#b9f8ff');
        p.star(120, 111, 43, '#d6fcff');
    }
    if (kind === 'banane') {
        p.list.push({ kind: 'path', fill: '#ffe052', stroke: ink, width: 4, closed: true, commands: [
            { op: 'M', p: [73, 43] }, { op: 'C', a: [99, 155], b: [145, 168], p: [193, 110] },
            { op: 'C', a: [179, 239], b: [42, 219], p: [73, 43] },
        ] }); p.line([[73, 45], [69, 31]], '#81633e', 10);
    }
    if (kind === 'arc-en-ciel') {
        for (const [i, color] of rainbow.entries()) {
            const r = 88 - i * 10;
            p.line(Array.from({ length: 17 }, (_, j): Point => [120 - Math.cos(j * Math.PI / 16) * r, 164 - Math.sin(j * Math.PI / 16) * r]), color, 12);
        }
        p.star(199, 158, 27);
    }
    return p.list;
}
function icon(p: Pen, kind: Emblem, x: number, y: number, size: number): void { p.list.push(...place(emblem(kind), x - size / 2, y - size / 2, size / 240)); }
function wheel(p: Pen, x: number, y: number, rx: number, ry: number, trim: string): void {
    p.ellipse(x, y, rx, ry, '#252839', 3, '#161a27');
    p.ellipse(x, y, rx * .58, ry * .65, trim, 2);
    p.ellipse(x - rx * .12, y - ry * .2, rx * .23, ry * .23, '#fff0b5', 0);
}
function wings(p: Pen, top: boolean): void {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.poly([[120 + s * 48, 133 + i * 12], [120 + s * (111 - i * 6), (top ? 98 : 119) + i * 16], [120 + s * 87, 160 + i * 8], [120 + s * 47, 163 + i * 7]], [white, '#b8e9ff', '#f2b8f6'][i] ?? white, 2);
}

export function vehicleDrawing(id: CharacterId, view: VehicleView | 'action', expression: Expression = 'joie'): Primitive[] {
    const p = new Pen(), l = liveries[id], top = view === 'dessus', side = view === 'gauche' || view === 'droite' || view === 'action', rear = view === 'arriere';
    p.ellipse(120, 191, 100, 17, '#243145', 0);
    if (id === 'licorne') wings(p, top);
    if (id === 'dragon') for (const s of [-1, 1]) {
        p.poly([[120 + s * 42, 103], [120 + s * 102, 46], [120 + s * 95, 126], [120 + s * 55, 159]], l.body, 3, l.trim);
        p.poly([[120 + s * 53, 81], [120 + s * 64, 34], [120 + s * 80, 91]], l.trim);
    }
    if (top) {
        for (const x of [40, 200]) for (const y of [72, 173]) wheel(p, x, y, 19, 32, l.trim);
        p.ellipse(120, 123, 69, 101, l.body, 5);
        p.ellipse(120, 71, 54, 38, l.light, 3, l.trim);
        p.ellipse(120, 143, 42, 43, '#403448', 4, l.trim);
        // The visible driver sits in the open cockpit; wheels and bonnet remain exposed.
        p.list.push(...place(drawList(id, 'face', expression, 'repos', 0, 'reduce'), 61, 79, .49));
        icon(p, l.motif, 120, 55, 49);
    } else {
        if (!rear) p.list.push(...place(drawList(id, side ? 'profil' : 'face', expression, 'repos', 0, 'reduce'), side ? 32 : 54, 0, .55));
        else p.list.push(...place(drawList(id, 'dos', expression, 'repos', 0, 'reduce'), 54, 0, .55));
        p.ellipse(120, 156, side ? 96 : 82, 42, l.body, 5);
        p.ellipse(133, 141, side ? 73 : 66, 23, l.light, 3, l.trim);
        if (side) {
            for (const x of [55, 187]) wheel(p, x, 172, 29, 32, l.trim);
            icon(p, l.motif, 126, 154, 62);
            p.ellipse(174, 131, 21, 9, '#fff6ba', 2);
        } else {
            for (const x of [40, 200]) wheel(p, x, 165, 23, 38, l.trim);
            icon(p, l.motif, 120, 152, 65);
            for (const x of [71, 169]) p.ellipse(x, 154, 11, 10, rear ? '#ff4655' : '#fff3a9', 2);
        }
    }
    if (id === 'panda') {
        for (const x of [64, 176]) { p.line([[x, top ? 50 : 136], [x, top ? 199 : 183]], '#9bd34e', 12); for (const y of [141, 165, 187]) p.line([[x - 7, y], [x + 7, y]], '#f0d260', 3); }
        p.line(top ? [[66, 207], [174, 207]] : [[56, 184], [180, 184]], '#a5d94d', 12);
        p.ellipse(120, top ? 204 : 117, 28, 13, '#ac783e', 3, '#e9c877');
        for (let i = 0; i < 3; i++) p.ellipse(102 + i * 17, top ? 200 : 110, 10, 10, ['#ffbc43', '#f05d48', '#b2d94d'][i] ?? gold, 2);
    }
    if (id === 'pandaroux') {
        for (const s of [-1, 1]) { p.line([[120 + s * 62, 135], [120 + s * 71, 182]], '#a86336', 9); icon(p, 'feuille', 120 + s * 70, top ? 188 : 121, 64); }
        p.line([[73, top ? 215 : 184], [170, top ? 215 : 184]], '#bf783d', 8);
    }
    if (id === 'dragon') {
        for (const x of [83, 156]) { p.ellipse(x, top ? 205 : 184, 12, 12, '#34303d', 3, l.trim); icon(p, 'feu', x, top ? 218 : 196, 41); }
        if (side) p.poly([[174, 130], [190, 102], [196, 139]], l.trim);
    }
    if (id === 'singe') {
        for (let i = 0; i < 9; i++) { const a = i * Math.PI / 8; p.ellipse(120 + Math.cos(a) * 72, (top ? 142 : 161) + Math.sin(a) * 29, 16, 23, i % 2 ? '#ffb9e6' : '#f375c0', 2, '#b42a84', a); }
        icon(p, 'coeur', 120, top ? 48 : 151, 57);
        for (const s of [-1, 1]) p.ellipse(120 + s * 18, top ? 208 : 119, 22, 12, '#ff92d1', 2, ink, s * .4);
        p.ellipse(120, top ? 208 : 119, 8, 10, l.trim, 2);
    }
    if (id === 'licorne') {
        for (const [i, color] of rainbow.entries()) p.line([[84 + i * 13, top ? 193 : 177], [91 + i * 11, top ? 217 : 186]], color, 5);
        icon(p, 'etoile', top ? 120 : 140, top ? 49 : 148, 57);
    }
    if (view === 'action') {
        for (let i = 0; i < 3; i++) p.line([[8, 150 + i * 16], [29, 143 + i * 16]], l.trim, 5);
        icon(p, l.boost, 193, 61, 65);
    }
    return view === 'gauche' ? place(p.list, 0, 0, 1, true) : p.list;
}

export function launcherDrawing(id: CharacterId, view: LauncherView, expression: Expression = 'joie'): Primitive[] {
    const p = new Pen(), l = liveries[id], side = view === 'gauche' || view === 'droite', rear = view === 'dos';
    p.ellipse(120, 210, 101, 14, '#243145', 0);
    if (id === 'licorne') wings(p, false);
    p.list.push(...place(drawList(id, rear ? 'dos' : side ? 'profil' : 'face', expression, 'repos', 0, 'reduce'), 5, 7, .63));
    for (const x of [65, 174]) wheel(p, x, 190, 25, 25, l.trim);
    p.ellipse(126, 179, 75, 31, l.body, 4, l.trim);
    if (id === 'dragon') for (const s of [-1, 1]) p.poly([[120 + s * 52, 160], [120 + s * 91, 87], [120 + s * 89, 173]], l.body, 3, l.trim);
    if (id === 'singe') for (let i = 0; i < 7; i++) p.ellipse(65 + i * 18, 195, 14, 18, l.light, 2);
    // A foreshortened barrel has concentric gold bands and a large themed muzzle.
    p.poly(side ? [[86, 129], [197, 106], [213, 151], [99, 175]] : [[84, 158], [98, 98], [153, 98], [177, 158]], l.body, 4);
    for (let i = 0; i < 3; i++) {
        if (side) p.line([[121 + i * 28, 123 - i * 5], [133 + i * 28, 165 - i * 5]], l.trim, 9);
        else p.ellipse(128, 150 - i * 17, 44 - i * 5, 16, l.trim, 3);
    }
    if (!rear) {
        p.ellipse(side ? 203 : 128, side ? 128 : 101, side ? 21 : 34, side ? 29 : 24, '#263145', 5, l.trim);
        icon(p, l.motif, side ? 203 : 128, side ? 128 : 101, 49);
    } else { p.ellipse(128, 165, 37, 27, l.light, 3); icon(p, l.motif, 128, 165, 42); }
    if (id === 'panda') for (const x of [65, 177]) { p.line([[x, 163], [x + 7, 199]], '#9fce46', 10); p.line([[x - 5, 177], [x + 10, 175]], '#f5d572', 3); }
    if (id === 'pandaroux') for (const x of [62, 184]) icon(p, 'feuille', x, 169, 43);
    if (id === 'singe') { for (const s of [-1, 1]) p.ellipse(128 + s * 19, 174, 23, 13, '#ff98d6', 2, ink, s * .4); p.heart(128, 175, 12); }
    if (id === 'licorne') icon(p, 'etoile', 127, 184, 40);
    if (view === 'tir') { icon(p, l.motif, 167, 49, 68); for (const s of [-1, 1]) p.line([[128 + s * 31, 77], [128 + s * 46, 58]], l.trim, 5); }
    return view === 'gauche' ? place(p.list, 0, 0, 1, true) : p.list;
}

/** Separate articulated barrel: stage center is the engine's exact shot origin. */
export function aimBarrelDrawing(id: CharacterId): Primitive[] {
    const p = new Pen(), l = liveries[id];
    p.poly([[99, 129], [97, 53], [143, 53], [141, 129]], l.body, 4);
    for (const y of [62, 91, 119]) p.ellipse(120, y, 25, 8, l.trim, 3);
    p.ellipse(120, 49, 27, 12, '#243145', 5, l.trim);
    p.line([[107, 64], [109, 112]], l.light, 5);
    return p.list;
}

/** All six colors keep the same strong hue and identifying geometry for every companion. */
export const bubbleStyles = [
    { fill: '#37d879', pattern: 'leaf', symbol: 'feuille' },
    { fill: '#ff983e', pattern: 'sun', symbol: 'bao' },
    { fill: '#fa4d9f', pattern: 'heart', symbol: 'coeur' },
    { fill: '#8064ed', pattern: 'spiral', symbol: 'arc-en-ciel' },
    { fill: '#ffe052', pattern: 'star', symbol: 'etoile' },
    { fill: '#30c3f4', pattern: 'bolt', symbol: 'feu' },
] as const;
export const bubbleOutline = '#182335';
export function bubbleDrawing(id: CharacterId, color: number): Primitive[] {
    const style = bubbleStyles[color];
    if (!style) throw new RangeError('Couleur de bulle inconnue');
    const p = new Pen();
    p.ellipse(120, 125, 108, 108, style.fill, 7, bubbleOutline);
    p.ellipse(120, 120, 94, 94, '', 3, '#fff3df');
    p.ellipse(77, 62, 28, 13, white, 0, ink, -.5);
    // A character badge and an independent high-contrast color pattern coexist.
    const themes: Record<CharacterId, readonly Emblem[]> = {
        panda: ['bambou', 'bao', 'coeur', 'arc-en-ciel', 'feuille', 'bouclier'],
        pandaroux: ['feuille', 'bao', 'coeur', 'arc-en-ciel', 'etoile', 'feuille'],
        dragon: ['feu', 'feu', 'feu', 'bouclier', 'etoile', 'feu'],
        singe: ['coeur', 'banane', 'coeur', 'arc-en-ciel', 'etoile', 'banane'],
        licorne: ['etoile', 'arc-en-ciel', 'coeur', 'arc-en-ciel', 'etoile', 'bouclier'],
    };
    icon(p, themes[id][color] ?? style.symbol, 120, 110, 112);
    icon(p, liveries[id].motif, 166, 59, 48);
    if (style.pattern === 'leaf') p.poly([[94, 174], [120, 150], [146, 174], [120, 195]], bubbleOutline, 0);
    if (style.pattern === 'sun') { p.ellipse(120, 176, 12, 12, bubbleOutline, 0); for (const s of [-1, 1]) p.line([[120 + s * 26, 164], [120 + s * 20, 180]], bubbleOutline, 6); }
    if (style.pattern === 'heart') p.heart(120, 174, 18, bubbleOutline);
    if (style.pattern === 'spiral') p.line(Array.from({ length: 18 }, (_, i): Point => [120 + Math.cos(i * .5) * (3 + i), 176 + Math.sin(i * .5) * (3 + i)]), bubbleOutline, 6);
    if (style.pattern === 'star') p.star(120, 176, 23, bubbleOutline);
    if (style.pattern === 'bolt') p.poly([[123, 149], [101, 177], [119, 177], [112, 199], [142, 167], [125, 169]], bubbleOutline, 0);
    return p.list;
}

// Fixed, shared descriptions: no growing caches, no random artwork or per-frame generation.
export const arcadeArt = Object.fromEntries(ids.map(id => [id, {
    vehicles: Object.fromEntries([...vehicleViews, 'action' as const].map(view => [view, vehicleDrawing(id, view)])) as Record<VehicleView | 'action', Primitive[]>,
    launchers: Object.fromEntries(launcherViews.map(view => [view, launcherDrawing(id, view)])) as Record<LauncherView, Primitive[]>,
    bubbles: bubbleStyles.map((_, color) => bubbleDrawing(id, color)),
}])) as Record<CharacterId, { vehicles: Record<VehicleView | 'action', Primitive[]>; launchers: Record<LauncherView, Primitive[]>; bubbles: Primitive[][] }>;
export const emblems = Object.fromEntries((['bambou', 'bouclier', 'coeur', 'feu', 'banane', 'arc-en-ciel', 'etoile', 'bao', 'feuille'] as const).map(kind => [kind, emblem(kind)])) as Record<Emblem, Primitive[]>;


/** Pass 77: one authored vector vocabulary shared by the three action games. */
export const fighterViews = ['face', 'dos', 'gauche', 'droite', 'saut', 'tir', 'accroupi', 'marche', 'saut-gauche', 'accroupi-gauche'] as const;
export type FighterView = typeof fighterViews[number];
export const craftViews = ['face', 'dos', 'gauche', 'droite'] as const;
export type CraftView = typeof craftViews[number];
export const actionThemes = {
    panda: { primary: 'bambou', special: 'bao', vehicle: 'Char panda', power: 'Pluie de bao', sky: '#07392e' },
    pandaroux: { primary: 'feuille', special: 'feu', vehicle: 'Buggy roux', power: 'Tourbillon de feuilles', sky: '#431d20' },
    dragon: { primary: 'feu', special: 'feu', vehicle: 'Hélico dragon', power: 'Boule de feu', sky: '#092a50' },
    singe: { primary: 'banane', special: 'etoile', vehicle: 'Moto Tutu', power: 'Bananes glissantes', sky: '#361039' },
    licorne: { primary: 'arc-en-ciel', special: 'arc-en-ciel', vehicle: 'Jet licorne', power: 'Pluie d’étoiles', sky: '#141a51' },
} as const satisfies Record<CharacterId, { primary: Emblem; special: Emblem; vehicle: string; power: string; sky: string }>;

export function fighterDrawing(id: CharacterId, view: FighterView): Primitive[] {
    const mirrored = view === 'gauche' || view === 'saut-gauche' || view === 'accroupi-gauche';
    if (view === 'saut-gauche') view = 'saut';
    if (view === 'accroupi-gauche') view = 'accroupi';
    const p = new Pen(), l = liveries[id], rear = view === 'dos', crouch = view === 'accroupi';
    // The oversized backpack, aviator goggles and articulated weapon distinguish the runner.
    p.ellipse(73, 142, 37, 44, l.body, 4, l.trim);
    for (const x of [52, 69]) { p.line([[x, 113], [x, 172]], '#8cb74f', 12); p.line([[x - 7, 135], [x + 7, 135]], l.trim, 4); }
    p.list.push(...place(drawList(id, rear ? 'dos' : view === 'face' ? 'face' : 'profil', 'concentre', view === 'saut' ? 'saut' : view === 'marche' ? 'marche' : 'repos', view === 'marche' || view === 'saut' ? 240 : 0, 'full'), 13, crouch ? 56 : 12, crouch ? .71 : .86));
    p.line([[83, 120], [116, 171], [150, 150]], '#735035', 9);
    p.ellipse(121, crouch ? 104 : 62, 45, 13, '#986137', 3, l.trim);
    for (const x of [100, 137]) { p.ellipse(x, crouch ? 101 : 59, 18, 14, '#60d8e8', 4, l.trim); p.line([[x - 6, crouch ? 100 : 58], [x + 3, crouch ? 93 : 51]], white, 3); }
    if (!rear) {
        const y = crouch ? 161 : 141;
        p.ellipse(159, y + 13, 26, 16, l.light);
        if (id === 'licorne') {
            p.list.push({ kind: 'path', fill: '', stroke: l.trim, width: 9, closed: false, commands: [{ op: 'M', p: [199, y - 47] }, { op: 'C', a: [239, y - 14], b: [239, y + 27], p: [199, y + 52] }] });
            p.line([[199, y - 47], [216, y + 3], [199, y + 52]], '#c2ecff', 3); icon(p, 'etoile', 226, y + 2, 36);
        } else {
            p.poly([[141, y - 6], [218, y - 6], [218, y + 20], [141, y + 20]], l.body, 4);
            for (const x of [163, 191, 211]) p.line([[x, y - 8], [x, y + 22]], l.trim, 7);
            p.ellipse(218, y + 7, 10, 18, '#233344', 3, l.trim);
        }
        if (view === 'tir') { icon(p, actionThemes[id].primary, 217, 99, 45); p.line([[211, 118], [224, 112]], gold, 4); }
    }
    return mirrored ? place(p.list, 0, 0, 1, true) : p.list;
}

export function actionVehicleDrawing(id: CharacterId, view: CraftView): Primitive[] {
    if (id === 'pandaroux') return vehicleDrawing(id, view === 'face' ? 'avant' : view === 'dos' ? 'arriere' : view);
    const p = new Pen(), l = liveries[id], side = view === 'gauche' || view === 'droite', rear = view === 'dos';
    if (id === 'panda') {
        for (const x of side ? [72, 160] : [55, 185]) {
            p.ellipse(x, 173, side ? 51 : 28, 39, '#253b35', 5, l.trim);
            for (let i = 0; i < 4; i++) wheel(p, x - 25 + i * 17, 174, 8, 18, l.trim);
        }
        p.ellipse(120, 147, 92, 38, l.body, 5, l.trim);
        p.ellipse(112, 112, 52, 30, l.light, 4);
        p.line(side ? [[131, 110], [224, 106]] : [[120, 111], [120, 152]], '#9ac94b', 22);
        for (const x of side ? [165, 195, 220] : [120]) p.ellipse(x, side ? 108 : 148, 6, 13, l.trim, 3);
        icon(p, 'bao', 116, 153, 57);
    } else if (id === 'dragon') {
        for (const s of [-1, 1]) { p.line([[120 + s * 69, 164], [120 + s * 77, 195], [120 + s * 35, 195]], l.trim, 8); p.poly([[120 + s * 35, 112], [120 + s * 99, 76], [120 + s * 82, 146]], l.body, 4, l.trim); }
        p.ellipse(120, 145, 71, 39, l.body, 5, l.trim);
        p.ellipse(side ? 163 : 120, 144, 39, 26, '#6bdbea', 4, l.trim);
        p.line([[120, 100], [120, 55]], l.trim, 8); p.line([[27, 53], [216, 53]], '#c8eee4', 9); p.line([[42, 45], [201, 61]], '#756445', 4);
        p.poly([[68, 146], [23, 123], [24, 160], [73, 166]], l.body, 4, l.trim);
        for (let i = 0; i < 5; i++) p.poly([[146 + i * 12, 165], [153 + i * 12, 152], [159 + i * 12, 166]], white, 2);
        icon(p, 'feu', 104, 147, 49);
    } else if (id === 'singe') {
        for (const x of side ? [60, 188] : [79, 161]) wheel(p, x, 180, 30, 34, l.trim);
        p.poly([[57, 167], [90, 127], [167, 127], [197, 170], [158, 184], [95, 184]], l.body, 5, l.trim);
        p.line([[148, 131], [175, 98], [202, 100]], l.trim, 7); p.ellipse(121, 127, 34, 11, '#62344d');
        icon(p, 'coeur', 137, 158, 66); p.ellipse(181, 134, 15, 15, '#fff5b9', 3);
    } else {
        wings(p, true);
        p.ellipse(120, 144, 43, 64, l.body, 5, l.trim);
        p.ellipse(120, 115, 28, 31, '#71d9f6', 4, '#8d72d9');
        for (const s of [-1, 1]) { p.ellipse(120 + s * 57, 170, 17, 28, '#776bda', 4, l.trim); icon(p, 'arc-en-ciel', 120 + s * 57, 204, 44); }
        icon(p, 'etoile', 120, 160, 60);
    }
    p.list.push(...place(drawList(id, rear ? 'dos' : side ? 'profil' : 'face', 'joie', 'repos', 0, 'reduce'), 68, 30, .39));
    return view === 'gauche' ? place(p.list, 0, 0, 1, true) : p.list;
}

export function paddleDrawing(id: CharacterId, view: CraftView): Primitive[] {
    const p = new Pen(), l = liveries[id], rear = view === 'dos', side = view === 'gauche' || view === 'droite';
    if (id === 'licorne') wings(p, true);
    if (id === 'dragon') for (const s of [-1, 1]) p.poly([[120 + s * 55, 132], [120 + s * 100, 68], [120 + s * 111, 140], [120 + s * 65, 164]], '#dd3b36', 4, l.trim);
    p.ellipse(120, 138, side ? 77 : 106, 31, l.body, 5, l.trim);
    p.ellipse(120, 124, side ? 67 : 94, 16, l.light, 2, l.trim);
    for (const x of [35, 205]) { p.ellipse(x, 136, 17, 29, l.body, 4, l.trim); p.ellipse(x, 129, 8, 15, l.light, 0); }
    if (id === 'panda') for (const x of [50, 75, 167, 192]) { p.line([[x, 112], [x, 163]], '#83c544', 10); p.line([[x - 6, 137], [x + 6, 137]], '#f8de72', 4); }
    if (id === 'pandaroux') for (const x of [39, 202]) icon(p, 'feuille', x, 131, 61);
    if (id === 'singe') { for (let i = 0; i < 8; i++) p.poly([[57 + i * 17, 129], [47 + i * 19, 166], [72 + i * 17, 166]], i % 2 ? '#fface0' : '#ef66b7', 2); p.heart(120, 105, 22); }
    if (!rear && id === 'dragon') p.list.push(...place(drawList(id, 'face', 'concentre', 'repos', 0, 'reduce'), 70, 66, .42));
    else icon(p, rear ? l.motif : id === 'panda' ? 'bao' : l.motif, 120, 135, 70);
    if (!rear && id === 'panda') p.list.push(...place(ballDrawing(id), 82, 97, .32));
    if (rear) for (const x of [67, 173]) { p.ellipse(x, 136, 22, 16, '#313646', 4, l.trim); p.line([[x - 11, 130], [x + 11, 130]], '#ff9d6c', 4); p.line([[x - 11, 141], [x + 11, 141]], '#ff9d6c', 4); }
    return view === 'gauche' ? place(p.list, 0, 0, 1, true) : p.list;
}

export function shipDrawing(id: CharacterId, view: CraftView): Primitive[] {
    const p = new Pen(), l = liveries[id], rear = view === 'dos', side = view === 'gauche' || view === 'droite';
    if (id === 'licorne') wings(p, true);
    for (const s of [-1, 1]) {
        p.poly([[120 + s * 23, 96], [120 + s * (side ? 61 : 94), 161], [120 + s * 76, 184], [120 + s * 22, 160]], l.body, 4, l.trim);
        p.ellipse(120 + s * 59, 169, 17, 27, l.body, 4, l.trim);
        p.ellipse(120 + s * 59, rear ? 169 : 194, 10, 7, '#7debff', 2);
        if (id === 'dragon') p.poly([[120 + s * 35, 100], [120 + s * 105, 61], [120 + s * 90, 143]], '#ec4938', 4, l.trim);
    }
    p.ellipse(120, 128, 37, 78, l.body, 5, l.trim);
    p.ellipse(120, 104, 25, 34, rear ? '#37435b' : '#53bfdc', 4, l.trim);
    if (rear) for (const y of [88, 104, 120]) p.line([[103, y], [137, y]], l.light, 5);
    else p.ellipse(112, 94, 7, 14, '#d9fcff', 0);
    p.poly([[110, 61], [120, 26], [131, 61]], l.trim, 3);
    if (id === 'singe') for (let i = 0; i < 7; i++) p.ellipse(68 + i * 17, 159, 16, 20, i % 2 ? l.light : l.body, 2);
    if (id === 'panda') for (const x of [66, 174]) { p.line([[x, 115], [x, 166]], '#83c544', 14); p.line([[x - 8, 138], [x + 8, 138]], l.trim, 5); }
    if (id === 'pandaroux') for (const x of [58, 181]) icon(p, 'feuille', x, 146, 56);
    icon(p, rear ? l.motif : id === 'singe' ? 'coeur' : actionThemes[id].primary, 120, 157, 58);
    if (!rear) {
        // Open canopy: face, ears, eyes and species features remain readable at game scale.
        if (id === 'panda' || id === 'singe') for (const x of [99, 141]) p.ellipse(x, 85, 9, 10, id === 'panda' ? '#182e2b' : '#ad693e', 2);
        if (id === 'pandaroux') for (const x of [100, 140]) p.poly([[x - 11, 87], [x - 6, 64], [x + 11, 87]], '#e96324', 2);
        p.ellipse(120, 100, 24, 23, id === 'dragon' ? '#f2482d' : id === 'pandaroux' ? '#f38b33' : id === 'singe' ? '#a56a3e' : '#fff7e5', 2);
        if (id === 'singe') p.ellipse(120, 106, 19, 15, '#ffd5a4', 0);
        if (id === 'pandaroux') for (const x of [104, 136]) p.poly([[x - 10, 102], [x + 9, 97], [x + 6, 119]], '#fff5de', 0);
        for (const x of [109, 131]) {
            if (id === 'panda') p.ellipse(x, 99, 9, 11, '#182e2b', 0);
            p.ellipse(x, 100, 5, 7, '#fffdf5', 0); p.ellipse(x + 1, 102, 3, 4, '#162d43', 0); p.ellipse(x - 1, 98, 1.5, 2, '#ffffff', 0);
        }
        p.ellipse(120, 113, 4, 3, '#342539', 0);
        if (id === 'dragon' || id === 'licorne') for (const x of id === 'dragon' ? [101, 139] : [120]) p.poly([[x - 5, 82], [x, 57], [x + 6, 83]], '#ffe362', 2);
        p.line([[105, 121], [120, 126], [135, 121]], '#9deaff', 3);
    }
    if (id === 'pandaroux') for (const side of [-1, 1]) p.poly([[120 + side * 30, 117], [120 + side * 104, 88], [120 + side * 83, 124], [120 + side * 108, 138], [120 + side * 52, 166]], '#f76b21', 3, '#ffd35c');
    if (id === 'dragon') for (const side of [-1, 1]) p.poly([[120 + side * 28, 113], [120 + side * 107, 67], [120 + side * 89, 105], [120 + side * 93, 139], [120 + side * 64, 124], [120 + side * 42, 149]], '#d92d29', 3, '#ffcf45');
    if (id === 'panda') for (const x of [65, 175]) p.ellipse(x, 155, 18, 25, '#fff8e7', 3, '#55ce4d');
    return view === 'gauche'  ? place(p.list, 0, 0, 1, true) : p.list;
}

/** The ball stays centered on the engine circle; only its painted silhouette changes. */
export function ballDrawing(id: CharacterId): Primitive[] {
    const p = new Pen(), l = liveries[id];
    if (id === 'panda' || id === 'pandaroux') {
        for (const x of [57, 183]) p.ellipse(x, 65, 29, 32, id === 'panda' ? '#26302f' : '#ca602e', 4);
        p.ellipse(120, 131, 88, 88, id === 'panda' ? '#fff4d7' : '#e7752b', 5);
        if (id === 'pandaroux') for (const x of [74, 166]) p.ellipse(x, 151, 36, 46, '#fff4d7', 0);
        for (const x of [84, 156]) {
            p.ellipse(x, 119, 23, 30, '#2a2b32', 0, ink, x < 120 ? .3 : -.3);
            p.ellipse(x + 4, 115, 9, 13, white, 0); p.ellipse(x + 7, 119, 5, 8, '#2a2b32', 0);
        }
        p.ellipse(120, 153, 13, 9, ink, 0); p.line([[108, 175], [120, 182], [133, 175]], ink, 5);
    } else {
        p.ellipse(120, 120, 94, 94, id === 'dragon' ? '#f77a29' : id === 'singe' ? '#f252bc' : '#6d7fe8', 5, l.trim);
        if (id === 'licorne') for (let i = 0; i < 6; i++) p.line([[58 + i * 19, 173], [83 + i * 15, 66]], rainbow[i] ?? white, 12);
        icon(p, id === 'dragon' ? 'feu' : id === 'singe' ? 'coeur' : 'etoile', 120, 123, 138);
        p.ellipse(79, 66, 24, 12, white, 0, ink, -.5);
    }
    return p.list;
}

export const actionArt = Object.fromEntries(ids.map(id => [id, {
    fighters: Object.fromEntries(fighterViews.map(view => [view, fighterDrawing(id, view)])),
    vehicles: Object.fromEntries(craftViews.map(view => [view, actionVehicleDrawing(id, view)])),
    paddles: Object.fromEntries(craftViews.map(view => [view, paddleDrawing(id, view)])),
    ships: Object.fromEntries(craftViews.map(view => [view, shipDrawing(id, view)])),
}])) as Record<CharacterId, { fighters: Record<FighterView, Primitive[]>; vehicles: Record<CraftView, Primitive[]>; paddles: Record<CraftView, Primitive[]>; ships: Record<CraftView, Primitive[]> }>;
