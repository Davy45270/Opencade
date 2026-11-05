import type { FingerProof, FingerState } from '../finger-receipts';

type Gesture = { down?: boolean; acted?: boolean } | undefined;
function fingerReceived(selector: string, before: FingerState, after: FingerState): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas')) {
        // The road: the landing is received once, then a long enough swipe queues its direction.
        const was = before.fingerInput as Gesture, now = after.fingerInput as Gesture;
        if (now?.down === true && was?.down !== true) return true;
        return now?.acted === true && was?.acted !== true && changed('queue');
    }
    return (after.queue as string[]).includes(selector.split('-').at(-1) ?? '');
}
/** A tap on the road steps forward on release: it must queue a command. A swipe already did. */
function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    if (!selectors.some(s => s.includes('canvas'))) return true;
    const changed = (key: string) => JSON.stringify(before[key]) !== JSON.stringify(after[key]);
    return (before.fingerInput as Gesture)?.acted === true || changed('queue') || changed('player') || after.status !== 'playing';
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
