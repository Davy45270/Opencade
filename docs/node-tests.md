# Inventaire des scripts Node

`npm run test:node` lance les points d’entrée de `scripts/node-checks.js` avec un processus par CPU disponible, plafonné à trois processus Node, sans navigateur ni Vitest. Il affiche chaque durée et le total, échoue sur toute erreur et si le total atteint 180 s. Les validateurs qui écrivent des rapports acceptent `--checks-only` : les écritures et les régénérations de campagnes sont omises ; les rejeux et les assertions de règles restent actifs. Aucun `--record` en CI. Le chargeur utilise l’effacement TypeScript natif quand la syntaxe le permet, avec repli sur le compilateur pour les propriétés de constructeur et les énumérations. Les processus partagent un cache de transpilation TypeScript temporaire, indexé par le contenu et supprimé en fin de commande ; les modules mutés restent donc distincts. Le cache de compilation V8 est également partagé et temporaire. Les sources sont précompilées une seule fois avant les processus, et les transpilations des mutations et des harnais utilisent le même cache. Les rejeux Orbite identiques partagent leur preuve réussie (empreinte, témoins, événements, état final) dans ce seul lancement : la clé inclut toutes les sources et tous les oracles, ainsi que la bande complète. Les moteurs mutés contournent toujours cette réutilisation. Une entrée exécutée seule rejoue réellement si aucune preuve n'existe.

Catégories : **V** validateur rapide (objectif < 30 s par entrée), **G** campagne longue / génération, **M** mesure ou module auxiliaire (pas un test autonome). Les auxiliaires qui protègent une règle sont appelés par les validateurs indiqués ; lancer un module qui exporte des fonctions sans les appeler ne constitue pas un test.

