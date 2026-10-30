# Dérapage : coût du décor et commandes mobiles

Le décor fixe des circuits Kart partage la texture de route : bambous, eau,
rideau et écume de cascade, ponts, rochers, flèches, arbres et feuilles posées.
L’eau qui coule, les feuilles en suspension et la lave restent animées ; leurs
soumissions sont limitées aux bornes visibles. Les feuilles animées ont leur
propre test de visibilité, en plus de celui de leur segment. Les marges du cache
incluent le décor situé hors de la chaussée et sa hauteur. La texture est remplacée
au changement de circuit et libérée à la destruction, comme auparavant.

Ni tracé, ni largeur, ni bande, ni enregistrement de pilotage ne change.
L’extraction des trois constantes de commande dans `physics.ts` est strictement
équivalente aux expressions précédentes ; le garde compare tout le fichier
après réinsertion des littéraux d’origine. Toutes les autres mécaniques restent
figées. Les seules modifications des branches des autres jeux dans les E2E
concernent le sélecteur de canevas demandé.

## Balayage des trente circuits

`node --import ./scripts/ts-loader.js scripts/measure-derapage-all.js --report --check`
contrôle les 96 positions centrales de chacun des trente circuits, dans les deux
vues, graine 28, caméra fixe, cache chaud. Tous les appels Graphics sont comptés,
styles, effacements et transformations compris, sur toutes les couches dynamiques.
La création initiale de texture est séparée. `--baseline --check` mesure le rendu
de HEAD, sur les mêmes tracés courants, sans restaurer une géométrie antérieure.

Les contrôles rapides conservent les trois balayages complets existants et les
témoins de maximum des trente circuits, en dessus et en 3D. Les plafonds absolus
sont **520 dessus et 800 en 3D** : les références versionnées doivent les respecter,
et chaque compte réel est comparé au minimum du plafond et de sa référence.
Chaque circuit possède une contre-épreuve qui ajoute des appels au véritable
enregistreur et exige leur rejet. Les tests contrôlent aussi la présence des
arbres fixes dans le cache, leur absence dans les images chaudes et la réutilisation
du cache. Les tests du catalogue contrôlent maintenant le vrai `RoadLayer`, les
empreintes des quinze feuilles par tas et la variation des seuls effets animés.

| Circuit | Dessus avant | Dessus après | 3D avant | 3D après |
| --- | ---: | ---: | ---: | ---: |
| 1 — La Flèche des prés | 400 | 400 | 542 | 542 |
| 2 — Autour des Invalides | 350 | 350 | 427 | 427 |
| 3 — Les Docks clairs | 326 | 326 | 409 | 409 |
| 4 — La Cour des arches | 344 | 344 | 498 | 498 |
| 5 — Le Rocher | 385 | 385 | 475 | 475 |
| 6 — Le Grand détour | 366 | 366 | 438 | 438 |
| 7 — Les Deux horizons | 390 | 390 | 537 | 537 |
| 8 — Le Vent des plaines | 366 | 366 | 448 | 448 |
| 9 — Les Trois replis | 348 | 348 | 437 | 437 |
| 10 — La Clef des champs | 390 | 390 | 528 | 528 |
| 11 — Le Ruban plié | 362 | 362 | 464 | 464 |
| 12 — Les Coudes de cuivre | 356 | 356 | 427 | 427 |
| 13 — La Grande ellipse | 384 | 384 | 422 | 422 |
| 14 — Le Bol incliné | 368 | 368 | 425 | 425 |
| 15 — L’Anneau des vents | 362 | 362 | 405 | 405 |
| 16 — Le Triangle arrondi | 400 | 400 | 547 | 547 |
| 17 — La Côte des Ardennes | 482 | 482 | 739 | 739 |
| 18 — Bambou Express | 1962 | 328 | 777 | 777 |
| 19 — La Clairière brisée | 484 | 484 | 669 | 669 |
| 20 — Feuilles Folles | 991 | 453 | 775 | 775 |
| 21 — Les Pavés du levant | 346 | 346 | 431 | 431 |
| 22 — La Terrasse des quais | 350 | 350 | 481 | 481 |
| 23 — Le Passage des halles | 344 | 344 | 453 | 453 |
| 24 — Les Balcons de pierre | 342 | 342 | 445 | 445 |
| 25 — La Combe des échos | 392 | 392 | 478 | 478 |
| 26 — Le Serpent des joncs | 464 | 464 | 691 | 691 |
| 27 — Volcan Turbo | 436 | 400 | 488 | 488 |
| 28 — Les Sept lacets | 398 | 398 | 501 | 501 |
| 29 — La Descente en ruban | 351 | 351 | 485 | 485 |
| 30 — Le Petit guidon | 362 | 362 | 477 | 477 |
| **Maximum** | **1962** | **484** | **777** | **777** |

