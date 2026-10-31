import type Phaser from 'phaser';
import { ActionPaint } from '../../characters/action-phaser';
import { actionArt, fighterViews, type CraftView, type FighterView } from '../../characters/arcade-art';

/** Local body and gait textures, baked once, with a separately aimed weapon. */
export class FerraillePaint extends ActionPaint {
    clock = 0;
    running = false;
    reduced = false;
    firing = false;
    private readonly tutuCars = new Map<string, string>();
    private readonly bodies = new Map<FighterView, string>();
    private readonly gait = new Map<string, string>();
    constructor(scene: Phaser.Scene, budget: number) {
        super(scene, budget);
        const body = (view: FighterView) => {
            const list = actionArt[this.id].fighters[view];
            // Shared art puts the held weapon after this hand. Keep the character,
            // backpack and hand; the live Graphics supplies the only barrel and flame.
            const hand = list.findIndex(p => p.kind === 'ellipse' && p.rx === 26 && p.ry === 16 && (p.x === 159 || p.x === 81));
            return hand < 0 ? list : list.slice(0, hand + 1);
        };
        for (const view of fighterViews) this.bodies.set(view, this.paint.texture(`114-fighter-${this.id}-${view}`, body(view), 192));
        for (const view of ['marche', 'gauche', 'tir'] as const) for (let frame = 0; frame < 4; frame++) {
            const list = body(view === 'tir' ? 'marche' : view).map(p => {
                if (p.kind !== 'ellipse' || p.y < 170 || p.ry > 17) return p;
                const step = Math.sin(frame * Math.PI / 2 + (p.x < 115 ? 0 : Math.PI)) * 8;
                return { ...p, y: p.y + step, rotation: p.rotation + step / 40 };
            });
            if (view === 'tir') {
                const feet = list.filter(p => p.kind === 'ellipse' && p.y >= 162 && p.ry <= 17);
                list.splice(0, list.length, ...body('tir').filter(p => !(p.kind === 'ellipse' && p.y >= 162 && p.ry <= 17)), ...feet);
            }
            this.gait.set(`${view}-${String(frame)}`, this.paint.texture(`114-gait-fighter-${this.id}-${view}-${String(frame)}`, list, 192));
        }
        if (this.id === 'singe') for (const view of ['gauche', 'droite'] as const) {
            const list = [...actionArt.singe.vehicles[view]];
            // Roll cage and broad bonnet turn the shared small bike into Tutu's buggy.
            const point = (x: number, y: number): readonly [number, number] => [view === 'gauche' ? 240 - x : x, y];
            list.unshift(
                { kind: 'polygon', points: [point(38, 171), point(40, 137), point(198, 137), point(218, 171)], fill: '#ed67ae', stroke: '#63334e', width: 5 },
                { kind: 'line', points: [point(48, 143), point(61, 67), point(157, 67), point(185, 143)], fill: '', stroke: '#ffd263', width: 10 },
                { kind: 'polygon', points: [point(63, 75), point(151, 75), point(167, 119), point(57, 119)], fill: '#8ae1e9', stroke: '#f9c955', width: 3 },
            );
            this.tutuCars.set(view, this.paint.texture(`112-vehicles-singe-${view}`, list, 192));
        }
    }
    override craft(kind: 'vehicles' | 'paddles' | 'ships', view: CraftView, x: number, y: number, width: number, height = width, rotation = 0): void {
        const car = kind === 'vehicles' ? this.tutuCars.get(view) : undefined;
        if (car) { this.paint.draw(car, x, y, width, rotation, 1, 2, height); return; }
        super.craft(kind, view, x, y, width, height, rotation);
    }
    override stats() { const stats = super.stats(); return { ...stats, textures: stats.textures + this.bodies.size + this.gait.size + this.tutuCars.size }; }
    override fighter(view: FighterView, x: number, y: number, size: number): void {
        if (this.running && !this.reduced && (view === 'marche' || view === 'gauche')) {
            const key = this.gait.get(`${this.firing && view === 'marche' ? 'tir' : view}-${String(Math.floor(this.clock / 6) % 4)}`);
            if (key) { this.paint.draw(key, x, y, size, 0, 1, 2); return; }
        }
        const key = this.bodies.get(this.firing && view === 'marche' ? 'tir' : view);
        if (key) this.paint.draw(key, x, y, size, 0, 1, 2);
    }
}
