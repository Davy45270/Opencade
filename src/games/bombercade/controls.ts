import type { Direction } from '../../engines/bombercade/engine';

/** Match the eight sectors emitted synchronously by the shared joystick. */
export function cardinalDirection(sector: number | null): Direction | null {
    const cardinal: readonly Direction[] = ['right', 'down', 'down', 'left', 'left', 'up', 'up', 'right'];
    return sector === null ? null : cardinal[sector] ?? null;
}
