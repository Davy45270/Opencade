import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas') || selector === '#essaim-steer') {
        if (!target) return false;
        // Above the lower third a touch is a tap: its launch is proven on release.
        if (selector.includes('canvas') && target.y < 640 * 2 / 3) return true;
        // Relative: the paddle moves by the finger's travel since it landed in the lower third.
        const drag = (after.fingerInput as { drag?: { origin: number; start: number } | null } | undefined)?.drag;
        return drag != null && near(after.paddle, Math.max(Number(after.width) / 2, Math.min(360 - Number(after.width) / 2, drag.origin + target.x - drag.start)));
    }
    return false;
}

/** A tap that did not drag launches the docked ball when the finger lifts. */
function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    const dragged = (before.fingerInput as { drag?: unknown } | undefined)?.drag != null;
    return selectors.includes('#game canvas') && before.ready === true && !dragged ? after.ready === false : true;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
