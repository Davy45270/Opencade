import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const scene = after.fingerInput as { firing?: boolean } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.endsWith('-fire')) return scene?.firing === true;
    if (selector.includes('canvas') || selector === '#essaim-steer') {
        if (!target) return false;
        return near(after.target, Math.max(16, Math.min(344, Math.round(target.x))));
    }
    return false;
}

function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    const scene = after.fingerInput as { firing?: boolean };
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    return scene.firing === false;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
