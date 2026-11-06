import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { KART_SPRITES, KART_VIEWS, chaseView, kartSprite, kartView } from '../src/games/derapage/kart-sprites';

const q = Math.PI / 4;

test('Z40 the drawn kart view follows the heading relative to the camera, 8 sectors of 45°', () => {
    // Relative heading 0 = the kart drives away from the camera; +π/2 = it drives to screen right, its right side faces us.
    const expected: [number, string][] = [[0, 'back'], [q, 'backRight'], [2 * q, 'right'], [3 * q, 'frontRight'], [4 * q, 'front'],
        [-3 * q, 'frontLeft'], [-2 * q, 'left'], [-q, 'backLeft'], [-4 * q, 'front']];
    for (const [angle, view] of expected) {
        expect(kartView(angle)).toBe(view);
        // Any whole turn gives the same view, and each sector spans ±22.5° around its centre.
        expect(kartView(angle + 2 * Math.PI)).toBe(view);
        expect(kartView(angle - 4 * Math.PI)).toBe(view);
        expect(kartView(angle + q * .45)).toBe(view);
        expect(kartView(angle - q * .45)).toBe(view);
    }
    expect(kartView(q * .55)).toBe('backRight');
});

test('Z41 the five mascots (Boubou, CaliRoux, Pestouille, Lumi, Tutu) have the 8 views and the top view; no drawn kart without a mascot', () => {
    for (const id of ['panda', 'pandaroux', 'dragon', 'licorne', 'singe'] as const) {
        for (const view of [...KART_VIEWS, 'top'] as const) {
            const key = kartSprite(id, view);
            expect(key).toBe(`${id}_${view}`);
            const s = key && KART_SPRITES[key];
            expect(s).toBeDefined();
            expect(existsSync(`src/games/derapage/karts/${String(key)}.webp`)).toBe(true);
            // One scale: every view has the same height; side views stand on the ground, the top view turns about its centre.
            expect(s?.h).toBe(84);
            if (view === 'top') { expect(s?.ox).toBe(.5); expect(s?.oy).toBe(.5); expect(s?.w).toBeLessThan(s?.h ?? 0); }
            else { expect(s?.oy).toBe(1); expect(s?.ox).toBeGreaterThan(.4); expect(s?.ox).toBeLessThan(.6); }
        }
        // A profile is longer than the back view is wide.
        expect(KART_SPRITES[`${id}_right`].w).toBeGreaterThan(KART_SPRITES[`${id}_back`].w * 1.2);
    }
    expect(kartSprite(undefined, 'back')).toBeUndefined();
});

test('Z42 the chased kart shows its ¾ back views when it turns or drifts, left or right by the turn, and keeps them without flicker', () => {
    // The camera follows the player's heading, so the angle to the camera is always 0: the view comes from the turn.
    // Heading east (angle 0), 20 units/s; a right turn raises the angle (screen right in the chase view).
    const straight = { angle: 0, vx: 20, vy: 0, driftMs: 0 };
    expect(chaseView(straight, { steer: 0 })).toBe('back');
    // Keyboard steering, full lock: ¾ back on the side of the turn (backRight = nose to screen right, right side seen).
    expect(chaseView(straight, { steer: 1 })).toBe('backRight');
    expect(chaseView(straight, { steer: -1 })).toBe('backLeft');
    // Joystick (3D view): the turn is the gap between the asked heading and the kart's heading.
    expect(chaseView(straight, { steer: 0, mode: 'joystick', heading: Math.PI / 2 })).toBe('backRight');
    expect(chaseView(straight, { steer: 0, mode: 'joystick', heading: -Math.PI / 2 })).toBe('backLeft');
    expect(chaseView(straight, { steer: 0, mode: 'joystick', heading: .05 })).toBe('back');
    // A light touch stays behind the threshold: no ¾ view for a lane change.
    expect(chaseView(straight, { steer: .3 })).toBe('back');
    // Drift: the nose is inside the turn, the velocity outside (gap heading/velocity), even with the stick released.
    const driftRight = { angle: .45, vx: 20 * Math.cos(-.1), vy: 20 * Math.sin(-.1), driftMs: 300 };
    expect(chaseView(driftRight, { steer: 0 })).toBe('backRight');
    const driftLeft = { angle: -.45, vx: 20 * Math.cos(.1), vy: 20 * Math.sin(.1), driftMs: 300 };
    expect(chaseView(driftLeft, { steer: 0 })).toBe('backLeft');
    // Threshold with hysteresis: a ¾ view once shown holds through a small easing, and only a clear return straightens it.
    expect(chaseView(straight, { steer: .5 })).toBe('back');
    expect(chaseView(straight, { steer: .5 }, 'backRight')).toBe('backRight');
    expect(chaseView(straight, { steer: .1 }, 'backRight')).toBe('back');
    // Spin-out: the kart slides backwards, the front views stay reachable for the player.
    const spun = { angle: Math.PI, vx: 20, vy: 0, driftMs: 0 };
    expect(chaseView(spun, { steer: 0 })).toBe('front');
    const sideways = { angle: Math.PI / 2, vx: 20, vy: 0, driftMs: 0 };
    expect(chaseView(sideways, { steer: 0 })).toBe('right');
    // Pivoting at low speed (race start), the velocity lags far behind the nose: still a ¾ view, never the front.
    const pivot = { angle: 2.2, vx: 8, vy: 0, driftMs: 0 };
    expect(chaseView(pivot, { steer: 0, mode: 'joystick', heading: 2.2 + Math.PI / 2 })).toBe('backRight');
    expect(chaseView({ ...pivot, angle: -2.2 }, { steer: 0, mode: 'joystick', heading: -2.2 - Math.PI / 2 })).toBe('backLeft');
    // Standing still: no velocity direction, only the steering counts (scaled down with speed).
    expect(chaseView({ angle: 0, vx: 0, vy: 0, driftMs: 0 }, { steer: 1 })).toBe('back');
    // The other karts keep the angle to the camera alone.
    expect(kartView(Math.PI)).toBe('front');
});
