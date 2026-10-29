import { aiInput } from '../src/engines/derapage/ai';
import { checkpoint } from '../src/engines/derapage/race';
import { Random } from '../src/engines/shared/random';
import { Engine } from '../src/engines/derapage/engine';
import { physics, type Kart } from '../src/engines/derapage/physics';
import { createTrack, nearest, at } from '../src/engines/derapage/track';
import { required } from '../src/engines/derapage/access';
const neutral = { steer: 0, drift: false, bonus: false };
const kart = () => structuredClone(required(new Engine().karts[0]));
function surface() {
    const t = createTrack(0); t.trees = []; t.boosts = []; t.walls.fill(false); t.widths.fill(10000);
    t.circuit = { ...t.circuit, elevation: [], snow: [], berms: [], jumps: [] }; t.heights.fill(0);
    return t;
}
type Check = (ok: boolean, message: string) => void;
export const mechanics: { name: string; run: (check: Check) => void }[] = [
    { name: 'Z30 portes : pénalité exacte, passage propre et IA', run(check) {
        for (const id of [0, 1]) for (const offset of [0, 5]) {
            const t = createTrack(28), g = required(t.slalom[0]); t.trees = []; t.boosts = [];
            const k = kart(), angle = Math.atan2(-g.nx, g.ny);
            Object.assign(k, { id, x: g.x + g.nx * offset - g.ny * .1, y: g.y + g.ny * offset + g.nx * .1, angle, vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20 });
            physics(k, neutral, t, 1/60, .45);
            check((k.penaltyMs ?? 0) === (offset === 0 ? 0 : 2000), 'pénalité 2000 ms');
            check((k.missedGates ?? 0) === (offset === 0 ? 0 : 1), 'compteur');
            physics(k, neutral, t, 1/60, .45);
            check((k.penaltyMs ?? 0) === (offset === 0 ? 0 : 2000), 'sans double comptage');
        }
        const misses: number[] = [];
        for (const level of [0,28]) {
            const e = new Engine(28), k = required(e.karts[1]), random = new Random(28);
            for (let frame = 0; frame < 6000 && k.lap < 1; frame++) {
                const previous = { x:k.x, y:k.y };
                physics(k, aiInput(k,e.track,level,random.next()*2-1),e.track,1/60,.45,18);
                checkpoint(k,previous,e.track,frame*1000/60);
            }
            check(k.lap === 1, 'IA boucle le slalom');
            misses.push(k.missedGates ?? 0);
        }
        check(required(misses[0]) > required(misses[1]) && required(misses[1]) === 0, 'dosage facile : davantage de portes manquées');
        const t = createTrack(28);
        check(t.slalom.every(g => g.half * 2 >= 6 && nearest({ ...t, points: t.racingLine }, g).distance < .1), 'largeur et ligne IA');
    } },
    { name: 'Z31 neige : dérive mesurée et glisse prolongée', run(check) {
        const dry = surface(), snow = surface(); snow.circuit.snow = Array.from({ length: 96 }, (_, i) => i);
        for (const drift of [false, true]) {
            const a = kart(), b = kart(); Object.assign(a, { x: 0, y: 0, angle: 0, vx: 20, vy: 8 }); Object.assign(b, a);
            physics(a, { ...neutral, steer: .5, drift }, dry, .1, .45);
            physics(b, { ...neutral, steer: .5, drift }, snow, .1, .45);
            const lateral = (k: typeof a) => Math.abs(-k.vx * Math.sin(k.angle) + k.vy * Math.cos(k.angle));
            const ratio = lateral(b) / lateral(a);
            check(ratio > (drift ? 1.04 : 1.45) && ratio < (drift ? 1.08 : 1.55), 'rapport de dérive borné');
        }
    } },
    { name: 'Z32 pente : vitesse après trois secondes', run(check) {
        const slope = surface(), flat = surface(); slope.circuit.family = 'slalom'; slope.heights = slope.points.map((_, i) => 100 - i * 2);
        const a = kart(), b = kart(), p = required(slope.points[0]), q = required(slope.points[1]);
        Object.assign(a, p, { angle: Math.atan2(q.y-p.y,q.x-p.x), vx: 0, vy: 0 }); Object.assign(b, a);
        for (let i = 0; i < 180; i++) { physics(a, neutral, slope, 1/60, .45, 50); physics(b, neutral, flat, 1/60, .45, 50); }
        check(Math.hypot(a.vx,a.vy) > Math.hypot(b.vx,b.vy) + 2, 'gain de pente > 2');
    } },
    { name: 'Z33 berm : vitesse conservée en virage', run(check) {
        const plain = surface(), bank = surface(); bank.circuit.berms = Array.from({ length: 96 }, (_, i) => i);
        const a = kart(), b = kart(); Object.assign(a, { x: 0, y: 0, angle: 0, vx: 22, vy: 0 }); Object.assign(b, a);
        for (let i = 0; i < 60; i++) { physics(a, { ...neutral, steer: .7 }, plain, 1/60, .45); physics(b, { ...neutral, steer: .7 }, bank, 1/60, .45); }
        check(Math.hypot(b.vx,b.vy) > Math.hypot(a.vx,a.vy) + .1, 'gain en sortie > 0,1');
    } },
    { name: 'Z34 bosse : envol, durée, direction et seuil', run(check) {
        const t = surface(); t.circuit.jumps = Array.from({ length: 96 }, (_, i) => i);
        const a = kart(); Object.assign(a, { angle: 0, vx: 22, vy: 0 });
        physics(a, neutral, t, 1/60, .45);
        check((a.jumpHeight ?? 0) > 0, 'hauteur positive');
        const b = structuredClone(a); let frames = 1;
        while (a.jumpMs > 0 && frames < 90) {
            physics(a, neutral, t, 1/60, .45); physics(b, { ...neutral, steer: 1 }, t, 1/60, .45); frames++;
            check(a.angle === b.angle && a.x === b.x && a.y === b.y, 'braquage inactif en vol');
        }
        check(frames > 20 && frames < 35 && a.jumpHeight === 0, 'atterrissage borné');
        const slow = kart(); Object.assign(slow, { angle: 0, vx: 10, vy: 0 }); physics(slow, neutral, t, 1/60, .45);
        check(slow.jumpMs === 0 && Math.hypot(slow.vx,slow.vy) < 9, 'bosse lente');
        const fast = kart(); Object.assign(fast, { angle: 0, vx: 30, vy: 0 }); physics(fast, neutral, t, 1/60, .45);
        check(fast.jumpMs > 380, 'durée selon vitesse');
    } },
    { name: 'Z35 rail urbain : rebond, confinement et perte', run(check) {
        for (const level of [0,1,20,21,23]) {
            const t = createTrack(level); t.trees = []; t.boosts = [];
            const p = at(t, 20), n = nearest(t,p), half = required(t.widths[n.index])/2;
            const k = kart(); Object.assign(k, { x: p.x+n.nx*(half+1.7), y: p.y+n.ny*(half+1.7), angle: Math.atan2(n.ny,n.nx), vx: n.nx*24, vy:n.ny*24 });
            physics(k, neutral, t, 1/60, .45);
            check(k.vx*n.nx+k.vy*n.ny < 0 && Math.hypot(k.vx,k.vy) < 22, 'rebond et perte');
            check(nearest(t,k).distance < half+1.81, 'confinement initial');
            for (let i=0;i<120;i++) { physics(k, neutral,t,1/60,.45); const edge=nearest(t,k); check(edge.distance <= required(t.widths[edge.index])/2+1.81,'zone jouable'); }
        }
    } },
];