## Canevas et Z25

Tous les `locator('canvas')` des deux fichiers demandés et des autres specs
`derapage*.spec.ts` ciblent désormais `#game canvas`. La recherche DOM du catalogue
utilise le même sélecteur. Le canevas du véhicule en action ne peut plus être
choisi par ces recherches. Les E2E ne sont pas exécutés sur cette machine.

La règle existante distingue deux commandes : braquage horizontal en caméra
rotative, zone morte **6 px**, et direction absolue, zone morte **10 px**.
La pleine déflexion est **40 px** dans les deux cas. Les constantes
`ANALOG_DEAD_ZONE`, `THUMB_DEAD_ZONE` et `FULL_DEFLECTION` sont partagées avec
le code. Z25 teste le braquage horizontal :
`sign(delta) × min(1, max(0, abs(delta) − ANALOG_DEAD_ZONE) / (FULL_DEFLECTION − ANALOG_DEAD_ZONE))`.
Il couvre la zone morte, juste au-dessus, les deux signes et les deux pleines
déflexions. La comparaison approchée tient compte des coordonnées tactiles.
La valeur observée pour −33 px, −27/34, vient bien de cette règle de braquage ;
10 px est la règle du joystick directionnel, conservée sans modifier le moteur.

## Calibration et limite de l’oracle

| Appels | 0–300 | 400 | 990 | ≥ 1850 |
| --- | ---: | ---: | ---: | ---: |
| Images/s | 13 | 11 | 8 | 4 |

La table interpole les trois points mesurés fournis. Le point **1960 appels /
9,5 images/s**, propre aux bambous, est conservé séparément comme observation
bruitée ; l’insérer dans la courbe monotone ferait augmenter artificiellement
la cadence après 1850 appels. Le nombre d’appels ne représente pas leur coût
individuel, ni la surface peinte. Aucun nouveau résultat navigateur n’est annoncé.

Le pilote et sa chronologie restent inchangés : nearest + 6, bruit angulaire
±0,35 rad, graine 7, observation de 150 ms plus une présentation, commande
consommée à la présentation suivante. Les timestamps sont synthétiques, sans
oracle fondé sur l’horloge de la machine. Le montage de ces courses omet seulement
l’instrumentation géométrique des acteurs, puisque le dessin est désactivé pendant
la simulation ; les vérifications de rendu restent exécutées séparément.

**La contre-épreuve « Le Rocher pas fini » reste non obtenue.** À 1850 appels,
la table donne bien 4 images/s, mais le pilote courant termine encore les trois
tours en **70,82 s**, premier, contre l’absence de fin observée dans le navigateur.
Le rapport brut expose explicitement `calibration.observed` et `calibration.modeled`.
La commande `node --import ./scripts/ts-loader.js scripts/measure-derapage-latency.js --save tests/derapage-latency-report.json`
reproduit les douze courses comparatives et ce diagnostic indépendant.
Le simple recalage de la table ne valide donc pas l’oracle. Il manque une trace
permettant de distinguer cadence irrégulière, chronologie des entrées et état
initial du scénario navigateur. Les délais, graines et seuils n’ont pas été
ajustés pour fabriquer l’échec demandé.

## Coût de la suite et validation

Les mêmes validateurs et rejeux sont conservés. Le repli de `transpile.js` utilise
le transformateur natif déjà installé avec l’outil de build, plutôt que charger
le compilateur TypeScript. Le cache reste temporaire, indexé par le contenu,
et distinct pour les mutations. Un nouveau validateur vérifie les propriétés
de constructeur, l’héritage, les énumérations, les imports de types, la syntaxe
invalide et la séparation d’une source mutée. `scripts/test-node.js` reste inchangé.

Validation finale : lint, typecheck, build, puis test:node passent, sous verrou
commun et priorités CPU/entrées-sorties réduites. Les **37 validateurs terminent
en 111,85 s**, sous le plafond demandé de 120 s, contre les 128,49 s du rapport
précédent et la référence de 118,46 s. Le nouveau contrôle de transpilation
prend 0,30 s. Aucun navigateur, Vitest, Playwright ni commit. La contre-épreuve
de calibration indiquée plus haut demeure non résolue : ces validations ne
suffisent pas à annoncer que l’ensemble est prêt à intégrer.

Trois mutations à essayer : remettre les bambous dans les images chaudes ;
supprimer la visibilité des feuilles animées ; remplacer le compte réel par zéro
dans les comparaisons de budgets (les contre-épreuves doivent alors échouer).
