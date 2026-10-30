import { test } from 'vitest';
import { orbiteFleet, dedaleMix } from './variety-e';
test('O-FLEET flotte croissante par chapitre', () => { orbiteFleet(); });
test('D-MIX dosage et ordre des rencontres par niveau', () => { dedaleMix(); });