/** A legal final-line crossing includes all previously incurred gate penalties. */
export function finishPenalty(cross = checkpoint, check: Check): void {
    const t = createTrack(28), p = required(t.points[0]);
    const a = required(t.points[95]), b = required(t.points[1]);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (const penaltyMs of [0, 2000, 4000]) {
        const k = kart();
        Object.assign(k, { x: p.x + Math.cos(angle), y: p.y + Math.sin(angle), lap: 2, gate: 0, penaltyMs });
        cross(k, { x: p.x - Math.cos(angle), y: p.y - Math.sin(angle) }, t, 12000);
        check(k.lap === 3 && k.finishMs === 12000 + penaltyMs, 'temps final avec pénalités');
    }
}
/** Take-off happens this frame: grass must not clamp the initial launch speed. */
export function airborneGrass(move: (k: Kart, input: typeof neutral, t: ReturnType<typeof surface>, dt: number, grip: number) => void = physics, check: Check): void {
    const t = surface(); t.circuit.theme = { ...t.circuit.theme, urban: false };
    t.widths.fill(1); t.circuit.jumps = Array.from({ length: 96 }, (_, i) => i);
    const k = kart(); Object.assign(k, { x: 1000, y: 1000, angle: 0, vx: 22, vy: 0 });
    check(nearest(t, k).distance > 1, 'départ sur herbe');
    move(k, neutral, t, 1 / 60, .45);
    check(k.jumpMs > 0 && k.vx > 22 && k.vx < 23 && k.vy === 0, 'vitesse conservée au décollage sur herbe');
    t.circuit.jumps = [];
    const ground = kart(); Object.assign(ground, { x: 1000, y: 1000, angle: 0, vx: 22, vy: 0 });
    move(ground, neutral, t, 1 / 60, .45);
    check(ground.jumpMs === 0 && ground.vx === 10.8, 'herbe active au sol');
}
mechanics.push(
    { name: 'Z30 temps final : pénalités de porte', run: check => { finishPenalty(checkpoint, check); } },
    { name: 'Z34 herbe : vitesse de décollage', run: check => { airborneGrass(physics, check); } },
);
