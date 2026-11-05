/**
 * Adaptive play layout for touch screens.
 *
 * Every game renders a fixed 360×640 world with Phaser's FIT mode. On a short and wide screen
 * (a foldable's cover screen, a landscape phone), a control row under the canvas steals height and
 * FIT then leaves two empty bands on the sides. This module compares the two layouts and keeps
 * the one that gives the larger canvas:
 * - `bottom`: the control row stays under the canvas (the default, unchanged on tall phones);
 * - `side`: the left slot goes to the left band, the right slot to the right band, and the center
 *   slot joins the band holding fewer controls. The canvas then uses the full play height.
 */
export interface LayoutInput {
    /** Play section size, top bar excluded. */
    width: number;
    height: number;
    /** Height of the control row in the bottom layout. */
    rowHeight: number;
    /** Widest control of each column in the side layout, joystick excluded. */
    buttonWidth: number;
    /** Stacked height of the two side columns (center slot included in one of them). */
    columnHeight: number;
    hasJoystick: boolean;
    /** The game fills the DOM HUD: its row is then reserved above the canvas in both layouts. */
    hud?: boolean;
    /** World rows at the bottom of the canvas with no game information (Bombercade, Pompiers):
     *  in the side layout the joystick and the main action may overhang them, so the bands
     *  are sized for ordinary buttons only. */
    freeBottom?: number;
}
export interface LayoutChoice {
    mode: 'bottom' | 'side';
    /** A HUD row (with the ⏸) is reserved above the canvas: the game has a HUD, or it costs nothing. */
    hudRow: boolean;
    /** Side layout only: the bottom controls overhang the canvas's free bottom rows. */
    overhang?: boolean;
    band: number;
    joystick: number;
    area: number;
}
export const WORLD = { width: 360, height: 640 } as const;
export const HUD_ROW = 52;
/** Side columns sit inside the 16 px control gutters, outside the canvas. */
const CONTROL_GUTTER = 16;
const BAND_PADDING = 8;
const SIDE_GAIN = 1.03;
const MIN_BUTTON = 56;
/** Main action size (solution retenue: 72 px), the largest control allowed to overhang. */
const MAIN_ACTION = 72;
// Side bands may shrink the joystick, never under 80 px (bottom layout keeps 120 px).
const JOYSTICK_SIZES = [120, 104, 96, 88, 80] as const;
export function fitArea(width: number, height: number): number {
    if (width <= 0 || height <= 0) return 0;
    const scale = Math.min(width / WORLD.width, height / WORLD.height);
    return WORLD.width * scale * WORLD.height * scale;
}
/** Pure choice, unit-tested: the side layout must beat the bottom one by a clear margin. */
export function chooseLayout(input: LayoutInput): LayoutChoice {
    const free = input.height - input.rowHeight;
    const hudRow = input.hud === true || (free - HUD_ROW) * WORLD.width / WORLD.height >= input.width;
    const bottom: LayoutChoice = { mode: 'bottom', hudRow, band: 0, joystick: 120, area: fitArea(input.width, free - (hudRow ? HUD_ROW : 0)) };
    if (input.columnHeight + 2 * 8 > input.height) return bottom;
    let best = bottom;
    for (const joystick of input.hasJoystick ? JOYSTICK_SIZES : [120]) {
        const band = Math.ceil(Math.max(input.buttonWidth, input.hasJoystick ? joystick : 0) + BAND_PADDING);
        const area = fitArea(input.width - 2 * (band + CONTROL_GUTTER), input.height - (input.hud ? HUD_ROW : 0));
        if (area > best.area * (best === bottom ? SIDE_GAIN : 1)) best = { mode: 'side', hudRow: input.hud === true, band, joystick, area };
    }
    if (input.freeBottom && input.freeBottom > 0) {
        // Bands sized for a 56 px button; the larger bottom controls overhang the free rows.
        const band = MIN_BUTTON + BAND_PADDING, height = input.height - (input.hud ? HUD_ROW : 0);
        const width = input.width - 2 * (band + CONTROL_GUTTER), scale = Math.min(width / WORLD.width, height / WORLD.height);
        const strip = input.freeBottom * scale + (height - WORLD.height * scale) / 2 - BAND_PADDING;
        const joystick = input.hasJoystick ? JOYSTICK_SIZES.find(size => size <= strip) : MIN_BUTTON;
        const area = fitArea(width, height);
        if (joystick !== undefined && MAIN_ACTION <= strip && area > best.area * (best === bottom ? SIDE_GAIN : 1)) best = { mode: 'side', hudRow: input.hud === true, band, joystick, area, overhang: true };
    }
    return best;
}

