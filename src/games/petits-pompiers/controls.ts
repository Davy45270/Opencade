import { Engine, FIXED, IDLE, type JobKind } from '../../engines/petits-pompiers/engine';
/** Eight stable sectors; a 12 CSS pixel dead zone prevents accidental walking. */
export function stickDirection(x: number, y: number): { dx: number; dy: number } {
    if (Math.hypot(x, y) < 12) return { dx: 0, dy: 0 };
    return sectorDirection((Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8);
}
export function sectorDirection(sector: number | null): { dx: number; dy: number } {
    if (sector === null) return { dx: 0, dy: 0 };
    const a = sector * Math.PI / 4;
    return { dx: Math.round(Math.cos(a)) || 0, dy: Math.round(Math.sin(a)) || 0 };
}
/** Preserve methods and the Random instance while copying serializable state. */
export function forkEngine(engine: Engine): Engine {
    const copy = new Engine(engine.character), state = engine.snapshot();
    Object.assign(copy, { ...state, random: copy.random, nextObjective: copy.nextObjective.bind(copy) });
    copy.random.state = state.random;
    return copy;
}
/** The engine has no public context query. Probe a detached simulation, never the live game. */
export function contextualAction(engine: Engine): JobKind {
    if (engine.job) return engine.job.kind;
    const copy = forkEngine(engine);
    copy.previous = { ...IDLE };
    copy.input({ ...IDLE, action: true }); copy.step(FIXED);
    return copy.job?.kind ?? copy.events.find(e => ['spray', 'foam', 'refill', 'pickup', 'deposit', 'heal', 'break', 'climb', 'call'].includes(e.type))?.type as JobKind | undefined ?? 'spray';
}
export const actionIcons: Record<JobKind, string> = { spray: '💧', foam: '💧', refill: '💧', pickup: '✋', deposit: '✚', heal: '✚', break: '🪓', climb: '🪜', call: '📣' };
