import type { Objective } from '../../engines/gourmandises/levels';
import type { State, Tool } from '../../engines/gourmandises/engine';
import { drawPiece } from './thumbnail';

export const WORLDS = [
    'Jardin gourmand', 'Verger étoilé', 'Bois des caisses', 'Rivière des gouttes',
    'Montagne glacée', 'Palais givré', 'Château chocolat', 'Prairie des fleurs',
    'Canyon des flèches', 'Portes arc-en-ciel', 'Îles suspendues', 'Atelier de Tutu',
    'Ruche dorée', 'Fort des cadenas', 'Jardin des nuages',
] as const;
export function boardLayout(width: number, height: number) {
    const unit = Math.min(332 / width, 400 / height);
    return { x: (360 - unit * width) / 2, y: 194 + (400 - unit * height) / 2,
        unit, width: unit * width, height: unit * height };
}
export function presentation(s: State, armed: Tool | null) {
    return {
        world: Math.floor(s.level / 20),
        stars: s.score >= 3000 ? 3 : s.score >= 1500 ? 2 : s.score > 0 ? 1 : 0,
        moves: s.mode === 'discovery' ? '∞' : String(Math.max(0, s.budget - s.moves)),
        movesColor: s.mode === 'arcade' && s.budget - s.moves < 5 ? '#ff9c36' : '#ff5ba7',
        objectives: s.objectives.map(o => ({ icon: o.kind === 'collect' ? o.color : o.kind, target: o.target })),
        tools: (['hammer', 'rocket', 'rainbow'] as const).map(tool => ({
            tool, count: s.tools[tool], disabled: s.tools[tool] <= 0 || s.status !== 'playing',
            armed: tool === armed && s.tools[tool] > 0 && s.status === 'playing',
        })),
    };
}
function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
}
export function card(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#fff5df'): void {
    c.fillStyle = color;
    c.strokeStyle = '#fffbea';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x, y, w, h, 14);
    c.fill();
    c.stroke();
}
/** Cached scenery: no animation, randomness or image resources. */
export function drawScenery(c: CanvasRenderingContext2D, world: number): void {
    const sky = c.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, ['#67d9ff', '#8776cd', '#55bba2', '#45cce8', '#6fa6d9', '#8784d1', '#e8af88', '#7cdef1', '#edb26e',
        '#9fd8ff', '#7ec3f5', '#d7a6e8'][world] ?? '#67d9ff');
    sky.addColorStop(1, '#eff7a0');
    c.fillStyle = sky;
    c.fillRect(0, 0, 360, 640);
    disc(c, 300, 52, 30, '#fff5b0');
    for (let i = 0; i < 6; i++) {
        disc(c, i * 78, 380 + i % 2 * 60, 150, i % 2 ? '#77c94e' : '#46af76');
    }
    if (world === 6) {
        // Chocolate ramparts, square towers and a flowing fountain.
        c.fillStyle = '#82503a';
        c.fillRect(0, 170, 360, 120);
        for (const x of [8, 300]) {
            card(c, x, 110, 52, 470, '#79452e');
            for (let y = 100; y < 560; y += 48) {
                c.fillStyle = '#a87048';
                c.fillRect(x + 4, y, 44, 7);
            }
            for (const dx of [0, 20, 40]) c.fillRect(x + dx, 90, 12, 30);
        }
        c.fillStyle = '#633725';
        c.beginPath();
        c.ellipse(180, 180, 64, 15, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#b4784f';
        c.lineWidth = 12;
        for (const dx of [-24, 0, 24]) {
            c.beginPath();
            c.moveTo(180, 110);
            c.quadraticCurveTo(180 + dx, 105, 180 + dx * 2, 175);
            c.stroke();
        }
        disc(c, 180, 112, 9, '#e7b67b');
    } else if (world === 7) {
        c.fillStyle = '#7cc855';
        c.fillRect(0, 190, 360, 450);
        for (let i = 0; i < 30; i++) {
            const x = i % 2 ? 10 + i % 3 * 13 : 324 + i % 3 * 10;
            const y = 200 + i * 14;
            c.strokeStyle = '#347e48';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(x, y + 15);
            c.lineTo(x, y);
            c.stroke();
            drawPiece(c, x, y, 9, 4);
        }
        for (const x of [85, 180, 275]) {
            card(c, x - 25, 157, 50, 17, '#438e4c');
            card(c, x - 8, 140, 16, 50, '#438e4c');
            drawPiece(c, x, 165, 12, 4);
        }
    } else if (world === 8) {
        c.fillStyle = '#dc984e';
        c.fillRect(0, 170, 360, 470);
        for (const x of [-25, 300]) {
            c.fillStyle = '#ba7041';
            c.beginPath();
            c.moveTo(x, 140);
            c.lineTo(x + 70, 200);
            c.lineTo(x + 90, 640);
            c.lineTo(x - 10, 640);
            c.fill();
            c.strokeStyle = '#e8b574';
            c.lineWidth = 5;
            for (let y = 230; y < 640; y += 55) {
                c.beginPath();
                c.moveTo(x, y);
                c.lineTo(x + 80, y + 16);
                c.stroke();
            }
        }
    } else if (world === 9) {
        // Rainbow arches stand behind the two boards, between soft clouds.
        for (const [cx, base, scale] of [[70, 330, 1], [300, 300, .8]] as const) {
            for (let i = 0; i < 6; i++) {
                c.strokeStyle = RAINBOW[i] ?? '#fff';
                c.lineWidth = 9 * scale;
                c.beginPath();
                c.arc(cx, base, (120 - i * 9) * scale, Math.PI, Math.PI * 2);
                c.stroke();
            }
        }
        for (const [x, y] of [[40, 330], [110, 336], [250, 300], [330, 304], [180, 600], [60, 610], [300, 615]] as const) {
            for (const dx of [-18, 0, 18]) disc(c, x + dx, y - (dx ? 0 : 8), 18, '#ffffff');
        }
    } else if (world === 10) {
        // Floating islands: grassy tops, rocky undersides, a waterfall into the void.
        for (const [x, y, w] of [[-10, 250, 90], [290, 210, 95], [20, 560, 80], [300, 590, 85]] as const) {
            c.fillStyle = '#9b6b45';
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + w, y);
            c.lineTo(x + w * .55, y + w * .7);
            c.closePath();
            c.fill();
            card(c, x - 4, y - 12, w + 8, 18, '#59b85a');
            c.strokeStyle = '#bff1ff';
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(x + w * .7, y + 4);
            c.lineTo(x + w * .72, y + 90);
            c.stroke();
        }
        for (const [x, y] of [[180, 150], [60, 420], [320, 430]] as const) {
            for (const dx of [-14, 0, 14]) disc(c, x + dx, y - (dx ? 0 : 6), 14, '#f4fbff');
        }
    } else if (world === 11) {
        // A toy workshop: plank wall, shelves of boxes and a hanging lamp.
        c.fillStyle = '#c9915e';
        c.fillRect(0, 150, 360, 490);
        c.strokeStyle = '#a8713f';
        c.lineWidth = 3;
        for (let x = 0; x < 360; x += 40) {
            c.beginPath();
            c.moveTo(x, 150);
            c.lineTo(x, 640);
            c.stroke();
        }
        for (const y of [250, 420, 590]) {
            card(c, -6, y, 70, 10, '#7a4a2a');
            card(c, 296, y, 70, 10, '#7a4a2a');
            for (const x of [4, 32, 304, 332]) card(c, x, y - 22, 22, 22, TOYS[(x + y) % 4] ?? '#ff8ab0');
        }
        c.strokeStyle = '#5b3a24';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(180, 0);
        c.lineTo(180, 40);
        c.stroke();
        disc(c, 180, 48, 14, '#ffe38a');
    } else if (world === 3) {
        // A winding river, pale pebbles and a bright waterfall.
        c.strokeStyle = '#218fcc';
        c.lineWidth = 100;
        c.beginPath();
        c.moveTo(65, 180);
        c.bezierCurveTo(320, 290, 35, 400, 240, 640);
        c.stroke();
        c.strokeStyle = '#a3f5ff';
        c.lineWidth = 7;
        for (let i = 0; i < 7; i++) {
            c.beginPath();
            c.moveTo(14 + i * 8, 150);
            c.quadraticCurveTo(8 + i * 9, 210, 30 + i * 8, 255);
            c.stroke();
        }
        for (let i = 0; i < 24; i++) {
            disc(c, i % 2 ? 18 + i % 3 * 8 : 330 + i % 3 * 6, 280 + i * 14, 9, i % 3 ? '#c5dce0' : '#8bb1b7');
        }
    } else if (world === 4) {
        // Snow caps and fir trees remain visible beside the board.
        for (const x of [-35, 95, 240]) {
            c.fillStyle = '#7a9ec3';
            c.beginPath();
            c.moveTo(x - 80, 360);
            c.lineTo(x + 65, 125);
            c.lineTo(x + 190, 360);
            c.fill();
            c.fillStyle = '#f3fbff';
            c.beginPath();
            c.moveTo(x + 20, 200);
            c.lineTo(x + 65, 125);
            c.lineTo(x + 108, 205);
            c.lineTo(x + 60, 184);
            c.fill();
        }
        c.fillStyle = '#edfaff';
        c.fillRect(0, 560, 360, 80);
        for (const x of [12, 38, 326, 350]) {
            c.fillStyle = '#427e87';
            c.fillRect(x - 3, 470, 6, 128);
            for (let tier = 0; tier < 4; tier++) {
                c.beginPath();
                c.moveTo(x, 420 + tier * 30);
                c.lineTo(x - 22, 480 + tier * 30);
                c.lineTo(x + 22, 480 + tier * 30);
                c.fill();
                c.strokeStyle = '#e5faff';
                c.stroke();
            }
        }
    } else if (world === 5) {
        // Faceted columns and hanging crystal chandeliers.
        c.fillStyle = '#a2d7ee';
        c.fillRect(0, 165, 360, 475);
        for (const x of [8, 42, 318, 352]) {
            card(c, x - 10, 185, 20, 420, '#cef7ff');
            card(c, x - 14, 180, 28, 14, '#90cae3');
            card(c, x - 14, 590, 28, 15, '#90cae3');
            c.fillStyle = '#ffffff99';
            c.fillRect(x - 4, 202, 3, 370);
        }
        for (const x of [252, 294, 336]) {
            c.strokeStyle = '#fff2b7';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, 95);
            c.moveTo(x - 16, 94);
            c.quadraticCurveTo(x, 100, x + 16, 94);
            c.stroke();
            for (const dx of [-10, 0, 10]) {
                drawPiece(c, x + dx, 99 + (dx === 0 ? 2 : 0), 3, 2);
            }
        }
    } else if (world === 0) {
        card(c, 5, 220, 74, 106, '#bb7942');
        c.fillStyle = '#a84b38';
        c.beginPath();
        c.moveTo(0, 224);
        c.lineTo(41, 177);
        c.lineTo(87, 224);
        c.fill();
        card(c, 20, 240, 25, 30, '#b4edff');
        for (let y = 280; y < 325; y += 12) {
            c.strokeStyle = '#e4ab63';
            c.beginPath();
            c.moveTo(6, y);
            c.lineTo(77, y);
            c.stroke();
        }
    } else {
        for (const x of [8, 62, 304, 352]) {
            c.fillStyle = '#966139';
            c.fillRect(x - 7, 100, 14, 440);
            for (let i = 0; i < 4; i++) disc(c, x + Math.sin(i * 3) * 23, 110 + i * 35, 44, i % 2 ? '#54b953' : '#25894e');
            if (world === 1) for (let i = 0; i < 5; i++) disc(c, x + Math.sin(i * 4) * 30, 110 + i * 26, 7, '#ffb64c');
        }
        if (world === 1) for (let i = 0; i < 15; i++) drawPiece(c, i * 27 % 360, 28 + i * 37 % 170, 4, 1);
        if (world === 2) {
            for (let i = 0; i < 12; i++) card(c, i * 32 - 10, 591 + Math.sin(i / 3) * 10, 30, 13, '#ca9250');
            card(c, 8, 540, 39, 40, '#a76d39');
            disc(c, 27, 540, 23, '#e6ba79');
        }
    }
    if (world >= 3) return;
    for (let i = 0; i < 36; i++) {
        const x = i * 67 % 360;
        const y = 485 + i * 43 % 155;
        c.fillStyle = '#368c45';
        c.fillRect(x, y, 2, 14);
        for (let j = 0; j < 5; j++) disc(c, x + Math.cos(j * 1.26) * 4, y + Math.sin(j * 1.26) * 4, 3, i % 2 ? '#fff4b6' : '#ff96c5');
        disc(c, x, y, 2, '#ffc64f');
    }
}
const RAINBOW = ['#ff638a', '#ffc44a', '#d9ed56', '#62da8d', '#57c8ff', '#b087fa'] as const;
const TOYS = ['#ff8ab0', '#7cc8ff', '#ffd35a', '#8be08f'] as const;
export function drawTool(c: CanvasRenderingContext2D, tool: Tool): void {
    c.clearRect(0, 0, 56, 56);
    if (tool === 'hammer') {
        c.save();
        c.translate(28, 27);
        c.rotate(0.65);
        card(c, -5, -4, 10, 28, '#bb7139');
        card(c, -18, -16, 36, 19, '#ffc66b');
        c.restore();
    } else if (tool === 'rocket') {
        c.fillStyle = '#ffcf42';
        c.beginPath();
        c.moveTo(18, 34);
        c.lineTo(28, 54);
        c.lineTo(38, 34);
        c.fill();
        c.fillStyle = '#f85887';
        c.beginPath();
        c.ellipse(28, 25, 13, 23, 0.45, 0, Math.PI * 2);
        c.fill();
        disc(c, 31, 19, 7, '#a3f2ff');
    } else {
        for (let i = 0; i < 6; i++) {
            c.strokeStyle = RAINBOW[i] ?? '#fff';
            c.lineWidth = 5;
            c.beginPath();
            c.arc(28, 32, 23 - i * 3, Math.PI, Math.PI * 2);
            c.stroke();
        }
        disc(c, 10, 36, 7, '#fff9e8');
        disc(c, 46, 36, 7, '#fff9e8');
    }
}

