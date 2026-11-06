# Petits Pompiers — contrat du moteur et intégration de scène

Le moteur ne dépend d'aucun rendu. Identifiant : `petits-pompiers`.
Les mascottes gardent les identifiants de `src/characters/model.ts` ; la future
scène doit les dessiner en tenue de pompier originale, sans insigne officiel.
Le contenu n'exige aucune lecture. Les métadonnées `name`, `world`, `novelty`
servent à l'édition et à l'accessibilité, sans imposer de consigne écrite.

```ts
const engine = new Engine('panda');
engine.loadLevel(LEVELS[0], 28, 'detente'); // accepte aussi l'index 0
engine.input({ dx: 1, dy: 0, action: false, tool: false });
engine.step(FIXED);                       // millisecondes, FIXED = 1000 / 60
const state = engine.snapshot();          // copie détachée, sérialisable
const guide = engine.nextObjective();     // { type, at, tool? }
```

`input` remplace les entrées persistantes. Les travaux contextuels et `tool` se
déclenchent sur front montant, échantillonné à chaque pas fixe. Tenir `action`
prolonge le jet en cours et répète la mousse en respectant charges et recharge ;
transmettre les relâchements. Les autres travaux ne se répètent pas au maintien.
Le déplacement accepte huit directions et normalise les diagonales ; le regard
et le jet ont quatre directions (axe dominant, horizontal en cas d'égalité).
Un appel à `step` peut contenir plusieurs pas ; son reliquat est conservé.
Les positions sont continues en unités de simulation, une tuile vaut 32 unités.
`at` est l'indice de la tuile du joueur ; `tileCenter(at)` et `gridAt(x,y)`
convertissent coordonnées et indices. La grille fait 448 × 288 unités.
À 390 px de large avec 14 px de marge de chaque côté : 25,9 px par tuile,
la grille entière mesure environ 362 × 233 px. Garder les commandes et icônes
d'objectifs sous la grille ; permettre un zoom accessible si nécessaire.

Une action lance un travail autonome, visible dans `job` (`kind`, `target`,
`remaining`, `elapsed`, en secondes). Le déplacement est suspendu pendant le
travail. Un nouvel appui pendant ce travail est consommé, sans créer de file.
Les temps courts permettent à un enfant de toucher puis relâcher : jet 1 s,
mousse 0,3 s, remplissage 1,5 s, soin 0,8 s, appel 0,4 s. Ramassage/dépôt :
0,6 s (Tutu 0,15 s), montée : 2 s (CaliRoux 1 s), hache : 1 s (gravats 2 s ;
Pestouille 0,3 s). Un appui bref suffit ; le maintien prolonge seulement les jets.

Priorité exacte d'un appui :

1. Déposer près de la zone sûre si une victime portée ou un suiveur est présent.
2. Soigner une victime accessible blessée si la trousse est possédée.
3. Porter une victime accessible, visible et soignée si les bras sont libres.
4. Remplir près d'une borne si la réserve n'est pas pleine.
5. Déblayer un ouvrage adjacent si l'outil ou la capacité le permet.
6. Poser l'échelle et monter auprès du pied d'une fenêtre si les bras sont libres.
7. Appeler une personne cachée ou pouvant rejoindre le joueur avec le mégaphone.
8. Utiliser l'extincteur s'il est sélectionné ; sinon lancer un jet de tuyau.

L'accès contextuel exige la même case que le joueur ou une case voisine
orthogonale (distance de Manhattan ≤ 1), même si sa position continue est
proche d'un angle : aucun ramassage diagonal à travers un mur. En cas de plusieurs
cibles, ordre stable des victimes ou ordre des tuiles. Le pied d'une fenêtre est
la case immédiatement au-dessous, extérieure (`g`, `.`, `s`) et accessible.
La fenêtre occupe la façade de la maison, avec un intérieur au-dessus. Une fenêtre reste infranchissable
à pied ; le travail de montée ramène son occupant dans les bras du joueur.
Les portes `D` s'ouvrent au passage. `B` représente une porte bloquée cassable,
`b` des planches, `X` une caisse, `#` des gravats. La hache ne casse jamais `W`.
En vue isométrique, `B` est la barrière dessinée par David (vue ¾ droite, en miroir
quand le mur court selon x), posée dans l'embrasure le long du mur ; le niveau 4
(« porte bloquée et hache ») en a une. Le chat à secourir (`C`) est son chaton :
« appel à l'aide » pendant l'attente, « soulagé » dans les bras du pompier, « heureux »
une fois sauvé, assis près du point de secours. Le chien et les personnes gardent
leur sprite ; le dessin vectoriel reste le repli tant que les sprites ne sont pas chargés.
Pestouille peut déblayer caisses et gravats même sans hache ; ses autres travaux
cassables utilisent sa hache de départ. Chaque outil rencontré au sol est
ramassé automatiquement en entrant dans sa tuile. La touche outil parcourt
l'inventaire, dans l'ordre d'acquisition. Les secours contextuels ne dépendent
pas de la sélection. Hors contexte pertinent, les outils de secours reviennent
au tuyau ; l'extincteur sélectionné vide émet `foam-empty`.

Le tuyau consomme 24 unités/s, portée 3 tuiles. Chaque intensité coûte 12 unités
utiles ; les progrès partiels restent sur le foyer. Boubou conserve 100 % du
débit et atteint 4 tuiles ; les autres conservent 90 %. Un jet consomme même
sans cible et s'arrête au premier foyer ou obstacle. La mousse a une portée de
1 tuile, 6 charges par objet, 60 unités/s et 0,8 s entre départs de jet. Une
borne rend 80 unités/s sans dépasser la capacité.

Vitesses/réserves : Boubou 100/120, CaliRoux 135/80, Pestouille 110/95,
Tutu 125/85, Lumi 105/100. Tous commencent avec le tuyau ; respectivement
aucun supplément, échelle, hache, trousse, mégaphone. Porter multiplie la vitesse
par 0,72 sauf pour Tutu ; neige × 0,7, fumée × 0,65, effets cumulables.
Le halo de signalisation de Lumi révèle et rassure à 3 tuiles ; le mégaphone
à 4 tuiles. Seules les personnes valides et à hauteur du sol suivent ; animaux
et victimes blessées se portent après soin. La file est limitée à 4 personnes,
ordonnées par identifiant, avec un chemin recalculé et une vitesse de 92.
Une personne peut être révélée derrière un obstacle sans pouvoir le traverser.
Le dépôt compte chaque sauvetage une seule fois ; le port est limité à une victime.

Les foyers se propagent sur un voisin cardinal inflammable libre, choisi avec
`Random(seed)` à chaque intervalle du niveau. Une nouvelle flamme commence à
l'intensité 1, jamais au-delà du maximum du niveau (3). Herbe, intérieur, arbres
et ouvrages de bois sont inflammables ; route, neige, eau et gravats ne le sont
pas. Une tuile éteinte est définitivement brûlée. Le tutoriel désactive la
propagation ; les suivants utilisent 22 à 14 s en détente. En détente, le nombre
simultané de foyers est borné au nombre initial + 3, l'intensité ne croît pas ;
aucune limite de temps ni perte de cœur. En défi, intervalle divisé par deux, et
chaque foyer non traité depuis 3 s gagne une intensité, jusqu'au maximum.
Chaque apport d'eau ou de mousse remet son compteur `idle` à zéro, même si
l'apport n'a pas encore suffi à baisser l'intensité. Après interruption, la
croissance reprend toutes les 3 s. `growthClock` et `spreadClock` sont des secondes
de simulation, sérialisées dans le snapshot. Le délai vaut
`max(60, ceil(3 × durée défi maximale des cinq pilotes / 10) × 10)` secondes.
Le validateur vérifie cette formule avec les ticks des 75 bandes défi.
En défi, 3 cœurs, dégâts dans la fumée et 2 s d'invulnérabilité ; seuls
le temps du niveau ou zéro cœur provoquent l'échec. Aucun décès de victime.

Les objectifs sont des seuils positifs : `extinguish`, `rescue_person`,
`rescue_animal`, `heal`. La victoire exige tous les seuils et l'entrée du joueur
dans la tuile sortie. Une étoile garantie, une pour aucun cœur perdu, une pour
tout éteint ou, en défi, un temps ≤ 70 % du délai, plafonnées à trois. Aucun
score négatif. La flèche recommande d'abord le dépôt des personnes accompagnées, puis un
extincteur présent au sol, puis le foyer le plus proche (départage par indice)
ou la borne si l'eau ne suffit pas pour la prochaine unité d'intensité, puis les
victimes et leurs outils/prérequis, puis la sortie. Elle est toujours définie.
Le pilote utilise cette même règle générale pour tout identifiant de niveau ;
il préfère les chemins et positions de tir sans fumée, maintient le tuyau
pendant qu'un foyer est dans sa ligne de tir et utilise la mousse à courte portée.

`events` contient tous les événements du dernier `step`, à lire une seule fois
après cet appel. `at` est toujours une tuile ; `value`, quand présent, est un
identifiant de victime ou un indice d'outil. Les types d'événements sont :

- Départ d'action : `spray`, `foam`, `refill`, `pickup`, `deposit`, `heal`,
  `break`, `climb`, `call` ; synchroniser les animations avec `job`.
- Résultats : `carried`, `healed`, `cleared`, `climbed`, `refilled`, `rescued`,
  `extinguished`, `revealed`, `ladder`, `pickup-tool`, `tool`, `spread`.
- Retours : `empty`, `foam-empty`, `hurt`, `won`, `lost`.

Pour les tests de la future scène, exposer un crochet de lecture qui appelle
`engine.snapshot()`, sans faire avancer la simulation. Ce snapshot inclut les
entrées et leurs fronts, le reliquat, l'état du générateur seedé, les travaux,
les compteurs et l'objectif suivant. Le pilote `Pilot.readAction(engine)` est
une lecture pure et renvoie des entrées ; `createDemo(seed).step()` fournit
une démonstration pure qui parcourt les quinze niveaux. Aucun minuteur du
système n'est nécessaire.

Les oracles sont dans `tests/petits-pompiers-oracles.ts`, partagés avec
l'enregistrement Vitest et le validateur Node. Les 150 bandes contiennent
`[tick, dx, dy, action, tool]` seulement aux changements, avec tick final et
empreinte SHA-256 du snapshot complet. Le validateur rejoue sans pilote et
contrôle toutes les entrées consommées, les ticks, la victoire et l'empreinte.
La génération explicite utilise `PP_RECORD=1` avant la commande verrouillée
`npm run test:node -- --only=validate-petits-pompiers.js`. L'exécution ordinaire
n'écrit aucun fichier. Les mutations sont chargées en mémoire via le harnais
existant et vérifiées sous cette même commande ; aucune source sur disque
n'est modifiée. Détails et durées : `GAME_SPEC.md` et
`docs/petits-pompiers-validation.json`.

Le validateur rejette les paramètres non finis, les intensités non entières ou
hors `1 ≤ intensity ≤ maxIntensity ≤ 3`, les durées non positives, les intervalles
négatifs, les coûts d'extinction non positifs, les objectifs impossibles, les
services manquants ou dupliqués et les outils de secours indispensables absents.
La diversité est mesurée par Hamming sur les 126 cases : chaque paire doit
différer d'au moins 35 % et la position de chacun des quatre services est unique dans la campagne. Chaque carte après le tutoriel doit propager avant 60 s sans
action, et au moins dix niveaux doivent donner une issue simulée différente
entre les modes (durée, eau, cases brûlées, progression ou dégâts, sans inclure
le champ `mode` ni les horloges propres au mode dans cette comparaison).
