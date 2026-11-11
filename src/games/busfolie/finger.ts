import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector === '#busfolie-undo') return changed('undo', 'moves', 'turn');
    if (selector === '#busfolie-hint') return changed('hint', 'hints');
    if (selector === '#busfolie-restart') return changed('turn', 'positions') || after.turn === 0;
    if (selector.includes('canvas') && !target) return false;
    // A touch on the yard: a bus selected, slid or departed.
    return changed('positions', 'turn', 'selected', 'departed');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
