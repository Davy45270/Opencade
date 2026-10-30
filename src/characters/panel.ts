import { characters, drawList, ids, poses, expressions, type CharacterId, type Pose, type Expression } from './model';
import { renderCharacter } from './canvas';
import { selectedCharacter, selectCharacter } from './selection';
import type { Inputs } from '../shell/input';

/** Home-owned lifecycle: no animation survives leaving the home screen. */
export function setupCharacters(inputs: Inputs, testing = false): void {
    const toggle = document.querySelector<HTMLButtonElement>('#character-toggle');
    if (!toggle) return;
    toggle.hidden = false;
    toggle.setAttribute('aria-expanded', 'false');
    const dialog = document.createElement('dialog');
    dialog.id = 'characters-panel'; dialog.setAttribute('aria-labelledby', 'characters-title');
    const title = document.createElement('h2'); title.id = 'characters-title'; title.textContent = 'Nos compagnons';
    const intro = document.createElement('p'); intro.textContent = 'Un compagnon pour toutes vos prochaines aventures.';
    const close = document.createElement('button'); close.textContent = 'Fermer'; close.setAttribute('aria-label', 'Fermer le choix du personnage');
    const grid = document.createElement('div'); grid.className = 'character-grid';
    dialog.append(title, intro, close, grid); document.body.append(dialog);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const previews: { element: HTMLCanvasElement; id: CharacterId; special: boolean; pose: Pose; expression: Expression }[] = [];
    const buttons = new Map<CharacterId, HTMLButtonElement>();
    const makePreview = (id: CharacterId, size: number, pose: Pose = 'face', expression: Expression = 'joie'): HTMLCanvasElement => {
        const element = document.createElement('canvas');
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        element.width = Math.round(size * ratio); element.height = Math.round(size * ratio);
        element.style.width = `${String(size)}px`; element.style.height = `${String(size)}px`;
        element.setAttribute('aria-label', `${characters[id].fr}, ${pose}, ${expression}`); element.setAttribute('role', 'img');
        previews.push({ element, id, special: false, pose, expression }); return element;
    };
    for (const id of ids) {
        const card = document.createElement('article'); card.dataset.character = id;
        card.style.setProperty('--character-accent', characters[id].accent);
        const preview = makePreview(id, 192); preview.dataset.characterPreview = id;
        const name = document.createElement('h3'); name.textContent = characters[id].fr;
        const button = document.createElement('button'); button.textContent = 'Choisir'; button.setAttribute('aria-label', `Choisir ${characters[id].fr}`);
        buttons.set(id, button); card.append(preview, name, button); grid.append(card);
        const active = (value: boolean): void => { const item = previews.find(p => p.element === preview); if (item) item.special = value; paint(performance.now()); };
        for (const event of ['pointerenter', 'pointerdown', 'focusin']) inputs.on(card, event, () => { active(true); });
        for (const event of ['pointerleave', 'pointercancel', 'focusout']) inputs.on(card, event, () => { active(false); });
        inputs.on(button, 'click', () => { selectCharacter(id); sync(); dialog.close(); });
    }
    // Read-only review sheets are available only with the existing test URL flag.
    if (testing) {
        const review = document.createElement('details'); review.id = 'character-review';
        const summary = document.createElement('summary'); summary.textContent = 'Planches de relecture'; review.append(summary);
        for (const id of ids) for (const kind of ['poses', 'expressions'] as const) {
            const sheet = document.createElement('section'); sheet.dataset.sheet = `${id}-${kind}`; sheet.className = 'character-sheet';
            for (const value of kind === 'poses' ? poses : expressions) {
                const figure = document.createElement('figure');
                const preview = makePreview(id, 240, kind === 'poses' ? value as Pose : 'face', kind === 'expressions' ? value as Expression : 'joie');
                const caption = document.createElement('figcaption'); caption.textContent = value; figure.append(preview, caption); sheet.append(figure);
            }
            review.append(sheet);
        }
        dialog.append(review);
    }
    let pending: number | undefined, last = -Infinity;
    const paint = (time: number): void => {
        for (const p of previews) {
            if (!dialog.open || (!p.element.dataset.characterPreview && !p.element.closest('details[open]'))) continue;
            const context = p.element.getContext('2d'); if (!context) continue;
            context.clearRect(0, 0, p.element.width, p.element.height);
            renderCharacter(context, drawList(p.id, p.pose, p.expression, p.special ? 'special' : 'repos', time, media.matches ? 'reduce' : 'full'), 0, 0, p.element.height);
        }
    };
    const frame = (time: number): void => {
        pending = undefined;
        if (!dialog.open || document.hidden || media.matches) return;
        if (time - last >= 1000 / 15) { paint(time); last = time; }
        pending = requestAnimationFrame(frame);
    };
    const restart = (): void => {
        if (pending !== undefined) cancelAnimationFrame(pending); pending = undefined;
        paint(performance.now());
        if (dialog.open && !document.hidden && !media.matches) pending = requestAnimationFrame(frame);
    };
    const sync = (): void => {
        const id = selectedCharacter();
        toggle.replaceChildren();
        const head = document.createElement('canvas'); head.width = head.height = 96; head.style.width = head.style.height = '40px'; head.setAttribute('aria-hidden', 'true');
        const context = head.getContext('2d');
        if (context) { context.save(); context.translate(-28, -18); renderCharacter(context, drawList(id, 'face', 'joie', 'repos', 0, 'reduce'), 0, 0, 152); context.restore(); }
        const label = document.createElement('span'); label.textContent = 'Personnage'; toggle.append(head, label);
        toggle.dataset.selectedCharacter = id; toggle.setAttribute('aria-label', `Personnage : ${characters[id].fr}`);
        for (const [other, button] of buttons) { button.setAttribute('aria-pressed', String(other === id)); button.textContent = other === id ? 'Choisi' : 'Choisir'; }
    };
    inputs.on(toggle, 'click', () => { dialog.showModal(); toggle.setAttribute('aria-expanded', 'true'); restart(); close.focus(); });
    inputs.on(close, 'click', () => { dialog.close(); });
    inputs.on(dialog, 'close', () => { toggle.setAttribute('aria-expanded', 'false'); restart(); toggle.focus(); });
    inputs.on(dialog, 'click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); const e = event as MouseEvent; if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
    inputs.on(dialog, 'toggle', restart, { capture: true });
    inputs.on(media, 'change', restart); inputs.on(document, 'visibilitychange', restart);
    inputs.cleanup(() => { if (pending !== undefined) cancelAnimationFrame(pending); dialog.remove(); toggle.hidden = true; });
    sync();
}
