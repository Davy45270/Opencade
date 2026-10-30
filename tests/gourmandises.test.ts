import { test } from 'vitest';
import { oracles } from './gourmandises-oracles';
for (const [id, oracle] of Object.entries(oracles)) {
    test(`${id} règles pures`, () => { oracle(); }, 2000);
}
