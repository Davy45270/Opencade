import { Finger } from './finger-stepped';
import { decision } from './collier-policy';
import type { CollierHook } from '../../src/games/collier/scene';

type Box = { x: number; y: number; width: number; height: number };
export async function driveCollier(finger: Finger, hook: {
    readDriver(): Promise<ReturnType<CollierHook['readDriver']>>;
}, geometry: ReturnType<CollierHook['geometry']>, box: Box): Promise<number> {
    const { view, canvas, targets } = geometry;
    // Integer CSS targets preserve the same coordinates through CDP float transport.
    // Finger adds its seeded ±12 px noise after this conversion.
    const point = (x: number, y: number) => ({ id: 0,
        x: Math.round(box.x + (x * view.scale + view.x) * box.width / canvas.width),
        y: Math.round(box.y + (y * view.scale + view.y) * box.height / canvas.height) });
    // A real reserve tap precedes the first shot, even if the policy needs no swap.
    const beforeSwap = await hook.readDriver();
    await finger.touch('touchStart', [point(targets.next.x, targets.next.y)]);
    await finger.release();
    const afterSwap = await hook.readDriver();
    if (afterSwap.shots !== beforeSwap.shots || afterSwap.current !== beforeSwap.next || afterSwap.next !== beforeSwap.current)
        throw new Error('Le tap sur la réserve doit échanger sans tirer');
    let swaps = 1;
    for (let step = 0; step < 2000; step++) {
        const state = await hook.readDriver();
        if (state.status !== 'playing') return swaps;
        const aim = state.flight ? null : decision(state, view, 300);
        if (!aim) { await finger.advance(); continue; }
        if (aim.swap) {
            await finger.touch('touchStart', [point(targets.next.x, targets.next.y)]);
            await finger.release();
            swaps++;
            continue; // Observe the exchanged pearl and moving targets again.
        }
        await finger.touch('touchStart', [point(aim.x, aim.y)]);
        await finger.release();
    }
    throw new Error('Budget Collier épuisé');
}
