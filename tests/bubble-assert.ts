interface Assertions {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown): void;
    ok(value: unknown): asserts value;
}
const assert: Assertions = {
    equal(actual, expected, message) { if (actual !== expected) throw new Error(message ?? `${String(actual)} != ${String(expected)}`); },
    deepEqual(actual, expected) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); },
    ok(value): asserts value { if (!value) throw new Error('Assertion failed'); },
};
export default assert;
