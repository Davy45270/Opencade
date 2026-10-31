import type { Level } from './levels';
export const WIDTH = 360, HEIGHT = 640, CELL = 2, COLS = WIDTH / CELL, ROWS = HEIGHT / CELL;
export interface Rect { x: number; y: number; width: number; height: number }
// Binary solidity and independent material/hardness: 1 soil, 2 rock, 3 timber.
export class Terrain {
    mask = new Uint8Array(COLS * ROWS);
    material = new Uint8Array(COLS * ROWS);
    hardness = new Uint8Array(COLS * ROWS);
    dirty: Rect[] = [];
    structure: Rect = { x: 260, y: 300, width: 34, height: 60 };
    constructor(level: Level) {
        for (let x = 0; x < WIDTH; x += CELL) {
            let surface = level.height + Math.sin(x / WIDTH * Math.PI * 2 * level.frequency) * level.amplitude;
            if (level.shape === 'cliffs') surface = Math.round(surface / 32) * 32;
            if (level.shape === 'crater') surface += Math.max(0, 1 - Math.abs(x - 180) / 120) * 70;
            if (level.shape === 'city') surface = level.height - (Math.floor(x / 38) % 3) * level.amplitude / 2;
            for (let y = Math.max(230, Math.round(surface / 2) * 2); y < 606; y += CELL) {
                const gap = Math.abs(x - level.gap) < (level.shape === 'islands' ? 18 : level.shape === 'bridge' ? 46 : 0);
                if (gap && y > surface + (level.shape === 'bridge' ? 8 : -2)) continue;
                this.set(x, y, level.shape === 'bridge' && gap ? 3 : y > surface + 38 ? 2 : 1);
            }
        }
        if (level.shape === 'cave') {
            this.rect(95, 230 + level.amplitude, 172, 18, 2);
            this.rect(112, 240 + level.amplitude, 12, 40, 2);
        }
        // Safe authored spawn shelves, still fully destructible.
        for (const x of [level.left, level.right]) {
            const y = this.surface(x);
            this.rect(x - 30, y - 76, 62, 76, 0);
            this.rect(x - 30, y, 62, 12, 1);
        }
        const sy = this.surface(level.right) - 62;
        this.structure = { x: level.right - 16, y: sy, width: 32, height: 54 };
        if (level.mission === 'structure') this.rect(this.structure.x, sy, 32, 54, 3);
        this.dirty = [{ x: 0, y: 0, width: WIDTH, height: HEIGHT }];
    }
    index(x: number, y: number): number { return Math.floor(y / CELL) * COLS + Math.floor(x / CELL); }
    solid(x: number, y: number): boolean {
        return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && this.mask[this.index(x, y)] === 1;
    }
    set(x: number, y: number, material: number): void {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
        const i = this.index(x, y);
        this.mask[i] = material ? 1 : 0; this.material[i] = material; this.hardness[i] = material === 2 ? 2 : material ? 1 : 0;
    }
    rect(x: number, y: number, w: number, h: number, mat: number): void {
        for (let xx = x; xx < x + w; xx += CELL) for (let yy = y; yy < y + h; yy += CELL) this.set(xx, yy, mat);
    }
    surface(x: number): number {
        for (let y = 180; y < HEIGHT; y += CELL) if (this.solid(x, y)) return y;
        return 606;
    }
    carve(x: number, y: number, radius: number): number {
        let removed = 0;
        const x0 = Math.max(0, Math.floor((x - radius) / CELL) * CELL), y0 = Math.max(0, Math.floor((y - radius) / CELL) * CELL);
        for (let yy = y0; yy <= Math.min(HEIGHT - CELL, y + radius); yy += CELL) {
            for (let xx = x0; xx <= Math.min(WIDTH - CELL, x + radius); xx += CELL) {
                if ((xx - x) ** 2 + (yy - y) ** 2 > radius ** 2) continue;
                const i = this.index(xx, yy);
                if (!this.mask[i]) continue;
                this.hardness[i] = Math.max(0, (this.hardness[i] ?? 1) - 1);
                if (!this.hardness[i]) { this.mask[i] = 0; this.material[i] = 0; removed++; }
            }
        }
        this.dirty.push({ x: x0, y: y0, width: Math.min(WIDTH - x0, radius * 2 + CELL), height: Math.min(HEIGHT - y0, radius * 2 + CELL) });
        return removed;
    }
    structureCount(): number {
        const r = this.structure; let n = 0;
        for (let x = r.x; x < r.x + r.width; x += CELL) for (let y = r.y; y < r.y + r.height; y += CELL) if (this.solid(x, y)) n++;
        return n;
    }
}
