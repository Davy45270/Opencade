import './ts-loader.js';
import { Random } from '../src/engines/shared/random.ts';
import { validateCampaign } from './gourmandises-validation.js';

// Pass 318: fixed sampling stream, independent of the five board/policy seeds.
// One interior level per world, every finale, and the three tutorial levels.
// Worlds 1–3: specials/combinations (also exercised by the unchanged oracles),
// missing cells, crates and simple ice; 4: drops/exits; 5–6: simple/double ice;
// 7: chocolate; 8: hedges/flowers; 9: conveyor belts.
const SAMPLING_SEED = 318;
const random = new Random(SAMPLING_SEED);
// Keep an introduction in worlds 6 and 7 as well as their interior/finale:
// these strata prevent a two-level median from reversing world progression.
const levels = new Set([1, 2, 3, 101, 121]);
for (let world = 0; world < 9; world++) {
    levels.add(world * 20 + 1 + Math.floor(random.next() * 19));
    levels.add(world * 20 + 20);
}
await validateCampaign([...levels].sort((a, b) => a - b).map(level => level - 1));
