import type { Save } from './storage';
export function renderLevels(levels: readonly { name: string }[], save: Save, choose: (index: number) => void): void {
    const list = document.querySelector('#level-list');
    list?.replaceChildren();
    levels.forEach((level, index) => {
        const button = document.createElement('button');
        button.textContent = `${String(index + 1)} · ${level.name}${index >= save.unlocked ? ' 🔒' : ''}`;
        button.disabled = index >= save.unlocked;
        button.addEventListener('click', () => { choose(index); });
        list?.append(button);
    });
    const best = document.querySelector('#best-score');
    if (best) best.textContent = `Meilleur score cumulé : ${String(save.best)}`;
}
