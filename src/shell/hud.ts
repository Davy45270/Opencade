/**
 * Shared DOM HUD drawn above the canvas, so its size does not follow the canvas scale.
 * Three slots: top left (progress, lives), center (score), top right (goal or counter), the
 * fixed ⏸ standing at the right of the row. Games fill it one by one; empty, it stays hidden.
 */
export type HudSlot = 'left' | 'center' | 'right';
export interface HudItem {
    /** Pictogram or short tag (≥ 12 px rendered). */
    icon?: string;
    /** Number or very short value (≥ 18 px rendered). */
    value: string;
    /** Accessible name of the item. */
    label: string;
    /** A gauge: share of the allowed limit (0..1 and above), drawn as a bar; past 1 the item turns red. */
    gauge?: number;
}
function root(): HTMLElement | null { return document.querySelector<HTMLElement>('#hud'); }
export function setHud(slot: HudSlot, items: readonly HudItem[]): void {
    const hud = root();
    const target = hud?.querySelector<HTMLElement>(`.hud-slot.${slot}`);
    if (!hud || !target) return;
    const key = JSON.stringify(items);
    if (target.dataset.key === key) return;
    target.dataset.key = key;
    target.replaceChildren(...items.map(item => {
        const element = document.createElement('span');
        element.className = 'hud-item'; element.title = item.label;
        if (item.icon) { const icon = document.createElement('span'); icon.className = 'hud-icon'; icon.textContent = item.icon; element.append(icon); }
        const value = document.createElement('span'); value.className = 'hud-value'; value.textContent = item.value;
        element.append(value);
        if (item.gauge !== undefined) {
            element.classList.add('hud-gauge'); element.classList.toggle('over', item.gauge > 1);
            element.style.setProperty('--gauge', String(Math.min(1, Math.max(0, item.gauge))));
        }
        return element;
    }));
    hud.hidden = [...hud.querySelectorAll('.hud-slot')].every(element => element.childElementCount === 0);
}
/** Level goal and tip, shown in the pause page on touch screens (the canvas text is too small there). */
export function setBrief(text: string): void {
    const brief = document.querySelector<HTMLElement>('#level-brief');
    if (!brief || brief.textContent === text) return;
    brief.textContent = text; brief.hidden = text === '';
}
/** Keeps the HUD row free for the ⏸ even with an empty HUD (a game whose canvas draws its own top-right tile). */
export function reserveHudRow(on = true): void {
    const hud = root();
    if (!hud) return;
    if (on) hud.dataset.reserve = 'true'; else delete hud.dataset.reserve;
}
export function clearHud(): void {
    setBrief('');
    const hud = root();
    if (!hud) return;
    delete hud.dataset.reserve;
    for (const slot of hud.querySelectorAll<HTMLElement>('.hud-slot')) { slot.replaceChildren(); delete slot.dataset.key; }
    hud.hidden = true;
}
