import Phaser from 'phaser';
import { CANNON_Y, WEAPONS, type Enemy, type State, type Weapon } from '../../engines/essaim/engine';
import { ArtPool, ensureArtTextures, PARTICLE_BUDGET } from './art-pool';

const INK = 0x080f25;
const COLORS: Record<Enemy['type'], number> = {
    scout: 0x43dcb1, sensor: 0x45d8df, armor: 0x9981ef, split: 0xffbe48,
    fragment: 0xffce70, shield: 0x548af5, miner: 0xf58a4c, fast: 0x49cbe9,
    spiral: 0xf46c9d, turret: 0xb17cec, mirror: 0x70dfea, burst: 0xe590db,
};
const WEAPON_COLORS = [0x78efe5, 0xffd765, 0xba9aff, 0x54ddc7, 0xff89cb, 0xf7e2ad];
interface Trace { x: number; y: number; hp: number; flash: number; seen: boolean }

/** Three retained Graphics + two cached texture Images, regardless of entity count. */
export class EssaimArt {
    readonly pool = new ArtPool();
    private backdrop: Phaser.GameObjects.Graphics;
    private stars: Phaser.GameObjects.Graphics;
    private shapes: Phaser.GameObjects.Graphics;
    private clouds: Phaser.GameObjects.Image[];
    private traces = new Map<number, Trace>();
    private bossHp = 0;
    private bossX = 180;
    private bossY = 65;
    private bossFlash = 0;
    private tilt = 0;
    private lastCannon = 180;
    private clock = 0;
    private level = -1;
    private media = matchMedia('(prefers-reduced-motion: reduce)');
    private generations = 0;
    private frames = 0;
    private charged = false;
    private motionChange = (): void => {
        if (this.reduced) { this.pool.step(0, true); this.scene.cameras.main.shakeEffect.reset(); this.tilt = 0; }
    };
    get reduced(): boolean { return this.media.matches; }
    constructor(private scene: Phaser.Scene) {
        this.backdrop = scene.add.graphics();
        ensureArtTextures(key => scene.textures.exists(key), (key, color) => {
            const g = scene.make.graphics({ x: 0, y: 0 });
            // Layered low-alpha discs form a radial gradient, baked once, no filters.
            for (let radius = 126; radius >= 6; radius -= 4) {
                g.fillStyle(color, 0.018); g.fillCircle(128, 128, radius);
            }
            g.generateTexture(key, 256, 256); g.destroy(); this.generations++;
        });
        this.clouds = [scene.add.image(80, 190, 'essaim-nebula-v1').setScale(1.5, 2), scene.add.image(290, 360, 'essaim-haze-v1').setScale(1.4, 2.2)];
        this.stars = scene.add.graphics(); this.shapes = scene.add.graphics();
        this.media.addEventListener('change', this.motionChange);
    }
    destroy(): void { this.media.removeEventListener('change', this.motionChange); this.pool.clear(); this.traces.clear(); }
    reset(): void {
        this.pool.clear(); this.traces.clear(); this.clock = 0; this.tilt = 0; this.lastCannon = 180;
        this.bossHp = 0; this.bossFlash = 0; this.charged = false; this.scene.cameras.main.shakeEffect.reset();
    }
    stats() {
        return { activeGraphics: [this.backdrop, this.stars, this.shapes, ...this.clouds].filter(o => o.active && o.visible).length,
            renderedFrames: this.frames, particles: this.pool.active, particleCapacity: PARTICLE_BUDGET, textureGenerations: this.generations, reducedMotion: this.reduced };
    }
    update(s: State, ms: number, events: readonly string[]): void {
        this.clock += ms;
        this.pool.step(ms, this.reduced);
        this.tilt += ((this.reduced ? 0 : Phaser.Math.Clamp((s.cannon - this.lastCannon) / 22, -0.2, 0.2)) - this.tilt) * Math.min(1, ms / 90);
        this.lastCannon = s.cannon;
        this.bossFlash = Math.max(0, this.bossFlash - ms);
        for (const trace of this.traces.values()) { trace.seen = false; trace.flash = Math.max(0, trace.flash - ms); }
        let hit = false;
        for (const enemy of s.enemies) {
            let trace = this.traces.get(enemy.id);
            if (!trace) { trace = { x: enemy.x, y: enemy.y, hp: enemy.hp, flash: 0, seen: true }; this.traces.set(enemy.id, trace); }
            if (enemy.hp < trace.hp) { trace.flash = 100; hit = true; }
            trace.x = enemy.x; trace.y = enemy.y; trace.hp = enemy.hp; trace.seen = true;
        }
        for (const [id, trace] of this.traces) if (!trace.seen) {
            // A disappearance at the bottom can be a departing kamikaze, not a kill.
            if (events.includes('enemy') || trace.y < 600 && events.includes('life')) this.pool.burst(trace.x, trace.y, this.reduced);
            this.traces.delete(id);
        }
        if (!hit && events.includes('armor')) {
            // Blocked frontal hits don't change HP; use visible firing geometry.
            let nearest: Trace | undefined, distance = Infinity;
            for (const e of s.enemies) if (e.type === 'shield') {
                const d = Math.abs(e.x - s.cannon);
                if (d < distance) { distance = d; nearest = this.traces.get(e.id); }
            }
            if (nearest) nearest.flash = 100;
        }
        if (s.boss) {
            if (this.bossHp && s.boss.hp < this.bossHp) this.bossFlash = 100;
            this.bossHp = s.boss.hp; this.bossX = s.boss.x; this.bossY = s.boss.y;
        } else if (this.bossHp) {
            this.pool.burst(this.bossX, this.bossY, this.reduced, true); this.bossHp = 0;
            this.shake();
        }
        if (events.includes('life')) { this.pool.burst(s.cannon, CANNON_Y, this.reduced, true); this.shake(); }
        if (this.charged && (events.includes('enemy') || events.includes('armor'))) this.shake();
        this.charged = s.shots.some(p => p.owner === 'player' && (p.radius ?? 0) > 10);
        if (events.includes('phase')) { this.pool.burst(this.bossX, this.bossY, this.reduced, true); this.shake(); }
    }
    private shake(): void { if (!this.reduced) this.scene.cameras.main.shake(130, 0.003); }
    private ellipse(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number): void {
        g.fillStyle(INK); g.fillEllipse(x, y + 1, w + 4, h + 4, 16);
        g.fillStyle(color); g.fillEllipse(x, y, w, h, 16);
        g.fillStyle(0xffffff, 0.22); g.fillEllipse(x - w * 0.12, y - h * 0.2, w * 0.65, h * 0.34);
    }
    private background(level: number): void {
        if (this.level !== level) {
            this.level = level; const g = this.backdrop, band = Math.floor(level / 5);
            g.clear(); g.fillStyle(0x0c172e); g.fillRect(0, 0, 360, 640);
            const palettes = [0x315979, 0x664b86, 0x2e716f, 0x766039, 0x3b5487, 0x713d68];
            const color = palettes[band] ?? 0x315979, x = 270 - band * 25, y = 260 + band * 17;
            g.fillStyle(color, 0.1); g.fillCircle(x, y, 51);
            g.fillStyle(color, 0.25); g.fillCircle(x, y, 47);
            g.fillStyle(color); g.fillCircle(x, y, 42);
            g.fillStyle(0xc2dae3, 0.1); g.fillEllipse(x - 9, y - 20, 48, 17);
            g.fillStyle(0x0c172e, 0.55); g.fillCircle(x + 17, y + 7, 36);
            if (band % 2) { g.lineStyle(3, color, 0.6); g.strokeEllipse(x, y + 4, 118, 24); }
        }
        const time = this.clock / 1000 * (this.reduced ? 0.12 : 1), g = this.stars;
        this.clouds[0]?.setY(180 + Math.sin(time / 40) * 25);
        this.clouds[1]?.setY(390 + Math.sin(time / 55) * 32);
        g.clear();
        for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 24; i++) {
            const x = 6 + (i * 97 + layer * 43) % 348;
            const y = (i * 67 + layer * 109 + time * ([4, 10, 22][layer] ?? 4)) % 580;
            g.fillStyle(0xb6d9f5, 0.18 + layer * 0.13); g.fillCircle(x, y, 0.5 + layer * 0.35);
        }
        g.lineStyle(1, 0x78ead5, 0.22); g.lineBetween(20, 590, 340, 590);
    }
    private enemy(e: Enemy): void {
        const g = this.shapes, flash = (this.traces.get(e.id)?.flash ?? 0) > 0;
        const color = flash ? 0xffffff : COLORS[e.type];
        const t = this.reduced ? 0 : this.clock / 160 + e.id;
        g.save(); g.translateCanvas(e.x, e.y);
        g.rotateCanvas(e.type === 'spiral' ? this.reduced ? 0 : this.clock / 330 + e.id : Math.sin(t) * 0.06);
        if (e.type === 'mirror') {
            this.ellipse(g, -10, 0, 13, 23, color); this.ellipse(g, 10, 0, 13, 23, color);
            g.lineStyle(2, 0xe0ffff, 0.8); g.lineBetween(-13, -6, -7, 4); g.lineBetween(7, -6, 13, 4);
        } else if (e.type === 'miner') {
            for (const side of [-1, 1]) { this.ellipse(g, side * 12, 3, 10, 19, color); g.fillStyle(0xffcc6b); g.fillCircle(side * 12, 9, 3); }
        } else if (e.type === 'split') {
            this.ellipse(g, -8, 0, 16, 23, color); this.ellipse(g, 8, 0, 16, 23, color);
            g.lineStyle(2, INK); g.lineBetween(0, -10, -3, -1); g.lineBetween(-3, -1, 2, 4); g.lineBetween(2, 4, 0, 12);
        } else if (e.type === 'spiral') {
            for (const angle of [0, 2.094, 4.189]) {
                g.save(); g.rotateCanvas(angle); this.ellipse(g, 0, -11, 9, 20, color); g.restore();
            }
        } else if (e.type === 'armor') {
            for (const side of [-1, 1]) this.ellipse(g, side * 11, 1, 13, 26, color);
            g.fillStyle(INK); g.fillRoundedRect(-10, -12, 20, 25, 6);
            g.fillStyle(color); g.fillRoundedRect(-8, -10, 16, 21, 5);
            g.lineStyle(2, 0xddceff, 0.6); g.lineBetween(-7, -4, 7, -4); g.lineBetween(-7, 3, 7, 3);
        } else {
            const wing = 5 + Math.sin(t) * 3;
            this.ellipse(g, -12, -2, e.type === 'fast' ? 20 : 15, wing + 7, color);
            this.ellipse(g, 12, -2, e.type === 'fast' ? 20 : 15, wing + 7, color);
        }
        if (e.type !== 'split' && e.type !== 'armor') this.ellipse(g, 0, 0, e.type === 'fragment' ? 12 : 20, e.type === 'shield' ? 26 : 21, color);
        if (e.type === 'sensor' || e.type === 'burst' || e.type === 'shield') {
            g.lineStyle(2, INK); g.lineBetween(-6, -8, -9 - Math.sin(t) * 2, -17); g.lineBetween(6, -8, 9 + Math.sin(t) * 2, -17);
            g.fillStyle(flash ? 0xffffff : 0xffd36e); g.fillCircle(-9 - Math.sin(t) * 2, -17, 2); g.fillCircle(9 + Math.sin(t) * 2, -17, 2);
        }
        g.fillStyle(INK); g.fillRoundedRect(-7, -3, 14, 8, 4);
        g.fillStyle(0xf9e7a0); g.fillEllipse(-3, 0, 3, 4); g.fillEllipse(3, 0, 3, 4);
        if (e.type === 'turret') {
            g.fillStyle(INK); g.fillRoundedRect(10, -4, 14, 12, 4);
            g.fillStyle(0x7260b7); g.fillRoundedRect(12, -2, 10, 8, 3);
            g.lineStyle(5, INK); g.lineBetween(18, 3, 18 + Math.sin(t / 4) * 3, 16);
            g.lineStyle(2, 0xffbb68); g.lineBetween(18, 3, 18 + Math.sin(t / 4) * 3, 16);
        }
        if (e.captured) { g.lineStyle(1, 0xffd36e); g.lineBetween(0, 10, 0, 23); this.ellipse(g, 0, 22, 10, 8, 0xffbd50); }
        g.restore();
        if (e.type === 'shield' && (e.clock ?? 0) % 6000 < 5500) {
            const a = e.facing ?? Math.PI / 2;
            g.lineStyle(7, 0x5088ff, 0.16); g.beginPath(); g.arc(e.x, e.y, 22, a - Math.PI / 4, a + Math.PI / 4); g.strokePath();
            g.lineStyle(2.5, flash ? 0xffffff : 0x88c9ff, 0.95); g.beginPath(); g.arc(e.x, e.y, 22, a - Math.PI / 4, a + Math.PI / 4); g.strokePath();
        }
        if (flash) { g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(e.x, e.y, 21); }
    }
    private player(s: State): void {
        const g = this.shapes;
        g.save(); g.translateCanvas(s.cannon, CANNON_Y); g.rotateCanvas(this.tilt);
        const pulse = this.reduced ? 0.5 : 0.5 + Math.sin(this.clock / 65) * 0.5;
        for (const side of [-1, 1]) {
            g.fillStyle(0xff813f, 0.8); g.fillEllipse(side * 9, 14 + pulse * 3, 7, 13 + pulse * 7);
            g.fillStyle(0xffeea8); g.fillEllipse(side * 9, 12 + pulse * 2, 3, 9 + pulse * 4);
            this.ellipse(g, side * 10, 4, 10, 19, 0x207eab);
        }
        g.fillStyle(INK); g.fillRoundedRect(-17, -1, 34, 14, 6);
        g.fillStyle(0x32b9bf); g.fillRoundedRect(-15, -1, 30, 10, 5);
        this.ellipse(g, 0, -3, 20, 32, 0x20a9b6);
        for (let i = 0; i < 6; i++) {
            const mix = i / 5, r = Math.round(32 + mix * 74), green = Math.round(169 + mix * 67), b = Math.round(182 + mix * 31);
            g.fillStyle((r << 16) | (green << 8) | b); g.fillEllipse(-i * 0.65, -3 - i * 0.5, 18 - i * 1.8, 30 - i * 1.2, 16);
        }
        g.fillStyle(0xd2fff1, 0.7); g.fillEllipse(-5, -8, 3, 14);
        this.ellipse(g, 0, -8, 11, 14, 0x245c99);
        g.fillStyle(0xc5f5ff); g.fillEllipse(-2, -11, 4, 6);
        g.fillStyle(0xffd36e); g.fillRoundedRect(-2, -21, 4, 7, 2);
        g.restore();
    }
    private boss(s: State): void {
        const b = s.boss; if (!b) return;
        const g = this.shapes, command = b.pattern === 6, phase2 = b.phase === 2;
        const color = this.bossFlash ? 0xffffff : phase2 ? 0xe86998 : 0x8e7bd2;
        g.save(); g.translateCanvas(b.x, b.y);
        // Large visual hull; the luminous central assembly marks the unchanged target.
        for (const side of [-1, 1]) {
            this.ellipse(g, side * (phase2 ? 40 : 32), 2, command ? 32 : 24, command ? 46 : 33, color);
            g.fillStyle(INK); g.fillRoundedRect(side * (phase2 ? 40 : 32) - 7, 11, 14, 15, 5);
            g.fillStyle(phase2 ? 0xffb459 : 0x9cddff); g.fillEllipse(side * (phase2 ? 40 : 32), 24, 7, 10);
            this.ellipse(g, side * 19, -6, 25, 19, color);
        }
        this.ellipse(g, 0, -1, 49, command ? 45 : 35, color);
        g.lineStyle(3, INK); g.strokeCircle(0, 3, 14);
        g.fillStyle(b.exposed ? 0xffc75c : 0x304163); g.fillCircle(0, 3, 13);
        if (b.exposed) {
            g.fillStyle(0xffdf7e, 0.12); g.fillCircle(0, 3, 21);
            g.fillStyle(0xfff2bd); g.fillCircle(0, 3, 7);
        } else { g.lineStyle(3, 0xb7b2e8); g.lineBetween(-10, -3, 10, -3); g.lineBetween(-10, 7, 10, 7); }
        if (phase2) { g.lineStyle(3, 0xffcf81); g.lineBetween(-17, -17, -8, -12); g.lineBetween(17, -17, 8, -12); }
        g.fillStyle(INK); g.fillRoundedRect(-33, -36, 66, 6, 3);
        g.fillStyle(phase2 ? 0xff82ae : 0xffce73); g.fillRoundedRect(-31, -34, 62 * Math.max(0, b.hp / b.maxHp), 2, 1);
        g.restore();
    }
    private weapons(s: State, drones: readonly { x: number; y: number }[]): void {
        const g = this.shapes, x = s.cannon, y = CANNON_Y;
        const has = (kind: Weapon): boolean => s.weapons.some(w => w.kind === kind && w.remaining > 0);
        if (has('slow')) {
            g.fillStyle(0x58d9c6, 0.045); g.fillCircle(x, y - 140, 125);
            for (let i = 0; i < 3; i++) {
                const r = this.reduced ? 80 + i * 22 : 75 + (this.clock / 35 + i * 17) % 50;
                g.lineStyle(1.5, 0x6bedd5, 0.15 + (125 - r) / 250); g.strokeCircle(x, y - 140, r);
            }
        }
        if (has('magnet')) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
            g.lineStyle(1, 0xee86ce, 0.22); g.beginPath();
            g.arc(x + side * (18 + i * 17), y - 38, 50 + i * 20, -Math.PI, 0); g.strokePath();
            g.fillStyle(0xff97dd, 0.55); const a = this.reduced ? -1.5 : -Math.PI + (this.clock / 900 + i) % Math.PI;
            g.fillCircle(x + side * (18 + i * 17) + Math.cos(a) * (50 + i * 20), y - 38 + Math.sin(a) * (50 + i * 20), 1.5);
        }
        if (has('drones')) {
            g.lineStyle(1, 0xb89aff, 0.17); g.strokeEllipse(x, y, 84, 64);
            for (const p of drones) { this.ellipse(g, p.x, p.y, 14, 10, 0xa58bf3); g.fillStyle(0xf5e1ff); g.fillCircle(p.x, p.y - 1, 2); }
        }
        if (s.beam) {
            const heat = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x9cfff0), Phaser.Display.Color.ValueToColor(0xff4338), 100, s.heat);
            const color = Phaser.Display.Color.GetColor(heat.r, heat.g, heat.b);
            g.lineStyle(14, color, 0.1); g.lineBetween(x, y - 20, x, 35);
            g.lineStyle(7, color, 0.55); g.lineBetween(x, y - 20, x, 35);
            g.lineStyle(2, 0xfff9e6, 0.95); g.lineBetween(x, y - 20, x, 35);
            g.fillStyle(color, 0.5); g.fillCircle(x, y - 21, 8);
        }
        if (s.charge > 0) {
            const radius = 4 + s.charge / 1500 * 14;
            g.fillStyle(0xffd080, 0.1); g.fillCircle(x, y - 22, radius + 5);
            g.fillStyle(0xf6ca83, 0.55); g.fillCircle(x, y - 22, radius);
            g.fillStyle(0xfff0cc); g.fillCircle(x - radius / 4, y - 25, radius * 0.5);
        }
    }
    draw(s: State, level: number, drones: readonly { x: number; y: number }[]): void {
        this.frames++; this.background(level); const g = this.shapes; g.clear();
        this.weapons(s, drones);
        for (const e of s.enemies) this.enemy(e);
        this.boss(s);
        if (s.rescue) {
            this.ellipse(g, s.rescue.x, s.rescue.y, 44, 20, 0x45bea1);
            for (let i = 0; i < s.rescue.hp; i++) { g.fillStyle(0xffdf91); g.fillCircle(s.rescue.x - 12 + i * 8, s.rescue.y, 2); }
        }
        for (const p of s.pickups) {
            const color = WEAPON_COLORS[WEAPONS.indexOf(p.kind)] ?? 0xffffff;
            this.ellipse(g, p.x, p.y, 19, 22, color);
            g.lineStyle(2, INK);
            if (p.kind === 'beam') g.lineBetween(p.x, p.y - 6, p.x, p.y + 6);
            else if (p.kind === 'bounce') { g.lineBetween(p.x - 5, p.y + 5, p.x + 5, p.y); g.lineBetween(p.x + 5, p.y, p.x - 5, p.y - 5); }
            else if (p.kind === 'drones') { g.strokeEllipse(p.x, p.y, 12, 7); }
            else if (p.kind === 'magnet') { g.beginPath(); g.arc(p.x, p.y - 2, 5, 0, Math.PI); g.strokePath(); }
            else g.strokeCircle(p.x, p.y, p.kind === 'charge' ? 4 : 6);
        }
        if (s.invulnerable === 0 || this.reduced || s.ticks % 8 < 4) this.player(s);
        for (const p of this.pool.particles) if (p.active) {
            const fade = 1 - p.age / p.life;
            if (p.kind === 'ring') {
                if (p.age < 60) { g.fillStyle(0xfff5de, (1 - p.age / 60) * 0.65); g.fillCircle(p.x, p.y, 5); }
                g.lineStyle(2, 0xffcf80, fade * 0.65); g.strokeCircle(p.x, p.y, 4 + p.age / 13);
            }
            else if (p.kind === 'smoke') { g.fillStyle(0x7c718e, fade * 0.3); g.fillCircle(p.x, p.y, p.size + p.age / 70); }
            else { g.lineStyle(2, 0xffcb6d, fade * 0.8); g.lineBetween(p.x, p.y, p.x - p.vx / 22, p.y - p.vy / 22); }
        }
        // Threats are drawn last: white cores, hot outline and ink isolation.
        for (const shot of s.shots) {
            if (shot.owner === 'enemy') {
                g.fillStyle(INK); g.fillEllipse(shot.x, shot.y, 11, 17);
                g.fillStyle(0xff466c); g.fillEllipse(shot.x, shot.y, 7, 13);
                g.fillStyle(0xfff8dc); g.fillEllipse(shot.x, shot.y - 1, 3, 8);
                if (shot.mine !== undefined) { g.lineStyle(2, 0xffe89d); g.strokeCircle(shot.x, shot.y, 7); }
            } else if (shot.radius) {
                g.fillStyle(0xf9ce83, 0.22); g.fillCircle(shot.x, shot.y, shot.radius);
                g.lineStyle(2, 0xffe5b2); g.strokeCircle(shot.x, shot.y, shot.radius);
                g.fillStyle(0xffedca); g.fillCircle(shot.x, shot.y, shot.radius * 0.4);
            } else {
                if (shot.bounces !== undefined || shot.reflected) {
                    const vx = shot.vx ?? 0, vy = shot.vy ?? -600;
                    g.lineStyle(5, 0xffcc66, 0.12); g.lineBetween(shot.x, shot.y, shot.x - vx / 22, shot.y - vy / 22);
                    g.lineStyle(2, 0xffcc66, 0.5); g.lineBetween(shot.x, shot.y, shot.x - vx / 35, shot.y - vy / 35);
                }
                g.fillStyle(shot.bounces !== undefined ? 0xffd765 : 0x9ee9dc); g.fillRoundedRect(shot.x - 2, shot.y - 5, 4, 10, 2);
            }
        }
        g.lineStyle(2, 0x52799b, 0.55); g.strokeRoundedRect(2, 2, 356, 636, 14);
    }
}
