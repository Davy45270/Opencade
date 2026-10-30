# Dérapage : option de caméra 3D

Le menu propose « Vue : dessus / 3D », avec une cible minimale de 44 px.
Le champ optionnel `view` de la sauvegarde existante conserve le choix ; une
ancienne sauvegarde ouvre la vue de dessus. Un repli ne modifie pas ce champ.
La caméra suit le cap du joueur. En 3D, le haut du joystick conserve ce cap,
la droite vise un quart de tour à droite. La zone morte, l’intensité et
l’assistance utilisent les mêmes fonctions que la vue de dessus.

## Rendu et coût

Le moteur est inchangé. Les deux rendus lisent `snapshot()`, sans modifier
la course. La projection du sol inverse chaque ligne par
`distance = hauteur × focale / (y − horizon)` ; l’horizon est à 212/640,
sous la bande HUD de 96 px. Le ciel, le sol, les arbres et les véhicules
sont dessinés par code. Les personnages des karts utilisent leurs dessins
vectoriels arrière existants, mis à l’échelle. Les objets sont triés du
plus éloigné au plus proche et coupés au-delà de 180 unités.

Chaque image 3D compte exactement **107 bandes de 4 px et 3 210 échantillons**
(30 colonnes de 12 px), soit **311 370 visites de segments** pour `nearest`.
Les accélérateurs appellent `onBoost` avec le résultat de cette recherche,
sans une deuxième recherche de segment. Les dangers utilisent `kartFootprint`,
le raccourci `onShortcut`, les portes les coordonnées de `track.slalom` et
l'arrivée `track.finishLine` : ces données servent aussi à la physique et au
rendu de dessus. Aucune emprise physique n'est recalculée dans le rendu 3D.
Les rectangles contigus sont fusionnés horizontalement puis verticalement,
et regroupés par couleur. Seuls les objets dont les bornes projetées croisent
l'écran sont dessinés. Les karts sont triés du fond vers le premier plan ;
leurs dessins arrière utilisent le même cache de textures procédurales que
les dessins de dessus. Le compteur `sprites` mesure les objets effectivement
dessinés, et `view().cost` expose les compteurs de travail du sol.

Le validateur compte **tous les vrais appels Graphics de la scène**, y compris
styles et effacements, après création des textures. Il parcourt les 96 positions
centrales de chaque circuit, graine 28, avec le même cap et les mêmes objets.
Le maximum 3D doit rester inférieur ou égal à 1,5 fois le maximum de dessus.
Un enregistreur artificiellement gonflé doit faire échouer ce budget.
La création initiale des textures est vérifiée séparément, hors coût récurrent.

La cadence utilise les intervalles bruts entre horodatages `update`,
indépendamment de `advance(ms)`. Sa fenêtre glissante couvre deux secondes.
Trois secondes consécutives sous 30 images/s après constitution de cette
fenêtre déclenchent le repli. Le menu et l’indicateur de commande le signalent.
Le repli reste actif jusqu’à un nouveau choix ou un rechargement.

## Vérifications

- Y01 compare le moteur à HEAD, détecte les fichiers non suivis et les imports
  vers les vues.
- Y02 part de la grille normale et termine trois tours sur une graine commune.
  Le test pur compare les karts à chaque pas et le snapshot final complet.
  L'intégration Node rejoue la même bande d'entrées horodatées à la frontière
  `engine.input` via les deux chemins `Scene.update`, avec rendu au départ
  et à chaque changement de tour. Le snapshot final, le temps et l'ordre
  sont strictement égaux. Cette bande teste la scène et le rendu ; les
  commandes relatives ont leur propre oracle.
- Y03 couvre la projection, l’horizon, les limites de visibilité et le budget
  fixe, la droite de l’écran à plusieurs caps et l’aller-retour du sol.
  Un scénario complémentaire vérifie les couleurs des trois circuits
  kart, l’ordre et la réduction des karts éloignés.
- Y04 injecte des deltas déterministes : baisse prolongée, baisse brève,
  cadence saine et valeurs invalides, puis 28, 30 et 32 i/s et 4 i/s sur cinq
  secondes. L'intégration transmet des horodatages réels avec un delta lissé
  factice à 60 i/s et vérifie le repli et la préférence conservée.
- Les ajouts vérifient le pouce vers le haut, la droite relative, la zone
  morte, la pleine déflexion et la compatibilité de la sauvegarde.
