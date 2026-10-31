import { test } from 'vitest';
import { marmailleCases } from './marmaille-cases';
for (const [name, run] of Object.entries(marmailleCases)) test(name, () => { run(); });
