import { expect, test } from 'vitest';
import { SWIPE_PX, TAP_SLOP_PX, TAP_STEP_MS, due, land, lift, slide } from '../src/games/traverse/tap';

test('T-TAP-01 seuils nommés : 90 ms, 10 px de côté, glissé à 20 px', () => {
    expect([TAP_STEP_MS, TAP_SLOP_PX, SWIPE_PX]).toEqual([90, 10, 20]);
});

test('T-TAP-02 un toucher simple avance au relâcher, avant 90 ms', () => {
    const g = land(100, 300, 0);
    expect(due(g, 40)).toBe(false);
    expect(lift(g, 103, 302)).toBe('up');
    expect(due(g, 200)).toBe(false); // one step per gesture
});

test('T-TAP-03 un doigt immobile avance au plus tard 90 ms après l’appui, une seule fois', () => {
    const g = land(100, 300, 1000);
    expect(due(g, 1000 + TAP_STEP_MS - 1)).toBe(false);
    expect(slide(g, 100 + TAP_SLOP_PX, 300 + 4)).toBeNull(); // within the slop: still a tap
    expect(due(g, 1000 + TAP_STEP_MS)).toBe(true);
    expect(due(g, 1000 + 2 * TAP_STEP_MS)).toBe(false);
    expect(slide(g, 160, 300)).toBeNull();
    expect(lift(g, 160, 300)).toBeNull();
});

test('T-TAP-04 un glissé latéral rapide ne donne jamais de pas avant', () => {
    for (const side of [-1, 1]) for (const dt of [5, 30, 60, 89]) {
        const g = land(200, 300, 0), steps: string[] = [];
        // 11 px sideways before the deadline: the forward step is cancelled.
        expect(slide(g, 200 + side * 11, 301)).toBeNull();
        if (due(g, dt)) steps.push('up');
        if (due(g, TAP_STEP_MS + 50)) steps.push('up');
        const d = slide(g, 200 + side * 60, 296); if (d) steps.push(d);
        const l = lift(g, 200 + side * 60, 296); if (l) steps.push(l);
        expect(steps).toEqual([side < 0 ? 'left' : 'right']);
    }
});

test('T-TAP-05 un glissé court de côté puis relâché ne donne rien, ni pas avant ni pas de côté', () => {
    const g = land(200, 300, 0);
    expect(slide(g, 215, 300)).toBeNull();
    expect(due(g, 500)).toBe(false);
    expect(lift(g, 215, 300)).toBeNull();
});

test('T-TAP-06 vers le bas : un pas arrière, jamais un pas avant ; vers le haut : un seul pas avant', () => {
    const back = land(200, 300, 0);
    expect(slide(back, 200, 312)).toBeNull();
    expect(due(back, 200)).toBe(false);
    expect(slide(back, 200, 330)).toBe('down');
    const upward = land(200, 300, 0), steps: string[] = [];
    if (due(upward, TAP_STEP_MS)) steps.push('up');
    const d = slide(upward, 200, 250); if (d) steps.push(d);
    const l = lift(upward, 200, 250); if (l) steps.push(l);
    expect(steps).toEqual(['up']);
});