/** The gold rim and outlet arrow distinguish cargo from ordinary blue sweets. */
export function drawDrop(c: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    c.save();
    c.translate(x, y);
    c.fillStyle = '#eaa827';
    c.strokeStyle = '#fff2a4';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -radius);
    c.bezierCurveTo(-radius * 1.4, radius * 0.4, -radius * 0.7, radius, 0, radius);
    c.bezierCurveTo(radius * 0.7, radius, radius * 1.4, radius * 0.4, 0, -radius);
    c.fill();
    c.stroke();
    disc(c, -radius * 0.28, radius * 0.1, radius * 0.22, '#fff7cf');
    c.strokeStyle = '#885515';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, radius * 0.65);
    c.moveTo(-radius * 0.25, radius * 0.4);
    c.lineTo(0, radius * 0.65);
    c.lineTo(radius * 0.25, radius * 0.4);
    c.stroke();
    c.restore();
}
export function drawIce(c: CanvasRenderingContext2D, x: number, y: number, unit: number, layers: number): void {
    c.fillStyle = layers === 2 ? '#86d9ffa8' : '#b7f0ff55';
    c.fillRect(x + 2, y + 2, unit - 4, unit - 4);
    c.strokeStyle = '#f4ffff';
    c.lineWidth = layers === 2 ? 3 : 1;
    c.strokeRect(x + 4, y + 4, unit - 8, unit - 8);
    c.beginPath();
    if (layers === 2) {
        c.moveTo(x + 7, y + unit * 0.65);
        c.lineTo(x + unit * 0.65, y + 7);
        c.moveTo(x + 11, y + unit * 0.7);
        c.lineTo(x + unit * 0.7, y + 11);
    } else {
        c.moveTo(x + unit * 0.3, y + 4);
        c.lineTo(x + unit * 0.5, y + unit * 0.4);
        c.lineTo(x + unit * 0.35, y + unit * 0.6);
        c.lineTo(x + unit * 0.65, y + unit - 4);
        c.moveTo(x + unit * 0.5, y + unit * 0.4);
        c.lineTo(x + unit - 4, y + unit * 0.3);
    }
    c.stroke();
}

