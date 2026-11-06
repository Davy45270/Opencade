import type Phaser from 'phaser';
import type { CharacterId } from '../../characters/model';
import { WIDTH, type Engine, type Victim } from '../../engines/petits-pompiers/engine';
import { drop, firefighter, ink, toolArt, victim } from './art';
import { spriteKey } from './arena';
import { cell, depthOf, direction, point, unproject } from './iso';
import { SPRITES, TEXELS, type SpriteKey } from './sprites';
import { waterEnd, type View } from './view';
type G = Phaser.GameObjects.Graphics;
type Image = Phaser.GameObjects.Image;
const FIRE: Record<number, SpriteKey> = { 1: 'feu_petit', 2: 'feu_moyen', 3: 'feu_grand' };
const SPECIES: Record<string, SpriteKey> = { dog: 'chien' };
/** David's children, cast as the people to rescue. Nobody carries them: they take the firefighter's
 *  hand and walk behind him, Inès rolling in her wheelchair (arbitrage 7-2430). */
export const CHILDREN = ['emma', 'noe', 'ines', 'chloe', 'lucas'] as const;
export type Child = typeof CHILDREN[number];
/** The child playing person victim `id`: one per person in a level, the cast shifting from level to level. */
export function childOf(levelId: string, victims: readonly Pick<Victim, 'id' | 'species'>[], id: number): Child {
    const rank = victims.filter(v => v.species === 'person' && v.id < id).length, level = Number(levelId.replace(/\D/g, '')) || 0;
    return CHILDREN[(level + rank) % CHILDREN.length] ?? 'emma';
}
/** A child's sprite: standing and facing us while it waits (`step` null), otherwise frame
 *  `step` of the side walk cycle. The grid runs at 26.6° on screen, so the side view is always the nearest:
 *  drawn facing west, mirrored for east. */
export function childPose(child: Child, step: number | null, east: boolean): { key: SpriteKey; flip: boolean } {
    if (step === null) return { key: `enfant_${child}_attente`, flip: false };
    return { key: `enfant_${child}_marche${String((Math.floor(step) % 8 + 8) % 8 + 1)}` as SpriteKey, flip: east };
}
/** Sprite of a victim. David's kitten changes with the rescue: it calls for help while it waits,
 *  is relieved in the firefighter's arms and happy once saved. The dog keeps one sprite; a person is a child, standing. */
export function victimSprite(v: Pick<Victim, 'id' | 'species' | 'saved'>, carried: number, levelId = '', victims: readonly Pick<Victim, 'id' | 'species'>[] = [v]): SpriteKey {
    if (v.species === 'cat') return v.saved ? 'chaton_heureux' : v.id === carried ? 'chaton_soulage' : 'chaton_appel';
    if (v.species === 'person') return childPose(childOf(levelId, victims, v.id), null, false).key;
    return SPECIES[v.species] ?? 'chien';
}
/** World units walked per frame of a child's walk cycle (eight frames make two strides). */
const STRIDE = 5;
/** A child keeps walking this long (ms of game time) after its last move, so frames between engine steps do not flicker. */
const WALK_HOLD = 160;
const TOOL: Partial<Record<string, SpriteKey>> = { hose: 'outil_lance', foam: 'outil_lance', kit: 'outil_trousse' };
/** Upper windows hold their victim this high above the ground (iso units). */
export const UPPER = 30;
/** Screen directions of the drawn mascots, clockwise from east (screen y points down). */
const POSES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const;
/** Mascots drawn in uniform on the multi-view sheet. Tutu keeps the vector art: the sheet has no tutu. */
const DRAWN: Partial<Record<CharacterId, true>> = { panda: true, pandaroux: true, dragon: true, licorne: true };
/** Sprite of a mascot heading along the grid step (dx, dy), or undefined when it has no drawn views.
 *  The west view is the east profile mirrored: a profile shows the same face from either side. */
