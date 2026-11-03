# Les Artificiers au téléphone

Les dessins des cinq compagnons sont cuits dans quinze textures de poses (une génération par pose), avec un lanceur tenu et teinté. Les trois décors restent cuits en texture ; le terrain conserve ses régions sales. Aucun visuel de référence externe n’est ajouté au dépôt.

Sur un écran 360 × 640, avec 44 px de bandeau et 64 px de commandes, le facteur FIT est 532/640. Le test mesure les sommets réellement peints, pas la boîte transparente : minimum supérieur à 40 px pour les cinq personnages et les trois poses. La taille carrée passe de 42 à 88 unités. Les barres de vie font 6 unités de haut, au-dessus de la tête. La zone de départ du glisser couvre aussi la tête.

Le corps passe de 16 unités de haut à une ellipse de 28 × 50 pour les projectiles, avec un contour échantillonné pour les murs et le grappin. Les pieds, le plafond et l’eau utilisent cette hauteur. Le canon sort à 32 unités du centre au lieu de 12. Les coéquipiers sont espacés de 48 unités au lieu de 18 ; les centres des équipes gardent une marge de silhouette aux bords. Les plateformes font 48/96/144 unités de large selon les effectifs, avec 96 unités de dégagement. Les départs trop encaissés sont relevés selon l’amplitude du relief. La poussée horizontale passe de 1,4 à 1,8 et la verticale de 1,3 à 1,6 ; le saut de 112 à 130. Le seuil de chute sans dégâts passe de 45 à 60, puis 0,6 PV par unité au lieu de 0,7. La portée des dégâts inclut le rayon du nouveau corps ; les PV et dégâts nominaux des armes restent stables.

L’IA cherche toujours dans le véritable intégrateur, avec le vent courant. Après la recherche, deux erreurs signées indépendantes modifient l’angle et la puissance. Elles dépendent uniquement de la graine publique et du tour, sans consommer le générateur du jeu ni consulter le résultat du tir. Les amplitudes sont calibrées par carte, car le relief et la distance modifient la sensibilité à une erreur de visée. Les trois paliers couvrent 1–7, 8–16 et 17–30. Le pilote de calibration conserve sa politique de visée.

## Mesure de l’IA

Commande reproductible : `node scripts/measure-artificiers.js`. Huit graines publiques par carte (19, 37, 73, 101, 149, 220, 307, 401), trente cartes, cible immobile de 100 PV, au plus douze tentatives par essai. Un seul tireur et une seule cible sont conservés. Vol et dégâts proviennent du moteur. Carte et corps sont remis en place après chaque explosion ; les dégâts sont cumulés séparément, sans noyade ni chute. Les munitions sont conservées pour isoler la précision. La commande effectue toutes les recherches en direct.

« Avant » désigne le réglage trop précis présent au début de la calibration, avec les mêmes tailles de corps et la même physique.

| Niveaux | Coups au but avant → après | Tours par élimination avant → après | Éliminations avant → après |
|---|---:|---:|---:|
| 1–7 | 82.6 % → 51.3 % | 4.30 → 6.24 | 56/56 → 55/56 |
| 8–16 | 96.6 % → 63.9 % | 2.82 → 4.96 | 72/72 → 72/72 |
| 17–30 | 100.0 % → 83.5 % | 2.46 → 3.73 | 112/112 → 112/112 |

Les tours moyens excluent les essais sans élimination après douze tentatives ; les moyennes plafonnées figurent dans `artificiers-phone-validation.json`. Au premier palier, un seul essai sur 56 n’élimine pas la cible. La moyenne glissante arithmétique sur trois taux par niveau est monotone. Le plus grand écart entre deux niveaux voisins est de 4,8 points ; les frontières des paliers ajoutent respectivement 2,2 et 1,6 point.

| Niveau | Coups au but avant | Coups au but après | Tours après | Éliminations après |
|---|---:|---:|---:|---:|
| 1 | 100.0 % | 48.3 % | 6.86 | 7/8 |
| 2 | 45.3 % | 50.0 % | 6.00 | 8/8 |
| 3 | 100.0 % | 51.0 % | 6.13 | 8/8 |
| 4 | 93.1 % | 51.0 % | 6.13 | 8/8 |
| 5 | 91.5 % | 52.8 % | 6.63 | 8/8 |
| 6 | 100.0 % | 53.3 % | 5.63 | 8/8 |
| 7 | 77.4 % | 52.9 % | 6.38 | 8/8 |
| 8 | 100.0 % | 55.1 % | 6.13 | 8/8 |
| 9 | 90.5 % | 59.5 % | 5.25 | 8/8 |
| 10 | 100.0 % | 60.4 % | 6.63 | 8/8 |
| 11 | 100.0 % | 61.8 % | 4.25 | 8/8 |
| 12 | 82.8 % | 64.9 % | 4.63 | 8/8 |
| 13 | 100.0 % | 67.5 % | 5.00 | 8/8 |
| 14 | 100.0 % | 66.7 % | 4.50 | 8/8 |
| 15 | 100.0 % | 71.4 % | 4.38 | 8/8 |
| 16 | 100.0 % | 74.2 % | 3.88 | 8/8 |
| 17 | 100.0 % | 75.8 % | 4.13 | 8/8 |
| 18 | 100.0 % | 75.8 % | 4.13 | 8/8 |
| 19 | 100.0 % | 79.3 % | 3.63 | 8/8 |
| 20 | 100.0 % | 79.4 % | 4.25 | 8/8 |
| 21 | 100.0 % | 81.3 % | 4.00 | 8/8 |
| 22 | 100.0 % | 82.8 % | 3.63 | 8/8 |
| 23 | 100.0 % | 81.8 % | 4.13 | 8/8 |
| 24 | 100.0 % | 83.3 % | 3.75 | 8/8 |
| 25 | 100.0 % | 85.3 % | 4.25 | 8/8 |
| 26 | 100.0 % | 87.5 % | 3.00 | 8/8 |
| 27 | 100.0 % | 88.5 % | 3.25 | 8/8 |
| 28 | 100.0 % | 89.7 % | 3.63 | 8/8 |
| 29 | 100.0 % | 91.7 % | 3.00 | 8/8 |
| 30 | 100.0 % | 92.9 % | 3.50 | 8/8 |

