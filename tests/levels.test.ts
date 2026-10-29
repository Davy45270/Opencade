import { expect, test } from 'vitest';
import { Engine, center, valid, ROW_STEP, type Cell } from '../src/engines/bubble/engine';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
import { Progression } from '../src/shell/progression';
import { readSave, writeSave, SAVE_KEY, type StoragePort } from '../src/shell/storage';
test('L01 niveaux valides et difficulté monotone', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10);
    LEVELS.forEach((level, index) => {
        const grid = generateLevel(index, level.seed);
        expect(grid.length).toBeGreaterThan(0);
        for (const cell of grid) {
            expect(valid(cell.row, cell.col)).toBe(true);
            expect(center(cell).y + 20).toBeLessThan(455);
            expect(cell.color).toBeLessThan(level.colors);
        }
        const previous = LEVELS[index - 1];
        if (previous) {
            expect(level.colors).toBeGreaterThanOrEqual(previous.colors);
            expect(level.rows).toBeGreaterThanOrEqual(previous.rows);
            expect(level.interval).toBeLessThanOrEqual(previous.interval || Infinity);
        }
    });
    expect(LEVELS.at(-1)?.colors).toBeGreaterThanOrEqual(6);
    expect(LEVELS[0]?.interval).toBe(0);
});
test('L02 génération et états sérialisés déterministes sensibles à la graine', () => {
    for (let index = 0; index < LEVELS.length; index++) {
        expect(generateLevel(index, 10)).toEqual(generateLevel(index, 10));
        expect(generateLevel(index, 10)).not.toEqual(generateLevel(index, 11));
        const play = () => {
            const e = new Engine(); e.loadLevel(index, 10);
            for (const angle of [0, 0.4, -0.5]) { e.aim(angle); e.shoot(); e.advance(10000); }
            return JSON.stringify(e.snapshot());
        };
        expect(play()).toBe(play());
    }
});
function prepare(e: Engine, count: number): void {
    for (let i = 0; i < count; i++) {
        e.setNext((i % 2 + 1) as 1 | 2);
        e.aim(-0.28);
        expect(e.shoot()).toBe(true);
        e.advance(10000);
        expect(e.last.popped).toHaveLength(0);
        expect(e.status).toBe('playing');
    }
}
const remote: Cell[] = [{ row: 0, col: 0, color: 1 }, { row: 0, col: 8, color: 2 }];
test('L03 descente exactement au Nième tir résolu et géométrie translatée', () => {
    const e = new Engine(); e.loadLevel(9); e.load(remote, 1);
    prepare(e, 5);
    expect(e.drops).toBe(0); expect(e.shotsBeforeDrop).toBe(1);
    e.setNext(2); e.shoot(); expect(e.drops).toBe(0); e.advance(10000);
    expect(e.drops).toBe(1); expect(e.resolved).toBe(6);
    expect(center((remote[0] ?? { row: 0, col: 0 }), e.drops).y - center((remote[0] ?? { row: 0, col: 0 })).y).toBeCloseTo(ROW_STEP);
    expect(e.grid[0]).toEqual(remote[0]);
    expect(e.trace().segments.at(-1)?.to.y).toBeGreaterThan(20);
});
test('L04 descente déclenche défaite et victoire ne descend pas', () => {
    const e = new Engine(); e.loadLevel(9);
    e.load([...remote, { row: 11, col: 7, color: 1 }], 1);
    prepare(e, 5); e.setNext(2); e.shoot(); e.advance(10000);
    expect(e.drops).toBe(1); expect(e.status).toBe('lost');
    // Five non-winning resolutions by alternating colors on a connected branch.
    // Then remove the whole branch with the central match on the sixth resolution.
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 },
        { row: 1, col: 3, color: 1 }, { row: 1, col: 2, color: 2 }]);
    for (let i = 0; i < 5; i++) {
        e.setNext((i % 2 + 1) as 1 | 2); e.aim(-0.13);
        expect(e.shoot()).toBe(true); e.advance(10000);
        expect(e.last.popped).toHaveLength(0);
    }
    expect(e.resolved).toBe(5); expect(e.drops).toBe(0); expect(e.status).toBe('playing');
    e.aim(0.04); e.setNext(0); e.shoot(); e.advance(10000);
    expect(e.status).toBe('won'); expect(e.resolved).toBe(6); expect(e.drops).toBe(0);
});
test('L05 connexions et chutes après descente', () => {
    const e = new Engine(); e.loadLevel(9);
    e.load([...remote, { row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 1, col: 5, color: 1 }]);
    prepare(e, 6); expect(e.drops).toBe(1);
    e.aim(0); e.setNext(0); e.shoot(); e.advance(10000);
    expect(e.last.popped).toHaveLength(3); expect(e.last.fallen).toHaveLength(1);
    expect(e.grid).toContainEqual(remote[0]); expect(e.status).toBe('playing');
});
test('L06 PRNG limité à la palette du niveau', () => {
    LEVELS.forEach((level, index) => {
        const e = new Engine(); e.loadLevel(index);
        for (let i = 0; i < 100; i++) {
            e.load([], 0, i); e.shoot(); e.advance(10000);
            expect(e.next).toBeLessThan(level.colors); expect(e.queued).toBeLessThan(level.colors);
        }
    });
});
test('L07 progression victoire défaite reprise et dernier niveau', () => {
    const p = new Progression(); p.finish('won', 30);
    expect(p.save).toEqual({ unlocked: 2, best: 30 }); expect(p.total).toBe(30);
    p.next(); expect(p.level).toBe(1); p.finish('lost', 90); expect(p.total).toBe(30);
    p.retry(); expect(p.state).toBe('playing'); expect(p.total).toBe(30);
    p.finish('won', 40); expect(p.total).toBe(70);
    p.start(9); p.finish('won', 10); expect(p.state).toBe('complete'); expect(p.save.unlocked).toBe(10);
});
test('L08 sauvegarde absente erreurs JSON et valeurs hors bornes', () => {
    const defaults = { unlocked: 1, best: 0 };
    expect(readSave()).toEqual(defaults); expect(() => { writeSave(undefined, defaults); }).not.toThrow();
    const broken: StoragePort = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readSave(broken)).toEqual(defaults); expect(() => { writeSave(broken, defaults); }).not.toThrow();
    for (const raw of ['{', 'null', '{}', '{"unlocked":11,"best":2}', '{"unlocked":0,"best":0}', '{"unlocked":1,"best":-1}', '{"unlocked":1.5,"best":0}', '{"unlocked":1,"best":"0"}']) {
        expect(readSave({ getItem: () => raw, setItem: () => undefined })).toEqual(defaults);
    }
});
test('L09 aller-retour sauvegarde versionnée', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
    writeSave(storage, { unlocked: 5, best: 120 });
    expect(map.has(SAVE_KEY)).toBe(true); expect(readSave(storage)).toEqual({ unlocked: 5, best: 120 });
});
