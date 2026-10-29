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
}
export interface Input {
    steer: number;
    drift: boolean;
    bonus: boolean;
}
export function physics(k: Kart, input: Input, t: Track, dt: number, grassGrip: number, targetSpeed = 24): void {
    const speed = Math.hypot(k.vx, k.vy), steer = Math.max(-1, Math.min(1, input.steer));
    const drifting = input.drift && Math.abs(steer) > .15 && speed > 9;
    if (drifting)
        k.driftMs += dt * 1000;
    else if (k.driftMs > 0) {
        if (k.driftMs >= 600)
            k.boostMs = k.driftMs >= 1400 ? 1400 : 700;
        k.driftMs = 0;
    }
    k.angle += steer * 2.4 * Math.min(1, speed / 10) * (drifting ? 1.22 : 1) * dt;
    const c = Math.cos(k.angle), s = Math.sin(k.angle), forward = k.vx * c + k.vy * s, lateral = -k.vx * s + k.vy * c;
    const n = nearest(t, k), grass = n.distance > required(t.widths[n.index]) / 2 && k.jumpMs <= 0;
    const max = (k.boostMs > 0 ? 32 : targetSpeed) * (grass ? grassGrip : 1);
    const f = Math.max(0, Math.min(max, forward + (12 - forward * .12) * dt));
    const l = lateral * Math.exp(-(drifting || k.slipMs > 0 ? 1.4 : 10) * dt);
    k.vx = c * f - s * l;
    k.vy = s * f + c * l;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (n.distance > required(t.widths[n.index]) / 2 + 3 && t.walls[n.index]) {
        const sign = (k.x - n.x) * n.nx + (k.y - n.y) * n.ny > 0 ? 1 : -1;
        const nx = n.nx * sign, ny = n.ny * sign, v = k.vx * nx + k.vy * ny;
        k.x = n.x + nx * (required(t.widths[n.index]) / 2 + 2);
        k.y = n.y + ny * (required(t.widths[n.index]) / 2 + 2);
        if (v > 0) {
            k.vx -= 1.7 * v * nx;
            k.vy -= 1.7 * v * ny;
            if (k.shield)
                k.shield = false;
            else
                k.hits++;
        }
    }
    for (const key of ['boostMs', 'jumpMs', 'slipMs'] as const)
        k[key] = Math.max(0, k[key] - dt * 1000);
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
