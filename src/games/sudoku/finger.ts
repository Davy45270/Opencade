import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';
/** A finger on the board or the pad is received when the selection, a value, a note or the notes mode changes. */
function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    if (selector === '#resume') return true;
    if (selector.includes('canvas') && !target) return false;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    return changed('selectedIndex', 'values', 'notes', 'notesMode', 'hintsUsed', 'history');
}
export const fingerProof = { fingerReceived } satisfies FingerProof;
