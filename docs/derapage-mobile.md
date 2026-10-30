# Dérapage au téléphone

Les contrôles Node utilisent le vrai moteur, les gestionnaires de pointeur et le
joystick de la scène. Seuls les ports DOM, Graphics, audio et plateforme sont
remplacés. Aucun navigateur ni Vitest n’a été exécuté, aucun commit créé.

## Géométrie et jouabilité

Les plaques de lave et les tas de feuilles occupent désormais les 20 % extérieurs
de la chaussée et alternent de côté. La voie libre mesure 80 % de la largeur,
toujours au moins 4,8 m (deux karts). Le centre reste libre sur chaque segment.
Leurs effets physiques restent identiques : adhérence des feuilles, plafond de
vitesse de la lave, suppression des impulsions et objets, immunité en l’air.
Les contrôles K02/K03 sondent maintenant les surfaces à leur emplacement réel,
avec contre-épreuves sur sol propre, en dérapage et en l’air. Le tremplin et son
contournement gardent leurs preuves à plusieurs vitesses, dont 24 m/s.
Les tracés K01/K02 ont ensuite été élargis et adoucis, comme décrit dans le
rapport de latence. Les six bandes K01–K03 avaient été régénérées
sur le moteur courant avec les placements et les bandes d’accélération actuels.

`onBoost` conserve les limites longitudinales de la bande et utilise `nearest`
pour sa limite latérale : exactement la section utilisée par la physique.
Z41 compare cette décision à la largeur physique, aux deux côtés et en fin de
bande, y compris le cas où la section la plus proche est la suivante.
Z40 conserve les contrôles du ruban continu et des bords à moins de 1 px.
Z43 conserve les sondes herbe/route sur tous les circuits non urbains.
Z26 mesure les trente géométries après remplacement des circuits du catalogue.

## Volcan Turbo

Le [diagnostic du saut et du contournement](derapage-volcano.md) donne les
mesures par tour, les contre-épreuves, les bandes K03 régénérées et les
résultats inchangés des cinq autres circuits.

## Oracle « jouer »

Le précédent oracle à 13 images/s et commande immédiate était trop optimiste.
Le [rapport de cadence et latence](derapage-latency.md) le remplace : table
déterministe fondée sur les appels Graphics, observation de 150 ms plus une
image, puis commande à l’image suivante. Il contient les trente budgets, les
six courses avant/après, les comparaisons séparées de largeur et de tracé,
et les limites de calibration encore non résolues sur Le Rocher.

## Pilote E2E

La distance fixe de 14 m regarde trop près lorsque les appels de pilotage
allongent la boucle réelle. `racingHeading` vise maintenant à
`max(14 m, vitesse × 1,5 s)` sur la ligne centrale. La branche Dérapage du spec
mesure les intervalles entre observations, incluant évaluation, événements,
attente et Élan ; moyenne, maximum et nombre sont joints dans ses résultats.
Les branches Bubble et Serpentin restent inchangées.

Le rejeu Node utilise le même bruit CSS ±12 px, sa graine continue entre les
niveaux, le déplacement de 80 px, le délai de 150 ms avant le mouvement et le
relâché/reprise autour d’Élan. Avec une période d’observation de 400 ms :

| Niveau | Tours | Course (s) | Place | Élan | Hors piste |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 | 3 | 60,58 | 1 | utilisé | 0 % |
| 10 | 3 | 58,03 | 1 | utilisé | 3,18 % |

Les assertions E2E de fin de course, victoire et utilisation d’Élan sont gardées.
Les périodes réelles du navigateur seront dans la pièce jointe JSON ; elles ne
sont pas inventées à partir des périodes simulées de Node.

## Relecture et mutations exécutées

