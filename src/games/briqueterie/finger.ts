import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas') || selector === '#essaim-steer') {
        if (!target) return false;
        return near(after.paddle, Math.max(Number(after.width) / 2, Math.min(360 - Number(after.width) / 2, target.x)));
    }
    if (selector.endsWith('-launch')) return after.ready === false;
    return false;
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
