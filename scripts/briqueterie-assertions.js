import assert from 'node:assert/strict';
export { test } from './node-test-assertions.js';
export function expect(value) {
    return {
        toBe: x => assert.equal(value, x), toEqual: x => assert.deepEqual(value, x),
        toHaveLength: x => assert.equal(value.length, x), toBeNull: () => assert.equal(value, null),
        toBeGreaterThan: x => assert.ok(value > x), toBeLessThan: x => assert.ok(value < x),
        toBeGreaterThanOrEqual: x => assert.ok(value >= x), toBeLessThanOrEqual: x => assert.ok(value <= x),
        toBeCloseTo: (x, digits = 2) => assert.ok(Math.abs(value - x) < 0.5 * 10 ** -digits, `${value} != ${x}`),
        toThrow: () => assert.throws(value), not: { toEqual: x => assert.notDeepEqual(value, x) },
    };
}
