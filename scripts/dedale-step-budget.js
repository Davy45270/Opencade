/* global console */
// Deterministic work measure for the Dédale fast checks (replaces wall-clock oracles, model of f1bd630 Z15/Z36):
// a busy machine slows a check but never changes how many engine steps it performs.
export function countSteps(Engine) {
    const step = Engine.prototype.step;
    const counter = { steps: 0 };
    Engine.prototype.step = function (...args) { counter.steps++; return step.apply(this, args); };
    return counter;
}
export function within(id, steps, budget) {
    if (budget === undefined) throw new Error(`${id}: no step budget`);
    if (steps > budget) throw new Error(`${id}: ${String(steps)} engine steps > budget ${String(budget)}`);
    // The margin is capped too: a budget inflated far beyond the measure would no longer detect anything.
    if (budget > Math.max(10, Math.ceil(steps * 1.5 / 10) * 10)) throw new Error(`${id}: budget ${String(budget)} exceeds 1.5 × ${String(steps)} steps`);
    console.log(`${id}: ${String(steps)} steps (budget ${String(budget)})`);
}
