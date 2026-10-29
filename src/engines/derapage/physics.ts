import { required } from './access';
import { nearest, type Track, type Vec } from './track';
export type Item = 'turbo' | 'ressort' | 'flaque' | 'bulle';
export interface Kart extends Vec {
    id: number;
    angle: number;
    vx: number;
    vy: number;
    lap: number;
    gate: number;
    passed: number;
    driftMs: number;
    boostMs: number;
    jumpMs: number;
    slipMs: number;
    shield: boolean;
    item: Item | null;
    finishMs: number | null;
    hits: number;
    jumpHeight?: number;
    jumpDurationMs?: number;
    bumpActive?: boolean;
    penaltyMs?: number;
    missedGates?: number;
    noticeMs?: number;
    slalomPassed?: number[];
    slalomMissed?: number[];
    railHitMs?: number;
    landingMs?: number;
    treeHits?: number;
    stripActive?: boolean;
}
export interface Input {
    steer: number;
    drift: boolean;
    bonus: boolean;
}
/** Relative thumb displacement in CSS pixels; continuous outside the dead zone. */
export function analogSteer(delta: number): number {
    if (Math.abs(delta) <= 6) return 0;
    return Math.sign(delta) * Math.min(1, Math.max(0, Math.abs(delta) - 6) / 54);
}
export const jumpDuration = (speed: number): number => 220 + speed * 6;
export function physics(k: Kart, input: Input, t: Track, dt: number, grassGrip: number, targetSpeed = 24): void {
    k.railHitMs = Math.max(0, (k.railHitMs ?? 0) - dt * 1000);
    k.landingMs = Math.max(0, (k.landingMs ?? 0) - dt * 1000);
    const n = nearest(t, k), snow = t.circuit.snow.includes(n.index), berm = t.circuit.berms.includes(n.index);
    const bump = t.circuit.jumps.includes(n.index);
    const speed = Math.hypot(k.vx, k.vy), steer = Math.max(-1, Math.min(1, input.steer));
    const airborne = k.jumpMs > 0;
    const drifting = !airborne && input.drift && Math.abs(steer) > .15 && speed > 9;
    if (drifting)
        k.driftMs += dt * 1000;
    else if (k.driftMs > 0) {
        if (k.driftMs >= 600)
            k.boostMs = k.driftMs >= 1400 ? 1400 : 700;
        k.driftMs = 0;
    }
    k.angle += (airborne ? 0 : steer) * 2.4 * Math.min(1, speed / 10) * (drifting ? 1.22 : 1) * dt;
    const c = Math.cos(k.angle), s = Math.sin(k.angle), forward = k.vx * c + k.vy * s, lateral = -k.vx * s + k.vy * c;
    const enteringBump = bump && !k.bumpActive;
    if (enteringBump && !airborne) {
        if (speed >= 16) {
            k.jumpMs = jumpDuration(speed);
            k.jumpDurationMs = k.jumpMs;
        }
    }
    k.bumpActive = bump;
    const grass = !t.circuit.theme.urban && n.distance > required(t.widths[n.index]) / 2 && k.jumpMs <= 0;
    const slope = t.circuit.family === 'slalom' || t.circuit.family === 'bmx'
        ? (required(t.heights[n.index]) - required(t.heights[(n.index + 1) % 96])) / Math.max(1, required(t.distances[n.index + 1]) - required(t.distances[n.index])) : 0;
    const gravity = slope * 9.8;
    const strip = t.boosts.some(b => Math.hypot(k.x - b.x, k.y - b.y) <= b.radius + 1.2);
    if (strip && !k.stripActive) {
        k.boostMs = Math.max(k.boostMs, 900);
        k.vx = c * 32;
        k.vy = s * 32;
    }
    k.stripActive = strip;
    const bermGrip = berm ? 1.4 : 1;
    const max = grass ? targetSpeed * (snow ? .28 : Math.min(.5, grassGrip)) : k.boostMs > 0 ? 32 : targetSpeed + (slope > 0 ? 3 : 0) + (bermGrip - 1) * 3;
    const f = Math.max(0, Math.min(max, (strip && k.boostMs > 0 ? 32 : forward) + (12 + gravity - forward * .12) * dt));
    const grip = (snow ? .6 : 1) * bermGrip;
    const l = lateral * Math.exp(-(drifting || k.slipMs > 0 ? 1.4 : 10) * grip * dt);
    k.vx = c * f - s * l;
    k.vy = s * f + c * l;
    if (enteringBump && !airborne && speed < 16) { k.vx *= .75; k.vy *= .75; }
    if (grass) {
        const magnitude = Math.hypot(k.vx, k.vy);
        if (magnitude > max) { k.vx *= max / magnitude; k.vy *= max / magnitude; }
    }
    if (airborne) { k.vx = Math.cos(k.angle) * forward - Math.sin(k.angle) * lateral; k.vy = Math.sin(k.angle) * forward + Math.cos(k.angle) * lateral; }
    const start = { x: k.x, y: k.y }, dx = k.vx * dt, dy = k.vy * dt;
    let hit: { time: number; tree: Track['trees'][number] } | undefined;
    for (const tree of t.circuit.theme.urban ? [] : t.trees) {
        const ox = start.x - tree.x, oy = start.y - tree.y, radius = tree.radius + 1.2;
        const a = dx * dx + dy * dy, b = ox * dx + oy * dy, c0 = ox * ox + oy * oy - radius * radius;
        const disc = b * b - a * c0;
        const time = c0 < 0 ? 0 : a > 0 && disc >= 0 ? (-b - Math.sqrt(disc)) / a : Infinity;
        if (time >= 0 && time <= 1 && (!hit || time < hit.time)) hit = { time, tree };
    }
    k.x += dx * (hit?.time ?? 1);
    k.y += dy * (hit?.time ?? 1);
    if (hit) {
        const tree = hit.tree, length = Math.hypot(k.x - tree.x, k.y - tree.y);
        const nx = length > 0 ? (k.x - tree.x) / length : 1, ny = length > 0 ? (k.y - tree.y) / length : 0;
        k.x = tree.x + nx * (tree.radius + 1.201);
        k.y = tree.y + ny * (tree.radius + 1.201);
        const v = Math.min(0, k.vx * nx + k.vy * ny);
        k.vx = (k.vx - 1.6 * v * nx) * .55;
        k.vy = (k.vy - 1.6 * v * ny) * .55;
        k.hits++;
        k.treeHits = (k.treeHits ?? 0) + 1;
    }
    resolveRail(k, t);
    k.noticeMs = Math.max(0, (k.noticeMs ?? 0) - dt * 1000);
    k.slalomPassed ??= [];
    for (const [i, gate] of t.slalom.entries()) {
        const a = (start.x - gate.x) * gate.ny - (start.y - gate.y) * gate.nx;
        const b = (k.x - gate.x) * gate.ny - (k.y - gate.y) * gate.nx;
        if (a < 0 && b >= 0 && k.slalomPassed[i] !== k.lap) {
            const u = a / (a - b), x = start.x + (k.x - start.x) * u, y = start.y + (k.y - start.y) * u;
            // Only the local section counts, avoiding distant crossings of the same plane.
            const section = nearest(t, { x, y }).index;
            const gap = Math.abs(section - gate.index);
            if (gap <= 2 || gap >= 94) {
                k.slalomPassed[i] = k.lap;
                if (Math.abs((x - gate.x) * gate.nx + (y - gate.y) * gate.ny) > gate.half) {
                    (k.slalomMissed ??= [])[i] = k.lap;
                    k.penaltyMs = (k.penaltyMs ?? 0) + 2000;
                    k.missedGates = (k.missedGates ?? 0) + 1;
                    k.noticeMs = 2000;
                }
            }
        }
    }
    for (const key of ['boostMs', 'jumpMs', 'slipMs'] as const)
        k[key] = Math.max(0, k[key] - dt * 1000);
    if (airborne && k.jumpMs === 0) k.landingMs = 280;
    k.jumpHeight = k.jumpMs > 0 ? 3 * Math.sin(Math.PI * k.jumpMs / (k.jumpDurationMs ?? 1600)) : 0;
}
/** Resolve the continuous boundary after motion or kart separation. */
export function resolveRail(k: Kart, t: Track): void {
    const edge = nearest(t, k);
    if (edge.distance > required(t.widths[edge.index]) / 2 + (t.circuit.theme.urban ? 1.8 : 3) && t.walls[edge.index]) {
        const n = edge;
        const sign = (k.x - n.x) * n.nx + (k.y - n.y) * n.ny > 0 ? 1 : -1;
        const nx = n.nx * sign, ny = n.ny * sign, v = k.vx * nx + k.vy * ny;
        k.x = n.x + nx * (required(t.widths[n.index]) / 2 + (t.circuit.theme.urban ? 1.79 : 2));
        k.y = n.y + ny * (required(t.widths[n.index]) / 2 + (t.circuit.theme.urban ? 1.79 : 2));
        if (v > 0) {
            k.railHitMs = 180;
            k.vx -= 1.7 * v * nx;
            k.vy -= 1.7 * v * ny;
            if (k.shield)
                k.shield = false;
            else
                k.hits++;
        }
    }
}
export function collide(a: Kart, b: Kart): void {
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    if (dist >= 2.4)
        return;
    const nx = dist > 0 ? dx / dist : 1, ny = dist > 0 ? dy / dist : 0, overlap = (2.4 - dist) / 2;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
    const impulse = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (impulse > 0) {
        for (const [k, sign] of [[a, -1], [b, 1]] as const) {
            if (k.shield)
                k.shield = false;
            else {
                k.vx += sign * impulse * nx * .85;
                k.vy += sign * impulse * ny * .85;
                k.hits++;
            }
        }
    }
}
