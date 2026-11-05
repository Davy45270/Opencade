import { describe, it, expect } from 'vitest';
import { chooseLayout, fitArea } from '../src/shell/layout';
// Play section = viewport minus the 44 px top bar.
const fold = { width: 405, height: 436 }, phone = { width: 412, height: 736 };
describe('L01 mise en page adaptative', () => {
    it('L01 FIT garde le rapport 9:16', () => {
        expect(fitArea(360, 640)).toBe(360 * 640);
        expect(fitArea(720, 640)).toBe(360 * 640);
        expect(fitArea(0, 640)).toBe(0);
    });
    it('L02 écran externe de pliable : commandes dans les bandes latérales', () => {
        const choice = chooseLayout({ ...fold, rowHeight: 64, buttonWidth: 56, columnHeight: 242, hasJoystick: false });
        expect(choice.mode).toBe('side');
        expect(choice.band).toBe(64);
        expect(choice.area).toBeGreaterThan(1.3 * fitArea(405, 436 - 64));
    });
    it('L03 téléphone haut : la rangée du bas reste', () => {
        for (const size of [phone, { width: 360, height: 596 }, { width: 390, height: 706 }, { width: 430, height: 816 }, { width: 390, height: 800 }])
            expect(chooseLayout({ ...size, rowHeight: 64, buttonWidth: 64, columnHeight: 242, hasJoystick: false }).mode).toBe('bottom');
    });
    it('L04 joystick : réduit jusqu’à 80 px seulement si le canevas y gagne', () => {
        const choice = chooseLayout({ ...fold, rowHeight: 120, buttonWidth: 64, columnHeight: 200, hasJoystick: true });
        expect(choice).toMatchObject({ mode: 'side', joystick: 80, band: 88 });
        expect(chooseLayout({ width: 780, height: 368, rowHeight: 120, buttonWidth: 64, columnHeight: 200, hasJoystick: true }).joystick).toBe(120);
    });
    it('L06 rangée de HUD réservée seulement si elle ne coûte rien', () => {
        expect(chooseLayout({ ...phone, rowHeight: 64, buttonWidth: 56, columnHeight: 242, hasJoystick: false }).hudRow).toBe(false);
        expect(chooseLayout({ width: 390, height: 844, rowHeight: 64, buttonWidth: 56, columnHeight: 242, hasJoystick: false })).toMatchObject({ mode: 'bottom', hudRow: true });
        expect(chooseLayout({ ...fold, rowHeight: 64, buttonWidth: 56, columnHeight: 242, hasJoystick: false }).hudRow).toBe(false);
    });
    it('L07 un jeu qui remplit le HUD réserve sa rangée, en bas comme sur les côtés', () => {
        const bottom = chooseLayout({ ...phone, rowHeight: 64, buttonWidth: 56, columnHeight: 56, hasJoystick: false, hud: true });
        expect(bottom).toMatchObject({ mode: 'bottom', hudRow: true });
        expect(bottom.area).toBeCloseTo(fitArea(412, 736 - 64 - 52));
        const side = chooseLayout({ width: 405, height: 480, rowHeight: 64, buttonWidth: 56, columnHeight: 56, hasJoystick: false, hud: true });
        expect(side).toMatchObject({ mode: 'side', hudRow: true });
        expect(side.area).toBeCloseTo(fitArea(405 - 2 * (64 + 16), 480 - 52));
    });
    it('L08 bas du canevas libre : joystick et action principale débordent, bandes de bouton ordinaire', () => {
        const input = { width: 405, height: 480, rowHeight: 132, buttonWidth: 64, columnHeight: 200, hasJoystick: true };
        expect(chooseLayout(input)).toMatchObject({ mode: 'bottom' });
        const choice = chooseLayout({ ...input, freeBottom: 100 });
        expect(choice).toMatchObject({ mode: 'side', band: 64, joystick: 80, overhang: true });
        // Same canvas as the other side games: 245 px wide, at least 237 x 421.
        expect(choice.area).toBeCloseTo(fitArea(245, 480));
        expect(Math.sqrt(choice.area * 360 / 640)).toBeGreaterThanOrEqual(237);
        // No free row deep enough for an 80 px joystick: the ordinary choice stands.
        expect(chooseLayout({ ...input, height: 436, freeBottom: 40 }).overhang).toBeUndefined();
    });
    it('L05 colonnes trop hautes : pas de bandes latérales', () => {
        expect(chooseLayout({ width: 780, height: 300, rowHeight: 64, buttonWidth: 56, columnHeight: 300, hasJoystick: false }).mode).toBe('bottom');
    });
});
