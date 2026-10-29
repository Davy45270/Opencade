import assert from './bubble-assert';
import { createTrack, nearest, type Track, type Vec } from '../src/engines/derapage/track';
import { required } from '../src/engines/derapage/access';
// Exhaustive reference keeps the original operation order, including exact ties.
function exhaustive(t: Track, p: Vec) {
    let best = { index: 0, distance: Infinity, x: 0, y: 0, along: 0, nx: 0, ny: 0 };
    for (let i = 0; i < t.points.length; i++) {
        const a = required(t.points[i]), b = required(t.points[(i + 1) % t.points.length]);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
        const x = a.x + dx * u, y = a.y + dy * u, distance = Math.hypot(p.x - x, p.y - y);
        if (distance < best.distance) best = { index: i, distance, x, y, along: required(t.distances[i]) + len * u, nx: -dy / len, ny: dx / len };
    }
    return best;
}
export function exactNearest(): void {
    const p = { x: 0, y: 0 };
    for (let level = 0; level < 30; level++) {
        const t = createTrack(level);
        for (const index of [95, 0, 48, 1, 72, 24]) {
            for (const offset of [-100, -3, 0, 3, 100]) {
                Object.assign(p, required(t.points[index])); p.x += offset; p.y -= offset;
                assert.deepEqual(nearest(t, p), exhaustive(t, p));
            }
        }
        // A reused point may query another polyline, or one edited in place.
        const ideal = { ...t, points: t.racingLine };
        assert.deepEqual(nearest(ideal, p), exhaustive(ideal, p));
        required(t.points[0]).x += 10;
        assert.deepEqual(nearest(t, p), exhaustive(t, p));
    }
    const t = createTrack(0);
    t.points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    Object.assign(p, { x: 0, y: 5 }); nearest(t, p); // Hint at segment 3.
    Object.assign(p, { x: 5, y: 5 });
    assert.deepEqual(nearest(t, p), exhaustive(t, p));
    assert.equal(nearest(t, p).index, 0);
}
