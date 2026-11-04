import type { FingerProof } from '../finger-receipts';
import { stickDirection } from './controls';
export const fingerProof = {
    fingerReceived(selector, _before, after, target) {
        const input = after.fingerInput as { paused: boolean; dx: number; dy: number; action: boolean; tool: boolean };
        // The shell starts on pointerup; pointerdown is proved by the captured receipt.
        // Finger.endTouch separately requires the real shell pause state to be false.
        if (selector === '#resume') return true;
        if (selector === '.joystick' && target) { const d = stickDirection(target.dx, target.dy); return input.dx === d.dx && input.dy === d.dy; }
        if (selector === '#pompiers-action') return input.action;
        if (selector === '#pompiers-tool') return input.tool;
        return false;
    },
    fingerReleased(_selectors, _before, after) {
        const input = after.fingerInput as { dx: number; dy: number; action: boolean; tool: boolean };
        return !input.dx && !input.dy && !input.action && !input.tool;
    },
} satisfies FingerProof;
