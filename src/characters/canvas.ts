import type { Primitive } from './model';

/** Draw directly at destination resolution. x/y denote the top left of the stage. */
export function renderCharacter(context: CanvasRenderingContext2D, list: readonly Primitive[], x = 0, y = 0, height = 240): void {
    context.save(); context.translate(x, y); context.scale(height / 240, height / 240);
    context.lineCap = 'round'; context.lineJoin = 'round';
    for (const p of list) {
        context.beginPath();
        if (p.kind === 'ellipse') context.ellipse(p.x, p.y, p.rx, p.ry, p.rotation, 0, Math.PI * 2);
        else if (p.kind === 'circle') context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        else if (p.kind === 'path') {
            for (const c of p.commands) {
                switch (c.op) {
                    case 'M': context.moveTo(...c.p); break;
                    case 'L': context.lineTo(...c.p); break;
                    case 'C': context.bezierCurveTo(c.a[0], c.a[1], c.b[0], c.b[1], c.p[0], c.p[1]); break;
                }
            }
            if (p.closed) context.closePath();
        } else {
            p.points.forEach((v, i) => { if (i === 0) context.moveTo(...v); else context.lineTo(...v); });
            if (p.kind === 'polygon') context.closePath();
        }
        if (p.fill) { context.fillStyle = p.fill; context.fill(); }
        if (p.width > 0) { context.strokeStyle = p.stroke; context.lineWidth = Math.max(p.width, 180 / height); context.stroke(); }
    }
    context.restore();
}
