import { test } from 'vitest';
import { checkEngineUnchanged } from './derapage-3d-source';
import { viewCases } from './derapage-3d-cases';
// Cases are bounded by counted frames and calls; the Vitest timeout is only a safety net, never an oracle.
test('Y01 moteur indépendant des jeux et des vues',checkEngineUnchanged,15000);
for(const check of viewCases) test(check.name,()=>{check.run();},15000);
