import type { Device } from './device';
import { Inputs } from './input';
export type PlayState = 'ready' | 'playing' | 'paused';
export type PlayEvent = 'start' | 'toggle' | 'hide';
export function transition(state: PlayState, event: PlayEvent): PlayState {
    if (event === 'hide') return state === 'playing' ? 'paused' : state;
    if (event === 'start') return 'playing';
    return state === 'playing' ? 'paused' : 'playing';
}
/** Shared gate: realtime scenes must check paused before advancing their engine. */
export class PlaySession {
    state: PlayState;
    menuOpen = false;
    onChange?: () => void;
    constructor(readonly realtime: boolean, readonly device?: Device) { this.state = realtime ? 'ready' : 'playing'; }
    get paused(): boolean { return this.menuOpen || (this.realtime && this.state !== 'playing'); }
    send(event: PlayEvent): void { if (this.realtime) { this.state = transition(this.state, event); this.onChange?.(); } }
}
/** Touch screens: no bar in play, a fixed ⏸ opens the single pause page (see menu.ts). */
export const MOBILE_PLAY = '(pointer: coarse), (width < 600px)';
export function setupPause(inputs: Inputs, session: PlaySession): void {
    const mobile = matchMedia(MOBILE_PLAY);
    const panel = document.querySelector<HTMLElement>('#pause-panel');
    const title = document.querySelector('#pause-title');
    const button = document.querySelector<HTMLButtonElement>('#pause');
    const sync = (): void => {
        session.device?.setPlaying(!session.paused);
        if (button) { button.hidden = !session.realtime && !mobile.matches; button.setAttribute('aria-pressed', String(session.state === 'paused' || session.menuOpen)); }
        // Mobile: the panel is the pause page, shown with the menu; desktop keeps panel and menu apart.
        if (panel) panel.hidden = mobile.matches ? !session.paused : session.menuOpen || !session.paused;
        document.body.classList.toggle('play-ready', session.realtime && session.state === 'ready' && !session.menuOpen);
        if (title) title.textContent = session.state === 'ready' && !session.menuOpen ? 'Prêt ?' : 'En pause';
        const resume = document.querySelector('#resume');
        if (resume) resume.textContent = session.state === 'ready' ? 'Jouer' : 'Reprendre';
    };
    session.onChange = sync;
    inputs.cleanup(() => { session.onChange = undefined; if (button) button.hidden = true; });
    const send = (event: PlayEvent): void => { session.send(event); sync(); };
    inputs.on(button, 'click', () => { if (!mobile.matches) send('toggle'); });
    inputs.on(mobile, 'change', sync);
    inputs.on(document.querySelector('#resume'), 'click', () => { send('start'); });
    inputs.on(document, 'keydown', event => {
        const e = event as KeyboardEvent;
        if (session.menuOpen) return;
        if (session.state === 'ready' && !e.repeat && ['Space', 'Enter'].includes(e.code)) { e.preventDefault(); send('start'); return; }
        if (session.realtime && !e.repeat && ['KeyP', 'Escape'].includes(e.code)) { e.preventDefault(); send('toggle'); }
    });
    inputs.on(document, 'visibilitychange', () => { session.device?.setVisible(!document.hidden); if (document.hidden) send('hide'); });
    session.device?.setVisible(!document.hidden);
    inputs.cleanup(() => { session.device?.setPlaying(false); });
    // The first touch starts play and still reaches the game: it is the first move or shot.
    const area = document.querySelector('#play-area');
    inputs.on(area, 'pointerdown', event => {
        const e = event as PointerEvent;
        if (e.pointerType === 'touch' && session.state === 'ready' && !session.menuOpen) send('start');
    }, { capture: true });
    sync();
}
