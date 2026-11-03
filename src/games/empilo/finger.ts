import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if ((selector.includes('canvas') || selector === '#essaim-steer') && !target) return false;
    return changed('active', 'dealt', 'status', 'reserve');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
