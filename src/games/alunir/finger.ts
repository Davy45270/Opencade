import type { FingerProof, FingerState } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState): boolean {
    const scene = after.fingerInput as { held?: string[] } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    return scene?.held?.includes(selector.slice(1)) === true;
}

function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    const scene = after.fingerInput as { held?: string[] };
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    return scene.held?.length === 0;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
