import { test } from 'vitest';
import { oracles } from './bombercade-oracles';
for (const [id, run] of oracles) test(id, run, 2000);