Le test `aiCurve` partage le protocole de la commande et verrouille les trois fourchettes, les 5–7 tours du premier palier, la monotonie glissante et un écart maximal de huit points entre niveaux voisins. Deux cas négatifs appliquent réellement le réglage supérieur aux mêmes cartes et graines du palier inférieur : la borne haute doit les rejeter.

Pour limiter le travail du test, `artificiers-aim-search.json` conserve les recherches idéales, avant toute erreur, sur les douze tentatives des huit graines. Une recherche complète est revérifiée par carte ; tous les vols après erreur et toutes les explosions sont exécutés en direct. Chaque carte reste sous le budget de travail déterministe existant. Le cache peut être régénéré par `node scripts/record-artificiers-aim.js` ; il ne sert jamais à l’IA du jeu. Le rapport complet provient de la mesure sans cache.

## Parties enregistrées

Les trente bandes ont été régénérées avec `scripts/record-artificiers.js`, dont le pilote est inchangé : 24 bandes changent et six restent identiques. Elles sont rejouées commande par commande. Tours affichés : tour de victoire inclus (`final.turn + 1`).

| Niveau | Tours avant | Tours après | Graine après | Personnage après |
|---|---:|---:|---:|---|
| 1 | 3 | 3 | 220 | panda |
| 2 | 3 | 3 | 220 | panda |
| 3 | 3 | 3 | 220 | panda |
| 4 | 3 | 3 | 220 | panda |
| 5 | 1 | 1 | 220 | panda |
| 6 | 5 | 5 | 220 | panda |
| 7 | 5 | 5 | 220 | panda |
| 8 | 9 | 9 | 220 | panda |
| 9 | 5 | 5 | 220 | panda |
| 10 | 1 | 1 | 220 | panda |
| 11 | 3 | 3 | 220 | panda |
| 12 | 5 | 5 | 220 | panda |
| 13 | 5 | 4 | 220 | panda |
| 14 | 5 | 5 | 220 | panda |
| 15 | 1 | 1 | 220 | panda |
| 16 | 5 | 5 | 220 | panda |
| 17 | 9 | 9 | 220 | panda |
| 18 | 13 | 13 | 220 | panda |
| 19 | 11 | 9 | 220 | panda |
| 20 | 1 | 1 | 220 | panda |
| 21 | 3 | 3 | 220 | panda |
| 22 | 9 | 9 | 220 | panda |
| 23 | 7 | 7 | 220 | panda |
| 24 | 11 | 13 | 220 | panda |
| 25 | 1 | 1 | 220 | panda |
| 26 | 9 | 11 | 220 | panda |
| 27 | 9 | 9 | 220 | panda |
| 28 | 17 | 17 | 220 | panda |
| 29 | 9 | 9 | 220 | panda |
| 30 | 1 | 1 | 220 | panda |

Le pilote direct et le doigt simulé à 360 × 640 (latence de 150 ms, bruit déterministe ±12 px) gagnent les niveaux 1 et 10 sur les graines 220, 19, 37 et 101. Les tests conservent les budgets de travail déterministes. La diversité des trente masques, des six formes et des quatre missions reste vérifiée. Les tailles, le rendu et la physique des personnages sont conservés.

## Rendu à vérifier

Budget : maximum de 79 appels Graphics dans les scénarios chargés sur les trente niveaux ; plafond 500. Le maximum des rejeux est consigné dans le rapport de validation. Les images des compagnons utilisent des textures mises en cache, et leur rendu ne reconstruit aucun chemin Graphics par image.

Sur les captures réelles à réaliser au téléphone : vérifier oreilles/cornes, bambou/panier, livre, tutu/fleur et crinière ; arme tenue ; barres de vie détachées des têtes ; extrémités des équipes non coupées, notamment au niveau 30 ; pieds posés sur les plateformes et espace entre coéquipiers ; tête utilisable comme point de départ du glisser. Aucun navigateur n’est utilisé pour cette validation Node. Les éventuelles planches de contrôle rendues en SVG depuis le code ne constituent pas des captures du navigateur.

## Contrôles

Lint, typecheck, build puis test:node (50 validateurs) passent, chacun exécuté sous le verrou commun avec les priorités réduites prescrites. Les trente rejeux et les huit couples de pilote direct/doigt passent. Le budget des rejeux est de 69 appels Graphics au maximum sur 43 252 images simulées ; les scénarios chargés atteignent 79, sous le plafond 500. Aucun navigateur ni Vitest n’a été exécuté ; aucun commit n’a été créé.
