/* Deterministic step budgets: see dedale-step-budget.js. */
import './ts-loader.js';
import { countSteps, within } from './dedale-step-budget.js';
const { Engine } = await import('../src/engines/dedale/engine.ts');
const counter = countSteps(Engine);
const { mechanicCases } = await import('../tests/dedale-mechanics.ts');
const { campaignCases } = await import('../tests/dedale-campaign.ts');
const { STEP_BUDGETS } = await import('./dedale-step-budgets.js');
let total = 0;
for (const [id, run] of Object.entries({ ...mechanicCases, ...campaignCases })) {
    counter.steps = 0; run(); total += counter.steps;
    within(id, counter.steps, STEP_BUDGETS[id]);
}
within('complete fast suite', total, STEP_BUDGETS.total);
