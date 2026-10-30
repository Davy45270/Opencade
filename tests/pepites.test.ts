import { test } from 'vitest';
import { cases } from './pepites-cases';
for (const [name, oracle] of Object.entries(cases)) test(name, oracle, 2000);
