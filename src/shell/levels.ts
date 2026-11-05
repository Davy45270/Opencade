import type { Save } from './storage';
/**
 * Optional grouping of a long level list (Bubble): one tab per tier of `size` levels, named by `names`,
 * opened on the tier of level `current`. Without it, the list renders as before.
 */
export interface LevelGroups { size: number; names: readonly string[]; current: number }
/** Set while the list carries tier tabs, so a flat list after it (another game) puts the shell back as it was. */
let grouped = false;
export function renderLevels(levels: readonly { name: string }[], save: Save, choose: (index: number) => void, groups?: LevelGroups): void {
    const list = document.querySelector('#level-list');
    list?.replaceChildren();
    if (grouped) { document.querySelector('#level-tiers')?.remove(); list?.classList.remove('grouped'); grouped = false; }
    if (groups && list) { list.classList.add('grouped'); grouped = true; }
    const buttons = levels.map((level, index) => {
        const button = document.createElement('button');
        button.textContent = `${String(index + 1)} · ${level.name}${index >= save.unlocked ? ' 🔒' : ''}`;
        button.disabled = index >= save.unlocked;
        button.addEventListener('click', () => { choose(index); });
        return button;
    });
    if (list && groups && groups.size > 0) renderTiers(list, buttons, groups);
    else for (const button of buttons) list?.append(button);
    const best = document.querySelector('#best-score');
    if (best) best.textContent = `Meilleur score cumulé : ${String(save.best)}`;
}
/** Tabs above the list; every level button stays in the list, the other tiers' panels are hidden. */
function renderTiers(list: Element, buttons: readonly HTMLButtonElement[], { size, names, current }: LevelGroups): void {
    const count = Math.ceil(buttons.length / size);
    const strip = document.createElement('div');
    strip.id = 'level-tiers'; strip.setAttribute('role', 'tablist'); strip.setAttribute('aria-label', 'Paliers de niveaux');
    const tabs: HTMLButtonElement[] = [], panels: HTMLElement[] = [];
    const select = (tier: number): void => {
        tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === tier)); });
        panels.forEach((panel, i) => { panel.hidden = i !== tier; });
    };
    for (let tier = 0; tier < count; tier++) {
        const first = tier * size + 1, last = Math.min(buttons.length, first + size - 1), name = names[tier] ?? '';
        const tab = document.createElement('button');
        tab.id = `level-tier-${String(tier)}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `level-tier-panel-${String(tier)}`);
        tab.setAttribute('aria-label', `Niveaux ${String(first)} à ${String(last)}${name ? ` · ${name}` : ''}`);
        tab.textContent = `${String(first)}–${String(last)}`;
        if (name) { const label = document.createElement('small'); label.textContent = name; tab.append(label); }
        tab.addEventListener('click', () => { select(tier); });
        // Arrows move between tiers (tab pattern); Tab, Enter and Space keep their usual meaning.
        tab.addEventListener('keydown', event => {
            const to = { ArrowLeft: tier - 1, ArrowRight: tier + 1, Home: 0, End: count - 1 }[event.key];
            if (to === undefined) return;
            event.preventDefault();
            const next = (to + count) % count;
            select(next); tabs[next]?.focus();
        });
        const panel = document.createElement('div');
        panel.id = `level-tier-panel-${String(tier)}`; panel.className = 'level-tier';
        panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
        panel.append(...buttons.slice(first - 1, last));
        tabs.push(tab); panels.push(panel); strip.append(tab); list.append(panel);
    }
    list.before(strip);
    select(Math.min(count - 1, Math.max(0, Math.floor(current / size))));
}
