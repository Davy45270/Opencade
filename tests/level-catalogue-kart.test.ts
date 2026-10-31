import { test } from 'vitest';
import { levelCatalogue } from '../src/content/level-catalogue';
import { kartMechanic } from './level-catalogue-kart-checks';
import { kartRecords } from './level-catalogue-kart-recordings';
import { checkKartReplayBudget } from './level-catalogue-kart-replay';
for (const entry of levelCatalogue.filter(e=>e.game==='derapage')) {
    const tapes=kartRecords.filter(r=>r.level===entry.index);
    test(`${entry.code} géométrie, mécanique et contre-épreuve`, () => {
        kartMechanic(entry.code,entry.index,tapes.find(t=>t.shortcut)?.laps[0]);
    },15000); // safety net only: the mechanic probes are bounded by their frame budgets
    test(`${entry.code} budget refusé avant simulation`, () => { for (const tape of tapes) checkKartReplayBudget(tape); });
    // Complete winning tapes run once via kartCatalogue in validate-level-catalogue.
}
