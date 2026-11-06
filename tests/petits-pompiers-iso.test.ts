import { expect, test } from 'vitest';
import { Engine, HEIGHT, LEVELS, WIDTH } from '../src/engines/petits-pompiers/engine';
import { stickDirection } from '../src/games/petits-pompiers/controls';
import { SLOPE, STICK_ARROWS, cell, cellAt, direction, groundPlan, objectPlan, project } from '../src/games/petits-pompiers/iso';
import { SPRITES } from '../src/games/petits-pompiers/sprites';
import { cameraView, cellOnScreen, onScreen } from '../src/games/petits-pompiers/view';

const frames = [{ width: 390, height: 724, top: 120 }, { width: 844, height: 270, top: 90 }, { width: 444, height: 580, top: 110 }];

test('PP-ISO-01 a touch on the displayed cell (gx, gy) gives that cell back', () => {
    const e = new Engine(); e.loadLevel(0);
    for (const frame of frames) {
        const view = cameraView(e, undefined, true, frame);
        for (let at = 0; at < WIDTH * HEIGHT; at++) {
            const c = onScreen(view, cell(at));
            // The centre and four points well inside the diamond (a 48×24 cell scaled on screen).
            for (const [dx, dy] of [[0, 0], [-.4, 0], [.4, 0], [0, -.4], [0, .4]] as const)
                expect(cellOnScreen(view, c.x + dx * 48 * view.scale, c.y + dy * 24 * view.scale)).toBe(at);
        }
        const outside = onScreen(view, project(-1, -1));
        expect(cellOnScreen(view, outside.x, outside.y)).toBe(-1);
    }
    for (let at = 0; at < WIDTH * HEIGHT; at++) expect(cellAt(cell(at).x, cell(at).y)).toBe(at);
});

test('PP-ISO-02 each stick arrow points where its push moves the firefighter on screen (1:2 slope)', () => {
    expect(SLOPE * 180 / Math.PI).toBeCloseTo(26.565, 2);
    for (const arrow of STICK_ARROWS) {
        // Where the finger pushes (the arrow sits there) is the grid step the engine receives…
        expect(stickDirection(arrow.dx * 38, arrow.dy * 38)).toEqual({ dx: arrow.dx, dy: arrow.dy });
        // …and the arrow's angle is the screen direction of that step, measured on two projected cells.
        const a = project(5, 5), b = project(5 + arrow.dx, 5 + arrow.dy), seen = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        expect(arrow.angle).toBeCloseTo(seen, 6);
        expect(Math.abs(Math.tan(seen * Math.PI / 180))).toBeCloseTo(.5, 6);
        expect(direction(arrow.dx, arrow.dy).x * (b.x - a.x) + direction(arrow.dx, arrow.dy).y * (b.y - a.y)).toBeGreaterThan(0);
    }
    expect(STICK_ARROWS.map(a => Math.round(a.angle * 100) / 100)).toEqual([26.57, 153.43, -153.43, -26.57]);
});

test('PP-ISO-03 every level: one ground diamond per cell, a sprite for every solid object, painter order', () => {
    const e = new Engine();
    for (let level = 0; level < LEVELS.length; level++) {
        e.loadLevel(level);
        const ground = groundPlan(e).filter(p => p.at >= 0), objects = objectPlan(e);
        expect(new Set(ground.map(p => p.at)).size).toBe(WIDTH * HEIGHT);
        for (const p of [...ground, ...objects]) expect(SPRITES[p.key]).toBeDefined();
        for (const [at, tile] of e.tiles.entries()) if ('XbB#'.includes(tile)) expect(objects.some(p => p.at === at)).toBe(true);
        const walls = e.tiles.filter(t => 'WDUTRSE'.includes(t)).length;
        expect(objects.filter(p => p.at < 0 && p.depth >= 100 + 0 && p.gx >= 0 && p.gy >= 0 && p.gx <= WIDTH && p.gy <= HEIGHT && p.key !== 'buisson_fleuri' && p.key !== 'souche' && p.key !== 'lampadaire').length).toBeGreaterThanOrEqual(walls);
        for (const a of objects) for (const b of objects) if (a.gx + a.gy + .5 < b.gx + b.gy && a.key === b.key) expect(a.depth).toBeLessThan(b.depth);
    }
});

test('PP-ISO-04 the drawn mascots face each of the 8 screen directions; Tutu keeps the vector art', async () => {
    const { mascotPose } = await import('../src/games/petits-pompiers/actors');
    const { existsSync } = await import('node:fs');
    // Grid step → screen direction: +x goes down-right, +y down-left (2:1 iso).
    const steps: [number, number, string][] = [[1, -1, 'E'], [1, 0, 'SE'], [1, 1, 'S'], [0, 1, 'SW'], [-1, 1, 'W'], [-1, 0, 'NW'], [-1, -1, 'N'], [0, -1, 'NE']];
    for (const id of ['panda', 'pandaroux', 'dragon', 'licorne'] as const) {
        for (const [dx, dy, pose] of steps) {
            const p = mascotPose(id, dx, dy);
            expect(p?.pose).toBe(pose);
            // West is the east profile mirrored; every other direction has its own view.
            expect(p?.key).toBe(`pompier_${id}_${pose === 'W' ? 'E' : pose}`);
            expect(p?.flip).toBe(pose === 'W');
            const s = p ? SPRITES[p.key] : undefined;
            expect(s).toBeDefined();
            expect(existsSync(`src/games/petits-pompiers/iso/${String(p?.key)}.webp`)).toBe(true);
            // Anchor at the feet: bottom of the texture, horizontally inside it; one common scale (≈ 36 world units).
            expect(s?.oy).toBeGreaterThan(.95); expect(s?.ox).toBeGreaterThan(.2); expect(s?.ox).toBeLessThan(.8);
            expect((s?.h ?? 0) / 3).toBeGreaterThan(33); expect((s?.h ?? 0) / 3).toBeLessThan(44);
        }
        // A joystick reading (not unit) gives the nearest of the 8 views.
        expect(mascotPose(id, .9, .2)?.pose).toBe('SE');
    }
    expect(mascotPose('singe', 1, 0)).toBeUndefined();
});
