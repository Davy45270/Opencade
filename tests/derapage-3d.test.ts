import { test } from 'vitest';
import { checkEngineUnchanged } from './derapage-3d-source';
import { viewCases } from './derapage-3d-cases';
test('Y01 moteur indépendant des jeux et des vues',checkEngineUnchanged,2000);
for(const check of viewCases) test(check.name,()=>{check.run();},2000);
