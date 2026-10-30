/** Original rounded cast. Coordinates use a 240 × 240 stage; array order is paint order. */
export const ids = ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'] as const;
export type CharacterId = typeof ids[number];
export const poses = ['face', 'profil', 'dos'] as const;
export const expressions = ['joie', 'surprise', 'concentre', 'triste', 'dodo'] as const;
export const animations = ['repos', 'marche', 'saut', 'celebration', 'special'] as const;
export type Pose = typeof poses[number];
export type Expression = typeof expressions[number];
export type Animation = typeof animations[number];
export const characters = {
    panda: { fr: 'Panda glouton', en: 'Hungry panda', accent: '#35964c', coat: '#fff6e7' },
    pandaroux: { fr: 'Panda roux joueur et câlin', en: 'Playful red panda', accent: '#ed8b25', coat: '#df7133' },
    dragon: { fr: 'Dragon assidu', en: 'Studious dragon', accent: '#e83e42', coat: '#ed4d4c' },
    singe: { fr: 'Singe en tutu', en: 'Tutu monkey', accent: '#ec79ac', coat: '#a36a49' },
    licorne: { fr: 'Licorne joueuse', en: 'Playful unicorn', accent: '#9255d5', coat: '#fff9f2' },
} as const;
export type Point = readonly [number, number];
export type Command = { op: 'M' | 'L'; p: Point } | { op: 'C'; a: Point; b: Point; p: Point };
interface Paint { effect?: boolean; fill: string; stroke: string; width: number }
export type Primitive = Paint & (
    { kind: 'ellipse'; x: number; y: number; rx: number; ry: number; rotation: number }
    | { kind: 'circle'; x: number; y: number; r: number }
    | { kind: 'polygon'; points: Point[] }
    | { kind: 'line'; points: Point[] }
    | { kind: 'path'; commands: Command[]; closed: boolean }
);
const ink = '#49333c', cream = '#ffe6be', gold = '#efbd43', dark = '#49383e';
export const specialCycleMs = { singe: 1500, pandaroux: 1600 } as const;
const rainbow = ['#f18cbd', '#f4a153', '#f5d65d', '#72c88b', '#75bce4', '#ac87db'];

