import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    const aimed = /^#devisso-(hammer|bomb|drill)$/.exec(selector)?.[1];
    if (aimed) return after.armed === aimed || changed('boosts');
    if (selector === '#devisso-undo' || selector === '#devisso-hint') return changed('boosts', 'hint', 'history');
    if (selector.includes('canvas') && !target) return false;
    // A tap on the board: a screw left, a plate fell, a boost landed or a heart took moves back.
    return changed('present', 'plates', 'hearts', 'crates', 'boosts');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