- Y05 à Y08 résident dans la nouvelle spec E2E, inscrite pour desktop et mobile.
  Ils couvrent la persistance et les erreurs console, la cadence sous bridage
  CPU avec mesure indépendante par horodatages de présentation et pièce jointe
  JSON, une arrivée pilotée et l'égalité du titre, des temps et du classement,
  puis les captures des niveaux 1 et 30. Chaque test a une limite de 90 s et
  attend des états, sans temporisation ni oracle d’horloge dans les assertions.

Les scénarios purs sont exécutables avec le validateur Node et partagés
avec les tests Vitest, limités à deux secondes par test. Les vérifications
visuelles et la cadence sur téléphone nécessitent l’exécution E2E ailleurs ;
elles ne sont pas attestées par les tests purs.

## Autres mutations utiles

1. Retirer `+ Math.PI/2` de `screenHeading` : le test du pouce vers le haut échoue.
2. Inverser le signe de la profondeur dans la projection : monotonie et
   visibilité échouent.
3. Remplacer les 3 000 ms de cadence basse par 300 ms : le scénario de chute
   brève et la limite avant repli échouent.

## Lecture des captures

Sur `derapage-3d-play` et `derapage-3d-level30`, pour les deux formats :
vérifier la continuité de la route en perspective, l’herbe sur ses côtés,
les karts éloignés plus petits et l’horizon au tiers supérieur. Le chrono,
le meilleur tour et la mini-carte doivent rester dans la bande haute,
sans masquer la route. Vérifier aussi en jeu les bandes d’accélération,
le damier et son portique, les arbres, et les palettes bambou, automne et
volcan. Ces détails demandent d’autres positions que celles des deux captures.

## Résultats déterministes et mutations

Maxima des appels Graphics par image chaude, sur les 96 positions centrales :

| Circuit | Dessus | 3D | Plafond 3D |
| --- | ---: | ---: | ---: |
| 1 | 400 | 542 | 600 |
| 10 | 390 | 528 | 585 |
| K03 | 436 | 488 | 654 |

Les couches Graphics des accessoires et les images des karts partagent une
profondeur issue de la projection. Le HUD est au-dessus de ces couches.
Les effacements et changements de profondeur de ces couches sont compris
au budget ; elles sont réutilisées, puis détruites avec la scène.

Les remplacements suivants sont exécutés en mémoire par les deux validateurs
Node, à l'exception du remplacement du compteur du validateur, exécuté dans
un fichier temporaire supprimé après son sous-processus. Chacun doit échouer
sur une assertion, après réussite du témoin non muté.

| Mutation | Oracle qui la rejette | Résultat Node |
| --- | --- | --- |
| Seuil de repli à 15 i/s | 28 i/s pendant cinq secondes | Tuée |
| Projection en miroir | Droite de l'écran à plusieurs caps | Tuée |
| Accélérateurs couleur chaussée | Couleur et cellule projetée | Tuée |
| Damier invisible | Couleur et cellule projetée | Tuée |
| Arbres supprimés | Couleur et centre projeté | Tuée |
| Caisses disponibles invisibles | Couleur et rectangle projeté | Tuée |
| Flaques supprimées | Couleur et ellipse projetée | Tuée |
| Portique inaccessible | Couleur et pied projeté | Tuée |
| Jointures raster sans disques | Rayons positifs du raster RoadLayer | Tuée |
| Texture centrée | Origine de l'image RoadLayer | Tuée |
| Route rétrécie | Échelle de l'image RoadLayer | Tuée |
| Rotation figée | Placement en caméra tournante | Tuée |
| Route décalée | Position issue de la projection | Tuée |
| Route visible en 3D | Visibilité après bascule | Tuée |
| Texture non libérée | Suppression au changement de circuit | Tuée |
| HUD réécrit sans changement | Affectations par ligne, y compris mise à jour partielle | Tuée |
| Budget débranché du compte réel | Enregistreur réel gonflé, puis compteur remplacé par zéro | Tuée |

Le test Graphics couvre aussi les portes de slalom, tremplins, trous, feuilles,
lave et raccourci. Les captures n'ont pas été exécutées ici. Pour les compléter,
contrôler les dangers aux circuits concernés, la largeur du raccourci K01,
les portes de slalom et les tremplins du dernier circuit, en plus du départ.
