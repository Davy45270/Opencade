import type { FingerProof, FingerState, FingerTarget } from '../finger-receipts';

function fingerReceived(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean {
    const scene = after.fingerInput as { controls?: Record<string, unknown> } | undefined;
    const changed = (...keys: string[]) => keys.some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (selector === '#resume') return true;
    if (selector.endsWith('-special')) return changed('specialUses', 'specialUsed', 'specialCooldown', 'specialArmed', 'karts');
    if (selector === '.joystick' && target) {
        const angle = Math.round(Math.atan2(target.dy, target.dx) / (Math.PI / 4)) * Math.PI / 4;
        return scene?.controls?.x === Math.round(Math.cos(angle)) && scene.controls.y === Math.round(Math.sin(angle));
    }
    return scene?.controls?.[selector.endsWith('jump') ? 'jump' : 'fire'] === true;
}

function fingerReleased(selectors: string[], before: FingerState, after: FingerState): boolean {
    const scene = after.fingerInput as { controls?: Record<string, unknown> };
    if (selectors.includes('#resume')) return (after.fingerInput as { paused?: boolean } | undefined)?.paused === false;
    return scene.controls?.x === 0 && scene.controls.y === 0 && !scene.controls.jump && !scene.controls.fire;
}

export const fingerProof = { fingerReceived, fingerReleased } satisfies FingerProof;
