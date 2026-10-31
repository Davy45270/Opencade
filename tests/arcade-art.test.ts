import { test } from 'vitest';
import { vehicles, launchersAndBubbles, boundedTextures, vehicleSignature, vehicleSignaturesDistinct, ordinaryScenery } from './arcade-art-checks';
test('Habillage : cinq véhicules distincts et cinq vues avec pilote', vehicles, 2000);
test('Habillage : lanceurs distincts, couleurs contrastées et motifs indépendants', launchersAndBubbles, 2000);
test('Habillage : cache unique, sprites bornés et nettoyage', boundedTextures, 2000);

for (const id of ['panda','pandaroux','dragon','singe','licorne'] as const) test(`Vehicle Graphics signature: ${id}`,()=>{vehicleSignature(id);},2000);
test('Vehicle Graphics signatures distinct',vehicleSignaturesDistinct,2000);
test('Ordinary roadside themes, deterministic and outside road',ordinaryScenery,2000);
