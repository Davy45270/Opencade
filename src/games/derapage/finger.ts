import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const scene = after.fingerInput as { thumb?: { x: number; y: number; dx: number; dy: number } | null } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas') && target && scene?.thumb) return near(scene.thumb.x + scene.thumb.dx, target.screenX) && near(scene.thumb.y + scene.thumb.dy, target.screenY);
    return false;
}

function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    const scene = after.fingerInput as { thumb?: { x: number; y: number; dx: number; dy: number } | null };
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    return scene.thumb === null;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
