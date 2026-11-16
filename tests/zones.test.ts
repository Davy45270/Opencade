import { describe, it, expect } from 'vitest';
import { PAUSE_HEIGHT, planZones, screenRect } from '../src/games/zones';

const hud = { x: 0, y: 0, w: 360, h: 188 }, board = { x: 6, y: 178, w: 348, h: 428 };
const meets = (a: { x: number; y: number; w: number; h: number }, b: typeof a): boolean => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
describe('plan plein écran à deux régions', () => {
    for (const [w, h] of [[360, 300], [360, 350], [390, 530], [390, 710], [844, 260], [820, 1050], [1280, 700]] as const) it(`${String(w)}×${String(h)} : bandeau et plateau dans le canevas, sans se recouvrir`, () => {
        const p = planZones(w, h, hud, board, { pauseCorner: 0 });
        for (const s of [p.hud, p.board]) {
            expect(s.view.x).toBeGreaterThanOrEqual(-0.01); expect(s.view.y).toBeGreaterThanOrEqual(-0.01);
            expect(s.view.x + s.view.w).toBeLessThanOrEqual(w + 0.01); expect(s.view.y + s.view.h).toBeLessThanOrEqual(h + 0.01);
            expect(s.view.w / s.zone.w).toBeCloseTo(s.zoom); expect(s.view.h / s.zone.h).toBeCloseTo(s.zoom);
        }
        expect(meets(p.hud.view, p.board.view)).toBe(false);
        expect(p.hud.zoom).toBeGreaterThanOrEqual(0.5);
        expect(p.hud.zoom).toBeLessThanOrEqual(Math.max(0.5, p.board.zoom * 1.25) + 1e-9);
        expect(screenRect(p.board, board)).toEqual(p.board.view);
    });
    for (const [w, h] of [[360, 300], [390, 710], [844, 260], [820, 1050]] as const) it(`${String(w)}×${String(h)} : le coin du ⏸ reste libre`, () => {
        const p = planZones(w, h, hud, board, { pauseCorner: 60 }), corner = { x: w - 60, y: 0, w: 60, h: PAUSE_HEIGHT };
        expect(meets(p.hud.view, corner)).toBe(false); expect(meets(p.board.view, corner)).toBe(false);
        expect(meets(p.hud.view, p.board.view)).toBe(false);
    });
});
