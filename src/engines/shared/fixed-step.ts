/**
 * Fixed-step accumulator: the same simulated ticks whatever the frame rate. `rest` is the time not yet
 * consumed; it belongs to the engine state (snapshot, restore). `epsilon` absorbs the rounding of
 * repeated 1000 / 60 additions so that a whole frame always yields its tick.
 */
export class FixedStep {
    rest = 0;
    constructor(readonly stepMs = 1000 / 60, readonly epsilon = 1e-8) {}
    /** Calls `tick` once per whole step; `tick` returns false to stop (the remainder is then dropped). Returns the ticks run. */
    advance(dtMs: number, tick: () => boolean): number {
        this.rest += dtMs;
        let ticks = 0;
        while (this.rest + this.epsilon >= this.stepMs) {
            this.rest = Math.max(0, this.rest - this.stepMs);
            ticks++;
            if (!tick()) { this.rest = 0; return ticks; }
        }
        if (this.rest < this.epsilon) this.rest = 0;
        return ticks;
    }
}
