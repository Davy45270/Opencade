import type { Inputs } from './input';
import { MOBILE_PLAY, type PlaySession } from './pause';

/**
 * The single pause page on touch screens: the fixed ⏸ opens it over a dark veil (the pause panel
 * with Reprendre at the bottom, and these entries above). Desktop keeps the inline menu.
 */
export function setupGameMenu(inputs: Inputs, session: PlaySession): void {
    const toggle = document.querySelector<HTMLButtonElement>('#pause');
    const legacy = document.querySelector<HTMLButtonElement>('#game-menu-toggle');
    const menu = document.querySelector<HTMLElement>('#game-menu');
    const mobile = matchMedia(MOBILE_PLAY);
    const close = (restore = true): void => {
        session.menuOpen = false;
        document.body.classList.remove('menu-open');
        if (mobile.matches) toggle?.setAttribute('aria-expanded', 'false'); else toggle?.removeAttribute('aria-expanded');
        session.onChange?.();
        if (restore) toggle?.focus();
    };
    const sync = (): void => {
        close(false);
        if (legacy) legacy.hidden = true;
        if (mobile.matches) toggle?.setAttribute('aria-controls', 'game-menu'); else toggle?.removeAttribute('aria-controls');
        menu?.setAttribute('aria-label', 'Pause');
        placeShellButtons(mobile.matches);
    };
    inputs.on(document.querySelector('#resume'), 'click', () => { if (session.menuOpen) close(false); });
    inputs.on(toggle, 'click', () => {
        if (!mobile.matches) return;
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
    inputs.cleanup(() => { close(false); placeShellButtons(false); });
    sync();
}

/** Home and sound sit in the top bar, or in the pause page while a touch game is played. */
function placeShellButtons(inPause: boolean): void {
    const bar = document.querySelector('#topbar');
    const menu = document.querySelector('#game-menu');
    const home = document.querySelector<HTMLElement>('#topbar > [data-home], #game-menu > [data-home]');
    const sound = document.querySelector<HTMLElement>('#sound');
    if (!bar || !menu || !home || !sound) return;
    if (inPause) {
        // Appended: the page still opens on its first entry (Niveaux).
        if (home.parentElement !== menu) menu.append(home);
        if (sound.parentElement !== menu) home.after(sound);
    } else {
        if (home.parentElement !== bar) bar.prepend(home);
        if (sound.parentElement !== bar) bar.querySelector('#game-menu-toggle')?.before(sound);
    }
    home.classList.toggle('pause-entry', inPause); sound.classList.toggle('pause-entry', inPause);
}
