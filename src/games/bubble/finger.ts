import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const scene = after.fingerInput as { aimingPointer?: number | null } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas') || selector === '#essaim-steer') {
        if (!target) return false;
        // Tap on the next bubble (300, 585): a swap, not an aim.
        if (selector.includes('canvas') && Math.hypot(target.x - 300, target.y - 585) <= 42) return changed('next', 'queued');
        return scene?.aimingPointer != null && near(after.angle, Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180, Math.atan2(target.x - 180, 570 - target.y))), .008);
    }
    return false;
}

function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    // A canvas press that never aimed (the swap tap) is not a shot.
    const aimed = (before.fingerInput as { aimingPointer?: number | null } | undefined)?.aimingPointer != null;
    return before.inFlight === false && aimed ? Number(after.shots) === Number(before.shots) + 1 || selectors.every(s => !s.includes('canvas')) : true;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
