import { drawList, type Primitive, type Point } from '../../characters/model';
import type { GameCharacter } from '../../characters/game';

export interface ActorLayer {
    key: string;
    list: Primitive[];
    x: number;
    y: number;
    rotation: number;
}
// A state has one reference list; advancing an animation only builds its current pose.
const references = new Map<string, { list: Primitive[]; signatures: string[] }>();
const signature = (p: unknown): string => JSON.stringify(p, (_key, value: unknown) =>
    typeof value === 'number' ? Math.round(value * 1e8) / 1e8 : value);

/** Factor translations out of the cast's primitives. The body is one layer;
 * walking feet and orbiting effects retain their exact procedural positions.
 * No animation clock is rounded and no new texture is needed for a translation.
 */
export function actorLayers(actor: GameCharacter, reduced: boolean): { layers: ActorLayer[]; live: Primitive[] } {
    const motion = reduced ? 'reduce' : 'full';
    const state = `${actor.id}/${actor.pose}/${actor.expression}/${actor.animation}/${motion}`;
    let reference = references.get(state);
    if (!reference) {
        const list = drawList(actor.id, actor.pose, actor.expression, actor.animation, 0, motion);
        reference = { list, signatures: list.map(signature) };
        references.set(state, reference);
    }
    const current = drawList(actor.id, actor.pose, actor.expression, actor.animation, actor.time, motion);
    const layers: ActorLayer[] = [], live: Primitive[] = [];
    const anchor = (p: Primitive): Point => p.kind === 'circle' || p.kind === 'ellipse' ? [p.x, p.y]
        : p.kind === 'path' ? (p.commands[0]?.p ?? [0, 0]) : (p.points[0] ?? [0, 0]);
    const translate = (p: Primitive, x: number, y: number): Primitive => {
        const point = (q: Point): Point => [q[0] - x, q[1] - y];
        if (p.kind === 'circle' || p.kind === 'ellipse') return { ...p, x: p.x - x, y: p.y - y };
        if (p.kind === 'path') return { ...p, commands: p.commands.map(c => c.op === 'C'
            ? { ...c, a: point(c.a), b: point(c.b), p: point(c.p) } : { ...c, p: point(c.p) }) };
        return { ...p, points: p.points.map(point) };
    };
    current.forEach((p, i) => {
        const base = reference.list[i];
        if (!base) { live.push(p); return; }
        const a = anchor(p), b = anchor(base);
        const x = a[0] - b[0], y = a[1] - b[1];
        if (signature(translate(p, x, y)) === reference.signatures[i]) {
            const previous = layers.at(-1);
            if (previous && Math.abs(previous.x - x) < 1e-8 && Math.abs(previous.y - y) < 1e-8 && previous.rotation === 0) {
                previous.list.push(base);
                previous.key += `,${String(i)}`;
            } else layers.push({ key: String(i), list: [base], x, y, rotation: 0 });
        } else if (p.kind === 'ellipse' && base.kind === 'ellipse' && p.rx === base.rx && p.ry === base.ry) {
            layers.push({ key: `ellipse-${String(i)}`, list: [{ ...base, x: 120, y: 120, rotation: 0 }],
                x: p.x - 120, y: p.y - 120, rotation: p.rotation });
        } else live.push(p); // Rare deforming special effects retain their exact vectors.
    });
    if (live.some(p => p.effect)) {
        // Deforming effects must keep their original order (rainbow before star).
        for (const layer of layers) {
            layer.list = layer.list.filter(p => !p.effect);
            layer.key += '-body';
        }
        return { layers: layers.filter(layer => layer.list.length), live: current.filter(p => p.effect) };
    }
    return { layers, live };
}
