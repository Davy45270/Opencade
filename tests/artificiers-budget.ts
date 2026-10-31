import assert from 'node:assert/strict';
import { Engine, FIXED_MS } from '../src/engines/artificiers/engine';
import { Terrain } from '../src/engines/artificiers/terrain';
export interface Work { frames: number; cells: number; calls: number }
export const WORK_LIMIT: Work = { frames: 50000, cells: 40000000, calls: 3000000 };
let active: { work: Work; limit: Work } | undefined;
export function charge(key: keyof Work, amount: number): void {
    if (!active) return;
    active.work[key] += amount;
    if (active.work[key] > active.limit[key]) withinWork(active.work, active.limit);
}
export function withinWork(work: Work, limit = WORK_LIMIT): void {
    for (const key of ['frames', 'cells', 'calls'] as const) assert.ok(work[key] <= limit[key], `Budget ${key}: ${String(work[key])}/${String(limit[key])}`);
}
/** Deterministic work oracle shared by every Vitest case and the Node runner. */
export function bounded(check: () => void, limit = WORK_LIMIT): Work {
    const work: Work = { frames: 0, cells: 0, calls: 0 };
    const previous = active; active = { work, limit };
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Restored in finally; invoked only with .call(this).
    const step = Engine.prototype.step, integrate = Engine.prototype.integrate;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Restored in finally; invoked only with .call(this).
    const solid = Terrain.prototype.solid, set = Terrain.prototype.set;
    Engine.prototype.step = function(ms) { charge('frames', Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / FIXED_MS) : 0); step.call(this, ms); };
    Engine.prototype.integrate = function(p) { charge('calls', 1); return integrate.call(this, p); };
    Terrain.prototype.solid = function(x, y) { charge('cells', 1); return solid.call(this, x, y); };
    Terrain.prototype.set = function(x, y, material) { charge('cells', 1); set.call(this, x, y, material); };
    try { check(); withinWork(work, limit); return work; }
    finally { active = previous; Engine.prototype.step = step; Engine.prototype.integrate = integrate; Terrain.prototype.solid = solid; Terrain.prototype.set = set; }
}
