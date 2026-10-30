import { test } from 'vitest';
import { bossAndCages, escortShield, brickInteractions, piercingResume } from './character-games-4-checks';

test('Super-tir : score boss par PV et ouverture des cages', () => { bossAndCages(); });
test('Bouclier : protège du dégât forcé après perte escorte', () => { escortShield(); });
test('Balle forte : portails et effets de chaque brique', () => { brickInteractions(); });
test('Balle forte : reprise après contact traversant', () => { piercingResume(); });
