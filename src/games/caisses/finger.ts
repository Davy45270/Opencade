import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const scene = after.fingerInput as { pulling?: boolean; down?: boolean } | undefined;
    const was = before.fingerInput as { down?: boolean } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts') || scene?.pulling === true;
    if ((selector.includes('canvas') || selector === '#essaim-steer') && !target) return false;
    // A swipe: the finger lands on the board first, then the move is the proof.
    if (selector.includes('canvas') && scene?.down === true && was?.down !== true) return true;
    return changed('moves', 'player', 'boxes');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
