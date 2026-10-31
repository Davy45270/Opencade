import { Engine } from '../../engines/artificiers/engine';
export interface Point { x: number; y: number; id: number }
/** Scene and noisy-input oracle use the same complete press/move/release path. */
export class AimDriver {
    private pointer: number | null = null;
    private turn = -1;
    private actor = -1;
    constructor(readonly engine: Engine, private enabled: () => boolean = () => true) {}
    down(p: Point): boolean {
        const a = this.engine.actor;
        if (!this.enabled() || this.pointer !== null || this.engine.phase !== 'aim' || Math.hypot(p.x - a.x, p.y - a.y) > 32) return false;
        this.pointer = p.id; this.turn = this.engine.turn; this.actor = a.id; return true;
    }
    move(p: Point): void {
        if (this.pointer !== p.id || !this.enabled() || this.turn !== this.engine.turn || this.actor !== this.engine.actor.id) return;
        const a = this.engine.actor, dx = p.x - a.x, dy = p.y - a.y;
        this.engine.aim(Math.atan2(dy, dx), Math.hypot(dx, dy) * 1.25);
    }
    up(p: Point): boolean {
        if (this.pointer !== p.id) return false;
        const sameTurn = this.turn === this.engine.turn && this.actor === this.engine.actor.id;
        this.move(p); this.pointer = null;
        return sameTurn && this.enabled() && this.engine.shoot();
    }
    cancel(): void { this.pointer = null; }
}
