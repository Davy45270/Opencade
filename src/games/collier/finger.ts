import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

/** Collier: an aiming touch is received when the shooter angle points at the projected touch (logic moved unchanged from the finger helper). */
function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const near = (a: unknown, b: number, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) < tolerance;
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector.includes('canvas')) {
        if (!target) return false;
        const input = after.fingerInput as { pointer: { x: number; y: number } | null; view: { x: number; y: number; scale: number }; canvas: { height: number } };
        const shooter = after.shooter as { x: number; y: number };
        const x = (target.x - input.view.x) / input.view.scale;
        const y = (target.y * input.canvas.height / 640 - input.view.y) / input.view.scale;
        return input.pointer !== null && near(after.angle, Math.atan2(y - shooter.y, x - shooter.x), .008);
    }
    return false;
}

export const fingerProof = { fingerReceived } satisfies FingerProof;
