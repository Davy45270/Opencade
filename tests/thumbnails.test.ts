import { test, expect, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class { key = 'mock'; } } }));
import { games } from '../src/games/registry';
import { startThumbnail, type ThumbnailPorts } from '../src/shell/thumbnails';
import type { Thumbnail } from '../src/games/thumbnail';

function recording() {
    const calls: unknown[] = [];
    const context = new Proxy({}, {
        get: (_target, key) => (...args: unknown[]) => { calls.push([key, ...args]); },
        set: (_target, key, value: unknown) => { calls.push([key, value]); return true; },
    }) as CanvasRenderingContext2D;
    return { calls, context };
}
test('V01 huit rendus déterministes sur contexte 2D', () => {
    expect(games).toHaveLength(8);
    for (const game of games) {
        expect(game.demo(28)).toBeDefined();
        const a = game.thumbnail(28), b = game.thumbnail(28);
        const x = recording(), y = recording();
        for (let i = 0; i < 40; i++) { a.step(); b.step(); a.draw(x.context); b.draw(y.context); }
        expect(x.calls.length, game.id).toBeGreaterThan(100);
        expect(x.calls, game.id).toEqual(y.calls);
    }
});
test('V02 2000 pas, évolution et redémarrages ordinaires', () => {
    for (const game of games) {
        for (const status of ['won', 'lost']) {
            const demo = game.demo(28);
            demo.engine.status = status;
            demo.step();
            expect(demo.restarts, game.id).toBe(1);
            expect(demo.engine.status, game.id).toBe('playing');
        }
        const thumbnail = game.thumbnail(28), initial = thumbnail.read();
        thumbnail.step();
        expect(thumbnail.read(), game.id).not.toEqual(initial);
        for (let i = 1; i < 2000; i++) thumbnail.step();
        expect(thumbnail.restarts, game.id).toBeGreaterThan(0);
    }
});
test('V03 horloge, intersection, arrière-plan, reduce et nettoyage', () => {
    const callbacks = new Map<number, (time: number) => void>();
    let next = 0, hidden = false, reduced = false;
    let intersection: (visible: boolean) => void = () => {};
    let visibility: () => void = () => {};
    let motion: () => void = () => {};
    const disposed = vi.fn();
    const ports: ThumbnailPorts = {
        request: cb => { callbacks.set(++next, cb); return next; }, cancel: id => { callbacks.delete(id); },
        observe: (_canvas, cb) => { intersection = cb; return disposed; },
        visibility: cb => { visibility = cb; return disposed; },
        motion: cb => { motion = cb; return disposed; },
        hidden: () => hidden, reduced: () => reduced, ratio: 3,
    };
    const context = recording().context;
    const canvas = { getContext: () => context, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    const draw = vi.fn(), step = vi.fn(), painted = vi.fn();
    const demo: Thumbnail = { draw, step, read: () => null, restarts: 0 };
    const controller = startThumbnail(canvas, demo, ports, painted);
    const tick = (time: number): void => { const batch = [...callbacks.values()]; callbacks.clear(); for (const cb of batch) cb(time); };
    expect(callbacks.size).toBe(0); expect(draw).not.toHaveBeenCalled();
    expect(canvas.width).toBe(320);
    intersection(true); tick(0); tick(30); tick(67);
    expect(draw).toHaveBeenCalledTimes(2);
    intersection(false); tick(100); expect(callbacks.size).toBe(0);
    intersection(true); hidden = true; visibility(); tick(200);
    expect(draw).toHaveBeenCalledTimes(2); expect(callbacks.size).toBe(0);
    hidden = false; visibility(); tick(300); expect(draw).toHaveBeenCalledTimes(3);
    reduced = true; motion(); tick(500); expect(callbacks.size).toBe(0);
    controller.stop(); expect(disposed).toHaveBeenCalledTimes(3);
    intersection(true); visibility(); tick(600); expect(draw).toHaveBeenCalledTimes(3);
    const fixed = startThumbnail(canvas, demo, ports, painted);
    intersection(true); tick(800); visibility();
    expect(draw).toHaveBeenCalledTimes(4); expect(callbacks.size).toBe(0); fixed.stop();
});
