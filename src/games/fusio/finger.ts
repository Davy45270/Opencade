import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';
/** A finger is received when the board moves (swipe or arrow button), a move is undone or a hint is given. */
function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector === '#fusio-hint') return changed('hints', 'hint');
    if (selector === '#fusio-undo') return changed('undos', 'moves', 'refused');
    if (selector.includes('canvas') && !target) return false;
    return changed('board', 'moves', 'refused');
}
export const fingerProof = { fingerReceived } satisfies FingerProof;
