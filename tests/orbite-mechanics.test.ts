import { test } from 'vitest';
import { Engine } from '../src/engines/orbite/engine';
import { behaviors } from './orbite-behavior';
for (const [name, run] of Object.entries(behaviors)) test(name, () => { run(Engine); });
