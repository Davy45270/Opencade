import type { PlaySession } from './pause';

/** Keep simulation gated while allowing scenes to redraw their paused appearance. */
export function bindSessionUpdate(scene: { update(time: number, delta: number): void; updatePaused?(): void }, session: PlaySession): void {
    const update = scene.update.bind(scene);
    const changed = session.onChange;
    session.onChange = () => {
        changed?.();
        // Commit the sleeping pose before a paused snapshot can be read.
        if (session.paused) {
            if (scene.updatePaused) scene.updatePaused();
            else update(0, 0);
        }
    };
    scene.update = (time, delta) => {
        if (session.paused) scene.updatePaused?.();
        else update(time, delta);
    };
}