| Script dans `scripts/` | Classe | Exécution / rôle |
| --- | --- | --- |
| `audit-derapage-mutations.js` | G | `npm run audit:derapage` : 42 preuves de rejet explicites, hors CI. |
| `check-derapage-3d.js` | V | Projections, rendu et courses de vraie scène ; Y02 sans scène appartient à Vitest. |
| `check-derapage-cadence.js` | V | Cadence, raster, HUD et parcours Graphics 2D/3D mutualisés. |
| `check-level-catalogue-kart.js` | V | Graphics et provenance ; les six rejeux complets appartiennent à `validate-level-catalogue`. |
| `derapage-graphics-checks.js` | M | Assertions 3D sur les montages et références 2D fournis par cadence. |
| `validate-action-art.js` | V | Vues vectorielles distinctes, cache unique et réserves bornées ; deux cas < 2 s. |
| `validate-action-scenes.js` | V | Quinze vraies scènes jeu/compagnon avec ports simulés ; chargement, dessin, cache et nettoyage < 2 s/cas. |
| `validate-level-catalogue.js` | V | Neuf niveaux, éléments jouables et deux rejeux gagnants chacun < 2 s/cas. |
| `record-level-catalogue.js` | G | Enregistre les entrées et empreintes numériques intermédiaires des trois niveaux Ferraille, sur deux graines. |
| `briqueterie-assertions.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `briqueterie-diversity.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `briqueterie-pilot.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `briqueterie-statistics.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `bubble-input-check.js` | V | Appelé par `validate-bubble.js` dans test:node (pas de double exécution). |
| `bubble-statistics.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `bubble-validation-worker.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `build-pwa-fixture.js` | G | Génération de la fixture de build réservée aux E2E. |
| `check-derapage-joystick-mutations.js` | G | Audit explicite `npm run audit:derapage`, hors CI. |
| `check-derapage-replay.js` | M | Comparateur de snapshots avec référence externe (`--compare fichier`), ou génération (`--record`). Les oracles versionnés et les rejeux Z15 sont exécutés par validate-derapage et validate-derapage-historical. |
| `check-essaim-art.js` | V | Appelé par test:node. |
| `check-pwa-mutations.js` | V | Appelé par test:node. |
| `dedale-diversity.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `derapage-human.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `diversity-metrics.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `diversity-report.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `essaim-campaigns.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `essaim-diversity.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `ferraille-diversity.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `generate-bubble-solutions.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `measure-pass56.js` | M | Chronométrage des corps de tests E-GEN/E-DIV/E-PILOT/V02 ; assertions également couvertes par validate-essaim et measure-thumbnails. |
| `measure-thumbnails.js` | V | Mesure et assertions V02 : inclus malgré son nom. |
| `mutate.js` | G | Campagne de mutations explicite, jamais appelée par la CI. |
| `mutation-module.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `node-checks.js` | M | Manifeste des points d’entrée rapides de test:node. |
| `node-test-assertions.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `orbite-assertions.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `orbite-diversity.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `orbite-scene-checks.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `orbite-statistics.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `pwa-harness.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `record-character-games-2.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `record-character-games.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `record-derapage-historical.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `record-essaim.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `record-orbite.js` | G | Générateur / pilote de campagne, hors commande CI ; ses rejeux et assertions sont exécutés par les validateurs correspondants. |
| `test-dedale.js` | V | Appelé par test:node. |
| `test-node.js` | M | Exécuteur adapté aux CPU disponibles (trois processus maximum), chronométrage et budgets ; commande test:node. |
| `test-pwa.js` | V | Appelé par test:node. |
| `transpile.js` | M | Transpilation des sources et mutations, cache temporaire partagé et repli TypeScript paresseux. |
| `orbite-verified-replay.js` | M | Mutualise uniquement les rejeux identiques déjà vérifiés ; moteurs mutés toujours rejoués. |
| `ts-loader.js` | M | Module auxiliaire importé par les validateurs (chargeur, adaptateur, métriques ou harnais) ; aucune vérification autonome au lancement. |
| `validate-alunir.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-arcade-art.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-briqueterie.js` | V / G | `--checks-only` rejoue les 60 solutions versionnées et conserve mécaniques, diversité et mutations ; le mode complet régénère les campagnes et les compare aux bandes. |
| `validate-bubble.js` | V | Mode rapide --checks-only ; exclut la campagne statistique de 600 tentatives. |
| `validate-caisses.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-character-games-2.js` | G (rejeu) | CI : courses complètes avec spécial aux niveaux 1/10/30, courses ordinaires aux extrêmes et activation bornée sur les 27 autres circuits. Les courses ordinaires historiques restent hachées à chaque pas : 1 200 pas sur les 27 circuits intermédiaires, courses complètes aux niveaux 1/10/30 et les quatre bandes tactiles complètes. Hors CI : les 60 courses complètes. Bulles, Serpentin, rendu et mutations restent actifs. |
| `validate-character-games.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-character-scenes-2.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-character-scenes.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-character-snake-policy.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-characters.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-dedale.js` | V / G | `--checks-only` rejoue les 60 campagnes du rapport versionné (graines 28 et 459), vérifie victoire, vies, forme et témoins ; le mode complet recalcule les routes BFS. Connectivité, mécaniques, diversité et mutations restent actives. |
| `validate-derapage-historical.js` | V | Appelé par `validate-derapage.js` dans test:node (pas de double exécution). |
| `validate-derapage.js` | V / G | Mode CI `--checks-only` : géométrie, contrôles ciblés et rejeux historiques ; mutations dans `npm run audit:derapage`. En CI, les campagnes historiques intermédiaires sont bornées à 1 200 pas, avec leurs empreintes cumulatives existantes tous les 600 pas ; les niveaux 1/10/30 et les quatre bandes tactiles restent complets. Hors CI, les 30 campagnes historiques sont complètes. Les bandes joystick sont rejouées et leurs mesures/états finaux vérifiés sans recalcul du pilote ; la mesure sans assistance reste hors CI. La campagne de mesure pilote/IA des 30 circuits reste dans le mode complet ; ses règles Z13/Z24 sont déjà couvertes par `tests/derapage.test.ts`. |
| `validate-essaim.js` | V / G | Mode CI `--checks-only` : rejeu vérifié des 60 bandes, observations réutilisées seulement après validation du rejeu, mêmes assertions de diversité et de mécaniques ; hors CI : recalcul des campagnes. |
| `validate-ferraille.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-orbite.js` | V / G | Mode CI `--checks-only` : contrôles mécaniques/rendu, statistiques bornées, mutations et 60 rejeux ; hors CI : régénération par le pilote et comparaison des bandes. |
| `validate-pass76.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-regressions.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-serpentin.js` | V | Appelé par test:node avec `--checks-only`. |
| `validate-traverse.js` | V | Appelé par test:node avec `--checks-only`. |

## Relecture par mutations

Commande réservée à l’orchestrateur : `node scripts/mutate.js mutations.json`.
Le fichier est un tableau JSON (ou un objet `{ "mutations": [...] }`) :

```json
[
  { "name": "règle supprimée", "file": "src/example.ts", "before": "texte unique", "after": "remplacement" }
]
```

Chaque ancre doit apparaître exactement une fois ; les chemins restent dans le dépôt. Chaque mutation part du contenu original, lance `npm test && npm run test:node`, puis restaure les octets originaux dans un `finally`, y compris en cas d’erreur ou d’interruption SIGINT/SIGTERM/SIGHUP. Une commande interrompue est une erreur, pas une mutation tuée. Une mutation survit seulement si les deux commandes réussissent ; le bilan renvoie un code non nul en cas de survivant. SIGKILL ne peut pas être intercepté. Ce script ne lance ni campagne de génération ni navigateur.

`validate-finger.js` rejoue les pilotes E2E aux niveaux 1 et 10, au pas moteur de 60 Hz, avec une réaction de 150 ms et le bruit à graine de ±12 px. Chaque cas reste sous 2 s ; les courses sont découpées sans réinitialiser le moteur. `node scripts/validate-finger.js` écrit le rapport de la passe 80 ; `--checks-only` conserve les assertions sans écrire.

Passe 82 : `npm run test:node -- --only=validate-dedale.js,validate-orbite.js,validate-empilo.js`
sélectionne des noms exacts du manifeste ; une entrée inconnue échoue. Sans option,
tout le manifeste est exécuté. `validate-character-games-3.js` rejoue les campagnes
et tue les mutations, `validate-character-scenes-3.js` réutilise le harnais des
passes 70–71, et `validate-character-finger-3.js` répète les pilotes avec latence.
`record-character-games-3.js` est un générateur hors ligne, jamais un test CI.

`record-character-finger-3.js` calibre hors ligne six parcours avec observation et
latence de 150 ms ; le validateur rejoue `characters-finger-3.json` par lots courts
et vérifie aussi une décision réelle de chaque politique.

Passe 83 : `validate-character-scenes-3.js` calcule les positions depuis la grille,
le canon et le bord du puits ; provoque collisions, lignes, victoires et défaites
par les vrais contrôles et ticks ; vérifie les commandes de dessin des particules
sur chaque case de Lueur et des cellules réservées. Les sept mutations de scènes
signalées en relecture sont exécutées et rejetées. Chaque cas reste sous 2 s.
`validate-character-games-3.js` mesure les tirs soutenus pendant 1,5 s après le tir
initial commun (8 tirs ordinaires, 16 avec Rafale), avec un rapport 2 ±5 % ; le
retour au délai arrondi et le raccourcissement à 89 ticks sont rejetés.

Le rejeu chrono de Dérapage conserve les comparaisons de `snapshot().timing` à
chaque pas avec une projection qui clone tout l'état dynamique et conserve la
référence du circuit immuable ; la projection est comparée au snapshot complet.
Le mode par défaut reste une copie profonde complète. Le banc des vignettes
réutilise ses 2 000 pas frais pour la mesure et les assertions V02, sans modifier
les contrôles de mouvement, de redémarrage ou le budget global de 5 s ; chaque
cas V02 est également borné à 2 s.

Mesure passe 83 (2026-10-30, même quota CPU : un cœur ; plafond du lanceur :
trois processus quand disponibles) : `npm run test:node` passe de **182,72 s**
à **120,69 s**, 33 validateurs réussis, soit **33,95 %** de réduction et
59,31 s de marge sur le seuil inchangé de 180 s. La cible stricte de 120 s reste
dépassée de 0,69 s. Lint, typecheck et build réussissent ; aucun navigateur,
aucun lancement de Vitest et aucun commit.

Fichiers modifiés pour cette passe :

- `GAME_SPEC.md`
- `docs/node-tests.md`
- `scripts/measure-thumbnails.js`
- `scripts/mutation-module.js`
- `scripts/orbite-verified-replay.js`
- `scripts/test-node.js`
- `scripts/transpile.js`
- `scripts/ts-loader.js`
- `scripts/validate-bubble.js`
- `scripts/validate-character-games-3.js`
- `scripts/validate-character-scenes-2.js`
- `scripts/validate-character-scenes-3.js`
- `scripts/validate-character-scenes.js`
- `scripts/validate-characters.js`
- `scripts/validate-dedale.js`
- `scripts/validate-derapage.js`
- `scripts/validate-orbite.js`
- `scripts/validate-pass76.js`
- `src/engines/derapage/engine.ts`
- `src/engines/orbite/engine.ts`
- `tests/character-games-3-checks.ts`
- `tests/fixtures/characters-campaigns-3.json`
- `tests/fixtures/characters-finger-3.json`

- `validate-collier.js` : C01–C22, 30 victoires à graine fixe, 30 inactions perdantes, six témoins aléatoires et diversité ; inclus dans `test:node`. C18–C20 contrôlent les émissions, 2000 couleurs et la géométrie des 30 niveaux ; C16/C21/C22 exécutent la scène avec services de plateforme doublés.
- `check-collier-mutations.js` : témoin intact puis onze mutations de `collier-mutations.json`, ancres uniques et remplacements uniquement en mémoire. Les oracles tuant ces mutations appartiennent à `validate-collier.js`. À lancer avec `nice -n 19 ionice -c3 node scripts/check-collier-mutations.js`.
- `validate-gourmandises.js` : G01–G19, 60 victoires, pilote aléatoire, 12000 permutations et huit mutations en mémoire.

Passe 200 — rejeux Dérapage sans oracle d’horloge :

- Z36 : `validate-derapage --checks-only` rejoue intégralement chacune des quatre
  bandes versionnées, avec les trois tours, l’arrêt < 0,5 s, le hors-piste < 15 %
  et les mesures et positions/caps finaux strictement identiques. Chaque image
  compare aussi le résultat complet de `nearest` à une référence exhaustive
  indépendante. Aucune bande ni aucun seuil de jouabilité n’a été régénéré.
- Vitest conserve une bande Z36 complète comme échantillon d’intégration. Les
  trois autres rejeux complets identiques sont exécutés par Node, dans la même
  chaîne CI `npm test` + `npm run test:node`. Le cas négatif partagé altère le cap
  final de la première bande de `1e-9`, traverse le vrai `replayHuman` et exige
  uniquement « rejeu du cap et de la position exact » comme échec.
- Z15 : la course complète horodatée reste dans Vitest. Les scénarios slalom/BMX
  restent complets (600 images chacun) dans Node et ont un échantillon de 60
  images chacun dans Vitest. L’état dynamique sérialisé, avec tous ses nombres,
  est comparé à chaque pas ; le snapshot complet, circuit inclus, est comparé
  tous les 60 pas et au dernier pas. Il ne s’agit pas d’un hachage probabiliste.
  Un test partagé injecte une dérive dynamique de `1e-9` entre deux contrôles
  complets et une dérive du circuit aux contrôles périodique et final.
- Les rejeux Z15/Z36 Vitest ont un filet de 15 000 ms. Les durées Node restent
  affichées à titre informatif. Le budget Z36 porte sur 1 à 6 000 images et
  exactement un événement pour neuf images (arrondi supérieur), avec contrôle
  des images réellement exécutées. Trois bandes invalides vérifient le rejet
  avant simulation. Les rejeux historiques Dérapage conservent leurs empreintes
  cumulatives et un budget déterministe de 18 000 images ; leurs mesures de
  durée par bloc restent informatives.
- Le moteur garde une recherche globale exacte, y compris les égalités et les
  pistes éditées. Le parcours est intégré dans la boucle et son rayon n’est
  recalculé qu’en cas d’amélioration. Contrôle, vitesse IA et physique partagent
  le même résultat pour la même position, avant tout déplacement. Les bandes
  existantes restent les oracles ; aucun cache de trajectoire n’est ajouté.

`scripts/node-checks.js` et `scripts/test-node.js` restent inchangés. Sur cette
machine, le lanceur voit un seul CPU : changer l’ordre ne réduit donc pas la
somme des temps. Les recherches exactes Caisses et les campagnes distinctes des
autres jeux restent exécutées ; aucune n’est supprimée au titre d’un doublon
sans preuve d’identité.

Profil CPU avant modification : `nearest` et sa fonction interne représentaient
48,6 % des échantillons du validateur Dérapage. Sur le banc Z15, la copie profonde
représentait 37,9 % des échantillons, avant les comparaisons et la collecte mémoire.
Le contrôle des 18 000 snapshots (30 circuits × 600 images), enregistré avec les
sources de HEAD puis comparé avec le moteur modifié, reste strictement identique.
Sa durée seule passe de 21 887 à 7 321 ms. La référence de cette mesure reste
hors dépôt ; les bandes et empreintes historiques versionnées restent inchangées.

Mesures seules avant/après, en millisecondes (les durées ne sont pas des oracles) :

| Rejeu | Avant | Après |
| --- | ---: | ---: |
| Z15 slalom, 600 images | 985 | 238 |
| Z15 BMX, 600 images | 1 062 | 284 |
| Z36 La Flèche des prés | 1 389 | 631 |
| Z36 Les Docks clairs | 1 062 | 516 |
| Z36 L’Anneau des vents | 1 131 | 375 |
| Z36 Le Rocher | 1 051 | 421 |

Les temps Z36 avant proviennent du premier lancement de
`node --import ./scripts/ts-loader.js scripts/validate-derapage.js --checks-only`.
Le validateur initial ne chronométrait pas Z15 : ces deux mesures avant ont été
complétées sur une copie de HEAD avec seulement deux chronomètres informatifs.
Un harnais Node de la course Z15 complète (3 755 images), sans Vitest, passe de
6 182 à 2 060 ms ; ce chiffre ne mesure pas le coût propre de Vitest.

Les campagnes unitaires Z13 et Z24 conservent leurs trente circuits et leurs
assertions originales, réparties en un test par circuit avec un délai de 2 s.
Les cas mécaniques partagés ont également un délai de 2 s ; seules les familles
de rejeux Z15/Z36 (et le rejeu divisé Z37) utilisent le filet de 15 s.

Bilan final de la passe 200 : lint, typecheck et build réussis, puis
`npm run test:node` seul : **33 validateurs réussis, 105,04 s**, contre
**120,53 s** initialement (−12,9 %). Une relance précédente réussissait en
101,98 s. La cible de 80 s n’est pas atteinte. Le coût cumulé des recherches
exactes et des campagnes distinctes des autres jeux reste conservé. Les maxima
Node des simulations Z13/Z24, avec le corps exact du pilote des tests, sont
respectivement de 248 et 267 ms par circuit sur les 60 cas.

Les variations de charge restent visibles dans les oracles d’horloge des autres
jeux, laissés inchangés : un essai intermédiaire a échoué sur Dédale ; un autre,
à 159,96 s, a échoué sur Empilo et le catalogue de niveaux. Dans ce dernier,
Briqueterie prenait 19,13 s au lieu des 3,56 s initiaux. Les deux dernières
exécutions complètes réussissent. Aucun navigateur, Vitest ou commit.

| Validateur | Avant (s) | Après (s) |
| --- | ---: | ---: |
| `validate-derapage.js` | 28.66 | 16.22 |
| `validate-character-games-2.js` | 9.19 | 7.28 |
| `validate-orbite.js` | 6.99 | 7.12 |
| `validate-essaim.js` | 8.75 | 8.97 |
| `validate-ferraille.js` | 4.56 | 4.30 |
| `validate-caisses.js` | 7.74 | 7.63 |
| `validate-briqueterie.js` | 3.56 | 3.46 |
| `validate-character-scenes-2.js` | 1.03 | 1.11 |
| `validate-characters.js` | 1.59 | 1.70 |
| `validate-character-games.js` | 1.77 | 1.69 |
| `validate-character-scenes.js` | 1.47 | 1.29 |
| `validate-character-games-3.js` | 3.33 | 2.91 |
| `validate-character-scenes-3.js` | 2.93 | 3.19 |
| `validate-character-finger-3.js` | 0.47 | 0.50 |
| `validate-empilo.js` | 0.61 | 0.82 |
| `validate-alunir.js` | 1.19 | 1.29 |
| `validate-arcade-art.js` | 0.21 | 0.30 |
| `validate-bubble.js` | 2.51 | 2.61 |
| `validate-character-snake-policy.js` | 1.55 | 1.48 |
| `validate-finger.js` | 7.85 | 7.14 |
| `validate-action-art.js` | 0.41 | 0.49 |
| `validate-action-scenes.js` | 1.26 | 1.26 |
| `validate-level-catalogue.js` | 1.73 | 1.54 |
| `validate-dedale.js` | 1.27 | 1.39 |
| `validate-pass76.js` | 0.73 | 0.61 |
| `validate-regressions.js` | 1.89 | 2.19 |
| `validate-serpentin.js` | 0.79 | 0.98 |
| `validate-traverse.js` | 1.32 | 1.45 |
| `check-essaim-art.js` | 0.49 | 0.56 |
| `check-pwa-mutations.js` | 3.36 | 3.49 |
| `test-dedale.js` | 0.48 | 0.60 |
| `test-pwa.js` | 1.16 | 1.22 |
| `measure-thumbnails.js` | 6.85 | 5.08 |


Correction des oracles de rejeu Dérapage :

- La comparaison compacte distingue les nombres finis, `0`, `-0`, `NaN`,
  `Infinity` et `-Infinity`, avec des étiquettes distinctes pour les chaînes.
  Le contrôle complet compare indépendamment les clés, prototypes et feuilles
  avec `Object.is`, à chaque multiple de 60 et au dernier pas.
- Les cas partagés verrouillent score, statut, position et vitesse IA (x/y et
  vx/vy), état aléatoire, temps et cap. Ils acceptent les nombres spéciaux
  identiques et rejettent leurs collisions dans les deux chemins. Une dérive
  du circuit injectée à 180 est détectée immédiatement, puis à 240 ; le contrôle
  final est aussi vérifié hors multiple de 60.
- Les budgets acceptent 1 et 6 000 images (test arrêté après les deux contrôles,
  avant simulation) et rejettent zéro, dépassement, fraction, absence et excès
  d'événements. Six cas parcourent le vrai rejeu et altèrent séparément cap,
  x, y, arrêt maximal, hors-piste et nombre d'images réellement exécutées ;
  chaque cas exige uniquement l'échec final attendu.

Mutations appliquées une par une sur les sources, exécutées en Node avec le
chargeur TypeScript puis restaurées dans un bloc `finally`. Le validateur ciblé
appelle les mêmes `checkReplayComparison` et cas Z36 que le validateur complet.
Une mutation n'est comptée tuée que par un échec d'assertion, sans délai d'horloge.
Les ancres d'arrondi sont adaptées au nouveau sérialiseur.

| Mutation rejouée | Résultat |
| --- | --- |
| Accepter les images fractionnaires | Tuée |
| Exclure la borne 1 | Tuée |
| Exclure la borne 6 000 | Tuée |
| Accepter les événements surnuméraires | Tuée |
| Arrêter les contrôles périodiques après 60 | Tuée à 180 |
| Ignorer le score intermédiaire | Tuée |
| Supprimer le contrôle complet final | Tuée |
| Arrondir les nombres à huit décimales | Tuée |
| Rétablir JSON avec pertes dans la comparaison compacte | Tuée |
| Rétablir JSON avec pertes dans le contrôle complet | Tuée |
| Ignorer la position finale x | Tuée |
| Ignorer la position finale y | Tuée |
| Ignorer longestStop final | Tuée |
| Ignorer off final | Tuée |
| Ignorer frames final | Tuée |

Validation de la correction : lint, typecheck et build réussis, puis deux
exécutions complètes de `npm run test:node`, seules, sans navigateur ni Vitest.
Les 33 validateurs passent dans les deux cas : **115,23 s**, puis **104,57 s**
(plafond demandé : 105 s). Dérapage prend respectivement 23,50 s et 18,98 s.
Le premier dépassement reste signalé ; aucun budget ni oracle des autres jeux
n'a été modifié. La correction touche seulement les deux modules de tests de
rejeu et cette documentation ; la livraison précédente reste conservée.


## Répartition actuelle des contrôles Dérapage

Cette répartition remplace les répartitions historiques décrites plus haut.
L’audit Node exécute aussi le cas partagé `completeReplay`, sans lancer Vitest.
Les moteurs, bandes, seuils et comparateurs de rejeu restent inchangés.
`test-node.js` reste inchangé. Les durées sont informatives, jamais des oracles.

| Rejeu complet | Propriétaire dans la chaîne `npm test` + `npm run test:node` | Preuve du doublon retiré |
| --- | --- | --- |
| Z15/Z28, circuit 1, graine 28, contrôleur, pas 1/60 contre deux pas 1/120 | Vitest, `completeReplay` dans `derapage.test.ts` | Les deux tests Vitest et la boucle chrono Node créaient les mêmes moteurs (valeurs par défaut : 0 et 28), calculaient le même contrôleur sur le premier moteur et appliquaient les mêmes pas. La course ordinaire Node au niveau 0 est aussi le premier moteur de cette paire. Toutes leurs assertions sont réunies dans ce test unique : `sameReplayStep`, timing à chaque pas, horodatage avant chaque entrée, snapshots finaux, victoire, trois tours, minimum, sérialisation, isolation des copies et temps invalides. Le circuit 30 ordinaire reste distinct. |
| Z15 slalom/BMX, 600 images | Node | Vitest garde ses échantillons distincts de 60 images ; aucune campagne complète supplémentaire. |
| Z36, quatre bandes courantes | Node, avec `verifiedNearest` exhaustif à chaque image | Le test Vitest de la première bande appelait exactement `replayHuman` sur le même objet versionné ; Node appelle ce même rejeu avec un contrôle supplémentaire de `nearest`. Les six contre-épreuves de métadonnées restent dans Node et réutilisent ce témoin ; elles ne déclenchent plus un second rejeu dans Vitest. Le moteur instrumenté du cas « frames » reste distinct et réellement simulé. |
| Y02, deux moteurs et dessin sans scène | Vitest, `viewCases` | Node exécutait le même objet `viewCases` et sa même méthode `run` ; seule cette invocation complète identique est retirée de Node. Les autres cas `viewCases` appartiennent aussi à Vitest : même objet, même méthode `run`, mêmes assertions. |
| Y02, vraie scène en 2D puis en 3D | Node, `derapage-3d-integration` | Distinct du cas sans scène : conserve les deux courses depuis la grille, toutes les entrées horodatées, les branches de production et le snapshot final. |
| Six bandes gagnantes K01/K02/K03 | Node, `kartCatalogue` via `validate-level-catalogue` | Le test Vitest appelait `replayKart(tape)` sur chaque même objet de `kartRecords` ; `kartCatalogue` appelle exactement la même fonction, sans autre moteur. Les budgets avant simulation et les mécaniques restent aussi dans Vitest. |
| Historique et campagnes tactiles | Node, validateurs existants | Moteurs, contrôles ou routes distincts : aucun retrait au titre d’un doublon. |

Le harnais compile une seule fois le script de montage et réutilise les fonctions
de son enregistreur Graphics ; chaque appel et ses arguments restent enregistrés.
Les contrôles de cadence et Graphics partagent désormais trois montages, aux
niveaux 1/10/27. Les 96 positions 2D par circuit servent à la fois au budget
absolu de cadence et à la référence relative 3D. Le même montage poursuit les
96 positions 3D, avec les assertions originales de projection, profondeur,
visibilité et HUD, puis les contrôles de raster, rotation et libération de
texture. Aucun pas physique n’avance entre ces images. Les contre-épreuves
ajoutent toujours 800 ou 1 000 vrais appels au même enregistreur Graphics ; elles
réutilisent les images déjà enregistrées au lieu de monter et dessiner de
nouveaux circuits. Les courses tactiles, contrôles du HUD et courses 3D gardent
leurs états indépendants lorsque leurs entrées ou leurs conditions diffèrent.

### Audit explicite des mutations

`npm run audit:derapage` est hors CI. Il exécute les validateurs avec
`--audit-mutations --checks-only`, puis les dix mutations du catalogue déjà hors
CI. Chaque mutation invoque les mêmes contrôles qui restent actifs sans ce
drapeau. Le rejet exige une `AssertionError` ; une erreur de chargement ou de
syntaxe ne vaut pas preuve. Les mutations utilisent des modules isolés et ne
réécrivent pas les sources moteur.

Les 32 mutations récurrentes déplacées sont détaillées ci-dessous. Pour chacune,
la colonne de droite désigne le contrôle ordinaire conservé qui échoue sur le
module muté ; l’audit exige cet échec, sans oracle de durée.

| Mutation | Contrôle conservé qui la rejette |
| --- | --- |
| aide désactivée | Z36, rejeu exact du Rocher |
| rail collant | Z38, cas joystick |
| direction relative en mode fixe | Z37, direction absolue |
| records par index | Z39, migration des records |
| banderole_invisible | Graphics mobile : opacité de la banderole |
| poteaux_invisibles | Graphics mobile : largeur des poteaux |
| flash_absent | Graphics mobile : flash au vrai franchissement |
| point_pouce_invisible | Graphics mobile : point au déplacement réel |
| projections_figees | Graphics mobile : évolution des particules |
| projections_devant_le_kart | Graphics mobile : particules derrière le kart |
| chevrons_retrecis | Graphics mobile : largeur physique des chevrons |
| grand_chrono_fige | Graphics mobile : chrono après franchissement |
| seuil_15 | Y04, cadence et repli |
| miroir | Y03, droite projetée |
| accelerateurs_chaussee | Graphics 3D : couleur aux échantillons de bande |
| damier_invisible | Graphics 3D : couleur aux échantillons d’arrivée |
| arbres_supprimes | Graphics 3D : position de l’arbre |
| caisses_invisibles | Graphics 3D : position de la caisse |
| flaques_supprimees | Graphics 3D : position de la flaque |
| portique_inaccessible | Graphics 3D : position du portique |
| road redrawn each frame | Cadence : une seule rasterisation |
| smoothed simulation delta | Cadence : mêmes 600 pas à 4/10/60 présentations par seconde |
| uncapped hidden interval | Cadence : intervalle caché plafonné |
| jointures_raster_sans_disques | Cadence : rayons de jointure positifs |
| origine_texture_centree | Cadence : origine de texture |
| route_retrecie | Cadence : échelle de texture |
| rotation_route_figee | Cadence : rotation de texture |
| route_decalee | Cadence : position de texture |
| route_visible_en_3d | Cadence : route cachée en 3D |
| texture_non_liberee | Cadence : ancienne texture libérée |
| hud_reecrit_sans_changement | Cadence : aucune écriture HUD sans changement |
| budget_debranche_du_compte_reel | Cadence : la contre-épreuve de 800 appels doit échouer |

L’audit inclut également les dix mutations déjà hors CI du catalogue :
`feuilles_sans_effet_pendant_derapage`,
`controle_suppression_adherence_reduite` échouent dans K02 ;
`controle_lave_conserve_objet`, `contournement_cote_unique`,
`tremplin_sans_largeur` dans K03 ; `tas_de_feuilles_invisibles`,
`plaques_de_lave_invisibles`, `animations_de_piste_figees`,
`tunnel_automne_non_dessine` dans Graphics catalogue ;
`generateur_joystick_avance_de_150ms` dans le contrôle de provenance de 18 images.

Audit Node exécuté : **42 mutations rejetées par assertion**, dont les 32
retirées de la commande récurrente. Les quatre étapes de l’audit réussissent.

Les autres scénarios unitaires partagés `mechanics` et `joystickCases` sont
exécutés une fois dans Vitest : les deux anciennes boucles Node et Vitest
appelaient la même méthode `run` de chaque même objet, avec un adaptateur
« booléen faux ⇒ échec ». Seules les six contre-épreuves Z36 de rejeu restent
propriétaires Node pour réutiliser le témoin complet. L’audit joystick continue
à invoquer exactement les cas unitaires Z37/Z38/Z39 de Vitest sur les mutants.
Les contrôles de comparaison compacte restent dans les deux environnements,
sans course complète supplémentaire.

La vue 3D réutilise aussi un unique point de recherche entre échantillons. Le
moteur `nearest` reste inchangé : son indice précédent initialise la recherche
exhaustive exacte, avec les mêmes règles d’égalité et les mêmes 97 visites
comptabilisées. Avant conservation du changement, les anciennes et nouvelles
vues ont été exécutées sur les 96 positions de chacun des trois circuits :
**288 enregistrements complets strictement identiques**, commandes Graphics et
arguments, couches, positions des karts et compteurs de coût inclus. Aucun
résultat attendu ni seuil n’a été recalculé.

### Mesures de la répartition actuelle

Même sélection isolée avant et après :
`node scripts/test-node.js --only=validate-derapage.js,check-derapage-3d.js,check-derapage-cadence.js,check-level-catalogue-kart.js`.
Toutes les mesures et vérifications passent par le verrou commun, avec priorité
CPU et entrées-sorties réduite. La charge de la machine reste partagée.

| Validateur | Avant (s) | Après (s) |
| --- | ---: | ---: |
| `validate-derapage.js` | 24,80 | 18,52 |
| `check-derapage-3d.js` | 20,90 | 2,80 |
| `check-derapage-cadence.js` | 8,55 | 5,43 |
| `check-level-catalogue-kart.js` | 0,48 | 0,80 |
| **Somme** | **54,73** | **27,55** |

Le coût Graphics 3D appartient désormais à cadence, qui partage les montages et
les références 2D. Préparation comprise, le lancement isolé passe de 58,11 s à
31,02 s. La somme baisse de 49,7 %, mais **la cible stricte de 25 s n’est pas
atteinte** : dépassement de 2,55 s. Aucun seuil n’est relevé pour masquer cet écart.

La suite complète de référence sur HEAD a pris 232,82 s, avec deux échecs hors
Dérapage (`validate-finger.js` et `test-dedale.js`) et dépassement du budget
global. Une première vérification complète de la nouvelle répartition, avant
réutilisation du point de recherche 3D, a réussi : 36 validateurs en 122,73 s.
Ces lancements sous charge variable ne constituent pas une comparaison isolée
du gain Dérapage. Lint, typecheck et build de la version finale réussissent.
Aucun navigateur, lancement de Vitest ni commit.

Vérification finale après réutilisation du point de recherche : **36 validateurs
réussis, `npm run test:node` en 118,46 s**, après lint, typecheck et build réussis.
Le budget global de 180 s et tous les oracles restent inchangés.

Fichiers modifiés : `package.json`, `docs/node-tests.md`,
`scripts/node-checks.js`, `scripts/validate-derapage.js`,
`scripts/check-derapage-3d.js`, `scripts/check-derapage-cadence.js`,
`scripts/check-derapage-joystick-mutations.js`,
`scripts/derapage-3d-integration.js`, `scripts/derapage-mobile-scene.js`,
`scripts/audit-derapage-mutations.js`, `scripts/derapage-graphics-checks.js`,
`tests/derapage.test.ts`, `tests/derapage-complete-replay.ts`,
`tests/level-catalogue-kart.test.ts`, `src/games/derapage/view3d.ts`.
