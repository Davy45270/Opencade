# Volcan Turbo au doigt

La mesure en navigateur fournie (244 s sans arrivée, 291 chocs, kart à
contresens) reste une observation externe : aucun navigateur n’a été exécuté
ici. Les preuves ci-dessous utilisent le moteur, la scène et ses événements de
pointeur réels, avec les seuls ports de plateforme remplacés. Le pilote garde
son bruit de ±0,35 rad, son observation de 150 ms, sa file de commandes retardées
et la physique à 60 Hz. Les cadences de 11, 12, 13, 15 et 20 images/s sont
simulées explicitement, sans ajuster le pilote au circuit.

Les données détaillées, par tour, sont dans
[`derapage-volcano-report.json`](../tests/derapage-volcano-report.json).
Les impacts sont comptés par kart touché, comme `hits`, pas par paire : deux
karts sans bouclier peuvent compter deux impacts pour une collision. Les
compteurs facultatifs restent dans une `WeakMap`, hors des snapshots et bandes.
Une assertion attribue chaque augmentation de `hits` au kart, au rail ou à
l’arbre. Le trou n’a pas de paroi solide produisant une impulsion : son compteur
de chocs reste nul ; ses entrées, échecs de lancement et contournements sont
mesurés séparément.

## Cause et contre-épreuves

- **Approche et réception courbes, trop étroites.** L’ancien tremplin occupait
  la section 40, juste dans le virage : près de 14° de changement de tangente
  entre deux sections au tremplin, pour 14 m de largeur. Le cap est conservé en
  l’air. À 12 images/s, le joueur réussit sept sauts mais ne valide que trois
  tours : il manque deux passages d’arrivée dans chacun des tours 2 et 3, après
  une porte non validée. Les tours de 66,58 et 61,70 s ne sont donc pas des
  échecs de saut. Les replays à 15 et 20 images/s perdent aussi un tour.
- **IA groupées autour du saut : confirmé.** À 12 images/s, leurs impacts entre
  karts dans la zone du saut valent **747, 25, 0** pendant les trois tours du
  joueur. Ce 747 appartient aux IA de cette mesure ; le joueur compte 35 impacts.
  À 11 images/s, les mêmes compteurs valent 229, 29, 10. Le regroupement est
  réel, même lorsque la bande particulière du joueur échappe au groupe.
  Une sonde distincte sur les incréments des compteurs, à la position exacte du
  contact, classe 722 impacts à l’approche, 25 en vol et 2 dans les 280 ms après
  atterrissage au premier tour. Les deux contacts de différence avec 747 sont
  aux bornes de la zone, évaluées avant le pas dans le compteur principal.
  Le regroupement commence donc surtout **avant le lancement**, plutôt qu’à
  l’atterrissage. La sonde conserve exactement le chrono de la course témoin.
- **Rail capable de renvoyer en arrière : confirmé par choc imposé.** L’ancienne
  résolution choisit le signe de la tangente d’après le cap entrant. Une arrivée
  oblique peut donc sélectionner le sens inverse. La mutation qui rétablit ce
  choix produit effectivement un rebond arrière, détecté sur le vrai moteur
  pendant une course du pilote retardé.
- **Contournement orienté en arrière : confirmé indépendamment.** Sur les trente
  combinaisons vitesse/côté/section, quatre entrées centrales lentes imposent
  jusqu’à **0,817 s** à plus de 90° de la piste. La projection purement latérale
  vers la normale de la section suivante peut être en arrière de la tangente
  locale. Le trou ne provoque pas ce retournement par un rebond.
- **Lave qui empêche le lancement : infirmé pour ces courses.** Les sept
  lancements du joueur à 12 images/s partent entre 24,00 et 24,21 m/s ; aucune
  lave n’est touchée dans les dix sections précédant le tremplin. Aucun saut
  commencé n’atterrit dans le trou et aucun contournement spontané n’est utilisé.
  Le choc imposé, lui, réduit réellement la vitesse sous 16 m/s et emprunte le
  contournement : la branche lente est donc aussi exercée.

