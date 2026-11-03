import type { FingerProof, FingerState } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    const direction = selector.split('-').at(-1);
    return after.direction === direction || (after.queue as string[]).includes(direction ?? '');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
