import { test } from 'vitest';
import { vehicles, launchersAndBubbles, boundedTextures } from './arcade-art-checks';
test('Habillage : cinq véhicules distincts et cinq vues avec pilote', vehicles, 2000);
test('Habillage : lanceurs distincts, couleurs contrastées et motifs indépendants', launchersAndBubbles, 2000);
test('Habillage : cache unique, sprites bornés et nettoyage', boundedTextures, 2000);