/** A paired portal mouth: same colour at both ends. The entry arrow points into
 * the ring at the bottom of its cell, the exit arrow out of the ring at the top. */
export const PORTAL_COLORS = ['#ff638a', '#ffb347', '#f2d43c', '#62da8d', '#57c8ff', '#7f8cff', '#b087fa', '#ff8ad8', '#3fcfc0'] as const;
export function drawPortal(c: CanvasRenderingContext2D, x: number, y: number, unit: number, hue: number, role: 'in' | 'out'): void {
    const cy = y + unit * (role === 'in' ? .84 : .16);
    c.save();
    c.strokeStyle = PORTAL_COLORS[hue % PORTAL_COLORS.length] ?? '#ff638a';
    c.lineWidth = Math.max(3, unit * .11);
    c.beginPath();
    c.ellipse(x + unit / 2, cy, unit * .4, unit * .12, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + unit * .4, cy - unit * .05);
    c.lineTo(x + unit * .5, cy + unit * .05);
    c.lineTo(x + unit * .6, cy - unit * .05);
    c.stroke();
    c.restore();
}
/** Workshop bomb: a plum ball whose two yellow stripes show the swept line. */
export function drawBomb(c: CanvasRenderingContext2D, x: number, y: number, unit: number, direction: 'row' | 'column'): void {
    const cx = x + unit / 2;
    const cy = y + unit / 2 + unit * .04;
    const r = unit * .32;
    card(c, x + 3, y + 3, unit - 6, unit - 6, '#e9d2ad');
    disc(c, cx, cy, r, '#6a3f8f');
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip('nonzero');
    c.fillStyle = '#ffd35a';
    for (const k of [-1, 1]) {
        if (direction === 'row') c.fillRect(cx - r, cy + k * r * .42 - r * .12, r * 2, r * .24);
        else c.fillRect(cx + k * r * .42 - r * .12, cy - r, r * .24, r * 2);
    }
    c.restore();
    disc(c, cx - r * .35, cy - r * .4, r * .18, '#ffffffaa');
    c.strokeStyle = '#8a5a2b';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + r * .45, cy - r * .85);
    c.quadraticCurveTo(cx + r * .9, cy - r * 1.3, cx + r * 1.1, cy - r * 1.05);
    c.stroke();
    disc(c, cx + r * 1.1, cy - r * 1.05, unit * .07, '#ff9c36');
}
/** Island strawberry: the gold ring of carried objects around an ordinary strawberry. */
export function drawFruitCargo(c: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    disc(c, x, y, radius * 1.2, '#eaa827');
    disc(c, x, y, radius * 1.02, '#fff2a4');
    drawPiece(c, x, y, radius * .9, 0);
}

