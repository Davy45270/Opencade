import { test } from 'vitest';
import { oracles } from './petits-pompiers-oracles';
for (const [id, run] of oracles) test(id, run, 10000);
