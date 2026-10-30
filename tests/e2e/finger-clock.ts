/** Reaction horizon measured in simulation time, independent of host rendering speed. */
export class FingerClock {
    elapsed = 0;
    horizon = 150;
    private previous?: number;
    observe(snapshot: object): number {
        const state = snapshot as { gameTimeMs?: number; ticks?: number; frames?: number; phase?: number; level?: number; time?: number };
        const now = state.gameTimeMs !== undefined ? state.gameTimeMs : state.ticks !== undefined ? state.ticks * 1000 / 60
            : state.phase !== undefined ? (state.phase * (30 - Math.floor(17 * (state.level ?? 0) / 29)) + (state.frames ?? 0)) * 1000 / 60
            : state.frames !== undefined ? state.frames * 1000 / 60 : state.time ?? 0;
        const delta = this.previous === undefined ? 0 : Math.max(0, now - this.previous);
        this.elapsed += delta;
        this.horizon = Math.max(150, delta);
        this.previous = now;
        return this.horizon;
    }
}
