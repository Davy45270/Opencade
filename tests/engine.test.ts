import { describe, expect, test } from 'vitest';
import { Engine, center, RADIUS, WIDTH, ROWS, type Cell } from '../src/engines/bubble/engine';
const pair: Cell[] = [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }];
function shoot(grid: Cell[], angle = 0, next: 0 | 1 | 2 | 3 = 0): Engine {
    const e = new Engine();
    e.load(grid, next);
    e.aim(angle);
    expect(e.shoot()).toBe(true);
    e.advance(10000);
    return e;
}
describe('Oracle Bubble Lab', () => {
    test('T01 tir vide accroché au plafond', () => {
        const e = shoot([]);
        expect(e.grid).toEqual([{ row: 0, col: 4, color: 0 }]);
        expect(e.status).toBe('playing');
    });
    test('T02 rebond : impact paroi et inversion de la direction x', () => {
        const e = new Engine();
        e.load([]);
        const path = e.trace(0.8);
        const first = path.segments[0];
        const second = path.segments[1];
        expect(first?.bounce).toBe(true);
        expect(first?.to.x).toBeCloseTo(WIDTH - RADIUS);
        expect(second?.from).toEqual(first?.to);
        expect(second?.direction.x).toBeCloseTo(-(first?.direction.x ?? 0));
        expect(second?.direction.y).toBe(first?.direction.y);
        expect(shoot([], 0.8).grid[0]?.row).toBe(0);
    });
    test('T03 deux bulles restent', () => {
        const e = shoot([{ row: 0, col: 4, color: 0 }]);
        expect(e.grid).toHaveLength(2);
        expect(e.score).toBe(0);
    });
    test('T04 trois bulles disparaissent', () => {
        const e = shoot(pair);
        expect(e.last.popped).toHaveLength(3);
        expect(e.grid).toEqual([]);
        expect(e.score).toBe(30);
    });
    test('T05 groupe de quatre disparaît entièrement', () => {
        const e = shoot([...pair, { row: 0, col: 5, color: 0 }]);
        expect(e.last.popped).toHaveLength(4);
        expect(e.grid).toEqual([]);
        expect(e.score).toBe(40);
    });
    test('T06 bulles détachées retirées et score de chute', () => {
        const e = shoot([...pair, { row: 1, col: 5, color: 1 }]);
        expect(e.last.fallen).toEqual([{ row: 1, col: 5, color: 1 }]);
        expect(e.grid).toEqual([]);
        expect(e.score).toBe(50);
    });
    test('T07 branche reliée au plafond conservée', () => {
        const anchor: Cell = { row: 0, col: 0, color: 1 };
        const e = shoot([...pair, anchor, { row: 1, col: 0, color: 2 }]);
        expect(e.grid).toEqual([anchor, { row: 1, col: 0, color: 2 }]);
        expect(e.last.fallen).toEqual([]);
    });
    test('T08 grille vidée : victoire', () => {
        expect(shoot(pair).status).toBe('won');
    });
    test('T09 attachement à la ligne : défaite', () => {
        const grid: Cell[] = [];
        for (let row = 0; row < ROWS - 1; row++)
            grid.push({ row, col: 4, color: row % 2 ? 1 : 2 });
        const e = shoot([...grid, { row: 0, col: 0, color: 0 }]);
        expect(e.last.attached?.row).toBe(ROWS - 1);
        expect(e.status).toBe('lost');
    });
    test('T10 restart réinitialise grille score statut progression et générateur', () => {
        const e = new Engine(12);
        const initial = e.snapshot();
        e.load(pair);
        e.shoot();
        e.advance(10000);
        expect(e.score).toBe(30);
        e.restart();
        expect(e.snapshot()).toEqual(initial);
    });
    test('T11 même graine et tirs : états sérialisés identiques ; autre graine différente', () => {
        function play(seed: number) {
            const e = new Engine(seed);
            for (const angle of [-0.3, 0.2, 0.7, -0.8, 0]) {
                e.aim(angle);
                e.shoot();
                e.advance(10000);
            }
            return e.snapshot();
        }
        expect(JSON.stringify(play(450))).toBe(JSON.stringify(play(450)));
        expect(JSON.stringify(play(451))).not.toBe(JSON.stringify(play(450)));
        expect(play(451).grid).not.toEqual(play(450).grid);
    });
});
describe('Situations limites', () => {
    test('Collision entre cellules : cellule libre voisine la plus proche de l’impact', () => {
        const e = new Engine();
        e.load([{ row: 0, col: 4, color: 1 }, { row: 0, col: 5, color: 2 }, { row: 0, col: 0, color: 0 }]);
        e.aim(Math.atan2(20, 550));
        const path = e.trace();
        const hit = path.segments.at(-1)?.to;
        if (!hit)
            throw new Error('Impact manquant');
        // The ray passes between the ceiling bubbles at (180,20) and (220,20).
        // The shared free socket below them is (200,20+20*sqrt(3)).
        const expected: Cell = {row: 1, col: 4, color: 0};
        expect(path.target).toEqual(expected);
        const expectedCenter = center(expected);
        const impactDistance = Math.hypot(expectedCenter.x-hit.x, expectedCenter.y-hit.y);
        expect(impactDistance).toBeLessThan(Math.hypot(160-hit.x, 20+20*Math.sqrt(3)-hit.y));
        expect(impactDistance).toBeLessThan(Math.hypot(240-hit.x, 20+20*Math.sqrt(3)-hit.y));
        expect(shoot(e.grid, e.angle).last.attached).toEqual(path.target);
    });
    test('Tir le long du bord : rebonds et attachement valides sans sortie de grille', () => {
        const e = shoot([], 1.35);
        expect(e.grid).toHaveLength(1);
        expect(center(e.grid[0] ?? { row: 0, col: 0 }).x).toBeGreaterThanOrEqual(RADIUS);
        expect(center(e.grid[0] ?? { row: 0, col: 0 }).x).toBeLessThanOrEqual(WIDTH - RADIUS);
        expect(e.grid[0]?.row).toBe(0);
    });
    test('Grille presque pleine : dernier emplacement puis défaite', () => {
        const grid: Cell[] = [];
        for (let row = 0; row < ROWS - 1; row++)
            for (let col = 0; col < (row % 2 ? 8 : 9); col++)
                grid.push({ row, col, color: row % 2 ? 1 : 2 });
        grid[0] = { row: 0, col: 0, color: 0 };
        const e = shoot(grid);
        expect(e.grid).toHaveLength(grid.length + 1);
        expect(e.last.attached?.row).toBe(ROWS - 1);
        expect(e.status).toBe('lost');
    });
    test('Tirs rapides : second refusé pendant le vol, accepté après résolution', () => {
        const e = new Engine();
        e.load([]);
        expect(e.shoot()).toBe(true);
        expect(e.shoot()).toBe(false);
        expect(e.shots).toBe(1);
        expect(e.advance(1)).toBeNull();
        expect(e.shoot()).toBe(false);
        e.advance(10000);
        expect(e.grid).toHaveLength(1);
        expect(e.shoot()).toBe(true);
        expect(e.shots).toBe(2);
    });
    test('Grille invalide refusée sans mutation', () => {
        const e = new Engine();
        const before = e.snapshot();
        expect(() => {
            e.load([{ row: 0, col: 20, color: 0 }]);
        }).toThrow('Invalid grid');
        expect(e.snapshot()).toEqual(before);
    });
});