/** The square divisions distinguish solid chocolate from the wooden crates. */
export function drawChocolate(c: CanvasRenderingContext2D, x: number, y: number, unit: number): void {
    card(c, x + 2, y + 2, unit - 4, unit - 4, '#653725');
    for (const dx of [0.14, 0.54]) for (const dy of [0.14, 0.54]) {
        c.fillStyle = '#a96d43';
        c.fillRect(x + dx * unit, y + dy * unit, unit * .3, unit * .3);
        c.fillStyle = '#d69b65';
        c.fillRect(x + dx * unit, y + dy * unit, unit * .25, unit * .045);
    }
}
export function drawHedge(c: CanvasRenderingContext2D, x: number, y: number, unit: number): void {
    for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        disc(c, x + unit * (.5 + Math.cos(angle) * .32), y + unit * (.5 + Math.sin(angle) * .32), unit * .16,
            i % 2 ? '#388047' : '#65ad4f');
    }
    drawPiece(c, x + unit / 2, y + unit / 2, unit * .18, 4);
}
export function drawBelt(c: CanvasRenderingContext2D, x: number, y: number, unit: number,
    direction: 'right' | 'left' | 'down' | 'up', phase: number): void {
    c.save();
    c.translate(x + unit / 2, y + unit / 2);
    const angle = direction === 'right' ? 0 : direction === 'left' ? Math.PI : direction === 'down' ? Math.PI / 2 : -Math.PI / 2;
    c.rotate(angle);
    c.beginPath();
    c.rect(-unit * .48, -unit * .46, unit * .96, unit * .92);
    c.clip();
    c.fillStyle = '#735c46';
    c.fillRect(-unit * .48, -unit * .46, unit * .96, unit * .92);
    c.strokeStyle = '#ffe59b99';
    c.lineWidth = Math.max(2, unit * .06);
    for (const offset of [-.28, .05]) {
        const dx = (offset + phase * .15) * unit;
        c.beginPath();
        c.moveTo(dx - unit * .1, -unit * .32);
        c.lineTo(dx + unit * .04, -unit * .2);
        c.lineTo(dx - unit * .1, -unit * .08);
        c.stroke();
    }
    c.restore();
}

