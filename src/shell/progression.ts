import type { Save } from './storage';
export class Progression {
    level = 0;
    total = 0;
    baseline = 0;
    state: 'playing' | 'won' | 'lost' | 'complete' = 'playing';
    constructor(public save: Save = { unlocked: 1, best: 0 }, readonly levelCount = 10) {}
    start(index: number, fresh = false): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.levelCount) throw new RangeError('Niveau invalide');
        this.level = index;
        if (fresh) this.total = 0;
        this.baseline = this.total;
        this.state = 'playing';
    }
    finish(status: 'won' | 'lost', score: number): void {
        if (this.state !== 'playing') return;
        this.total = status === 'won' ? this.baseline + score : this.baseline;
        this.state = status === 'lost' ? 'lost' : this.level === this.levelCount - 1 ? 'complete' : 'won';
        if (status === 'won') {
            this.save.unlocked = Math.max(this.save.unlocked, Math.min(this.levelCount, this.level + 2));
            this.save.best = Math.max(this.save.best, this.total);
        }
    }
    retry(): void { this.total = this.baseline; this.state = 'playing'; }
    next(): void { if (this.state === 'won') this.start(this.level + 1); }
}
