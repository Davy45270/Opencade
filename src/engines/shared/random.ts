/** Deterministic LCG, independent of presentation and level data. */
export class Random {
    constructor(public state: number) {
        this.state = state >>> 0;
    }
    next(): number {
        this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
        return this.state / 4294967296;
    }
}
