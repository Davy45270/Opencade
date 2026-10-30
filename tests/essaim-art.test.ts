import { test } from 'vitest';
import { checkArtPool, checkArtTextures, checkSignaturePool } from './essaim-art-checks';
test('E-ART pool fixe sur 2000 pas de démo et mouvement réduit', checkArtPool);
test('E-ART textures générées une seule fois par gestionnaire', checkArtTextures);

for (const id of ['panda','pandaroux','dragon','singe','licorne'] as const) test(`S-essaim-05 pool ${id} sur 2000 pas`,()=>{ checkSignaturePool(id); });