## Correction et portée

Seul le tracé de Volcan Turbo change. L’approche droite et le virage de retour
sont élargis et adoucis. Le tremplin passe en section 48, le trou en 49 : la
largeur au lancement atteint 20,98 m et le changement local de tangente au
tremplin devient inférieur à 1°. Le lancement se trouve à 144 m de la fin de la
première lave et à 69 m de la suivante.

L’entrée latérale du contournement se trouve désormais 0,15 m avant le trou,
sur les planches du côté choisi. Elle se rejoint en avançant ; les points de
sortie conservent leur progression vers la route centrale. Les trente sondes
finissent leur trajet, sans immobilisation de 0,5 s ni passage au sol dans le
trou, et le contresens maximal devient **0 s**. Les deux côtés restent utilisés.

Les IA décalent progressivement leurs cinq trajectoires de 2,8 m autour du saut,
puis rejoignent la ligne centrale. Dans cette zone seulement, leur vitesse cible
est de 18,25 à 19,25 m/s et elles gardent leurs objets. Les rails de ce circuit
renvoient dans le sens de la piste. Les paramètres de lave, de durée et seuil
de saut, d’ouverture du trou et de vitesse du contournement sont conservés.
Les circuits historiques sont restaurés explicitement dans leur adaptateur de
test, avec leurs anciennes géométries et placements.

## Avant et après à cadence identique

À **12 images/s**, avec le même pilote et les mêmes graines. Le hors piste par
tour est mesuré à chaque pas physique ; le total ci-dessous reprend aussi la
mesure sur les images présentées de l’oracle existant.

| Tour | Avant (s) | Après (s) | Chocs joueur avant → après | Hors piste avant → après |
| --- | ---: | ---: | ---: | ---: |
| 1 | 21,65 | 22,53 | 35 → 36 | 2,77 % → 0 % |
| 2 | 66,58 | 23,70 | 0 → 0 | 9,26 % → 0 % |
| 3 | 61,70 | 21,63 | 0 → 0 | 3,86 % → 0 % |
| Course | 149,93 | 67,87 | 35 → 36 | 6,11 % → 0 % |

Tous ces chocs joueur sont kart contre kart : **rail 0, arbre 0, bordure du
trou 0** avant et après. Les impacts des IA autour du saut passent de
747/25/0 à **0/0/0**. Les sauts joueur passent de 1/3/3 à **1/1/1** ; les sauts
manqués, contournements et contresens du joueur valent zéro dans les deux
courses normales. L’arrêt maximal reste à 0,25 s.

| Cadence | Course avant → après (s) | Chocs joueur avant → après | Hors piste après |
| --- | ---: | ---: | ---: |
| 11 | 69,92 → 67,12 | 94 → 32 | 0,68 % |
| 12 | 149,93 → 67,87 | 35 → 36 | 0 % |
| 13 | 64,13 → 65,18 | 66 → 57 | 0 % |
| 15 | 89,73 → 66,95 | 85 → 31 | 0 % |
| 20 | 82,37 → 64,08 | 80 → 95 | 0 % |

Ces cinq courses finissent avec victoire, restent sous 1,5 fois K01, sous 150
chocs et 15 % de hors piste, sans arrêt de 0,5 s ni contresens de 0,5 s.
Les 96 positions du rendu ont été remesurées pour K03 : maximum de 376 appels
en vue du dessus (400 auparavant), 445 en 3D (488 auparavant). Avec la cadence
qui en découle, **11,48 images/s**, K03 finit en **66,68 s**, avec des tours de
22,58/22,70/21,40 s, **29 chocs**, 0 % de hors piste et 0 s de contresens.
C’est **1,124 fois K01**, et la plus longue des six courses du modèle courant.

Le test de choc imposé utilise le même pilote, avec une arrivée oblique sur le
vrai rail du tremplin. Il mesure un impact de rail, un lancement trop lent,
un contournement à droite terminé, puis deux sauts réussis ; **0 s de
contresens**. Cette perturbation artificielle compte 192 impacts sur la course,
sans être utilisée pour la comparaison de performance des courses normales.
Le contrôle impose aussi que le rebond lui-même pointe vers l’avant.

