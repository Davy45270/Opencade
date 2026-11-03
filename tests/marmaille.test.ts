import { test } from 'vitest';
import { marmailleCases } from './marmaille-cases';
import { marmailleArtCases } from './marmaille-art-checks';
for (const [name, run] of Object.entries(marmailleCases)) test(name, () => { run(); });
for (const [name, run] of Object.entries(marmailleArtCases)) test(name, () => { run(); });
