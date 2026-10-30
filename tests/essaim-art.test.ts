import { test } from 'vitest';
import { checkArtPool, checkArtTextures } from './essaim-art-checks';
test('E-ART pool fixe sur 2000 pas de démo et mouvement réduit', checkArtPool);
test('E-ART textures générées une seule fois par gestionnaire', checkArtTextures);