/** Opaque cream and dark plum keep the label readable over every world. */
export const WORLD_RIBBON = { background: '#fff1d6', foreground: '#563749', x: 16, y: 98, width: 222, height: 27 } as const;
export const SCORE_STAR_RADIUS = 15;
export const CHANDELIER_BOTTOM = 104;

export function drawWorldRibbon(c: CanvasRenderingContext2D, world: number): void {
    const r = WORLD_RIBBON;
    c.save();
    c.textAlign = 'center';
    card(c, r.x, r.y, r.width, r.height, r.background);
    c.fillStyle = r.foreground;
    c.font = 'bold 14px system-ui';
    c.fillText(WORLDS[world] ?? WORLDS[0], r.x + r.width / 2, r.y + 18);
    c.restore();
}

export function drawScoreGauge(c: CanvasRenderingContext2D, stars: number, left = 88): void {
    for (let i = 0; i < 3; i++) {
        drawPiece(c, left + i * 38, 140, SCORE_STAR_RADIUS, 1, i < stars ? undefined : 'empty');
    }
}

/** Exhaustive objective renderer: text is reserved for labels and counters. */
export function drawObjective(c: CanvasRenderingContext2D, icon: number | Exclude<Objective['kind'], 'collect'>,
    x: number, y: number): void {
    if (typeof icon === 'number') drawPiece(c, x, y, 14, icon);
    else if (icon === 'score') drawPiece(c, x, y, 14, 1);
    else if (icon === 'ice') {
        card(c, x - 12, y - 12, 24, 24, '#78cbea');
        drawIce(c, x - 13, y - 13, 26, 2);
    } else if (icon === 'drop') drawDrop(c, x, y, 12);
    else if (icon === 'fruit') drawFruitCargo(c, x, y, 11);
    else if (icon === 'flower') drawHedge(c, x - 13, y - 13, 26);
    else if (icon === 'chocolate') drawChocolate(c, x - 12, y - 12, 24);
    else {
        card(c, x - 12, y - 12, 24, 24, '#bd7b3d');
        c.strokeStyle = '#704322';
        c.lineWidth = 2;
        c.strokeRect(x - 8, y - 8, 16, 16);
        c.beginPath();
        c.moveTo(x - 8, y - 8);
        c.lineTo(x + 8, y + 8);
        c.moveTo(x + 8, y - 8);
        c.lineTo(x - 8, y + 8);
        c.stroke();
    }
}
