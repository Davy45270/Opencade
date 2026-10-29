import { it, expect } from 'vitest';
import { PlaySession, transition } from '../src/shell/pause';
it('A15 prêt démarrer pause reprendre et arrière-plan', () => {
    const session = new PlaySession(true);
    expect(session.state).toBe('ready'); expect(session.paused).toBe(true);
    session.send('start'); expect(session.paused).toBe(false);
    session.send('toggle'); expect(session.state).toBe('paused'); expect(session.paused).toBe(true);
    session.send('toggle'); expect(session.state).toBe('playing');
    session.send('hide'); expect(session.state).toBe('paused');
    expect(transition('ready', 'hide')).toBe('ready');
    expect(transition('paused', 'hide')).toBe('paused');
});
it('A15 Bubble sans pause ni écran prêt', () => {
    const session = new PlaySession(false);
    for (const event of ['toggle', 'hide', 'start'] as const) {
        session.send(event); expect(session.state).toBe('playing'); expect(session.paused).toBe(false);
    }
});
