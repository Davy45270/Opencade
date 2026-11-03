import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return ['specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts'].some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector.includes('canvas')) {
        if (!target) return false;
        const aiming = (after.fingerInput as { aiming?: { x: number; y: number } | null } | undefined)?.aiming;
        return !!aiming && near(aiming.x, target.x) && near(aiming.y, target.y);
    }
    if (selector === '#artificiers-weapon') return changed('weapon');
    return false;
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