## Cinq autres circuits

Égalité exacte avant/après des chronos, tours, chocs, hors piste, place et arrêt
maximal ; aucune modification de leurs données ni de leurs bandes.

| Circuit | Course (s) | Tours (s) | Chocs | Hors piste |
| --- | ---: | --- | ---: | ---: |
| La Flèche des prés | 63,05 | 21,58 / 20,62 / 20,85 | 35 | 0 % |
| Le Rocher | 62,95 | 21,33 / 20,65 / 20,97 | 40 | 2,24 % |
| La Clef des champs | 63,52 | 21,67 / 20,97 / 20,88 | 94 | 1,68 % |
| K01 Bambou Express | 59,32 | 20,65 / 19,23 / 19,43 | 263 | 0 % |
| K02 Feuilles Folles | 61,10 | 21,17 / 20,02 / 19,92 | 172 | 0 % |

Les 263 et 172 sont les résultats préexistants du modèle Node à sa cadence
calibrée ; ils ne remplacent pas les mesures du navigateur fournies séparément.

## Bandes, tests et reproduction

Seules les deux bandes K03 courantes sont régénérées et rejouées intégralement :
clavier **3939 → 3913** pas (23,72/20,95/20,55 s), joystick **3502 → 3804** pas
(22,05/20,53/20,82 s). Les six bandes historiques restent inchangées et leur
rejeu exact passe avec leur adaptateur de géométrie.

Le validateur Node existant exécute le modèle réaliste courant, les courses à
12 et 20 images/s et le choc imposé. Il vérifie le rapport à K01 mesuré dans la
même exécution, les 150 chocs, le hors piste, les arrêts et le cap. Les trente
sondes de mécanique ajoutent l’assertion de cap au test partagé du catalogue.
Aucun test ne consulte l’horloge pour décider de la jouabilité.

Reproduction des mesures, sans navigateur ni suite unitaire :

```sh
nice -n 19 ionice -c3 node scripts/measure-volcano.js --before
nice -n 19 ionice -c3 node scripts/measure-volcano.js
nice -n 19 ionice -c3 node scripts/measure-volcano.js --routes --before
nice -n 19 ionice -c3 node scripts/measure-volcano.js --routes
nice -n 19 ionice -c3 node scripts/check-derapage-volcano-mutations.js
```

Les trois mutations sont exécutées en mémoire et rejetées par leurs assertions :
entrée du contournement purement latérale ; rail autorisé à choisir la tangente
arrière ; ancien tracé étroit et saut dans le virage.

## Validation finale

`lint`, `typecheck`, `build`, puis `test:node` passent, chacun sous le verrou
commun avec les priorités `nice -n 19` et `ionice -c3`. La suite complète passe
ses **45 validateurs en 171,76 s**, avec un seul worker dans cette exécution.
Le validateur Dérapage prend 21,03 s. Les cas K03 du catalogue mesurés
séparément prennent 823 ms (clavier), 494 ms (joystick) et 268 ms (mécanique),
sous les 2 s des cas unitaires, sans lancer la suite unitaire.
Aucun navigateur, aucune exécution de la suite unitaire et aucun commit.
`scripts/test-node.js` est inchangé.

Fichiers modifiés ou ajoutés :

- Moteur : `src/engines/derapage/circuits.ts`, `ai.ts`, `physics.ts`.
- Oracle et mesures : `scripts/derapage-mobile-scene.js`,
  `scripts/measure-volcano.js`, `scripts/check-derapage-volcano-mutations.js`.
- Tests et bandes : `tests/level-catalogue-kart-checks.ts`,
  `tests/level-catalogue-kart-recordings.ts`,
  `tests/derapage-historical-boosts.ts`,
  `tests/derapage-graphics-budget.json`, `tests/derapage-volcano-report.json`.
- Documentation : `docs/derapage-mobile.md`, ce rapport.
