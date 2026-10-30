import assert from 'node:assert/strict';
export const cases = [];
export const test = (name, run) => { cases.push([name,run]); };
export const vi = { mock() {} };
export function expect(actual, message) {
    const positive = {
        toBe: expected => { assert.equal(actual,expected,message); },
        toEqual: expected => { assert.deepEqual(actual,expected,message); },
        toBeDefined: () => { assert.notEqual(actual,undefined,message); },
        toBeGreaterThan: expected => { assert.ok(actual>expected,message); },
        toBeGreaterThanOrEqual: expected => { assert.ok(actual>=expected,message); },
        toBeLessThan: expected => { assert.ok(actual<expected,message); },
        toBeLessThanOrEqual: expected => { assert.ok(actual<=expected,message); },
    };
    return { ...positive, not: { toEqual: expected => { assert.notDeepEqual(actual,expected,message); } } };
}
