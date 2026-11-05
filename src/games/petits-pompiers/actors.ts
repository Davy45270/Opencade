import type Phaser from 'phaser';
import { WIDTH, type Engine } from '../../engines/petits-pompiers/engine';
import { drop, firefighter, ink, toolArt, victim } from './art';
import { spriteKey } from './arena';
import { cell, depthOf, direction, point, unproject } from './iso';
import { SPRITES, TEXELS, type SpriteKey } from './sprites';
import { waterEnd, type View } from './view';
type G = Phaser.GameObjects.Graphics;
type Image = Phaser.GameObjects.Image;
const FIRE: Record<number, SpriteKey> = { 1: 'feu_petit', 2: 'feu_moyen', 3: 'feu_grand' };
const SPECIES: Record<string, SpriteKey> = { person: 'enfant', cat: 'chat', dog: 'chien' };
const TOOL: Partial<Record<string, SpriteKey>> = { hose: 'outil_lance', foam: 'outil_lance', kit: 'outil_trousse' };
/** Upper windows hold their victim this high above the ground (iso units). */
export const UPPER = 30;
/** Grid coordinates (continuous) of an iso world point, for depth. */
const depthAt = (p: { x: number; y: number }, bias = 0): number => { const g = unproject(p.x, p.y); return depthOf(g.x, g.y, bias); };
/** Moving and changing things: fires, smoke, victims and tool pickups as depth-sorted sprites; the
 *  firefighter in its own depth-sorted vector layer; ladders, water jet and objective marker on top. */
