import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector === '#demineur-tool') return changed('tool');
    if (selector === '#demineur-hint') return changed('hint', 'hints');
    if (selector === '#demineur-zoom') return changed('view');
    if (selector.includes('canvas') && !target) return false;
    // A touch on the board: a cell dug or marked, a chord, or the overview zoomed in.
    return changed('cells', 'turn', 'view');
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
