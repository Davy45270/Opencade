# Cadence de la vue de dessus

Le [rapport actuel](derapage-latency.md) étend les mesures ci-dessous aux trente
circuits, ajoute les rails et joints urbains au cache et décrit le pilote retardé.

La route conserve son dessin en capsules jointes, sa largeur et ses couleurs.
`RoadLayer` le rasterise une fois à cinq pixels par unité du monde, puis déplace,
tourne ou réduit une image. Le fond reste sous la route et les accessoires,
karts et HUD au-dessus. Une seule texture appartient à la scène : changement de
circuit, arrêt et destruction libèrent l'ancienne texture. Les éléments animés
restent animés ; les bandes conservent leur géométrie et leurs trois chevrons.
Leurs empreintes et les décors utilisent des bornes d'écran conservatrices.
Les normales des sommets sont calculées une fois par circuit. Le HUD conserve
ses lignes DOM et ne change leur texte que si celui-ci change.

## Mesure reproductible

`node --import ./scripts/ts-loader.js scripts/measure-derapage-render.js`
charge les sources historiques avec `git show`, puis le rendu du répertoire de
travail. Le dessin ancien de la route se trouve dans `scene.ts` ; il n'avait pas
de module `road.ts`. Les trois rendus utilisent les mêmes circuits physiques
actuels, la graine 28, le même pilote et la caméra fixe. Chaque maximum porte
sur les 96 positions centrales du circuit, en état de course, après création
du cache. Tous les appels Graphics sont comptés, y compris styles, effacements
et transformations, sur toutes les couches dynamiques. La rasterisation initiale
est comptée séparément et son absence aux images suivantes est vérifiée.

| Circuit | Ancien rendu f1bd630 | Avant correction 82f3ea4 | Après correction | Plafond ancien +25 % |
| --- | ---: | ---: | ---: | ---: |
| 1 | 591 | 845 | 400 | 738 |
| 10 | 572 | 860 | 390 | 715 |
| K03 | 471 | 919 | 436 | 588 |

Les appels ne constituent pas une mesure d'images par seconde. Sans navigateur,
le gain de cadence réel reste à remesurer sur le même appareil. Le coût principal
supprimé est la reconstruction et la rasterisation répétée des polygones et des
disques de la route. Le rendu évite aussi la copie profonde du circuit à chaque
image, qui empêcherait de reconnaître le circuit déjà mis en cache.

## Temps réel et oracle

La scène calcule l'intervalle entre deux horodatages `update`, indépendamment du
delta lissé. Elle le borne à 250 ms et le transmet à `Engine.step`, qui conserve
ses pas fixes sans modification. Une reprise après pause établit une nouvelle
origine temporelle. Le compteur de cadence 3D reçoit l’intervalle brut, sans le plafond propre à la simulation.

`check-derapage-cadence.js`, inscrit dans `test:node`, vérifie les budgets sur les
trois circuits, la réutilisation du cache pendant les déplacements, rotations
et changements d'échelle, son remplacement après changement de circuit et la
conservation des lignes du HUD, le nombre d’affectations à leur texte,
l’origine, la position, l’échelle, la rotation et la visibilité de l’image,
et la suppression effective de l’ancienne texture. Il rejette explicitement un dépassement du
budget. À 4, 10 et 60 images par seconde, dix secondes d'horodatages synthétiques
produisent 600 pas fixes et un état moteur identique, malgré un delta fourni de
16,67 ms. Deux secondes entre deux images n'ajoutent que quinze pas fixes
(250 ms). Aucune assertion ne consulte l'horloge de la machine.

Trois mutations exécutées doivent échouer : reconstruire la route à chaque
image, reprendre le delta lissé pour la simulation, enlever la borne de 250 ms.
