import { describe, it, expect } from 'vitest';
import { swipeDirection, joystickDirection, logicalX, holdCount } from '../src/shell/gestures';
describe('A11 contrôles purs', () => {
    it('A11 seuils et quatre directions', () => {
        expect(swipeDirection(29, 0)).toBeNull();
        expect(swipeDirection(30, 0)).toBe('right');
        expect(swipeDirection(-31, 2)).toBe('left');
        expect(swipeDirection(0, -30)).toBe('up');
        expect(swipeDirection(0, 30)).toBe('down');
    });
    it('A12 joystick huit secteurs et zone morte', () => {
        expect(joystickDirection(1, 1)).toBeNull();
        for (let i = 0; i < 8; i++) expect(joystickDirection(50 * Math.cos(i * Math.PI / 4), 50 * Math.sin(i * Math.PI / 4))).toBe(i);
    });
    it('A13 conversion écran logique bornée avec décalage', () => {
        expect(logicalX(150, 50, 200, 360)).toBe(180);
        expect(logicalX(150, 50, 200, 360, -20)).toBe(160);
        expect(logicalX(-1, 50, 200, 360)).toBe(0);
        expect(logicalX(999, 50, 200, 360)).toBe(360);
    });
    it('A14 répétition hold aux frontières', () => {
        expect(holdCount(299)).toBe(0);
        expect(holdCount(300)).toBe(1);
        expect(holdCount(379)).toBe(1);
        expect(holdCount(380)).toBe(2);
        expect(holdCount(540)).toBe(4);
    });
});
