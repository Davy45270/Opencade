# Inventaire des scripts Node

`npm run test:node` lance les points d’entrée de `scripts/node-checks.js` avec un processus par CPU disponible, plafonné à trois processus Node, sans navigateur ni Vitest. Il affiche chaque durée et le total, échoue sur toute erreur et si le total atteint 180 s. Les validateurs qui écrivent des rapports acceptent `--checks-only` : les écritures et les régénérations de campagnes sont omises ; les rejeux et les assertions de règles restent actifs. Aucun `--record` en CI. Le chargeur utilise l’effacement TypeScript natif quand la syntaxe le permet, avec repli sur le compilateur pour les propriétés de constructeur et les énumérations. Les processus partagent un cache de transpilation TypeScript temporaire, indexé par le contenu et supprimé en fin de commande ; les modules mutés restent donc distincts. Le cache de compilation V8 est également partagé et temporaire. Les sources sont précompilées une seule fois avant les processus, et les transpilations des mutations et des harnais utilisent le même cache. Les rejeux Orbite identiques partagent leur preuve réussie (empreinte, témoins, événements, état final) dans ce seul lancement : la clé inclut toutes les sources et tous les oracles, ainsi que la bande complète. Les moteurs mutés contournent toujours cette réutilisation. Une entrée exécutée seule rejoue réellement si aucune preuve n'existe.

Catégories : **V** validateur rapide (objectif < 30 s par entrée), **G** campagne longue / génération, **M** mesure ou module auxiliaire (pas un test autonome). Les auxiliaires qui protègent une règle sont appelés par les validateurs indiqués ; lancer un module qui exporte des fonctions sans les appeler ne constitue pas un test.

| Script dans `scripts/` | Classe | Exécution / rôle |
| --- | --- | --- |
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
| `check-derapage-joystick-mutations.js` | V | Appelé par `validate-derapage.js` dans test:node (pas de double exécution). |
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
| `validate-derapage.js` | V / G | Mode CI `--checks-only` : géométrie, contrôles ciblés, mutations et rejeux historiques. En CI, les campagnes historiques intermédiaires sont bornées à 1 200 pas, avec leurs empreintes cumulatives existantes tous les 600 pas ; les niveaux 1/10/30 et les quatre bandes tactiles restent complets. Hors CI, les 30 campagnes historiques sont complètes. Les bandes joystick sont rejouées et leurs mesures/états finaux vérifiés sans recalcul du pilote ; la mesure sans assistance reste hors CI. La campagne de mesure pilote/IA des 30 circuits reste dans le mode complet ; ses règles Z13/Z24 sont déjà couvertes par `tests/derapage.test.ts`. |
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
