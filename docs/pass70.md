# Passe 70 — personnages jouables

Le choix de l'accueil est dessiné à la position physique du héros, via
`src/characters/game.ts` et le rendu Graphics. Les moteurs ne dépendent pas de
l'identité : les cinq personnages ont strictement les mêmes règles et scores.
Sauvegardes, grilles, graines, physique ordinaire et formules de score conservées.

Fichiers modifiés ou ajoutés :

- Rendu : `src/characters/game.ts`, `src/characters/phaser.ts`, `src/style.css`.
- Caisses : `src/engines/caisses/{engine,solver,records}.ts`, `src/games/caisses/scene.ts`.
- Traverse : `src/engines/traverse/{engine,solver}.ts`, `src/games/traverse/scene.ts`.
- Alunir : `src/engines/alunir/engine.ts`, `src/games/alunir/scene.ts`.
- Tests : `tests/character-games-checks.ts`, `tests/fixtures/characters-campaigns.json`,
  `tests/e2e/character-finger.spec.ts`.
- Scripts : `scripts/record-character-games.js`, `scripts/validate-character-games.js`,
  `scripts/validate-caisses.js`, `scripts/validate-traverse.js`, `scripts/validate-alunir.js`.
- Documentation : `GAME_SPEC.md`, `README.md`, `README.fr.md`, `CHANGELOG.md`, `docs/pass70.md`.

| Jeu | Rôle | Spécial | Limite | Records sans / avec |
| --- | --- | --- | --- | --- |
| Caisses | Pousseur, marche et profil orienté | Tirer puis direction vers la caisse : recul d'une case, traction d'une case, un pas et zéro poussée | Une réussite/niveau, annuler ne rembourse pas ; effet 800 ms | N1 : 1/0 poussée, 2/2 pas ; N10 : 4/3 poussées, 14/14 pas. Les 30 minima exacts sont dans GAME_SPEC et records.ts |
| Traverse | Traverseur animé, saut et transport | Deux cases vers le haut ; case intermédiaire survolée, destination toujours dangereuse | Un bond/vie, réservé à l'entrée, pas de recharge à l'abri ; effet 500 ms | Score complet N1 : 300/300 ; N10 : 3000/3000. Minima de quanta avec/sans dans GAME_SPEC |
| Alunir | Pilote visible dans la verrière, tournant avec le module | Angle nul, vitesse latérale divisée par deux une fois, rotation verrouillée 1 s, coût 30 carburant | Deux/niveau ; refus pendant les 60 pas actifs ou si carburant <30 | Témoins N1 : 1100/1056 ; N10 : 1020/980. Scores observés, pas des maxima optimisés ; échantillonnage du pilote avec spécial à 150 ms |

**Commandes** : Espace ou bouton spécial de 56 px minimum. Dans Caisses, choisir
ensuite la direction vers la caisse ; le HUD demande cette direction. Six cibles
de 56 px tiennent à 390 px ; sous 380 px, la colonne droite a deux lignes.
Le HUD affiche les charges, les records Caisses et la durée active Alunir.
Mouvement réduit respecté ; feuilles/cœurs/flammes/étoiles/arc-en-ciel proviennent
du même modèle vectoriel que les personnages de l'accueil.

## Vérifications reproductibles

Toutes les commandes ci-dessous sont exécutables sans navigateur ni Vitest :

```sh
nice -n 19 ionice -c3 npm run lint
nice -n 19 ionice -c3 npm run typecheck
nice -n 19 ionice -c3 npm run build
nice -n 19 ionice -c3 node --import ./scripts/ts-loader.js scripts/validate-caisses.js
nice -n 19 ionice -c3 node --import ./scripts/ts-loader.js scripts/validate-traverse.js
nice -n 19 ionice -c3 node scripts/validate-alunir.js
nice -n 19 ionice -c3 node scripts/validate-character-games.js
nice -n 19 ionice -c3 node scripts/validate-characters.js
```

Le validateur de personnages vérifie P-<jeu>-01 (géométrie réelle des cinq
identités et câblage de chaque scène), 02/03 (états et limites littéraux),
04 (trente niveaux rejoués sans spécial, records historiques exacts), 05
(égalité des simulations pour les cinq choix). Chaque contrôle doit durer
moins de deux secondes. Les deux politiques tactiles à 150 ms sont également
rejouées dans les moteurs pour les niveaux 1 et 10, sans simuler de navigateur.

Les recherches exactes et leur calibration sont séparées des tests rapides :
`nice -n 19 ionice -c3 node scripts/record-character-games.js` régénère les preuves
et les nouveaux records. `validate-caisses.js` recalcule aussi les deux objectifs
avec un tirage et rejoue les témoins. `validate-traverse.js` garde sa BFS ordinaire
et vérifie séparément la variante avec bond. `validate-alunir.js` pilote les trente
niveaux sans spécial sur trois graines, soit 90 atterrissages.

## E2E à exécuter sur l'hôte

`tests/e2e/character-finger.spec.ts` contient exactement un test par jeu,
mobile Chromium 390×844, niveaux 1 et 10 complets et spécial utilisé dans chacun.
Toutes les commandes passent par CDP `Input.dispatchTouchEvent`, avec bruit de
position ±12 px et latence de 150 ms. Les crochets ne servent qu'à lire, charger
le niveau et avancer l'horloge. A*, BFS et pilote calculent les intentions.
Les JSON joints contiennent temps, intentions, coordonnées, erreurs de toucher
et résultat ; les captures sont nommées `perso-<jeu>-jeu` et
`perso-<jeu>-special`, avec des alias incluant l'identité. Aucun résultat visuel
ou tactile de navigateur n'est présumé : ces trois tests sont écrits seulement.

## Mutations

`validate-character-games.js` importe les mutants en mémoire, vérifie leur rejet
et rapporte le fichier et la ligne de chaque ancre. Aucun fichier source n'est
modifié par ces vérifications.

| Mutation | Fichier et ligne |
| --- | --- |
| this.state.boxes[box] = this.state.player; | `src/engines/caisses/engine.ts:57` |
| this.specialUses === 0 | `src/engines/caisses/engine.ts:52` |
| bond: { x: 0, y: -2 } | `src/engines/traverse/engine.ts:46` |
| this.specialUses === 0 | `src/engines/traverse/engine.ts:74` |
| this.state.vx *= 0.5; | `src/engines/alunir/engine.ts:76` |
| this.specialUses === 0 | `src/engines/alunir/engine.ts:74` |
| always panda (three games) | `src/characters/game.ts:8` |

Vérification locale : lint, typecheck, build, trois validateurs, P-01 à 05 et
sept mutations passent. Plus long contrôle P : 344 ms (<2 s).
Le validateur historique des personnages passe également. Aucun navigateur,
aucun Vitest et aucun commit. Avertissement Vite habituel sur la taille du bundle.
