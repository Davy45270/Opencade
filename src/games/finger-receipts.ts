import type { Inputs } from '../shell/input';

/** Read-only test evidence: pointer events delivered through this scene's DOM. */
export function fingerReceipts(inputs: Inputs): () => { sequence: number; events: { sequence: number; type: string; x: number; y: number }[] } {
    let sequence = 0;
    const events: { sequence: number; type: string; x: number; y: number }[] = [];
    if (new URLSearchParams(location.search).get('test') === '1') {
        // Window capture: runs before the shell's Start-on-tap capture (pause.ts), which stops propagation.
        for (const type of ['pointerdown', 'pointermove', 'pointerup']) inputs.on(window, type, event => {
            const pointer = event as PointerEvent;
            if (pointer.pointerType !== 'touch') return;
            events.push({ sequence: ++sequence, type, x: pointer.clientX, y: pointer.clientY });
            if (events.length > 64) events.shift();
        }, { capture: true });
    }
    return () => ({ sequence, events: events.map(event => ({ ...event })) });
}