export function drawList(id: CharacterId, pose: Pose = 'face', expression: Expression = 'joie', anim: Animation = 'repos', t = 0, motion: 'full' | 'reduce' = 'full'): Primitive[] {
    const reduce = motion === 'reduce';
    const time = reduce || !Number.isFinite(t) ? 0 : t;
    const phase = time / 210;
    const wave = Math.sin(phase);
    const bounce = reduce ? 0 : anim === 'saut' ? -26 * Math.abs(Math.sin(time / 480)) : anim === 'marche' ? -4 * Math.abs(wave) : anim === 'celebration' ? -8 * Math.abs(wave) : -2 * Math.sin(time / 500);
    const lean = !reduce && anim === 'special' ? (id === 'pandaroux' || id === 'singe' ? time / specialCycleMs[id] * Math.PI * 2 : Math.sin(time / 300) * 0.08) : 0;
    const rolling = !reduce && anim === 'special' && id === 'pandaroux';
    const list: Primitive[] = [];
    const coat = characters[id].coat;
    const sheen = { panda: '#ffffff', pandaroux: '#f3a365', dragon: '#ff8980', singe: '#c18d65', licorne: '#ffffff' }[id];
    const back = pose === 'dos', side = pose === 'profil';
    const point = (x: number, y: number): Point => {
        const dx = x - 120, dy = y - 135;
        return [120 + (rolling ? 18 * Math.sin(lean) : 0) + dx * Math.cos(lean) - dy * Math.sin(lean), 135 + bounce + dx * Math.sin(lean) + dy * Math.cos(lean)];
    };
    const paint = (fill: string, width = 3, stroke = ink): Paint => ({ fill, stroke, width });
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, rotation = 0, width = 3, stroke = ink): void => {
        const p = point(x, y); list.push({ kind: 'ellipse', x: p[0], y: p[1], rx, ry, rotation: rotation + lean, ...paint(fill, width, stroke) });
    };
    const circle = (x: number, y: number, r: number, fill: string, width = 0): void => {
        const p = point(x, y); list.push({ kind: 'circle', x: p[0], y: p[1], r, ...paint(fill, width) });
    };
    const polygon = (points: Point[], fill: string, width = 3): void => { list.push({ kind: 'polygon', points: points.map(p => point(...p)), ...paint(fill, width) }); };
    const line = (points: Point[], stroke: string, width = 3): void => { list.push({ kind: 'line', points: points.map(p => point(...p)), ...paint('', width, stroke) }); };
    const path = (start: Point, curves: [Point, Point, Point][], fill: string, width = 3, closed = true, stroke = ink): void => {
        list.push({ kind: 'path', commands: [{ op: 'M', p: point(...start) }, ...curves.map(([a, b, p]): Command => ({ op: 'C', a: point(...a), b: point(...b), p: point(...p) }))], closed, ...paint(fill, width, stroke) });
    };
    const star = (x: number, y: number, r: number, fill: string): void => {
        polygon(Array.from({ length: 10 }, (_, i): Point => { const a = i * Math.PI / 5 - Math.PI / 2, s = i % 2 ? r * 0.45 : r; return [x + Math.cos(a) * s, y + Math.sin(a) * s]; }), fill, 1.5);
    };
    if (rolling) {
        // Tucked head and paws sit inside a round coat; the striped tail wraps its rim.
        circle(120, 135, 45, coat, 3);
        ellipse(119, 137, 29, 28, sheen, 0, 0);
        ellipse(112, 126, 22, 19, cream, 0, 2);
        ellipse(103, 128, 4, 3, dark, 0, 0);
        ellipse(124, 128, 4, 3, dark, 0, 0);
        ellipse(113, 137, 5, 3, dark, 0, 0);
        ellipse(130, 151, 14, 10, dark, 0.5, 0);
        path([88, 113], [[[62, 159], [108, 187], [146, 165]], [[174, 149], [164, 114], [146, 108]]], '', 15, false, coat);
        for (let i = 0; i < 6; i++) {
            const a = 2.9 - i * 0.56;
            ellipse(120 + Math.cos(a) * 38, 135 + Math.sin(a) * 38, 8, 5, cream, a, 0);
        }
        const bodyEnd = list.length;
        // Trail and hearts stay in stage space while the ball turns and travels.
        for (let i = 0; i < 3; i++) list.push({ kind: 'line', points: [[39 + i * 5, 153 + i * 10], [69 + i * 5, 149 + i * 10]], ...paint('', 3, '#ed8b25') });
        for (let i = 0; i < 3; i++) {
            const x = 64 + i * 56, y = 45 - Math.sin(time / 300 + i) * 12;
            list.push({ kind: 'path', commands: [{ op: 'M', p: [x, y + 8] }, { op: 'C', a: [x - 23, y - 7], b: [x - 6, y - 18], p: [x, y - 6] }, { op: 'C', a: [x + 9, y - 20], b: [x + 22, y - 4], p: [x, y + 8] }], closed: true, ...paint('#f397ad', 1) });
        }
        for (const p of list.slice(bodyEnd)) p.effect = true;
        return list;
    }
    // Distinct rear silhouettes: striped plume, curled tail, wings, flowing mane.
    if (id === 'pandaroux') {
        path([148, 185], [[[215, 218], [235, 123], [195, 106]], [[177, 100], [161, 124], [184, 145]], [[202, 165], [164, 164], [148, 185]]], coat);
        for (let i = 0; i < 4; i++) ellipse(184 + i * 5, 171 - i * 15, 16 - i, 6, cream, -0.45 + i * 0.3, 0);
    }
    if (id === 'singe') path([151, 180], [[[223, 215], [224, 118], [197, 131]], [[172, 140], [204, 163], [206, 144]]], '', 12, false);
    if (id === 'dragon') {
        path([149, 181], [[[218, 210], [213, 139], [207, 141]], [[195, 166], [169, 155], [149, 181]]], coat);
        for (const x of [65, 153]) path([x, 136], [[[x - 27, 92], [x - 16, 85], [x + 7, 109]], [[x + 31, 84], [x + 40, 113], [x + 20, 147]]], '#88cdbb');
        for (let i = 0; i < 4; i++) polygon([[113 + i * 11, 68 + i * 12], [135 + i * 11, 66 + i * 12], [123 + i * 11, 46 + i * 12]], '#88cdbb');
    }
    if (id === 'licorne') for (let i = 5; i >= 0; i--) path([152 + i * 2, 155], [[[220 + i * 2, 145], [190 + i * 2, 215], [214, 210 - i * 4]]], rainbow[i] ?? cream, 9, false);
    // Plump body with curved paws and dancing feet.
    ellipse(120, 161, side ? 36 : id === 'panda' ? 54 : 43, id === 'panda' ? 49 : 44, coat);
    ellipse(99, 157, 14, 24, sheen, 0.2, 0);
    if (!back) ellipse(side ? 130 : 120, 166, 28, 31, id === 'panda' ? coat : cream, 0, 0);
    for (const [i, x] of [92, 146].entries()) {
        const step = !reduce && anim === 'marche' ? Math.sin(phase + i * Math.PI) * 9 : 0;
        ellipse(side ? x + 8 : x, 202 + step, 19, 12, id === 'panda' || id === 'pandaroux' ? dark : id === 'singe' ? '#ed83b5' : id === 'licorne' ? gold : coat, i ? -0.12 : 0.12);
    }
    if (id === 'singe') {
        const skirtStart = list.length;
        path([75, 172], [[[99, 184], [140, 183], [164, 172]], [[162, 189], [179, 191], [170, 197]], [[153, 203], [149, 191], [139, 199]], [[123, 211], [114, 196], [105, 201]], [[89, 208], [67, 199], [65, 192]], [[76, 183], [72, 179], [75, 172]]], '#f59bc7');
        for (const x of [85, 104, 125, 145]) line([[x, 181], [x - 4, 194]], '#c95a94', 2);
        if (!reduce && anim === 'special') {
            // Centrifugal flare widens the skirt around the rotating waist.
            const c = point(120, 180);
            for (const p of list.slice(skirtStart)) {
                const flare = (v: Point): Point => {
                    const dx = v[0] - c[0], dy = v[1] - c[1];
                    const radial = (dx * Math.cos(lean) + dy * Math.sin(lean)) * 0.35;
                    return [v[0] + radial * Math.cos(lean), v[1] + radial * Math.sin(lean)];
                };
                if (p.kind === 'path') for (const command of p.commands) { command.p = flare(command.p); if (command.op === 'C') { command.a = flare(command.a); command.b = flare(command.b); } }
                if (p.kind === 'line') p.points = p.points.map(flare);
            }
        }
    }
    for (const x of [73, 167]) ellipse(x, 150, 16, 27, id === 'panda' || id === 'pandaroux' ? dark : coat, x < 120 ? -0.4 : 0.4);
    // Ears are separate lobes, with pointed tufts for the red panda.
    if (id === 'pandaroux' || id === 'licorne') {
        for (const x of side ? [108] : [80, 159]) {
            path([x - 17, 73], [[[x - 19, 39], [x - 3, 31], [x, 39]], [[x + 24, 49], [x + 19, 66], [x + 16, 77]]], id === 'pandaroux' ? cream : coat);
            polygon([[x - 10, 63], [x - 4, 45], [x + 10, 65]], id === 'pandaroux' ? '#bd6036' : '#f2b8cc', 0);
        }
    } else if (id !== 'dragon') for (const x of side ? [103] : [76, 164]) {
        ellipse(x, 68, id === 'singe' ? 26 : 21, 23, id === 'panda' ? dark : coat);
        if (id === 'singe') ellipse(x, 69, 16, 16, '#eac0a9', 0, 0);
    }
    if (id === 'dragon') for (const x of [86, 153]) path([x - 9, 65], [[[x - 34, 24], [x + 15, 23], [x + 2, 38]], [[x - 5, 43], [x + 12, 48], [x + 10, 64]]], gold);
    if (id === 'licorne') {
        for (let i = 5; i >= 0; i--) path([86 + i * 10, 65], [[[102 + i * 10, 42], [180 + i * 3, 73], [170 + i * 2, 143]]], rainbow[i] ?? cream, 12, false);
    }
    // Large pear-shaped head, cheek lobes and a soft forehead highlight.
    if (side) path([85, 83], [[[80, 43], [157, 41], [167, 83]], [[170, 100], [199, 100], [194, 116]], [[192, 141], [154, 145], [122, 138]], [[87, 136], [75, 111], [85, 83]]], coat);
    else path([66, 83], [[[65, 42], [171, 43], [177, 83]], [[194, 124], [159, 144], [121, 141]], [[79, 144], [48, 124], [66, 83]]], coat);
    path([81, 78], [[[87, 53], [119, 54], [129, 61]], [[111, 57], [94, 65], [81, 78]]], sheen, 0);
    if (back) {
        if (id === 'panda') ellipse(120, 143, 40, 13, dark, 0, 0);
        if (id === 'dragon') for (let i = 0; i < 5; i++) polygon([[113, 69 + i * 17], [128, 64 + i * 17], [126, 81 + i * 17]], '#88cdbb', 1);
        if (id === 'licorne') for (let i = 0; i < 6; i++) path([96 + i * 8, 58], [[[111 + i * 8, 85], [87 + i * 8, 101], [105 + i * 8, 140]]], rainbow[i] ?? cream, 8, false);
    } else {
        if (id === 'pandaroux') {
            path([67, 87], [[[84, 77], [94, 93], [107, 106]], [[120, 94], [131, 80], [176, 85]], [[181, 126], [149, 137], [121, 135]], [[91, 139], [60, 120], [67, 87]]], cream, 0);
            for (const x of [65, 166]) polygon([[x, 101], [x - 8, 113], [x + 9, 112], [x - 1, 121], [x + 17, 117]], coat, 0);
        }
        if (id === 'singe') {
            ellipse(102, 95, 27, 31, '#eac0a9', -0.2, 0); ellipse(139, 95, 27, 31, '#eac0a9', 0.2, 0);
            ellipse(121, 119, 39, 21, '#eac0a9', 0, 0);
        }
        if (id === 'dragon' || id === 'licorne') ellipse(side ? 153 : 128, 118, 32, 19, id === 'dragon' ? cream : '#ffe3df', 0, 2);
        const eyes = side ? [140] : [97, 145];
        for (const x of eyes) {
            if (id === 'panda') ellipse(x, 97, 20, 24, dark, x < 120 ? 0.35 : -0.35, 0);
            if (expression === 'dodo') { path([x - 10, 96], [[[x - 4, 103], [x + 5, 103], [x + 10, 95]]], '', 3, false); continue; }
            ellipse(x, 94, 12, expression === 'surprise' ? 19 : 16, '#fffdf4', 0, 2);
            ellipse(x + (side ? 3 : 1), expression === 'triste' ? 99 : 97, 7, 10, id === 'dragon' ? '#d8a129' : id === 'licorne' ? '#4d9ed4' : '#6b4d3b', 0, 0);
            ellipse(x + 2, 98, 4, 7, dark, 0, 0); circle(x - 2, 90, 3.7, '#ffffff'); circle(x + 5, 98, 1.8, '#ffffff');
            if (expression === 'concentre') line([[x - 12, 78], [x + 9, 84]], ink, 4);
            if (expression === 'triste') line([[x - 10, 79 + (x < 120 ? 6 : 0)], [x + 10, 79 + (x < 120 ? 0 : 6)]], ink, 3);
        }
        ellipse(side ? 151 : 121, 113, 8, 5, dark, 0, 0);
        for (const x of side ? [164] : [79, 163]) ellipse(x, 117, 10, 5, '#f0a2a5', 0, 0);
        if (expression === 'surprise') ellipse(123, 128, 7, 9, dark, 0, 1);
        else if (expression === 'joie') {
            path([110, 122], [[[119, 126], [129, 126], [138, 121]], [[136, 141], [113, 141], [110, 122]]], dark, 2);
            ellipse(124, 133, 7, 3, '#ee8f9f', 0, 0);
        } else path([112, expression === 'triste' ? 131 : 126], [[[121, expression === 'triste' ? 121 : 130], [130, expression === 'triste' ? 121 : 130], [137, expression === 'triste' ? 131 : 126]]], '', 2.5, false);
    }
    if (id === 'licorne') {
        path([105, 61], [[[107, 47], [115, 17], [119, 19]], [[122, 31], [129, 49], [129, 61]]], gold);
        for (let i = 0; i < 3; i++) line([[110 + i * 2, 48 - i * 8], [126 - i * 2, 53 - i * 8]], '#a87a29', 2);
        if (!back) for (let i = 0; i < 6; i++) path([89 + i * 10, 67], [[[92 + i * 10, 48], [111 + i * 10, 53], [111 + i * 9, 74]]], rainbow[i] ?? cream, 7, false);
    }
    if (id === 'singe') {
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ellipse(164 + Math.cos(a) * 9, 66 + Math.sin(a) * 9, 8, 6, '#f28aba', a, 1); }
        circle(164, 66, 5, gold, 1);
    }
    if (!back && id === 'panda') {
        line([[70, 176], [58, 104]], '#579d50', 7);
        for (let i = 0; i < 3; i++) { line([[58 + i * 3, 116 + i * 18], [67 + i * 3, 114 + i * 18]], cream, 2); ellipse(49, 114 + i * 16, 15, 5, '#5fb868', 0.5, 1); }
        path([130, 169], [[[136, 149], [175, 149], [183, 169]]], '', 4, false);
        path([126, 170], [[[134, 183], [128, 197], [142, 198]], [[157, 203], [178, 199], [181, 191]], [[184, 182], [187, 176], [188, 170]]], '#c58f56');
        for (let i = 0; i < 4; i++) line([[136 + i * 12, 173], [140 + i * 10, 196]], '#8e613c', 1.5);
        for (const y of [180, 188]) line([[132, y], [183, y]], '#eed0a0', 2);
        for (const x of [140, 157]) { ellipse(x, 166, 11, 9, '#ffe6b5', 0, 1); line([[x - 3, 161], [x, 165], [x + 3, 161]], '#bd915e', 1); }
        circle(177, 166, 9, '#dc6a54', 1); ellipse(180, 155, 7, 3, '#599c54', -0.5, 1);
    }
    if (!back && id === 'dragon') {
        polygon([[87, 155], [119, 161], [152, 151], [156, 186], [122, 195], [86, 184]], '#5795b4');
        path([90, 153], [[[102, 146], [111, 151], [121, 158]], [[130, 150], [143, 145], [151, 150]], [[152, 162], [151, 174], [152, 182]], [[141, 178], [130, 183], [122, 190]], [[111, 183], [101, 178], [89, 180]]], '#fff2d4', 2);
        line([[121, 158], [122, 188]], '#c69c69', 2);
        for (const y of [162, 170]) { line([[96, y], [113, y + 5]], '#bb9d7a', 1.5); line([[131, y + 4], [146, y - 2]], '#bb9d7a', 1.5); }
    }
    // Specials remain procedural, with no particles at all in reduced motion.
    const effectsStart = list.length;
    if (!reduce && (anim === 'special' || anim === 'celebration')) {
        if (id === 'panda') for (let i = 0; i < 10; i++) { const a = time / 260 + i * 0.8; ellipse(120 + Math.cos(a) * 91, 124 + Math.sin(a) * 65, 12, 4, '#65b85e', a, 1); }
        if (id === 'pandaroux') {
            for (let i = 0; i < 3; i++) path([28 + i * 7, 160 + i * 13], [[[43, 143 + i * 10], [62, 145 + i * 10], [73, 157 + i * 10]]], '', 3, false);
            for (let i = 0; i < 3; i++) { const x = 64 + i * 56, y = 52 - Math.sin(time / 300 + i) * 17; path([x, y + 8], [[[x - 23, y - 7], [x - 6, y - 18], [x, y - 6]], [[x + 9, y - 20], [x + 22, y - 4], [x, y + 8]]], '#f397ad', 1); }
        }
        if (id === 'dragon') {
            ellipse(120, 214, 83, 14, '', 0, 2, '#69bce7');
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + time / 1200; polygon([[120 + Math.cos(a) * 75, 212 + Math.sin(a) * 11], [124 + Math.cos(a) * 75, 208 + Math.sin(a) * 11], [128 + Math.cos(a) * 75, 213 + Math.sin(a) * 11]], '#69bce7', 0); }
            if (anim === 'special') path([154, 121], [[[177, 97], [187, 128], [213, 89 + wave * 8]], [[210, 116], [234, 126], [218, 141]], [[195, 151], [177, 132], [154, 121]]], '#f5a243', 2);
        }
        if (id === 'singe') { ellipse(120, 184, 94, 17, '', 0, 3, '#f18cbd'); for (let i = 0; i < 5; i++) { const a = i * 1.3 + time / 400; star(120 + Math.cos(a) * 91, 130 + Math.sin(a) * 65, 9, gold); } }
        if (id === 'licorne') {
            for (let i = 0; i < 6; i++) path([24, 170 + i * 5], [[[66, 75 + wave * 6 + i * 6], [177, 35 + i * 7], [215, 74 + i * 5]]], rainbow[i] ?? cream, 4, false);
            star(211, 70 + wave * 12, 16, '#ffda60');
        }
    }
    for (const p of list.slice(effectsStart)) p.effect = true;
    return list;
}

/** Stable registry order, independent of the current selection. */
export function others(id: CharacterId): CharacterId[] { return ids.filter(other => other !== id); }
