import { required } from './access';
import { onBoost, at, inKartHole, kartFootprint, nearest, onShortcut, wrap, type Track, type Vec } from './track';
export type Item = 'turbo' | 'ressort' | 'flaque' | 'bulle';
export interface Kart extends Vec {
    specialLap?: number;
    specialMs?: number;
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
    bypassIndex?: number;
    bypassSide?: number;
    bypassEntry?: Vec;
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
/** Optional diagnostic counters stay outside replayable kart state. */
export const collisionCounts = new WeakMap<Kart, { kart: number; rail: number }>();
export interface Input {
    steer: number;
    mode?: 'joystick';
    heading?: number;
    assist?: boolean;
    drift: boolean;
    bonus: boolean;
}
export const ANALOG_DEAD_ZONE = 6;
export const THUMB_DEAD_ZONE = 10;
export const FULL_DEFLECTION = 40;
/** Relative thumb displacement in CSS pixels; continuous outside the dead zone. */
export function analogSteer(delta: number): number {
    if (Math.abs(delta) <= ANALOG_DEAD_ZONE) return 0;
    return Math.sign(delta) * Math.min(1, Math.max(0, Math.abs(delta) - ANALOG_DEAD_ZONE) / (FULL_DEFLECTION - ANALOG_DEAD_ZONE));
}
/** Screen axes equal world axes in the north-up view. */
export function joystickHeading(dx: number, dy: number): number | undefined {
    return Math.hypot(dx, dy) <= THUMB_DEAD_ZONE ? undefined : Math.atan2(dy, dx);
}
/** Assistance only acts outside the road or when the projected motion threatens a rail. */
export function assistedHeading(k: Kart, t: Track, heading: number): number {
    const n = nearest(t, k), speed = Math.hypot(k.vx, k.vy);
    const ahead = nearest(t, { x: k.x + Math.cos(heading) * speed * .6, y: k.y + Math.sin(heading) * speed * .6 });
    if (n.distance <= required(t.widths[n.index]) / 2 && !(t.walls[ahead.index] && ahead.distance > required(t.widths[ahead.index]) / 2 - 1)) return heading;
    const target = at(t, n.along + 12);
    const error = wrap(Math.atan2(target.y - k.y, target.x - k.x) - heading);
    return heading + Math.max(-.3, Math.min(.3, error * .25));
}
export const jumpDuration = (speed: number): number => 220 + speed * 6;
export function physics(k: Kart, input: Input, t: Track, dt: number, grassGrip: number, targetSpeed = 24, n = nearest(t, k)): void {
    k.railHitMs = Math.max(0, (k.railHitMs ?? 0) - dt * 1000);
    k.landingMs = Math.max(0, (k.landingMs ?? 0) - dt * 1000);
    const snow = t.circuit.snow.includes(n.index), berm = t.circuit.berms.includes(n.index);
    const rampTail = !t.circuit.gap || n.along >= required(t.distances[n.index]) + (required(t.distances[n.index+1])-required(t.distances[n.index]))*.8;
    const bump = t.circuit.gap
        ? t.circuit.jumps.some(i=>kartFootprint(t,i,'ramp').contains(k,.8))
        : t.circuit.jumps.includes(n.index);
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
    if (input.mode === 'joystick' && input.heading !== undefined && Number.isFinite(input.heading) && !airborne) {
        const heading = input.assist ? assistedHeading(k, t, input.heading) : input.heading;
        const error = wrap(heading - k.angle);
        k.angle += Math.max(-3.2, Math.min(3.2, error * 5)) * dt;
    }
    k.angle += (input.mode === 'joystick' ? 0 : airborne ? 0 : steer) * 2.4 * Math.min(1, speed / 10) * (drifting ? 1.22 : 1) * dt;
    const c = Math.cos(k.angle), s = Math.sin(k.angle), forward = k.vx * c + k.vy * s, lateral = -k.vx * s + k.vy * c;
    const enteringBump = bump && !k.bumpActive;
    if (enteringBump && !airborne && k.bypassIndex === undefined) {
        if (speed >= 16) {
            k.jumpMs = jumpDuration(speed);
            k.jumpDurationMs = k.jumpMs;
        }
    }
    k.bumpActive = bump;
    if (!airborne && k.jumpMs<=0 && t.circuit.gap && t.circuit.jumps.includes(n.index) && rampTail && !bump && k.bypassIndex===undefined) {
        k.bypassIndex=n.index+1;
        k.bypassSide=(k.x-n.x)*n.nx+(k.y-n.y)*n.ny<0 ? -1 : 1;
    }
    const shortcut = onShortcut(t,k);
    const leaves = !airborne && !shortcut && t.circuit.leaves?.includes(n.index) && ((t.circuit.hazardWidthFraction ?? 1)===1 ? n.distance<=required(t.widths[n.index])/2 : kartFootprint(t,n.index,'leaves').contains(k));
    const lava = !airborne && !shortcut && t.circuit.lava?.includes(n.index) && ((t.circuit.hazardWidthFraction ?? 1)===1 ? n.distance<=required(t.widths[n.index])/2 : kartFootprint(t,n.index,'lava').contains(k));
    const gap = !airborne && k.jumpMs<=0 && (inKartHole(t,k) ||
        t.circuit.gap?.includes(n.index) && kartFootprint(t,n.index,'gap').contains({x:n.x,y:n.y}));
    if (gap && k.bypassIndex === undefined) {
        k.bypassIndex = n.index+1;
        k.bypassSide = (k.x-n.x)*n.nx+(k.y-n.y)*n.ny < 0 ? -1 : 1;
    }
    const grass = !shortcut && !t.circuit.theme.urban && n.distance > required(t.widths[n.index]) / 2 && k.jumpMs <= 0;
    const slope = t.circuit.family === 'slalom' || t.circuit.family === 'bmx'
        ? (required(t.heights[n.index]) - required(t.heights[(n.index + 1) % 96])) / Math.max(1, required(t.distances[n.index + 1]) - required(t.distances[n.index])) : 0;
    const gravity = slope * 9.8;
    const strip = t.boosts.some(b => onBoost(t, b, k, n));
    if (strip && !k.stripActive) {
        k.boostMs = Math.max(k.boostMs, 900);
        k.vx = c * 32;
        k.vy = s * 32;
    }
    k.stripActive = strip;
    const bermGrip = berm ? 1.4 : 1;
    const impulse = (k.specialMs ?? 0) > 0 ? 4 : 0;
    if (lava) { k.boostMs = 0; k.specialMs = 0; k.driftMs = 0; k.item = null; }
    const max = lava ? targetSpeed * .22 : gap ? 7 : (grass ? targetSpeed * (snow ? .28 : Math.min(.5, grassGrip)) : k.boostMs > 0 ? 32 : targetSpeed + (slope > 0 ? 3 : 0) + (bermGrip - 1) * 3) + (grass ? 0 : impulse);
    const f = Math.max(0, Math.min(max, (strip && k.boostMs > 0 ? 32 : forward) + (12 + impulse * 2 + gravity - forward * .12) * dt));
    const grip = (leaves ? .12 : snow ? .6 : 1) * bermGrip;
    const l = lateral * Math.exp(-(drifting || k.slipMs > 0 ? 1.4 : 10) * grip * dt);
    k.vx = c * f - s * l;
    k.vy = s * f + c * l;
    if (enteringBump && !airborne && speed < 16 && k.bypassIndex === undefined) {
        k.vx *= .75; k.vy *= .75;
        if (t.circuit.gap) {
            k.bypassIndex = n.index+1;
            k.bypassSide = (k.x-n.x)*n.nx+(k.y-n.y)*n.ny < 0 ? -1 : 1;
            const hole=kartFootprint(t,required(t.circuit.gap[0]),'gap');
            const lateral=(k.x-hole.a.x)*hole.nx+(k.y-hole.a.y)*hole.ny;
            const offset=required(t.widths[n.index])*.43*k.bypassSide-lateral;
            const inset=t.circuit.bypassEntryInset;
            k.bypassEntry=inset === undefined ? {x:k.x+hole.nx*offset,y:k.y+hole.ny*offset}
                : {x:hole.a.x-hole.ny*inset+hole.nx*required(t.widths[n.index])*.43*k.bypassSide,
                    y:hole.a.y+hole.nx*inset+hole.ny*required(t.widths[n.index])*.43*k.bypassSide};
        }
    }
    if (grass || lava || gap) {
        const magnitude = Math.hypot(k.vx, k.vy);
        if (magnitude > max) { k.vx *= max / magnitude; k.vy *= max / magnitude; }
    }
    if (airborne) { k.vx = Math.cos(k.angle) * forward - Math.sin(k.angle) * lateral; k.vy = Math.sin(k.angle) * forward + Math.cos(k.angle) * lateral; }
    // A missed launch takes the continuous outer deck at walking speed.
    // Motion follows its planks; there is no reset, freeze or teleport over the hole.
    if (k.bypassIndex !== undefined) {
        const i = k.bypassIndex, end = required(t.circuit.gap?.[0]) + 2;
        const p = required(t.points[i]), normal = kartFootprint(t,i,'ramp'), offset = i < end ? required(t.widths[i])*.43*(k.bypassSide ?? 1) : 0;
        const target=k.bypassEntry ?? {x:p.x+normal.nx*offset,y:p.y+normal.ny*offset};
        const x = target.x-k.x, y = target.y-k.y, length = Math.hypot(x,y);
        if (length <= .15) {
            if(k.bypassEntry) k.bypassEntry=undefined;
            else k.bypassIndex = i >= end ? undefined : i+1;
        }
        const velocity = Math.min(7,length/Math.max(dt,.0001));
        if (length > 0) { k.vx = x/length*velocity; k.vy = y/length*velocity; k.angle = Math.atan2(y,x); }
    }
    const start = { x: k.x, y: k.y }, dx = k.vx * dt, dy = k.vy * dt;
    let hit: { time: number; tree: Track['trees'][number] } | undefined;
    const minX=Math.min(start.x,start.x+dx),maxX=Math.max(start.x,start.x+dx),minY=Math.min(start.y,start.y+dy),maxY=Math.max(start.y,start.y+dy);
    for (const tree of t.circuit.theme.urban ? [] : t.trees) {
        const radius = tree.radius + 1.2;
        if (tree.x+radius<minX || tree.x-radius>maxX || tree.y+radius<minY || tree.y-radius>maxY) continue;
        const ox = start.x - tree.x, oy = start.y - tree.y;
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
    // Distance to the road is 1-Lipschitz: this bound proves the moved kart
    // is still inside every local road width, avoiding a redundant full scan.
    if (!shortcut && n.distance + Math.hypot(k.x-start.x,k.y-start.y) > Math.min(...t.widths)/2) resolveRail(k, t);
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
    const remainingImpulse = (k.specialMs ?? 0) - dt * 1000;
    k.specialMs = remainingImpulse < 0.00000001 ? 0 : remainingImpulse;
    for (const key of ['boostMs', 'jumpMs', 'slipMs'] as const)
        k[key] = Math.max(0, k[key] - dt * 1000);
    if (airborne && k.jumpMs === 0) k.landingMs = 280;
    k.jumpHeight = k.jumpMs > 0 ? 3 * Math.sin(Math.PI * k.jumpMs / (k.jumpDurationMs ?? 1600)) : 0;
}
/** Resolve the continuous boundary after motion or kart separation. */
export function resolveRail(k: Kart, t: Track): void {
    if (onShortcut(t,k)) return;
    const edge = nearest(t, k);
    if (edge.distance <= required(t.widths[edge.index]) / 2 + (t.circuit.theme.urban ? 1.8 : 3) || !t.walls[edge.index]) return;
    const sign = (k.x - edge.x) * edge.nx + (k.y - edge.y) * edge.ny > 0 ? 1 : -1;
    const nx = edge.nx * sign, ny = edge.ny * sign;
    // Put the kart inside the road, then give it an inward tangent velocity.
    const half = required(t.widths[edge.index]) / 2 - 1.2;
    k.x = edge.x + nx * half;
    k.y = edge.y + ny * half;
    const tx = edge.ny, ty = -edge.nx;
    // The one-way jump approach must never rebound towards the missing deck.
    const direction = t.circuit.forwardRails || Math.cos(k.angle) * tx + Math.sin(k.angle) * ty >= 0 ? 1 : -1;
    const speed = Math.max(8, Math.min(20, Math.hypot(k.vx, k.vy) * .7));
    const angle = Math.atan2(ty * direction - ny * .3, tx * direction - nx * .3);
    k.angle = angle;
    k.vx = Math.cos(angle) * speed;
    k.vy = Math.sin(angle) * speed;
    k.railHitMs = 180;
    if (k.shield) k.shield = false;
    else {
        k.hits++;
        const counts = collisionCounts.get(k);
        if (counts) counts.rail++;
    }
}
export function collide(a: Kart, b: Kart): void {
    // The managed narrow deck must not deadlock when several missed jumps queue.
    if (a.bypassIndex !== undefined || b.bypassIndex !== undefined) return;
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
                const counts = collisionCounts.get(k);
                if (counts) counts.kart++;
            }
        }
    }
}