export function mascotPose(id: CharacterId, dx: number, dy: number): { key: SpriteKey; flip: boolean; pose: typeof POSES[number] } | undefined {
    if (!DRAWN[id]) return undefined;
    const d = direction(dx, dy), pose = POSES[((Math.round(Math.atan2(d.y, d.x) / (Math.PI / 4)) % 8) + 8) % 8] ?? 'S';
    return { key: `pompier_${id}_${pose === 'W' ? 'E' : pose}` as SpriteKey, flip: pose === 'W', pose };
}
/** Grid coordinates (continuous) of an iso world point, for depth. */
const depthAt = (p: { x: number; y: number }, bias = 0): number => { const g = unproject(p.x, p.y); return depthOf(g.x, g.y, bias); };
/** Moving and changing things: fires, smoke, victims and tool pickups as depth-sorted sprites; the
 *  firefighter in its own depth-sorted vector layer; ladders, water jet and objective marker on top. */
export class ActorLayer {
    private pool: Image[] = [];
    private used = 0;
    /** Per victim, renderer only: last drawn point, distance walked, facing, and when it last moved. */
    private trail = new Map<number, { x: number; y: number; walked: number; east: boolean; moved: number }>();
    private trailOf: unknown;
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
        if (this.trailOf !== e.level) { this.trail.clear(); this.trailOf = e.level; }
        for (const v of e.victims) if ((!v.saved || v.species === 'cat') && v.id !== e.player.carried && !v.hidden) {
            // A saved kitten sits on the safe spot's cross, happy, rather than under the firefighter who set it down.
            const safe = e.tiles.indexOf('S'), p = v.saved && safe >= 0 ? { x: cell(safe).x - 4, y: cell(safe).y - 2 } : point(v.x, v.y);
            let key = victimSprite(v, e.player.carried, e.level.id, e.victims), flip = false;
            if (v.species === 'person') {
                // A following child walks: the frame comes from the distance it covered, the facing from its screen motion.
                const t = this.trail.get(v.id) ?? { x: p.x, y: p.y, walked: 0, east: false, moved: -Infinity }, dx = p.x - t.x, d = Math.hypot(dx, p.y - t.y);
                if (d > .01) { t.walked += d; t.moved = e.time; if (Math.abs(dx) > .01) t.east = dx > 0; }
                t.x = p.x; t.y = p.y; this.trail.set(v.id, t);
                if (e.time - t.moved < WALK_HOLD) ({ key, flip } = childPose(childOf(e.level.id, e.victims, v.id), reduced ? 0 : t.walked / STRIDE, t.east));
            }
            this.sprite(key, view, { x: p.x, y: p.y - (v.upper ? UPPER : 0) }, depthAt(p, v.upper ? 2.5 : 1), 1, 1, flip);
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
        const moving = Boolean(e.intent.dx || e.intent.dy) && !e.job;
        const pose = mascotPose(e.character, moving ? e.intent.dx : p.dx, moving ? e.intent.dy : p.dy);
        if (pose && this.scene.textures.exists(spriteKey(pose.key))) {
            // A drawn mascot: one sprite per screen direction, a small hop while walking.
            const hop = moving && !reduced ? Math.abs(Math.sin(time / 95)) * 2 : 0;
            this.sprite(pose.key, view, { x, y: y - hop }, depthAt(at, 1.25), 1, 1, pose.flip);
        } else {
            const sx = Math.sign(p.dx - p.dy), sy = Math.sign(p.dx + p.dy);
            firefighter(player, e.character, x, y, 48, time, sx, sy, moving, false, p.immune > 0);
        }
        if (p.carried >= 0) { const v = e.victims[p.carried], key = v && victimSprite(v, p.carried, e.level.id, e.victims); if (v && key) { if (this.scene.textures.exists(spriteKey(key))) this.sprite(key, view, { x: x + 15, y: y - 20 }, depthAt(at, 1.3), .8); else victim(player, x + 16, y - 25, v.species, 21); } }
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
