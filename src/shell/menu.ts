import type { Inputs } from './input';
import type { PlaySession } from './pause';

/** A presentation gate, independent of routing and of the test hooks. */
export function setupGameMenu(inputs: Inputs, session: PlaySession): void {
    const toggle = document.querySelector<HTMLButtonElement>('#game-menu-toggle');
    const menu = document.querySelector<HTMLElement>('#game-menu');
    const mobile = matchMedia('(pointer: coarse), (width < 600px)');
    const close = (restore = true): void => {
        session.menuOpen = false;
        document.body.classList.remove('menu-open');
        toggle?.setAttribute('aria-expanded', 'false');
        session.onChange?.();
        if (restore) toggle?.focus();
    };
    const sync = (): void => {
        close(false);
        if (toggle) toggle.hidden = !mobile.matches;
        menu?.setAttribute('aria-label', 'Menu du jeu');
    };
    inputs.on(toggle, 'click', () => {
        if (session.menuOpen) { close(); return; }
        session.menuOpen = true;
        document.body.classList.add('menu-open');
        toggle?.setAttribute('aria-expanded', 'true');
        session.onChange?.();
        menu?.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus();
    });
    inputs.on(document, 'keydown', event => {
        if (!session.menuOpen) return;
        const e = event as KeyboardEvent;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
        if (e.key !== 'Tab' && e.key !== 'Escape') {
            const activatesButton = ['Enter', ' '].includes(e.key) && e.target instanceof HTMLButtonElement;
            if (!activatesButton) e.preventDefault();
            e.stopImmediatePropagation();
        }
        if (e.key === 'Tab') {
            const targets = [toggle, ...Array.from(menu?.querySelectorAll<HTMLButtonElement>('button:not([hidden])') ?? [])].filter((item): item is HTMLButtonElement => Boolean(item));
            const index = targets.indexOf(document.activeElement as HTMLButtonElement);
            const next = targets[(index + (e.shiftKey ? -1 : 1) + targets.length) % targets.length];
            e.preventDefault(); next?.focus();
        }
    }, { capture: true });
    for (const id of ['levels', 'restart']) inputs.on(document.querySelector(`#${id}`), 'click', () => { close(); });
    inputs.on(mobile, 'change', sync);
    inputs.cleanup(() => { close(false); if (toggle) toggle.hidden = true; });
    sync();
}
