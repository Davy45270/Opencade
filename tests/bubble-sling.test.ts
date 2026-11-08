import { expect, test } from 'vitest';
import { Engine, AIM_MAX, AIM_MIN, ORIGIN, pastLine, type Cell, type Color } from '../src/engines/bubble/engine';
import { CANCEL_RADIUS, POINT_LINE, PULL_LINE, touchAim } from '../src/games/bubble/aiming';
// B-SLING-01: above the launcher the finger aims as before; below it, it pulls a sling and the shot
// leaves the other way; on the launcher, the release cancels; every aim angle is reachable by a pull
// that stays on the 360 x 640 board.
test('B-SLING-01 viser au-dessus, tirer en arrière dessous, annuler sur le lanceur', () => {
    for (let x = 0; x <= 360; x += 15) for (let y = 0; y < POINT_LINE; y += 15) {
        const aim = touchAim({ x, y });
        if (Math.hypot(x - ORIGIN.x, y - ORIGIN.y) < CANCEL_RADIUS) { expect(aim.mode).toBe('cancel'); continue; }
        expect(aim).toEqual({ mode: 'point', angle: Math.atan2(x - ORIGIN.x, ORIGIN.y - y) });
    }
    let pulls = 0;
    for (let x = 0; x <= 360; x += 15) for (let y = PULL_LINE + 1; y <= 640; y += 7) {
        const aim = touchAim({ x, y });
        if (Math.hypot(x - ORIGIN.x, y - ORIGIN.y) < CANCEL_RADIUS) { expect(aim.mode).toBe('cancel'); continue; }
        // A pull at p aims exactly like pointing at the mirror point 2 * ORIGIN - p.
        const mx = 2 * ORIGIN.x - x, my = 2 * ORIGIN.y - y;
        expect(aim).toEqual({ mode: 'pull', angle: Math.atan2(mx - ORIGIN.x, ORIGIN.y - my) });
        pulls++;
    }
    expect(pulls).toBeGreaterThan(100);
    expect(touchAim(ORIGIN).mode).toBe('cancel');
    expect(touchAim({ x: ORIGIN.x, y: ORIGIN.y + CANCEL_RADIUS - 1 }).mode).toBe('cancel');
    expect(touchAim({ x: 20, y: ORIGIN.y }).mode).toBe('hold');
    for (let angle = AIM_MIN; angle <= AIM_MAX; angle += 0.01) {
        let found = false;
        for (let r = CANCEL_RADIUS; r < 400 && !found; r += 2) {
            const p = { x: ORIGIN.x - Math.sin(angle) * r, y: ORIGIN.y + Math.cos(angle) * r }, aim = touchAim(p);
            found = p.x >= 0 && p.x <= 360 && p.y <= 640 && aim.mode === 'pull' && Math.abs(aim.angle - angle) < 1e-9;
        }
        expect(found).toBe(true);
    }
});
// B-LOSS-01: a column shot straight down reaches the loss line; the line is in danger exactly while a
// bubble is one row from it, and the defeat names the bubbles that crossed it.
test('B-LOSS-01 ligne en danger à une rangée, défaite qui désigne la bulle fautive', () => {
    const e = new Engine(7); let grid: Cell[] = [{ row: 0, col: 0, color: 1 }, { row: 0, col: 8, color: 0 }], color: Color = 0, dangerShots = 0;
    e.load(grid, color, 7);
    for (let shot = 0; shot < 20 && e.status === 'playing'; shot++) {
        const wasDanger = e.danger();
        if (wasDanger) dangerShots++;
        e.aim(0); e.shoot(); e.advance(10000);
        if (e.snapshot().status === 'lost') {
            expect(wasDanger).toBe(true);
            expect(e.culprits().length).toBeGreaterThan(0);
            for (const c of e.culprits()) expect(pastLine(c, e.drops)).toBe(true);
            expect(e.danger()).toBe(false);
            break;
        }
        expect(e.culprits()).toEqual([]);
        grid = e.grid; color = color === 0 ? 1 : 0;
        e.load(grid, color, 7);
    }
    expect(e.status).toBe('lost');
    expect(dangerShots).toBe(1);
    // A board two rows clear of the line is calm.
    const calm = new Engine(7); calm.load(Array.from({ length: 11 }, (_, row) => ({ row, col: 4, color: (row % 2) as Color })), 0, 7);
    expect(calm.danger()).toBe(false);
});
