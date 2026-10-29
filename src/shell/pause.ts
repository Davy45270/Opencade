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
export function setupPause(inputs: Inputs, session: PlaySession): void {
    const panel = document.querySelector<HTMLElement>('#pause-panel');
    const title = document.querySelector('#pause-title');
    const button = document.querySelector<HTMLButtonElement>('#pause');
    const sync = (): void => {
        session.device?.setPlaying(!session.paused);
        if (button) { button.hidden = !session.realtime; button.setAttribute('aria-pressed', String(session.state === 'paused')); }
        if (panel) panel.hidden = session.menuOpen || !session.paused;
        if (title) title.textContent = session.state === 'ready' ? 'Prêt ?' : 'En pause';
        const resume = document.querySelector('#resume');
        if (resume) resume.textContent = session.state === 'ready' ? 'Jouer' : 'Reprendre';
    };
    session.onChange = sync;
    inputs.cleanup(() => { session.onChange = undefined; if (button) button.hidden = true; });
    const send = (event: PlayEvent): void => { session.send(event); sync(); };
    inputs.on(button, 'click', () => { send('toggle'); });
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
    let starting: number | null = null;
    const area = document.querySelector('#play-area');
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) inputs.on(area, type, event => {
        const e = event as PointerEvent;
        if (type === 'pointerdown') starting = null;
        if (type === 'pointerdown' && e.pointerType === 'touch' && session.state === 'ready' && !session.menuOpen) starting = e.pointerId;
        if (starting === null) return;
        if (type !== 'click' && e.pointerId !== starting) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (type === 'pointerup') send('start');
        if (type === 'pointercancel' || type === 'click') starting = null;
    }, { capture: true });
    sync();
}