Les assertions Graphics vérifient l’opacité des 24 cellules de la banderole,
les deux poteaux, le point mobile à sa position exacte, la largeur des chevrons,
les particules visibles derrière le kart et leur déplacement au temps de scène.
Trois vrais franchissements entraînent le chrono, le meilleur tour, les écarts
verts/rouges et le flash ; les expirations à 200 ms et 2 s sont vérifiées.
Le grand chrono est aussi comparé à la valeur du moteur après avancement.
Le DOM simulé prouve le contenu et le style, pas la mise en page du navigateur.
Le spec catalogue attend les dimensions réelles du HUD dans sa zone réservée.

| Mutation | Résultat Node |
| --- | --- |
| banderole_invisible | tuée : opacité |
| poteaux_invisibles | tuée : largeur des traits |
| flash_absent | tuée : éclair après franchissement |
| point_pouce_invisible | tuée : rayon et position du point |
| projections_figees | tuée : évolution temporelle |
| projections_devant_le_kart | tuée : projection derrière le kart |
| chevrons_retrecis | tuée : largeur dans la scène |
| grand_chrono_fige | tuée : valeur après avancement |

Les mutations chargent des modules en mémoire ; elles ne modifient aucun fichier
source. Un échec de syntaxe ou de chargement ne compte pas comme mutation tuée.

## Coût et conservation des preuves

Un rejeu Z36 complet produit un témoin indépendant des métadonnées de la bande.
Les six contre-épreuves de métadonnées le réutilisent, sans refaire six fois
la même course. La clé inclut niveau, durée, tous les caps et classe du moteur ;
une instrumentation explicite de `nearest` impose toujours un rejeu complet.
Les contrôles des caps bruités du catalogue s’effectuent pendant son unique
rejeu complet. Le script Graphics vérifie aussi directement les deux premières
observations du générateur, pour détecter une avance de 150 ms, sans régénérer
et rejouer une nouvelle course entière. `at` utilise une recherche dichotomique
sans changer ses interpolations. `scripts/test-node.js` est inchangé.

Les preuves historiques conservent leurs cercles anciens via des remplacements
réservés aux tests. Les anciennes bandes K01–K03 sont conservées dans
`tests/level-catalogue-kart-historical.ts` ; leur audit explicite utilise
`HistoricalBoostEngine`, avec cercles anciens et largeur des pièges égale à 100 %.
Le catalogue courant est rejoué sur le vrai moteur actuel. La graine standard
28 suffit désormais aussi pour le clavier de K03.

## Captures à examiner

Les captures catalogue attendent un état de course et la section mécanique,
avec `waitForFunction`, sans attente réelle arbitraire. Le délai est de 90 s,
et les avances manuelles de 300 ms réduisent les allers-retours.
Vérifier la voie libre et l’alternance des feuilles et de la lave, le tremplin,
les deux poteaux et la banderole, les chevrons jusqu’aux bords, le grand chrono
et le meilleur tour dans la bande du HUD. Après franchissement : flash bref,
écart coloré puis disparition. Au pouce : anneau, point et texte d’état.
Dans l’herbe : projections derrière le kart. Sur les circuits 5 et 10 : bords
continus des virages. En mouvement réduit : décor animé figé et flash absent.

## Bandes du catalogue

Anciennes bandes à cercles et pièges pleine largeur, puis nouvelles bandes du
moteur courant. Toutes finissent trois tours avec victoire ; les anciennes sont
conservées et leur rejeu exact a aussi été exécuté.

| Circuit | Commande | Images anciennes | Images actuelles |
| --- | --- | ---: | ---: |
| K01 | keyboard | 3383 | 3597 |
| K01 | joystick | 3437 | 3429 |
| K02 | keyboard | 3609 | 3855 |
| K02 | joystick | 3557 | 3543 |
| K03 | keyboard | 4567 | 3939 |
| K03 | joystick | 4493 | 3502 |

## Fichiers concernés

- Moteur : `src/engines/derapage/circuits.ts`, `track.ts`, `physics.ts`.
- Scène : `src/games/derapage/scene.ts`, `kart-art.ts`, `road.ts`, `joystick.ts`.
- Preuves Node : `scripts/validate-derapage.js`, `derapage-mobile-scene.js`,
  `derapage-mobile-mutations.js`, `check-level-catalogue-kart.js`,
  `derapage-human.js`, `record-level-catalogue-kart.js`,
  `validate-derapage-historical.js`, `validate-character-games-2.js`,
  `validate-level-catalogue.js`.
