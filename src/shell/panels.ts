export function renderPanels(status: string, state: string, level: number, score: number, total: number, selecting: boolean): void {
    const panel = document.querySelector<HTMLElement>('#result');
    if (panel) panel.hidden = status === 'playing' || selecting;
    const levels = document.querySelector<HTMLElement>('#levels');
    if (levels) levels.hidden = status !== 'playing' && !selecting;
    const title = document.querySelector('#result-title');
    if (title) title.textContent = status === 'lost' ? 'Défaite' : state === 'complete' ? 'Tous les niveaux réussis !' : `Niveau ${String(level + 1)} réussi`;
    const scores = document.querySelector('#result-scores');
    if (scores) scores.textContent = `Score du niveau : ${String(score)} · Score cumulé : ${String(total)}`;
    const next = document.querySelector<HTMLButtonElement>('#next-level');
    if (next) next.hidden = state !== 'won';
    const retry = document.querySelector<HTMLButtonElement>('#retry-level');
    if (retry) retry.hidden = status !== 'lost';
    const replay = document.querySelector<HTMLButtonElement>('#replay-level');
    if (replay) replay.hidden = status === 'lost';
    const select = document.querySelector<HTMLElement>('#level-select');
    if (select) select.hidden = !selecting;
}
