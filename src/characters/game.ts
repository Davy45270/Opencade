import type Phaser from 'phaser';
import { drawList, type CharacterId, type Pose, type Expression, type Animation } from './model';
import { selectedCharacter } from './selection';
import { renderCharacter } from './phaser';

/** One actor at the physical hero position. Identity never changes the rules. */
export class GameCharacter {
    readonly id: CharacterId = selectedCharacter();
    constructor(id?: CharacterId) { if (id) this.id = id; }
    pose: Pose = 'face';
    expression: Expression = 'concentre';
    animation: Animation = 'repos';
    time = 0;
    moving = 0;
    impact = 0;
    flip = false;
    move(horizontal: number, jump = false): void {
        this.pose = horizontal ? 'profil' : 'face'; this.flip = horizontal < 0;
        this.moving = 240; this.animation = jump ? 'saut' : 'marche';
    }
    advance(ms: number, paused: boolean, status: string, special: boolean): void {
        if (!paused) { this.time += ms; this.moving = Math.max(0, this.moving - ms); this.impact = Math.max(0, this.impact - ms); }
        this.expression = paused ? 'dodo' : status === 'won' ? 'joie' : this.impact > 0 ? 'surprise' : status === 'lost' ? 'triste' : 'concentre';
        if (paused) this.animation = 'repos';
        else if (status === 'won') this.animation = 'celebration';
        else if (special) this.animation = 'special';
        else if (this.moving === 0) this.animation = 'repos';
    }
    draw(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, angle = 0): void {
        renderCharacter(g, drawList(this.id, this.pose, this.expression, this.animation, this.time, matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full'), x, y, size, this.flip, angle);
    }
    /** Reuse the cast's leaves, hearts, fire, stars and rainbow on game effects. */
    drawEffect(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return;
        renderCharacter(g, drawList(this.id, 'face', 'joie', 'special', this.time).filter(p => p.effect), x, y, size);
    }
    snapshot() { return { id: this.id, pose: this.pose, expression: this.expression, animation: this.animation }; }
}
