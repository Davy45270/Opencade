import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return ['specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts'].some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#gourmandises-hammer') return after.armedTool === 'hammer';
    const input = after.fingerInput as { down?: { x: number; y: number } | null };
    return Boolean(target && input.down); // Selection and swaps commit on pointerup; receipts prove each move.
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