const MOBILE = '(pointer: coarse), (width < 600px)';
function visibleChildren(slot: Element | null | undefined): HTMLElement[] {
    return slot ? [...slot.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e.getClientRects().length > 0) : [];
}
function stackHeight(elements: HTMLElement[]): number {
    return elements.reduce((sum, e) => sum + e.getBoundingClientRect().height, 0) + Math.max(0, elements.length - 1) * 6;
}
/** Applies the best layout; cheap when nothing that matters changed. */
export function installAdaptiveLayout(): void {
    const body = document.body;
    const play = document.querySelector<HTMLElement>('#play');
    const controls = document.querySelector<HTMLElement>('#touch-controls');
    const hud = document.querySelector<HTMLElement>('#hud');
    if (!play || !controls) return;
    const media = matchMedia(MOBILE);
    let signature = '';
    let frame = 0;
    const clear = (): void => {
        body.classList.remove('side-controls', 'side-center-left', 'hud-row', 'side-overhang');
        body.style.removeProperty('--side-band'); body.style.removeProperty('--side-joystick');
    };
    const update = (): void => {
        frame = 0;
        const slots = ['left', 'center', 'right'].map(name => controls.querySelector(`.touch-slot.${name}`));
        const items = slots.map(slot => slot ? [...slot.children].filter(e => !(e as HTMLElement).hidden).map(e => e.id || e.className).join(',') + ((slot as HTMLElement).dataset.group ?? '') : '').join('|');
        const freeBottom = Number(body.dataset.freeBottom ?? 0);
        const fill = body.classList.contains('fill-screen');
        const next = `${String(fill)}|${String(innerWidth)}x${String(innerHeight)}|${String(media.matches)}|${String(body.classList.contains('playing'))}|${items}|${String(hud?.hidden === false || hud?.dataset.reserve === 'true')}|${String(freeBottom)}`;
        if (next === signature) return;
        signature = next;
        if (!media.matches || !body.classList.contains('playing') || !items.replace(/[|,]/g, '')) { clear(); return; }
        // Full-screen games: the world fills the screen above the bottom bar, never side bands.
        if (fill) { clear(); return; }
        // Bottom layout measurements.
        clear();
        const rect = play.getBoundingClientRect();
        const rowHeight = controls.getBoundingClientRect().height;
        if (rect.width <= 0 || rect.height <= 0) return;
        // Side layout measurements: columns are laid out at their natural width first.
        const left = visibleChildren(slots[0]), center = visibleChildren(slots[1]), right = visibleChildren(slots[2]);
        const centerLeft = left.length < right.length;
        body.classList.add('side-controls');
        body.classList.toggle('side-center-left', centerLeft);
        body.style.setProperty('--side-band', '240px');
        body.style.setProperty('--side-joystick', '80px');
        const measured = [...left, ...center, ...right];
        const joystick = measured.some(e => e.classList.contains('joystick'));
        // A grouped slot (Dédale's optional cross) is as wide as the whole group.
        const groups = slots.filter((slot): slot is HTMLElement => slot instanceof HTMLElement && Boolean(slot.dataset.group)).map(slot => slot.getBoundingClientRect().width);
        const buttonWidth = Math.max(56, ...groups, ...measured.filter(e => !e.classList.contains('joystick') && e.tagName !== 'OUTPUT').map(e => e.getBoundingClientRect().width));
        const leftColumn = centerLeft ? [...left, ...center] : left;
        const rightColumn = centerLeft ? right : [...right, ...center];
        const columnHeight = Math.max(stackHeight(leftColumn), stackHeight(rightColumn));
        const choice = chooseLayout({ width: rect.width, height: rect.height, rowHeight, buttonWidth, columnHeight, hasJoystick: joystick, hud: hud?.hidden === false || hud?.dataset.reserve === 'true', freeBottom });
        if (choice.mode === 'bottom') { clear(); body.classList.toggle('hud-row', choice.hudRow); return; }
        body.classList.toggle('hud-row', choice.hudRow);
        body.classList.toggle('side-overhang', choice.overhang === true);
        body.style.setProperty('--side-band', `${String(choice.band)}px`);
        body.style.setProperty('--side-joystick', `${String(choice.joystick)}px`);
    };
    const schedule = (): void => { if (!frame) frame = requestAnimationFrame(update); };
    new MutationObserver(schedule).observe(controls, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-group'] });
    new MutationObserver(schedule).observe(play, { attributes: true, attributeFilter: ['hidden'] });
    if (hud) new MutationObserver(schedule).observe(hud, { attributes: true, attributeFilter: ['data-reserve'] });
    if (hud) new MutationObserver(schedule).observe(hud, { attributes: true, attributeFilter: ['hidden'] });
    addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    schedule();
}
