import type { Inputs } from '../shell/input';

/** Read-only test evidence: pointer events delivered through this scene's DOM. */
export function fingerReceipts(inputs: Inputs): () => { sequence: number; events: { sequence: number; type: string; x: number; y: number; target: string | null }[] } {
    let sequence = 0;
    const events: { sequence: number; type: string; x: number; y: number; target: string | null }[] = [];
    if (new URLSearchParams(location.search).get('test') === '1') {
        // Window capture: runs before the shell's Start-on-tap capture (pause.ts), which stops propagation.
        for (const type of ['pointerdown', 'pointermove', 'pointerup']) inputs.on(window, type, event => {
            const pointer = event as PointerEvent;
            if (pointer.pointerType !== 'touch') return;
            const element = typeof Element !== 'undefined' && pointer.target instanceof Element ? pointer.target : null;
            const target = element?.closest('#touch-controls button, #touch-controls [role="button"]') ?? element;
            events.push({ sequence: ++sequence, type, x: pointer.clientX, y: pointer.clientY,
                target: target ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${Array.from(target.classList, name => `.${name}`).join('')}` : null });
            if (events.length > 64) events.shift();
        }, { capture: true });
    }
    return () => ({ sequence, events: events.map(event => ({ ...event })) });
}

/** Optional scene-owned evidence, evaluated in the page on read() snapshots. */
export type FingerState = Record<string, unknown>;
export type FingerTarget = { x: number; y: number; screenX: number; screenY: number; dx: number; dy: number };
export interface FingerProof {
    fingerReceived?(selector: string, before: FingerState, after: FingerState, target?: FingerTarget): boolean;
    fingerReleased?(selectors: string[], before: FingerState, after: FingerState): boolean;
}
