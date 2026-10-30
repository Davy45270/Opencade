import { createDemo } from '../../engines/gourmandises/demo';
import { type Thumbnail } from '../thumbnail';
export { createDemo };
export const COLORS = ['#f85a79', '#ffd75e', '#64cde9', '#70ce8c', '#b58af2', '#f48bc4', '#ffac59'];
/** Original glossy pieces, with separate silhouettes as well as colours. */
export function drawPiece(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, special?: string): void {
    c.save();
    c.translate(x, y);
    c.fillStyle = special === 'color' ? '#302344' : special === 'empty' ? '#aaa4a4' : COLORS[color] ?? required(COLORS[0]);
    if (special !== 'empty' && special !== 'color') {
        const gloss = c.createLinearGradient(0, -r, 0, r);
        gloss.addColorStop(0, '#fff4ca');
        gloss.addColorStop(0.25, COLORS[color] ?? required(COLORS[0]));
        gloss.addColorStop(1, ['#cf254f', '#efa51e', '#249ece', '#2b9d56', '#9452d4', '#d94a9d', '#ed7c24'][color] ?? '#cf254f');
        c.fillStyle = gloss;
    }
    c.strokeStyle = '#fff4dc';
    c.lineWidth = 1.3;
    if (special === 'wrapped') {
        c.fillStyle = '#fff4c9';
        for (const side of [-1, 1]) {
            c.beginPath();
            c.moveTo(side * r * 0.65, 0);
            c.lineTo(side * r * 1.22, -r * 0.65);
            c.lineTo(side * r * 1.22, r * 0.65);
            c.closePath();
            c.fill();
            c.stroke();
        }
        c.fillStyle = COLORS[color] ?? required(COLORS[0]);
    }
    c.beginPath();
    if (special === 'color') c.arc(0, 0, r, 0, Math.PI * 2);
    else if (color === 0) {
        c.moveTo(0, r);
        c.bezierCurveTo(-r * 1.5, r * 0.1, -r, -r, 0, -r * 0.7);
        c.bezierCurveTo(r, -r, r * 1.5, r * 0.1, 0, r);
    } else if (color === 4) {
        for (let i = 0; i < 5; i++) {
            const angle = i * Math.PI * 2 / 5;
            c.moveTo(Math.cos(angle) * r * 0.5 + r * 0.5, Math.sin(angle) * r * 0.5);
            c.arc(Math.cos(angle) * r * 0.5, Math.sin(angle) * r * 0.5, r * 0.5, 0, Math.PI * 2);
        }
    } else if (color === 1) {
        for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI / 5 - Math.PI / 2;
            const radius = i % 2 ? r * 0.5 : r;
            c.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        c.closePath();
    } else if (color === 2 || color === 3) {
        c.moveTo(0, -r);
        c.bezierCurveTo(r * 1.5, r * 0.5, r * 0.5, r * 1.4, 0, r);
        c.bezierCurveTo(-r, r, -r, 0, 0, -r);
    } else if (color === 5) {
        c.moveTo(0, r);
        c.bezierCurveTo(-r * 2, 0, -r, -r * 1.7, 0, -r * 0.4);
        c.bezierCurveTo(r, -r * 1.7, r * 2, 0, 0, r);
    } else c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.6;
    c.beginPath();
    c.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    if (color === 0 && special !== 'color') {
        c.fillStyle = '#ffe9a0';
        for (let i = 0; i < 9; i++) {
            c.beginPath();
            c.ellipse((i % 3 - 1) * r * 0.42, (Math.floor(i / 3) - 1) * r * 0.42, r * 0.065, r * 0.11, 0.2, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = '#429c42';
        for (let i = 0; i < 5; i++) {
            c.save();
            c.translate(0, -r * 0.65);
            c.rotate((i - 2) * 0.7);
            c.beginPath();
            c.ellipse(0, -r * 0.18, r * 0.14, r * 0.4, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
        }
    }
    if (color === 4 && special !== 'color') {
        for (let i = 0; i < 5; i++) {
            c.beginPath();
            c.arc(Math.cos(i * 1.26) * r * 0.5, Math.sin(i * 1.26) * r * 0.5, r * 0.3, 0, Math.PI * 2);
            c.stroke();
        }
    }
    if (color === 3 && special !== 'color') {
        c.strokeStyle = '#268b4e';
        c.beginPath();
        c.moveTo(-r * 0.4, r * 0.65);
        c.lineTo(r * 0.25, -r * 0.6);
        c.stroke();
    }
    if (color === 6 && special !== 'color') {
        c.strokeStyle = '#ffe3a2';
        c.beginPath();
        c.arc(0, 0, r * 0.76, 0, Math.PI * 2);
        for (let i = 0; i < 8; i++) {
            c.moveTo(0, 0);
            c.lineTo(Math.cos(i * Math.PI / 4) * r * 0.75, Math.sin(i * Math.PI / 4) * r * 0.75);
        }
        c.stroke();
    }
    if (special && special !== 'empty') {
        c.strokeStyle = '#ffffff';
        c.lineWidth = 3;
        c.beginPath();
        if (special === 'row' || special === 'column') {
            for (let i = -1; i <= 1; i++) {
                if (special === 'row') {
                    c.moveTo(-r * 0.8, i * r * 0.4);
                    c.lineTo(r * 0.8, i * r * 0.4);
                } else {
                    c.moveTo(i * r * 0.4, -r * 0.8);
                    c.lineTo(i * r * 0.4, r * 0.8);
                }
            }
        } else if (special === 'wrapped') {
            c.strokeRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
            c.moveTo(-r, -r * 0.6);
            c.lineTo(r, r * 0.6);
            c.moveTo(-r, r * 0.6);
            c.lineTo(r, -r * 0.6);
            c.arc(0, 0, r * 0.24, 0, Math.PI * 2);
        }
        c.stroke();
        if (special === 'color') {
            for (let i = 0; i < 7; i++) {
                c.fillStyle = required(COLORS[i]);
                c.beginPath();
                c.arc(Math.cos(i) * r * 0.6, Math.sin(i) * r * 0.6, r * 0.2, 0, Math.PI * 2);
                c.fill();
            }
        }
    }
    c.restore();
}
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return {
        step: () => { demo.step(); },
        get restarts() { return demo.restarts; },
        read: () => demo.engine.snapshot(),
        draw(c): void {
            c.fillStyle = '#183e48';
            c.fillRect(0, 0, 160, 120);
            const s = demo.engine.state;
            const unit = Math.min(148 / s.width, 108 / s.height);
            s.cells.forEach((cell, i) => {
                if (!cell.piece) return;
                drawPiece(c, 6 + (i % s.width + 0.5) * unit,
                    6 + (Math.floor(i / s.width) + 0.5) * unit, unit * 0.4, cell.piece.color, cell.piece.special);
            });
        },
    };
}

function required<T>(value: T | null | undefined): T {
    if (value == null) throw new Error('Valeur attendue');
    return value;
}