- Tests et bandes : `tests/derapage-mobile.ts`, `derapage-joystick.ts`,
  `derapage.test.ts`, `derapage-recordings.ts`, `derapage-historical-boosts.ts`,
  `level-catalogue-kart-checks.ts`, `level-catalogue-kart-replay.ts`,
  `level-catalogue-kart-recordings.ts`, `level-catalogue-kart-historical.ts`,
  `level-catalogue-checks.ts`.
- E2E : `tests/e2e/character-finger-2.spec.ts` (branche Dérapage),
  `character-policy-2.ts`, `derapage-catalogue.spec.ts`.
- Documentation : ce rapport, renommé sans numéro interne.

## Budgets des cas du catalogue

Le validateur Node chronomètre séparément les deux rejeux et la mécanique de
chaque circuit, comme les trois cas de la suite unitaire. Chacun reste sous
la limite de 2 s ; aucun rejeu n’est raccourci. Le passage du callback de mesure
par le validateur partagé ne change que la branche Dérapage.

## Validation finale et limite restante

`npm run lint && npm run typecheck && npm run build`, puis `npm run test:node` :
succès. Les 34 validateurs passent en 115,19 s, sous le budget global de 180 s.
Aucun navigateur, Vitest ou commit.

Le plafond demandé de 18 s pour Dérapage **n’est pas atteint** :
`validate-derapage.js` mesure 25,02 s, oracle inclus, et le contrôle Graphics du
catalogue 0,59 s, soit 25,61 s. Les six courses de l’oracle ont passé leur
assertion de coût inférieure à 10 s. Le validateur partagé du catalogue mesure
5,15 s pour l’ensemble des jeux ; ses cas Kart restent individuellement sous
2 s, comme les cas unitaires, sans simulation raccourcie.

La première exécution complète mesurait 149,06 s, avec un échec temporel du cas
agrégé K02. Le découpage final conserve les mêmes deux rejeux complets et la
mécanique, avec une limite de 2 s sur chacun. Aucun seuil de jouabilité n’a changé.

| Validateur | Durée réelle (s) |
| --- | ---: |
| `validate-derapage.js` | 25.02 |
| `validate-character-games-2.js` | 7.24 |
| `validate-orbite.js` | 6.12 |
| `validate-essaim.js` | 8.22 |
| `validate-ferraille.js` | 4.07 |
| `validate-caisses.js` | 7.93 |
| `validate-briqueterie.js` | 3.28 |
| `validate-character-scenes-2.js` | 1.19 |
| `validate-characters.js` | 1.63 |
| `validate-character-games.js` | 1.67 |
| `validate-character-scenes.js` | 1.19 |
| `validate-character-games-3.js` | 2.74 |
| `validate-character-scenes-3.js` | 2.79 |
| `validate-character-finger-3.js` | 0.52 |
| `validate-empilo.js` | 0.66 |
| `validate-alunir.js` | 1.12 |
| `validate-arcade-art.js` | 0.48 |
| `validate-bubble.js` | 2.81 |
| `validate-character-snake-policy.js` | 1.78 |
| `validate-finger.js` | 7.61 |
| `validate-action-art.js` | 0.41 |
| `validate-action-scenes.js` | 1.13 |
| `validate-level-catalogue.js` | 5.15 |
| `validate-dedale.js` | 1.22 |
| `validate-pass76.js` | 0.44 |
| `validate-regressions.js` | 1.87 |
| `validate-serpentin.js` | 0.94 |
| `validate-traverse.js` | 1.55 |
| `check-level-catalogue-kart.js` | 0.59 |
| `check-essaim-art.js` | 0.53 |
| `check-pwa-mutations.js` | 3.49 |
| `test-dedale.js` | 0.58 |
| `test-pwa.js` | 1.11 |
| `measure-thumbnails.js` | 5.01 |