export class ActorLayer {
    private pool: Image[] = [];
    private used = 0;
    constructor(private scene: Phaser.Scene) {}
    private sprite(key: SpriteKey, view: View, at: { x: number; y: number }, depth: number, scale = 1, alpha = 1, flip = false): void {
        if (!this.scene.textures.exists(spriteKey(key))) return;
        let image = this.pool[this.used];
        if (!image) { image = this.scene.add.image(0, 0, spriteKey(key)); this.pool.push(image); }
        this.used++;
        const s = SPRITES[key];
        image.setTexture(spriteKey(key)).setOrigin(s.ox, s.oy).setVisible(true).setAlpha(alpha).setFlipX(flip)
            .setPosition(view.x + at.x * view.scale, view.y + at.y * view.scale).setScale(view.scale / TEXELS * scale).setDepth(depth);
    }
    /** Returns the number of sprites drawn this frame. */
    draw(e: Engine, view: View, player: G, front: G, reduced: boolean): number {
        this.used = 0;
        const time = reduced ? 0 : e.time;
        for (const f of e.fires) {
            const p = cell(f.at), d = depthAt(p, 1.5), sway = 1 + Math.sin((time + f.at * 97) / 180) * .05;
            if (e.level.smoke) this.sprite('fumee', view, { x: p.x + 4, y: p.y - 26 }, d + .2, 1, .72);
            this.sprite(FIRE[Math.min(3, Math.max(1, f.intensity))] ?? 'feu_petit', view, p, d, sway);
        }
        for (const v of e.victims) if (!v.saved && v.id !== e.player.carried && !v.hidden) {
            const p = point(v.x, v.y), key = SPECIES[v.species] ?? 'enfant';
            this.sprite(key, view, { x: p.x, y: p.y - (v.upper ? UPPER : 0) }, depthAt(p, v.upper ? 2.5 : 1));
        }
        for (const p of e.pickups) {
            const at = cell(p.at), key = TOOL[p.tool];
            if (key) this.sprite(key, view, at, depthAt(at, .5));
        }
        player.clear(); front.clear();
        for (const g of [player, front]) g.setPosition(view.x, view.y).setScale(view.scale);
        for (const p of e.pickups) if (!TOOL[p.tool]) { const at = cell(p.at); front.fillStyle(0xffdc75); front.fillRoundedRect(at.x - 8, at.y - 14, 16, 16, 4); toolArt(front, p.tool, at.x, at.y - 6); }
        for (const at of e.ladders) {
            // From the window down to the cell in front of it.
            const top = cell(at), bottom = cell(at + WIDTH), t = { x: top.x, y: top.y - UPPER - 6 };
            front.lineStyle(2.5, 0xe5eff1);
            for (const side of [-6, 6]) front.lineBetween(t.x + side, t.y, bottom.x + side, bottom.y);
            for (let n = 1; n < 7; n++) { const k = n / 7, x = t.x + (bottom.x - t.x) * k, y = t.y + (bottom.y - t.y) * k; front.lineBetween(x - 6, y, x + 6, y); }
        }
        for (const image of this.pool.slice(this.used)) image.setVisible(false);
        const guide = e.nextObjective();
        if (e.status === 'playing' && guide.at >= 0) {
            const goal = cell(guide.at), bob = reduced ? 0 : Math.sin(time / 220) * 3, y = goal.y - 44 + bob;
            front.fillStyle(0xffe27a); front.lineStyle(2, ink); front.fillTriangle(goal.x - 7, y, goal.x + 7, y, goal.x, y + 11); front.strokeTriangle(goal.x - 7, y, goal.x + 7, y, goal.x, y + 11);
        }
        // Victory uses one centered celebration in the HUD layer.
        if (e.status === 'won') return this.used;
        const p = e.player, at = point(p.x, p.y), x = at.x, y = at.y;
        player.setDepth(depthAt(at, 1.2));
        if (p.immune > 0) { player.fillStyle(0xffdf93, reduced ? .18 : .15 + Math.sin(time / 180) * .06); player.fillEllipse(x, y - 9, 48, 45); }
        if (e.character === 'licorne') { player.lineStyle(2, 0xffd654, .6); player.strokeEllipse(x, y + 2, 42, 16); }
        // The pose follows the motion on screen: up the screen shows the back, sideways the profile.
        const sx = Math.sign(p.dx - p.dy), sy = Math.sign(p.dx + p.dy);
        firefighter(player, e.character, x, y, 48, time, sx, sy, Boolean(e.intent.dx || e.intent.dy) && !e.job, false, p.immune > 0);
        if (p.carried >= 0) { const v = e.victims[p.carried]; if (v) { if (this.scene.textures.exists(spriteKey(SPECIES[v.species] ?? 'enfant'))) this.sprite(SPECIES[v.species] ?? 'enfant', view, { x: x + 15, y: y - 20 }, depthAt(at, 1.3), .8); else victim(player, x + 16, y - 25, v.species, 21); } }
        if (e.job?.kind === 'spray' || e.job?.kind === 'foam') {
            const end = waterEnd(e), d = direction(p.dx, p.dy), start = { x: x + d.x * 12, y: y - 8 + d.y * 12 };
            front.lineStyle(7, 0xe9543e); front.lineBetween(x, y - 10, start.x, start.y);
            front.lineStyle(4, ink); front.lineBetween(start.x, start.y, start.x + d.x * 6, start.y + d.y * 6);
            front.lineStyle(3, 0xc0f3ff, .8); front.lineBetween(start.x, start.y, end.x, end.y - 8);
            for (let n = 0; n < 14; n++) {
                const t = (n / 14 + time / 1600) % 1;
                drop(front, start.x + (end.x - start.x) * t, start.y + (end.y - 8 - start.y) * t - Math.sin(t * Math.PI) * 6, 2.3 + n % 2);
            }
        } else if (e.job) { front.fillStyle(0xfff1bd); front.fillCircle(x + 19, y - 12, 9); toolArt(front, { break: 'axe', climb: 'ladder', heal: 'kit', call: 'megaphone', pickup: 'kit', deposit: 'kit', refill: 'hose' }[e.job.kind], x + 19, y - 12); }
        for (const image of this.pool.slice(this.used)) image.setVisible(false);
        return this.used;
    }
    destroy(): void { for (const image of this.pool) image.destroy(); this.pool = []; }
}
