# Opencade — spécification des jeux

## Socle

### Characters

Passe 101 : Essaim ajoute les cinq armes de signature déterministes et leurs vaisseaux enrichis ; chiffres, compatibilité et budget dans la section Essaim.

#### Ferraille, Briqueterie et Essaim — passe 84

Boubou, CaliRoux, Pestouille, Tutu et Lumi conservent les héros équipés de la
passe 77. Le `GameCharacter` commun des passes 70–71 dessine les effets au lieu
physique de la décharge, de la balle ou du vaisseau : feuilles, cœurs, flammes,
étoiles et arc-en-ciel. Identité et habillage ne changent aucune règle.

| Jeu | Rôle | Spécial dans le moteur | Limite |
| --- | --- | --- | --- |
| Ferraille | Aventurier armé / pilote de véhicule | **Super-tir** : décharge frontale, rayon inclusif 80, écart vertical ≤32, trois dégâts par cible ; murs opaques, cœur fermé protégé, cages endommagées normalement ; boss exposé : 20 points par PV effectivement retiré (maximum 60) | 600 ticks (10 s), effet visible 18 ticks |
| Briqueterie | Raquette et balle du compagnon | **Balle forte** : la balle courante (ou le prochain lancement si prête) traverse trois briques destructibles sans rebond ; un dégât normal par contact, effets de brique conservés (portail : même sortie, direction sortante et temporisation ; régénérante : un seul dégât et repousse différée ; explosive, clé, multi-balle et attache : déclenchement normal ; angle traversé sans déviation ; mouvement et gravité maintenus) ; solides/verrous toujours bloquants, quatrième brique normale | Une fois par vie ; la perte de la dernière balle recharge |
| Essaim | Pilote du vaisseau | **Bouclier** : aucune perte de vie pendant 120 ticks (2 s), y compris le dégât forcé lors de la perte d'une escorte (l'escorte est perdue, la vie est protégée) ; ne détruit ni ennemi ni projectile | Une fois par vague ; nouvelle vague recharge |

HUD : disponibilité et recharge ; bouton spécial ≥56 px sur l'unique rangée,
et raccourci **C**. Aucune prime de score : seuls les barèmes ordinaires des
collisions restent appliqués. Sauvegardes et anciens états restent acceptés ;
les métadonnées optionnelles n'altèrent pas les empreintes sans spécial.

Essaim réserve les contrôles hors du champ : zone gauche glissable avec
corrections relatives de 60 unités de part et d'autre du centre (flèches au
clavier conservées), tir chargé et spécial à droite. En portrait, rangée de
80 px sous le champ ; en paysage tactile, marges latérales réservées de 124 px.
Le canevas FIT se réduit à l'espace restant, sans masquer vaisseau ni ennemis.
Le tir automatique est actif par défaut, désactivable dans **☰** et mémorisé dans
`arcade-lab:essaim:autofire:v1` ; l'ancienne préférence reste lisible. Le bouton
Tir devient Charge quand le tir automatique est actif. La charge automatique
est relâchée périodiquement ; le bouton permet aussi de la maintenir.

`npm run test:node` inclut `validate-character-games-4.js` : P-02/03/05 sur
états littéraux, bornes, murs, cœur, solides, sérialisation et partition du
pas ; P-04 rejoue 180 campagnes gagnantes enregistrées (30 niveaux × deux modes
× trois jeux). Calibration hors tests dans `record-character-games-4.js` ;
les enregistrements décimaux sont dans `characters-campaigns-4.json`.
P-01 réutilise `validate-action-scenes.js`, qui vérifie les textures des cinq
héros et les vrais appels Graphics des effets à leurs positions physiques.
Les six mutations de moteur et celle du héros toujours Boubou sont rejetées.
Chaque cas de rejeu et le raster ont un seuil littéral de 2 s.
[Résultats, scores avec/sans spécial et lignes des mutations](docs/characters-games-4-validation.json).
Les trois validateurs historiques restent requis : aucun solveur ni témoin
ordinaire n'est remplacé.

Les E2E de `character-finger-4.spec.ts` sont écrits pour l'hôte, **non exécutés
localement** : 390×844, niveaux 1 et 10 pour chaque jeu, état lu avant chaque
intention, prédiction des 150 ms de latence par les pilotes existants, bruit
±12 px, uniquement `Input.dispatchTouchEvent`, sans avancer la scène par crochet.
Essaim utilise deux touchPoints (glisser gauche + spécial droit), et le niveau
10 passe en 844×390. Assertions de non-chevauchement contrôles/champ/vaisseau ;
captures `essaim-controles-portrait`, `essaim-controles-paysage`,
`perso-<jeu>-jeu` et `perso-<jeu>-special` avant ou après la conduite uniquement.
JSON joint : durée, entrées, erreurs de toucher, score et victoire. Un même
scénario Essaim perd sans bouclier et gagne avec lui en temps réel. La répétition
Node couvre les six niveaux avec latence, depuis les commandes de
`characters-finger-4.json` calibrées hors tests par
`record-character-finger-4.js`, sans remplacer ces E2E.

Alunir : l'aide d'alignement ne s'applique qu'après le calcul des collisions,
si le pas est entièrement libre ; aucune correction sur le pas d'atterrissage
ou de mur. U06/U07 sont exécutés par Node depuis leurs corps inchangés.
Traverse : trafic continu renforcé (3,5 px par pas de vignette), raster pur de
2000 dessins, aucune série de neuf pas identiques (600 ms à 15 Hz), ce qui
couvre aussi l'exigence de 36 pas.

#### Dédale, Orbite et Empilo — passe 82

Le choix de l'accueil (Boubou, CaliRoux, Pestouille, Tutu ou Lumi) est consommé
par les trois scènes avec le `GameCharacter` des passes 70–71 et les primitives
communes de la passe 73. Le héros remplace la luciole dans Dédale ; les follets
restent des follets. Il est visible dans la tourelle d'Orbite. Dans Empilo,
le puits occupe x=18…270 et la mascotte x=274…358, sans recouvrir les cellules ;
elle accompagne les déplacements/chutes, célèbre les lignes et commente dans
le HUD. Mouvements réels, impacts, victoire, défaite et dodo en pause/menu pilotent
les poses et expressions. Les cinq identités partagent exactement les règles,
le score et les limites ; feuilles, cœurs, flammes, étoiles et arc-en-ciel sont
uniquement l'habillage procédural du spécial. Aucun asset image.

| Jeu | Spécial déterministe | Limite et recharge |
| --- | --- | --- |
| Dédale | **Lueur**, chemin vers le soleil atteignable le plus proche en nombre de tours, révélé pendant 180 ticks (3 s), y compris dans l'ombre | Une charge par niveau ; aucune recharge au temps ou à la perte d'une vie. Sans soleil atteignable, la charge reste disponible. |
| Orbite | **Rafale**, cadence soutenue doublée : période ordinaire de 11 ticks, période Rafale de 5,5 ticks (intervalles alternés de 5 et 6 ticks, sans perte de fraction) et plafond de projectiles joueurs ×2 pendant 90 ticks (1,5 s) | Une charge par vague ; les projectiles déjà émis finissent leur trajet normalement. |
| Empilo | **Mise de côté**, réserve classique d'une forme, affichée à droite du puits | Une utilisation par pièce posée ; le temps ne recharge pas. Réserve vide : consomme la première suivante et complète l'aperçu depuis le même sac. Réserve pleine : échange sans consommer le sac. |

Lueur recherche avec les mêmes transitions que le solveur : clés, portes,
interrupteurs, grilles cycliques, flèches, glace et portails. Elle ne déplace
personne, ne change ni lumière récoltée, ni vulnérabilité, ni score ; le chemin
est figé lors de l'activation. La réserve restitue la forme dans son orientation
initiale en (3,0), remet à zéro la chute fractionnaire et l'ancrage, puis vérifie
l'apparition : une réserve bloquée perd comme toute apparition bloquée. Elle
ne choisit pas arbitrairement une pièce et ne supprime pas de cristal.

Boutons spéciaux ≥56 px sur la rangée tactile unique ; Empilo conserve six
boutons principaux, la rotation inverse restant au clavier (trois rotations
directes donnent son équivalent au doigt). Raccourcis : Espace pour Lueur,
E pour Rafale, V/Maj gauche pour Mise de côté (Espace reste la chute).
Le HUD affiche les charges et, pour les effets temporisés, les secondes actives.
Les clés de sauvegarde, records, barèmes et déblocages restent inchangés : un
spécial n'ajoute aucun bonus de score. Les snapshots ordinaires d'Orbite et leurs
empreintes historiques sont conservés ; les métadonnées du spécial s'ajoutent
après activation. Les anciens états construits restent acceptés par `loadState`.

`npm run test:node` inclut les validateurs `character-games-3`, `character-scenes-3`,
`character-finger-3` et `empilo`. P-<jeu>-01 à 05 vérifient le vrai dessin des cinq
identités, les états littéraux, les durées/limites et 180 victoires : 30 niveaux
avec et sans spécial pour chaque jeu. Dédale et Orbite réutilisent leurs solutions
historiques ; les nouveaux témoins Empilo et Orbite avec Rafale sont enregistrés
dans `tests/fixtures/characters-campaigns-3.json`, sans recherche longue en test.
`record-character-games-3.js` est réservé à la calibration hors ligne. Chaque
cas est borné par un seuil littéral de 2 s ; les mutations sont chargées en mémoire.
Les résultats, scores et lignes des mutations sont dans
[le rapport passe 82](docs/characters-games-3-validation.json).

`character-finger-3.spec.ts` est écrit pour l'hôte de test, sans exécution locale :
390×844, niveaux 1 et 10, décisions et latence 150 ms, bruit ±12 px, entrées CDP
`Input.dispatchTouchEvent` exclusivement, sans `advance()` côté page. Les pilotes
réutilisent le solveur Dédale et le pilote Orbite ; Empilo utilise la pièce courante et deux aperçus
connus, sans futur tirage. Un cas littéral compare la même chute avec/sans réserve
(défaite/victoire). Les pièces jointes JSON rapportent temps, intentions, touches
manquées et victoire, même en échec. Captures `perso-<jeu>-jeu` après la conduite,
puis `perso-<jeu>-special` dans une présentation séparée hors pilotage ; aucun
screenshot pendant le pilotage. Le validateur Node répète aussi la latence des
pilotes sur les six niveaux ; cela ne remplace pas l'E2E sur l'hôte.

Traverse : véhicules **et rondins** de la vignette défilent continuellement,
indépendamment des attentes, morts et redémarrages. Le contrôle raster pur déjà
présent dans `validate-character-games-2.js` enregistre 2 000 dessins et interdit
toute série de 36 pas sans changement de pixels (pas seulement de l'état moteur).


#### Ferraille, Briqueterie et Essaim — passe 77

Les cinq compagnons utilisent les dessins de `src/characters/arcade-art.ts`,
le cache de la passe 75 (`arcade-phaser.ts`) et l'adaptateur commun
`action-phaser.ts`. Les références restent hors du dépôt : aucun fichier image,
extrait ou conversion n'est utilisé. Les textures sont produites par les dessins
vectoriels au démarrage, puis réutilisées par le gestionnaire de textures du jeu.

- Ferraille : huit poses équipées (face, dos, deux profils, saut, tir, accroupi,
  marche), sac à dos, lunettes et arme ; bambou/baos pour Boubou, feuilles pour
  CaliRoux, feu pour Pestouille, bananes/étoiles pour Tutu, étoiles/arc-en-ciel
  pour Lumi. Le véhicule existant devient char panda, buggy roux, hélico dragon,
  moto Tutu ou jet licorne. Les six tirs et leurs collisions restent ceux du moteur.
- Briqueterie : cinq raquettes avec face/dos/profils, balles à visage ou emblème,
  traînées et trois profondeurs de décor défilant. Chaque tranche de six niveaux
  varie le placement du décor et des particules du compagnon. Les bonus existants
  restent élargissement, multiballe et vie ; leur dessin reprend les emblèmes des
  compagnons. Les portails restent des briques portails, les miroirs des briques
  inclinées ; aucun nouveau pouvoir ni règle de bonus n'est ajouté.
- Essaim : cinq vaisseaux avec face, dos et profils ; les profils suivent
  l'inclinaison, le dos accompagne le retour après un impact. Les six armes
  gardent leurs durées, trajectoires et hitboxes : motifs dans le rayon, ricochets,
  satellites, onde, aimant et charge. Les ennemis conservent leurs silhouettes
  arrondies, contours sombres et explosions à anneaux, éclats et fumée.

Réserves fixes : 224 images pour Ferraille, 160 pour Briqueterie, 256 pour Essaim.
Chaque atlas expose 30 clés ; les neuf emblèmes sont partagés entre compagnons.
Aucune génération de texture pendant le dessin ou le changement de niveau.
Essaim garde ses trois Graphics, deux nébuleuses mises en cache et 96 particules
(quatre anneaux au maximum en mouvement réduit). Les traînées se calculent avec
au plus trois images fantômes, sans historique. Les décors restent moins opaques
que les surfaces de collision, les briques et les menaces ; la raquette conserve
un rail lumineux exactement sur sa surface physique.

Les neuf entrées catalogue remplacent/enrichissent des niveaux réels de la campagne
(positions ci-dessous à partir de 1 ; aucune campagne parallèle) :

| Code | Jeu · position | Nom | Éléments jouables et décor |
| --- | --- | --- | --- |
| R01 | Ferraille · 14 | Jungle mécanique | Tourelles, plateformes mobiles ; trois plans opaques, cabanes, arbres, caisses et machine en feu |
| R02 | Ferraille · 6 | Forteresse oubliée | Montée existante, ascenseur vertical, voie supérieure à bonus existant ; arches, pierres, portes et chaînes |
| R03 | Ferraille · 24 | Usine infernale | Robots blindés, fosses, deux convoyeurs qui entraînent le personnage au sol ; tuyaux, pistons et lave |
| A01 | Briqueterie · 1 | Festin de Boubou | Mur dense de 38 briques alimentaires, bao et bambous |
| A02 | Briqueterie · 18 | Tourbillon d'automne | Rangée mobile, miroirs inclinés et portails ; feuilles |
| A03 | Briqueterie · 15 | Constellations | Étoiles, obstacles indestructibles et portails ; cristaux et liens célestes |
| G01 | Essaim · 7 | Ceinture de bambou | Formation en pince, mines ; astéroïdes verts et étoiles défilantes |
| G02 | Essaim · 9 | Nébuleuse écarlate | Chasseurs rapides, rafales en éventail ; météores et nuages rouges |
| G03 | Essaim · 15 | Royaume des étoiles | Vagues en anneau, gardien à deux phases ; cristaux et nébuleuse violette |

Les surfaces répétables, plateformes, ennemis et tirs restent des données séparées
du décor. La passe 103 remplace les parcours de Ferraille par des séquences écrites ; les éléments du catalogue restent présents :
plateforme à sens unique avec transport vertical, convoyeurs à 24 unités/s lorsque
le personnage touche leur surface ; le saut permet de s'en extraire. Les autres
règles sont conservées. Les sauts, contrôles et collisions sont ceux de Ferraille.

Validation sans navigateur ni Vitest : `validate-action-art.js` vérifie les vues,
l'identité de chaque dessin, le cache au redémarrage et la saturation des réserves ;
`validate-action-scenes.js` instancie les quinze couples jeu/compagnon avec les
vrais moteurs et dessins, puis vérifie chargements, tirs, budgets et nettoyage
(ports de plateforme simulés, aucune mesure de pixels/GPU). `validate-level-catalogue.js`
vérifie chaque structure et deux rejeux gagnants par niveau ; Ferraille a des
empreintes numériques intermédiaires de l'état complet et des entrées ordinaires
enregistrées. Les campagnes Briqueterie et Essaim sont réenregistrées et rejouées
sur deux graines pour les trente niveaux. Chaque nouveau cas est borné à 2 s.
Les scores de diversité restent 11,2 / 18,1 / 16,4, avec 0 % de clones adjacents.
Les formules et seuils du rapport ne changent pas.

E2E **écrits seulement**, dans `tests/e2e/habillage-action.spec.ts`, limite 2 s/cas :
`habillage-ferraille-<id>` montre l'aventurier, son arme et un projectile spécial ;
`habillage-ferraille-<id>-vehicule` montre son véhicule en mouvement et son ricochet ;
`habillage-briqueterie-<id>` montre la raquette, la balle et l'élargissement actif ;
`habillage-essaim-<id>` montre le vaisseau et ses tirs/satellites. Les cinq identités
sont panda, pandaroux, dragon, singe, licorne. `level-catalogue-R01` à `R03` montrent le camp,
l'ascenseur/voie haute et les convoyeurs ; `level-catalogue-A01` à `A03` montrent les trois
grilles en jeu ; `level-catalogue-G01` à `G03` montrent les formations, les météores et la
vague finale avec gardien. Aucun de ces fichiers de capture n'est généré localement.

Résultats de vérification de cette passe : lint, typecheck et build passent.
Les contrôles ciblés passent séparément (18 rejeux catalogue, dessins et quinze
scènes). La suite `test:node` complète exécutée en parallèle des vérifications
statiques échoue sur des plafonds de temps : Dérapage, Orbite, les contrôles
personnages/scènes, Briqueterie, catalogue et Dédale ; total 229,34 s pour une limite
de 180 s. Les seuils restent inchangés. Briqueterie repasse séparément ses 60
rejeux en 821,5 ms ; les neuf cas catalogue repassent séparément en moins de 288 ms
chacun. Ces résultats ne constituent pas une mesure de performance GPU.

Bundle principal (mesure Vite, kB décimaux) : 1 522,46 → 1 538,63 kB ;
gzip 421,44 → 427,12 kB. Rapport : `docs/pass77-validation.json`.

#### Habillages vectoriels — passe 75

Les références de David restent hors du dépôt. Aucun fichier image, extrait ou
conversion des références n'est utilisé. Les dessins sont des descriptions pures
de primitives dans `src/characters/arcade-art.ts`, rendues par les adaptateurs
vectoriels existants. Les noms des jeux restent Dérapage et Bubble Lab.

| Compagnon | Véhicule | Signes distinctifs | Lanceur / Joker |
| --- | --- | --- | --- |
| Boubou | Bolide Bambou | Tubes verts cerclés, roues rondes, panier de fruits | Canon Bambou / Pluie de bao |
| CaliRoux | Chariot Feuille | Bois, grandes feuilles rouges et orange | Lance-feuilles / Feuilles tourbillonnantes |
| Pestouille | Drakart | Rouge, ailerons, cornes dorées, échappements enflammés | Canon Dragon / Explosion draconique |
| Tutu | Carrosse Tutu | Rose, volants de tutu, cœur, nœud | Lanceur Tutu / Danse des bananes |
| Lumi | L'Étoilade | Carrosserie blanche, ailes, bandes arc-en-ciel, étoiles | Canon Étoilé / Arc-en-ciel magique |

Chaque véhicule possède les vues avant, arrière, gauche, droite et dessus ; le
dessus avec pilote visible constitue le kart joué, tourné selon son cap physique.
Le résultat affiche aussi le véhicule et son pilote « en action ». Les cinq vues
du lanceur sont face, dos, gauche, droite et tir ; la vue jouée suit la visée ou
le tir, et son canon articulé suit exactement l'angle physique. Les expressions
concentré, surpris, endormi, heureux et triste restent visibles sur les pilotes.
Sur l'accueil, ouvrir « véhicule et lanceur » sur une carte de personnage permet
d'examiner ses dix vues ; ces dessins sont créés à la première ouverture.

Les bonus conservent intégralement leurs règles. `turbo` et Élan prennent le signe
de propulsion du personnage, `ressort` son emblème, `flaque` son piège (bombe bambou,
feuille, feu, banane ou étoile), et `bulle` son bouclier, cœur ou arc-en-ciel.
Le bonus tenu, le saut, la propulsion, le bouclier et les pièges déposés montrent
ces signes ; un piège garde l'identité de son propriétaire. Le sixième pilote
reste neutre. Les caisses de bonus gardent une silhouette commune contrastée.

Dans Bubble Lab, les six teintes restent identiques pour tous les compagnons.
Chaque bulle porte un emblème thématique et un motif géométrique stable par couleur :
vert/losange feuillu, orange/soleil, rose/cœur, violet/spirale, jaune/étoile,
bleu/éclair. Le contour et le motif sombre contrastent d'au moins 3:1 avec
chaque teinte ; aucune information de visée ne dépend du seul thème. Les pierres,
glaces, bombes et étoiles à libérer passent devant les bulles. Le Joker garde son
unique changement de couleur sur le prochain tir : bao en pluie, feuilles en
spirale, flammes radiales, bananes dansantes ou grand arc-en-ciel sont des effets
visuels uniquement, arrêtés en pause et fixes en mouvement réduit.

Les niveaux 1–6 sont en jungle, 7–12 en forêt d'automne, 13–18 en volcan,
19–24 en cirque et 25–30 dans le ciel avec châteaux et nuages. Le décor atténué
reste sous le plateau sombre, les obstacles, le guide de tir et les projectiles.

Les textures sont générées depuis les primitives à la première utilisation et
appartiennent au gestionnaire du jeu : aucune régénération par image ni par
redémarrage. Les réserves sont fixes : 96 sprites pour Dérapage, 256 pour Bubble
Lab, dont au plus 128 bulles d'effet transitoires ; les sprites sont réutilisés,
masqués à chaque nouveau dessin et détruits à la sortie. Les moteurs sont inchangés.

Validation pure : `nice -n 19 ionice -c3 node scripts/validate-arcade-art.js`
vérifie les cinq véhicules distincts dans chacune des cinq vues, les cinq
lanceurs et leurs vues, les six motifs indépendants des couleurs, le contraste,
les tranches de décors, les réactions et le cache/réemploi borné. Chaque contrôle
est borné à 2 s. Les contrôles de scènes Node existants suivent désormais les
textures réellement soumises, plutôt que les anciennes positions du dessin générique.

Captures E2E écrites dans `tests/e2e/habillage.spec.ts`, sans exécution locale :
`habillage-derapage-<perso>` montre le kart en jeu de dessus avec pilote, roues et
accessoires sur la première piste ; `habillage-bubble-<perso>` montre son lanceur,
les six teintes et motifs, et un décor différent. `<perso>` vaut `panda`,
`pandaroux`, `dragon`, `singe`, `licorne` ; les décors associés sont respectivement
jungle, automne, volcan, cirque et ciel. Chaque nouveau scénario a un plafond de
2 s. Aucun navigateur ni Vitest n'a été lancé pour cette passe.

Mesure du build de production avant/après : JavaScript principal
1 506 147 / 1 522 011 octets, gzip 415 559 / 421 301 octets ; CSS
12 386 octets (gzip 2 993) dans les deux cas. Lint, typecheck et build passent.

#### Intégration jouable — passe 72

Le même `GameCharacter` utilisé en passes 70–71 entre dans Dérapage, Bubble Lab
et Serpentin. Le kart joueur contient le compagnon choisi ; quatre rivaux portent
les quatre autres identités, dans l'ordre du registre, et le dernier pilote est
neutre. Le compagnon tient le lanceur de Bubble Lab et suit sa visée ; sa tête
et sa silhouette reconnaissable mènent Serpentin sur la grille. Joie au podium ou
à la victoire, tristesse après défaite, surprise au choc et dodo en pause/menu
passent par le véritable rendu Graphics partagé, y compris `updatePaused()`.
Les effets existants (feuilles, cœurs, flammes, étoiles, arc-en-ciel) habillent
les mêmes règles pour les cinq identités. Aucun asset image ni nouvelle clé de
sauvegarde. Les scores et records historiques restent comparables et conservés.

| Jeu | Spécial moteur | Limite et réarmement | Commande |
| --- | --- | --- | --- |
| Dérapage | Élan : 800 ms, accélération +8 unités/s² et plafond sur piste +4 ; cumul avec turbo/dérapage/bande, sans remplacer l'objet ; plafond d'herbe inchangé | Une fois par tour, tour initial inclus ; prochain tour ou nouvelle course | Élan ≥56 px, C |
| Bubble Lab | Joker armé : le prochain tir prend la couleur de la première bulle ordinaire/bombe touchée ; pierres, glace et étoiles ne fournissent pas de couleur ; tir au plafond garde sa couleur | Une fois par niveau ; le tir consomme l'armement même sans groupe éligible ; recommencer recharge | Joker ≥56 px, C |
| Serpentin | Esquive armée : ignore exactement le prochain contact avec son corps, sans couper le serpent ni donner de points ; murs/obstacles toujours mortels | Une fois par niveau ; reste armée jusqu'au contact, sans recharge temporelle ; recommencer recharge | Esquive ≥56 px, Espace |

Les trois moteurs exposent `special()` et `advance(ms)`. Leurs snapshots rendent
les charges/armements et durées observables ; dans Dérapage, `specialLap` et
`specialMs` sont propres à chaque kart. Les IA disposent du même élan : elles
l'activent si elles ont deux portes de retard, braquent de moins de 0,12 et
roulent à plus de 16 unités/s, sans nouveau tirage aléatoire. Z36 conserve ses
seuils littéraux : trois tours, arrêt <0,5 s, hors piste <15 %. Les bandes Z36
sont recalibrées car la politique IA change les collisions, puis rejouées.

`scripts/validate-character-games-2.js` couvre P-<jeu>-01 à 05 : géométrie des
cinq identités, effets exacts sur positions littérales, épuisement/réarmement,
équivalence des cinq simulations, 30 niveaux par jeu sans spécial et témoins
avec spécial. Bubble Lab rejoue les solutions historiques inchangées ; les
trajectoires ordinaires de Serpentin et les commandes de Dérapage sont dans
`tests/fixtures/characters-campaigns-2.json` (calibration Node séparée :
`scripts/record-character-games-2.js`). Les mesures avec/sans sont des témoins
reproductibles, pas des optima annoncés. `docs/characters-games-2-validation.json`
contient les scores, tirs, pas, chronos, durées et mutations tuées, fichier/ligne.
Chaque vérification chronométrée garde le seuil littéral de 2000 ms ; les courses
avec et sans élan sont deux vérifications distinctes.

`scripts/validate-character-scenes-2.js` monte les scènes de production avec
seuls les ports de plateforme doublés : entrées tactiles, positions/taille des
acteurs, cinq identités, quatre rivaux, pause via le binding de `main.ts`, joie,
tristesse, surprise et animation du spécial sont vérifiés sans navigateur.
Les trois E2E de `tests/e2e/character-finger-2.spec.ts` sont écrits pour l'hôte,
390×844, CDP tactile exclusivement, bruit ±12 px et latence 150 ms, niveaux 1
et 10, captures `perso-<jeu>-jeu` et `perso-<jeu>-special`, bilan JSON comprenant
entrées, décisions, erreurs de toucher, temps et victoire. Dérapage et Bubble
utilisent le temps réel, ainsi que Serpentin : le pilote observe toutes les 150 ms,
anticipe les virages d'une case et met leur sortie en file lorsque nécessaire.
Aucun appel à `advance`, aucune modification de vitesse ; victoire exigée en moins
de 90 s par niveau. Le délai de 150 ms est celui entre observations, sans second
délai ajouté entre décision et toucher. Aucun résultat navigateur n'est présumé.

La vignette Traverse dessine un trafic routier continu, indépendant des attentes
et redémarrages du traverseur. Une preuve pure rastérise et compare les pixels
sur 2000 pas : aucune fenêtre de 36 pas identique. Le mode mouvement réduit garde
volontairement une image fixe selon le contrat commun des vignettes.

#### Intégration jouable — passe 70

Le choix enregistré sur l'accueil est le héros physique de Caisses, Traverse et
Alunir, dessiné par `src/characters/game.ts` et l'adaptateur Graphics. Aucun asset
image. Profil orienté pour les déplacements latéraux, face pour les autres ;
marche dans Caisses, saut dans Traverse et à la poussée dans Alunir. Joie et
célébration à la victoire, surprise pendant 350–500 ms après choc, tristesse à
la défaite, dodo en pause/menu. Le mouvement réduit conserve les poses et retire
les particules. Feuilles, cœurs, flammes, étoiles et arc-en-ciel habillent le même
spécial : l'identité n'entre jamais dans les règles, le score ou les solveurs.
Les sauvegardes et la clé du choix du personnage restent inchangées.

Les moteurs exposent `special()`, `advance(ms)` (alias du pas déterministe),
les charges restantes et la durée active dans `snapshot()`. Les contrôles ont un
bouton spécial de 56 px minimum dans la rangée tactile et le raccourci Espace.
Les formules historiques de score et les témoins sans spécial sont conservés.
`scripts/validate-character-games.js` exécute P-<jeu>-01 à 05 sans navigateur
ni Vitest : géométrie réellement envoyée à Graphics pour chaque identité, états
littéraux, limites, 30 niveaux rejoués par jeu et égalité des cinq identités.
Chaque contrôle est borné à 2 s ; les recherches longues sont calibrées hors
ligne par `scripts/record-character-games.js`, puis rejouées depuis
`tests/fixtures/characters-campaigns.json`. Les mutants sont importés en mémoire,
sans modifier les sources de travail. Rapport détaillé : [passe 70](docs/pass70.md).

`tests/e2e/character-finger.spec.ts` contient trois scénarios mobiles 390×844,
niveaux 1 et 10 complets, bruit entier déterministe ±12 px, décisions et latence
150 ms. Seuls les paquets CDP `Input.dispatchTouchEvent` produisent les entrées,
y compris Jouer. Les crochets lisent/chargent les niveaux et avancent l'horloge,
sans injecter de commande ni de victoire. Le pilote utilise A*/BFS ou le pilote
physique Alunir ; il emploie le spécial dans chacun des deux niveaux. Les pièces
jointes JSON contiennent temps, points, intentions, touches manquées et victoire,
même en cas d'échec. Captures `perso-<jeu>-jeu`, `perso-<jeu>-special` et alias
incluant l'identité. Ces E2E sont écrits seulement : leur exécution et la revue
visuelle sur mobile appartiennent à l'hôte de test.


Measured minified JavaScript in dist/assets: 1,459,946 bytes before, 1,473,143 bytes after (+13,197 bytes; below the 40 kB target). The Phaser adapter now renders the playable heroes in Caisses, Traverse and Alunir; the home shell keeps its Canvas adapter.

Pass 59 establishes five original recurring companions and a home selector; game
selection is consumed by Caisses, Traverse and Alunir since pass 70. No image assets or new dependencies.
The rounded cast has large expressive eyes, soft dark outlines and individual silhouettes:

| ID | French / English name | Visual signature and special |
| --- | --- | --- |
| `panda` | **Boubou** — Panda glouton — « Manger, foncer, recommencer ! » | Round black-and-white body, eye patches, bamboo, woven bun/fruit basket; spiral green leaves |
| `pandaroux` | **CaliRoux** — Panda roux joueur et câlin — « Des câlins et des dérapages ! » | Orange fur, white mask/ear borders, dark paws, striped fluffy tail; rolling spin, trail and hearts |
| `dragon` | **Pestouille** — Dragon assidu — « Toujours plus loin, toujours plus fort ! » | Red body, cream belly, curled gold horns, mint wings/crest, gold eyes, open book; fire and blue geometric rune circle |
| `singe` | **Tutu** — Singe en tutu — « Des pirouettes plein la piste ! » | Brown fur, rosy beige face/ears, pink ruffled tutu, slippers and flower, curled tail; pirouette, pink ring and gold stars |
| `licorne` | **Lumi** — Licorne joueuse — « La magie au service de la victoire ! » | White coat, six-color mane/tail, twisted gold horn, gold hooves, blue eyes; rainbow and shooting star |

`src/characters/model.ts` is a pure deterministic primitive-list generator on a
240 × 240 stage. `drawList(id, pose, expression, anim, t, motion)` accepts milliseconds;
poses are `face`, `profil`, `dos`; expressions are `joie`, `surprise`, `concentre`,
`triste`, `dodo`; animations are `repos`, `marche`, `saut`, `celebration`, `special`.
The optional final argument is `full` (default) or `reduce`. Reduce fixes the pose,
ignores time and omits all special particles. Non-finite times resolve to zero.
Array order is drawing order. Primitives carry fill, stroke and width and support
ellipses, circles, cubic Bézier paths, polygons and lines.

`canvas.ts` and `phaser.ts` export `renderCharacter(target, list, x, y, height)`;
coordinates describe the top left of the square stage. Both read the same list
without mutating it. Strokes retain a minimum 0.75 destination pixel at small sizes.
The first uses native vector paths; the second tessellates
curves at destination resolution into Graphics geometry and never creates a texture.
The Graphics adapter does not clear its target; callers own clearing and lifecycle.
Pass a 32 px stage for a small icon or larger stages for review; never upscale a bitmap.

The home header's **Personnage** button shows the selected head. Its native modal
dialog provides five idle previews, special animation on pointer/focus interaction,
48 px selection/close targets, visible focus, Escape dismissal, modal keyboard
navigation and focus restoration. Touch scrolling remains available over previews.
The loop runs at most 15 fps, suspends when hidden, stops when closed or leaving
home, and reacts live to `prefers-reduced-motion`.
`selectedCharacter()` and `others(id)` are available from `src/characters/index.ts`.
`others` returns the four other IDs in registry order. Selection writes only
`arcade-lab:character:v1`; missing/unknown values default to `panda` and existing
progress/sound keys are untouched. Names expose `fr` and `en`; the current shell
has no language selector and displays French.

| ID | Evidence |
| --- | --- |
| C01 | Deterministic, finite, nonempty drawings for all 375 combinations, split into five short tests |
| C02 | Five distinct primitive counts, pairwise RGB accent distance > 75, distinct orientations/expressions and stable others |
| C03 | All five animations change between 0 and 300 ms; every reduced pose/expression remains fixed and particle-free |
| C04 | Exact literal storage key, defaults, corrupt values, all five choices, isolated existing saves and storage exceptions |
| C05 | Source contains none of the four forbidden presentation terms; ESLint also applies pure-engine restrictions |
| C06 | Both adapters consume every paint operation at 32, 160 and 480 px without changing the source list |

Run `nice -n 19 ionice -c3 node scripts/validate-characters.js` for the same checks
without Vitest and three in-memory source mutations (ignored time, duplicate accent,
changed storage key). It reports their file/line and rejects each. Each individual
unit check has a literal 2000 ms budget in that validator.
`tests/e2e/characters.spec.ts` is enabled for both desktop and mobile. It checks
real choices/reloads, pixel changes within 600 ms, console errors through the shared
fixture, keyboard dismissal/focus, 48 px targets and reduced motion. With `?test=1`,
the panel also contains read-only review sheets. The E2E exports `characters-panel`
and `character-<id>-poses` / `character-<id>-expressions` at 240 px stage height.
The review must still judge recognizability at 32 px, originality, expressive quality,
profile/back anatomy and consistency between the two rendering backends.

### Vignettes

Chaque entrée du registre fournit `demo(seed)` et `thumbnail(seed)`. Les huit
politiques pures `engines/<id>/demo.ts` utilisent le niveau 3, une graine fixe
et les entrées ordinaires ; elles redémarrent après victoire, défaite ou 300 pas
(20 secondes). Aucun changement des règles, aucune ressource externe.
Les rendus `games/<id>/thumbnail.ts` dessinent l’état réel simplifié en Canvas
2D, sans instance Phaser sur l’accueil. Dimensions 160×120 CSS, DPR borné à 2,
au plus 15 images/s et un pas de 1000/15 ms par image, sans rattrapage.
Le contrôleur injectable `shell/thumbnails.ts` attend IntersectionObserver,
suspend hors écran et en arrière-plan, puis libère rappels et observateurs à
la sortie de l’accueil. La préférence reduce produit une seule image fixe.
La grille garde deux colonnes à 390 px, sans défilement horizontal.
Avec `?test=1`, `window.__ARCADE_TEST__.thumbnails()` renvoie une copie des
compteurs d’images par identifiant, conservés à la sortie et cumulés au retour.

| ID | Preuve |
| --- | --- |
| V01 | Huit fabriques, dessin déterministe sur faux contexte 2D |
| V02 | 2000 pas, état évolutif, redémarrage après fin et délai |
| V03 | Horloge/observateur injectés, suspension et nettoyage complet |
| V04–V05 | Huit canvas non vides, pixels animés en 600 ms |
| V06 | Reduce : pixels et compteur fixes après première image |
| V07 | Compteurs figés en jeu et relancés au retour |
| V08 | Mobile 390×844 : deux colonnes, largeur ≥140 px, aucun scroll horizontal |

### Appareil

`src/shell/device.ts` isole les API facultatives derrière des ports injectables.
Le Wake Lock écran est demandé au début du jeu actif, puis relâché en pause,
menu ouvert, sélection de niveaux, panneau de fin, sortie ou page masquée.
Une autorisation tardive après la pause est aussitôt relâchée ; une reprise
visible redemande le verrou. Aucun verrou pendant « Prêt ? ».
Les événements de présentation déclenchent 30 ms à la perte de vie,
[30, 40, 60] ms à la victoire et [60, 40, 60] ms à la défaite, uniquement
si le son global est activé, indépendamment du déverrouillage audio.
Le menu mobile propose « Plein écran » si la méthode existe ; après accord,
il tente le portrait. Absence, exception et rejet de ces API restent silencieux.
Sur l’aire et les contrôles, sélection, menu contextuel, callout et surlignage
tactile sont bloqués. Un toucher dans l’aire à « Prêt ? » démarre au relâchement ;
sa séquence est consommée sans action moteur. Le clavier et la souris gardent
leur comportement. Aucun changement de hauteur logique.


Accueil `#/` (également `#home`), carte accessible par jeu livré, titre de page
Opencade. Le registre `src/games/registry.ts` associe identifiant, nom, nombre
de niveaux, fabrique de scène, effets nommés et contrôles tactiles. Ajouter une
entrée suffit à enregistrer une scène qui respecte les services du socle.
Une URL `#/<id>` ouvre le jeu ; un identifiant inconnu revient à l’accueil.
La navigation conserve l’historique navigateur.

Chaque sortie détruit Phaser avec son canevas. La scène retire ses écouteurs DOM
par AbortController, ses écouteurs tactiles et le crochet Bubble ; le son coupe
les voix actives. Une nouvelle entrée crée une instance propre, sans boucle
conservée en arrière-plan. Le service son global garde son contexte déverrouillé.

Les modules `src/shell/` fournissent entrées, boutons tactiles, sélecteur, panneaux,
progression générique paramétrée par le nombre de niveaux, sauvegarde et son.
Les moteurs purs sont dans `src/engines/<id>/`, le PRNG dans `shared/random.ts`.
La sauvegarde est isolée sous `arcade-lab:<id>:v1`, le son sous
`arcade-lab:sound:v1`. Les anciennes clés Bubble sont copiées au premier accès
si la nouvelle clé est absente, sans effacer les données anciennes.
Chaque accès est protégé ; corruption et indisponibilité permettent de jouer.

Le portrait 390×844 conserve le canevas et des boutons de 44×44 minimum sans
défilement de page. Touch-action désactive les gestes navigateur dans l’aire de
jeu et ses contrôles ; seul touchmove dans cette aire est annulé. Le glisser
vise via Phaser, les trois boutons tactiles visent et tirent par le vrai moteur.

Avec `?test=1` seulement, `window.__ARCADE_TEST__` expose `open(id)`, `current()`
et `games[id]` (crochets de la scène active). Bubble conserve son contrat existant.
Le crochet typé de chacun des huit jeux expose `advance(ms)` : temps fini,
positif ou nul (sinon `RangeError`), avance synchrone par tranches de 1000/60 ms
et dernier reste, via `engine.step()` et ses accumulateurs habituels. Bubble
utilise son API de vol existante `engine.advance()` sans changer ses règles.
Les entrées maintenues sont lues comme dans la boucle ordinaire. Progression,
sauvegarde, affichage et panneaux sont synchronisés avant le retour, sans frame.
La pause et le sélecteur interdisent l'avance. Dès le premier appel valide,
un drapeau réservé au crochet suspend le temps automatique jusqu'au chargement
d'un nouveau niveau ; les frames continuent de synchroniser l'interface avec
un delta nul, sans doubler le temps simulé. Aucun crochet ni drapeau activable
hors `?test=1`.

Dans les E2E, conserver les vraies entrées du joueur, puis appeler `advance(ms)`
pour les issues lointaines (vol, chute, défaite, victoire, descente). Vérifier
ensuite l'état moteur **et** le panneau ou texte correspondant avec les attentes
courtes ordinaires. Les contrôles, glissers, boutons, pauses et mesures de mise
en page restent en temps réel ; ne pas relever les délais pour attendre le rendu.

Aucune règle ne consulte URL ou crochet. HTML dans index.html ou généré en TS,
CSS dans src/style.css, aucun asset importé, Phaser importé depuis phaser.

| ID | Preuve du socle |
| --- | --- |
| A01 | Accueil, registre non vide/ids uniques, carte clavier, sortie, retour navigateur |
| A02 | Ouverture directe du hash Bubble |
| A03 | Stockage absent, exceptions, corruption, migration, isolation et progression générique |
| A04 | Effet nommé sur faux contexte, coupure, déverrouillage ; son global persistant E2E |
| A05–A06 | Sélecteur verrouillé, panneau et scores communs via Bubble |
| A07 | Portrait 390×844 sans scroll, dimensions des boutons et tir tactile |
| A08 | Aucun crochet sans paramètre test |
| A09 | Parcours de tous les fichiers moteurs et interdiction DOM, Phaser et aléatoire natif |
| A10 | Suite Bubble historique intégrale, assertions conservées |
| A11 | Huit horloges manuelles : regroupement, zéro, temps invalides, absence de double avance et pause/sélecteur |

### Installation et hors connexion

Le build précache HTML, JS (Phaser inclus), CSS, manifeste et icônes via
Workbox generateSW. Aucun cache de données externes ni requête tierce.
Manifeste portrait standalone, couleurs #101827, scope et start_url relatifs.
La version package et l’instant UTC du build sont injectés par `define`, affichés
localement au pied d’accueil et en tête du menu ☰. Le SW est recherché au
lancement, toutes les 30 minutes et au retour au premier plan. `version.json`
est exclu du précache et lu avec `cache: no-store` ; l’hébergement doit aussi
servir ce fichier et `sw.js` avec `Cache-Control: no-store` (ou revalidation).
Un bandeau `status` fermable propose « Mettre à jour » : SKIP_WAITING,
clients.claim, puis rechargement. Le menu propose « Forcer la mise à jour » :
update, activation du worker en attente, sinon désenregistrement puis suppression
exclusive des caches préfixés `opencade-`. Aucun localStorage n’est modifié.
Une confirmation affiche la version réellement chargée après rechargement.
Sans SW enregistré, aucun bandeau ni bouton de mise à jour n’apparaît.
Les tests Vitest couvrent formatage et secours avec API factices.
`tests/pwa-runtime.test.js` exécute le vrai module PWA dans un harnais partagé
avec `scripts/test-pwa.js` : lancement, cadence exacte de 30 minutes, retour au
premier plan, requête de version sans cache HTTP, fermeture et retour du focus
sur l’accueil ou en jeu. `node scripts/check-pwa-mutations.js` exécute les mêmes
corps de tests sans charger Vitest et exige un échec d’assertion pour chacune
des huit mutations rejouées en mémoire ; les versions sans mutation doivent
passer avant et après. Une exception du harnais ne compte pas comme preuve.
Les E2E
`pwa-update.spec.ts` remplacent à origine constante les fichiers v1 par v2,
vérifient bandeau, forçage, secours et sauvegarde conservée. Préparation :
`node scripts/build-pwa-fixture.js` (deux builds dans .pwa-fixtures).
Les PNG originaux représentent une borne lumineuse avec motif dans la zone
sûre maskable. Les clés `arcade-lab:*` et `bubble-lab:*` restent inchangées
afin de conserver la progression. Le stockage local fonctionne hors ligne.
Le crochet `?test=1` reste identique ; le SW y est désactivé sauf si `pwa=1`
est aussi présent pour le parcours E2E hors ligne.

### Contrôles et pause

`GameDefinition.touchControls` contient des `TouchButton` : `id`, `label`,
`ariaLabel`, `size` (44, 56 ou 64), `placement` (left/center/right), `mode`
(tap/hold), `repeatMs` et `repeatDelayMs` optionnels. La scène appelle
`renderTouchControls(inputs, definition.touchControls, action)` ; `action(id,
held)` reçoit true à la pression, false au relâchement d'un hold. Sans
`repeatMs`, le jeu lit cet état maintenu ; avec répétition, il reçoit true après
le délai (300 ms par défaut), puis à chaque intervalle. Pointer capture,
pointercancel et lostpointercapture terminent le maintien ; le clic pointer
est neutralisé. Le clavier peut activer ces boutons accessibles.

`directionalSwipe(inputs, area, emit, threshold=30, repeat=false)` produit up,
down, left ou right après le seuil en pixels écran ; par défaut une seule
émission par geste, ou une émission à chaque nouveau franchissement depuis
le dernier point d'émission. `horizontalDrag(inputs, area, logicalWidth, emit,
offset=0)` convertit x écran vers x logique et borne au terrain ; le décalage
s'exprime en unités logiques. `virtualJoystick(inputs, parent, emit,
diameter=120)` crée un disque de 120 px minimum : null dans la zone morte de
12 px ou au relâchement, secteurs 0–7 dans le sens horaire depuis la droite.
Les helpers utilisent les pointer events et un seul pointeur actif chacun.
`Inputs.dispose()` annule les écouteurs par AbortController, les répétitions
et les éléments générés. Les fonctions pures sont dans `shell/gestures.ts`.

`keyboardHelp` et `touchHelp` sont obligatoires dans le registre ; le socle
choisit l'aide selon le pointeur tactile. `realtime` est obligatoire.
`createScene(session)` reçoit une `PlaySession`, dont `paused` vaut true sur
l'écran prêt et pendant la pause. Les jeux temps réel consultent ce booléen
pour leurs entrées ; le socle bloque aussi leur update Phaser, donc le pas du
moteur. Jouer/Reprendre lance la partie, Pause, P et Échap basculent la pause.
`visibilitychange` met en pause sans reprise automatique au retour. Les jeux
`realtime: false`, dont Bubble, démarrent immédiatement, sans écran prêt ni
pause. La session et ses écouteurs sont remplacés à chaque navigation.

La barre supérieure garde Accueil, titre et son sur une ligne de 48 px.
A07b vérifie une hauteur ≤64 px et un canevas ≥60 % du viewport 390×844.
Les cartes séparent nom et statistiques ; la grille a deux colonnes dès 600 px.

| ID | Preuve ajoutée |
| --- | --- |
| A07b | Barre sur une ligne et hauteur du canevas mobile |
| A11 | Seuil directionnel et quatre directions |
| A12 | Huit secteurs du joystick et zone morte |
| A13 | Conversion écran/logique, décalage et bornes |
| A14 | Répétition hold aux frontières de temps |
| A15 | Machine prêt/jeu/pause, arrière-plan, exemption Bubble |

### Mise en page mobile plein écran

En mode jeu, un pointeur coarse **ou** une largeur <600 px active le socle
mobile : `main` sans padding, hauteur `100dvh` avec repli `100svh`, safe-area
verticales réservées. Le body conserve ses gouttières
`max(16px, env(safe-area-inset-left/right))`. La barre de 44 px contient Accueil,
titre tronqué, Pause (temps réel), Son et ☰ ; chaque cible mesure au moins 44 px.
Le reste accueille l'aire Phaser et une seule rangée tactile de 64 px, boutons
≥56 px répartis entre les deux pouces. Les croix restent horizontales ; les
jeux à glisser conservent leurs gestes principaux. En dessous de 380 px,
Empilo masque la rotation inverse secondaire : trois rotations directes
permettent la même action, sans réduire les cibles ni dépasser les gouttières.

L'apparition de `body.touch` ne change pas cette disposition. Un
`ResizeObserver` sur `#game` rafraîchit l'échelle Phaser à chaque changement
de taille du conteneur ; il est déconnecté à la sortie du jeu.

Le menu rassemble statut, aide, Niveaux et Recommencer. Il suspend l'update,
les entrées de Bubble et les entrées clavier de jeu, sans modifier les moteurs.
Tab/Maj+Tab parcourent le menu et son bouton ; Entrée/Espace activent les
boutons ; Échap ferme et rend le focus à ☰. Fermer restaure l'état prêt,
playing ou paused précédent. Niveaux et Recommencer ferment le menu ; le
sélecteur continue d'utiliser le service commun. Un seul bouton son demeure.
Le score reste dans le HUD des huit canevas.

**Exception Ferraille choisie :** une unique rangée réservée de **120 px**,
joystick 120 px à gauche, Saut et Tir 64 px à droite. Cette alternative à la
superposition conserve les huit directions, les deux actions simultanées et
la visibilité des chutes sous le sol. Aucun contrôle ne recoupe même le
canevas entier, donc ni le héros ni les tuiles jouables. La rangée dépasse
64 px uniquement pour ce jeu ; M01 mesure la hauteur réellement réservée,
M02 vérifie la non-intersection avec toute la zone logique 360×640. Cela
préserve aussi les assertions historiques de Ferraille interdisant tout
chevauchement du canevas.

**Exception Dérapage :** une zone de commandes de **156 px** au plus, sous le canevas : gros bouton Dérapage (≥ 88 px) et bouton Bonus (≥ 56 px) au-dessus, à droite ; joystick absolu 360° au pouce sur toute la zone de jeu, anneau et cap visé visibles. Les commandes ne recouvrent jamais la piste devant le kart (M02).

**Hauteur logique :** FIT 360×640 centré conservé. Les scènes positionnent
terrain, HUD et zones de glisser dans ce repère ; adapter la hauteur demanderait
de reprendre ces conventions propres aux jeux. Aucun moteur n'est modifié.
Essaim et Orbite arrondissent les coordonnées tactiles au pixel logique pour
absorber la perte de précision des événements navigateur avec le FIT fractionnaire
(écart maximal de 0,5 pixel logique). Les coordonnées souris restent continues.
Le bureau conserve ses contrôles et sa mise en page ; seul le socle mobile
masque les informations secondaires derrière le menu.

Les crochets des huit scènes exposent `usefulArea()` en coordonnées logiques
(boîte conservative : tout le canevas), et `hudText()` pour contrôler la
présence du score. Ces informations ne pilotent aucune règle.

| Oracle | Preuve dans `mobile-layout.spec.ts` |
| --- | --- |
| M01 | 8 jeux × 3 fenêtres tactiles, mesures avant puis 1 s après un toucher réel du canevas, stabilité à 1 px près, seuil largeur ≥92 % ou hauteur ≥85 %, JSON et pièce jointe |
| M02 | Conversion de la boîte utile logique en pixels écran, aucune intersection des contrôles, dimensions et gouttières |
| M03 | Hauteur de page ≤viewport+1, deux taps sans zoom, fixture refusant erreur JS/console.error |
| M04 | Menu, aide et statut visibles, snapshot identique après 300 ms, tir Bubble refusé, focus/Échap, Niveaux et Recommencer réels |
| M05 | Assertions historiques conservées ; seul le passage par ☰ est ajouté aux accès mobiles à Niveaux/Recommencer |

Mesures M01 (pixels CSS, puis % largeur / hauteur disponibles ;
Chromium tactile, safe-area nulles) :

| Jeu | 390×844 | 360×640 | 390×600 |
| --- | --- | --- | --- |
| ferraille | 358.00×636.44 (100.0 % / 93.6 %) | 267.75×476.00 (81.6 % / 100.0 %) | 245.25×436.00 (68.5 % / 100.0 %) |
| dedale | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| essaim | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| orbite | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| empilo | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| briqueterie | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| bubble | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| serpentin | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |

## Bubble Lab — règles

Passe 72 : le compagnon choisi tient le lanceur ; Joker et ses preuves suivent le contrat Characters ci-dessus.


## Géométrie et tir

Aire logique 360×640, bulles de rayon 20. La grille comporte 13 rangées indexées
0–12. Les rangées paires ont 9 cellules, les impaires 8, décalées de 20 pixels.
L'espacement vertical est `20 * sqrt(3)`. Deux cellules voisines ont leurs centres
à 40 pixels environ. Au niveau 1, les cinq premières rangées sont remplies au démarrage
(43 bulles) ; les autres motifs sont décrits plus bas. Le lanceur est en (180, 570).

La visée est bornée entre 10° et 170° depuis l’horizontale (±80° depuis le haut). Les flèches
la modifient de 0,08 radian par événement clavier. La souris vise au survol et tire au clic au-dessus de y=555. Au doigt, glisser vise et relâcher tire ; le bouton Tap active « tirer au toucher ». Les boutons fléchés ajustent finement. ⇄ ou X échange la bulle courante et la suivante, sans tirage aléatoire, hors vol. La trajectoire est calculée par intersection rayon /
cercle (distance effective des centres strictement inférieure à 40 × 0,85 = 34 ; une tangence seule ne bloque pas), plafond mobile y=`20 + drops * ROW_STEP` et murs x=20 / x=340. À chaque mur,
la composante horizontale de direction est inversée ; la verticale est conservée.
Les segments analytiques donnent exactement le premier contact, sans sous-pas. Le guide trace ces mêmes segments jusqu’au point d’impact, rebonds compris, et une bulle fantôme cerclée de blanc occupe la cellule que le tir remplira : le doigt qui couvre le lanceur voit toujours où la bulle se fixera. À l’accrochage, la bulle glisse en 90 ms du point d’impact à sa cellule (effet visuel seul).

Accrochage classique (passe 500) : le projectile s'arrête au premier contact, puis se
fixe dans la cellule libre dont le centre est le plus proche du **centre du projectile
arrêté**. Au premier contact, cette cellule touche toujours la bulle heurtée (ou le
plafond) : elle tient par construction, sans filtre. La cellule choisie contient donc le point d'impact : la distance entre ce point et son centre ne
dépasse jamais le rayon de cellule 40/√3 ≈ 23,1 px (20 px mesurés au plus sur 16 740 tirs,
contre 216 tirs hors de leur cellule avec l'ancien classement radial). Un tir rasant sur le
flanc d'une bulle se range à côté d'elle, pas dessous. Au plafond, on choisit la cellule
libre la plus proche de la rangée 0. Les égalités sont départagées par rangée puis
colonne croissantes. Aucune cellule occupée n'est remplacée. Sans place libre,
la partie est perdue. La vitesse logique du projectile est 0,75 pixel/ms.
Le moteur refuse tout nouveau tir pendant le vol : aucune file d'attente.

## Résolution atomique

1. Accrocher la bulle.
2. Parcourir le groupe connecté de sa couleur. À partir de trois bulles, supprimer
   **tout** ce groupe (10 points par bulle).
3. Après une suppression, parcourir les connexions depuis la rangée 0, toutes
   couleurs confondues. Retirer les bulles non reliées (20 points par bulle).
4. Grille vide : victoire. Sinon, bas d’une bulle atteignant la ligne rose y=455 : défaite (y du centre + 20 ≥ 455). Le plafond descend selon l’intervalle du niveau en translatant seulement y ; les indices et le décalage horizontal pair/impair ne changent jamais.
5. Passer à la bulle en attente et tirer la nouvelle couleur du PRNG.

Aucune suppression avec deux bulles. Les connexions sont hexagonales, jamais des
voisinages carrés. Les bulles encore reliées au plafond restent en place. Le score
n'est jamais négatif. Les tirs ne sont plus autorisés après victoire/défaite.
Les animations suivent la résolution sans retarder ou altérer ses règles.

## Déterminisme et redémarrage

PRNG LCG 32 bits (`1664525 * state + 1013904223`, modulo 2^32).
Au démarrage, `next` puis `queued` sont tirées uniformément dans la liste triée
numériquement des couleurs présentes dans la grille (index `floor(random * longueur)`).
Après chaque résolution avec grille non vide, l'ancienne `queued` devient `next` :
si sa couleur a disparu par éclatement ou chute, on la retire d'abord, puis on tire
la nouvelle `queued` dans cette même liste restante. Chaque tirage consomme une
valeur du PRNG. Une grille vidée par un tir gagne sans aucun tirage supplémentaire.
Pour le chargement artificiel d'une grille vide (T01), la palette du niveau sert
de repli ; le scénario reste jouable afin de tester l'accrochage au plafond.
`load(grid, next)` et `setNext` refusent par exception une couleur absente d'une
grille non vide ; sur grille vide ils acceptent seulement la palette du niveau.
La validation précède toute mutation. Aucun mode test ne désactive ces règles.
Graine initiale : 452, celle du niveau 1.
Une même graine et une même suite de tirs résolus donnent les mêmes états
sérialisés. `Recommencer` restaure la grille initiale de la graine courante, le
score, la visée, le compteur de tirs, le générateur et le statut. Il annule le vol
et les effets. Le niveau 1 n'a ni pression temporelle ni descente ; les suivants descendent selon leur intervalle de tirs résolus.

## Traçabilité

| Oracle | Preuve |
| --- | --- |
| T01 | Tir réel sur grille vide : cellule au plafond |
| T02 | Trajectoire : point d'impact, inversion x, conservation y ; tir résolu |
| T03–T05 | Groupes de deux, trois, quatre ; grille et score résultants |
| T06–T07 | Chutes et branches ancrées ; grille résultante |
| T08–T09 | Statuts victoire et défaite après résolution |
| T10 | Snapshot initial restauré en unité et via le bouton HTML en E2E |
| T11 | Deux parties et tirs identiques ; témoin d'une autre graine |
| T12 | Souris, flèches/Espace, toucher : angle et grille lus depuis le moteur |
| T13 | Dimensions mobiles, toucher sur aire et bouton, capture |
| T14 | TypeScript + build Vite, assets relatifs, E2E sur preview de dist |

Cas limites unitaires dédiés : collision entre cellules, tirs près des bords,
grille presque pleine, tirs rapides. Aucun test n'invoque une règle alternative.

### Oracle B-HEX (passe 47)

Les cas B-HEX-01–09 de `tests/bubble-hex.test.ts` utilisent des grilles,
angles et cellules attendues littéraux ; origine (180,570). Ils prouvent dessous,
biais gauche/droite, rebonds gauche/droite, traversée d’un trou, plafond,
rangées impaire puis paire. B-HEX-10 vérifie la réflexion à 1e-9 et les bornes
10°/170°. B-HEX-11 vérifie trois éclatements, une chute, deux bulles ancrées
conservées et 50 points (10 par éclatement, 20 par chute). B-HEX-12 vérifie
la descente au sixième tir, la parité et la défaite à 455. B-HEX-13 vérifie
le déterminisme et l’échange sans consommation du PRNG.
B-HEX-14/15 dans `tests/e2e/game.spec.ts`, sélectionnés sur desktop et mobile,
exercent le vrai pipeline tactile, contrôlent le guide et la cellule (1,4),
puis l’effet de chute et les 50 points ; captures `bubble-aim` et `bubble-drop`.
Ces E2E doivent être exécutés par l’orchestrateur.

Mutations : neutraliser les chutes échoue sur B-HEX-11 ; porter CONTACT_SCALE à 1
échoue sur B-HEX-06 ; multiplier l’angle réfléchi par 1,05 échoue sur B-HEX-10.
B-SNAP (passe 500, `tests/bubble-snap.ts`, partagé Vitest et Node) verrouille
l'accrochage : cellule contenant l'impact sur un balayage de 140 angles (pas de 0,02 rad) × 30 niveaux
troués, soit 4 200 tirs, voisine de la bulle touchée, jamais occupée, toujours suspendue ; cas
littéraux du tir rasant, de la parité après rebond et du coin mur-plafond (angle atan(160/550) : un seul
segment, cellule (0,8) ou (0,0)). B-SNAP-04 (E2E mobile) tire 12 fois au doigt bruité : le guide affiché est
la trajectoire complète du moteur, la cellule fantôme est celle remplie. B-SNAP-05 verrouille le glissement de
90 ms, gelé en pause, y compris pour une bulle éclatée à l'arrivée.

## Niveaux de Bubble Lab

Les trente définitions sont des données pures dans `src/engines/bubble/levels.ts`.
Les dix premières définitions et leurs grilles restent identiques. B-LVL-01 compare
chaque cellule, avec dix masques et palettes littéraux dans `tests/bubble-history.ts`,
et vérifie les anciennes sauvegardes. La mutation du masque du niveau 2 est rejetée.

L’extension remplace les trois petits îlots faciles à détacher par des grilles
étagées de 7 à 11 rangées, avec cinq puis six couleurs. Les paires, les décalages
entre rangées, les pierres et les étoiles proches du plafond demandent des coupes
successives. Les descentes interviennent tous les 16, 15, 14 puis 13 tirs résolus,
par tranches de cinq niveaux. Les introductions gardent moins de rangées que les
défis ultérieurs. Les respirations 13, 16, 19, 22 et 28 exigent au moins autant de
tirs que le niveau 5 sur la graine de contrôle.

La graine permute toute la palette et déplace une encoche dans la dernière rangée ;
elle ne se réduit plus à un choix parmi six phases. B-LVL-01 contrôle le déterminisme
et la différence des grilles 10/11 pour chacun des trente niveaux. Les graines par
défaut, 452 à 481, et les clés de sauvegarde sont conservées.

### Catalogue des plateaux de bulles : puzzle de bulles (passe 502)

Trois plateaux du catalogue occupent des niveaux réels de la campagne (pas de campagne parallèle),
choisis sur des niveaux qui ouvrent déjà un chapitre, pour garder la cadence d'introduction
(nouveautés aux niveaux 11, 14, 17, 20, 23 et 26) :

| Code | Niveau | Nom | Jouable | Décor |
| --- | --- | --- | --- | --- |
| P01 | 12 | Jardin gourmand | Quatre couleurs, deux tiges de bambou à nœuds, feuillage, un bao : grands groupes simples (moyenne ≥ 2 × niveau 11, aucun groupe < 4), aucun obstacle | Bambous, bao sur la terrasse |
| P02 | 20 | Automne enchanté | Quatre **verrous** (règle de la glace à une couche : un éclatement voisin les ouvre) et trois **feuilles** | Toit de temple, lanternes |
| P03 | 26 | Cristaux célestes | Trois **cristaux** fixes, trois **prismes**, deux bombes, barres dorées : réactions en chaîne | Constellation, fond étoilé |

Règles nouvelles (moteur pur, `tests/bubble-catalogue.ts`, partagé Vitest et Node) :
- **Feuille** : bulle de couleur ordinaire ; éclatée (groupe, bombe ou balayage), elle éclate toute sa
  rangée sauf pierres, glace, étoiles et cristaux ; une feuille balayée balaie à son tour (B-CAT-01).
- **Cristal** : fixe, jamais éclaté ni tombé, il ancre ce qui y est suspendu comme la rangée 0 ; il ne
  compte ni pour la victoire (plateau vide hors cristaux) ni pour la défaite (B-CAT-02).
- **Prisme** : joker dans la grille ; il rejoint le groupe de toute couleur et le prolonge ; sa couleur
  n'est jamais distribuée au lanceur (B-CAT-03).
- Chaîne : bombe → feuille → rangée, ou prisme qui complète un groupe contenant une bombe.

B-CAT-04 verrouille les positions et le caractère de chaque plateau ; B-CAT-05 (E2E bureau et mobile)
ouvre chaque plateau, vérifie dans le journal de l'image le décor dessiné et un symbole à l'écran par bulle spéciale, puis capture `level-catalogue-P0x` ; B-CAT-06 gagne P01, P02 et P03 au doigt bruité
(12 px, 150 ms), grille égale au modèle après chaque tir. Graine 28 : 12, 11 et 52 tirs.

| Niveau | Nom | Tirs graine 28 | Tirs moyens, 20 graines | Victoires | Interruptions |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Atelier | 6 | 8.70 | 20/20 (100 %) | 0 |
| 2 | Losange | 16 | 18.50 | 20/20 (100 %) | 0 |
| 3 | Damier | 29 | 23.85 | 20/20 (100 %) | 0 |
| 4 | Pyramide | 11 | 9.85 | 20/20 (100 %) | 0 |
| 5 | Colonnes | 12 | 12.15 | 20/20 (100 %) | 0 |
| 6 | Vagues | 13 | 14.25 | 20/20 (100 %) | 0 |
| 7 | Chevrons | 28 | indisponible | 11/20 (55 %) | 9 |
| 8 | Spirale | 21 | 23.00 | 20/20 (100 %) | 0 |
| 9 | Cristal | 70 | 48.65 | 0/20 (0 %) | 20 |
| 10 | Prisme | 56 | 40.95 | 0/20 (0 %) | 20 |
| 11 | Silex suspendu | 13 | indisponible | 17/20 (85 %) | 3 |
| 12 | Arches de craie | 14 | 15.60 | 20/20 (100 %) | 0 |
| 13 | Halte des lucioles | 16 | 16.80 | 20/20 (100 %) | 0 |
| 14 | Mèches jumelles | 13 | 15.30 | 20/20 (100 %) | 0 |
| 15 | Le grand brasier | 12 | 16.15 | 20/20 (100 %) | 0 |
| 16 | Jardin ajouré | 32 | 22.00 | 20/20 (100 %) | 0 |
| 17 | Iris voyageur | 11 | 14.20 | 20/20 (100 %) | 0 |
| 18 | Éventail des marées | 13 | 18.40 | 20/20 (100 %) | 0 |
| 19 | Clairière calme | 18 | 15.20 | 20/20 (100 %) | 0 |
| 20 | Banquise fendue | 15 | 15.65 | 20/20 (100 %) | 0 |
| 21 | Dentelle polaire | 24 | 16.95 | 20/20 (100 %) | 0 |
| 22 | Le dégel doux | 17 | 19.00 | 20/20 (100 %) | 0 |
| 23 | Constellation captive | 13 | 21.70 | 20/20 (100 %) | 0 |
| 24 | Passerelles du soir | 19 | 26.60 | 20/20 (100 %) | 0 |
| 25 | Le coffre du ciel | 21 | 28.85 | 20/20 (100 %) | 0 |
| 26 | Ricochets de cuivre | 37 | 38.15 | 20/20 (100 %) | 0 |
| 27 | Les trois cloches | 34 | indisponible | 15/20 (75 %) | 5 |
| 28 | Souffle paisible | 34 | indisponible | 1/20 (5 %) | 19 |
| 29 | Couronne des échos | 43 | indisponible | 0/20 (0 %) | 20 |
| 30 | La voûte aux six secrets | 39 | indisponible | 5/20 (25 %) | 15 |


Mesure de passe 49 : 600 essais, graines 0 à 19, plafond de 160 tirs.
Le calcul statistique a duré 1104.60 secondes, soit moins de vingt
minutes. Deux workers persistants sont préchargés ; leur création ne consomme pas
le délai d’un essai mais reste incluse dans le temps total. Le délai est de 2 000 ms
par essai, porté à 30 000 ms pour les niveaux historiques 9 et 10, où la recherche
approfondie est nécessaire. Le JSON est réécrit après chaque résultat terminé.
Il conserve les graines, les interruptions et les tirs réellement mesurés : une
interruption compte comme non-victoire. Les tirs d’un échec interrompu sont ceux de
la tentative gloutonne terminée ; si elle n’a pas terminé, la moyenne est indisponible.
Ces taux mesurent un pilote sous budget, et ne prouvent pas l’impossibilité d’un niveau.
Les tirs ne comptent pas le travail interne des branches de recherche.

### Oracles B-LVL-01–05, passe 49

- B-LVL-01 : dix définitions et toutes les cellules historiques ; sauvegardes ;
  déterminisme et influence des graines pour les trente grilles.
- B-LVL-02 : pierre ; bombe/pierre et chaîne de deux bombes de couleurs différentes ;
  glace locale sur deux éclatements, glace éloignée intacte ; arc-en-ciel aux tirs
  1, 4 et 7, tirs ordinaires intermédiaires ; victoire refusée tant qu’une seconde
  étoile reste captive ; position et réflexion des deux butoirs.
- B-LVL-03 : les cellules réelles fournissent pierre, bombe, glace et étoile ; le
  moteur fournit le tir arc-en-ciel et les butoirs actifs. Le contrôle des clones
  passe trente fois le même index au vrai générateur, constate une seule grille et
  100 % de clones, puis rejette cette campagne par le seuil de clones < 0,2.
- B-LVL-04 : le solveur complet joue les trente niveaux sur la graine 28, sans
  modifier les grilles, les couleurs disponibles ou les règles d’accrochage.
- B-LVL-05 : les moyennes par cinq sont 14.8, 37.6, 13.6, 17.8, 18.8, 37.4. De 11–15 à 26–30,
  elles augmentent strictement ; 26–30 vaut au moins 1,5 fois 1–5. Les seuils et
  les bornes sont des littéraux dans `tests/bubble-campaign.ts`.

Le pilote glouton perd 9 et 10, mais la recherche en faisceau les gagne en
70 et 56 tirs. Les grilles historiques ne sont donc pas
modifiées. Le solveur conserve 279 angles, les échanges de réserve, 64 états par
profondeur et le plafond de 160 tirs. Les caches géométriques évitent des calculs
répétés, avec copies des trajectoires et réassociation de la couleur touchée à la
grille courante ; B-HEX-17 contrôle couleur, isolation des retours, rechargement et
butoirs. La largeur et l’intervalle qualifié d’urgent peuvent être explicités pour
reproduire des recherches ; les valeurs par défaut restent 64 et 6.

**Limite non résolue : B-LVL-04 reste en échec sur le temps.** Les trente victoires
ont demandé 203.75 secondes sur cet hôte, au lieu des moins de dix
secondes exigées. Le seuil et le délai du test n’ont pas été relâchés ; le validateur
sort avec un code non nul après sauvegarde des statistiques. Une suite contenant ce
test ne peut donc pas être annoncée verte. Vitest et Playwright n’ont pas été lancés.

Le validateur Node partage les oracles avec les tests et rejette quinze mutations
en mémoire : quatre de géométrie ; bombe sans explosion ; pierre matchable ; glace
ouverte au premier éclatement ; bombe ne propageant pas à une autre bombe ; pierre
détruite par bombe ; glace éloignée endommagée ; arc-en-ciel à chaque tir ; victoire
avec une étoile encore captive ; butoir droit déplacé ; masque historique du niveau
2 modifié ; glace supprimée du vrai générateur. Le contrôle séparé des clones
vérifie son taux exact avant de rejeter les définitions répétées.

### B-HEX-14 : événements tactiles synthétiques

La scène utilise correctement les coordonnées logiques transformées par le moteur
d’entrée. Le test envoyait des dictionnaires avec seulement `clientX/clientY` ; le
moteur d’entrée lit `pageX/pageY`, qui restaient à zéro lors de la création des
contacts synthétiques. La conversion du zéro depuis le décalage du canvas explique
les angles négatifs différents selon le viewport. Ce n’est pas une erreur de
`devicePixelRatio` dans le jeu.

L’E2E construit maintenant de vrais objets `Touch` et `TouchEvent`, avec les
coordonnées de page incluant le défilement. L’angle attendu reste
0,04995839572194276, sa tolérance reste inchangée. `scripts/bubble-input-check.js`
exécute les méthodes d’entrée et d’échelle réellement installées, sous Node, sur
trois configurations de taille/décalage/défilement ; il reproduit également
l’erreur avec des coordonnées de page nulles. Il ne remplace pas une exécution
navigateur : l’E2E corrigé n’a pas été lancé pendant cette passe.

### Mécaniques

Les nouveautés arrivent à 11 (pierre), 14 (bombe), 17 (arc-en-ciel), 20 (glace),
23 (étoiles) et 26 (butoirs).

- Pierre : exclue des groupes de couleur et des explosions ; tombe seulement détachée.
- Bombe : un groupe de trois l’active ; détruit ses voisins colorés, avec chaînes
  entre bombes de couleurs différentes ; pierres, glaces et étoiles résistent.
- Arc-en-ciel : un tir sur trois à partir du premier adopte la couleur touchée.
- Glace : deux résolutions contenant un éclatement adjacent enlèvent la coque ;
  plusieurs voisins éclatés au même tir ne comptent qu’une fois. La bulle libérée reste.
- Étoiles : insensibles aux couleurs et aux bombes ; toutes doivent tomber. Des
  bulles ordinaires peuvent rester au plafond après la victoire.
- Butoirs : x=100 et x=260, y=290–380 ; réflexion exacte de la direction horizontale.

### Plafond mobile

Chaque tir accepté compte immédiatement dans `shots`, mais seul un tir arrivé
compte dans `resolved`. Après suppression et chutes, une grille non vide descend
au Nième tir résolu, puis à chaque multiple de N. Une victoire évite la descente.
Le décalage `drops` ajoute `drops * ROW_STEP` à la coordonnée verticale de
`center(cell, drops)` et au plafond des trajectoires. Les coordonnées logiques,
la parité et les voisinages ne changent pas : translater tout le réseau conserve
exactement les six voisins et les connexions. La rangée 0 reste attachée au
plafond mobile ; aucune bulle nouvelle n'est ajoutée. La trajectoire et le rendu
utilisent le même décalage. Après résolution et descente, une bulle dont le bas
atteint y=455 provoque la défaite. Le compteur avant descente est dans le canevas
(`—` au niveau 1). Aucun délai réel n'influence la difficulté.

### Progression et sauvegarde

Une victoire ajoute le score du niveau au cumul de la session, débloque le niveau
suivant et affiche le panneau avec les deux scores. « Niveau suivant » conserve
ce cumul. Le dernier niveau affiche « Tous les niveaux réussis ! ».
Une défaite et « Recommencer » restaurent le cumul d'avant le niveau ; le niveau
courant et sa graine sont rejoués, score local remis à zéro. Un nouveau choix de
niveau commence une nouvelle session à cumul nul. Le menu montre les trente niveaux,
avec boutons désactivés et cadenas pour les verrouillés. Il suspend le vol ;
« Fermer » reprend la partie. Sur mobile il occupe temporairement l'aire de jeu,
avec défilement interne et boutons tactiles d'au moins 44 pixels.

`bubble-lab:v1` contient `{ unlocked, best }` : nombre maximal de niveaux
débloqués (1–30) et meilleur cumul entier sûr positif ou nul. La sauvegarde
n'enregistre ni partie en cours ni cumul de session. Après rechargement on repart
au niveau 1, mais le menu conserve déblocages et record. Toute donnée invalide
revient à `{ unlocked: 1, best: 0 }`. Chaque lecture/écriture est protégée par
try/catch dans le module pur `progression.ts`, dont le stockage est injecté.
L'accès à `window.localStorage` est lui aussi protégé dans la présentation ;
aucun stockage n'est nécessaire pour jouer et débloquer en mémoire.

### Crochet et traçabilité complémentaire

Le crochet reste activé seulement par `?test=1`. `loadLevel(index, seed?)` prend un
index **à partir de zéro**, et utilise le même démarrage que le menu et le bouton
suivant. `load` reste le chargeur de scénarios validés pour T01–T14. `read()` ajoute
`level` (index zéro), `drops`, `resolved`, `shotsBeforeDrop` (null sans descente),
`cumulativeScore` et `progression` (`playing`, `won`, `lost`, `complete`). Les règles
ne lisent jamais l'URL ou le crochet. Les snapshots moteur incluent niveau et
descentes ; même niveau, graine et tirs donnent les mêmes états sérialisés.

| Oracle | Preuve |
| --- | --- |
| L01 | Validité des dix niveaux et monotonie des trois paramètres |
| L02 | Génération et parties déterministes, sensibilité à la graine |
| L03 | N−1, vol puis Nième résolution ; translation et trajectoire |
| L04 | Défaite par descente et absence de descente après victoire |
| L05 | Connexions et chutes après déplacement du plafond |
| L06 | Couleurs du PRNG bornées par chaque palette |
| L07 | Déblocage, cumul, défaite, reprise et dernier niveau |
| L08–L09 | Stockage absent, exceptions, corruption, bornes, aller-retour |
| L10 | E2E desktop/mobile : victoire, suivant, reload et choix déverrouillé |
| L11 | E2E desktop/mobile : vraie entrée de défaite puis reprise avec cumul |
| L12 | E2E desktop/mobile : stockage interdit, niveau avancé et tir réel |

L13 complète la couverture E2E desktop/mobile : fin au dernier niveau, absence de
bouton suivant, déblocage en mémoire même si l'accès à localStorage lève.

### Traçabilité des propositions de couleur

| ID | Preuve |
| --- | --- |
| C01 | Une/deux couleurs, 200 résolutions pour chacune des quatre graines |
| C02–C03 | Couleurs disparues par éclatement/chute retirées des deux propositions |
| C04 | Même graine et tirs : mêmes snapshots ; autre graine : témoin différent |
| C05 | Propositions présentes au démarrage de chaque niveau, graine initiale harmonisée |
| C06 | Chargement/crochet stricts, repli vide, victoire sans tirage |
| L14 | Desktop/mobile : six tirs réels, défaite par descente, panneau et capture |

Les panneaux de résultat ont une hauteur selon leur contenu et sont centrés dans
l'aire de jeu, avec largeur et hauteur maximales ; le choix des niveaux reste plus large.

## Son

Synthèse WebAudio originale, sans fichier audio et sans dépendance ajoutée.
Un oscillateur sinusoïdal par groupe éclaté : fréquence initiale
`420 + 35 × clamp(taille − 3, 0, 9)` Hz, donc 420–735 Hz ; descente à 55 %
en 90 ms. Une chute produit un seul oscillateur triangulaire à 150 Hz par
résolution, quelle que soit la quantité détachée, pendant 160 ms. Enveloppes
avec attaque de 5 ms, gain maximal 0,12 puis extinction exponentielle.

Le bouton HTML `#sound` annonce « Son activé » ou « Son coupé » et expose
`aria-pressed` (true = actif). Clic, Entrée et Espace fonctionnent ; ces touches
sur un bouton ne tirent pas dans le jeu. La coupure annule aussi les enveloppes
actives. Clé indépendante `bubble-lab:sound:v1` : `on`/`off`, actif par défaut.
Chaque accès au stockage est protégé, stockage indisponible = état en mémoire.

Le service `src/game/sound.ts` reçoit une fabrique de contexte injectée.
Aucun contexte n'est créé/repris avant une interaction pointerdown, keydown ou
clic ; un contexte coupé n'est pas déverrouillé. Une interaction ultérieure
permet de retenter un échec. L'absence de WebAudio (y compris le préfixe webkit),
les erreurs de construction, de resume et de nœuds restent silencieuses ; le jeu
continue. Aucun événement sonore n'est rejoué rétroactivement. La scène appelle
le service une fois pour chaque Resolution, sans modifier le moteur pur.
Tout est en TypeScript, compatible avec Phaser externe et un bundle unique.

| ID | Preuve son |
| --- | --- |
| S01 | Faux contexte : aucun contexte avant unlock, un pop par groupe |
| S02 | Fréquences différentes selon taille et bornes 420–735 Hz |
| S03 | Une chute par résolution, fréquence plus grave |
| S04 | Aucun son coupé, persistance et stockage qui lève |
| S05 | Fabrique absente/qui lève, resume rejeté, nœuds qui lèvent |
| S06 | E2E desktop/mobile : clic, clavier, aria, reload, éclatements actif/coupé |
| S07 | E2E desktop/mobile : WebAudio absent et victoire réelle |

## Serpentin

Passe 72 : le compagnon choisi mène le serpent ; Esquive et ses preuves suivent le contrat Characters ci-dessus.

Grille originale 15×21, départ de trois segments au centre vers la droite.
Une pomme-étincelle ajoute un segment et 10×(index+1) points. Victoire à
l'objectif ; mur, obstacle ou corps : défaite. La queue libérée au même
pas reste traversable, sauf en mangeant. Aucun demi-tour : validation contre
la dernière direction en file. Deux virages maximum sont conservés et
consommés à raison d'un par déplacement (deux déplacements successifs, jamais
un saut diagonal). En tore, les quatre bords sont raccordés.

### Les 30 salles (passe 401)

Les salles sont écrites à la main dans `src/engines/serpentin/levels.ts` ;
`difficulty(i)` en dérive vitesse, objectif, obstacles (barrières écrites +
obstacles tirés), motif, bords et compteurs de mécanismes. Une règle neuve
arrive tous les quatre à cinq niveaux, chaque salle d'introduction est au plus
aussi rapide que la précédente, la salle qui suit chaque défi est plus lente que lui, et les niveaux 5, 10, 15, 20 et 25 sont des
**défis chronométrés** (35, 45, 90, 45 et 70 s ; défaite « Temps écoulé » à zéro).

| Niveau | Nouveauté | Règle exacte |
| --- | --- | --- |
| 1-3 | Murs, rochers, tore | Règles de base ; le tore arrive au 3. |
| 4 | **Portails** | Entrer dans une case de portail place la tête sur l'autre case de la paire, même direction ; la case d'arrivée suit les règles ordinaires (rocher, corps). |
| 8 | **Écluses** | Une écluse est ouverte quand `(ticks + phase) % période < ouverture` ; y entrer fermée est fatal ; elle peut se fermer sous le corps sans effet. Clignote la dernière demi-seconde. |
| 12 | **Luciole** | Tous les N déplacements sans manger, la pomme fait un pas vers une case libre strictement plus éloignée de la tête (distance torique sur tore, tirage PRNG à égalité) ; coincée, elle reste. |
| 16 | **Flèches** | Une tête posée sur une flèche fait son pas suivant dans le sens de la flèche ; la file de virages est gardée pour après ; un virage devenu demi-tour est abandonné. |
| 21 | **Ciseaux** | Dès 10 segments, des ciseaux apparaissent ; les manger ramène le corps à `max(3, ceil(n/2))` et rapporte 5×(niveau) points, sans changer le compte de pommes. |
| 26 | **Sentinelles** | Va-et-vient sur un chemin visible, un pas toutes les `every` avancées du serpent ; entrer sur la sentinelle ou être rejoint par elle est fatal. |
| 30 | Grand final | Écluses, flèches, deux paires de portails, luciole, ciseaux, deux sentinelles. |

Les cases de mécanisme (portails, écluses, flèches, chemins de sentinelle)
ne reçoivent jamais de pomme, de bonus ni d'obstacle tiré ; les cases voisines
d'un portail et la sortie d'une flèche restent libres. Les obstacles tirés
suivent toujours le motif de la salle, sans remise, et chaque ajout exige que
le BFS ordinaire (sans portail) visite toutes les cases libres : aucune zone
n'est accessible seulement par un portail. Empreinte FNV-1a des 30 snapshots
initiaux à graine 454 : `262e7702`.

Preuve de faisabilité : `scripts/record-serpentin.js` enregistre une partie
gagnante du pilote ordinaire (BFS sur les vrais déplacements : portails,
flèches, écluses prévues fermées à l'arrivée, sentinelles évitées, sans
esquive) pour chaque salle, rejouée par `validate-serpentin.js` et
`validate-character-games-2.js` (fixture `tests/fixtures/serpentin-campaign.json`).
Diversité mesurée (`scripts/serpentin-diversity.js`, même méthode que
`docs/diversity.md`) : 62,1 → **20,7**, 0 % de clones, nouveautés aux niveaux
2, 3, 4, 5, 8, 12, 16, 21 et 26, plus long écart sans nouveauté 4. Le test N10
refuse un score au-dessus de 25 et vérifie que 30 salles identiques donnent
100 % de clones.

Les parties temps réel au doigt (`character-finger-2`, `validate-finger`,
`validate-character-snake-policy`) jouent les salles 1 et 14 (luciole,
portails, tore) ; la salle 10 porte désormais des écluses. La capture de 1 s
reste vérifiée sur les salles 1 et 10.

Le cristal apparaît après 10 secondes simulées, puis toutes les 10 à 15
secondes (PRNG). Il expire après 300 ticks, soit 5 secondes, et rapporte
50×(index+1) sans croissance. Il n'apparaît ni sur la pomme, ni sur le serpent,
ni sur les obstacles. Son expiration est traitée avant le déplacement du tick.

`step(dtMs)` conserve le reliquat et exécute des ticks de 1000/60 ms ; un
accumulateur de vitesse déclenche les déplacements. Aucun temps mural dans
le moteur. Le snapshot inclut PRNG, file, compteurs et reliquat normalisé à
10⁻⁸ ms pour éliminer les différences d'arrondi dues au découpage de rendu.
Les entrées sont appliquées aux mêmes instants simulés avant `step`.

### Présentation et services

Route `#/serpentin`, scène Phaser et formes dessinées par code, sons
synthétisés `turn`, `apple`, `crystal`, `won`, `lost`. Un seul bouton son.
Flèches et ZQSD/WASD ; glisser de 20 px sur l'aire avec suivi des virages ;
croix tactile de quatre boutons de 56×56 px sous le canevas. La session
commune affiche Prêt ; toucher Jouer ou Espace/Entrée démarre. Pause par
bouton, P, Échap ou arrière-plan ; moteur et entrées suspendus. Le sélecteur
suspend aussi les déplacements. Progression commune sur 30 niveaux, cumul,
restauration en défaite, meilleur score et clé `arcade-lab:serpentin:v1`.

Le crochet `__ARCADE_TEST__.games.serpentin` est actif uniquement avec
`?test=1` et expose `read`, `loadLevel(index, seed)` et `scenario('finish' |
'wall')`. Les scénarios restaurent une position : sept pommes déjà mangées
et une huitième au-dessus, ou un obstacle au-dessus avec pomme libre ailleurs.
Seule une vraie entrée vers le haut, suivie d'un déplacement ordinaire, peut
produire l'issue. `loadState` ne change aucune règle ni aucun statut final.

### Traçabilité

| Oracle | Preuve moteur `tests/serpentin.test.ts` | E2E `tests/e2e/serpentin.spec.ts` |
| --- | --- | --- |
| N01 | Avance et longueur | Déplacements réels |
| N02 | Demi-tour direct et en file | — |
| N03 | File bornée, deux pas | Clavier / croix tactile |
| N04 | Croissance, score × niveau | Score cumulé 80 |
| N05 | Mur et obstacle | Défaite, capture, rejouer |
| N06 | Corps, queue libérée, queue croissante | — |
| N07 | Quatre bords du tore | — |
| N08 | BFS, graines, génération et renouvellement | — |
| N09 | Avant objectif puis objectif | Victoire, suivant, reprise après reload |
| N10 | Calendrier des règles, défis, respiration, diversité | Capture niveau 30, salles d'introduction |
| N13-N20 | Portails, écluses, flèches, luciole, ciseaux, chrono, sentinelles, cases de mécanisme | — |
| N11 | Graine témoin, snapshots, deux cadences | — |
| N12 | Apparition, expiration, score, longueur | — |

Les deux projets Chromium produisent les captures `serpentin-play-<projet>`,
`serpentin-level30-<projet>`, `serpentin-won-<projet>` et
`serpentin-lost-<projet>.png`. La fixture commune échoue sur pageerror ou
console.error. Mobile : uniquement touchscreen et contacts tactiles réels via Chromium.

## Briqueterie

### Direction visuelle — passes 113 et 116

Les rangées initiales sont projetées entre y=70 et y=400, selon une projection
verticale monotone calculée sur la grille écrite, jamais sur les briques survivantes.
La passe 116 remplace l'habillage de 42 unités, qui se recouvrait sur un pas de 34,
par des corps de **32 unités** centrés sur les collisions de 28×18. Le contour
reste dans le pas logique. Un zoom horizontal de **1,3** agrandit l'aire du mur :
pas affiché 44,2, corps 41,6, soit **41,37 px visibles** en 390×844 avec le FIT
réel (marges latérales de 16 px, bandeau 44 px, commandes 64 px).
Les huit colonnes centrales tiennent intégralement dans le cadrage initial.
Le cadrage haut suit la première balle, borné aux extrémités du terrain ; il
rejoint progressivement la projection horizontale normale entre le bas du mur
et y=574. Balle, bonus et effets suivent cette projection. La raquette et la
zone tactile gardent ainsi toute leur largeur et leurs coordonnées historiques.
Les colonnes périphériques des autres niveaux se découvrent par ce panoramique.

A01 montre des blocs alimentaires jaunes, verts, orange et roses, bao et bambous ;
A02 conserve feuilles, miroirs et portails ; A03 alterne étoiles et cristaux à
facettes, portails et plaques métalliques rivetées. La balle de 24 unités porte
la signature du compagnon : bao, feuille, flamme, cœur ou étoile. Le pool fixe
de 160 images et les textures mises en cache restent réutilisés.

Les quatre grilles concernées sont maintenant densifiées avec des **briques
jouables** : 38 au niveau 1/A01, 44 au niveau 6, 46 au niveau 18/A02 et 40 au
niveau 15/A03. Aucun remplissage décoratif n'entre dans la surface du mur.
Le niveau 6 garde sa raquette de respiration et sa rangée mobile ; A02 garde
coulisse, miroirs et deux portails ; A03 garde portails, repousse, explosions
et quatre indestructibles. Physique et pilote inchangés. Les 60 campagnes
ordinaires (30 niveaux × graines 28/455) sont gagnantes ; les huit rejeux des
quatre grilles modifiées sont réenregistrés et les autres restent identiques.

Mesures Node Boubou, **HEAD de passe 113 → passe 116**. La largeur est la largeur
visible sur la médiane de chaque corps, après découpe au canevas et soustraction
des corps peints ensuite ; le minimum est publié. La surface est l'union raster
des seuls corps de briques, au pas de deux unités, sans compter deux fois les
recouvrements. Le validateur impose directement `wallCoverage >= .30`, pour
les quatre départs et les cinq compagnons, ainsi que l'absence de recouvrement.

| Niveau | Largeur visible minimale (px) | Surface des briques | Couverture dessinée totale | Éléments dessinés |
| --- | --- | --- | --- | --- |
| 1 / A01 | 33,81 → 41,37 | 18,97 → 32,55 % | 61,96 → 69,47 % | 124 → 180 |
| 6 | 33,81 → 41,37 | 13,52 → 31,30 % | 58,83 → 69,48 % | 62 → 112 |
| 18 / A02 | 33,81 → 41,37 | 9,47 → 32,65 % | 55,40 → 69,42 % | 48 → 109 |
| 15 / A03 | 33,81 → 41,37 | 19,13 → 34,30 % | 72,83 → 79,57 % | 87 → 142 |

L'enveloppe vaut 50,27 % à ces quatre départs ; elle est informative et ne
remplace pas la surface pleine. Les mesures de référence sont chargées depuis
HEAD avec ses propres grilles, moteur et projection. Balle : cadre 23,87 px ;
silhouette de Boubou sur la raquette : 19,99 px, inchangés depuis la passe 113.

`validate-briqueterie-scene.js` monte les vraies scènes avec des ports DOM/Phaser
simulés. Il protège aussi les quatre couleurs alimentaires réellement peintes,
les cristaux sur chaque case alternée, les cinq motifs de balle, les snapshots,
le cache et la réserve d'objets. Mutations exécutées et rejetées : repas monochrome,
cristaux absents, briques recouvertes, zoom absent et grille ajourée. La dernière
conserve une grande enveloppe mais échoue sur la surface réelle du mur.

Passe 84 : Balle forte, trois contacts traversants une fois par vie ; contrat Characters ci-dessus.

### Règles et choix

Aire logique 360×640, balle de rayon 6, raquette à y=586 (hauteur 12).
Trois vies. La balle attend sur la raquette avant chaque départ et après une
perte ; tap, Espace ou Lancer la propulse verticalement. Une balle dont le centre
dépasse y=646 est retirée ; une vie est perdue seulement quand la dernière balle
tombe. Zéro vie entraîne la défaite. Toutes les briques destructibles retirées
entraînent la victoire, les briques marquées d'une croix étant indestructibles.
Chaque impact destructible rapporte 10 points, sa destruction 20 supplémentaires.

Le moteur pur utilise des ticks de 1000/60 ms avec reliquat. Les vitesses sont en
pixels/tick. Les entrées `move(x)` et `launch()` s'appliquent avant le pas demandé.
`snapshot()` copie les données, le PRNG, les ticks et le reliquat arrondi à 10⁻⁸ ms.
Même niveau, graine et entrées aux mêmes instants simulés donnent le même état,
quel que soit le découpage d'affichage. `loadState` charge une position construite,
sans produire d'issue ni modifier les règles.

Les collisions recherchent le premier temps de contact sur tout le déplacement :
segments des faces et équations quadratiques pour les coins arrondis (somme du
rectangle et du disque). Le reliquat de déplacement est résolu après réflexion.
Les murs latéraux et le plafond réfléchissent la normale. Sur la raquette,
`angle = clamp((impactX-centre)/(largeur/2), -1, 1) * 60°`, mesuré depuis la
verticale vers le haut. Sur les briques, réflexion selon la normale de face ou de
coin. Les contacts simultanés sont résolus dans un ordre stable. Une limite de
64 contacts par balle et par tick arrête le déplacement résiduel en cas d'état
construit pathologique ; elle ne saute aucun obstacle. Tous les dix rebonds,
la vitesse augmente de 0,2 jusqu'au plafond du niveau (toutes les balles actives).

À chaque destruction, tirage à graine : probabilité de bonus 24 %, puis type
équiprobable. Quatre bonus en chute au maximum ; centre dans [10,350]×[10,560],
aucun recouvrement avec une brique restante ou un autre bonus (carrés de 20 px).
Une tentative impossible est abandonnée, sans recherche ni déplacement caché.
Les bonus descendent de 2 px/tick, se ramassent à la raquette et disparaissent
sous l'aire. Une perte de vie retire les bonus en chute.

| Bonus | Marque | Effet |
| --- | --- | --- |
| Élargir | Trait horizontal turquoise | +36 px pendant 600 ticks (10 s), renouvelé à chaque prise |
| Multi-balle | Trois points violets | Deux balles supplémentaires à ±0,4 rad autour de la première, donc ×3 au premier ramassage ; maximum neuf balles |
| Vie | Plus rose | +1 vie, maximum neuf |

Les plafonds des balles, vies et bonus sont des choix de lisibilité et de stabilité.
Les bonus pris pendant l'attente peuvent élargir ou ajouter une vie ; multi-balle
n’a aucun effet pendant l’attente et ne duplique pas les balles immobiles.

### Trente silhouettes et progression (passe 61)

`src/engines/briqueterie/levels.ts` contient trente dessins de dix colonnes.
Les points sont des trous intentionnels ; chaque autre symbole est une brique
jouable `(11+34*x,64+27*y,28,18)`. Arches, damiers ajourés, spirale ouverte,
îlots et structures suspendues remplacent le remplissage par densité. La graine
(par défaut 455) fixe la phase commune des rangées mobiles et le PRNG des bonus.
La signature du rapport conserve les coordonnées, le type et le caractère solide
du vrai générateur ; les noms, numéros de motif et couleurs sont exclus.

Les vitesses initiales `4+5*i/29`, plafonds `7+6*i/29`, collisions balayées,
trois vies et commandes sont conservés. Les briques ordinaires ont un PV,
les régénérantes deux. `difficulty` expose les comptes réels du dessin ; ils
ne sont plus monotones. La largeur est `92-i`, sauf les respirations
6/11/17/23/27 à 108 pixels. Chaque multiple de cinq est une composition-défi ;
le 30 combine coffre, portails, attaches, gravité et déviateurs.

| Introduction | Symbole | Effet déterministe observé |
| ---: | --- | --- |
| 4 | m | Rangée coulissante : déplacement horizontal commun de `8*sin(tick/45+phase)` px ; viser le futur passage |
| 5 | # | Chicanes indestructibles ; ouvrir une trajectoire autour des écrans |
| 7 | e | À la destruction, un dégât à chaque voisin avec `abs(dx)<=38`, `abs(dy)<=32` ; chaînes possibles, solides préservés |
| 10 | r | Deux PV ; après un impact survivant, repousse au bout de 180 ticks, annulée si finie avant |
| 13 | p | Au contact, sortie sous l'autre portail, vitesse verticale vers le bas ; délai de 20 ticks par balle ; le portail touché est cassable |
| 16 | a | Réflexion selon une normale inclinée `(0.5, ±sqrt(0.75))`, norme de vitesse conservée |
| 19 | k / L | La destruction d'une clé rend destructibles les verrous ; ils empêchent la victoire tant qu'ils restent fermés |
| 22 | b | Deux balles immédiatement ajoutées à ±0,4 rad, maximum neuf ; aucun bonus à ramasser |
| 25 | g | Zone à ±52 px du centre, entre y de la brique et y+160 : accélération verticale de −0,045 px/tick² tant que la source existe |
| 28 | t / h | Casser une attache libère les briques suspendues ; elles descendent de 1 px/tick et se stabilisent à y=370 |

| Niveau | Forme | Mécaniques | Rythme |
| ---: | --- | --- | --- |
| 1 | Festin de Boubou | visée libre | exploration |
| 2 | Arche | visée libre | exploration |
| 3 | Damier | visée libre | exploration |
| 4 | Chevrons mobiles | coulisse | exploration |
| 5 | Chicane | coulisse, chicane | défi |
| 6 | Îlots | coulisse | respiration |
| 7 | Croix creuse | explosion | exploration |
| 8 | Anneaux jumeaux | coulisse, explosion | exploration |
| 9 | Ruban diagonal | explosion | exploration |
| 10 | Couronne | explosion, repousse | défi |
| 11 | Losange ajouré | repousse | respiration |
| 12 | Spirale ouverte | explosion, repousse | exploration |
| 13 | Portes jumelles | coulisse, portails | exploration |
| 14 | Satellites | explosion, portails | exploration |
| 15 | Constellations | explosion, repousse, portails, chicane | défi |
| 16 | Éventail incliné | explosion, angles | exploration |
| 17 | Constellation | angles | respiration |
| 18 | Tourbillon d'automne | briques mobiles, portails, angles | exploration |
| 19 | Coffre | angles, clé, verrous | exploration |
| 20 | Citadelle | explosion, portails, clé, verrous, chicane | défi |
| 21 | Serrure en sablier | coulisse, angles, clé, verrous | exploration |
| 22 | Bouquet triple | explosion, multi-balle | exploration |
| 23 | Trois îles | repousse, multi-balle | respiration |
| 24 | Tresse | explosion, portails, angles, multi-balle | exploration |
| 25 | Puits inversés | angles, chicane, multi-balle, gravité inversée | défi |
| 26 | Vague percée | explosion, portails, gravité inversée | exploration |
| 27 | Balance | multi-balle, gravité inversée | respiration |
| 28 | Lustre suspendu | gravité inversée, attache, suspension | exploration |
| 29 | Pont suspendu | portails, angles, multi-balle, attache, suspension | exploration |
| 30 | Forteresse suspendue | coulisse, explosion, repousse, portails, angles, clé, verrous, chicane, multi-balle, gravité inversée, attache, suspension | final |

Le pilote Node n'utilise que `move` et `launch`, sans injection d'état. Il gagne
les 60 parties (graines 455 et 28), budget 36 000 ticks par tentative ; une
variation de visée déterministe peut être recherchée dans le script, jamais dans
Vitest. Les enregistrements versionnés rejouent les positions de raquette et
vérifient victoire, score, vies et premier tick de chaque effet. Les événements
`moving`, `solid`, `explosive`, `regen`, `portal`, `angle`, `key`, `multi`,
`gravity`, `falling` doivent survenir dans ces parties pour compter dans le
rapport. Aucun symbole configuré seul ne vaut nouveauté.

Mesure inchangée (seuil clone 0,08) : **79,3 → 18,1**, **10** introductions
observées aux niveaux **4/5/7/10/13/16/19/22/25/28**, clones **86,2 % → 0 %**.

### Présentation et socle

Route `#/briqueterie`, scène Phaser Graphics, briques avec points de PV et croix,
bonus avec marques, halo de balle et flash sur brique cassée, bonus et perte.
Les types disposent de couleurs et pictogrammes distincts ; les zones inversées
sont translucides avec flèches montantes. Nom du dessin et légende avant lancement.
Les verrous gardent leur croix, la repousse armée son contour clair.
Effets synthétisés `launch`, `bounce`, `paddle`, `brick`, `bonus`, `life`, `won`,
`lost`, via le bouton son global. Aucune ressource ni dépendance ajoutée.

Souris : suivre x ; doigt : glisser sur toute l'aire, de préférence dans la bande
basse sous la raquette pour ne pas cacher l'action. Deux boutons maintenus de
56 px sous le canevas déplacent aussi la raquette ; bouton central Lancer.
Clavier : flèches ou A/D, Espace. Le socle fournit Prêt, Pause, P/Échap,
pause en arrière-plan, sélecteur, panneaux et Progression sur trente niveaux.
La pause et le sélecteur suspendent le moteur. Le bouton Pause reste dans la
barre, hors du canevas. Sauvegarde isolée `arcade-lab:briqueterie:v1` : déblocage,
record ; cumul conservé après victoire, restauré après défaite.

Le seul changement d'intégration commun est l'entrée `GameDefinition` au registre.
Aucun service `src/shell/*` n'est modifié. Avec `?test=1` seulement,
`__ARCADE_TEST__.games.briqueterie` expose `read`, `loadLevel(index, seed)` et
`scenario('finish'|'fall')` (également via `__BRIQUETERIE_TEST__`). Les scénarios
chargent une seule brique à y=530, balle en attente et trois vies ou une vie.
Le scénario finish exige un lancement réel ; fall exige le lancement puis
l'éloignement de la raquette pour manquer la balle. L'issue vient uniquement du
moteur. Le crochet est retiré quand la scène est détruite.

### Traçabilité de l'oracle

| ID | Preuve moteur `tests/briqueterie.test.ts` | E2E `tests/e2e/briqueterie.spec.ts` |
| --- | --- | --- |
| K01 | Mur et plafond, direction et position | — |
| K02 | Centre et deux extrémités de raquette | Souris, A et maintien tactile, glisser réel |
| K03 | Faces supérieure et latérale, coin arrondi et coin évité | — |
| K04 | Collision au plafond du niveau 30 et à 150 px/tick | — |
| K05 | Deux impacts, PV, destruction et score 40 | Score 30 après dernière brique |
| K06 | Indestructible : rebond, PV et exclusion de la victoire | — |
| K07 | Trois pertes, relance et zéro vie | Défaite par vraie entrée, Rejouer |
| K08 | Dernière brique cassée par déplacement | Lancement, panneau suivant, cumul et sauvegarde |
| K09 | Trois bonus, durée, dernière balle, plafond vie ; apparition saturée/interdite. Statistique longue (8 000 destructions, 16 graines, 22–26 %) déplacée dans le validateur Node | — |
| K10 | Dixième rebond et 300 rebonds plafonnés | — |
| K11 | Trente signatures géométriques distinctes, comptes exacts, bornes et respirations | Captures 04/12/20/30 |
| K12 | Même graine/actions, deux découpages, graine témoin, snapshot isolé | Prêt/pause figés, crochet absent hors test et nettoyage |

La fixture commune échoue sur toute erreur JS ou console.error. Les deux projets
Chromium utilisent un seul worker ; mobile uniquement tap et contacts tactiles
via Chromium (aucun clavier). Assertions de visibilité, absence de scroll,
cibles de 56 px et absence de chevauchement Pause/canevas. Captures écrites dans
`test-results/screenshots/briqueterie-{play,level04,level12,level20,level30,won,lost}-<projet>.png`.

`K-MEC-01…10` : dix dispositions littérales dans `tests/briqueterie-mechanics.ts`.
`K-DIV-01` : nouveautés observées, écarts de cinq niveaux maximum jusqu'au 25,
clones <25 %. `K-PILOT` : deux campagnes enregistrées, sans recherche.
`nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-briqueterie.js`
exécute les mêmes assertions via un adaptateur Node, les campagnes fraîches et
six mutations en mémoire. `briqueterie-validation.json` donne leurs lignes exactes,
les premiers témoins et les durées. Régénération : ajouter `--record`.
Aucun navigateur ni Vitest n'est exécuté sur cette machine. Les sauvegardes de
progression v1 restent compatibles et les anciens états sans type de brique
restent acceptés.

## Empilo

Passe 82 : mascotte à droite du puits et réserve classique ; contrat détaillé dans Characters.

### Règles et choix originaux

Empilo (`empilo`, route `#/empilo`) est une composition de cristaux dans un puits
**9 × 16**. Les silhouettes, palette pastel minérale, facettes en losanges, sons
synthétisés et strates sont générés par code sous MIT. La mécanique générique
de chute et de lignes est conservée ; les dimensions, la collection de tailles
variées et l'habillage sont propres à ce jeu. Aucun habillage ni appellation
commerciale n'est repris. Pas de nouvelle dépendance.

Huit silhouettes sans appellation de lettre, coordonnées `(x,y)` avant rotation :

| Index interne | Cellules |
| --- | --- |
| 0 | (0,0), (1,0), (2,0) |
| 1 | (0,0), (0,1), (1,1) |
| 2 | (0,0), (1,0), (1,1), (2,1) |
| 3 | (0,0), (0,1), (1,1), (2,1) |
| 4 | (0,0), (2,0), (0,1), (1,1), (2,1) |
| 5 | (1,0), (0,1), (1,1), (2,1), (1,2) |
| 6 | (0,0), (0,1), (0,2), (1,2), (2,2) |
| 7 | (0,0), (1,0), (2,0), (3,0), (4,0) |

Deux triominos, deux pièces de quatre cellules, quatre pentominos : il ne s'agit
jamais d'une collection de sept pièces de quatre cellules. La dernière forme
permet réellement l'effacement simultané de cinq lignes après rotation.

Rotation géométrique `(x,y) → (-y,x)` ou `(y,-x)`, puis translation pour ramener
les minima x/y à zéro. Essais horizontaux dans l'ordre **0, −1, +1, −2, +2**,
sans décalage vertical ; échec sans mutation si aucune position n'est libre.
Apparition à `(3,0)`, jamais dans un mur ou un cristal : apparition bloquée =
défaite, sans chercher une autre position ni tirer une autre forme.

Sac mélangé de toutes les formes disponibles, chacune une fois par sac,
Fisher–Yates avec le PRNG partagé. Trois suivantes toujours visibles ; le sac
est consommé par l'apparition puis les trois aperçus. La graine par défaut est
456. Toute nouvelle partie reconstruit le sac et les gravats à cette graine.

Pas fixes de `1000/60 ms`, accumulation du temps et de la gravité fractionnaire.
Une pièce au sol se verrouille après 500 ms cumulés au sol (le tick qui atteint
le sol compte). Un déplacement ou une rotation **réussis depuis le sol** remet
ce temps à zéro, au plus quinze fois par pièce. Les échecs et la descente douce
ne le réinitialisent pas. Au-delà du plafond, le temps déjà passé au sol reste
acquis même si la pièce quitte un rebord ; le compteur reprend au prochain
contact. La chute instantanée verrouille immédiatement.

Descente douce : +1 par cellule effectivement parcourue ; chute instantanée :
+2 par cellule. Les lignes sans sceau sont retirées simultanément et les rangées
supérieures descendent. Barème pour 1/2/3/4/5 lignes :
**100/300/600/1000/1500 × numéro du niveau** ; au-delà, +600 par ligne
supplémentaire (défense pour les positions construites). Victoire dès que les
lignes effacées atteignent l'objectif ; aucun tirage supplémentaire après victoire.

**Sceaux, choix explicite :** une ligne complète contenant un cristal scellé
n'est pas comptée ni retirée au premier passage. Ses sceaux deviennent des
cristaux ordinaires et ses autres cellules sont vidées ; il faut compléter de
nouveau cette rangée pour l'effacer. Les autres lignes complètes sont traitées
normalement dans le même verrouillage. Un anneau blanc indique un sceau.
Ce choix évite qu'une rangée pleine immuable bloque immédiatement le puits.

### Les 30 strates (passe 402)

Les strates sont écrites à la main dans `src/engines/empilo/levels.ts`
(`STRATA`) ; `difficulty(i)` en recopie les paramètres. Une règle neuve arrive
tous les quatre à cinq niveaux, chaque strate d'introduction tombe au plus aussi
vite que la précédente, la strate qui suit chaque défi tombe plus lentement que lui, la gravité plafonne à 5 cellules/s, et les strates 5,
10, 15, 20 et 25 sont des **défis chronométrés** (60, 110, 100, 110 et 140 s ;
défaite « Temps écoulé » à zéro).

| Strate | Nouveauté | Règle exacte |
| --- | --- | --- |
| 1-3 | Lignes, gravats, sceaux | Règles historiques ; objectif 5 lignes à la strate 1. |
| 4 | **Bombe** | Toutes les `bomb` pièces distribuées, la pièce est une bombe d'une case (identifiant 8). À l'arrivée, elle vide son voisinage 3 × 3, sauf les cadenas, puis les lignes pleines se résolvent ; elle ne compte aucune ligne par elle-même. |
| 8 | **Fouille** | Objectif `gems` : libérer toutes les gemmes. Une gemme est libérée quand sa case disparaît (ligne effacée, ligne scellée, souffle) ; +250×(niveau) points chacune. Les gemmes sont tirées à cinq rangées au plus sous la surface des gravats, et ces strates ont trois trous par rangée de gravats. |
| 12 | **Tapis** | Après chaque pièce posée, chaque rangée-tapis glisse d'une colonne dans son sens, en bouclant ; une flèche dans la marge l'indique. |
| 16 | **Marée** | Toutes les `rise` pièces, le plateau monte d'une rangée et une rangée de gravats à un trou entre par le bas ; si la rangée du haut est occupée, défaite « La marée déborde ». Une jauge sous le puits compte les pièces restantes. |
| 21 | **Cadenas** | Une rangée pleine contenant un cadenas ne s'efface pas. La clé est dans la rangée supérieure des gravats, les cadenas strictement en dessous ; libérer la clé change tous les cadenas en cristaux ordinaires. |
| 26 | **Brouillard** | Une seule pièce suivante est visible. |
| 30 | Le cœur | Fouille, cadenas, bombes, tapis, marée et brouillard. |

Les gravats gardent leur tirage historique (trous tirés de haut en bas, sceau
en colonne `x < sealed`), puis le PRNG place la clé, les cadenas et les gemmes,
toujours sur des cristaux ordinaires. La résolution d'une arrivée est la
fonction pure `settle()`, partagée par le moteur et les politiques de placement ;
le tapis est la fonction pure `slide()`.

Preuve de faisabilité : `scripts/record-empilo.js` cherche, par strate, une
graine où la politique ordinaire de placement (faisceau sur trois pièces,
tapis simulés) gagne avec et sans réserve ; sur les défis, chaque pièce attend
1,5 s de gravité et de chrono réels avant d'être jouée (entrée `wait`).
`validate-character-games-3.js` rejoue les deux parties (fixture
`tests/fixtures/empilo-campaign.json`) sous ce chrono. Les répétitions au doigt (150 ms de latence, strates 1 et 10) sont dans
`tests/fixtures/empilo-finger.json`. Diversité mesurée
(`scripts/empilo-diversity.js`) : 59,5 → **18,1**, 0 % de clones, plus long
écart sans nouveauté 4 ; `tests/empilo-campaign.test.ts` refuse un score
au-dessus de 22 et vérifie que 30 strates identiques donnent 100 % de clones.

### Présentation, contrôles et socle

Puits centré, projection translucide de la chute, trois aperçus sous le puits
(pas de 16 unités, cristaux de 14 unités, plus de 12 px rendus en 390×844),
score, lignes, vitesse et signal d'ancrage. Flash de verrouillage/effacement et
effets nommés `move`, `rotate`, `soft`, `drop`, `lock`, `clear`, `won`, `lost`
via le son global. Les cellules sont des cristaux dessinés avec Graphics.

Clavier : ←/→ déplacer, ↓ descente douce, X/W/↑ rotation horaire,
Z/C antihoraire, Espace chute instantanée. Souris : boutons ou tap du puits pour
tourner, glisser pour déplacer/chuter. Au doigt : six boutons de **56 × 56 px**
← → ↻ ↺ ↓ ⤓ sous le canevas, déplacement/descente maintenus ; glisser horizontal
produit un déplacement par tranche de 30 pixels écran ; tap tourne ; glisser
vers le bas de 60 px en moins de 350 ms fait une chute instantanée.
Le doigt peut donc rester entièrement sous le puits.

Prêt, Jouer, Pause/P/Échap et pause arrière-plan proviennent du socle. La pause
et le sélecteur suspendent le moteur. Progression, panneaux, cumul restauré en
défaite, record et déblocage utilisent les services existants, clé isolée
`arcade-lab:empilo:v1`. Aucune modification de `src/shell/*` ni de `src/main.ts` :
une entrée `GameDefinition`, des styles limités à `body.empilo` et l'inclusion
des E2E Empilo dans le projet Chromium desktop suffisent.

Avec `?test=1` uniquement, `__ARCADE_TEST__.games.empilo` (alias
`__EMPILO_TEST__`) expose `read()`, `loadLevel(index,seed?)` et
`scenario('finish'|'blocked')`. Le premier scénario place quatre lignes déjà
comptées et une rangée avec un trou de trois cellules ; le second bloque
l'apparition suivante avec une pièce déjà en bas. Tous deux attendent une vraie
entrée : déplacement/rotation/chute et statuts passent par les règles ordinaires.
`loadState` charge une position, pas un checkpoint de PRNG ; `snapshot` inclut
état, sac, PRNG et accumulateurs et renvoie une copie sérialisable.
Les écouteurs et le crochet sont libérés à la destruction de la scène.

### Traçabilité de l'oracle

| ID | Vitest `tests/empilo.test.ts` | E2E `tests/e2e/empilo.spec.ts` |
| --- | --- | --- |
| E01 | Murs, blocs, refus sans déplacement | Flèches/boutons, glisser 60 px |
| E02 | Rotation inverse, cinq décalages, échec sans mutation | Tap/souris, rotation inverse dédiée |
| E03 | Gravité fixe, 500 ms, 15 remises puis verrouillage | Prêt et pause figés |
| E04 | 1 à 5 lignes simultanées et barème × niveau | Dernière ligne et score au panneau |
| E05 | Douce +1, chute +2, refus au sol | Douce puis chute par geste/bouton/clavier |
| E06 | Trois sacs successifs par graine, 40 graines par palier ; fréquence exacte et premières formes variées | Trois aperçus visibles dans les captures |
| E07 | Apparition bloquée sur 80 graines, pas de substitution ; départ légal | Défaite après chute réelle, Rejouer |
| E08 | Objectif exact et arrêt des entrées après victoire | Victoire, Niveau suivant, cumul, reprise du déblocage/record |
| E09 | 30 niveaux × 20 graines, `holes` trous par rangée, neuf colonnes atteintes | Capture niveau 30 |
| E10 | Première complétion fragilise sans score, seconde efface | Sceaux visibles au niveau 30 |
| E11 | Calendrier des règles, défis, respiration, astuces ; diversité mesurée | Sélecteur de 30 niveaux, strates d'introduction |
| E13-E18 | Bombe, fouille, tapis, marée, cadenas, chrono | — |
| E12 | Entrées horodatées, découpages équivalents, graine témoin, huit formes dont deux seulement de quatre cellules | Crochet absent sans test ; géométrie sans scroll ni chevauchement Pause/canevas |

Les E2E mobile utilisent uniquement taps `touchscreen` et gestes tactiles Chromium,
sans clavier. La fixture existante fait échouer toute erreur JS/console.error.
Huit captures : `test-results/screenshots/empilo-{play,level30,won,lost}-<projet>.png`.
Les mutations murs, délai de verrouillage et sceaux ont chacune été détectées
par E01, E03 et E10 respectivement, puis restaurées avant validation.

## Orbite

Passe 82 : le compagnon pilote la tourelle ; Rafale double le tir pendant 1,5 s, une fois par vague (Characters).

### Règles et choix de jouabilité

Aire logique 360×640. Le canon (y=588) se déplace à 260 px/s entre x=16 et
344. Trois vies, invulnérabilité de 1200 ms après un impact ; les tirs reçus
pendant cette fenêtre sont absorbés. La flotte avance en bloc entre x=12 et
348 (en tenant compte du rayon de sonde 11). Au bord, elle termine son mouvement
contre la limite, descend de 18 px et inverse son sens une seule fois. Sa
vitesse vaut `speed × (1 + 2 × (1 - restantes/initiales))`, jusqu'à presque
3× la vitesse initiale ; la scission ne peut pas réduire cette vitesse sous sa base. Atteindre y=488 avec le bas d'une sonde fait perdre,
indépendamment des vies et avant la résolution des projectiles du pas courant.
Détruire la dernière sonde et le gardien éventuel fait gagner, sauf défaite déjà survenue dans ce pas.

Un tir joueur actif, **deux dès le niveau 15 inclus** (index 14) ; délai de
180 ms entre deux tirs. Espace/Tir maintenu répète les tentatives, sans jamais
outrepasser cette limite. Vitesse des tirs joueurs : 480 px/s. Un impact
consomme le projectile ; une sonde blindée réclame deux impacts et ne rapporte
qu'à sa destruction. Le score vaut `(rows - row) × 10 × numéro du niveau`,
avec `row=0` en haut. Les tirs ennemis sont émis par la sonde géométriquement
la plus basse de la colonne choisie uniformément parmi les colonnes occupées.
Le délai de tir est `1000/fireRate × (0.75 + random.next() × 0.5)` ; au plus
12 tirs ennemis actifs pour l'émission ordinaire, aucune émission si toutes les
colonnes sont vides. Les motifs de gardien et la menace dédiée du satellite
s'ajoutent à cette limite.

Quatre boucliers sont générés à x=28, 108, 208, 288, chacun dans une matrice
11×7 de cellules **4×4 px** à partir de y=488. Coins hauts arrondis par retrait
des cellules extérieures aux deux premières rangées ; arche libre de trois
cellules centrales dans les trois rangées basses. Chaque projectile, joueur
ou ennemi, détruit exactement la première cellule rencontrée et disparaît.
Les collisions balaient le segment vertical du projectile sur chaque pas et
retiennent la première intersection, ce qui évite de sauter les cellules de
4 px. Les boucliers peuvent aussi gêner les tirs du joueur ; les intervalles
entre eux restent libres.

Toutes les 5 s, une tentative de comète a 22 % de chances de réussir. Une seule
comète à la fois, aucune apparition si une sonde empiète sur la voie réservée
(`probe.y - 11 < 78`). Apparition à x=-16 ou 376, y=56, deux sens équiprobables,
vitesse 95 px/s ; retrait au-delà de x=-28 ou 388. Collision joueur :
150×numéro du niveau, une seule fois, sans compter pour la victoire. L'audit Node vérifie 400 graines, les deux sens, les positions interdites,
l'expiration et le score ; le test court rejoue huit apparitions enregistrées.

### Campagne de 30 niveaux — passe 64

Les six formes sont écrites dans `src/engines/orbite/campaign.ts` :
rectangle, chevron, ailes séparées, arche, losange à largeur variable selon la
rangée et couloirs alternés. Les types tactiques et leurs combinaisons sont
fixés par niveau ; la graine conserve le blindage et les délais de tir.
Une formation normale a trois rangées de six sondes ; les gardiens quatre
colonnes. Les respirations 6/11/17/21/26 ont deux rangées et une cadence ennemie
multipliée par 0,6. Elles conservent des abris frais et font travailler une
mécanique isolée. Le nombre et les PV ne comptent jamais comme nouveauté.

La vitesse de base reste `18 + 24*i/29`, la cadence hors respiration
`0.7 + 1.3*i/29`, la vitesse ennemie `145 + 65*i/29` ; le blindage apparaît
au niveau 10 avec probabilité 0,15 puis augmente jusqu'à 0,4. Le second tir reste
au niveau 15. `difficulty` expose les dimensions réellement générées ; les
anciens paramètres de décalage aléatoire sont remplacés par les formes écrites.

| Première apparition | Mécanique et conséquence défensive |
| --- | --- |
| 4 | **Rotors** : arc tournant, bloque pendant 45 ticks sur 120, ouvre pendant 75 ; le projectile est absorbé sans perdre de PV. Attendre le passage de l'ouverture. |
| 7 | **Scindées** : à la destruction, deux fragments à x−14/x+14 et y−8 ; identifiants distincts, un PV, toujours objectifs. Recentrer les tirs. |
| 10 | **Astéroïdes** à (116,330)/(244,370) : rayon de rencontre 24, déviation horizontale −110/+110 px/s, une seule par projectile. Choisir une autre ligne de tir. |
| 13 | **Puits de gravité** à (180,350) : dans la bande verticale ±100, accélération horizontale de `(180-x)*0.012` par tick, vitesse limitée à ±90 px/s. Compenser la courbe, dans les deux camps. |
| 16 | **Furtives** : visibles et vulnérables 95 ticks sur 150, déphasage `id*13`. Attendre le retour plutôt que tirer dans le vide. |
| 19 | **Réparateurs** : tous les 150 ticks, rendent un PV au premier voisin blessé à moins de 110 px, sans dépasser son maximum. Les éliminer en priorité. |
| 22 | **Satellite allié** : quatre PV, y=550, x=`180+sin(ticks/100)*55`. Menace dédiée toutes les 360 ticks tant que des sondes restent ; sa perte termine le niveau. Les tirs du joueur interceptent les tirs ennemis. Après dégagement de la flotte, évacuation et bonus `PV*100*niveau`, avant le duel final éventuel. |
| 25 | **Essaim coordonné** : au déplacement en bloc s'ajoutent `sin(ticks/32+row)*0.35` en x et `cos(ticks/32+column)*0.2` en y. Suivre les courbes de rangée/colonne. |

Les champs modifient aussi les tirs ennemis. Un projectile déjà consommé ne
peut plus intercepter un autre projectile. Les symboles et le HUD indiquent
la règle active : arc de rotor, croix de scission, croix de réparation,
halo furtif, rochers, anneaux de gravité et panneaux du satellite.

**Flotte croissante par chapitre (passe 503, `fleet()`).** La formation ne reste plus à 3×6 : 3×5 aux
niveaux 1-3 pour apprendre, 3×6 jusqu'au 9, 4×6 du 10 au 19, 4×7 du 20 au 28 (le 22, qui ouvre le satellite allié, reste en 4×6 : en 4×7 le pilote
perdait avec la Rafale). Les respirations gardent deux
rangées (7 colonnes à partir du 21), les gardiens trois rangées de quatre escortes, le 29 garde 3×6 (il cumule
déjà essaim, réparateurs et furtives ; plus large ou plus profond, le pilote perd la graine 457) et le gardien
final arrive avec 4×5. Effectifs graine 28 : 15, 15, 15, 18, 12, 12, 18, 18, 18, 12, 12, 24, 24, 24, 12, 24, 12,
24, 24, 12, 14, 24, 28, 28, 12, 14, 28, 28, 18, 20. O-FLEET (`tests/variety-e.ts`, Vitest et Node) verrouille
cette table, la croissance des flottes ordinaires et la tenue dans l'aire de jeu ; deux mutations rejetées.

**Gardiens aux niveaux 5/10/15/20/25/30.** Ils oscillent à y=80, x=
`180+sin(ticks/85)*110`. Les escortes verrouillent le cœur ; ensuite viser
à ±12 px du centre pendant l'ouverture verte (ticks modulo 150 ≥55).
Cinq PV, douze au final ; la coque extérieure absorbe le tir même au vert.
Les motifs respectifs sont double diagonale, visée du canon, éventail triple,
balayage alterné avec tir central, paire tournante, puis éventail de porteuse.
Le boss 30 change à six PV : oscillation de période angulaire 48 au lieu de 85,
émission tous les 72 ticks au lieu de 120, double diagonale et tir visé.
Détruire le gardien rapporte `500*niveau`. L'évacuation alliée ménage une
respiration avant le duel final ; les douze PV, le changement de phase et le
cœur cyclique rendent ce dernier distinct d'une vague ordinaire.

| Niveau | Forme | Mécaniques / rythme |
| ---: | --- | --- |
| 1 | Rectangle | Défense initiale |
| 2 | Chevron | Angles |
| 3 | Ailes | Deux fronts |
| 4 | Arche | Rotors |
| 5 | Losange | Rotors ; gardien double diagonale |
| 6 | Couloirs | Respiration |
| 7 | Chevron | Scindées |
| 8 | Losange | Rotors + scindées |
| 9 | Arche | Scindées |
| 10 | Ailes | Astéroïdes + rotors ; gardien visé |
| 11 | Couloirs | Astéroïdes ; respiration |
| 12 | Rectangle | Astéroïdes + scindées |
| 13 | Arche | Gravité |
| 14 | Ailes | Gravité + rotors |
| 15 | Losange | Gravité + scindées ; gardien éventail |
| 16 | Couloirs | Furtives |
| 17 | Rectangle | Furtives ; respiration |
| 18 | Chevron | Furtives + astéroïdes |
| 19 | Losange | Réparateurs + rotors |
| 20 | Arche | Réparateurs + gravité ; gardien balayage |
| 21 | Couloirs | Réparateurs ; respiration |
| 22 | Ailes | Satellite + scindées |
| 23 | Chevron | Satellite + furtives |
| 24 | Rectangle | Satellite + réparateurs |
| 25 | Couloirs | Essaim + gravité ; gardien tournant |
| 26 | Losange | Essaim ; respiration |
| 27 | Arche | Essaim + rotors |
| 28 | Chevron | Essaim + satellite + astéroïdes |
| 29 | Ailes | Essaim + réparateurs + furtives |
| 30 | Losange | Huit mécaniques ; porteuse en deux phases |

### Contrôles, présentation et intégration

Flèches ou A/D : déplacer ; Espace maintenu : tirer. Souris : guider et clic
dans le canevas, ou boutons dédiés. Au doigt : glisser **dans la moitié basse**
pilote une cible horizontale ; garder le doigt sous le canon laisse l'action
visible. Les flèches 56×56 et **Tir 64×64** restent sous le canevas, Tir à droite.
La case **Tir auto**, dans une cible d'au moins 44 px, mémorise son état via
les services de stockage (`arcade-lab:orbite:options:v1`, valeur on/off).
Les accès restent protégés et le jeu fonctionne sans stockage.

Prêt/Jouer, Pause/P/Échap et pause en arrière-plan sont ceux du socle.
Le sélecteur suspend également la simulation. Panneaux, Progression, cumul,
record, déblocage et sauvegarde `arcade-lab:orbite:v1` restent génériques.
Seule extension de `src/shell/*` : l'union des tailles de TouchButton accepte
64 en plus de 44 et 56, sans changement de comportement des autres jeux.
Registre et styles limités à `body.orbite`, aucune dépendance nouvelle.
Formes Graphics, orbites et particules dessinées par code ; effets nommés
`fire`, `edge`, `shield`, `probe`, `armor`, `life`, `comet`, `bonus`, `won`, `lost`
par le son global unique.

Avec `?test=1` uniquement, `__ARCADE_TEST__.games.orbite` (alias
`__ORBITE_TEST__`) expose `read()`, `loadLevel(index, seed?)` et
`scenario('finish'|'danger')`. Les scénarios chargent une sonde restante ou un
projectile ennemi avec une vie restante, puis attendent un tir ou un déplacement
réel. Ils ne changent aucune règle ni aucun statut final. `loadState` charge
une position, sans restaurer le PRNG ; `snapshot()` copie l'état, les entrées
maintenues, les temporisations, le PRNG et le reliquat. `step(dtMs)` utilise
exclusivement des pas de 1000/60 ms ; mêmes entrées horodatées et même graine
produisent les mêmes snapshots, même avec des découpages d'affichage différents.

### Traçabilité de l'oracle

| ID | Vitest `tests/orbite.test.ts` | E2E `tests/e2e/orbite.spec.ts` |
| --- | --- | --- |
| V01 | Deux bords, mouvement en bloc, descente unique, inversion, canon borné | Flèches/A, souris, glisser bas et exclusion du glisser haut |
| V02 | Vitesse relative et déplacement effectif avec 3, 2 puis 1 sonde | Flotte visible |
| V03 | Un puis deux tirs au niveau 15, délai, sortie écran | Tir réel et tir auto après reprise |
| V04 | Collision, première sonde rencontrée, score pour les trois rangées | Tir final et score au panneau |
| V05 | Émetteur bas dans les colonnes occupées, délai à graine, plafond 12 | Projectiles visibles |
| V06 | Quatre boucliers, grille 4 px, première cellule érodée dans les deux sens | Boucliers visibles dans les captures |
| V07 | Vies, invulnérabilité, arrêt à zéro, invasion prioritaire | Guidage vers un tir, défaite, Rejouer |
| V08 | Dernière sonde et arrêt après victoire | Victoire, Niveau suivant, cumul et déblocage/record après reload |
| V09 | Fréquence, sens, saturation, exclusion, traversée, bonus unique | Rendu de comète en jeu normal |
| V10 | Deux impacts, score final, seuil et fréquence du blindage | Capture niveau 30 |
| V11 | Formes écrites légales, six géométries, cadence réduite des respirations | 30 entrées dans le sélecteur |
| V12 | Entrées horodatées, découpages équivalents, témoin de graine, copie sérialisable | Prêt/pause figés, option persistée, crochet absent sans test et nettoyé à la sortie |

Les E2E mobile utilisent exclusivement des taps et gestes tactiles Chromium,
sans clavier. Assertions de géométrie pour Pause, Son, flèches, Tir, option,
Niveaux et Recommencer : aucune intersection avec le canevas, cibles visibles
dans le viewport, pas de scroll. La fixture commune échoue sur toute erreur JS
ou console.error. Captures écrites pour `orbite-level04`, `orbite-level12`,
`orbite-level20`, `orbite-level30` sur les projets desktop/mobile, ainsi que
les captures de victoire et défaite. Aucune exécution de navigateur pour la passe 64.

**O-MEC-01…08** : un oracle littéral par mécanique dans
`tests/orbite-behavior.ts`, exposé individuellement dans
`tests/orbite-mechanics.test.ts`. **O-BOSS** vérifie verrou, coque, cœur et phases.
**O-SAVE** charge une position ancienne sans aucun champ optionnel.
**O-PILOT** : 60 tests indépendants, chacun rejoue un enregistrement de
`tests/orbite-solutions.ts`, sans lancer le pilote ; formation, événements,
premiers témoins, statut terminal et empreinte du snapshot doivent correspondre.
**O-DIV-01** agrège les inventaires ainsi vérifiés : au moins sept nouveautés,
écarts ≤5 jusqu'au 25 et clones <25 %. Les campagnes longues et la distribution
des comètes restent exclusivement dans les scripts Node.

Validation : `nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-orbite.js`
(ajouter `--record` pour régénérer les enregistrements).
Le script gagne les 30 niveaux sur 457 et 28 par commandes publiques,
compare les enregistrements aux parties fraîches, exécute les oracles avec un
adaptateur d'assertions Node (sans charger Vitest) et exige moins de 2000 ms
pour chaque test sur deux CPU. `docs/orbite-validation.json` conserve les temps,
les témoins et onze mutations rejetées : huit mécaniques, phase/coeur du boss,
puis tous les niveaux égaux au premier (100 % de clones, oracle rejeté).
Les clés de progression et de tir auto sont inchangées ; les champs moteur
ajoutés sont optionnels pour conserver les anciennes positions.

## Essaim

### Signatures et graphismes — passes 101–102

Le maintien manuel du bouton droit de l'interface (Tir/Charge) ou d'Espace pendant **300 ms minimum**, puis le relâchement, lance la signature du personnage choisi, sans caisse requise. La jauge normalisée est **0…1**, pleine à **1500 ms** ; le seuil de déclenchement est 0,2. Un maintien bref conserve le tir principal. La recharge commune est **8000 ms**, à compter du lancement ; une signature vit au maximum **360 pas (6000 ms)**. Un lancement partage **3 PV de dégâts effectifs maximum** entre tous ses projectiles et phases, sans reporter le reliquat à la vague suivante. Les boucliers frontaux et l'exposition des gardiens s'appliquent ; les dégâts bloqués ne consomment pas le budget. Les tirs ordinaires continuent, et les six caisses conservent leurs règles, dont la charge ramassable historique qui se compose avec la signature. Le Bouclier sur C et son bouton restent indépendants. Le bouton tactile affiche « Écu » (nom accessible « Bouclier »), à **16 px**, largeur **56 px**. Le libellé court corrige la mesure hôte M02b (ancien « Bouclier » : scrollWidth 58 > clientWidth 56). Un bouton de 72 px dépasserait le logement paysage de 120 px avec Tir (56 px) et le gap (4 px). Le validateur Node vérifie le libellé, le budget conservateur de texte (3 em + 4 px ≤56), la rangée ≤64 px, les logements latéraux hors du terrain et la règle desktop sans défilement ; aucune mesure de navigateur n’est prétendue. Le guidage seul et le tir automatique ne chargent jamais la signature.

| Personnage / signature | Mécanique et chiffres littéraux | Rangées | Chevron | Anneau |
| --- | --- | ---: | ---: | ---: |
| Boubou — Pluie de bao | Bao à −240 px/s ; éclatement à **y=320** en **5 fragments**, vx=−180/−90/0/90/180, vy=−170 ; zone de contact de demi-largeur **84**, **0,15 PV** par cible et fragment. | 2,40 | 2,40 | 2,10 |
| CaliRoux — Tourbillon de feuilles | Montée **115 px/s**, spirale d'amplitude **48**, période **24π pas** ; zone **38**, **0,45 PV** par ennemi, au plus une fois par **18 pas (300 ms)**. | 2,25 | 2,70 | 2,25 |
| Pestouille — Boule de feu draconique | Montée **240 px/s**, traverse chaque cible une fois à **0,5 PV** ; explosion finale **rayon 72**, **1,5 PV** par cible. Impact à y≤210 ou à la hauteur d'une cible plus haute, borne haute y=36. | 2,50 | 2,50 | 2,50 |
| Tutu — Bananes galactiques | **3 bananes**, vx=−150/0/150, vy=−190, **4 rebonds latéraux** entre x=12 et 348 ; zone **46**, **0,175 PV/contact/300 ms** ; ralentissement **×0,45 pendant 108 pas (1800 ms)**, renouvelé au contact, combiné par minimum avec l'onde. | 2,10 | 2,80 | 2,45 |
| Lumi — Arc étoilé | Trait guidé **300 px/s**, division après **30 pas (500 ms)** en **6 étoiles** à **0,4 PV**, verrouillage des six cibles visibles les plus proches ; guidage recalculé à chaque pas et nouvelle cible si destruction. | 2,40 | 2,40 | 2,40 |

Mesure passe 102 : `tests/essaim-signature-checks.ts`, six cibles immobiles à **100 PV**, sans tir principal, lancement à x=180/y=526 et simulation de 360 pas. Formations étalées en littéraux : rangées (40,180), (180,180), (320,180), (40,300), (180,300), (320,300) ; chevron ouvert (180,120), (110,210), (250,210), (40,300), (320,300), (180,390) ; anneau de grand rayon (180,100), (310,175), (310,325), (180,400), (50,325), (50,175). Les valeurs sont les **PV effectivement retirés aux cibles**, contrôlés contre le compteur moteur ; toutes les cibles survivent et le budget reste strictement positif. Le plafond de sécurité de 3 PV ne participe donc pas à l'équilibre mesuré.

| Écart signé à la moyenne | Rangées (2,33 PV) | Chevron (2,56 PV) | Anneau (2,34 PV) |
| --- | ---: | ---: | ---: |
| Boubou | +3,00 % | −6,25 % | −10,26 % |
| CaliRoux | −3,43 % | +5,47 % | −3,85 % |
| Pestouille | +7,30 % | −2,34 % | +6,84 % |
| Tutu | −9,87 % | +9,38 % | +4,70 % |
| Lumi | +3,00 % | −6,25 % | +2,56 % |

Seuil **±15 % dans chaque formation**, écart maximal **10,26 %**. Les formations ont été fixées avant l'ajustement des armes : bao élargi à 84 et abaissé à 0,15 PV par fragment ; feuilles resserrées à 38 et abaissées à 0,45 PV ; bananes élargies à 46 et abaissées à 0,175 PV ; étoiles abaissées à 0,4 PV ; feu inchangé. Doubler les dégâts des fragments échoue au banc. Ce banc mesure ces trois situations, pas une égalité sur toutes les trajectoires de campagne. Une signature ne vide pas une vague normale de six ennemis ; les trente niveaux restent gagnables sans elle. À chaque nouvelle vague, projectiles et budget sont effacés, recharge conservée. Les étoiles ignorent les cadavres, y compris ceux créés pendant le même pas.


L'activation est explicite (`enableSignature`) : les anciens états et moteurs sans signature ne reçoivent aucun champ supplémentaire, aucun tirage aléatoire ni changement des règles historiques. Les **60 rejeux** existants restent identiques, records et fichiers de commandes inchangés. `pilotWithSignature` ajoute un maintien/relâchement au pilote historique, dont le code et les entrées restent identiques : 12 s pour bao/bananes, 10 s pour étoiles, 9 s pour feuilles/feu. Tests de victoire avec les cinq personnages aux niveaux **1, 10, 20, 30**, graine 458 ; cas Vitest séparés pour rester sous 2 s.

Rendu : vaisseau **84 px contre 58 (×1,448)**, hitbox inchangée, fuselage, ailes, verrière avec visage, réacteurs et inclinaisons gauche/droite ; panda blanc/vert, panda roux à ailes de flamme, dragon à ailes dentelées, singe rose à cœur et licorne ailée. Tirs principaux : lasers verts à cœur blanc, feuilles, flammes, cœurs et étoiles. Les sept rôles ennemis utilisent des contours polygonaux distincts, vérifiés par empreintes raster de forme (au moins **100 pixels différents** entre chaque paire), deux états de battement, plaques, verrières et réacteurs. Explosions : éclats triangulaires, traînées, anneau et flash dans le pool existant.

Décors : alternance G01/G02/G03 par tranches de cinq niveaux ; les entrées du catalogue **6/8/14** (indices moteur) fixent respectivement Ceinture de bambou, Nébuleuse écarlate et Royaume des étoiles. Astéroïdes verts et traits laser verts, brumes rouges et météores, puis nébuleuses violettes et cristaux en parallaxe. Les éléments de décor n'ont pas de collision. Mouvement réduit : battement et inclinaison supprimés, parallaxe à 12 %, pas de traînée de motif ni de tremblement, quatre anneaux au plus ; trajectoires tactiques conservées.

Budget inchangé : **96 particules**, **256 images** préallouées pour l'atlas, trois Graphics et deux Images de fond (261 objets retenus hors HUD/effet de Bouclier déjà existants). Le validateur Node dessine **2000 pas par personnage** avec signatures et saturation : pics d'images utilisées **41/45/37/45/45** dans l'ordre du tableau, particules **96/96** pour chacun, **0 génération de texture pendant le jeu**, identités et nombre d'objets stables. Les deux textures de fond et les textures vectorielles sont générées au démarrage seulement, mises en cache par gestionnaire. Aucun fichier image ni dépendance ajouté. Cette mesure Node certifie les budgets, pas la cadence GPU ; le scénario E2E de performance existant reste prévu pour l'orchestrateur.

Validation : S-essaim-01 identité, seuil et recharge ; S-essaim-02 fragments et zone, répétition à 300 ms, traversée et explosion hors axe, rebonds et ralentissement expirant, verrous et guidage ; S-essaim-03 tableau ci-dessus ; S-essaim-04 campagne et rejeux historiques ; S-essaim-05 budgets sur 2000 pas. Scripts Node : `validate-essaim-signature.js`, `check-essaim-signature-mutations.js`, `check-essaim-signature-art.js`, `check-essaim-geometry.js`, intégrés à `test:node`. Seize mutations réellement tuées sous Node : personnage par défaut, ralentissement ignoré, explosion supprimée ou doublée, budget du feu doublé ; les huit mutations adverses (bao ×2, montée des feuilles ×2, répétition au pas 17, verrou mort conservé, rebond droit supprimé, vie à 180 pas, recharge à 1000/59, explosion à deux pas) ; collision avec cadavre, projectiles ou budget conservés au changement de vague. Les ancres et lignes sont calculées par le script. Les assertions locales vérifient chaque fragment, la montée sans réinitialisation, les pas 17/18, la disponibilité aux pas 479/480 puis une nouvelle charge, les deux rebonds, la présence au pas 359 et l'expiration au pas 360, la réattribution après destruction, et le changement de vague avec projectile en vol. Le validateur de rendu intercepte les appels Graphics réels : traînées présentes en mode normal et absentes en mouvement réduit pour les cinq armes ; cercle d'explosion visible jusqu'à l'âge 19 puis absent à 20.

E2E mobiles **390×844** écrits dans `tests/e2e/essaim-signature.spec.ts` : captures `essaim-signature-<id>` pour les cinq armes en vol, `essaim-theme-G01/G02/G03`, conduite par événements tactiles CDP bruités **±12 px toutes les 150 ms**, temps réel sans `advance()`, victoire niveau 1 et compteur de signatures ≥1. Les seules captures de conduite sont avant/après. **Aucun navigateur ni Vitest lancé pendant cette passe** ; ces E2E et les mesures de cadence restent à exécuter par l'orchestrateur.

Passe 84 : Bouclier de deux secondes par vague, contrôles aux deux pouces et tir automatique mémorisé ; contrat Characters ci-dessus.

Passe 53, partie 1, corrigée en passe 54. Aire logique 360×640 ; vaisseau à y=552. Le glissement tactile commence à y=586, sous la ligne visible y=590. Flèches/A/D déplacent ; Espace ou bouton Tir maintenu tire. Les zones gauche/droite de 56 px et Tir de 64 px sont conservées. Tir auto facultatif mémorisé, pause commune sans progression. La sauvegarde de progression et les clés existantes restent compatibles ; les anciens états moteur reçoivent les valeurs par défaut des nouveaux champs.

Le moteur utilise le PRNG partagé (graine par défaut 458), un pas fixe de 1000/60 ms et aucune horloge externe. Entrée de 1500 ms échelonnée de 100 ms par ennemi, courbes déterministes ; oscillation calculée sur l'âge local, donc ralentie par l'onde. Piqués vers la position mémorisée du joueur. Trois vies, invulnérabilité de 1000 ms, 10 points par ennemi (30 en piqué). Un capteur par vague conserve la silhouette de nacelle et libère une arme à ramasser. Le champ historique de double canon reste lisible dans les anciens états, mais les nouvelles parties ne le distribuent plus ; ramasser une nouvelle arme le remplace.

### Direction visuelle — passe 55

Cartoon arrondi et lumineux, contours encre, couleurs saturées et volumes à deux tons avec reflets. La coque du joueur reçoit un dégradé par couches, une verrière et deux réacteurs dont la flamme pulse ; son inclinaison suit le déplacement latéral. Les silhouettes distinguent escorte à arc frontal orienté selon `facing`, poseur de mines à nacelles, scindeur à deux lobes, kamikaze à trois pales tournantes, porteur à tourelle articulée, miroir à deux coques et blindé à plaques. Battement, antennes et balancement animent les coques ; un impact blanchit brièvement le vaisseau. Les grands gardiens et le commandement assemblent coques, nacelles, réacteurs et cœur lumineux exposé ; la phase 2 écarte les nacelles, passe au rose et révèle des fissures chaudes. Les silhouettes décoratives n'altèrent aucune hitbox.

Le rayon passe du blanc menthe au rouge avec la chaleur ; les rebonds ont une traînée dorée, les drones une orbite, l'onde des cercles translucides, l'aimant des lignes de champ et la charge un volume lumineux croissant. Les tirs ennemis sont dessinés en dernier avec isolation sombre, enveloppe rose vif et cœur blanc crème, plus contrastés que les effets. Les explosions mêlent éclats, fumée et anneau ; les gros impacts ajoutent un tremblement de 130 ms et d'amplitude 0,003.

Trois plans de 24 étoiles défilent à 4, 10 et 22 px/s ; deux nébuleuses à dégradé radial sont générées par Graphics au démarrage (`generateTexture`, une fois par clé et gestionnaire de textures), puis réutilisées. Une planète change de palette, position et anneau par tranche de cinq niveaux. Aucun fichier image ni dépendance ajoutée. Trois Graphics et deux Images restent actifs, indépendamment du nombre d'entités ; le HUD est un Text supplémentaire. Pas d'objet Phaser par projectile ou particule, pas de filtre ni de texture produite pendant le jeu.

Le pool préalloue **96 particules** (budget littéral) et réutilise leurs identités ; à saturation les nouveaux effets sont abandonnés. `prefers-reduced-motion` est suivi aussi pendant la partie : aucun tremblement, inclinaison ni battement décoratif, parallaxe à 12 % de vitesse et **4 anneaux au maximum**, sans éclats ni fumée. Les mouvements tactiques et les contrôles restent inchangés. Pause et sélection figent le temps visuel ; recommencer vide le pool. Le crochet `art()` expose objets graphiques actifs (5, hors HUD), particules actives, capacité, nombre de générations de textures, images dessinées et préférence de mouvement.

`tests/essaim-art.test.ts` vérifie le pool sur **2000 pas de démo** avec saturation forcée, les identités réutilisées, le budget réduit et la génération unique des deux textures. Les mêmes contrôles purs sont exécutables sans Vitest avec `nice -n 19 ionice -c3 node scripts/check-essaim-art.js`. E2E écrits pour l'orchestrateur : `essaim-art-play` montre les sept silhouettes, les tirs et une explosion ; `essaim-art-boss` le commandement exposé en phase 2 ; `essaim-art-weapons` deux armes simultanées (drones et rebond) ; `essaim-art-reduced` la même scène de silhouettes avec un anneau et mouvement réduit, assertion ≤4 particules. Les captures existantes des six armes restent présentes. Le test mobile bride le CPU par CDP `Emulation.setCPUThrottlingRate` à **4** et mesure successivement Serpentin puis Essaim dans le **même navigateur, la même page et la même session CDP**, sur **5000 ms par scène**, sans `advance()`. Il compte les nouveaux dessins du jeu, pas les seuls rappels rAF. Serpentin utilise un parcours horizontal torique sans obstacle ni croissance ; Essaim utilise la scène `weapons` avec drones et rebond. Le seuil relatif littéral est **cadence Essaim / cadence Serpentin ≥ 0,5**. Chaque moteur doit avancer d’au moins 240 ticks et rester en jeu ; les budgets de particules et de Graphics sont conservés. Les valeurs brutes, le rapport et le seuil sont joints en JSON. Ce rapport compare les charges dans le conteneur sans GPU ; il ne certifie pas une cadence matérielle.

Un second échantillon Essaim `weapons` de **5000 ms**, CPU remis à **1**, exige un **temps JavaScript moyen par image ≤ 8 ms**. Le crochet `__ESSAIM_TEST__.timing(true)` remet les compteurs à zéro ; `timing()` expose les images mesurées, `updateMs`, `drawMs` et `meanMs`. `performance.now()` encadre la mise à jour complète de la scène et son dessin ; le dessin est soustrait du compteur de mise à jour pour éviter de le compter deux fois. La moyenne vaut `(updateMs + drawMs) / frames`, uniquement sur les images réelles en jeu, hors `advance()`. Elle inclut moteur, effets, HUD et construction du dessin, mais pas la rastérisation GPU ni l’attente du navigateur. Les compteurs doivent être non nuls et les résultats sont joints en JSON. Le **30 i/s réel se mesure sur un vrai téléphone**, avec le scénario armes ; aucun seuil absolu de cadence ne représente ce matériel dans le conteneur logiciel. Cette mesure et les captures sont prévues, non exécutées pendant cette passe (aucun navigateur ni Vitest).

La mesure E2E de cadence (`E-ART mobile CPU ×4`) dépend fortement de l'environnement (conteneur sans GPU) : elle est exclue de la suite par défaut et se lance avec `PERF=1 npx playwright test tests/e2e/essaim.spec.ts`. Le seuil réel de 30 i/s se vérifie sur téléphone.

### Six armes ramassables

Chaque arme dure 14000 ms, avec secondes restantes dans le HUD. Une caisse initiale propose l'arme du niveau ; une seconde caisse propose un soutien. Les caisses descendent à 150 px/s et se ramassent à moins de 30 px du vaisseau. Deux armes actives au maximum : même arme = durée renouvelée, troisième arme différente = remplacement de la plus ancienne. Le tir normal continue pendant une charge ; un appui de moins de 300 ms ne produit aucun projectile chargé et conserve le tir ordinaire. Le relâchement du bouton Tir ou d'Espace libère la charge, sans modifier les dimensions tactiles.

| Arme | Mécanique et jauge | Formation visée / façon de jouer |
| --- | --- | --- |
| Rayon continu | Remplace le tir ordinaire ; contact toutes les 6 images. Chaleur +1,4/image, blocage à 100, refroidissement −0,8/image jusqu'à zéro ; chaleur et blocage affichés. | Scindeurs et miroir : rester aligné, interrompre pour refroidir. |
| Rebond | Vitesse (420,−350) px/s ; exactement deux rebonds sur les bords latéraux x=8 et 352. | Les escortes frontales bloquent les tirs directs ; les arrivées latérales ou arrière contournent leur protection, notamment après un rebond. Viser un bord plutôt que l'ennemi. |
| Drones | Deux drones en orbite de rayons (42,32), collision balayée de rayon 17 avec les tirs ennemis ; durée affichée. | Tireurs en rafale : placer une orbite sur la trajectoire menaçante. |
| Onde | Disque de rayon 125, centre 140 px devant le vaisseau ; temps local des ennemis et déplacement/temporisateurs de leurs tirs multipliés par **0,35**. | Essaims rapides et spirales : se placer sous leur trajectoire pour les retenir dans le disque. |
| Aimant | À moins de 145 px, les tirs ennemis deviennent alliés et visent l'ennemi visible le plus proche (sinon le boss) à 600 px/s ; une mine renvoyée ne libère plus de tirs ennemis. | Rafales et mines : approcher les projectiles pour les retourner. |
| Charge | Maintenir jusqu'à 1500 ms puis relâcher ; rayon 4+14×charge, perçage 1+floor(4×charge), charge normalisée à 0…1 ; jauge affichée. Chaque cible ne peut être touchée qu'une fois par projectile. | Blindés alignés : traverser plusieurs coques dans une colonne et contourner le cœur fermé des boss. |

Combinaison explicite rayon + onde : tant que le rayon est allumé, le facteur du disque passe de 0,35 à **0,2**. Drones + aimant donne priorité au renvoi dans la zone magnétique ; les drones restent une défense lorsque l'aimant expire. Un tir renvoyé est allié et n'est plus intercepté. Rebond + drones protège le vaisseau pendant le trajet indirect. Charge + drones protège la tenue de charge. Rayon et rebond ensemble conservent le rayon comme tir principal ; la charge reste libérable. Les autres effets se composent selon leurs zones, sans augmenter le nombre de places d'armes.

### Formations et boss

Les trente plans sont dans `src/engines/essaim/levels.ts`. Cinq géométries réelles : rangées, chevron, colonnes, pinces et anneau. Les mélanges tournent entre les vagues. Les nouveautés de comportement ne sont pas des changements de quantité ou de PV : rafales en éventail, parcours elliptique rapide, protection frontale, mines qui éclatent après 1400 ms, scission en deux fragments sans récursion, spirale d'approche qui quitte la vague après son attaque, tourelles portées lançant des tirs guidés jusqu'à y=300, allié à protéger, copie horizontale du joueur et colonnes traversables par charge. Le bouclier des escortes couvre un cône frontal de 90° orienté vers le bas (ou selon leur orientation explicite), sans privilège lié au type du projectile. Les escortes ouvrent leur bouclier 500 ms toutes les 6000 ms ; le rebond permet d'éviter cette attente. Une collision de kamikaze le détruit. Les tourelles disparaissent avec leur porteur. L'allié absorbe quatre impacts ; sa perte coûte une vie, son sauvetage vaut 50 points par PV restant.

Mini-boss à la dernière vague des niveaux 5/10/15/20/25 ; commandement au 30. Cœur fermé pendant 1800 ms puis exposé 1200 ms dans chaque cycle de 3000 ms. Faiblesse commune : les tirs ordinaires et le rayon blessent le cœur exposé ; rebonds, tirs renvoyés et charges perçantes contournent la fermeture et retirent deux PV. Un boss a 10 PV, le commandement 24. Au seuil de 12 PV, le commandement passe de l'éventail à une visée du joueur avec cadence de 45 images au lieu de 75. Chaque boss détruit rapporte 200 points. Le bonus de précision des défis est plafonné à 200 pour tenir compte du perçage et des renvois.

| Niveau | Motif | Faiblesse / arme conseillée |
| ---: | --- | --- |
| 5 | Pince convergente à deux flancs | Rebond pendant la fermeture, tir direct à l'ouverture |
| 10 | Mines déposées sur l'axe du joueur puis éclatement différé | Rayon pendant l'ouverture ; onde pour ralentir les mines |
| 15 | Tir visant la position du joueur au départ | Aimant pour renvoyer sa propre attaque |
| 20 | Tirs qui inversent leur dérive horizontale à y=300 | Charge à travers le cœur fermé, drones pendant la tenue |
| 25 | Projectiles guidés jusqu'à y=300, puis trajectoire figée | Charge ; esquiver après la fin du guidage |
| 30 | Phase 1 : éventail ; phase 2 : tir visé plus fréquent | Charge contre le cœur fermé dans les deux phases |

Vagues de respiration : 6, 11, 17 et 24 (quatre ennemis, pas de tir ordinaire ; les comportements présents restent actifs). La victoire exige toutes les vagues et le boss éventuel détruits. Le nombre de vagues reste 2+floor(4l/29), celui des ennemis 6+floor(6l/29) hors respiration. Les cadences nominales historiques sont conservées ; les mélanges et les géométries sont désormais décrits explicitement au lieu de probabilités de types.

| Niveau | Vague | Nouveauté / situation | Arme proposée |
| ---: | --- | --- | --- |
| 1 | Patrouille | Prise en main du rayon | Rayon |
| 2 | Rafales | Tireurs en rafale ; drones | Drones |
| 3 | Course | Essaim rapide à trajectoire elliptique ; onde | Onde |
| 4 | Escortes | Boucliers frontaux ; rebonds | Rebond |
| 5 | Gardien des flancs | Mini-boss : pince convergente | Rebond |
| 6 | Escale | Respiration sans tir ordinaire | Rayon |
| 7 | Ceinture de bambou | Mines à explosion différée ; aimant | Aimant |
| 8 | Boucliers et mines | Combinaison des deux menaces | Rebond |
| 9 | Nébuleuse écarlate | Rafales + essaim rapide | Drones |
| 10 | Scission | Deux fragments par scindeur ; gardien mineur | Rayon |
| 11 | Halte | Respiration avec scindeurs | Rayon |
| 12 | Éclats rapides | Scission + essaim rapide | Onde |
| 13 | Spirales | Kamikazes en spirale | Onde |
| 14 | Spirales minées | Spirales + mines | Aimant |
| 15 | Royaume des étoiles | Mini-boss : visée de la position du joueur | Aimant |
| 16 | Tourelles portées | Lanceurs guidés portés ; charge | Charge |
| 17 | Répit | Respiration avec tourelles | Drones |
| 18 | Convoi protégé | Tourelles + boucliers | Rebond |
| 19 | Sauvetage | Vaisseau allié à protéger | Drones |
| 20 | Gardien du convoi | Mini-boss : tirs qui inversent leur dérive | Charge |
| 21 | Secours sous mines | Sauvetage + mines | Aimant |
| 22 | Miroir | Copie du déplacement horizontal | Rayon |
| 23 | Reflets scindés | Miroir + scission | Rayon |
| 24 | Dernière halte | Respiration avec sauvetage | Drones |
| 25 | Blindés alignés | Colonnes blindées ; gardien à tirs guidés | Charge |
| 26 | Blindage miroir | Colonnes blindées + miroir | Charge |
| 27 | Mines et escorte | Mines + boucliers + tourelles | Rebond |
| 28 | Convoi en spirale | Sauvetage + spirales + essaim rapide | Onde |
| 29 | Reflets de rafale | Miroir + rafales + scission | Aimant |
| 30 | Commandement | Vaisseau final : éventail puis tir visé | Charge |

### Preuves exécutables

`tests/essaim-behavior.ts` expose les scénarios en littéraux réutilisés par `tests/essaim.test.ts` et par `nice -n 19 ionice -c3 node scripts/validate-essaim.js`. E-WPN-01…06 couvrent les six mécaniques ; E-WPN-07 conserve le test des trois escortes (seuil 1,5) et compare chacune des six armes au tir de base contre une vague de sa formation associée réellement générée, avec un seuil littéral de 1,3 (temps de neutralisation, ou interceptions pour drones/aimant) ; E-WPN-08 couvre la limite de deux et le facteur combiné 0,2. E-BOSS vérifie fermeture, faiblesse, cinq motifs et transition du commandement. E-WAVE couvre mines, scission, missiles portés, miroir, kamikazes et sauvetage. E-PICKUP vérifie les six ramassages, renouvellements et expirations. E-DET vérifie cadence, graines et anciens états. E-GEN-01…08 simulent les apparitions et comportements générés (boss, sauvetage, diversité observée, ellipse/rafales, guidage, charge, phase 2 et conséquences du sauvetage). E-P2 verrouille la pénalité sous invulnérabilité ; E-SHIELD croise géométrie et types de projectiles. E-DIV-01 applique la fonction partagée du rapport à des parties pilotées complètes, avec témoins observés et sans compter les déclarations de configuration : huit nouveautés au minimum, écarts de cinq niveaux maximum jusqu'au 25, clones sous 25 %.

Le pilote utilise uniquement déplacement et maintien/relâchement du tir, en observant chaque pas fixe. Le validateur exige une victoire pour chacun des trente niveaux sur les graines 458 et 28, sous 18000 images par niveau. Il écrit les résultats, les temps simulés, vies et scores ainsi que les vingt et une mutations rejetées avec leurs lignes dans `docs/essaim-validation.json`. La démo et le rapport utilisent le même pilote ; la démo observe six pas par avance de 100 ms, le rapport suit chaque pas jusqu’à la fin de la tentative (plafond 18000).

Le contrôle G01 maintient Espace (bureau) ou le bouton tactile pendant la simulation, vérifie l’état de tir, une augmentation de `fired`, puis le rayon actif et sa chaleur ou un projectile selon l’arme, et vérifie le relâchement. La trajectoire clavier du niveau 1 ramasse le rayon initial, contrairement à la trajectoire tactile : `shots` reste alors vide même pendant un tir valide. Le test pur E-INPUT-01 reproduit cette trajectoire et vérifie l’émission sans projectile, puis son arrêt. Les règles de tir sont inchangées.

`tests/e2e/essaim.spec.ts` conserve les contrôles de progression, pause, disposition et nettoyage ; il écrit les captures `essaim-weapon-1` à `essaim-weapon-6` avec exactement une arme active, vérifie le maintien tactile de la charge et sa libération, et capture `essaim-level30` avec le commandement en phase 2. Ces scénarios sont écrits pour l'orchestrateur sur l'hôte de test ; aucun navigateur ni Vitest lancé pendant cette passe. La passe 55 ajoute les scénarios visuels et la mesure de fluidité décrits ci-dessus.

## Dédale

Passe 82 : le compagnon choisi est le héros ; Lueur révèle 3 s le chemin vers le soleil le plus proche (Characters).

Le compagnon cherche des graines et quatre soleils dans trente labyrinthes
19×23. La progression et les clés de sauvegarde communes restent compatibles.
`loadState` accepte aussi les anciens états sans extension `journey` : ils
conservent les déplacements et collisions historiques. Aucun tirage aléatoire
n'intervient pendant un déplacement ; graines, niveau et entrées fixent la partie.

### Formes et mécaniques (passe 58)

Le PRNG reçoit `seed + 7919*level + placementSalts[level]` modulo 2³².
Les sels de génération ont été sélectionnés par les rejeux complets du solveur,
la séparation des parcours et la courbe de campagne ; ce ne sont pas des positions
préfabriquées. Cinq générateurs alternent : arbre à couloirs étroits, salles
connectées, cycle rectangulaire autour d'un centre fermé, spirale carrée et arbre
réfléchi sur son axe vertical. La spirale a un rayon de Chebyshev non croissant
vers son centre. Position, rotation et réflexion varient à graine.

Aucune galerie commune : un chemin principal est extrait de chaque forme et
porte les clés, portes, flèches, portails, interrupteurs, murs, glace et ombres.
Le départ et les objectifs suivent ce chemin. Quatre soleils et des graines
supplémentaires sur les interactions assurent leur visite ; les spirales sont
parcourues jusqu'à l'intérieur. Les follets commencent sur le sol de la forme,
à une position générée dans les spirales.
La signature de diversité contient les positions ordonnées du rejeu et les
positions typées des mécaniques observées, jamais le sol inutilisé ni l'étiquette
de forme. D-ROUTE compare les 435 paires de solutions : LCS divisée par la longueur
du parcours le plus court, seuil littéral de 30 %.

Les règles suivantes se cumulent, avec des marqueurs et une instruction dans le HUD :

- Niveau 4 : clé et porte de même couleur ; une clé est conservée après une vie perdue.
- Niveau 5 : flèche à sens unique, contraignant l'entrée et la sortie.
- Niveau 9 : portails appariés, téléportation à l'arrivée, sans rebond immédiat.
- Niveau 13 : chaque entrée sur l'interrupteur inverse le mur associé (ouvert/fermé).
- Niveau 16 : mur fermé pendant deux échéances de déplacement, ouvert pendant deux ;
  les tentatives bloquées font aussi avancer le cycle, soit 2/3 s par cycle.
- Niveau 19 : entrer sur la glace lance une glissade jusqu'au prochain obstacle,
  même au-delà des cases gelées ; chaque case intermédiaire évalue collectes et
  contacts avec les follets. Un décès interrompt immédiatement la glisse.
- Niveau 22 : dans les ombres, vision limitée à une distance Manhattan de trois cases.
  La scène utilise la fonction de visibilité du moteur pour masquer réellement le décor.
- Niveau 25 : le rôdeur change de point de patrouille toutes les deux secondes ;
  le timide fuit la lumière du héros à moins de six cases ou sous l'effet d'un soleil.
  Le traqueur poursuit ; le devin anticipe trois cases. Les impasses permettent
  aux follets un demi-tour si aucune autre sortie n'existe.
- Niveau 28 : seconde couleur, exigeant sa propre clé.

**Dosage par niveau (passe 503, `encounters()`).** Les règles ci-dessus donnent la **première apparition** ;
elles ne se cumulent plus toutes sur chaque plateau, toujours aux mêmes fractions du chemin. Chaque niveau tire sa
composition : défis (tous les cinq) et final, tout l'acquis ; respirations, la seule nouveauté ; niveau
d'introduction, la nouveauté plus une famille ancienne ; les autres, la nouveauté plus deux anciennes en rotation.
Les familles (clé, flèche, portail, interrupteur, mur cyclique, glace, ombres, seconde couleur) occupent des
fenêtres égales entre 8 % et 88 % du chemin, dans un ordre qui tourne d'un niveau à l'autre ; clé avant porte et
interrupteur avant grille sont conservés. Deux niveaux voisins n'ont jamais la même suite de rencontres, et chaque
famille revient dans chaque chapitre après son introduction. Le HUD (`src/games/dedale/lessons.ts`) nomme la famille la plus récente réellement présente, et les rôles de
follets seulement au niveau 25 où ils apparaissent.
D-MIX (`tests/variety-e.ts`, Vitest et Node) verrouille ces propriétés et la correspondance plateau ↔ plan ;
trois mutations rejetées ; les 60 parties BFS sont réenregistrées. Le niveau 26 est la **revue** : tout l'acquis
aux fractions historiques, avec son sel d'origine (un mélange tournant y donnait toujours un parcours long qui
recouvrait le court parcours du niveau 2 au-delà de 30 %). Ses portails gardent l'écart historique de 0,02 du chemin (souvent une seule case) : c'est une
exception assumée de la revue, la règle des trois cases vaut pour tous les autres niveaux. La flèche a sa propre
fenêtre comme les autres familles (première portion droite de la fenêtre). La glace est posée sur la première portion droite de sa
fenêtre (elle glisse vraiment) et les portails sont distants d'au moins trois cases (vrai raccourci). Les sels des
niveaux 20, 24 et 27 à 30 ont été re-sélectionnés par recherche : victoire BFS sur les graines 28 et 459, D-ROUTE ≤ 30 %
contre tous les niveaux, D-CURVE et, pour le final, les onze témoins de D-FINAL.

**Oracles sans horloge (passe 503).** `test-dedale.js` et `validate-dedale.js` ne comparent plus le temps écoulé
à 2 s : ils comptent les appels à `Engine.step` et les comparent à des budgets fixes (`scripts/dedale-step-budgets.js`,
mesure × 1,5). Une machine chargée ralentit un contrôle sans changer son nombre d'étapes ; le temps reste affiché.

Respirations aux niveaux 6/11/17/22/27 : un traqueur, soleils de 12 s.
Défis à 5/10/15/20/25 : combinaison des règles acquises avec 25 s de temps réel
simulé ; le niveau 5 combine déjà portes et sens unique. Final au 30 : toutes
les mécaniques, deux couleurs, quatre rôles de follets et limite de 40 s.
Les autres niveaux ne sont pas chronométrés. Les follets circulent sur le sol ;
les contraintes des cases spéciales concernent la luciole.

### Déplacement et compatibilité

Six échéances de déplacement par seconde, avec simulation fixe à 60 Hz.
La direction demandée reste mémorisée : en cas de refus, la direction courante
continue si elle est autorisée. Un blocage ne consomme ni clé ni interrupteur.
Un portail est évalué après une glissade. Les murs cycliques bloquent l'entrée ;
un héros déjà sur la case peut en sortir pendant sa fermeture.

Graines : 10 points ; soleils : 50 points et vulnérabilité
`8000 - 7000*level/29` ms (12 s pendant les respirations). Trois vies,
1,8 s de grâce au départ et après une collision. Collectes, clés, interrupteurs,
phase cyclique et temps restant sont conservés après une vie perdue.
Les phases dispersion/poursuite, les échanges de cases et la chaîne de follets
200/400/800/1600 restent déterministes. Victoire après toutes les collectes ;
zéro vie ou temps épuisé entraîne la défaite. Les états terminaux sont gelés.

### Preuves et tests

`src/engines/dedale/solver.ts` effectue un BFS par objectif sur
(position, clés, interrupteur, phase cyclique, direction mémorisée).
Chaque arc appelle exactement `walk`, également utilisé par le moteur.
Le parcours complet est ensuite exécuté avec les follets, collisions et minuterie
ordinaires ; il s'agit d'une preuve par rejeu, pas d'un optimum global ni d'une
preuve sur toutes les graines possibles. Le validateur gagne les trente niveaux
sur les graines 28 et 459. Les trente enregistrements de la graine 28 sont dans
`tests/dedale-solutions.ts`. D-SOLVER appelle aussi réellement le BFS sur les niveaux 1/9/19/30 ; les
rejeux complets restent séparés de cet échantillon rapide.

`tests/dedale-mechanics.ts` partage les huit micro-grilles littérales D-MEC-01…08
avec le validateur Node. D-SOLVE rejoue trente victoires avec un délai maximal de
2 s. D-DIV-01 mesure les observations de ces parties sur le vrai générateur,
exige au moins sept mécaniques nouvelles (clé/porte, interrupteur/grille et
attente/passage du mur cyclique sont chacun regroupés), aucun intervalle de plus de cinq niveaux
sans découverte jusqu'au 25 et moins de 25 % de clones. Un contrôle négatif
remplace les trente niveaux par le premier et exige 100 % de clones et zéro
nouveauté. Les anciens tests de déplacement, score, cibles, collisions,
déterminisme et gel terminal restent en place ; les anciennes campagnes longues
et hypothèses de croissance monotone des boucles sont remplacées.

Le script vérifie aussi la connexité de 180 labyrinthes (30 niveaux × 6 graines),
rejette les six mutations demandées en mémoire et inscrit leurs fichiers/lignes
dans `dedale-validation.json`. Commande de régénération :

```sh
node scripts/test-dedale.js
node scripts/validate-dedale.js --record
nice -n 19 ionice -c3 node scripts/diversity-report.js
```

La spirale du niveau 4 occupe désormais 17 × 17 cases, avec un couloir continu du bord vers le centre, sans raccourci. Son rejeu est plus long ; le placement des salles du niveau 2 est réensemencé pour conserver D-ROUTE ≤30 %, sans modifier ce seuil ni les règles. Les preuves BFS sont régénérées. D-GEOMETRY vérifie l’étendue de la spirale et la symétrie verticale sur les **cellules de murs effectivement peintes** (`displayedWalls`, partagé avec la scène), pour toutes les cases de chaque miroir et trois graines. Un axe vertical discret rend la réflexion lisible. Aux niveaux 20 et 30, clés, portes, flèches (direction réfléchie), paires de portails et autres mécaniques sont aussi réfléchies sur les branches latérales disponibles. Une copie est omise si elle recouvrirait le parcours obligatoire ou une autre mécanique : elle ne doit pas ajouter de verrou ou d’inversion sur ce parcours. Les copies sont fonctionnelles, sans collectes supplémentaires imposées.

Le titre combine la forme et une tranche nommée (Éveil, Sentiers, Passages, Reflets, Ombres, Aurore). Clés, portes, portails, interrupteurs et glace utilisent des tracés Canvas occupant presque toute la case ; les flèches passent à 17 px, avec fonds colorés renforcés. Le HUD explique les couleurs et signes au niveau d’introduction ; sa largeur est bornée pour le mobile 390 × 844.

Clavier flèches/ZQSD/WASD, glisser et croix tactile de 56 px ; pause et
progression communes inchangées. Les captures E2E écrites `dedale-level04`,
`dedale-level12`, `dedale-level20` et `dedale-level30` attendent le serveur de test.
Aucun navigateur ni Vitest n'est lancé pendant cette passe.

### Les trente parcours enregistrés

Mécaniques effectivement observées au rejeu, graine 28 : C = clé/porte, U = sens unique, P = portail, I = interrupteur/grille, M = mur cyclique, G = glisse, O = obscurité, R = patrouille, F = fuite. « Base » = déplacement, graines et soleils. Une mécanique présente mais non déclenchée ne figure pas dans ce tableau.

| Niveau | Forme | Mécaniques jouées | Coups |
| ---: | --- | --- | ---: |
| 1 | Couloirs | Base | 25 |
| 2 | Salles | Base | 25 |
| 3 | Anneau | Base | 33 |
| 4 | Spirale | C | 144 |
| 5 | Miroir | C, U | 41 |
| 6 | Couloirs | C, U | 45 |
| 7 | Salles | C, U | 49 |
| 8 | Anneau | C, U | 47 |
| 9 | Spirale | C, U, P | 40 |
| 10 | Miroir | C, U, P | 44 |
| 11 | Couloirs | C, U, P | 64 |
| 12 | Salles | C, U, P | 67 |
| 13 | Anneau | C, U, P, I | 49 |
| 14 | Spirale | C, U, P, I | 59 |
| 15 | Miroir | C, U, P, I | 53 |
| 16 | Couloirs | C, U, P, I, M | 80 |
| 17 | Salles | C, U, P, I, M | 75 |
| 18 | Anneau | C, U, P, I, M | 62 |
| 19 | Spirale | C, U, P, I, M, G | 80 |
| 20 | Miroir | C, U, P, I, M | 57 |
| 21 | Couloirs | C, U, P, I, M, G | 85 |
| 22 | Salles | C, U, P, I, M, O | 93 |
| 23 | Anneau | C, U, P, I, M, O | 62 |
| 24 | Spirale | C, U, P, I, M, G, O | 107 |
| 25 | Miroir | C, U, P, I, M, G, O, R, F | 51 |
| 26 | Couloirs | C, U, P, I, M, G, O, R, F | 72 |
| 27 | Salles | C, U, P, I, M, G, O | 98 |
| 28 | Anneau | C, U, P, I, M, G, O, R, F | 106 |
| 29 | Spirale | C, U, P, I, M, G, O, R, F | 80 |
| 30 | Miroir | C, U, P, I, M, G, O, R, F | 104 |

D-ROUTE : maximum 30 % (niveaux 4/29). D-CURVE : moyennes par cinq niveaux
53,6 / 45 / 58,4 / 70,8 / 79,6 / 92 coups ; rapport final/initial 1,716.
La croissance strictement exigée porte toujours sur les tranches 6–30.
Les tests Node partagés vérifient aussi les durées exactes des défis et leur
absence ailleurs, la conservation des deux couleurs et de l'interrupteur après
un décès réel, l'obscurité horizontale et verticale, les témoins du final recalculés,
le solveur réel et la géométrie des anneaux, spirales et miroirs.

## Ferraille

### Direction visuelle — passes 112 et 114

Le cadrage manuel du monde passe de 1,4 à 2,6, avec suivi horizontal et vertical
du héros ; terrain et hitbox restent inchangés.
Le compagnon équipé occupe un sprite de 128 px, arme de signature renforcée
au premier plan (canon à plusieurs tubes, lance-flammes, lance-banane ou arc).
Les poses de saut, accroupissement et tir suivent l’état physique ; les huit textures
de course initiales sont complétées par quatre poses de course avec tir ;
les corps sans arme intégrée sont mis en cache séparément. Ces textures sont générées une seule fois
au démarrage et réutilisées, dans la réserve existante de 224 images.
Le véhicule actif conserve le char panda, buggy roux, hélico dragon, véhicule
Tutu et jet licorne procéduraux de Characters, agrandis à 148×126. Le véhicule
Tutu reçoit localement un capot large, un pare-brise et un arceau de buggy
(deux textures de profil supplémentaires, sans modifier Characters).

Les seize modules ont un dessin plein et détaillé : rouleaux tournants,
presse à bandes de danger, pont à planches fendues et tombantes, cabine avec
câbles ou chaînes suivant sa plateforme, porte/interrupteur, mur maçonné,
caisse croisillonnée, tour, cabane, projecteur, aiguillage, ventilateur, lave,
conduit et ressort. Aucun cadre vide de démonstration. Les trois plans opaques
couvrent tous les thèmes : usine et nuit à fenêtres et conduites, désert à
arches et portes, jungle à feuillages, cabanes et caisses. R01 ajoute machine
en feu et caisses ; R02 garde ses arches mais en pleine opacité, avec portes ;
R03 montre lave, presse et robot dès l’entrée. Aucun voile sombre global.
Passe 114 : l’aperçu de l’ennemi lointain et son étincelle périodique sont
supprimés. Les ennemis ne sont dessinés qu’à leur position physique dans le
champ. L’arme renforcée et sa flamme pivotent selon la visée du moteur
(horizontale, verticale ou diagonale ; restriction diagonale en saut/accroupi,
angle de lancement spécifique des grenades).
Courir en tirant garde les jambes animées et le haut du corps de tir.
Passe 115 : les niveaux 1–30 ont chacun une tourelle physique à x=108,
y=242 (14×14, un point de vie), dans le champ initial. Le héros démarre
à x=32 : 64 unités libres entre leurs collisions. La tourelle tire sa
première salve de trois projectiles à la frame 120 (2 s), sans modifier
sa cadence ni consulter l’horloge système. Un tir frontal ordinaire suffit
à la détruire avant cette salve. Seule l’entité marquée `opening` échappe
au gel d’introduction, y compris celui du projecteur aux niveaux 16 et 30 ;
les autres gardes et les règles des mécanismes restent conservés.
Le marqueur est optionnel : les sauvegardes historiques sans ce champ se
rechargent et leurs ennemis gardent le gel antérieur.

Le contrôle Node parcourt les trente entrées avec trois graines : ennemi
réel dessiné à sa position initiale, première salve avant trois secondes,
projectiles physiques dans le champ et cercles de rendu aux mêmes coordonnées,
réponse par tir sans perte de vie. Le contrôle immobile désactive seulement
le défilement automatique des quatre niveaux en wagon ; leurs états normaux
sont joués par les rejeux de campagne. Les autres ennemis restent gelés et
un état rechargé sans marqueur est testé séparément.
Les 180 rejeux de niveaux (trois graines, avec/sans spécial), les témoins
communs de Ferraille et les six rejeux R01–R03 sont réenregistrés. Les cinq
personnages rejouent chacun les 180 parties, soit 900 victoires. Le rapport
`tests/fixtures/ferraille-validation-115.json` conserve les mesures et mutations,
sans navigateur ni oracle de durée réelle. La répétition reste verte : 435 paires,
16 modules rencontrés, similarité maximale de modules 50 % dans les six
campagnes graine/spécial ; mesure historique 0 pour un plafond de 11,2.
Le mouvement réduit fige rouleaux, pieds, pistons décoratifs, flammes
et particules, en conservant les états mécaniques réellement dangereux.

`validate-ferraille-levels.js` intègre la scène simulée de
`ferraille-scene-checks.js` : trente entrées × cinq compagnons, instant zéro,
aucun avancement préalable. Seuils littéraux : héros ≥56 px, décor ≥60 %,
≥12 silhouettes majeures distinctes aux six entrées ci-dessous et au moins
le dessin de la tourelle écrite dans le niveau à ses coordonnées physiques
dans le champ, sans insertion d’un ennemi de substitution. Cache et réserve sont vérifiés
après changements de niveau et réinstanciation du peintre ; aucune mutation
du snapshot par le dessin. Quatre mutations visuelles supplémentaires sont
rejetées (petit héros, décor absent, ennemis absents, allocation dans draw).

Mesure Node sur canevas logique 360×640 ajusté par FIT à 390×844, en réservant
48 px de barre et 120 px de contrôles. La hauteur mesure les bornes verticales
réelles du dessin d’atlas, hors marges transparentes ; elle passe de **37,9 à
85,1 px** (HEAD avant passe → après). Ces bornes incluent l’équipement et ne
sont pas la mesure approximative du corps sur les captures de revue. Le raster
échantillonne les surfaces remplies d’opacité ≥0,8 des appels Graphics tous
les 2 px, hors HUD et aplat de ciel,
et compte les silhouettes remplies distinctes d’au moins 24×24 px (pas les
rivets, traits ou fenêtres). Ce sont des mesures géométriques Node, sans
capture navigateur ; les angles arrondis sont traités par leurs boîtes.
Passe 114 : chaque pixel conserve le dernier remplissage opaque ; un grand
aplat efface les détails recouverts et seules les silhouettes encore visibles
sont comptées. Les géométries soumises pour deux images de course sont
comparées sans inclure leurs noms. `artChecks` vérifie canon/arc, flamme,
angle contre la vitesse d’un vrai projectile, plaque et bras des robots,
rouleaux animés, planches tombées, hauteur et profondeur de lave, ouverture
des portes, déplacement de caisse, presse et projecteur. Les huit mutations
de la relecture 112 sont exécutées, ainsi que quatre mutations sur la visée, la flamme et
la course pendant le tir.

| Niveau | Couverture avant → après | Silhouettes avant → après |
| ---: | ---: | ---: |
| 1 | 40,8 → 85,1 % | 5 → 61 |
| 3 | 40,8 → 85,1 % | 5 → 61 |
| 8 | 45,0 → 83,8 % | 6 → 75 |
| 14 · R01 | 35,5 → 88,5 % | 10 → 112 |
| 6 · R02 | 45,0 → 83,8 % | 6 → 74 |
| 24 · R03 | 42,6 → 85,1 % | 9 → 62 |

Les dessins restent des silhouettes vectorielles originales : moins de texture,
de détails et de vues de véhicules que la planche de référence. Aucun logo,
image ou changement du système Characters partagé n’est introduit.

Passe 84 : Super-tir frontal de courte portée, trois dégâts et dix secondes de recharge ; contrat Characters ci-dessus.

Robot de récupération original dans trente ateliers à défilement horizontal.
Tout est dessiné par code ; les sons sont synthétisés par le son global. Aucun
asset externe ni dépendance ajoutée. Le moteur pur est dans
`src/engines/ferraille/engine.ts`, la scène dans `src/games/ferraille/scene.ts`.

### Règles et physique

Tuiles 16 px, héros 12×22 px (12×14 accroupi), vitesse 120 px/s, gravité
900 px/s², impulsion de saut 330 px/s. Relâcher le saut limite sa vitesse
ascendante à 120 px/s. Grâce au bord et tampon de saut : 100 ms chacun.
Les AABB sont résolues X puis Y, par sous-déplacements d'au plus 4 px pour
éviter la traversée des tuiles. Les plateformes mobiles portent le robot.
Le pas fixe est 1000/60 ms ; le reliquat est sérialisé dans le snapshot.

Huit directions au sol, quatre en vol ; contrôles clavier et tactiles inchangés.
L'impulsion simple est illimitée (280 px/s, cadence 240 ms). Les anciens
éventail et rafale restent lisibles dans les états sauvegardés. Les caisses
accordent une réserve affichée dans le HUD : lance-flammes 180 charges,
cadence 50 ms et portée maximale 73 px ; ricochet 36 coups, six réflexions
sur sol/murs ; grenades 12 coups, impulsion (±170, −260), gravité 900,
explosion de rayon 64 px et deux dégâts. Les grenades retournent les blindés
pendant 2200 ms. Le bouclier, découvert au 26, absorbe un impact.
Trois vies ; grâce de 1800 ms après réapparition au dernier point sûr.
Chuter consomme une vie même pendant la grâce. Les clés de progression et
le format du service de sauvegarde restent inchangés ; les anciens états
reçoivent des valeurs par défaut pour les nouveaux champs.

Six comportements : rampant qui patrouille et évite les bords ; tireur qui
marche 600 ms, s'immobilise, verrouille sa visée puis tire à 1200 ms ;
kamikaze qui engage une charge droite de 950 ms puis récupère avant de
réorienter à 1300 ms ; volant en sinusoïde (amplitude 22 px), bombes soumises
à la gravité ; blindé protégé de face, vulnérable de dos ou retourné ;
tourelle fixe, rotation limitée à 0,012 rad/pas et salve de trois tirs à 2000 ms.
Les ennemis s'activent à 360 px ; aucune IA n'utilise de hasard en cours de jeu.

### Trente parcours écrits — passe 103

`levels.ts` contient trente séquences littérales de cinq modules ; la graine
ne choisit plus ni terrain ni cycles physiques ; elle ne décale que le décor. Chaque niveau commence par une démonstration sans
dégât du module vedette à x=128, puis son défi à x=352. Les deux premières
sections offrent l'exploration ; la suite combine les mécanismes et les
rencontres. Un drapeau visible à x=800 marque le point de contrôle médian.
La sortie est à x=1712. Le nom et l'idée restent affichés 120 ticks (2 s).

Seize mécanismes physiques dans `modules.ts` : convoyeur +0,4 px/pas au sol ;
vent −0,6 px/pas ; piston fermé aux ticks [100,145[ d'un cycle de 180 ;
pont dont 48 px s'effondrent au 36e tick après entrée ; ascenseur vertical
(amplitude 28 px) ; chaîne oscillante horizontale (20 px) ; interrupteur
à viser vers le haut pendant 18 ticks ; mur secret détruit après 30 ticks
de tir, donnant un seul bouclier lors de la transition d’ouverture ; caisse poussée de 0,8 px/pas sur 48 px ; tour
à tourelle surélevée ; cabane à cage libérable ; projecteur alternant toutes
les 90 ticks, seul son faisceau autorise les sentinelles à agir ; aiguillage
qui entraîne de 1 px/pas et bifurque vers le haut ; lave montant de 0,4 px/pas
jusqu'à 80 px, dangereuse après 100 ticks ; conduit de 16 px à franchir
accroupi ; tremplin d'impulsion −390 px/s. Les plateformes portent réellement
le héros. Les caisses et portes interrompent sa course. Les ponts et la lave
se réarment à la réapparition pour laisser le point de contrôle franchissable.

Les gardiens 5/10/15/20/25/30 conservent leurs six motifs et leur cycle
protégé/ouvert de 1200/1200 ms ; chacun possède une dernière instance de sa
vedette dans l'arène. Leurs PV vont de 8 à 13 : le défi progresse avec les
combinaisons et les arènes plutôt que par l'allongement de la barre de vie.
Le tir horizontal reste horizontal quand le héros avance accroupi.
Les wagonnets et sauvetages existants sont conservés. Les ajouts de cabanes
peuvent porter le nombre d'otages au-delà de trois.

R01 (14), R02 (6) et R03 (24) conservent noms, décors et indices de sauvegarde.
R01 fait jouer la tour dans le camp ; R02 met en scène l'ascenseur, les chaînes
et sa voie haute à bonus ; R03 associe convoyeur, lave, piston et robots.

| N° | Nom | Module vedette | Séquence écrite |
| ---: | --- | --- | --- |
| 1 | Le quai roulant | Convoyeur | Convoyeur → Vent → Tour → Tremplin → Lave montante |
| 2 | Les presses patientes | Piston | Piston → Vent → Conduit bas → Chaîne → Tremplin |
| 3 | Le pont fragile | Pont fragile | Pont fragile → Aiguillage → Caisse → Tour → Mur secret |
| 4 | Sous les conduites | Conduit bas | Conduit bas → Lave montante → Projecteur → Piston → Caisse |
| 5 | La vanne de l’Éventreur | Interrupteur | Interrupteur → Piston → Pont fragile → Ascenseur → Projecteur |
| 6 | Forteresse oubliée | Ascenseur | Ascenseur → Conduit bas → Convoyeur → Tremplin → Chaîne |
| 7 | Les chaînes du rempart | Chaîne | Chaîne → Cabane → Interrupteur → Pont fragile → Vent |
| 8 | La dune contraire | Vent | Vent → Mur secret → Conduit bas → Aiguillage → Cabane |
| 9 | La cour des caisses | Caisse | Caisse → Vent → Aiguillage → Mur secret → Ascenseur |
| 10 | Le tremplin du Pilon | Tremplin | Tremplin → Vent → Projecteur → Cabane → Conduit bas |
| 11 | La cache des bambous | Mur secret | Mur secret → Ascenseur → Piston → Interrupteur → Tremplin |
| 12 | Le rail bifurqué | Aiguillage | Aiguillage → Cabane → Ascenseur → Vent → Tremplin |
| 13 | La passerelle suspendue | Pont fragile | Pont fragile → Interrupteur → Chaîne → Lave montante → Cabane |
| 14 | Jungle mécanique | Tour | Tour → Ascenseur → Vent → Cabane → Chaîne |
| 15 | Les chaînes du Scarabombe | Chaîne | Chaîne → Tour → Mur secret → Piston → Aiguillage |
| 16 | Les faisceaux de nuit | Projecteur | Projecteur → Caisse → Aiguillage → Piston → Cabane |
| 17 | Le conduit des sentinelles | Conduit bas | Conduit bas → Vent → Tremplin → Piston → Aiguillage |
| 18 | Les cabanes prisonnières | Cabane | Cabane → Mur secret → Chaîne → Convoyeur → Tour |
| 19 | Le monte-charge nocturne | Ascenseur | Ascenseur → Tour → Projecteur → Conduit bas → Caisse |
| 20 | La rafale de la Faucheuse | Vent | Vent → Chaîne → Aiguillage → Piston → Pont fragile |
| 21 | Le rythme des presses | Piston | Piston → Tour → Lave montante → Convoyeur → Mur secret |
| 22 | La réserve cachée | Mur secret | Mur secret → Aiguillage → Convoyeur → Interrupteur → Chaîne |
| 23 | Les rails de livraison | Aiguillage | Aiguillage → Projecteur → Tremplin → Ascenseur → Tour |
| 24 | Usine infernale | Convoyeur | Convoyeur → Lave montante → Piston → Mur secret → Aiguillage |
| 25 | La cuve de Tenaille | Lave montante | Lave montante → Tremplin → Pont fragile → Conduit bas → Chaîne |
| 26 | Le refuge des dunes | Cabane | Cabane → Interrupteur → Tour → Projecteur → Convoyeur |
| 27 | L’entrepôt empilé | Caisse | Caisse → Vent → Piston → Convoyeur → Projecteur |
| 28 | Le rebond des étoiles | Tremplin | Tremplin → Conduit bas → Mur secret → Projecteur → Aiguillage |
| 29 | La serrure du réacteur | Interrupteur | Interrupteur → Cabane → Convoyeur → Caisse → Projecteur |
| 30 | Le dernier projecteur | Projecteur | Projecteur → Caisse → Interrupteur → Lave montante → Mur secret |

`ferraille-diversity.js` mesure l'ordre par plus longue sous-séquence commune,
normalisée par la longueur maximale : aucune des 435 paires ne dépasse 50 % ;
les 29 transitions consécutives sont aussi publiées, avec distance des gestes
réellement enregistrés (saut, accroupi, tir vers le haut, attente, marche/tir).
La vedette doit être le premier module réellement rencontré et différer des deux précédentes ;
au moins 14 mécanismes physiques sont exigés. Deux parcours identiques et une
vedette répétée sont des contre-exemples testés. Le score historique garde
sa formule ; son adaptateur inclut désormais les mécanismes physiques,
leurs emplacements et leurs effectifs, en plus des tuiles et objets.
Il passe de 11,2 à 0 ; ce score de configuration reste distinct de la mesure
ordonnée de répétition, qui fait autorité pour les parcours.

F-niv-01 vérifie les seize effets sur états littéraux ; F-niv-02 rejoue 180
parties enregistrées (30 niveaux × graines 28/1/2026 × sans/avec Super-tir),
pour chacun des cinq personnages aux règles identiques, soit 900 victoires.
Les cas Vitest sont séparés par niveau/graine/mode et n'ont aucun oracle
horaire. Calibration hors tests : `scripts/record-ferraille-levels.js`.
F-niv-03 contrôle les 435 paires et les contre-exemples ; F-niv-04 recharge
un véritable état de `dab7aed` après 120 pas, en conservant tous ses champs, puis poursuit la simulation.
Les clés de progression et records sont inchangées ; aucun ancien terrain
sauvegardé ne reçoit de nouveaux pièges lors du chargement.

`npm run test:node` exécute `validate-ferraille-levels.js` et les tests
historiques. Les onze mutations des passes 103 et 104 sont réellement exécutées
et rejetées, avec lignes dans `tests/fixtures/ferraille-validation-104.json`.
Les témoins du catalogue et des contrôles tactiles ont été réenregistrés.
`tests/e2e/ferraille-levels.spec.ts`, écrit pour l'orchestrateur et non exécuté
localement, prévoit les huit captures `ferraille-niveau-<n>` en 390×844 et les
victoires 1/10 au doigt bruité ±12 px, 150 ms, en temps réel sans avance forcée.

### Correction de relecture — passe 52

Le pilote attend que les blindés retournés entrent dans sa ligne de tir au
lieu de sauter puis d'atterrir dessus. Il continue sa course devant une cage
si un kamikaze le poursuit et rétablit sa visée après une esquive de bombe.
Les niveaux 24 et 29 passent sur la graine 460 sans retoucher leur génération.
Les trente victoires restent exigées séparément sur 460 et 28.

| Niveau | Nom dans le HUD | Silhouette | Palette |
| ---: | --- | --- | --- |
| 5 | ÉVENTREUR | Éventail à cinq lames | Ambre / cuivre |
| 10 | PILON | Marteau à deux pieds | Sable / bronze |
| 15 | SCARABOMBE | Scarabée ailé | Vert / forêt |
| 20 | FAUCHEUSE | Faux sur trépied | Lavande / prune |
| 25 | TENAILLE | Canons opposés | Rose / bordeaux |
| 30 | RÉACTEUR | Tour, coque scindée, coque rompue | Cyan, rose, jaune selon phase |

`appearance.ts` décrit les primitives effectivement dessinées, les couleurs,
le cœur et la santé. Chaque boss a une barre de vie. Le cœur vert exposé
clignote ; `prefers-reduced-motion: reduce` garde sa couleur et son ouverture,
sans clignotement ni éclair de bordure. Les six noms, formes, palettes et
ensembles de primitives sont distincts deux à deux (F-RENDER-01).

Les lacunes de relecture sont verrouillées par F-BOSS-04 (éloignement après
franchissement des seuils puis retour), F-BOSS-05 (grenades et faiblesse),
F-BOSS-06 (bombes du 15), F-TERRAIN (hauteurs du sol et direction),
F-STRUCT-02 (explosion et cages) et F-WEAPON-04 (64 px inclus, 64,01 exclus).
Les E2E F-SCENE-01 vérifient les quatre palettes, le déplacement des deux
couches réellement dessinées pour 100 px de caméra et le texte « GRENADES · 7 »
avec un score différent. F-SCENE-02/03 vérifient noms, cœur, vie, phases,
mouvement réduit et descriptions uniques, avec captures des six boss et des
phases du réacteur.

Aucun navigateur, CDP ou Playwright n'est exécuté sur cette machine.
Les scripts `capture-ferraille.js` et `capture-bubble.js` sont supprimés ;
l'orchestrateur exécute `tests/e2e/` et produit les captures sur l'hôte de test.

### Présentation et services

Caméra horizontale avec anticipation vers la droite ; robot doré et turquoise,
ennemis ambre/rose/violet, tirs amis jaunes et hostiles roses. Retours sonores
nommés `jump`, `shot`, `hit`, `bonus`, `shield`, `checkpoint`, `life`, `won`,
`lost`, et éclair de bordure. Écran Prêt, pause P/Échap et bouton commun.
Clavier : flèches ou A/D, ↑/W viser, ↓/S accroupir, Espace/Z saut, X/J tir.
Joystick huit directions de 120 px à gauche, Saut et Tir maintenus de 64 px
à droite, sous le canevas et utilisables à la souris comme au toucher.

Entrée `GameDefinition`, Progression, sauvegarde, panneaux, niveaux, session,
son global et utilitaires tactiles existants réutilisés sans changement de
leur API. Le CSS est limité à `body.ferraille`. Le crochet
`__ARCADE_TEST__.games.ferraille` expose `read`, `loadLevel` et l'objet typé
`scenario('finish'|'danger'|'showcase')`, uniquement avec `?test=1`. Il charge un état
presque terminé, un trou devant le robot, ou un cadrage sur la découverte du niveau ; aucune victoire/défaite forcée.

### Traçabilité de l'oracle

| ID | Moteur seul (`tests/ferraille.test.ts`) | E2E (`tests/e2e/ferraille.spec.ts`) |
| --- | --- | --- |
| F01 | Gravité, saut long/court, limites coyote/tampon | Saut maintenu, prêt et pause |
| F02 | Sol, plafond, mur, grande vitesse, accroupissement | Parcours visible |
| F03 | Huit directions, restriction en vol, plafond saturé | Tir maintenu souris/clavier/tactile |
| F04 | Demi-tour avant bord et mur | Présentation |
| F05 | Échéance, visée et cadence réelle | Présentation |
| F06 | Position sinusoïdale et dérive | Présentation |
| F07 | Bouclier, grâce, trois vies, défaite | Défaite et rejouer |
| F08 | Chute malgré bouclier/grâce | Chute par déplacement réel |
| F09 | Activation et réapparition au point | Cumul, N+1, sauvegarde après reload |
| F10 | Trois caisses, cadence, sockets sûrs et uniques | Indication d'arme |
| F11 | Six boss, trois phases, tirs, dégâts et victoire | Barre au niveau 30 |
| F12 | Enveloppe, 360 terrains, politiques 1/15/30 | Victoire par entrée réelle |
| F13 | Chaque paramètre non décroissant et strict aux extrêmes | Niveau 30 |
| F14 | Graine, snapshots sérialisables, regroupement des pas | Pause figée, nettoyage et crochet absent en production |

Les E2E mesurent le non-chevauchement du canevas avec Pause, joystick,
Saut, Tir, Niveaux et Recommencer, les tailles minimales et l'absence de scroll.
Chromium seul, un worker et fixture commune échouant sur toute erreur JS ou
`console.error`. Captures play/level30/won/lost pour bureau et mobile.


### Corrections de la passe 104

Le piston partage une boîte physique et dessinée : x+16 à x+w−16,
y−78 à y, mortelle uniquement pendant [100,145[ et en intersection sur les
deux axes. Le mur secret plafonne à 30 et n’accorde son bonus qu’à l’ouverture,
y compris après relâchement et reprise du tir.

Les introductions construisent ascenseur, plateforme sur chaîne, cage et
plafond de conduit comme les défis. Les tourelles et sentinelles introductives
sont des cibles inertes. Le pont introductif s’effondre au 36e pas ; un fond
à y=272 empêche toute chute dangereuse. Le pilote traverse chaque introduction
sans perdre de vie ; des attentes de 400 pas vérifient aussi les cycles.

Les distances utilisent exclusivement `moduleTrace` et `actionTrace` produits
par les rejeux : introductions, arènes et nouvelles rencontres après une
réapparition sont comptées, un module généré mais jamais atteint est exclu.
Les six groupes graine/mode respectent le plafond de 50 % avec 16 modules.
Le rapport publié en passe 103 utilisait les modules générés : distance moyenne
consécutive 0,8057471264367819 (gestes 0,5319850360367603). La mesure corrigée
sur rencontres vaut 0,8413382594417077 (gestes 0,5400166029222825), pour la
graine 28 sans Super-tir ; ces définitions différentes sont explicites.
La référence `dab7aed` reste 5 modules et 85,714 % de similarité maximale ;
la version corrigée a 16 modules et 50 %. Le score historique reste à 0.

F-niv-03 fixe les distances en littéraux et isole chaque refus : recouvrement
60 %, seulement 13 modules, vedette absente du premier contact et vedette
répétée. `record-ferraille-legacy.js` utilise `git show dab7aed:<fichier>`
pour matérialiser moteur, niveaux et dépendances historiques dans un dossier
temporaire et produire `tests/fixtures/ferraille-dab7aed.json`.

`ferraille-scene-checks.js` exécute le vrai dessin sous Node avec les ports
graphiques substitués : annonce présente aux pas 0…119 puis retirée à 120,
drapeaux visibles, boîte du piston et démonstrations dessinées. Les 900 rejeux
passent par les moteurs des scènes des cinq personnages ; identité, atlas et
expression de victoire sont vérifiés. `validate-ferraille-levels.js` exécute
les corps de test contre les 11 mutations des passes 103 et 104, toutes tuées
par assertion, et produit `tests/fixtures/ferraille-validation-104.json`.

## Alunir

### Direction visuelle — passes 113 et 116

Le héros pilote désormais un module complet : coque dorée à rivets, verrière
bleue avec le personnage dedans, deux jambes et patins, tuyère et flamme de
poussée bicolore. Le module tourne d'un seul bloc. Les patins restent alignés
sur le bas historique de la coque de collision (y local +12) ; l'habillage
agrandi ne change aucune hitbox. Le HUD utilise les bornes visuelles tournées.
Le monde est projeté verticalement à 0,88 pour réserver plus de place au
régolithe, sans modifier les positions logiques ni les commandes.

Le ciel bleu et violet comprend neuf nébuleuses, trois plans de 32 étoiles,
une Terre à continents et nuages et une ligne de montagnes lointaines.
Le sol sous le terrain collisionnable est plein : cinq couches de régolithe,
44 cratères et des rochers. Les quais suspendus ne sont pas comblés : leur
espace inférieur reste libre. Les plateformes de score portent un multiplicateur
vectoriel ×1/×2 ; la navette a flèches et propulseur. Station à réservoir et
flexible, colis sanglé, météore rocheux incandescent, anneaux de gravité,
arches et courants du tunnel, jets du geyser, glaçons, balise lumineuse et
astronaute casqué distinguent toutes les mécaniques aux coordonnées écrites.
Le décor reste plus discret que les objets jouables et les cercles de mission.

Un seul Graphics réutilisé dessine le monde et le module, sans texture ni objet
Phaser par élément. Les dessins sont déterministes et utilisent les ticks du
moteur ; le mouvement réduit fige la parallaxe et le scintillement de la flamme.
Les cercles de mission, rayons, couleurs et coordonnées historiques conservent
leurs tests de mutations. Moteur, trente situations, solveurs et enregistrements
n'ont aucune modification.

La passe 116 verrouille chaque composant effectivement dessiné : coque au
point du module, verrière, pilote de taille non nulle dans la verrière, deux
patins, réacteur 22×12 et flamme en poussée avec carburant (absente au repos ou
à sec). Les cinq polygones de régolithe suivent les points de terrain avec
quatre décalages de 28 unités et cinq couleurs distinctes ; chacun doit rester
visible. Chaque quai doit avoir un corps peint pour entrer dans le décompte.
Les chiffres de chaque quai sont lus dans les segments Graphics selon une table
indépendante ; les 18 jets du geyser sont contrôlés aux ticks 0, 179, 180, 239
et 240, positions et opacités comprises, sur les trente situations concernées.
Les huit mutations de la relecture sont toutes exécutées et rejetées, ainsi
que les suppressions de coque et de quais. Ces contrôles sont appelés par les
validateurs Node historiques. Aucun oracle d'horloge ni lancement de navigateur.
Le rendu Alunir est inchangé depuis la passe 113 : module 59,06 px, sol plein
21,04 %, 144 à 147 éléments vérifiés aux cinq départs demandés.

Mesures historiques de la passe 113, Node 390×844, Boubou, avant → après. La hauteur initiale était
celle du personnage seul ; la nouvelle hauteur est celle du module complet,
mesurée sur les primitives réellement dessinées, sans flamme au repos.

| Niveau | Hauteur héros/module (px) | Couverture dessinée | Éléments distincts |
| --- | --- | --- | --- |
| 1 | 24,57 → 59,06 | 1,02 → 70,93 % | 51 → 147 |
| 3 | 24,57 → 59,06 | 0,69 → 70,91 % | 48 → 144 |
| 5 | 24,57 → 59,06 | 1,02 → 70,79 % | 50 → 146 |
| 9 | 24,57 → 59,06 | 8,78 → 73,65 % | 48 → 144 |
| 17 | 24,57 → 59,06 | 8,50 → 73,01 % | 48 → 144 |

Sol plein : **0 → 21,04 %** à ces cinq départs (graine 28). Seuils exécutés :
module ≥56 px, sol ≥20 %, éléments ≥10, pour les cinq personnages. Le décompte
conservateur compte les étoiles/cratères effectivement dessinés, les quais,
la Terre et le module ; les formes composant un même personnage ne le gonflent
pas. La couverture est une union raster, sans addition des recouvrements, et
exclut le fond uni. Les valeurs restent des mesures de géométrie, pas une revue
visuelle par navigateur. Le style vectoriel procédural reste moins peint et
moins détaillé que la planche de référence.

### Compagnon et stabilisation — passe 70

Le personnage est dessiné dans la verrière du module et tourne avec lui ; son
animation saut répond à la poussée, puis il célèbre l'atterrissage. La coque de
collision et les seuils historiques restent ceux du polygone décrit ci-dessous.
**Stabilisation** (Espace) : angle immédiatement nul, vitesse latérale multipliée
par **0,5 une seule fois**, vitesse verticale inchangée, puis verrouillage de
l'angle pendant **60 pas fixes = 1 s**, même avec une touche de rotation maintenue.
Deux usages par niveau, **30 unités de carburant** par activation ; impossible
si carburant <30, usage épuisé, état terminal ou stabilisation déjà active.
À 30 unités exactement, elle fonctionne et laisse zéro. Le vent et la gravité
continuent normalement ; il faut toujours piloter la descente. Le HUD montre les
charges et la durée active en secondes ; bouton tactile de 56 px. Aucune
recharge hors rechargement de niveau. Pas de modification de la formule du score.

Passe 106 : les scores de campagne sont désormais ceux des 180 vols de
`tests/fixtures/alunir-campaigns.json` (30 niveaux × trois graines × deux modes).
Le spécial et les cinq identités conservent exactement leurs effets et coûts.
Le guide du premier niveau est uniquement visuel : un trait vertical à l’abscisse
du module, de y−25 à y+18, apparaît pendant le jeu lorsque la plateforme cible
est à moins de 60 pixels sous le module. La coque inclinée se compare à cette
référence verticale ; aucune correction de rotation, vitesse ou collision.
Ce n’est ni un pilote automatique ni le spécial Stable. Le test Node
`fingerChecks` gagne le niveau 1 sans puis avec spécial, commandes maintenues,
latence 150 ms et observation 20 ms ; un angle de 0,225 rad reste inchangé et une
arrivée trop rapide perd. Cela vérifie l’accessibilité au pilote tactile simulé,
sans prétendre mesurer l’apprentissage humain. U06/U07 restent inchangés.


Neuvième jeu original : un module doré doit se poser sur une terrasse turquoise.
Aire logique 360×640, aucun asset externe, aucune marque ni dépendance ajoutée.
Le moteur pur utilise le PRNG partagé ; état, commandes et reliquat temporel
sont copiés dans `snapshot()`, sans référence mutable vers le moteur.

### Physique et contacts

Les valeurs de vitesse sont en **px/pas de 1000/60 ms**, les accélérations en
px/pas². `step(dtMs)` conserve le reliquat ; intégration semi-implicite :
rotation de ±0,025 rad/pas, accélérations, puis déplacement selon la nouvelle
vitesse. L'angle est ramené dans [−π,π]. Rotation gauche et droite simultanées
s'annulent. La gravité pointe vers le bas. Poussée : 0,055 selon
(sin(angle), −cos(angle)), consommation 1 unité/pas ; la dernière fraction de
carburant produit une poussée proportionnelle. À zéro, la chute continue et
ne provoque de défaite qu'au contact d'un terrain ou d'un mur.

La rotation est appliquée à la frontière du pas, puis le polygone convexe à
cinq sommets est translaté continûment. La collision conserve
le polygone historique agrandi ×1,5 : largeur 21 px, hauteur 27 px à angle nul
(sommets locaux d’origine multipliés par 1,5, pied à y+12). Un SAT balayé contre chaque segment
calcule les intervalles d'entrée/sortie sur toutes les normales, puis conserve
le premier contact : aucun saut par-dessus le terrain, même à 1000 px/pas.
Les murs latéraux et supérieur sont fatals, sans repli. Les sommets du module
comptent pour les murs et pour la largeur de la plateforme.

Victoire seulement si tout le polygone tient dans la largeur d'une plateforme,
avec contact sur son altitude, **|vx| ≤ 0,6, vy ≤ 1,2 et |angle| ≤ 10°**.
Les seuils incluent leur valeur limite (tolérance numérique 10⁻¹⁰).
Un contact ailleurs ou au-delà d'un seuil donne la défaite. Les états terminaux
sont gelés. Le module ne perd pas de vie intermédiaire ; `won` et `lost`
passent par les effets communs, donc par les vibrations et le service appareil.

Score entier arrondi : `(carburant restant + précision + temps) × multiplicateur`.
Précision = `100 × max(0, 1 − distanceAuCentre/(largeur/2))` ;
temps = `max(0, 300 − pasÉcoulés/6)`. Aucun score en cas d'échec.

### Trente situations écrites — passe 108

`src/engines/alunir/levels.ts` contient trente descriptions littérales : nom,
idée, vedette, liste de règles, départ, destination, largeur et carburant.
Les douze premières présentent chacune une seule règle avec une arrivée adaptée ;
les suivantes combinent trois règles déjà présentées. Aucune paire ne possède
le même ensemble. Les deux vedettes précédentes ne sont jamais réutilisées.
Les quais sont des segments suspendus solides sur leurs deux faces ; le sol reste
sous eux pour permettre les remontées. Seule l’altitude des deux extrémités externes
varie de moins de 8 px avec la graine. Il n’existe plus de courbe `n/29` pour
les nouveaux niveaux. Gravité ordinaire 0,018 ; poussée et contacts historiques.

| Mécanique | Effet exact et objectif |
| --- | --- |
| choix | Deux arrivées : quai principal ×1, petit quai à x=35, largeur 60, ×2 ; le score utilise le quai touché. |
| grotte | Plafond solide y=250, parois x=20 et x=340 jusqu’à y=465 ; départ dans la galerie à altitude écrite (y=300 au niveau 2) ; contacts balayés fatals. |
| mobile | Quai principal translaté de 0 à 48 px puis retour, période **480 ticks**, vitesse ±0,2 ; largeur 46 (64 sur glace), donc aucune zone de posé commune à toutes les phases ; la coque posée suit le mouvement. |
| ravitaillement | Quai de service de position écrite par niveau, largeur 90 : posé sûr obligatoire, carburant fixé à **1800**, puis poussée pour repartir. |
| cargo | Posé au quai de service pour prendre le colis ; arrivée principale refusée avant la prise ; repartir et livrer. |
| meteores | Trajectoire écrite x=−100+1,2×(tick modulo **600**), y=310 ; segment vertical de demi-hauteur 8 balayé en mouvement relatif ; contact fatal, téléport de boucle non balayé. |
| gravite | Zone fermée x∈[110,300], y∈[180,440] : gravité **0,009**, ailleurs 0,018. |
| tunnel | Bande fermée y∈[240,380] : accélération horizontale **0,0015**, ailleurs zéro. |
| geyser | Zone fermée x∈[130,230], y∈[300,480] : poussée verticale **0,012** pendant les **180** premiers ticks de chaque période de **240**. |
| balise | Passer à distance ≤**38** du centre écrit par niveau (180,350 au niveau 10) avant l’arrivée ; sans validation le posé est un échec. |
| secours | Recueillir **en vol** l’astronaute à distance ≤**28** du centre écrit par niveau (90,370 au niveau 11), avec **|vx| ≥ 0,1 et |vx| > |vy|**, puis le ramener ; une descente verticale est refusée. Aucun posé intermédiaire nécessaire. |
| glace | Après un contact sûr, vx est multipliée par **0,94** à chaque tick ; glissement, sortie de quai fatale ; victoire à |vx|≤**0,02**. |

Les cercles de transit jaunes (rayon fermé **22 px**) sont des objectifs visibles
à franchir dans l’ordre après le service, la balise et le secours éventuels.
Le cercle courant porte une croix ; les passages validés deviennent verts.
Un cercle dans la colonne du geyser ne valide que pendant son repos, ticks
**180 à 239** modulo **240**. Une arrivée sûre sans le parcours reste perdante.
Les passages sont conservés dans les événements sérialisés, sans pseudo-mécanique dans la mesure des rencontres. Le snapshot porte désormais la version de catalogue.

Les règles s’appliquent aussi au pilote, sans raccourci : il vise le quai de
service ou l’astronaute avant le retour, passe la balise, compense les champs,
suit le quai mobile et attend au-dessus de la trajectoire des météores.
Toutes les victoires de service passent les mêmes seuils que l’arrivée.
Le posé sur la glace doit déjà être sûr ; la friction ne sauve aucun contact.

| N° | Nom | Vedette | Trajet imposé |
| --- | --- | --- | --- |
| 1 | Port des possibles | choix | Départ (222,85), descente vers le quai central ou le petit quai gauche ×2. |
| 2 | Sous la voûte | grotte | Départ gauche dans la grotte ; descendre au cercle (100,440), traverser vers (265,420), se poser à droite. |
| 3 | Le pont navette | mobile | Départ haut droit en dérive gauche ; intercepter le quai étroit oscillant sur 48 px. |
| 4 | La halte des réservoirs | ravitaillement | Descente rapide à gauche ; plein à (90,400), puis traversée et arrivée tout à droite. |
| 5 | Courrier lunaire | cargo | Départ bas droit ; prendre le colis à (90,480), remonter et livrer au quai haut droit y=280. |
| 6 | Les étoiles filantes | meteores | Départ haut droit à vx=−1, vy=2 ; freiner et traverser les météores vers le quai gauche. |
| 7 | Mer de plume | gravite | Départ haut gauche en dérive droite ; traverser la gravité légère par (145,220) et (270,410). |
| 8 | Le souffle du col | tunnel | Départ droit en descente ; entrer à (290,300), traverser le vent vers (80,320), puis sortir à gauche. |
| 9 | Fontaine de poussière | geyser | Départ bas gauche ; franchir (175,410) pendant le repos du geyser, détour droit (270,340), revenir au centre. |
| 10 | Le phare du silence | balise | Départ haut droit ; survoler la balise (180,350), puis redescendre vers le quai gauche. |
| 11 | Un ami dans la nuit | secours | Approche latérale depuis la droite (310,410), vitesse horizontale dominante ; recueillir à (90,370), revenir au quai droit. |
| 12 | Le lac miroir | glace | Départ gauche en dérive rapide ; freiner au-dessus du lac central, puis attendre la fin du glissement. |
| 13 | Marché souterrain | choix | Départ droit sous la voûte ; balise gauche (80,410), retour au cercle droit (275,470), choix du quai. |
| 14 | La poste errante | cargo | Départ haut droit ; prendre le colis en bas à droite (270,530), remonter au tunnel (170,300), rattraper la navette gauche. |
| 15 | Puits des comètes | meteores | Départ haut gauche ; plein à (70,410), remontée dans la zone légère vers (265,220), retour sous les comètes à droite. |
| 16 | Le refuge givré | secours | Départ droit dans la grotte ; secours à (270,450), traversée vers (90,360), posé glacé à gauche. |
| 17 | Le signal des sources | balise | Départ haut gauche en chute ; balise centrale, passage (180,430) au repos du jet, navette droite. |
| 18 | Les quais du blizzard | tunnel | Départ haut gauche en dérive ; traverser le tunnel de (70,270) à (280,350), choisir le quai sous les météores. |
| 19 | Cargo de cristal | glace | Départ droit ; cargo à (270,495), remontée par la zone légère (170,220), livraison sur la glace haute à gauche y=260. |
| 20 | La citerne cachée | ravitaillement | Départ droit sous la voûte ; plein tout à gauche (65,465), traverser le jet au repos (180,390), détour droit (270,320). |
| 21 | Le bac des rescapés | mobile | Départ haut gauche en chute rapide ; secours en vol à droite (280,390), retour à la navette gauche sous les comètes. |
| 22 | Les trois phares | gravite | Départ haut droit en dérive gauche ; balise haute gauche (80,250), traversée légère vers (270,420), choix du quai. |
| 23 | La galerie postale | grotte | Départ gauche dans la grotte ; cargo au fond (75,515), remontée par (180,425) et (180,400), livraison haute droite y=330. |
| 24 | L’ambulance du vent | secours | Départ haut droit ; plein droit (270,430), secours gauche (65,305), contre-traversée du tunnel vers (280,270), arrivée gauche. |
| 25 | La patinoire céleste | glace | Départ bas droit en dérive gauche ; remontée au cercle (65,230), retour (290,380), intercepter la glace mobile centrale. |
| 26 | Les deux citernes | geyser | Départ gauche ; plein à (65,420), passage du geyser au repos (175,445), détour (280,380), choix du quai. |
| 27 | L’adresse des étoiles | cargo | Départ haut droit en chute ; cargo à (270,520), remontée vers la balise haute gauche (75,210), livraison gauche. |
| 28 | Le phare englouti | balise | Départ droit dans la galerie ; balise basse droite (270,430), contre-traversée du tunnel vers (70,315), retour (180,365), quai gauche. |
| 29 | Le dernier plein | ravitaillement | Départ haut gauche en dérive droite ; plein au fond droit (275,530), remontée et interception de la glace mobile gauche y=430. |
| 30 | L’aube des retrouvailles | gravite | Départ droit dans la zone légère ; secours bas gauche (65,420), retour au geyser au repos (170,340), détour droit (285,450), arrivée droite. |

La mesure spécifique `scripts/alunir-diversity.js` compare les **435** paires.
Passe 107 : la similarité est le maximum du Jaccard ordonné des mécaniques
rencontrées et de la proportion des **commandes réelles identiques au même pas**,
rapportée à la durée du vol le plus long. Une commande comprend poussée, gauche
et droite ; les longueurs des suites compressées comptent intégralement,
y compris la roue libre. Les étiquettes de mission ne participent plus au calcul
des commandes. Le moteur n’émet plus les pseudo-actions automatiques « suivre »,
« descendre », « éviter », « compenser », « traverser » et « surfer » ; le harnais
observe les situations physiques séparément des transitions de mission.
Seuils littéraux : similarité ≤ **50 %**, au moins **10** règles et vedette
différente des deux précédentes. Tests négatifs : 60 %, neuf règles, vedette
répétée, mêmes commandes sous des étiquettes différentes ; 50 % exactement accepté.

La mesure des commandes et ses seuils de passe 107 restent inchangés.
Les 180 vols sont réenregistrés aux graines **28, 1, 2026**, sans et avec spécial.
Le pilote corrige position et vitesse, dégage les quais avant de tourner,
remonte hors de leur emprise avant l’approche et suit la vitesse de la navette
d’après sa phase observée. Il observe les météores des deux côtés de leur
trajectoire, sans accès à un futur aléatoire. Les niveaux 1 et 10 conservent le contrôleur
tactile éprouvé avec **150 ms** de latence. La réserve écrite du niveau 10
(**1533**) maintient aussi le témoin de score tactile **1207** du validateur
partagé, qui reste inchangé. Budget de rejeu : **4000 ticks**.

| Mesure sur 435 paires | Passe 107 | Passe 108 |
| --- | --- | --- |
| Paires de commandes > 50 % | 64 | 0 |
| Maximum des commandes | 95,1168 % | 46,3077 % |
| Paire du maximum des commandes | 4 / 5 | 7 / 22 |
| Maximum global (commandes ou mécaniques) | 95,1168 % | 50 % |
| Commandes communes, niveaux 4 / 5 | 95,1168 % | 26,0030 % |

Le maximum global reste **50 %** pour les rencontres de mécaniques
(paires 13/22, 13/28, 20/23, 21/25, 25/29). Le rapport porte **valid=true**,
**12 mécaniques** et aucune vedette réutilisée parmi les deux précédentes.
La campagne des compagnons n’est modifiée que pour sa partie Alunir.
Les témoins historiques de migration, les seuils et corps U06/U07 ainsi que
les douze mutations de passe 107 restent conservés et vérifiés sous Node.
A-niv-05 ajoute des témoins indépendants pour les départs, les remontées cargo
de **180 px** ou plus, l’ordre et le rayon des passages, la phase du geyser,
l’arrivée directe refusée et la reprise du trajet après sauvegarde.

`loadState` accepte les vrais snapshots historiques, terrain et reliquat inclus.
Un état sans métadonnées de mission conserve ses anciennes forces interpolées
et son terrain, sans lui imposer les nouveaux objectifs. Il remplace aussi la
mission et les événements courants : un ancien indice d’amarrage ne survit pas.
Tout indice d’amarrage hors des plateformes restaurées est remis à −1.
Les snapshots suivants conservent cette migration ; charger ensuite un niveau
réactive ses mécaniques **avant** de calculer son altitude initiale (niveau 2 : 300 ; autres grottes : altitude écrite).
`record-alunir-head.js` lit **git show e1f09c8:src/engines/alunir/engine.ts** sans
changer de branche. Il reproduit `alunir-head.json` (niveau 10, tick 120), ou,
avec `--gust`, `alunir-legacy-gust.json` (niveau 21, tick 100, rafales actives).
Les deux témoins contiennent une continuation exacte de 40 pas ; ils sont testés
après un véritable amarrage au ravitaillement, puis suivis d’un vol de grotte.
Progression et records gardent leurs clés et leur format.

### Corrections et témoins — passe 110

Les snapshots avec `mission` et `legacy: false` de passe 107 sont migrés
explicitement vers `catalogueVersion: 107`. Le catalogue historique est figé dans
`levels-107.ts` : anciens objectifs, positions balise/secours, amplitude mobile
12 px, terrain et issue sont conservés ; aucun cercle nouveau n’est imposé.
Sans version, la géométrie historique inclut les quais dans sa ligne de sol
(au moins quatre points), contrairement aux deux points du sol de passe 108.
Les nouveaux snapshots portent `catalogueVersion: 108` ; les états de passe 108
sans version restent reconnus. Les restaurations partielles gardent la version courante.

`scripts/validate-alunir-107.js` extrait réellement les deux modules historiques
par `git show eecddb7:<fichier>`, produit des snapshots des trente niveaux,
compare leurs continuations pas à pas et vérifie une seconde sauvegarde.
Le témoin adverse (niveau 2, x=185, y=497,9, vy=0,982) garde `won`.
L’ancien secours vertical garde son ancienne règle. Le pilote actuel se place
latéralement avant le secours ; les 180 vols sont réenregistrés, seule la partie
Alunir de la campagne commune change. Mesure sur commandes inchangée :
**0/435 paires >50 %, maximum commandes 46,3077 % (7/22), maximum global 50 %,
12 mécaniques**, aucune vedette répétée parmi les deux précédentes.

Les vingt mutations sont réellement exécutées sous Node :

| Mutation | Assertion qui la tue |
| --- | --- |
| Navette immobile | `mechanicChecks` : x=156 au tick 120 |
| Plein supprimé | `mechanicChecks` : carburant=1800 après service |
| Météore non fatal | `mechanicChecks` : collision au tick 233 perdante |
| Borne haute gravité ouverte | `mechanicChecks` : champ fermé à (300,440) |
| Borne haute tunnel ouverte | `mechanicChecks` : vent à y=380 |
| Borne droite geyser ouverte | `mechanicChecks` : poussée à (230,480) |
| Rayon balise ouvert | `mechanicChecks` : distance exacte 38 |
| Rayon secours ouvert | `mechanicChecks` : distance exacte 28, vitesse latérale |
| Arrivée sans secours acceptée | `mechanicChecks` : arrivée sûre sans secours perdante |
| Rafales historiques supprimées | `migrationChecks` : continuation exacte du témoin avec rafales |
| Idée du niveau masquée | `hudChecks` : idée visible aux ticks 0/1/119 |
| Catalogue dupliqué | `measureAlunir` : duplication refusée, similarité=1 |
| Cercle avant service | `prerequisiteChecks` : niveau 14, service faux/vrai |
| Cercle avant balise | `prerequisiteChecks` : niveau 13, balise fausse/vraie |
| Cercle avant secours | `prerequisiteChecks` : niveau 16, secours faux/vrai |
| Rayon visible 12 | `objectiveDrawingChecks` : appels strokeCircle rayon 22 |
| Croix inversée | `objectiveDrawingChecks` : deux traits sur le seul cercle courant |
| Couleurs inversées | `objectiveDrawingChecks` : jaune avant passage, vert après |
| Balise aux anciennes coordonnées | `objectiveDrawingChecks` : coordonnées du catalogue, dont niveau 13 |
| Tête du secours aux anciennes coordonnées | `objectiveDrawingChecks` : coordonnées du catalogue, dont niveau 16 |

Le validateur de scène utilise le vrai `draw()` et un port Graphics enregistré,
aux trente niveaux, avant et après validation du premier cercle. Les négatifs
de secours couvrent vitesse nulle, descente verticale et vitesse verticale dominante.

### Commandes et intégration

↑/W : poussée ; ← →/A D : rotation à maintenir. Une seule rangée tactile :
↺ et ↻ à gauche (56 px), Poussée (76×64 px) et Stable (56 px) à droite. La zone utile exposée
par le crochet est tout le canevas ; aucun bouton ne la recouvre.
Le HUD affiche le nom et l’idée pendant les **120** premiers ticks (2 s de jeu),
puis retire ces deux textes à partir du pas 120. Le numéro du niveau reste affiché. Charges, carburant, vitesses et angle restent visibles.
Police 11 px, retour à la ligne à 340 px ; y=10, ou y=550 si le haut du module
passe au-dessus de y=85. Champs, plafond, balise, astronaute, cargo, quais et
météores sont rendus à leurs coordonnées physiques.
Le crochet Alunir expose aussi `bounds()` (polygone avec contour et HUD).
Le parcours E2E convertit ces boîtes vers le rectangle écran du canevas et
vérifie leur absence d’intersection sur bureau comme sur mobile.
Prêt, pause, menu mobile, niveaux, panneaux, sauvegarde `arcade-lab:alunir:v1`
et son global utilisent les services existants **sans modification de src/shell**.
Effets synthétisés `thrust`, `life`, `won`, `lost` ; pas de vie intermédiaire.

Avec `?test=1`, `__ARCADE_TEST__.games.alunir` expose `read`, `loadLevel`,
`advance`, `hudText`, `usefulArea` et `scenario('finish'|'danger'|'showcase')`.
`advance` fige l'horloge automatique jusqu'au prochain chargement, respecte
pause et sélection, valide le temps puis synchronise les panneaux.
Les scénarios placent un module trois pixels au-dessus du contact : la vitesse
1,21 demande une vraie poussée pour gagner ; la vitesse 4 reste fatale.
Ils ne changent aucun seuil, collision, carburant ni condition de victoire.

### Oracle et vérifications déléguées

| ID | `tests/alunir.test.ts` |
| --- | --- |
| U01 | Gravité, intégration semi-implicite, reliquat du pas fixe |
| U02 | Direction de poussée, consommation, dernière fraction |
| U03 | Vitesse angulaire, deux signes, annulation simultanée |
| U04 | Vent intégré, constant puis rafales bornées à graine |
| U05 | Premier contact à grande vitesse et bord du polygone |
| U06 | Seuils littéraux 0,6 / 1,2 / 10°, égalité gagnante et excès perdant, deux signes |
| U07 | Excès de vitesse/angle, hors plateforme, trois murs |
| U08 | Réservoir vide : aucune poussée, chute puis contact fatal |
| U09 | Termes du score, multiplicateur, score réel et gel terminal |
| U10 | Politique simulée sur les trente niveaux complets |
| U11 | Trente plans écrits, 90 terrains structurés et répétables |
| U12 | Entrées identiques, cadences regroupées, graine, sérialisation, temps invalides |

`tests/e2e/alunir.spec.ts` couvre bureau et mobile : vraie poussée maintenue,
victoire puis Niveau suivant, progression persistante après reload, défaite
puis Rejouer le niveau, pause et quatre captures play/level30/won/lost.
Sur mobile, seules les entrées tactiles sont utilisées. La fixture commune
refuse toute erreur JS/console. M01–M04 incluent Alunir aux trois dimensions
390×844, 360×640 et 390×600. A11 inclut son horloge manuelle et V01–V08
comptent désormais neuf vignettes.

Vitest et Playwright sont écrits et relus ici, mais leur exécution appartient
à l'orchestrateur. Aucun résultat de ces suites n'est présumé.


Passe 106 : `tests/alunir-levels.test.ts` et `scripts/validate-alunir.js` couvrent
**A-niv-01** (douze effets littéraux), **A-niv-02** (180 rejeux exacts),
**A-niv-03** (mesure recalculée depuis les rencontres et négatifs isolés),
**A-niv-04** (vrai état de HEAD et reprise sérialisée). U06/U07 restent inchangés
et sont exécutés directement par Node. Passe 107 : douze mutations effectivement
rejetées par les mêmes corps d’assertions :

| Mutation | Test qui la tue sous Node |
|---|---|
| Quai mobile figé | A-niv-01 : tick 120, x=156 (course de passe 108) |
| Ravitaillement sans effet | A-niv-01 : carburant=1800 après service |
| Deux niveaux identiques | A-niv-03 : catalogue dupliqué, similarité=1 |
| Météores inoffensifs | A-niv-01 : collision au tick 233, défaite |
| Gravité : y=440 exclu | A-niv-01 : vitesse verticale=0,009 à (300,440) |
| Tunnel : y=380 exclu | A-niv-01 : vitesse horizontale=0,0015 à (180,380) |
| Geyser : x=230 exclu | A-niv-01 : poussée=0,012 à (230,480) |
| Balise : rayon 38 exclu | A-niv-01 : balise validée à (218,350) |
| Secours : rayon 28 exclu | A-niv-01 : astronaute recueilli à (118,370) |
| Victoire sans secourir | A-niv-01 : arrivée sûre à (260 ; 517,9), mission refusée |
| Rafales historiques supprimées | A-niv-04b : comparaison exacte du vrai témoin niveau 21 |
| Idée du niveau jamais affichée | A-niv-HUD : idée présente aux pas 0,1,119 |

Validation passe 108 : lint, typecheck, build et **40/40 validateurs Node** verts,
sous le verrou commun ; suite Node séquentielle en **166,26 s**. Aucun navigateur
ni Vitest exécuté. Les campagnes des compagnons ne changent que dans leur partie Alunir.

`tests/e2e/alunir-levels.spec.ts`, écrit pour l’orchestrateur et non exécuté ici,
fixe **390×844**, capture `alunir-niveau-1`, `-5`, `-10`, `-15`, `-20`, `-25`,
`-30`, puis gagne 1 et 10 au doigt bruité ±12 px avec latence de **150 ms**,
entrées tactiles uniquement, temps réel et **sans advance()**. `FingerClock`
borne chaque vol à **90000 ms de jeu** ; aucun oracle d’horloge murale.

## Caisses

### Compagnon et tirage — passe 70

Le personnage remplace le pousseur sur sa case, marche et regarde dans le sens
du déplacement. **Tirer** (ou Espace), puis une direction vers la caisse, fait
reculer le héros d'une case et ramène la caisse sur l'ancienne case du héros.
Un seul tirage réussi par niveau ; mur derrière, caisse derrière ou absence de
caisse devant : refus sans consommation. Un tirage compte **un pas, zéro poussée**.
Annuler restaure la position et les compteurs mais ne rembourse jamais la charge ;
Recommencer la restaure. L'effet dure 800 ms, sans recharge additionnelle. Le HUD
montre charge, sélection directionnelle et records de poussées sans/avec tirage.
Six boutons de 56 px occupent 356 px à 390 px de largeur ; sous 380 px, la colonne
droite passe sur deux lignes pour préserver chaque cible tactile.

`solve(board, objective, true)` ajoute l'arête de tirage et sa disponibilité à
la clé A*. Les anciennes signatures et recherches sans tirage sont conservées.
La variante optionnelle utilise une borne de Manhattan diminuée d'une unité
et ne rejette pas les cases récupérables par tirage. Les nouveaux minima en
`records.ts` sont recalculés par le validateur et tous les témoins sont rejoués.
Les minima en pas et en poussées sont optimisés séparément.

| Niveau | Poussées sans / avec | Pas sans / avec |
| --- | --- | --- |
| 1 | 1 / 0 | 2 / 2 |
| 2 | 2 / 1 | 5 / 5 |
| 3 | 2 / 1 | 8 / 8 |
| 4 | 2 / 1 | 6 / 6 |
| 5 | 2 / 1 | 9 / 9 |
| 6 | 4 / 3 | 10 / 10 |
| 7 | 4 / 3 | 12 / 12 |
| 8 | 4 / 3 | 14 / 14 |
| 9 | 4 / 3 | 15 / 15 |
| 10 | 4 / 3 | 14 / 14 |
| 11 | 6 / 5 | 16 / 16 |
| 12 | 6 / 5 | 18 / 14 |
| 13 | 6 / 5 | 19 / 19 |
| 14 | 7 / 6 | 10 / 10 |
| 15 | 7 / 6 | 11 / 11 |
| 16 | 8 / 7 | 14 / 12 |
| 17 | 8 / 7 | 11 / 11 |
| 18 | 10 / 7 | 17 / 17 |
| 19 | 10 / 9 | 15 / 15 |
| 20 | 10 / 9 | 20 / 20 |
| 21 | 11 / 10 | 21 / 21 |
| 22 | 11 / 10 | 23 / 23 |
| 23 | 11 / 10 | 23 / 23 |
| 24 | 11 / 10 | 20 / 20 |
| 25 | 11 / 10 | 21 / 21 |
| 26 | 12 / 11 | 20 / 20 |
| 27 | 12 / 11 | 21 / 19 |
| 28 | 13 / 12 | 21 / 21 |
| 29 | 13 / 12 | 19 / 19 |
| 30 | 13 / 12 | 19 / 19 |


Dixième jeu, `caisses`, puzzle au tour par tour (`realtime: false`). Aucun
hasard de règle, aucune défaite, aucun écran Prêt ni pause. Les effets nommés
`move`, `push`, `undo`, `won` utilisent le son commun ; la victoire utilise donc
également la vibration commune. Le verrou écran et les menus restent ceux du
socle. Aucun fichier de `src/shell` modifié.

### Règles et présentation

Un pas cardinal traverse le sol libre ; une seule caisse peut être poussée si
la case suivante est libre. Les déplacements ordinaires ne tirent pas. Toutes les caisses sur des cibles
terminent le niveau. Les entrées directionnelles sont alors gelées ; Annuler
reste possible et restaure le cumul d'avant le niveau. Le panneau de
progression propose de poursuivre ou rejouer. Annulation illimitée des pas
réussis, avec copie exacte des compteurs, caisses et position. Recommencer
restaure le niveau, sans annuler le déblocage déjà acquis.

Score = `max(1, round(1000 × minimumSteps / moves))` à la victoire, zéro avant.
Le record affiché est le minimum de **poussées**, pas de pas. L'impasse est un
simple avertissement : caisse hors cible ayant un mur sur un voisin vertical
et un voisin horizontal. Cette détection ne prétend pas repérer les blocages
entre caisses. Aucun panneau de défaite ni bouton « Rejouer le niveau » pour
une défaite inexistante : le menu propose Recommencer et ↶ reste disponible.

Flèches ou QSD / **Maj+Z** pour monter ; W/A aussi acceptés. **Z** sans Maj
ou Retour arrière annule ; R recommence. Ce choix explicite résout le conflit
entre ZQSD et Z pour annuler. Glisser déclenche un pas ; quatre boutons
fléchés, ↶ et Tirer sont alignés, chacun 56×56 px (disposition étroite ci-dessus).
Recommencer est dans ☰ sur mobile pour tenir à 360 px ; sur bureau il est dans
le menu commun. Aucun contrôle ne recouvre le canevas 360×640, qui est la zone
utile exposée. Les six boutons prennent 356 px avec leurs espacements à 390 px.

### Trente ateliers (passe 403)

`levels.ts` garde onze ateliers historiques (figés par l'A* exact, mêmes
records) et ajoute dix-neuf ateliers à mécanisme. Une mécanique neuve arrive tous
les quatre à cinq ateliers, puis revient combinée ; les ateliers 5, 10, 15, 20
et 25 sont des **défis à budget de pas** ; le 30 combine tout.

| Atelier | Nouveauté | Symbole | Règle exacte (`src/engines/caisses/rules.ts`) |
| --- | --- | --- | --- |
| 4 | **Glace** | `~` | Une caisse poussée sur la glace continue dans le même sens tant que la case suivante l'accepte ; elle s'arrête sur la première case hors glace ou devant un obstacle ; un trou l'avale. Le joueur ne glisse pas. |
| 5 | **Budget** | — | `budget` pas au plus (min + max(4, 30 %)) ; au budget atteint sans victoire, la tentative est perdue ; Annuler reprend. |
| 8 | **Sens unique** | `< > ^ v` | On n'entre sur la case que dans le sens de la flèche, joueur comme caisse. |
| 12 | **Bouton et porte** | `o`, `\|` | Une porte exige au moins un bouton. La porte est franchissable tant qu'une caisse ou le joueur presse un bouton (évalué avant le pas), ou tant que quelque chose occupe le seuil. |
| 16 | **Trou** | `O` | Infranchissable à pied ; une caisse poussée dedans le comble et disparaît ; la case devient du sol. Les salles à trou ont une caisse de plus par trou. |
| 21 | **Plots** | `1`, `2` | Le joueur qui arrive sur un plot ressort sur l'autre s'il est libre ; les caisses ne voyagent pas. |
| 26 | **Couleurs** | `r`, `R` | Une caisse rouge ne compte que sur une cible rouge, une dorée que sur une dorée. |

Le tirage optionnel (passe 70) reste valable partout : il ne fait jamais glisser
la caisse. L'analyseur accepte les nouveaux symboles, refuse un plot seul ou répété, et exige assez de caisses de chaque couleur (égalité stricte sans trou).

Les dix-neuf ateliers à mécanisme ont été trouvés par une recherche hors ligne
(salles aléatoires résolues, **chaque mécanisme présent utilisé par le témoin
minimal en pas** — glissade, flèche franchie, seuil de porte franchi, trou
comblé, téléportation — et, sans trou, salle neutralisée invalide, insoluble ou
à au moins 4 pas d'écart), puis figés en littéraux ; `usage()` (rules.ts) est
l'oracle de C21 et de `validate-caisses.js`. `solve()` choisit l'A* historique pour une salle sans mécanisme et
une recherche exacte 0-1 en largeur sur les positions complètes (joueur, caisses
et couleurs, trous comblés, tirage utilisé) sinon ; chaque arête est le `push`
ou le `pull` du moteur. `scripts/validate-caisses.js` vérifie les records
exacts, le budget en positions visitées (≤ 300 000, sans horloge) et l'effet de
chaque mécanisme ; `scripts/record-caisses.js` écrit les quatre preuves par
atelier (`tests/fixtures/caisses-campaign.json`) et `records.ts`. Vitest rejoue
ces preuves et ne re-résout que les salles historiques. Sur un défi, une preuve
plus longue que le budget se termine en défaite au budget (vérifié tel quel).

Diversité mesurée (`scripts/caisses-diversity.js`) : 56,9 → **24,1**, un seul
couple voisin sous le seuil de clone (ateliers 1-2), plus long écart sans
nouveauté 4. Partie au doigt : ateliers 1 et 14 (glace et flèches).

### Mesure Node, passe 34

Commande reproductible, sans Vitest ni Playwright ni nouvelle dépendance :
`node --import ./scripts/ts-loader.js scripts/validate-caisses.js`.
Le chargeur utilise le compilateur TypeScript déjà installé dans le dépôt.
Le script vérifie C08/C09, les deux minimums, rejoue les deux solutions dans
le moteur, vérifie les dimensions, C10b (salles historiques) et, depuis la passe 403, un budget en positions visitées au lieu du budget de 1 s par niveau
pour les deux recherches cumulées. Les durées dépendent de la machine.

| Niveau | Caisses | Pas min. | Poussées min. | visited | Durée ms¹ | Virages | Détours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | 1 | 2 | 1.8 | 0 | 0 |
| 2 | 1 | 5 | 2 | 3 | 0.9 | 1 | 1 |
| 3 | 1 | 8 | 2 | 3 | 0.7 | 1 | 1 |
| 4 | 1 | 6 | 2 | 3 | 0.6 | 1 | 1 |
| 5 | 1 | 9 | 2 | 3 | 45.0 | 1 | 1 |
| 6 | 2 | 10 | 4 | 5 | 2.4 | 1 | 2 |
| 7 | 2 | 12 | 4 | 5 | 2.9 | 2 | 2 |
| 8 | 2 | 14 | 4 | 5 | 2.0 | 1 | 2 |
| 9 | 2 | 15 | 4 | 5 | 4.1 | 2 | 3 |
| 10 | 2 | 14 | 4 | 5 | 1.5 | 1 | 2 |
| 11 | 3 | 16 | 6 | 7 | 3.4 | 2 | 3 |
| 12 | 3 | 18 | 6 | 7 | 5.2 | 1 | 3 |
| 13 | 3 | 19 | 6 | 8 | 5.2 | 1 | 3 |
| 14 | 3 | 10 | 7 | 10 | 2.0 | 1 | 3 |
| 15 | 3 | 11 | 7 | 15 | 0.8 | 3 | 4 |
| 16 | 4 | 14 | 8 | 27 | 7.3 | 3 | 4 |
| 17 | 4 | 11 | 8 | 30 | 2.0 | 2 | 3 |
| 18 | 4 | 17 | 10 | 31 | 10.3 | 2 | 4 |
| 19 | 4 | 15 | 10 | 136 | 46.1 | 2 | 8 |
| 20 | 4 | 20 | 10 | 284 | 26.2 | 4 | 7 |
| 21 | 5 | 21 | 11 | 102 | 19.4 | 1 | 4 |
| 22 | 5 | 23 | 11 | 104 | 26.6 | 2 | 7 |
| 23 | 5 | 23 | 11 | 143 | 18.4 | 1 | 3 |
| 24 | 5 | 20 | 11 | 195 | 115.2 | 1 | 3 |
| 25 | 5 | 21 | 11 | 218 | 24.6 | 4 | 7 |
| 26 | 6 | 20 | 12 | 208 | 26.9 | 1 | 4 |
| 27 | 6 | 21 | 12 | 233 | 88.9 | 1 | 4 |
| 28 | 6 | 21 | 13 | 210 | 53.4 | 1 | 5 |
| 29 | 6 | 19 | 13 | 251 | 30.8 | 1 | 4 |
| 30 | 6 | 19 | 13 | 779 | 86.0 | 2 | 4 |

Moyennes visited : 2.8 → 5 → 9.4 → 101.6 → 152.4 → 336.2.
¹ Deux recherches exactes (poussées puis pas), hors chargement TS.

### Solveur et oracle

A* minimise les poussées. Chaque nœud contient les caisses triées et la plus
petite case de la région accessible au joueur sans poussée : ses déplacements
à pied sont reconstruits par BFS. Un parcours inverse depuis les cibles
marque les cases où une caisse peut théoriquement atteindre une cible ; les
autres destinations de poussée sont éliminées. La somme des distances de
Manhattan à la cible la plus proche est une borne admissible, même si plusieurs
caisses partagent la même cible dans cette estimation. Priorité aux nœuds plus
profonds à borne égale, puis au dernier inséré ; un tas binaire évite de trier
toute la frontière. Les meilleures distances par état sont conservées.
En mode pas, la clé conserve la position exacte du joueur et chaque arête
coûte la marche BFS plus la poussée. Une affectation minimale des caisses à
des cibles distinctes, avec distances de poussée inverses ignorant les autres
caisses, fournit une borne admissible plus forte.
Aucune limite arbitraire ne transforme un abandon en preuve d'insolubilité.
C08/C09 exigent une solution réelle, rejouée via `input`, et l'égalité du
minimum calculé au minimum stocké, avec une mesure inférieure à 1 s par niveau.

| Oracle | Preuve Vitest `tests/caisses.test.ts` |
| --- | --- |
| C01 | Pas, murs et absence de changement sur mouvement interdit |
| C02 | Une caisse poussée, deux caisses et mur refusés |
| C03 | Départ en sens inverse sans traction |
| C04 | Toutes les cibles requises, victoire et gel directionnel |
| C05 | Retour exact de chaque annulation, victoire incluse, reprise initiale |
| C06 | Compteurs, détour pénalisé, score optimal sur les 30 témoins |
| C07 | Analyse des 30 grilles et rejets de données malformées |
| C08 | Solveur, solution de chacun des 30 ateliers rejouée dans le moteur |
| C09 | Minimum calculé = minimum stocké pour chacun des 30 ateliers |
| C10 | Caisses et minimum de poussées non décroissants, extrêmes distincts |
| C10b | Virage d’une caisse et détour entre poussées, niveaux 4–30 |
| C10c | Moyenne de visited non décroissante par palier de cinq |
| C11 | Coin hors cible, cible exemptée, annulation et niveau insoluble |
| C12 | Entrées déterministes, graine, cadence fixe, copies sérialisables |

`__ARCADE_TEST__.games.caisses` expose read/loadLevel/hudText/usefulArea.
Pas de `advance` nécessaire pour ce jeu au tour par tour. Les scénarios typés
`finish` (un pas légal du niveau 1) et `corner` (petit plateau validé ordinaire)
ne modifient aucune règle. Les E2E gagnent le **niveau 1 complet** par deux
vraies entrées, vérifient Niveau suivant, sauvegarde après rechargement,
impasse récupérable, annulation exacte, recommencement et niveau 30. Sur mobile
seuls boutons tactiles et glisser CDP sont utilisés. La capture `caisses-lost`
montre l'impasse, puisque la règle interdit une défaite. Une seconde E2E
vérifie le glisser et l'interdiction d'entrée lorsque ☰ est ouvert.
M01–M04 incluent Caisses aux trois dimensions demandées. V01–V08 comptent dix
vignettes. La démo rejoue une politique déterministe de poussées légales au
niveau 3 ; la vignette Canvas dessine le plateau réel, sans asset externe.

Vitest et Playwright ne sont pas exécutés sur cette machine : l'orchestrateur
doit vérifier les preuves, les budgets de temps et les captures sur les deux
projets. Aucun résultat d'exécution de ces suites n'est présumé.


## Traverse

### Compagnon et bond — passe 70

Le personnage remplace le carré du traverseur, avec face/profil, saut et réactions.
Son dessin vectoriel de 40 px reste dans sa case de 38 px (contours du corps),
avec les effets du spécial autour. **Bond** (Espace) réserve une seule charge par
vie, immédiatement, puis saute de deux rangées vers le haut au prochain quantum.
La case intermédiaire est survolée ; la destination subit les deux contacts et
le transport ordinaires. Aucun bouclier. Une arrivée dans un abri ne recharge
pas ; une vie perdue ou un niveau rechargé rend la charge. Effet 500 ms, pas de
recharge temporelle. Le HUD de 12 px indique BOND 0/1 ou 1/1 ; cinq boutons de
56 px occupent 296 px. Le score complet reste identique sans/avec : 300 au
niveau 1, 3000 au niveau 10, 15000 au niveau 30 (trois vies intactes).

Le BFS historique n'inclut toujours pas le bond. `solveWithBond` prouve un
parcours qui l'emploie exactement une fois, en ajoutant sa disponibilité à l'état.
Les minima autorisant le bond sont le minimum des deux preuves. Tableau depuis
le départ à phase zéro vers l'abri médian, graine 28, en quanta :

| Niveau | Quanta sans / avec |
| --- | --- |
| 1 | 16 / 15 |
| 2 | 16 / 14 |
| 3 | 16 / 14 |
| 4 | 16 / 15 |
| 5 | 16 / 15 |
| 6 | 18 / 15 |
| 7 | 18 / 15 |
| 8 | 18 / 15 |
| 9 | 18 / 16 |
| 10 | 18 / 15 |
| 11 | 20 / 16 |
| 12 | 20 / 14 |
| 13 | 20 / 16 |
| 14 | 20 / 15 |
| 15 | 20 / 15 |
| 16 | 22 / 17 |
| 17 | 22 / 18 |
| 18 | 22 / 17 |
| 19 | 22 / 19 |
| 20 | 22 / 17 |
| 21 | 24 / 19 |
| 22 | 24 / 15 |
| 23 | 24 / 16 |
| 24 | 24 / 22 |
| 25 | 24 / 19 |
| 26 | 26 / 17 |
| 27 | 26 / 18 |
| 28 | 26 / 17 |
| 29 | 26 / 16 |
| 30 | 26 / 19 |


Onzième jeu, `traverse`, temps réel. Grille originale de 9×15 cases, départ
(4,14), abris en rangée 0. Flèches/ZQSD : une entrée = un pas, sans répétition
clavier ; une file conserve les entrées rapides jusqu'au prochain quantum.
Toucher l'aire monte ; un glisser émet une seule direction au relâchement.
Cinq boutons de 56×56 sont sur une rangée de 64 px. P/Échap et les panneaux
communs gèrent Prêt, pause, menu mobile, progression et sauvegarde
`arcade-lab:traverse:v1`. Effets synthétisés `step`, `life`, `won`, `lost`.
Aucune modification de `src/shell`, dépendance ou ressource externe.

### Simulation et générateur

Moteur sans DOM, Phaser ni hasard natif ; PRNG partagé. Graine canonique 28
pour chacun des trente niveaux. Les autres graines sont reproductibles, sans
promesse de faisabilité universelle. `snapshot()` copie état, plateau, file,
phase, compteur de frames et reliquat. `step` accumule des pas de 1000/60 ms.
Le trafic et une commande avancent à chaque quantum de `flowFrames` pas fixes.
La représentation est une grille : les véhicules et supports se décalent d'une
case à chaque quantum, et le héros est animé pendant quatre frames. Un pas
refusé latéralement reste dans la grille. Sans entrée, le héros attend.

Contact d'abord sur la destination au temps t, puis mouvement des voies et
second contact à t+1. Les véhicules occupent deux cases consécutives modulo
l'espacement. Les supports occupent `logLength` cases modulo 9 et transportent
le héros d'une case dans leur sens. Eau sans support, immersion et transport
hors [0,8] coûtent une vie. Huit rangées sont tirées sans remise parmi 2…13 :
les cinq premières sont fluviales et les trois dernières routières. Les berges
intermédiaires et la frontière route/rivière varient donc avec le niveau et la
graine. Chaque voie fluviale reçoit un plongeur avec probabilité 0,4 ; son cycle
est `(phase + offset) modulo 18 < diveDuration`. Les sens et offsets viennent
du PRNG. Aucun délai d'ouverture ni fermeture spéciale d'une rangée : toutes
les attentes proviennent des véhicules, supports, immersions et transports.
Les trente flux PRNG ont été sélectionnés hors ligne parmi des dispositions
naturelles puis vérifiés par BFS. Les sels du générateur choisissent seulement
ces dispositions ; aucune mesure de parcours n'intervient dans les collisions.

Trois vies. Toute mort réinitialise position, file et chronomètre de traversée,
mais garde la phase du trafic et les abris déjà occupés. L'échéance du chrono
coûte aussi une vie. Un nouvel abri rapporte 100×numéro du niveau et remet au
départ ; un abri déjà pris ou une case hors abri en haut est mortel. Tous les
abris occupés donnent victoire ; zéro vie donne défaite ; états terminaux gelés.

Indice n=0…29, tous les paramètres ci-dessous ont des extrêmes stricts.

| Paramètre | Générateur | Niveau 1 → 30 |
| --- | --- | --- |
| Frames par quantum | 30−floor(17n/29) | 30 → 13 (vitesse croissante) |
| Espacement véhicules | 6−floor(2n/29) | 6 → 4 cases |
| Longueur supports | 8−floor(3n/29) | 8 → 5 cases |
| Immersion | 0 si n<9, sinon 1+floor((n−9)/5) | 0 → 5 quanta |
| Chronomètre | 60000−1000n | 60 → 31 secondes |
| Abris | 3+floor(n/10) | 3 → 5 |
| Voies alternées | 1+floor(n/5) | 1 → 6 |

Les 3 abris sont aux colonnes 1,4,7 ; les 4 aux colonnes 0,3,5,8 ; les 5 aux
colonnes 0,2,4,6,8. Les premières voies alternent leurs sens ; les autres
reçoivent un sens et un offset par PRNG. La démo au niveau 3 suit une politique
locale : monter si possible, sinon chercher une fenêtre latérale, et redémarrer
après fin ou 300 décisions. Sa vignette Canvas dessine l'état moteur réel.

### Faisabilité mesurée sans Vitest

`node --import ./scripts/ts-loader.js scripts/validate-traverse.js` effectue
un BFS borné par le chrono dans (colonne, rangée, instant), avec cinq actions
cardinales/attente, les mêmes contacts et transports que le moteur. Chaque
arête dure un quantum. Tous les abris sont recherchés séparément depuis le
départ à phase zéro, puis chaque témoin est rejoué par les entrées ordinaires,
avec trois vies intactes. Le script rejoue aussi une victoire complète pour
chaque niveau, en recherchant les abris successifs à leur phase réelle.
Le budget de recherche est inférieur à une seconde par niveau dans R10.

Le tableau donne le minimum de quanta jusqu'à l'abri médian et les actions
`wait` du témoin optimal en temps. Le BFS départage les chemins de même durée
par l'ordre fixe haut, attente, gauche, droite, bas : le nombre de `wait` est
une mesure de ce témoin, pas le minimum d'attentes parmi tous les chemins.
Les deux mesures sont constantes dans chaque palier de cinq niveaux et
strictement croissantes entre paliers. Elles ne commandent jamais le trafic.
Les attendus R10 sont littéraux, indépendants des paramètres du moteur ;
R11 vérifie séparément leurs valeurs et leur monotonie. Les tests n'importent
aucune constante du moteur pour fabriquer un attendu.
Mesures Node observées, hors chargement TypeScript ; durées variables.

| Niveau | Quanta min. (abri médian) | Pas immobiles du témoin | Max ms / abri |
| --- | --- | --- | --- |
| 1 | 16 | 0 | 15.9 |
| 2 | 16 | 0 | 13.8 |
| 3 | 16 | 0 | 2.2 |
| 4 | 16 | 0 | 2.6 |
| 5 | 16 | 0 | 2.3 |
| 6 | 18 | 1 | 2.3 |
| 7 | 18 | 1 | 2.0 |
| 8 | 18 | 1 | 1.8 |
| 9 | 18 | 1 | 2.2 |
| 10 | 18 | 1 | 3.8 |
| 11 | 20 | 2 | 4.2 |
| 12 | 20 | 2 | 2.5 |
| 13 | 20 | 2 | 2.9 |
| 14 | 20 | 2 | 2.2 |
| 15 | 20 | 2 | 2.6 |
| 16 | 22 | 3 | 2.2 |
| 17 | 22 | 3 | 2.6 |
| 18 | 22 | 3 | 4.4 |
| 19 | 22 | 3 | 2.4 |
| 20 | 22 | 3 | 2.4 |
| 21 | 24 | 4 | 2.4 |
| 22 | 24 | 4 | 3.2 |
| 23 | 24 | 4 | 2.9 |
| 24 | 24 | 4 | 2.5 |
| 25 | 24 | 4 | 47.0 |
| 26 | 26 | 5 | 2.8 |
| 27 | 26 | 5 | 54.5 |
| 28 | 26 | 5 | 3.1 |
| 29 | 26 | 5 | 3.1 |
| 30 | 26 | 5 | 3.3 |

### Oracle et intégration

| ID | Preuve `tests/traverse.test.ts` |
| --- | --- |
| R01 | Un pas par entrée, aucune répétition et bornes latérales 0/8 |
| R02 | Collision avant/après défilement, perte d'une vie |
| R03 | Transport et sortie fatale aux deux bords |
| R04 | Eau nue fatale, attente sur berge sûre |
| R05 | Début au niveau 10, phase et durée littérales, immersion mortelle |
| R06 | Occupation persistante, doublon et haut hors abri mortels |
| R07 | 59999 ms sans perte, 60000 ms perte et remise du chrono |
| R08 | Tous les abris nécessaires, trois vies, victoire/défaite gelées |
| R09 | Réapparition exacte en (4,14) après perte |
| R10 | Chaque abri des trente niveaux, budget, témoins rejoués, minimums et attentes du témoin littéraux, diversité des rangées/plongeurs |
| R11 | Sept paramètres naturels : sens, extrêmes stricts et valeurs littérales |
| R12 | Graine, copie sérialisable, regroupement temporel, temps invalides |

Le crochet `__ARCADE_TEST__.games.traverse` expose read/loadLevel/advance,
hudText/usefulArea/bounds et des scénarios `finish` (dernier abri à un pas)
et `danger` (une vie devant un véhicule réel), sans changer les règles.
Le HUD occupe une bande séparée au-dessus de y=64 ; la zone utile est
(9,64,342,570). Héros vectoriel sur case de 38 px, obstacles de 34×26 px sur cases de 38 px.
Les boîtes HUD/héros réellement dessinées sont exposées par bounds.

`tests/e2e/traverse.spec.ts` écrit les parcours bureau/mobile avec victoire
par vraie entrée, Niveau suivant, sauvegarde après reload, défaite/rejouer,
niveau 30, tap/glisser et absence de crochet en production. Quatre captures
traverse-play/level30/won/lost par projet. Les entrées mobiles sont tactiles.
Le non-chevauchement HUD/héros/zone utile et contrôles/canevas est vérifié.
M01–M04 incluent Traverse aux trois dimensions ; A11 inclut son horloge et
V01–V08 comptent onze vignettes. La fixture commune refuse les erreurs console.
Vitest et Playwright ne sont pas exécutés ici ; leur exécution et les captures
restent à vérifier par l'orchestrateur.



### Les 30 traversées (passe 404)

`src/engines/traverse/levels.ts` (`PLANS`) ajoute à chaque traversée générée
des règles écrites ; les sels de flux de `generate()` ont été recalibrés pour que
chaque traversée soit gagnée par la BFS espace-temps. Une règle neuve tous les
quatre à cinq niveaux ; les niveaux 5, 10, 15, 20 et 25 sont des **défis à une
seule vie** ; le flux ralentit (`slower`, quanta plus longs) sur la traversée qui
suit chaque défi et sur chaque introduction.

| Niveau | Nouveauté | Règle exacte |
| --- | --- | --- |
| 4 | **Feux** | Une voie routière à feu reste immobile pendant les quanta `t` où `t % 6 < 2` ; le feu est dessiné à gauche de la voie. |
| 7 | **Rondins plongeurs** | Immersion `1 + floor((i-6)/6)` quanta sur 18 (avant : dès le niveau 10). |
| 8 | **Rapides** | `speed = 2` : la voie avance de deux cases par quantum et le rondin emporte de deux. |
| 12 | **Marée** | Le sens de la voie s'inverse tous les `period` quanta (déplacement cumulé triangulaire). |
| 16 | **Rochers** | Cases de berge infranchissables : le pas est refusé, sans perte de vie. |
| 21 | **Naufragé** | Il dérive sur un rondin non plongeur (à défaut, la première voie fluviale devient une voie de rondins stables : la règle ne disparaît jamais) ; le joueur qui arrive sur sa case le recueille (+300 × niveau). Les abris restent fermés (entrer = vie perdue) tant qu'il n'est pas recueilli. |
| 26 | **Abris en file** | Seul le premier abri libre, de gauche à droite, est ouvert. |
| 30 | Le dernier convoi | File, naufragé, feux, rapides, marée et rochers. |

Le déplacement d'une voie est `travel(lane, phase)` (forme close, feux et marée
compris) ; le transport d'un rondin est `drift = travel(t+1) − travel(t)`.
`solve()` porte un bit « naufragé à bord » ; `crossingAction` (parties au doigt)
le porte aussi et indexe la phase absolue. Preuves : `scripts/validate-traverse.js`
(chaque abri seul si les abris ne sont pas en file, partie complète en vies
intactes, bond, budget en positions visitées, sans horloge) et
`tests/fixtures/traverse-campaign.json` rejouée par Vitest et
`validate-character-games.js`. Parties au doigt : traversées 1 et 13. Diversité
mesurée (`scripts/traverse-diversity.js`) : 41,4 → **21,6**, 0 % de clones.

## Dérapage

Passe 72 : les cinq compagnons pilotent les karts (joueur et quatre IA), avec un sixième pilote neutre ; Élan et ses preuves suivent le contrat Characters ci-dessus.

Douzième jeu, `derapage`, `realtime: true`. Course de karts originale,
vue de dessus avec caméra suivant le joueur, fixe avec le nord en haut par défaut ; caméra tournante disponible dans ☰.
Le moteur ne connaît que des coordonnées du monde, des unités et des secondes.
La projection, le cadrage, les traces et les étincelles vivent dans la scène ;
un autre rendu peut consommer le même snapshot sérialisable. Aucune
nouvelle dépendance ni fichier binaire ; seule la persistance partagée ajoute la migration des records Dérapage.

### Règles et commandes

Six karts, trois tours. Accélération automatique 12 unités/s², frottement
longitudinal 0,12/s, vitesse normale plafonnée à 24. Braquage proportionnel
2,4 rad/s, modulé par la vitesse jusqu’à 10 unités/s ; adhérence latérale
exponentielle 10/s. Les cercles de rayon 1,2 se séparent et échangent une
impulsion de coefficient 0,85. Au choc de rail, retour à 1,2 unité à l’intérieur de la piste, cap tangent orienté vers l’intérieur (normale ×0,3), vitesse résiduelle ≥8 et ≤20 (70 % de la vitesse précédente).
L’herbe au-delà de la demi-largeur plafonne la norme de la vitesse à
45 % au niveau 1 et 42,1 % au niveau 30 de la cible sur piste, même avec
un boost (toujours ≤ 50 %). Le plafond s’applique dès le premier pas :
la perte est donc supérieure à 30 % en une seconde à partir de 24 ; les murs
commencent trois unités au-delà de la bordure. Les sections sans mur restent
en herbe et permettent une récupération par le pilote.

Braquer à plus de 9 unités/s et maintenir Dérapage diminue l’adhérence à
1,4/s et multiplie le braquage par 1,22. Relâcher ou cesser de braquer libère
un mini-boost : moins de 600 ms ne donne rien ; 600 ms donnent 700 ms,
1400 ms donnent 1400 ms. La vitesse boostée est plafonnée à 32.
Douze portes transversales doivent être franchies dans le sens de la course,
dans l’ordre 1…11,0, à moins d’une demi-largeur + 1,2 du centre.
Une porte sautée, traversée en sens inverse ou coupée trop loin dans l’herbe
ne fait pas progresser le compteur. Seule la porte 0 après les onze autres
valide un tour. Le classement trie les portes cumulées (donc les tours),
puis la distance à la suivante ; les arrivants sont triés par temps puis id.
La course se termine à l’arrivée du joueur : top 3 = victoire du niveau,
autres places = défaite. Les points par place sont 10,8,6,5,4,3.

Les niveaux 1–28 forment sept coupes de quatre courses consécutives ;
29 et 30 sont deux entraînements indépendants. Une coupe cumule les points
des six pilotes et affiche leur ordre dans le HUD. Un rejeu restaure le
cumul d’avant la course, sans compter deux fois son résultat. La coupe
reste en mémoire pendant la série ; seuls progression et records sont
persistés sous `arcade-lab:derapage:v1`, comme les autres jeux.

Quatre caisses aux sommets 16,40,64,88 réapparaissent après 5000 ms. Tirage
par le PRNG partagé, avec poids, pour une place p indexée de 0 à 5 :
Turbo `1+0,7p`, Ressort `1+0,2p`, Flaque `3−0,3p`, Bulle `2`.
Turbo donne 1800 ms de boost ; Ressort ignore l’herbe pendant 1600 ms ;
Flaque reste 6000 ms quatre unités derrière son propriétaire, fait glisser
les autres pendant 1100 ms ; Bulle absorbe le prochain choc ou la flaque.
Les cinq IA suivent une ligne de course précalculée (ligne centrale
contractée de 1 %), regardent devant elles, anticipent les courbures pour
freiner, ajoutent un bruit à graine et utilisent leurs bonus.
Le retard de freinage réduit la distance d’anticipation ; le bruit et ce
retard diminuent aux niveaux élevés, tandis que leur vitesse augmente.

Clavier : les quatre flèches dirigent en absolu, diagonales incluses ; Espace
ou Maj pour déraper, X ou Ctrl pour le bonus. Au doigt, poser le pouce
n’importe où sur la zone de jeu : ce contact fixe le centre du joystick.
Le déplacement du pouce donne le cap absolu (axes écran = axes monde),
zone morte circulaire de 10 px CSS incluse. Relâcher conserve le cap courant.
La convergence utilise l’erreur angulaire ×5, bornée à 3,2 rad/s, sans
rotation instantanée ni dépendance à la vitesse de départ. Anneau au contact,
point au pouce et flèche du cap demandé autour du kart rendent le geste visible.
Le kart est centré à y=368 en caméra fixe (y=466 en caméra tournante).
Dans ☰, « Caméra : fixe / tournante » conserve l’ancien braquage relatif
(zone morte 6 px, saturation à 60 px) et sa caméra tournante. Les choix caméra
et aide sont mémorisés sous `arcade-lab:derapage:controls:v1`, sans modifier
la sauvegarde de progression. La caméra fixe est le défaut, aussi au clavier.
L’aide activée par défaut n’agit que hors piste ou si la projection du cap
à vitesse courante sur 0,6 s menace un rail : correction vers le centre 12
unités devant, au plus 25 % de l’écart et 0,3 rad. Elle est désactivable dans ☰
et n’agit pas si aucun cap n’est demandé. Les entrées `mode`, `heading`, `assist`
sont conservées dans les rejeux ; le moteur reste en coordonnées monde.
Les boutons Dérapage 88×88 et Bonus 56×56 restent hors du canevas, dans une
bande de 152 px. Souris et Inclinaison restent des options du braquage relatif ;
le refus ou l’absence du capteur reste silencieux. Pause, Prêt, menus,
progression, sauvegarde, écran allumé et vibrations life/won/lost passent
par les services communs. Sons synthétisés engine/drift/boost/impact/grass, traces de terre sur herbe.
La scène utilise des Graphics pour le circuit et les karts, un HUD HTML
et une mini-carte dans la bande réservée y=0…96 ; la zone utile est
(0,96,360,544), le kart vers y=368 par défaut. Aucun contrôle ni HUD dans l’aire
devant le kart. La vignette Canvas utilise une vraie démo au niveau 3,
avec politique de suivi et pas de 1/15 s : elle évolue en moins de 600 ms.

### Tracés de données et difficulté

Les trente listes de points de contrôle de `circuits.ts` sont dessinées
séparément en coordonnées du monde. Chaque triplet contient x, y et la
largeur du tronçon (référence 20, ajustée par la largeur du niveau).
Une spline cubique fermée mélange une B-spline uniforme et Catmull-Rom :
B + (C−B) × 2,75 × (bend−0,015). La tension croît de 0 à 0,119625,
accentuant progressivement les enchaînements à points de contrôle constants.
La spline est évaluée à 40 points par tronçon, puis rééchantillonnée à
96 positions équidistantes. Les graines
ne changent que le décor. Le contrôle géométrique vérifie les intersections
de la ligne centrale et des deux polylignes de bord, entre elles et avec
elles-mêmes ; aucun pont ni croisement n’est permis.

Sept coupes de quatre ont chacune un thème sol/bordure/décor ; les deux
entraînements complètent les trente niveaux. Les familles sont urbain lent,
rapide à longues lignes droites, technique à enchaînements, ovale et nature.
Les inspirations restent génériques : circuit urbain en bord de mer avec
port, tunnel sombre, épingle et chicane ; avenues, esplanade et pavés ;
parcours forestier vallonné avec gauche-droite, ligne droite et épingle.
Le tunnel et le port restent purement visuels ; le tunnel est sombre.
Les profils d’altitude sont interpolés dans le moteur. En forêt, ils modulent
uniquement la teinte du sol, sans effet physique ; le décor dense conserve
sa marge Z21. Les blocs urbains sont décoratifs. Les rails continus bordent
le trottoir : contact du centre à demi-largeur + 1,8 (rayon 1,2), correction
à l’intérieur de la piste et réorientation tangentielle avec une vitesse minimale de 8. Aucune herbe en ville.

Le slalom possède six paires de piquets alternant rouge et bleu, décalées
alternativement de ±1,5 unité, ouverture 6,2 (diamètre du kart 2,4).
Le franchissement avant du tronçon, hors de l’ouverture, ajoute exactement
2000 ms au temps du kart, joueur et IA ; un même passage n’est compté
qu’une fois par tour. Le snapshot expose `missedGates`, `penaltyMs`,
`noticeMs` et les passages. Pendant 2000 ms le HUD affiche
« Porte manquée +2,0 s ». Les temps de course, de tour et d’arrivée incluent
ces pénalités. La ligne IA traverse les portes ; son erreur stable par kart
est proportionnelle au dosage de difficulté, plus forte au niveau facile.
La neige multiplie l’adhérence latérale par 0,6, y compris en glisse ; hors
piste la neige profonde plafonne la vitesse à 28 % de la cible.
La pente accélère selon 9,8 × différence d’altitude / longueur du tronçon,
et relève le plafond de 3 en descente, uniquement en slalom et BMX.
Sol blanc bleuté, sapins superposés enneigés et piquets sont dessinés par code.

Le BMX utilise de la terre battue et des bottes de paille hors piste.
Les berms désignés multiplient l’adhérence par 1,4 et permettent de conserver
une cible plus haute de 3 × (coefficient−1). Leur bord extérieur est clair.
À l’entrée d’une bosse, vitesse ≥16 : envol de 220 + vitesse × 6 ms ;
sous ce seuil la vitesse est multipliée par 0,75. En vol, ni braquage ni
ralentissement hors piste ; hauteur sinusoïdale de 0 à 3 exposée dans le
snapshot, ombre au sol et kart agrandi/surélevé au rendu. Le contrôleur
prépare la direction d’atterrissage avant la bosse. La rampe initiale descend.
Toutes les mécaniques restent dans le moteur en coordonnées du monde ;
la scène dessine le snapshot.

Les portes sont aux sommets 0,8,…88. Bandes et arbres sont des éléments
sérialisables du circuit, en coordonnées du monde, utilisables par une future
vue pseudo-3D. Dès le niveau 3, `1+floor((n−2)/4)` bandes de rayon 2,5
sont réparties parmi les sommets dont le changement de direction est ≤0,09 rad
(au-delà, virage considéré serré). Leur position dépend du tracé à graine fixe.
À l’entrée, la vitesse passe à 32 pendant 900 ms, puis revient à la cible
normale ; rester sur une bande ne recharge pas le boost. Les IA peuvent
les emprunter. Flèche claire, couleur menthe, flamme et son signalent le boost.

Les obstacles ont un rayon de 1,5 à 2,5, une densité variable (un candidat par
sommet en nature, sinon tous les `2+n%3` sommets), un côté et un décalage issus de la même graine.
La distance au centre de piste doit dépasser demi-largeur + deux rayons :
il reste au moins un rayon libre entre bordure et tronc. La trajectoire idéale
reste libre. Le kart de rayon 1,2 balaie son segment contre chaque cercle,
s’arrête au premier contact, est repoussé à l’extérieur et rebondit (réflexion
1,6, vitesse multipliée par 0,55). Il ne traverse donc pas le tronc à 24 ou 32.
Troncs et feuillages sont dessinés par code.

| Paramètre | Formule | Niveau 1 → 30 |
| --- | --- | --- |
| Largeur de base | 20−0,27n | 20 → 12,17 |
| Vitesse cible IA | 15+0,23n | 15 → 21,67 |
| Bruit de braquage | 0,18−0,005n | 0,18 → 0,035 |
| Retard de freinage | 0,45−0,012n | 0,45 → 0,102 s |
| Paramètre de tension des enchaînements | 0,015+0,0015n | 0,015 → 0,0585 |
| Fraction de murs | 0,12+0,02n | 0,12 → 0,70 |
| Facteur de vitesse sur herbe | 0,45−0,001n | 0,45 → 0,421 |

### Validation Node des trente circuits

Commande : `node scripts/validate-derapage.js`.
Le script valide fermeture, largeur minimale 12, portes et intersections
de toutes les arêtes non adjacentes. Il simule ensuite trois tours de chaque
circuit, au pas 1/60 s, avec la physique et les portes ordinaires, sans
repositionnement ; abandon après 300 s. Deux courses complètes aux niveaux
extrêmes vérifient aussi collisions et objets avec les cinq adversaires.
Temps par tour = temps des trois tours / 3, départ arrêté inclus ;
« virages » = nombre de groupes de courbure signée de la signature Z26.
L’écart IA est la distance moyenne à la ligne de course, en unités du monde.
Herbe IA compte les pas hors piste en pourcentage du temps total (≤5 %
sur les trente niveaux dans le script Node). Les collisions d’arbres comptent celles du pilote.
Les temps ne sont pas forcés à être monotones entre tracés différents ;
la vitesse et la précision des paramètres IA le sont. Mesures graine 28 :

| Niveau | Nom | Famille | Longueur | Largeur min. | Virages | Signature voisine | Tour pilote (s) | Tour IA (s) | Écart IA | Herbe IA (%) | Bandes | Décor | Chocs pilote |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | La Flèche des prés | rapide | 474.9 | 28.00 | 2 | 0.3542 | 20.26 | 31.46 | 0.725 | 0.00 | 0 | 48 | 0 |
| 2 | Autour des Invalides | urbain | 440.9 | 19.73 | 6 | 0.5625 | 18.54 | 27.83 | 2.249 | 0.00 | 0 | 32 | 0 |
| 3 | Les Docks clairs | urbain | 564.4 | 19.46 | 6 | 0.5417 | 23.33 | 34.31 | 2.020 | 0.00 | 1 | 23 | 0 |
| 4 | La Cour des arches | urbain | 457.8 | 19.19 | 6 | 0.4167 | 18.94 | 27.24 | 2.155 | 0.00 | 1 | 48 | 0 |
| 5 | Le Rocher | urbain | 464.8 | 18.92 | 6 | 0.5417 | 19.08 | 27.93 | 2.216 | 0.00 | 1 | 31 | 0 |
| 6 | Le Grand détour | rapide | 495.6 | 18.65 | 3 | 0.3542 | 20.82 | 29.98 | 0.685 | 0.00 | 1 | 24 | 0 |
| 7 | Les Deux horizons | rapide | 481.6 | 18.38 | 3 | 0.5208 | 19.93 | 28.14 | 0.684 | 0.00 | 2 | 48 | 0 |
| 8 | Le Vent des plaines | rapide | 492.3 | 18.11 | 3 | 0.3125 | 20.36 | 28.07 | 0.669 | 0.00 | 2 | 32 | 0 |
| 9 | Les Trois replis | technique | 492.5 | 17.84 | 6 | 0.4375 | 20.49 | 28.29 | 0.892 | 0.00 | 2 | 24 | 0 |
| 10 | La Clef des champs | technique | 483.9 | 17.57 | 6 | 0.5208 | 20.08 | 28.21 | 0.809 | 0.00 | 2 | 48 | 0 |
| 11 | Le Ruban plié | technique | 490.6 | 17.30 | 6 | 0.4167 | 20.07 | 26.76 | 0.733 | 0.00 | 3 | 32 | 0 |
| 12 | Les Coudes de cuivre | technique | 478.4 | 17.03 | 6 | 0.4583 | 19.54 | 26.19 | 0.759 | 0.00 | 3 | 24 | 0 |
| 13 | La Grande ellipse | ovale | 473.2 | 16.76 | 2 | 0.3958 | 19.27 | 24.72 | 0.456 | 0.00 | 3 | 48 | 0 |
| 14 | Le Bol incliné | ovale | 466.4 | 16.49 | 2 | 0.3958 | 18.98 | 24.13 | 0.445 | 0.00 | 3 | 32 | 0 |
| 15 | L’Anneau des vents | ovale | 475.5 | 16.22 | 2 | 0.4167 | 19.06 | 24.13 | 0.411 | 0.00 | 4 | 24 | 0 |
| 16 | Le Triangle arrondi | ovale | 451.7 | 15.95 | 3 | 0.3542 | 18.07 | 23.17 | 0.429 | 0.00 | 4 | 48 | 0 |
| 17 | La Côte des Ardennes | nature | 563.2 | 15.68 | 6 | 0.4583 | 22.84 | 28.71 | 0.457 | 0.00 | 4 | 95 | 0 |
| 18 | Le Lac des fougères | nature | 477.8 | 15.41 | 5 | 0.3125 | 19.20 | 24.28 | 0.430 | 0.00 | 4 | 95 | 0 |
| 19 | La Clairière brisée | nature | 502.8 | 15.14 | 4 | 0.5208 | 19.96 | 23.75 | 0.417 | 0.00 | 5 | 96 | 0 |
| 20 | Les Roches rousses | nature | 503.5 | 14.87 | 7 | 0.4792 | 19.97 | 24.71 | 0.452 | 0.00 | 5 | 96 | 0 |
| 21 | Les Pavés du levant | urbain | 490.2 | 14.60 | 8 | 0.4375 | 18.89 | 24.98 | 1.598 | 0.00 | 5 | 24 | 0 |
| 22 | La Terrasse des quais | urbain | 503.6 | 14.33 | 5 | 0.4167 | 19.54 | 24.45 | 1.432 | 0.00 | 5 | 47 | 0 |
| 23 | Le Passage des halles | technique | 505.4 | 14.06 | 6 | 0.4167 | 19.46 | 22.82 | 1.227 | 0.00 | 6 | 31 | 0 |
| 24 | Les Balcons de pierre | urbain | 504.5 | 13.79 | 5 | 0.3542 | 19.31 | 24.18 | 1.239 | 0.00 | 6 | 24 | 0 |
| 25 | La Combe des échos | technique | 519.0 | 13.52 | 8 | 0.4375 | 20.47 | 25.82 | 0.412 | 0.00 | 6 | 48 | 0 |
| 26 | Le Serpent des joncs | nature | 504.6 | 13.25 | 7 | 0.4167 | 19.70 | 23.63 | 0.284 | 0.00 | 6 | 96 | 0 |
| 27 | La Boucle des falaises | rapide | 519.6 | 12.98 | 5 | 0.5208 | 20.04 | 24.86 | 0.313 | 0.00 | 7 | 24 | 0 |
| 28 | Les Sept lacets | technique | 510.4 | 12.71 | 8 | 0.4792 | 19.82 | 25.07 | 0.384 | 0.00 | 7 | 46 | 0 |
| 29 | La Descente en ruban | slalom | 671.5 | 12.44 | 5 | 1.1667 | 25.20 | 30.32 | 0.513 | 0.00 | 7 | 32 | 0 |
| 30 | Le Petit guidon | bmx | 423.8 | 12.17 | 6 | 0.4583 | 16.13 | 20.29 | 0.454 | 0.00 | 7 | 24 | 0 |

### Diversité Z26 et arrivée Z27

On rééchantillonne la ligne centrale en N=96 points équidistants. Pour chaque
point, θᵢ est l’angle signé entre les deux segments adjacents, obtenu par
atan2(produit vectoriel, produit scalaire). Avec Δs=L/N, la courbure
adimensionnelle est κᵢL=(θᵢ/Δs)L=Nθᵢ. L’histogramme H est normalisé
par N, avec 32 classes de largeur 2 sur [-32,32], plus deux classes de
saturation. La signature ne dépend ni de l’échelle ni de la rotation.
Les groupes contigus de même signe avec |Nθᵢ|>4 définissent les virages ;
leurs angles intégrés sont triés, et leur nombre et leurs angles sont exposés.
La distance utilisée est D(H,G)=Σ|Hⱼ−Gⱼ|, sur les 435 paires.

Minimum mesuré : **0,312500**, seuil littéral **0,15** : marge de 0,162500,
soit environ 52 % du minimum, pour éviter un seuil ajusté au dernier
échantillon. La comparaison n’utilise ni nom, ni niveau, ni thème.
Z26 vérifie aussi chaque tracé tourné de 90° et agrandi ×1,3 (distance
<1e-6). Remplacer toutes les géométries par la première, ou seulement la
deuxième par cette transformation de la première, ramène la distance
sous le seuil 0,15 et doit faire échouer Z26.

`finishLine` expose deux extrémités, calculées à la porte 0 par la normale
à la tangente centrée, à ±largeur/2. Le comptage teste le franchissement
orienté de ce segment fini, par interpolation du déplacement du kart.
La scène dessine deux rangées de damier noir/blanc sur ce même segment,
sur toute sa largeur, une grille de six places derrière et un portique en ville. La mini-carte
montre aussi l’arrivée. Le HUD affiche Tour 2/3, Dernier tour ! et le
drapeau à damier à l’arrivée. Z27 compare les extrémités à la porte 0,
leur milieu au point 0, et leur distance à la largeur locale, avec
tolérance littérale 1e-6 ; décaler la porte d’un point est détecté.


### Oracle

| ID | Preuve écrite dans `tests/derapage.test.ts` |
| --- | --- |
| Z01 | Accélération littérale, plafond 24, frottements et reliquat fixe |
| Z02 | Braquages 0,02/0,04 rad et adhérence exponentielle |
| Z03 | Seuil 9, charges 599/600/1399/1400, boost 700/1400 |
| Z04 | Herbe, saut et rebond normal sur mur |
| Z05 | Séparation à 2,4, impulsions opposées et protection |
| Z06 | Douze portes ordonnées, trois tours et instant d’arrivée |
| Z07 | Portes sautées et coupure hors piste refusées |
| Z08 | Classement, six scores littéraux, podium et gel terminal |
| Z09 | Quatre courses, cumul, classement et rejeu sans double compte |
| Z10 | Quatre effets, poids selon place, graine et retour à 5000 ms |
| Z11 | Cinq rivaux, mesures d’écart et temps aux deux extrêmes |
| Z12 | Trente tracés × trois graines, largeur ≥12, fermeture et intersections |
| Z13 | Trois tours sur chacun des trente tracés en moins de 90 s |
| Z14 | Sens de chacun des sept paramètres et extrêmes stricts |
| Z15 | Course complète rejouée à chaque pas, cadences, copies et temps invalides |
| Z16 | Clés littérales du snapshot et méthodes publiques sans notion de vue |
| Z17 | Circuit construit : plafond herbe ≤0,50 du plafond piste |
| Z18 | À 24 sur herbe, perte ≥30 % après 60 pas de 1/60 s |
| Z19 | Bande à 32 pendant 900 ms, retour à 24 |
| Z20 | Bandes dès le niveau 3, nombre non décroissant, virage ≤0,09 rad |
| Z21 | Trois graines : arbres reproductibles, marge et ligne idéale libre |
| Z22 | Collision balayée à 24/32, rebond, perte et absence de traversée |
| Z23 | Fonction pure : zone morte 6 px, saturation 60 px, rejeu continu |
| Z24 | IA ≤5 % hors piste sur les 30 circuits ; Z13 conservé |
| Z25 | E2E mobile : glisser signé, relâcher, dérapage maintenu, tailles 88/56 et captures |
| Z26 | 435 paires, distance >0,15 et invariance rotation/échelle <1e-6 |
| Z27 | Segment de la porte 0, largeur et centre indépendants à 1e-6 |

Le crochet `__ARCADE_TEST__.games.derapage` expose read/loadLevel/advance,
hudText/usefulArea/bounds et trois états de course ordinaires : finish
(dernière porte, kart mal orienté qui doit réellement braquer), danger
(même situation, cinq adversaires déjà arrivés), trees-boost (entrée réelle
sur une bande du niveau 15, avec arbres et boost visibles). Aucun seuil ni règle
n’est modifié. Les E2E utilisent un maintien réel au clavier ou multitouch,
advance pour la simulation, puis vérifient les panneaux Niveau suivant et
Rejouer le niveau, le déblocage après reload et les captures
derapage-play/level30/won/lost sur chaque projet, et
`derapage-mobile-controls` / `derapage-trees-boost` sur mobile. Ils vérifient aussi
la séparation HUD/aire devant le kart et contrôles/canevas. M01–M04,
A11 et les douze vignettes communes incluent Dérapage.

Le crochet dédié `__DERAPAGE_TEST__.overview(true)` fige la simulation et
cadre le circuit entier, arrivée visible. Les captures desktop et mobile
prévues sont `derapage-circuit-01`, `-08`, `-15`, `-22`, `-30`,
`derapage-le-rocher`, `derapage-invalides`, `derapage-ardennes`,
`derapage-slalom`, `derapage-bmx`, suffixées par projet.

Vitest et Playwright ne sont pas exécutés sur cette machine. L’orchestrateur
doit exécuter ces suites, inspecter les captures aux trois tailles mobiles,
vérifier les capteurs optionnels et mesurer la fluidité sur téléphone.


### Chronos et records Dérapage — Z28/Z29

`snapshot().timing` expose `raceMs`, `currentLapMs`, `lapTimesMs`,
`bestLapMs` et `lastLapDeltaMs`. La course commence au pas zéro ; le premier
chrono de tour inclut le départ sur la grille. Chaque tour terminé vaut
exactement le nombre de pas depuis le départ ou le franchissement précédent
multiplié par `1000 / 60`. Le meilleur est le minimum des tours terminés ;
il vaut `null` avant le premier. Aucun temps mural n’intervient. Le temps
se fige à l’arrivée et se réinitialise au chargement/rejeu du niveau.
`advance(ms)` suit le même accumulateur de pas fixes que le moteur.

Le HUD réservé aux 96 premiers pixels affiche course, tour courant et meilleur
au format `mm:ss.cc`. À chaque franchissement, l’écart au meilleur précédent
est vert si strictement négatif, rouge sinon (premier passage : écart « — »).
L’annonce persiste jusqu’au passage suivant. Le résultat affiche temps total,
meilleur tour, record historique du circuit et classement des six karts.

Le champ optionnel `circuitRecords` de la sauvegarde existante
`arcade-lab:derapage:v1` associe le nom stable du circuit à son meilleur
tour en millisecondes. Seule une amélioration stricte écrit le record, dès le
franchissement, avec « Nouveau record ! ». Les clés numériques historiques sont lues selon l’ordre publié en 0.3.1 (0 = Le Rocher, 4 = La Flèche des prés), puis réécrites en noms ; en cas de doublon, le meilleur temps est conservé. Les anciennes sauvegardes sont
compatibles ; lectures, sérialisation et écritures sont protégées par try/catch.

Z28 rejoue les mêmes entrées horodatées avec des pas regroupés différemment,
compare exactement les chronos et construit des tours de 120, 180 et 90 pas
pour vérifier la durée et le minimum. Z29 vérifie égalité/dégradation sans
écriture, isolation des circuits, relecture, migration implicite et exceptions
lecture/écriture. L’E2E mobile utilise un état avant la dernière porte d’un tour,
des gestes tactiles réels puis `advance`, contrôle le HUD hors piste, l’écart,
l’annonce et le record après rechargement. Vitest et Playwright ne sont pas
exécutés dans cette passe.

Mutations à essayer : fausser le minimum du meilleur tour ; remplacer les pas
par une horloge murale ; écraser le record par un tour égal ou plus lent.


### Passe B : oracle Z30–Z35

Les scénarios de `tests/derapage-cases.ts` sont enregistrés comme tests dans
`tests/derapage.test.ts` et exécutés aussi par le validateur Node, sans Vitest.

| ID | Preuve et seuils littéraux |
| --- | --- |
| Z30 | Joueur et IA : passage central sans pénalité, passage décalé de 5 avec exactement 2000 ms et un manqué, sans double comptage ; un tour IA à vitesse 18 donne 6 manqués au dosage facile et 0 au dosage élevé ; ouverture ≥6 et ligne IA à <0,1 du centre |
| Z31 | Même vitesse et braquage : rapport de dérive neige/asphalte entre 1,45 et 1,55 ; en glisse entre 1,04 et 1,08 |
| Z32 | Après 180 pas, gain de vitesse en pente >2 ; plafond 50 pour mesurer la gravité indépendamment du relèvement du plafond |
| Z33 | Après 60 pas de virage identique, gain en berm >0,1 |
| Z34 | Hauteur positive, vol entre 20 et 35 pas à vitesse 22 ; position et angle identiques avec/sans braquage ; pas de saut à 10 et ralentissement sous 9 ; durée >380 ms à 30 |
| Z35 | Cinq tracés urbains : composante normale inversée, vitesse <22 et confinement sous demi-largeur +1,81 pendant 120 pas |

Captures desktop/mobile : les vues `derapage-slalom`, `derapage-bmx`,
`derapage-le-rocher` et `derapage-invalides` utilisent le nouveau rendu.
Deux captures supplémentaires en vue de jeu, `derapage-slalom-porte` et
`derapage-bmx-saut`, utilisent les scénarios de placement puis `advance(100)`
et `advance(150)` ; aucune hauteur ni pénalité n’est injectée.
Les images doivent être générées et inspectées par l’orchestrateur :
Playwright et Vitest ne sont pas exécutés pendant cette passe.


Mutations vérifiées par exécution des scénarios Node : les six sont détectées.
Toutes les lignes ci-dessous sont dans `src/engines/derapage/physics.ts`.

| Oracle | Ligne | Modification |
| --- | --- | --- |
| Z30 | 124 | Pénalité `+ 2000` → `+ 0` |
| Z31 | 78 | Coefficient neige `.6` → `1` |
| Z32 | 67 | Gravité `9.8` → `0` |
| Z33 | 75 | Coefficient berm `1.4` → `1` |
| Z34 | 58 | Seuil `16` → `Infinity` |
| Z35 | 138 | Condition de collision du rail forcée à `false` |

Validation de la passe : lint, typecheck, build et validateur Node réussis.
Z12/Z13/Z24/Z26 passent sur les trente tracés ; hors piste IA mesuré à
0,00 % partout, signatures distantes d’au moins 0,3125. Les courses
complètes aux deux niveaux extrêmes terminent sur le podium. Les snapshots
slalom/BMX restent identiques après chacun des 600 pas rejoués en demi-pas.
Le build conserve son avertissement de taille de bundle.
L’orchestrateur doit exécuter Vitest, les mutations et les E2E desktop/mobile,
puis inspecter les six captures demandées : portes lisibles, ombre et hauteur
du saut, berm extérieur clair, rails continus, tunnel sombre, neige et décor
hors piste, relief forestier et HUD hors de la zone de conduite.


### Passe 67 — jouabilité au doigt, Z36–Z39

Le nouvel ordre échange seulement les niveaux 1 et 5 : La Flèche des prés
ouvre la campagne, avec une largeur de 28 unités, sans bosse ni boost ;
Le Rocher reste en campagne au niveau 5. Les 28 autres positions restent identiques.
`legacyCircuits` garde l’ordre publié pour les migrations, `circuits` l’ordre courant.

La campagne Node `scripts/derapage-human.js` vise le centre six échantillons
devant la section courante, bruit uniforme ±0,35 rad (graine 67), observe toutes
les neuf images (150 ms) et applique la visée de l’observation précédente.
Les courses sont ordinaires, à six karts, graine de course 28, sans bonus
utilisé par le joueur. `--record` régénère les bandes d’entrées Z36 ; chaque
rejeu vérifie trois tours, arrêt (<2 unités/s) strictement <0,5 s, hors piste
strictement <15 %, puis position et cap finaux exacts. Z37 couvre la zone morte,
les axes/diagonales et la convergence bornée ; Z38 le rail même au repos ;
Z39 la migration et sa relecture. Le script final contrôle les quatre rejeux
avec une limite littérale de 2000 ms chacun. Les E2E mobile et clavier sont
écrits seulement : gestes haut/gauche/droite à l’écran, capture
`derapage-joystick`, relâchement et option caméra mémorisée après rechargement.

La mutation « aide désactivée » est rejetée par le rejeu exact du Rocher et
par l’oracle de correction locale. **Les seuls seuils de jouabilité du pilote
humain restent satisfaits sans aide** : ils ne prouvent donc pas sa nécessité.
Les mutations rail collant, direction relative et records par index sont
rejetées respectivement par Z38, Z37 et Z39 ; les emplacements courants sont
imprimés par `scripts/check-derapage-joystick-mutations.js`.

Résultats Z36 (aide activée, six karts) : niveaux 1, 3, 15 et Le Rocher :
3 tours chacun, plus long arrêt 0,167 s (départ compris), 0 % hors piste.
Le détail, l’ordre complet et les mutations sont dans
`docs/derapage-joystick-validation.json` après validation Node.

#### Corrections d'intégration — passe 73

Serpentin peint le corps de la queue vers la tête, puis le personnage. Le validateur
Node des scènes construit une vraie traversée du corps et verrouille l'ordre des
appels de dessin. Il contrôle aussi les réactions issues d'une collision Dérapage,
d'un tir Bubble attaché sans éclatement et d'une mort Serpentin, les compteurs du
HUD avant/après usage, la géométrie de chaque rival et celle du pilote neutre.
Le Joker est testé contre une bombe d'une autre couleur, avec témoin sans Joker.
Les E2E tactiques comparent les mêmes positions et entrées avec/sans spécial :
un unique tir Joker vide un groupe qui reste intact sans lui ; l'Esquive absorbe
un contact réel avec le corps qui tue le témoin. Ces E2E sont écrits, non exécutés
ici (ni navigateur ni Vitest).

Dérapage : l'Élan des IA est volontaire. La politique de la passe 72 l'active une
fois par tour lorsqu'une IA est en retard de plus de deux portes, roule à plus de
16 unités/s et braque de moins de 0,12. Aucun tirage aléatoire supplémentaire.
Même sans Élan du joueur, les IA accélérées modifient les contacts entre karts,
les positions/classements et ensuite les bonus : les anciennes entrées ne donnent
plus nécessairement la même trajectoire. Sur les bandes originales de `038a0c1`,
les arrivées L1/L3/L5 passent de 3623/4083/3431 à 3614/4080/3397 pas ; L15 reste
identique (3451). Les cinq IA emploient l'Élan dans chacune de ces quatre bandes ;
le pilote n'en emploie aucun. Les bandes réenregistrées de la passe 72 restent testées.

L'ancien oracle est conservé séparément dans `tests/derapage-recordings-038a0c1.ts`
(copie exacte de Git). `scripts/validate-derapage-historical.js`, également appelé
par le validateur Dérapage, rejoue ces quatre bandes et les 30 courses du pilote
historique avec un moteur de test qui refuse tout Élan, IA comprises. Les empreintes
SHA-256 de `tests/fixtures/derapage-038a0c1.json` proviennent du moteur ET de la
physique de `038a0c1` (`node scripts/record-derapage-historical.js --record` ;
la génération refuse des dépendances modifiées depuis cette référence). Elles
couvrent la suite complète des états dynamiques à chaque pas : les six karts, contrôles, RNG, objets, chronos et coupe. Seul le nouveau
champ inerte `specialMs: 0` est retiré ; toute activation est rejetée par assertion.
Chaque rejeu est découpé en contrôles de 600 pas, chacun borné à 2 s réelles,
avec empreinte historique intermédiaire et empreinte finale intégrale. Les résultats
historiques sont préservés, y compris les classements perdants du pilote aux L11/L20/L24/L26.

## Collier — présentation et contrôles

Le treizième jeu, **Le Collier du Singe** (id `collier`), se renomme dans
la seule constante `GAME_NAME` de `src/engines/collier/levels.ts`. Champ 360 × 640,
pas fixe 1000/60 ms, PRNG partagé, snapshots sérialisables. Les parcours sont
des courbes originales : ovales paramétriques, dont un ovale croissant, raccords circulaires tangents de
rayon 40 et deux couloirs arrondis aux derniers niveaux. Une table d'abscisse
curviligne à pas maximal d’une unité permet `pointAt(s)`, borné au départ et au trou. La longueur cible
tronque le parcours sans agrandir ses coordonnées. Les courbes restent dans le
champ utile, à 30 unités minimum du tireur ; les portions éloignées et les deux
couloirs restent séparés d'au moins un diamètre hors tunnels. Deux tangentes à
20 unités d'écart tournent de moins de 35°.

La queue avance et pousse les perles en contact, espacées de 20 unités. Les six
premières sont déployées ; jusqu'à douze sorties, le déroulé avance à 100 unités/s,
puis à la vitesse du tableau. Chaque nouvelle perle entre à s = 0, même après disparition de la queue.
La queue rejoint les segments distants avant de les pousser. Les couleurs viennent
du PRNG à graine, en séries de une à trois perles : chaque nouvelle série change
de couleur, donc jamais quatre identiques. Une série de trois émise ne déclenche
aucun éclatement spontané. Au-delà de 85 %, danger
et vitesse ×1,4 (×1,8 dès le niveau 25). Deux parcours indépendants partagent le
tireur et le quota aux niveaux 29–30 ; chacun conserve sa propre queue et son trou.

Le rendu ajuste uniformément chaque champ dans une zone de 312 × 456, avec
marges pour les acteurs ; son rectangle de tracé couvre entre 60,3 % et 77,5 %
de la zone utile 360 × 510. La transformation inverse est commune aux trois
écouteurs de pointeur, et exposée par `view()` dans le crochet de test. Les perles
ont un diamètre affiché de 23 unités et six silhouettes (cœur, étoile, banane,
feuille, goutte, fleur), avec contour et reflet. Les bonus ont quatre icônes propres.
Le meneur est dessiné sur 64 unités affichées ; le tireur sur 60. Son anneau de
visée et sa flèche entourent la tête ; courante et réserve sont sous le visage.

Les niveaux 1–8 présentent le Cirque Tutu, 9–16 la Jungle des bananes,
17–24 la Fête foraine de nuit, 25–30 le Ciel arc-en-ciel. Chaque décor est dessiné
une seule fois en texture, conservée pour les niveaux du même univers. Le rail
clair bordé est dessiné en trois chemins continus pour limiter le coût du rendu.
La sortie devient malle, panier, chapeau ou nuage selon l’univers ; son ouverture s’élargit au danger. Les éclatements dispersent le
motif de la perle ; les réactions affichent « Combo ×N » et une petite secousse.
Le meneur danse plus vite au danger. Avec mouvement réduit, le décor reste fixe,
les particules et secousses sont désactivées, sans accélération de danse.

Les titres des cartes gardent leur police et leur interligne : 20 × 1,2 = 24 px.
Une hauteur commune de deux lignes (48 px) évite que le centrage du contenu
des boutons décale une vignette de (48 − 24) / 2 = 12 px. Aucune règle de dessin
des douze autres vignettes n’a changé.

Un projectile de 650 unités/s maximum en vol, trajectoire droite, disparaît hors
champ. Couleurs courante/suivante tirées uniquement parmi les couleurs présentes.
La projection du contact sur la tangente choisit l'insertion avant/arrière.
Un groupe contigu de trois ou plus contenant la perle insérée éclate (10 points
par perle × multiplicateur). Après un éclatement, le segment avant s'arrête :
bords identiques, attraction arrière à 100 unités/s jusqu'au contact puis nouvelle
résolution ; bords différents, seule la queue referme le trou. Les résolutions
successives augmentent le multiplicateur. Une traversée réelle d'un trou rapporte
25 points, une seule fois par projectile. Les portions en tunnel sont invisibles
et intouchables. Défaite à l'arrivée d'une tête au trou ; victoire après sortie
du quota et disparition de toutes les perles, avec bonus égal à la distance
restante du dernier groupe au trou (arrondie).

Les bonus portés par les perles s'activent à l'éclatement : Ralentir ×0,5 pendant
5000 ms ; Reculer à 60 unités/s pendant 1500 ms (arrêt au départ) ; Bombe détruit
les perles à distance euclidienne ≤40 du prochain impact, mesurée avant tout
déplacement dû à l’insertion ; Viser montre le point
d'impact exact pendant 8000 ms. Une réactivation relance la durée, sans cumul.
Les bonus disponibles sont introduits un par un tous les quatre niveaux ; une
perle bonus toutes les N sorties (colonne rareté), avec type choisi à graine.

Tutu danse devant la tête, s'inquiète au danger, célèbre les combos de trois
résolutions et devient triste en cas de défaite. Si le tireur choisi est Tutu,
Boubou mène le collier. Le tireur utilise `GameCharacter` et donc le choix de
l'accueil ; aucun paramètre de règle ne dépend de son identité. CaliRoux tire
visuellement la queue pendant Reculer. Dessins et sons sont procéduraux.

Au doigt ou à la souris : viser partout puis relâcher ; guide pointillé au-delà
du doigt ; Viser le borne au point d'impact exact. Appui commencé sur le tireur ou la
réserve, déplacement maximal strictement inférieur à 10 unités logiques : échanger
sans tirer, quelle que soit la durée (y compris 600 ms). Une excursion de 10 unités
ou plus reste un glissé, même après retour au départ. Le bouton ⇄ de 56 px échange aussi. Clavier : ← →, Espace, X,
P/Échap. Le socle assure Prêt ?, pause, ☰, panneaux, sélection des niveaux et
progression sauvegardée dans `arcade-lab:collier:v1`. Le hook de scène
`__COLLIER_TEST__` offre lecture, HUD, aire utile, chargement, avance temporelle
et trois états presque finis résolus par les règles ordinaires.

| Niv. | Forme | Couleurs | Quota | Vitesse | Longueur | Bonus disponibles | Rareté N | Nouveau ressort |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 1 | Ovale croissant | 3 | 24 | 4.00 | 1050 | — | 6 | chaîne |
| 2 | Ruban en S | 3 | 26 | 4.16 | 1045 | — | 6 | — |
| 3 | Serpent | 3 | 28 | 4.32 | 1040 | — | 6 | — |
| 4 | Arche arrondie | 3 | 30 | 4.48 | 1035 | — | 6 | — |
| 5 | Fer à cheval | 3 | 32 | 4.64 | 1030 | Ralentir | 7 | Ralentir |
| 6 | Zigzag | 3 | 34 | 4.80 | 1025 | Ralentir | 7 | — |
| 7 | Cœur ouvert | 3 | 36 | 4.96 | 1020 | Ralentir | 7 | — |
| 8 | Ovale ouvert | 3 | 38 | 5.12 | 1015 | Ralentir | 7 | — |
| 9 | Ovale croissant | 4 | 40 | 5.28 | 1010 | Ralentir, Reculer | 8 | Reculer |
| 10 | Ruban en S | 4 | 42 | 5.44 | 1005 | Ralentir, Reculer | 8 | — |
| 11 | Serpent | 4 | 44 | 5.60 | 1000 | Ralentir, Reculer | 8 | — |
| 12 | Arche arrondie | 4 | 46 | 5.76 | 995 | Ralentir, Reculer | 8 | — |
| 13 | Fer à cheval | 4 | 48 | 5.92 | 990 | Ralentir, Reculer, Bombe | 9 | Bombe |
| 14 | Zigzag | 4 | 50 | 6.08 | 985 | Ralentir, Reculer, Bombe | 9 | — |
| 15 | Cœur ouvert | 4 | 52 | 6.24 | 980 | Ralentir, Reculer, Bombe | 9 | — |
| 16 | Ovale ouvert | 4 | 54 | 6.40 | 975 | Ralentir, Reculer, Bombe | 9 | — |
| 17 | Ovale croissant | 5 | 56 | 6.56 | 970 | Ralentir, Reculer, Bombe, Viser | 10 | Viser |
| 18 | Ruban en S | 5 | 58 | 6.72 | 965 | Ralentir, Reculer, Bombe, Viser | 10 | — |
| 19 | Serpent | 5 | 60 | 6.88 | 960 | Ralentir, Reculer, Bombe, Viser | 10 | — |
| 20 | Arche arrondie | 5 | 62 | 7.04 | 955 | Ralentir, Reculer, Bombe, Viser | 10 | — |
| 21 | Fer à cheval | 5 | 64 | 7.20 | 950 | Ralentir, Reculer, Bombe, Viser | 11 | tunnels |
| 22 | Zigzag | 5 | 66 | 7.36 | 945 | Ralentir, Reculer, Bombe, Viser | 11 | — |
| 23 | Cœur ouvert | 5 | 68 | 7.52 | 940 | Ralentir, Reculer, Bombe, Viser | 11 | — |
| 24 | Ovale ouvert | 5 | 70 | 7.68 | 935 | Ralentir, Reculer, Bombe, Viser | 11 | — |
| 25 | Ovale croissant | 6 | 72 | 7.84 | 930 | Ralentir, Reculer, Bombe, Viser | 12 | décentrage et accélération |
| 26 | Ruban en S | 6 | 74 | 8.00 | 925 | Ralentir, Reculer, Bombe, Viser | 12 | — |
| 27 | Serpent | 6 | 76 | 8.16 | 920 | Ralentir, Reculer, Bombe, Viser | 12 | — |
| 28 | Arche arrondie | 6 | 78 | 8.32 | 915 | Ralentir, Reculer, Bombe, Viser | 12 | — |
| 29 | Rails jumeaux | 6 | 80 | 8.48 | 910 | Ralentir, Reculer, Bombe, Viser | 13 | deux colliers |
| 30 | Rails jumeaux | 6 | 82 | 8.64 | 905 | Ralentir, Reculer, Bombe, Viser | 13 | — |

### Oracle Collier

Les corps partagés de `tests/collier-cases.ts` sont appelés par Vitest
(`tests/collier.test.ts`) et directement en Node par
`scripts/validate-collier.js`, inscrit dans `test:node`. C15 est découpé en quatre lots consécutifs de 500 images conservant leur état.
Chaque cas est borné à deux secondes ; aucune campagne complète ne tourne dans Vitest.
C16 et C21–C30 sont exécutés en Node dans `scripts/collier-scene-oracles.js` :
la scène livrée est transpilée en mémoire, les services de plateforme sont doublés,
et ses vrais écouteurs et appels de dessin sont contrôlés. Aucun moteur alternatif
ni logique de contrôle recopiée n'est utilisé. C16 construit cinq scènes avec les
cinq identités, vérifie tireur/meneur et compare les snapshots du vrai moteur.

| Oracle | Preuve |
| --- | --- |
| C01 | Bornes littérales, interpolation, longueur euclidienne et huit signatures normalisées de formes |
| C02 | Poussée de la queue, segment avant arrêté, espacement exact au contact, espacement à l’entrée et quota |
| C03 | Insertions avant/arrière sur un tracé rectiligne indépendant |
| C04 | Deux perles conservées, trois éclatées et 30 points |
| C05 | Attraction avec couleurs égales, aucun recul avec couleurs différentes puis fermeture |
| C06 | Groupe central retiré, rapprochement, second groupe et score ×2 |
| C07 | Palette de tir limitée à la couleur réellement présente |
| C08 | Échange sans consommation de graine, refus pendant le vol, un seul projectile |
| C09 | Ralentir et Reculer : porteur, effet, durée et relance ; événement bonus à l’éclatement |
| C10 | Bombe avant déplacement : témoins à 38,5 / 40 / 40,1 et reproduction à 21 unités ; Viser, durée, relance, impact exact |
| C11 | Traversée réelle d'un trou : 25 points ; tunnel intouchable avec témoin découvert |
| C12 | Danger et événement au franchissement par avance ou insertion, sans doublon ; accélération à 85 %, facteur ×1,8 au niveau 25, signaux life/lost, victoire, bonus de distance et quota non terminé |
| C13 | Snapshots identiques pour graine/entrées identiques et découpage temporel équivalent |
| C14 | Sens de chacun des cinq paramètres, valeurs extrêmes strictes, longueurs réelles |
| C15 | Raster des cercles réellement dessinés sur 2000 pas, aucune série de 36 images fixes |
| C16 | Cinq scènes construites avec identités réelles ; meneur choisi et snapshots moteur identiques (Node) |
| C17 | Huit formes, introductions 1/5/9/13/17/21/25/29, bonus, tunnels, deux parcours |
| C18 | Émissions à s = 0 après des éclatements réellement obtenus par le pilote |
| C19 | 300 émissions dans le test court ; 2000 dans le validateur complet ; séries 1/2/3, jamais 4, aucune période 1–12, graines reproductibles |
| C20 | Contrôle fin des niveaux 1, 10, 30 et contrôle léger des 30 ; le validateur contrôle finement les 30. Champ, tireur/réserve, courbure et séparation exacte par cellules spatiales |
| C21 | Vrais écouteurs : tap réserve/tireur, limite stricte de 10 px, appuis de 600 ms sur réserve/tireur et ailleurs et excursion avec retour ; visée au relâché distincte du dernier mouvement au doigt et à la souris ; reprise après touchcancel/pointerupoutside ; Espace, X, flèches (Node) |
| C22 | Vrais appels de dessin : meneur suivant la tête, guide Viser borné à l’impact (Node) |
| C23 | Événements danger, bonus, life et lost transmis une seule fois au service sonore par la scène (Node) |
| C24 | Cinq personnages × 16 angles : anneau, flèche et perles hors de l’ellipse conservatrice de la tête, via les vrais appels de dessin |
| C25 | Quatre univers distincts, texture de décor réutilisée |
| C26 | Six silhouettes de motifs distinctes dans les perles réellement dessinées |
| C27 | Transformation réellement appliquée, conversion inverse du doigt, couverture ≥55 % sur les 30 niveaux, perles ≥22 px CSS et meneur ≥44 px à 390×844 |
| C28 | Aucune secousse avec mouvement réduit ; quatre icônes de bonus distinctes |
| C29 | Hauteur de titre réservée à deux lignes dans les cartes, calcul de l’alignement |
| C30 | Lecture pilote légère : vrais écouteurs de scène, cibles et tête identiques au moteur, aucun appel à snapshot ; noms des formes cohérents |

Le pilote déterministe vise les groupes visibles de sa couleur et échange si la
réserve prolonge un meilleur groupe. Le validateur rejoue les trente niveaux sur
la graine 300 avec de vrais tirs et vols, et vérifie trente défaites par inaction
ainsi que six campagnes de tirs aléatoires perdantes. Il appelle également
`measureDiversity` : couverture 30/30, moins de 10 % de voisins clones, au plus
trois niveaux sans nouveau ressort. Ce sont des preuves du pilote, pas une mesure
de difficulté humaine.

E2E écrits, à exécuter par l'orchestrateur : `collier.spec.ts` sur desktop et
mobile (glissé CDP avec angle contrôlé avant relâché et tap réserve/tireur ;
sur desktop souris, Espace et X ; victoire par entrées, suivant, défaite/rejouer, progression conservée
après rechargement, console propre et quatre captures), et
`collier-finger.spec.ts` sur mobile 390×844 (CDP tactile, bruit ±12 px, latence
150 ms, niveaux 1 et 5 sans avance artificielle, échange et pièce jointe JSON).
Le pilote privilégie explicitement les groupes d’au moins deux et utilise la réserve
si elle offre mieux ; après échange il tire dans le même cycle. Les coordonnées
cibles restent à l’intérieur du canevas transformé. Le rejeu Node emploie le même
bruit en pixels CSS, 150 ms de latence et une cadence de 1,5 s. Il doit gagner sous 120 secondes simulées ;
l’E2E exige une victoire avant 120 secondes pour un délai total de 240 secondes.
Le pilote lit directement l’état minimal, sans construire de snapshot complet.
La visée E2E est comparée à la position CSS réellement envoyée, arrondie et
convertie avec `view()` ; une tolérance de 0,01 rad couvre l’arrondi du pointeur,
tout en refusant une visée figée ou une mauvaise échelle.
M01–M04 incluent Collier sur les trois formats ; V04–V08 comptent treize vignettes.
Aucun navigateur ni Vitest exécuté pendant cette passe.

Les vingt-trois mutations de `scripts/collier-mutations.json` ont chacune une ancre unique.
`scripts/check-collier-mutations.js` exécute un témoin intact puis les vingt-trois versions
mutées dans des processus Node isolés, chacune contre son oracle dédié ; les lectures de sources sont remplacées
en mémoire, sans modifier l’arbre. Une assertion doit échouer pour compter une
mutation tuée : une erreur de syntaxe ou de chargement ne suffit pas. Ces mêmes
oracles sont appelés par `npm run test:node -- --only=validate-collier.js`.
Les captures restent à examiner par l’orchestrateur : rondeur et marges des tracés,
placement du meneur, guide Viser, réserve accessible et deux couloirs distincts.


Le pilote tactile Collier utilise `readDriver()` : courante, suivante, angle,
état de vol, tête et cibles visibles/cachées, sans table de tracé ni acteurs.
La transformation et le rectangle du canevas sont lus avant la conduite et gardés
pour ce niveau à fenêtre fixe. Chaque itération effectue une seule lecture distante ;
aucune recherche DOM ni capture ne se produit pendant la conduite. Un vol en cours
est relu après 150 ms, sans attendre explicitement son atterrissage. Les échanges
et tirs passent par les vrais paquets tactiles. Le JSON expose les temps par
itération : lecture, politique, attente de vol, latence, CDP, total et intervalle
entre entrées. Les intervalles doivent rester sous 1,5 s.
Le validateur rejoue les niveaux 1 et 5 à une décision toutes les 1,5 s,
avec bruit ±12 px CSS, 150 ms de latence plus le coût mesuré de lecture Node.
Il exige une victoire avant 120 s (délai E2E : 240 s) ; ce modèle ne mesure
pas la latence CDP du conteneur, que le JSON E2E doit établir sur l'hôte.
## Pépites

Jeu de mine original, mené par le compagnon choisi : creuser la terre case par
case, ramasser des pépites, ouvrir la sortie au quota, sans se faire écraser.
Moteur pur `src/engines/pepites/engine.ts` (12 × 16 cases, bord de roche mère),
simulation au tour : un tour toutes les `turnFrames` images (7 à 9, soit 117 à
150 ms), le personnage agit d'abord, puis le monde, **balayé du bas vers le haut
et de gauche à droite**, chaque objet ne bougeant qu'une fois par tour.

| Élément | Règle |
| --- | --- |
| Terre `.` | Le personnage la creuse en avançant. |
| Rocher `o`, pépite `*` | Tombent d'une case par tour dans le vide ; **roulent** à gauche (sinon à droite) d'un rocher, d'une pépite ou d'une brique si la case de côté et celle du dessous sont vides ; jamais sur la terre. Un objet **en chute** qui arrive sur le personnage l'écrase ; posé sur sa tête, il attend qu'il parte. |
| Pousser | Un rocher immobile se pousse d'une case sur le côté si la case suivante est vide ; jamais vers le haut. |
| Sortie `E` | Ouverte quand `goal` pépites sont ramassées ; y entrer termine la mine (+ secondes restantes × niveau). |
| Luciole `f` / papillon `b` | Longent les murs, main gauche pour la luciole, main droite pour le papillon. Le contact (case voisine) déclenche une explosion 3 × 3 ; un objet en chute qui les écrase aussi. La luciole laisse du vide, le papillon des pépites. |
| Mur trieur `m` | Activé par le premier objet qui tombe dessus, pendant `sortTurns` tours : un rocher en chute ressort dessous en pépite, une pépite en rocher (case du dessous libre) ; éteint, l'objet disparaît. |
| Mousse `a` | Toutes les `mossEvery` tours, gagne une case voisine (terre ou vide, tirage PRNG) ; sans place, elle devient pépites ; à `mossLimit` cases, rochers. |
| Dynamite `x` | Fixe ; un objet **en chute** qui la touche ouvre un trou 3 × 3, briques comprises (la roche mère et la sortie résistent). |
| Grosse pépite `g` | Tombe et roule comme une pépite ; compte pour trois. |
| Eau `w` | Toutes les `waterEvery` tours, inonde une case vide voisine (dessous d'abord, jamais au-dessus) ; inonder la case du personnage le noie. |
| Étai (spécial) | Une charge par mine : rochers, pépites, créatures, mousse et eau figés pendant 12 tours. Aucun bonus de score. |
| Chrono | Défaite « Temps écoulé » à zéro. |

Trente mines écrites (`levels.ts`), une nouveauté tous les trois à cinq niveaux
(chute 2, poussée 3, lucioles 4, papillon 6, mur trieur 9, mousse 12, étai 16,
dynamite 17, eau 21, grosse pépite 26) et un défi chronométré tous les cinq niveaux ; la 30 combine papillon,
mur trieur, mousse et eau. Contrôles : glisser et maintenir = direction tenue,
toucher une flèche = un pas, flèches des deux côtés du pouce, Étai au milieu ;
clavier : flèches/ZQSD maintenues, Espace pour l'étai.

Preuves : `tests/pepites-cases.ts` (P01-P11, positions littérales, Vitest et
`validate-pepites.js`), `scripts/record-pepites.js` (recherche bornée au meilleur
d'abord sur des tours entiers, calibration hors ligne dans un créneau de calcul)
écrit `tests/fixtures/pepites-campaign.json`, rejoué par `validate-pepites.js` dans
le budget de tours du chrono ; la politique au doigt (`tests/e2e/pepites-policy.ts` :
plus court chemin vers la pépite la plus proche, trois tours simulés sans perdre)
gagne les mines 1 et 3 en Node à 150 ms de latence et dans `pepites-finger.spec.ts`
(CDP, ±12 px).
## Gourmandises

Le nom affiché vient uniquement de `GAME_NAME` dans `levels.ts`. Le registre
expose 180 niveaux ; quinze mondes et 300 emplacements sont prévus, seuls les
neuf premiers mondes sont jouables. Les tailles, collectes et budgets suivent
les fiches pour les dimensions et les budgets ; les collectes sont rééquilibrées
par mesure. Les plateaux sont générés, jamais importés.

Permutation orthogonale par glisser ou deux touchers. Un échange sans alignement
est annulé sans dépense, sauf présence d'un spécial. Trois pièces disparaissent,
quatre créent un rayé orienté comme l'échange, cinq une bombe couleur, un L/T
un emballé. L'emballé frappe deux fois son voisinage 3×3, avec gravité entre
les explosions. Deux rayés font une croix ; rayé/emballé frappe trois lignes
et trois colonnes ; bombe/rayé transforme puis déclenche la couleur ; deux
bombes frappent tout le plateau. Les autres spéciaux touchés se déclenchent.

Les caisses ont une ou deux couches, bloquent la gravité et prennent un dégât
par vague adjacente ou spéciale. La glace reste sous la pièce et perd une couche
quand cette case est touchée. Les absences coupent les colonnes en segments.
La gravité conserve l'ordre de chaque segment, puis le remplit avec le PRNG
commun. Chaque couleur ordinaire a un poids de 1 ; la couleur demandée a le
poids `targetWeight` déclaré dans le niveau (probabilité poids / somme des poids).
Ce sac reste identique pour les personnages et les deux modes, sans adaptation
au résultat du joueur. Les cibles sont 56 fraises, 42 étoiles ou 30 feuilles :
les budgets décroissants et les sacs différents compensent les cascades et la
surface disponible. Aucun coup minimum artificiel ne retarde la victoire.
Les cascades multiplient le score (10 points par pièce × profondeur).
Après résolution, tout état stable a un coup valide ; sinon permutation à
graine de l'inventaire, sans alignement préexistant, couleurs et spéciaux conservés.

Découverte : budget non bloquant, trois marteaux, fusées et arcs-en-ciel, indice
clignotant après 5000 ms d'inactivité. Arcade : budget des fiches et un outil de
chaque type. Marteau : une case ; fusée : une ligne ; arc-en-ciel : la couleur
visée. Les outils ne consomment pas de coup et respectent obstacles et cascades.
Tous les objectifs doivent être atteints ; sinon Arcade perd au dernier coup.
Étoiles après victoire : une, deux à 1500 points, trois à 3000 points. Le moteur
accepte plusieurs collectes, un objectif de score ou de couches à casser.

Le premier monde introduit les alignements, le deuxième les rayés dans des
couloirs, le troisième les îlots de caisses puis leurs deux couches. Les finales
20/40/60 commencent avec une bombe couleur. La glace simple apparaît en fin
de monde. La descente d’objets et la glace double occupent les mondes 4 à 6.
Les types liane, chocolat, tapis, portail, miel, cadenas et clé restent des
points d’extension pour les campagnes suivantes. `difficulty` compte exclusivement les paramètres réels :
somme des objectifs / budget, couleurs, couches de bois et glace, cases absentes,
nombre d'objectifs. G17 vérifie leur correspondance au terrain et leur monotonie
dans les trois premiers mondes. Les passages 20→21 et 40→41 réinitialisent la cible, le
budget et la géométrie : leur pression brute et leurs absences peuvent donc
baisser, sans supplément de rang caché. La progression entre mondes est prouvée
par la médiane mesurée du glouton, pas par cette fonction.

La colonne étroite, la croix et les deux compartiments reliés ont leurs propres
masques ; un bonus central ne remplace plus une cloison. Les surfaces absentes
progressent par taille de plateau (12, 14 puis 16 cases après l'introduction),
les îlots de bois passent à deux couches et la glace arrive en fin de monde.
G17 vérifie aussi la colonne, la croix et le pont unique entre compartiments
dans les trois mondes.

Le compagnon choisi à l'accueil est réellement transmis au moteur et au
`GameCharacter` : saut lors d'un alignement, spécial lors d'une cascade, joie
ou tristesse au résultat, repos en pause. Aucun effet sur les règles. Dessins
et sons sont procéduraux. Les effets `life`, `won` et `lost` utilisent les
vibrations du socle. Une rangée de trois boutons de 56 px reste sous le plateau.
Flèches : curseur ; Espace puis flèche : échange ; 1/2/3 : outil puis Espace ;
P/Échap : pause. Le menu propose les deux modes et le sélecteur commun.

Progression : `arcade-lab:gourmandises:v1` ; préférence :
`arcade-lab:gourmandises:mode:v1` ; partie : `arcade-lab:gourmandises:run:v1`.
Le panneau « Prêt ? » précède les entrées ; `realtime: false`. Le crochet
`__GOURMANDISES_TEST__` propose lecture, HUD, zone utile, chargement, géométrie
et conseil glouton. Ses scénarios presque finis rejouent exclusivement des
permutations ordinaires et rendent la dernière permutation à effectuer.

### Campagne et preuve

`nice -n 19 ionice -c3 npm run test:node -- --only=validate-gourmandises.js`
exécute les corps G01–G24 et G17Campaign utilisés par Vitest, les assertions de
scène, les 26 mutations en mémoire, la campagne complète et 200 permutations
effectivement jouées par niveau en Découverte.
Le substitut de scène remplace uniquement la classe de rendu et enregistre les
vrais appels Canvas : flèches, Espace, outils, surbrillance, phases de l'indice,
son `match` et positions de chute à 280/140/0 ms. Aucun navigateur n'est créé.

Graines **8, 19, 37, 65, 101**, sans outils : **300/300 victoires** du glouton
(meilleure progression immédiate, score pour départager). Chaque médiane de
niveau respecte 25–50 % du budget en 1–10, 40–70 % en 11–40, 55–85 % en
41–60 ; aucune des cinq parties ne dépasse le budget. Médianes entre mondes :
**50.0 %** → **62.5 %** → **76.0 %**. Le pilote aléatoire choisit uniformément une permutation valide
avec un PRNG initialisé à graine + indice du niveau : **6/50 défaites** en 1–10
(88 % de victoires), **45/100** en 21–40, **52/100** en 41–60. Le validateur
verrouille les fourchettes et les taux minimaux demandés, sans exiger ces valeurs
exactes. Découverte garde son budget non bloquant. Cette preuve couvre ces
cinq graines, pas toutes les parties possibles. Les 12000 permutations
d'endurance restent stables et disposent d'un coup valide. G20 reprend les
niveaux 2, 21, 41 sur deux graines (37 et 101), avec les mêmes fourchettes et des
contrôles courts de l'aléatoire, dans le budget de 2 s.

Dimensions : colonnes × rangées. Objectif : F = fraises, E = étoiles, L = feuilles.
Obstacles : B = couches de bois, G = glace, V = cases absentes. La médiane du
glouton et le taux de défaite aléatoire portent sur cinq graines par niveau.

| Niveau | Taille | Objectif | Coups | Glouton médian (coups) | Médiane / budget | Défaite aléatoire | B/G/V |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6×6 | F 56 | 28 | 12 | 42.9 % | 20 % | 0/0/0 |
| 2 | 6×6 | F 56 | 28 | 13 | 46.4 % | 0 % | 0/0/0 |
| 3 | 6×6 | F 56 | 27 | 11 | 40.7 % | 20 % | 0/0/12 |
| 4 | 6×6 | F 56 | 27 | 12 | 44.4 % | 0 % | 0/0/12 |
| 5 | 6×6 | F 56 | 26 | 13 | 50.0 % | 0 % | 0/0/12 |
| 6 | 6×6 | F 56 | 26 | 13 | 50.0 % | 20 % | 0/0/12 |
| 7 | 6×6 | F 56 | 25 | 12 | 48.0 % | 20 % | 0/0/12 |
| 8 | 7×7 | F 56 | 25 | 7 | 28.0 % | 20 % | 0/0/14 |
| 9 | 7×7 | F 56 | 24 | 12 | 50.0 % | 0 % | 0/0/14 |
| 10 | 7×7 | F 56 | 24 | 9 | 37.5 % | 20 % | 0/0/14 |
| 11 | 7×7 | F 56 | 23 | 12 | 52.2 % | 40 % | 0/0/14 |
| 12 | 7×7 | F 56 | 23 | 14 | 60.9 % | 80 % | 0/0/14 |
| 13 | 7×7 | F 56 | 22 | 12 | 54.5 % | 60 % | 0/0/14 |
| 14 | 7×7 | F 56 | 22 | 12 | 54.5 % | 100 % | 0/0/14 |
| 15 | 8×7 | F 56 | 21 | 10 | 47.6 % | 80 % | 0/0/16 |
| 16 | 8×7 | F 56 | 21 | 13 | 61.9 % | 20 % | 0/0/16 |
| 17 | 8×7 | F 56 | 20 | 10 | 50.0 % | 40 % | 0/0/16 |
| 18 | 8×7 | F 56 | 20 | 13 | 65.0 % | 40 % | 0/3/16 |
| 19 | 8×7 | F 56 | 19 | 13 | 68.4 % | 60 % | 0/3/16 |
| 20 | 8×7 | F 56 | 19 | 10 | 52.6 % | 20 % | 0/3/16 |
| 21 | 6×6 | E 42 | 28 | 12 | 42.9 % | 40 % | 0/0/4 |
| 22 | 6×6 | E 42 | 28 | 15 | 53.6 % | 40 % | 0/0/4 |
| 23 | 6×6 | E 42 | 27 | 14 | 51.9 % | 20 % | 0/0/12 |
| 24 | 6×6 | E 42 | 27 | 17 | 63.0 % | 40 % | 0/0/12 |
| 25 | 6×6 | E 42 | 26 | 18 | 69.2 % | 20 % | 0/0/12 |
| 26 | 6×6 | E 42 | 26 | 14 | 53.8 % | 20 % | 0/0/12 |
| 27 | 6×6 | E 42 | 25 | 15 | 60.0 % | 40 % | 0/0/12 |
| 28 | 7×7 | E 42 | 25 | 15 | 60.0 % | 40 % | 0/0/14 |
| 29 | 7×7 | E 42 | 24 | 15 | 62.5 % | 60 % | 0/0/14 |
| 30 | 7×7 | E 42 | 24 | 15 | 62.5 % | 60 % | 0/0/14 |
| 31 | 7×7 | E 42 | 23 | 15 | 65.2 % | 40 % | 0/0/14 |
| 32 | 7×7 | E 42 | 23 | 11 | 47.8 % | 60 % | 0/0/14 |
| 33 | 7×7 | E 42 | 22 | 15 | 68.2 % | 60 % | 0/0/14 |
| 34 | 7×7 | E 42 | 22 | 15 | 68.2 % | 20 % | 0/0/14 |
| 35 | 8×7 | E 42 | 21 | 14 | 66.7 % | 80 % | 0/0/16 |
| 36 | 8×7 | E 42 | 21 | 13 | 61.9 % | 80 % | 0/0/16 |
| 37 | 8×7 | E 42 | 20 | 14 | 70.0 % | 20 % | 0/0/16 |
| 38 | 8×7 | E 42 | 20 | 13 | 65.0 % | 80 % | 0/3/16 |
| 39 | 8×7 | E 42 | 19 | 13 | 68.4 % | 60 % | 0/3/16 |
| 40 | 8×7 | E 42 | 19 | 10 | 52.6 % | 20 % | 0/3/16 |
| 41 | 6×6 | L 30 | 28 | 22 | 78.6 % | 100 % | 2/0/0 |
| 42 | 6×6 | L 30 | 28 | 22 | 78.6 % | 60 % | 2/0/0 |
| 43 | 6×6 | L 30 | 27 | 21 | 77.8 % | 60 % | 2/0/12 |
| 44 | 6×6 | L 30 | 27 | 17 | 63.0 % | 0 % | 2/0/12 |
| 45 | 6×6 | L 30 | 26 | 20 | 76.9 % | 60 % | 2/0/12 |
| 46 | 6×6 | L 30 | 26 | 22 | 84.6 % | 60 % | 2/0/12 |
| 47 | 6×6 | L 30 | 25 | 21 | 84.0 % | 20 % | 2/0/12 |
| 48 | 7×7 | L 30 | 25 | 17 | 68.0 % | 80 % | 3/0/14 |
| 49 | 7×7 | L 30 | 24 | 17 | 70.8 % | 60 % | 3/0/14 |
| 50 | 7×7 | L 30 | 24 | 15 | 62.5 % | 60 % | 3/0/14 |
| 51 | 7×7 | L 30 | 23 | 17 | 73.9 % | 20 % | 12/0/14 |
| 52 | 7×7 | L 30 | 23 | 19 | 82.6 % | 60 % | 12/0/14 |
| 53 | 7×7 | L 30 | 22 | 17 | 77.3 % | 20 % | 12/0/14 |
| 54 | 7×7 | L 30 | 22 | 17 | 77.3 % | 40 % | 12/0/14 |
| 55 | 8×7 | L 30 | 21 | 15 | 71.4 % | 80 % | 16/0/16 |
| 56 | 8×7 | L 30 | 21 | 15 | 71.4 % | 20 % | 16/0/16 |
| 57 | 8×7 | L 30 | 20 | 15 | 75.0 % | 60 % | 16/0/16 |
| 58 | 8×7 | L 30 | 20 | 15 | 75.0 % | 40 % | 16/3/16 |
| 59 | 8×7 | L 30 | 19 | 15 | 78.9 % | 60 % | 16/3/16 |
| 60 | 8×7 | L 30 | 19 | 14 | 73.7 % | 80 % | 16/3/16 |

### Oracle

| ID | Preuve |
| --- | --- |
| G01 | Permutation reconnue, refus sans coût ni changement, voisinage orthogonal |
| G02 | Détection 3/4/5/L/T et conservation du pivot à la création |
| G03 | Ordre de gravité, remplissage et graine reproductibles |
| G04 | Cascade construite et score multiplié exactement |
| G05 | Rayés horizontal et vertical |
| G06 | Deux frappes 3×3 de l'emballé |
| G07 | Bombe sur exactement la couleur permutée |
| G08 | Empreintes exactes, conversion rayée déclenchée, caisse centrale sous double bombe |
| G09 | Caisse à deux couches, casse et séparation de la gravité |
| G10 | Glace sur alignement simple et sous le pivot protégé d’un nouveau spécial |
| G11 | Absence infranchissable, gravité segmentée, pas d'alignement à travers |
| G12 | Rebattage reproductible conservant l'inventaire, sans alignement et avec coup |
| G13 | Objectifs multiples, victoire/défaite, blocage après résultat, étoiles à 1499/1500/2999/3000 |
| G14 | Ensemble exact des cases touchées par chaque outil et stock consommé |
| G15 | Découverte non bloquante, limite d'indice à 5000 ms, Arcade sans indice |
| G16 | États sérialisables et événements identiques sur les mêmes entrées |
| G17 | Cinq paramètres physiques exacts, monotonie locale et géométrie des fiches |
| G18 | 2000 pas de vignette, aucune fenêtre de 36 pas figée, redémarrages |
| G19 | Cinq identités transmises et équilibre identique ; scène vérifiée sous Node |
| G20 | Trois niveaux × deux graines : pression du glouton et sélectivité aléatoire |

Mutations tuées : refus payant, minimum de quatre, gravité inversée, score sans
multiplieur, seconde explosion supprimée, glace incassable, outils illimités,
compagnon toujours identique dans la scène ; plus les huit mutations adverses :
bombe sans conversion rayée, deuxième étoile à 1499, flèches horizontales
inversées, raccourcis 1/3 inversés, indice invisible en Découverte, sélection
invisible, alignements muets, chutes instantanées. Toutes sont importées et tuées
en mémoire après vérification de l'unicité de chaque ancre, sans écrire les
sources mutées. Les ancres uniques sont dans
`scripts/gourmandises-mutations.json`, au format de `scripts/mutate.js`.

E2E écrits uniquement, à exécuter par l'hôte : victoire et suivant, défaite
Arcade et reprise, rechargement, absence d'erreur ; parcours clavier par Espace
et flèche, raccourcis 1/2/3 consommés, comparaison des pixels du plateau
avant/après sélection ; parcours tactile CDP 390×844
avec bruit ±12 px et latence 150 ms, deux touchers, outil, victoires 1 et 10,
JSON joint. Captures : `gourmandises-play`, `gourmandises-level60`,
`gourmandises-won`, `gourmandises-lost`, et avant/après pour le doigt.
Contrôler la lisibilité du HUD, les silhouettes et reflets, le compagnon hors
des cases, la rangée des outils, le plateau du niveau 60, les résultats et les
boutons Suivant/Rejouer. Aucun navigateur ni Vitest exécuté localement.

### Habillage Gourmandises

Décors statiques mis en cache par monde : jardin fleuri et maison de bois,
verger au crépuscule, sous-bois avec souches et pont. La table des noms prévoit
les quinze mondes. Le plateau en verre clair et bois occupe au moins 85 % de
la largeur utile des 180 niveaux et reste centré entre les cartes du HUD
et les outils. Objectifs illustrés, compteurs, alerte orange sous cinq coups,
étoiles et compagnon de 84 unités complètent le HUD. Les trois outils portent
un dessin et un compteur ; Échap désarme avant d’ouvrir le menu.

Les raccourcis peuvent armer pendant une chute ; leur état accessible est
synchronisé dès l’événement, sans attendre une image. Armer termine la chute
visuelle ; le moteur a déjà résolu le plateau et accepte la cible suivante. Les oracles Node exécutent les
vrais écouteurs installés par `create()` avec 1, 2, 3, Échap et vérifient les
trois boutons à chaque étape, y compris pendant une animation. Cinq mutations
supplémentaires couvrent géométrie, objectif, alerte, épuisement et clavier.
Les effets dessinent les pièces collectées et les rayons des spéciaux ; une
double bombe secoue légèrement le plateau. Le mouvement réduit supprime
particules, secousse et déplacement des pièces. Résultats : trois étoiles,
pleines selon le score. Le scénario clavier E2E reste réservé au bureau : le
parcours mobile impose des entrées exclusivement tactiles.

### Rivière, montagne et palais : niveaux 61 à 120

La rivière introduit les objets dorés (`piece.drop`), distincts des gouttes
bleues ordinaires. Ils descendent dans les segments ouverts et sortent par les
chevrons dorés (`exit`). Une sortie consomme immédiatement l’objet et incrémente
`drop`, sans score ni collecte de couleur. Les objets peuvent être échangés
si la permutation forme un alignement ordinaire ; ils ne s’alignent jamais,
ne sont détruits ni par un outil ni par un spécial et restent à leur place
pendant un rebattage. Au plus trois objets sont présents (deux dans la colonne
étroite), alimentés en haut des colonnes continues, jusqu’à la cible exacte.
Les dernières étapes de la rivière associent glace simple et descente.

La montagne possède de grandes bandes de glace simple, sous les fleurs à
collecter. Le palais alterne bandes de glace double et passages libres ; sa
finale resserre la glace dans deux longs couloirs. Chaque vague sur une case
retire exactement une couche, même lorsqu’un spécial est créé sur cette case.
Deux couches : surface pleine, double reflet et bord épais ; une couche :
surface légère, fissure ramifiée et bord fin. Les finales 80, 100 et 120 exigent
deux objectifs : descente + collecte, fleurs + glace, étoiles + glace.

Décors fixes mis en cache : rivière sinueuse, galets et cascade ; sommets
avec neige et sapins ; colonnes translucides et lustres de cristal. Les gouttes
dorées, chevrons de sortie et icônes du HUD sont dessinés par le code.
Le contrôle de largeur et de centrage couvre les 120 plateaux. G17 vérifie les
paramètres physiques de chaque niveau, les masques, les sorties, les grandes
zones gelées et les deux couches ; les nouvelles silhouettes font varier les
surfaces et les cibles réelles, sans indicateur artificiel de rang.

Mesure sans outils sur les graines 8, 19, 37, 65, 101 : **300/300 victoires**
sur cette extension, **600/600** sur toute la campagne. Le glouton conserve la
progression immédiate comme premier critère ; pour `drop`, il départage ensuite
par descente immédiate des objets, puis par score. Il ne regarde aucun coup
futur. Ses copies de simulation calculent les mêmes états sans conserver les
événements d’animation ; les parties et les rejeux les conservent.
Les médianes des mondes 4/5/6 valent **65,94 % / 73,38 % / 80,00 %**.
Les défaites aléatoires sont **92/100 / 81/100 / 98/100** respectivement.
Le validateur verrouille chaque médiane de niveau à 55–85 %, les cinq victoires,
la croissance entre ces trois mondes et au moins 50 % de défaites en 101–120.
Les cibles indicatives des fiches sont recalibrées ; dimensions, budgets,
graines, intentions de géométrie et bonus sont conservés.

G21 : gravité, sortie immédiate, protection des objets et inventaire déterministe
au rebattage. G22 : deux dégâts séparés et création de spécial sur glace double.
G23 : objectif `drop`, victoire conjointe, finales doubles et sortie par vraie
permutation. G24 : empreinte de snapshots **et** événements des niveaux 1–60,
prélevée avant l’extension : 101807812, sur cinq graines et six états par partie
(1800 états). La version courte reprend les 60 niveaux sur une graine.
G17Campaign : trois nouveaux niveaux sur deux graines, sous deux secondes.
Les 24000 coups d’endurance sont joués sans limite de budget, sans état mort.
Validation finale : 32,07 s pour le processus du validateur ; 35,93 s pour la
commande Node complète, précompilation du dépôt comprise. Le plafond de 40 s du validateur
est une assertion exécutée, comme le plafond de deux secondes par oracle.
Les cinq mutations de l’extension, conservées, couvrent destruction d’objet, objet rebattu,
sortie non comptée, deux couches détruites ensemble et progression `drop` nulle.

E2E écrit pour les projets bureau et mobile : `gourmandises-level120`, puis
`gourmandises-drop-before/after`, dans des sous-dossiers distincts
`desktop` et `mobile`. Le scénario rejoint la position par des
permutations ordinaires et laisse la dernière entrée au pilote souris ou aux
deux touchers mobiles. Node exerce aussi les vrais écouteurs de glisser et de
deux touchers sur ce scénario, avec contrôle du compteur et du coup dépensé.
Aucun navigateur, Vitest ou E2E exécuté localement ; les captures restent à
produire sur l’hôte autorisé. Vérifier les couloirs du palais, les deux objectifs,
la différence glace pleine/fissurée et l’objet doré qui traverse le chevron,
sans être compté comme une goutte bleue ordinaire.

D = objets sortis, F = fleurs, E = étoiles, G = couches de glace à briser,
B = gouttes bleues ordinaires. Glace/absences : couches initiales/cases absentes.

| Niveau | Taille | Objectif(s) | Coups | Glouton médian | Médiane / budget | Défaite aléatoire | Glace/absences |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | 7×7 | D 6 | 27 | 17 | 63.0 % | 100 % | 0/0 |
| 62 | 7×7 | D 6 | 27 | 18 | 66.7 % | 100 % | 0/0 |
| 63 | 7×7 | D 3 | 26 | 18 | 69.2 % | 20 % | 0/21 |
| 64 | 7×7 | D 4 | 26 | 18 | 69.2 % | 100 % | 0/16 |
| 65 | 7×7 | D 5 | 25 | 17 | 68.0 % | 100 % | 0/0 |
| 66 | 7×7 | D 5 | 25 | 16 | 64.0 % | 100 % | 0/0 |
| 67 | 7×7 | D 3 | 24 | 16 | 66.7 % | 100 % | 0/2 |
| 68 | 8×7 | D 4 | 24 | 18 | 75.0 % | 100 % | 0/1 |
| 69 | 8×7 | D 5 | 23 | 16 | 69.6 % | 100 % | 0/4 |
| 70 | 8×7 | D 5 | 23 | 15 | 65.2 % | 80 % | 0/0 |
| 71 | 8×7 | D 3 | 22 | 13 | 59.1 % | 100 % | 0/0 |
| 72 | 8×7 | D 2 | 22 | 13 | 59.1 % | 80 % | 0/6 |
| 73 | 8×7 | D 7 | 21 | 14 | 66.7 % | 100 % | 0/1 |
| 74 | 8×7 | D 4 | 21 | 12 | 57.1 % | 80 % | 0/4 |
| 75 | 8×8 | D 4 | 20 | 13 | 65.0 % | 100 % | 0/0 |
| 76 | 8×8 | D 5 | 20 | 12 | 60.0 % | 80 % | 0/0 |
| 77 | 8×8 | D 4 | 19 | 13 | 68.4 % | 100 % | 0/0 |
| 78 | 8×8 | D 8 | 19 | 12 | 63.2 % | 100 % | 8/1 |
| 79 | 8×8 | D 3 | 18 | 11 | 61.1 % | 100 % | 8/4 |
| 80 | 8×8 | D 6 + B 30 | 18 | 12 | 66.7 % | 100 % | 8/0 |
| 81 | 7×7 | F 68 | 27 | 20 | 74.1 % | 100 % | 35/0 |
| 82 | 7×7 | F 56 | 27 | 20 | 74.1 % | 100 % | 35/0 |
| 83 | 7×7 | F 48 | 26 | 19 | 73.1 % | 20 % | 15/21 |
| 84 | 7×7 | F 48 | 26 | 19 | 73.1 % | 40 % | 27/16 |
| 85 | 7×7 | F 60 | 25 | 18 | 72.0 % | 100 % | 35/0 |
| 86 | 7×7 | F 52 | 25 | 18 | 72.0 % | 100 % | 35/0 |
| 87 | 7×7 | F 60 | 24 | 17 | 70.8 % | 80 % | 33/2 |
| 88 | 8×7 | F 40 | 24 | 17 | 70.8 % | 100 % | 40/1 |
| 89 | 8×7 | F 72 | 23 | 17 | 73.9 % | 80 % | 40/4 |
| 90 | 8×7 | F 44 | 23 | 17 | 73.9 % | 80 % | 40/0 |
| 91 | 8×7 | F 40 | 22 | 16 | 72.7 % | 80 % | 40/0 |
| 92 | 8×7 | F 56 | 22 | 16 | 72.7 % | 100 % | 36/6 |
| 93 | 8×7 | F 68 | 21 | 15 | 71.4 % | 80 % | 40/1 |
| 94 | 8×7 | F 44 | 21 | 15 | 71.4 % | 80 % | 40/4 |
| 95 | 8×8 | F 44 | 20 | 15 | 75.0 % | 80 % | 48/0 |
| 96 | 8×8 | F 44 | 20 | 15 | 75.0 % | 100 % | 48/0 |
| 97 | 8×8 | F 40 | 19 | 14 | 73.7 % | 80 % | 48/0 |
| 98 | 8×8 | F 56 | 19 | 14 | 73.7 % | 40 % | 48/1 |
| 99 | 8×8 | F 40 | 18 | 14 | 77.8 % | 80 % | 48/4 |
| 100 | 8×8 | F 40 + G 48 | 18 | 14 | 77.8 % | 100 % | 48/0 |
| 101 | 7×7 | E 56 | 27 | 22 | 81.5 % | 100 % | 56/0 |
| 102 | 7×7 | E 44 | 27 | 21 | 77.8 % | 100 % | 56/0 |
| 103 | 7×7 | E 40 | 26 | 22 | 84.6 % | 80 % | 36/21 |
| 104 | 7×7 | E 56 | 26 | 21 | 80.8 % | 80 % | 40/16 |
| 105 | 7×7 | E 56 | 25 | 20 | 80.0 % | 100 % | 56/0 |
| 106 | 7×7 | E 52 | 25 | 20 | 80.0 % | 100 % | 56/0 |
| 107 | 7×7 | E 40 | 24 | 19 | 79.2 % | 100 % | 52/2 |
| 108 | 8×7 | E 52 | 24 | 18 | 75.0 % | 100 % | 70/1 |
| 109 | 8×7 | E 40 | 23 | 19 | 82.6 % | 100 % | 66/4 |
| 110 | 8×7 | E 48 | 23 | 17 | 73.9 % | 100 % | 70/0 |
| 111 | 8×7 | E 48 | 22 | 18 | 81.8 % | 100 % | 70/0 |
| 112 | 8×7 | E 72 | 22 | 18 | 81.8 % | 100 % | 58/6 |
| 113 | 8×7 | E 48 | 21 | 17 | 81.0 % | 100 % | 70/1 |
| 114 | 8×7 | E 72 | 21 | 15 | 71.4 % | 100 % | 66/4 |
| 115 | 8×8 | E 52 | 20 | 16 | 80.0 % | 100 % | 80/0 |
| 116 | 8×8 | E 60 | 20 | 16 | 80.0 % | 100 % | 80/0 |
| 117 | 8×8 | E 44 | 19 | 15 | 78.9 % | 100 % | 80/0 |
| 118 | 8×8 | E 56 | 19 | 15 | 78.9 % | 100 % | 80/1 |
| 119 | 8×8 | E 40 | 18 | 15 | 83.3 % | 100 % | 76/4 |
| 120 | 8×8 | E 64 + G 32 | 18 | 12 | 66.7 % | 100 % | 32/0 |

### Corrections de rendu et politique de mesure

Les boutons des trois outils conservent une surface tactile d’au moins 56 px et
une police de 16 px. Le canvas occupe 100 % de leur boîte intérieure, et la
pastille reste à l’intérieur. Un oracle Node calcule leurs dimensions aux trois
formats mobiles ; le contrôle E2E de l’hôte reste nécessaire pour les pixels.

Le pilote compare désormais les gains dans l’ordre strict : objectif plafonné,
descente des objets, score, puis ordre des permutations. Les cinq graines restent
8, 19, 37, 65 et 101 ; les seuils de la campagne sont inchangés. Les réglages de
dix niveaux du monde 4 sont recalibrés ; les niveaux 1–60 restent identiques.
L’oracle G25 vérifie le meilleur gain immédiat parmi toutes les permutations.

La scène garde un trajet distinct pour chaque objet livré, de son origine à sa
sortie, même si la gravité remplit ensuite cette sortie avec un bonbon. Les commandes
de dessin sont vérifiées au départ, à mi-course, à la sortie et après livraison,
ainsi qu’avec les mouvements réduits. Les oracles imposent aussi le dessin doré,
les deux couches de glace et le chevron de sortie. Les décors vérifient sept filets
de cascade, 24 galets, quatre étages par sapin et neuf cristaux de lustres ; les
craquelures de glace simple sont distinguées des reflets de glace double.
G17 verrouille 17 silhouettes littérales des six mondes.

| Monde | Médiane du glouton / budget | Défaite aléatoire (100 parties) |
| --- | --- | --- |
| 1 | 50.00 % | 33 % |
| 2 | 62.50 % | 45 % |
| 3 | 75.96 % | 52 % |
| 4 | 65.94 % | 92 % |
| 5 | 73.38 % | 81 % |
| 6 | 80.00 % | 98 % |

Les fourchettes par niveau passent sur les cinq graines, sans dépassement de
budget. Le tutoriel conserve 88 % de victoires aléatoires. L’empreinte des états
et événements des niveaux 1–60 reste `101807812` sur ces cinq graines.
Les 39 mutations (26 conservées et 13 ajoutées) sont tuées en mémoire : les huit
cas de la relecture, le trajet livré, la pondération de la politique, le canvas
et la pastille débordants, ainsi que les deux cases gênantes remplies.
### Circuits Kart du catalogue

K01 **Bambou Express**, K02 **Feuilles Folles** et K03 **Volcan Turbo** occupent
respectivement les indices 17, 19 et 26 (niveaux affichés 18, 20 et 27).
Ces emplacements évitent ceux rejoués par Z36 ; la progression va du raccourci
facultatif aux feuilles glissantes, puis à la lave et au pont effondré.
Les trente géométries restent distinctes. `legacyCircuits` conserve son ordre.
Les noms du catalogue deviennent les `circuitKey` des nouveaux circuits.
Les records des trois anciens circuits restent dans la sauvegarde sous leur
ancien nom, y compris après migration d'une clé numérique historique ; ils ne
sont jamais réattribués aux nouveaux circuits. Les nouveaux records sont
également conservés à la relecture.

Le raccourci K01 est une seconde route de largeur 4, des échantillons 65 à 79,
derrière une cascade ; son segment est plus court que l'arc principal et les
arbres laissent le passage libre. Il compte comme piste et franchit réellement
la porte 72 : le contrôle des portes reste strictement ordonné. La porte
intermédiaire reconnaît les deux voies, sans autoriser un tour qui la saute.
K02 réduit uniquement l'amortissement latéral sur ses tas de feuilles
(coefficient d'adhérence 0,12) : aucun plafond de vitesse d'herbe. Un kart en
l'air ne touche pas les feuilles. Son tunnel, ses plateformes et ses arbres
orange sont dessinés dans la scène.
K03 limite la vitesse sur lave à 22 % de la vitesse sur piste et annule objet,
turbo, charge de dérapage et Élan en cours ; un kart en l'air reste protégé.
Le tremplin déclenche à son extrémité le même saut `jumpDuration` que le BMX,
au seuil existant de 16 unités/s. Le trou suit le tremplin. En cas de lancement
manqué, le kart suit physiquement les planches extérieures à 7 unités/s puis
retrouve les commandes après le pont ; les collisions entre karts sont
suspendues sur ces planches pour éviter le blocage d’une file : aucun gel, remise au départ ni
traversée instantanée du trou. Le contournement est local à ce pont.

`tests/level-catalogue-kart-checks.ts` vérifie les trois géométries, mesure les
mécaniques dans la physique réelle et rejoue deux courses gagnantes par
circuit, six karts, objets et collisions actifs. K01 compare le tour
initial du rejeu au même pilote sur la voie normale et exige un temps plus
court par le raccourci ; sa
contre-épreuve refuse une porte omise et son contrôle positif franchit la
porte de la branche. K02 mesure une dérive latérale supérieure à celle sur
route sèche, à accélération longitudinale identique ; le passage aérien sert
de contre-épreuve. K03 exige moins de 50 % de la vitesse témoin et l'annulation
des bonus, vérifie le survol complet du trou puis le passage réel sur la voie
latérale après un saut manqué, sans arrêt de 0,5 s. Une traversée aérienne de
la lave conserve son bonus. Chaque circuit vérifie aussi l'isolation des
anciens et nouveaux records.

Les bandes sont régénérées par
`nice -n 19 ionice -c3 node scripts/record-level-catalogue-kart.js`.
Une bande par circuit utilise exactement le pilote joystick de
`scripts/derapage-human.js`, bruit déterministe et retard de 150 ms compris.
L'autre utilise les commandes de braquage ordinaires (raccourci pour K01).
Le rejeu exige victoire, trois tours, chronos, score et état final exacts.
La branche `catalogue()` les exécute dans `test:node` ; les tests unitaires
séparent chaque mécanique et chaque rejeu, avec un plafond de deux secondes. Aucun navigateur ni
Vitest n'a été utilisé pour cette validation.

Le rendu lit `circuit.theme.kart` et les zones mécaniques, sans numéro de
niveau. Bambous, eau, cascade, rochers, flèches et ponts ; forêt orange,
feuilles et tunnel ; basalte, coulées, flammes, fumée et tremplin sont tracés
avec Graphics. Les animations décoratives utilisent le temps de scène et
restent figées avec la préférence de mouvement réduit.
Pour la revue visuelle, capturer chacun en vue générale puis en vue de jeu :
les deux voies et la cascade K01, les tas lisibles avant le tunnel K02, les
plaques de lave et les planches extérieures autour du trou K03. Vérifier aussi
le kart en l'air, son ombre, les limites de piste et la lisibilité sur mobile.

Les replays historiques des emplacements remplacés utilisent explicitement
leur circuit de `legacyCircuits` via `createTrack` ; leurs empreintes restent
inchangées. Ils ne sont pas régénérés avec les nouvelles mécaniques.

Le contournement choisit désormais les planches du côté le plus proche. Une
approche lente depuis le centre rejoint d'abord ce côté, perpendiculairement
au trou, avant d'avancer sur les planches. `kartFootprint` définit les emprises
longitudinales et latérales utilisées par la physique et le dessin du trou et
du tremplin. Le saut exige les derniers 20 % du tremplin et sa largeur réelle ;
l'herbe adjacente ne déclenche aucun saut.
Les contre-épreuves couvrent les deux bords intérieurs, l'extérieur de chaque
bord et trente approches du pont à six vitesses. Chaque pas au sol doit rester
hors du trou ; aucune immobilisation de 0,5 s n'est admise. Les feuilles sont
aussi mesurées pendant un dérapage commandé. Les intervalles attendus de feuilles
et de lave sont écrits indépendamment dans les tests, avec contrôle de leur
étendue longitudinale et latérale et de leurs effets sur chaque segment.

`check-level-catalogue-kart.js`, inclus dans `test:node`, enregistre les appels
Graphics de la vraie scène, vérifie les décors et compare leurs animations à
deux temps de scène. Il régénère aussi en mémoire la bande joystick K02 avec
le vrai pilote, puis exige l'égalité intégrale avec la bande enregistrée.
`check-level-catalogue-kart-mutations.js` rejoue dix mutations isolées en mémoire
et refuse les survivantes ainsi que les erreurs de chargement ou de syntaxe.
La spec indépendante `tests/e2e/derapage-catalogue.spec.ts` prévoit six captures
mobiles à 390 × 844 après pilotage CDP tactile, avec zéro erreur console.
Le second cliché K03 utilise la vue générale pour montrer simultanément les
plaques de lave et le pont effondré, qui sont éloignés sur le circuit.

## Marmaille

Une petite troupe (les petits du compagnon choisi) sort d'une trappe et marche droit devant. Le joueur distribue un
nombre limité de **rôles** pour qu'assez d'enfants atteignent la porte avant la fin du temps. Moteur pur et déterministe
(`src/engines/marmaille/`) : grille 20 × 22, un pas par tick de 125 ms, aucun tirage aléatoire.

- Marche : une case par tick ; une marche d'une case de terrain se monte seule ; un mur plus haut ou un **bloqueur** fait
  demi-tourner (un bloqueur ne s'enjambe jamais). Chute : jusqu'à 5 cases sans danger, au-delà fatale sans **parachute**.
  L'eau et la sortie du plateau par le bas sont fatales ; la porte sauve, sauf au bout d'une chute mortelle. Un grimpeur
  ne franchit que le terrain : un bloqueur le fait demi-tourner. Les rôles de travail et le bloqueur exigent du sol sous
  les pieds (un enfant qui vient d'avancer au-dessus du vide tombe déjà).
- Rôles (un tick sur deux pour les rôles de travail) : **bâtisseur** (cinq marches montantes, s'arrête sous un plafond),
  **creuseur** (perce la terre sous ses pieds, s'arrête sur la roche), **mineur** (creuse la terre devant lui, fait
  demi-tour sur la roche), **parachute** et **grimpeur** (attributs permanents, donnés à tout moment).
- Victoire : quand tous les enfants sont sortis, sauvés, tombés ou postés, ou à la fin du temps, avec au moins le nombre
  demandé de sauvés. Score : 100 par enfant sauvé, plus les secondes restantes en cas de victoire.
- 30 niveaux. Les rôles arrivent un par un : bloqueur (2), bâtisseur (4), creuseur (6), mineur (8), parachute (10),
  grimpeur (12) ; les niveaux 7, 9, 11, 13, 14 et 15 les combinent. Les niveaux 16 à 30 reprennent un rôle deux fois de
  suite (deux fossés, deux étages, deux collines, l'escalier) ou combinent deux à trois rôles (demi-tour puis pont,
  cheminée en parachute, tour, crevasse, grande traversée). Chaque rôle proposé sert : sans lui, le niveau est perdu. Un plateau propose au plus trois rôles : trois
  emplacements tactiles de 56 px (symbole et stock du niveau) et « » » pour accélérer le temps (×2) ; au clavier 1 2 3, V.
- Preuves (`tests/marmaille-cases.ts`, Vitest et Node) : MA-01 rejoue les 30 solutions enregistrées
  (`scripts/record-marmaille.js`, déclencheurs « tel rôle à tel enfant à telle case ») et vérifie que les niveaux 2 à 30
  sont perdus sans rôle ; MA-02 à MA-07 verrouillent chaque règle sur des grilles littérales ; MA-08 la cadence
  d'introduction et le déterminisme ; MA-09 que la solution enregistrée privée d'un seul rôle perd et qu'un plateau propose au plus trois
  rôles ; MA-10 les stocks, les attributions refusées et l'horloge. `scripts/search-marmaille-shortcuts.js` (lancé à la
  main, lent) cherche en plus tout plan gagnant sans un rôle proposé : un rôle de travail à l'enfant 0 ou 1 à n'importe
  quel tick, ou deux à l'enfant 0, parachutes et grimpeurs pour tous ; il n'en trouve aucun sur les 30 niveaux. `validate-marmaille.js` rejette 23 mutations (règles, score, fin anticipée, doublons de rôles, stocks, horloge). E2E : MA-E1 (clic réel), MA-E2,
  MA-E3 (doigt bruité : emplacement de rôle puis enfant, aux ticks enregistrés, niveaux 2, 9, 15 et 25).

## Bombercade

Jeu solo original, dessiné entièrement en code. Le nom affiché provient de
`GAME_NAME` dans `src/engines/bombercade/levels.ts`. Le compagnon choisi sur
l'accueil est le pion joueur ; les autres compagnons sont les adversaires.
La sauvegarde utilise `arcade-lab:bombercade:v1`, la progression, les panneaux,
le sélecteur, l'aide, le menu et la pause du socle. Mode temps réel : « Prêt ? ».

### Règles

Grille portrait 11 × 13, bord fermé et piliers aux coordonnées paires.
Les trois cases en L de chaque coin restent libres. Six plans de blocs,
complétés par le PRNG partagé à graine, composent trente salles.
Déplacement par cases à quatre cases/s, interpolation visuelle ; une direction
maintenue ou demandée pendant le trajet est appliquée au centre suivant.
Les personnages occupent leur case et bloquent les autres pions pendant leur trajet.

Bombe : capacité initiale 1, portée 2, mèche 2500 ms. Une bombe bloque toute
entrée, mais son poseur peut quitter sa case. Croix de feu pendant 500 ms,
arrêtée par un mur ou le premier bloc ; chaînes immédiates par identifiant
croissant. Un bloc détruit rapporte 10 points à son poseur joueur, un rival
200, un bonus 25 ; victoire : secondes restantes ajoutées au score.
Deux cœurs aux niveaux 1–10, un ensuite. Perdre un cœur donne 2000 ms
d'immunité clignotante. Le joueur perd à zéro cœur ; il gagne lorsque les
rivaux sont éliminés ou, sur les niveaux à objectif doré, lorsqu'il ne reste
aucun bloc doré, quel que soit le destructeur.

Bonus cachés : portée +1 (plafond 6), capacité +1 (4), vitesse +1 (6),
ou une charge de pouvoir. Les bonus exposés sont détruits par une nouvelle
explosion. Chaque pouvoir consomme une charge, sans bonus de score :

| Compagnon | Bombe dessinée | Pouvoir |
| --- | --- | --- |
| Boubou | Trois tiges de bambou | Pluie de bambous : trois bombes sur les cases libres successives devant lui |
| CaliRoux | Pelote cerclée | Roulade : pousse la bombe devant lui, une case tous les cinq pas, jusqu'à l'obstacle |
| Pestouille | Braise et flamme | Souffle : croix réduite à sa direction, portée 6, immédiate |
| Tutu | Fleur à cinq pétales | Pirouette : bouclier de 2000 ms |
| Lumi | Étoile à cinq branches | Étoile filante : case sûre la plus proche du point visé trois cases devant, distance maximale 3 |

Les cinq identités partagent vitesse, capacité, portée, cœurs et budget d'une
charge. B09 verrouille ce budget et les statistiques. Le validateur mesure
aussi douze parties par personnage, aux niveaux 4, 12, 20 et 30,
avec les graines 6, 16 et 28 ;
chaque taux doit rester à ±15 points de la moyenne de cet échantillon. Le
rapport donne aussi le nombre de pouvoirs effectivement utilisés ; cette
mesure décrit l'échantillon et ne prouve pas un équilibre universel.

IA : carte des échéances de feu avec propagation des chaînes, recherche en
largeur d'une case refuge hors menace, pose seulement si elle peut toucher
un bloc ou un rival et dispose d'une fuite. Elle cherche aussi les bonus.
La probabilité d'engager une pose croît avec le niveau. Le pilote de validation
réévalue toutes les 250 ms rester, les quatre directions, des poses avec fuite
et le pouvoir acquis. Au plus onze restaurations par décision simulent trois
secondes avec les mêmes règles et adversaires. Toute simulation perdant un
cœur est rejetée ; éliminations, menaces, blocs, bonus et distance départagent
les actions. Les entrées seules sont appliquées à la partie réelle.
La carte de danger projette aussi les bombes glissantes à leur explosion,
avec cadence, obstacles, rebonds et chaînes ; elle couvre les trajectoires
où les personnages restent en place et celles où ils quittent le passage,
ainsi que les arrêts intermédiaires possibles. Une chaîne propage son échéance
anticipée aux croix de ces positions : l'échéance annoncée ne doit pas dépasser
le premier instant de feu mesuré par le moteur. Le validateur échoue si sa
mesure interne atteint 60 secondes.

Blocs renforcés : deux impacts. Tapis : déplacement supplémentaire d'une case
à l'arrivée. Portails : transport vers l'autre dalle si libre. Glaçons :
un impact les pousse d'une case si libre et sans personnage (y compris
sa case de départ pendant un déplacement), sinon les casse. Blocs dorés :
objectif alternatif. Mort subite : après la limite, un anneau de murs toutes
les 4000 ms, annonce pendant les dix dernières secondes. Sans mort subite,
la limite de temps termine le niveau en défaite. Dans les salles bonbons,
tous les compagnons peuvent pousser une bombe en marchant contre elle ; elle
glisse et rebondit plutôt que de s'arrêter contre l'obstacle. Le pion ne
pénètre dans sa case qu'après son départ.

### Niveaux

Les introductions sont isolées ; les salles suivantes combinent les ressorts
appris. Abréviations : P pouvoir, R renforcé, T tapis, O portail, G glaçon,
D doré, M mort subite, B rebond bonbon.

| Niveau | Disposition | Arène | Rivaux | Ressorts |
| --- | --- | --- | --- | --- |
| 1 | Clairières | jungle | 1 | Base |
| 2 | Éperons | jungle | 1 | Base |
| 3 | Couronnes | jungle | 1 | Base |
| 4 | Galeries | jungle | 1 | P |
| 5 | Éventails | jungle | 1 | P |
| 6 | Traverses | jungle | 1 | P |
| 7 | Clairières | jungle | 1 | P |
| 8 | Éperons | jungle | 1 | R |
| 9 | Couronnes | château | 2 | P + R |
| 10 | Galeries | château | 2 | P + R |
| 11 | Éventails | château | 2 | P + R |
| 12 | Traverses | château | 2 | T |
| 13 | Clairières | château | 2 | P + R + T |
| 14 | Éperons | château | 2 | P + R + T |
| 15 | Couronnes | château | 2 | P + R + T |
| 16 | Galeries | château | 2 | O |
| 17 | Éventails | volcan | 3 | P + R + T + O |
| 18 | Traverses | volcan | 3 | P + R + T + O |
| 19 | Clairières | volcan | 3 | G |
| 20 | Éperons | volcan | 3 | P + R + T + O + G |
| 21 | Couronnes | volcan | 3 | P + R + T + O + G |
| 22 | Galeries | volcan | 3 | D |
| 23 | Éventails | volcan | 3 | P + R + T + O + G + D |
| 24 | Traverses | volcan | 3 | P + R + T + O + G + D |
| 25 | Clairières | sucré | 4 | M |
| 26 | Éperons | sucré | 4 | P + R + T + O + G + D + M |
| 27 | Couronnes | sucré | 4 | P + R + T + O + G + D + M |
| 28 | Galeries | sucré | 4 | B |
| 29 | Éventails | sucré | 4 | P + R + T + O + G + D + M + B |
| 30 | Traverses | sucré | 4 | P + R + T + O + G + D + M + B |

### Oracle et contrôles

`tests/bombercade.test.ts` appelle les corps des oracles B01–B16 partagés de
`tests/bombercade-oracles.ts`, également exécutés par
`scripts/validate-bombercade.js`, enregistré dans `test:node`.

| Oracle | Preuve |
| --- | --- |
| B01 | Bord, piliers et départs libres pour trente niveaux |
| B02 | Mouvement discret, interpolation et virage mémorisé au centre |
| B03 | Capacité, mèche, sortie et retour interdit sur bombe |
| B04 | Croix, portée, murs et arrêt au premier bloc |
| B05 | Chaîne dans le même pas et ordre reproductible |
| B06 | Cœurs et immunité de deux secondes |
| B07 | Bonus, plafonds, charge et destruction par explosion |
| B08 | Portée des trois bombes, cadence glissante exactement datée, distance de téléportation, prévision conservative confrontée aux flammes futures avec déplacement réel et mèche longue, cache sensible à la résistance et restaurations successives, bouclier, sûreté, collisions et couleur du feu |
| B09 | Budget commun ; dans Node, douze parties par personnage aux niveaux 4, 12, 20, 30 et graines 6, 16, 28, écart maximal de 15 points à la moyenne |
| B10 | Recherche de bonus, révélation après destruction par une IA sans points joueur ; fuite avec chaînes et entrées de portails, réaction aux bombes du joueur ; dans Node, vingt parties ordinaires du niveau 30 (graines 0–19), au plus un suicide du rival 1 |
| B11 | Dernier debout, scores exacts, or détruit par une IA, perte et cadence des anneaux |
| B12 | Même graine et entrées, partition avec IA et bombes glissantes, restauration, copie et recherche déterministe sans mutation du moteur vivant, cadence 250 ms, horizon 3 s, plusieurs actions, rejet des pertes de cœur et récompenses explicites |
| B13 | Monotonie et différence stricte des six paramètres de difficulté |
| B14 | Deux mille pas de démo ; comparaison du dessin dans l’arène à 5 Hz, aucune immobilité de 600 ms |
| B15 | Trente salles, six dispositions, quatre arènes, introductions espacées de trois à cinq niveaux |
| B16 | Deux coups, glaçon bloqué par le joueur ou un rival immobile/en mouvement, sorties occupées des tapis et portails, rebond |

La CI rejoue les entrées vérifiées de la campagne (trente victoires) et des
soixante parties B09 dans le vrai moteur avec IA, pouvoirs et vérification de
l'empreinte de chaque snapshot final. L'inaction, les témoins aléatoires, la
latence tactile, les oracles et les mutations sont également vérifiés. Le délai
commun est de 120 secondes ; la cible du validateur est moins de 60 secondes.
La recherche complète se relance hors CI avec
`node --import ./scripts/ts-loader.js scripts/measure-bombercade-balance.js`.
L'option explicite `--record` régénère les entrées et `--report` écrit
`docs/bombercade-validation.json` ; une exécution ordinaire ne modifie aucun fichier.
Les quatre parties Boubou à graine 28 de B09 réutilisent la campagne identique.
Les E2E sont écrits pour exécution séparée : victoire par entrées, suite,
défaite, reprise et sauvegarde après rechargement. Le doigt bruité conduit
les niveaux 1 et 4 en temps réel à 390 × 844 avec paquets tactiles CDP,
latence 150 ms, bruit ±12 px et journal JSON. `FingerClock` mesure les échéances
en temps de jeu ; chaque test dispose de 150 secondes murales. Aucune capture pendant la conduite.
M01–M04 et les tests de vignettes comprennent le nouveau jeu.

Flèches / ZQSD : direction, Espace : bombe, X : pouvoir, P/Échap : pause.
Pavé tactile de 120 px avec zone morte centrale ; bombe de 64 px, pouvoir de
56 px lorsqu'une charge est disponible. Tous sont sous le canevas, jamais sur
le terrain. Glisser sur l'arène maintient une direction ; un tap pose une bombe.
Les neuf sons sont synthétisés ; `life`, `won`, `lost` passent par le service
commun, qui déclenche aussi les vibrations.

Le rapport explicite contient les résultats complets de recherche ; les rejeux CI
les vérifient indépendamment des décisions du pilote. Les mutations vérifient
séparément le contrat de sa recherche. Les parcours E2E et doigt bruité sont
écrits et réservés à l'orchestrateur. Les pions débordent vers le haut pour
atteindre environ 1,2 case de largeur, avec ombre colorée et anneau du joueur ;
les textes utilisent 16 px.

Ajustement de niveau : au niveau 19, l’agressivité passe de 0,574 à 0,59
(entre 0,556 au niveau 18 et 0,592 au niveau 20). La recherche précédente
finissait en poursuite sans élimination jusqu’à la limite ; cet engagement
plus rapide crée des occasions tactiques. Les départs, la densité, les ressorts
et les autres paramètres restent ceux du tableau. B13 contrôle la monotonie.

Équilibre : la téléportation de Lumi vise désormais trois cases devant et
reste dans un rayon de trois cases (quatre auparavant). Le filtre de danger
conserve la sûreté ; B08 distingue une destination située au-delà du rayon.

Mesure complète de recherche (12 parties par personnage, pouvoirs effectivement
utilisés) : Boubou 10/12 (83,3 %), CaliRoux 11/12 (91,7 %), Pestouille 11/12
(91,7 %), Tutu 11/12 (91,7 %), Lumi 11/12 (91,7 %). Moyenne 90 % ; tous sont
à moins de 15 points. Aucun nouvel ajustement de niveau ou de pouvoir.
### Château, prairie et canyon : niveaux 121 à 180

Le chocolat est un bloqueur solide, distinct de la caisse : il ne porte aucune
pièce et coupe la gravité. Une vague adjacente, un spécial ou un outil le casse.
Après chaque permutation acceptée, si aucune case de chocolat n’a été cassée
durant ce coup, une seule case voisine devient chocolat. Le choix est le plus
petit indice admissible, sans tirage aléatoire ; aucune croissance après un refus
ou un outil. Le rebattage conserve les terrains. Si aucun coup ne reste, il retire
d’abord tout le chocolat, puis reconstruit un plateau stable et jouable. Cela
couvre aussi un plateau entièrement couvert. Le retrait compte comme obstacle
éliminé, sans collecte de bonbon, afin que la finale reste terminable.

La haie est un sol fixe sous une pièce. Une fleur y est prisonnière : chaque
alignement sur sa case ou impact spécial libère exactement une fleur et retire
la haie, même si un nouveau spécial est conservé sur cette case. Un alignement
seulement adjacent ne libère rien. Le compteur `flower` mesure ces libérations,
indépendamment de la collecte des bonbons de couleur fleur. Les massifs en croix
se répètent, avec des haies de bordure ; les cibles ne demandent pas toujours
toutes les fleurs présentes.

Les bandes du canyon portent une direction et un identifiant fixes. Une fois les
cascades du coup résolues, toutes les pièces d’une bande avancent simultanément
d’une case, dernière vers première en boucle (ou l’inverse). La gravité précède
ce transport ; les alignements qu’il forme sont ensuite résolus sans faire
avancer les bandes une deuxième fois. Les spéciaux voyagent avec les pièces ;
les directions, haies et sorties restent au sol. Les outils ne consomment aucun
coup et ne déclenchent donc pas le tapis. Les bandes sont horizontales dans les
salles et verticales dans les passages étroits.

Les finales 140, 160 et 180 exigent respectivement fraises + chocolat cassé,
fleurs libérées + fleurs collectées, gouttes + étoiles. Les dimensions, graines,
passages, croix, compartiments et bonus centraux suivent les fiches ; cibles et
sacs sont calibrés. Dans la prairie, certains budgets sont raccourcis pour que
les libérations rapides gardent une pression utile, sans exiger les dernières
haies isolées sur toutes les graines.

Décors mis en cache : tours, remparts et fontaine de chocolat ; prairie et fleurs ;
parois et strates ocre du canyon. Les carreaux de chocolat, couronnes de haies et
chevrons des tapis ont des silhouettes distinctes. Le transport utilise les
pièces des événements ; les flèches bougent hors pause, restent fixes en
mouvement réduit, et aucun transport visuel n’est animé dans ce mode.

G26 couvre casse adjacente/directe, solidité, croissance unique et déterministe,
absence de croissance après casse, rebattage et récupération d’un plateau plein.
G27 couvre libération sur case, outils, absence de dégâts adjacents, création de
spécial et conservation du sol au rebattage. G28 vérifie les quatre sens, la
boucle, le transport des spéciaux, l’ordre gravité/tapis, les refus et l’unique
avancée du coup. G29 reprend les niveaux 1–120 sur une graine ; le validateur
verrouille les cinq graines 8, 19, 37, 65 et 101 : empreinte **1440552771**, relevée
avant modification sur snapshots et événements de six états par partie
(3600 états). G17 et le contrôle de couverture s’étendent aux 180 niveaux.
Les vrais écouteurs de glisser et de deux touchers exécutent le scénario tapis
sous Node et vérifient les destinations de la rotation. Les oracles de rendu
suivent les positions aux départ, milieu et arrivée, les deux copies au bouclage,
les quatre directions, les rayures des spéciaux et la découpe limitée à la bande.
Le niveau 161, graine 8, après deux premiers coups valides, verrouille le transport
puis les deux cascades : chaque chute utilise sa propre pièce et son propre trajet.
Les étapes durent chacune 280 ms ; elles ne superposent pas les anciennes pièces
transportées aux pièces issues des cascades. `update()` avance l’horloge des
flèches, qui reste fixe en mouvement réduit. Les silhouettes littérales des
niveaux 121–180 verrouillent les murs chocolat, les massifs en croix et les bandes
orientées. Les pétales des fleurs prisonnières et le mur du château ont des
assertions de dimensions. Les **58 mutations** sont exécutées en mémoire,
avec une ancre unique pour chacune. La validation de cette correction passe en
**44,11 s** pour le processus, **48,17 s** avec la précompilation de la commande
Node complète ; lint, TypeScript et build passent également.

L’équilibre des 60 nouveaux niveaux est mesuré sans outils, sur les cinq graines,
avec priorité lexicographique à l’objectif, puis à la descente, puis au score.
Chaque graine doit gagner dans le budget. Le validateur verrouille chaque médiane
à **60–88 %**, puis les médianes de monde non décroissantes : **66,67 % / 73,33 % / 75,50 %**.
Les défaites aléatoires par monde sont **84/100 / 86/100 / 90/100**, sur 100 parties chacun.

L’endurance conserve tous les niveaux mais échantillonne la longueur : 40 coups
pour chacun des 120 anciens et 100 pour chacun des 60 nouveaux, soit **10800
permutations** stables, avec absence d’alignement résiduel et coup valide garanti.
Les empreintes portent sur tous les anciens niveaux et toutes les graines ;
l’équilibre récurrent porte sur les cinq graines des 60 nouveaux niveaux et de
18 anciens : rangs 1, 10 et 18 de chaque monde. Une première mesure exhaustive
prenait 68,34 s avant cet échantillonnage. Les contrôles de pression
et de défaites des anciens mondes portent sur cet échantillon fixe, sans changer
leurs fourchettes. Le plafond exécutable du validateur passe à **50 s**. Durée finale : **49,33 s** pour le processus du validateur,
**52,97 s** pour la commande Node complète avec précompilation. Le seuil interne
de 50 s et les seuils de deux secondes par oracle passent.

E2E écrit, non exécuté localement : capture `gourmandises-level180` et scénario
court sur le tapis par permutation réelle, au doigt sur mobile, avec contrôle
du compteur de coups, des terrains fixes et des destinations de chaque événement
de transport (une permutation seule ne satisfait plus le scénario). Les captures
sont séparées par projet. Sur l’hôte autorisé, vérifier les flèches lisibles,
leur mouvement puis leur immobilité en mouvement réduit, la boucle et les deux
objectifs de la finale.

F = fraises ; L = fleurs libérées ; E = fleurs collectées ; D = gouttes ;
S = étoiles ; C = chocolat cassé. Terrain : chocolat / haies / cases de tapis.

| N° | Taille | Objectifs | Coups | Médiane (coups) | Médiane / budget | Défaites aléatoires | Terrain C/H/T |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 121 | 8×7 | F 66 | 26 | 17 | 65.4 % | 100 % | 6/0/0 |
| 122 | 8×7 | F 99 | 26 | 20 | 76.9 % | 100 % | 6/0/0 |
| 123 | 8×7 | F 29 | 25 | 16 | 64.0 % | 0 % | 3/0/0 |
| 124 | 8×7 | F 41 | 25 | 19 | 76.0 % | 40 % | 2/0/0 |
| 125 | 8×7 | F 84 | 24 | 17 | 70.8 % | 100 % | 6/0/0 |
| 126 | 8×7 | F 63 | 24 | 16 | 66.7 % | 100 % | 6/0/0 |
| 127 | 8×7 | F 48 | 23 | 15 | 65.2 % | 80 % | 6/0/0 |
| 128 | 8×8 | F 67 | 23 | 18 | 78.3 % | 100 % | 10/0/0 |
| 129 | 8×8 | F 55 | 22 | 19 | 86.4 % | 80 % | 10/0/0 |
| 130 | 8×8 | F 99 | 22 | 16 | 72.7 % | 80 % | 10/0/0 |
| 131 | 8×8 | F 55 | 21 | 14 | 66.7 % | 80 % | 10/0/0 |
| 132 | 8×8 | F 36 | 21 | 14 | 66.7 % | 40 % | 10/0/0 |
| 133 | 8×8 | F 50 | 20 | 12 | 60.0 % | 80 % | 10/0/0 |
| 134 | 8×8 | F 69 | 20 | 12 | 60.0 % | 100 % | 10/0/0 |
| 135 | 9×8 | F 60 | 19 | 12 | 63.2 % | 100 % | 10/0/0 |
| 136 | 9×8 | F 66 | 19 | 13 | 68.4 % | 100 % | 10/0/0 |
| 137 | 9×8 | F 55 | 18 | 12 | 66.7 % | 100 % | 10/0/0 |
| 138 | 9×8 | F 40 | 18 | 13 | 72.2 % | 100 % | 10/0/0 |
| 139 | 9×8 | F 65 | 17 | 12 | 70.6 % | 100 % | 10/0/0 |
| 140 | 9×8 | F 116 + C 6 | 17 | 11 | 64.7 % | 100 % | 10/0/0 |
| 141 | 8×7 | L 39 | 26 | 19 | 73.1 % | 100 % | 0/44/0 |
| 142 | 8×7 | L 37 | 25 | 18 | 72.0 % | 80 % | 0/44/0 |
| 143 | 8×7 | L 17 | 12 | 9 | 75.0 % | 60 % | 0/24/0 |
| 144 | 8×7 | L 16 | 12 | 9 | 75.0 % | 80 % | 0/26/0 |
| 145 | 8×7 | L 37 | 24 | 18 | 75.0 % | 60 % | 0/44/0 |
| 146 | 8×7 | L 37 | 24 | 18 | 75.0 % | 60 % | 0/44/0 |
| 147 | 8×7 | L 33 | 15 | 11 | 73.3 % | 100 % | 0/43/0 |
| 148 | 8×8 | L 34 | 13 | 9 | 69.2 % | 100 % | 0/47/0 |
| 149 | 8×8 | L 34 | 20 | 14 | 70.0 % | 100 % | 0/44/0 |
| 150 | 8×8 | L 38 | 16 | 12 | 75.0 % | 100 % | 0/48/0 |
| 151 | 8×8 | L 35 | 16 | 12 | 75.0 % | 100 % | 0/48/0 |
| 152 | 8×8 | L 28 | 21 | 16 | 76.2 % | 40 % | 0/41/0 |
| 153 | 8×8 | L 34 | 13 | 9 | 69.2 % | 100 % | 0/47/0 |
| 154 | 8×8 | L 34 | 20 | 14 | 70.0 % | 80 % | 0/44/0 |
| 155 | 9×8 | L 46 | 19 | 14 | 73.7 % | 100 % | 0/56/0 |
| 156 | 9×8 | L 46 | 19 | 15 | 78.9 % | 80 % | 0/56/0 |
| 157 | 9×8 | L 43 | 18 | 13 | 72.2 % | 80 % | 0/56/0 |
| 158 | 9×8 | L 42 | 18 | 13 | 72.2 % | 100 % | 0/55/0 |
| 159 | 9×8 | L 42 | 15 | 11 | 73.3 % | 100 % | 0/52/0 |
| 160 | 9×8 | L 49 + E 24 | 13 | 9 | 69.2 % | 100 % | 0/56/0 |
| 161 | 8×7 | D 119 | 26 | 19 | 73.1 % | 100 % | 0/0/16 |
| 162 | 8×7 | D 107 | 26 | 19 | 73.1 % | 80 % | 0/0/16 |
| 163 | 8×7 | D 53 | 25 | 19 | 76.0 % | 80 % | 0/0/14 |
| 164 | 8×7 | D 83 | 25 | 20 | 80.0 % | 60 % | 0/0/16 |
| 165 | 8×7 | D 151 | 24 | 18 | 75.0 % | 100 % | 0/0/16 |
| 166 | 8×7 | D 114 | 24 | 18 | 75.0 % | 100 % | 0/0/16 |
| 167 | 8×7 | D 64 | 23 | 18 | 78.3 % | 100 % | 0/0/14 |
| 168 | 8×8 | D 95 | 23 | 17 | 73.9 % | 100 % | 0/0/16 |
| 169 | 8×8 | D 89 | 22 | 16 | 72.7 % | 80 % | 0/0/16 |
| 170 | 8×8 | D 115 | 22 | 17 | 77.3 % | 80 % | 0/0/16 |
| 171 | 8×8 | D 149 | 21 | 17 | 81.0 % | 80 % | 0/0/16 |
| 172 | 8×8 | D 59 | 21 | 17 | 81.0 % | 80 % | 0/0/16 |
| 173 | 8×8 | D 85 | 20 | 16 | 80.0 % | 100 % | 0/0/16 |
| 174 | 8×8 | D 68 | 20 | 16 | 80.0 % | 100 % | 0/0/16 |
| 175 | 9×8 | D 157 | 19 | 14 | 73.7 % | 80 % | 0/0/18 |
| 176 | 9×8 | D 95 | 19 | 14 | 73.7 % | 100 % | 0/0/18 |
| 177 | 9×8 | D 145 | 18 | 13 | 72.2 % | 100 % | 0/0/18 |
| 178 | 9×8 | D 95 | 18 | 13 | 72.2 % | 100 % | 0/0/18 |
| 179 | 9×8 | D 95 | 17 | 13 | 76.5 % | 80 % | 0/0/18 |
| 180 | 9×8 | D 104 + S 24 | 17 | 14 | 82.4 % | 100 % | 0/0/18 |
## Les Artificiers

Jeu `artificiers`, portrait 360 × 640. Trois mondes : **Archipel de jade**,
**Corniches d’ambre**, **Fourneau céleste**. Trente cartes déterministes, sans
asset externe. Les compagnons récurrents sont dessinés par leur modèle commun.
Le personnage choisi mène la première équipe ; les autres membres tournent.

Masque binaire 180 × 320, maille de deux unités, matériaux et dureté séparés.
La terre et le bois cèdent en une explosion, la roche en deux ; le souffle
brûlant traverse une seconde couche locale. Chaque disque marque son rectangle
sale ; la scène redessine uniquement ces régions sur une texture persistante,
seulement quand le masque change. Les trois décors et les trois poses des cinq
compagnons sont rastérisés une fois en textures générées en mémoire. Seuls les
sprites mobiles, vies, visée, projectiles, corde, caisses et explosions changent
par image. Le proxy compte tous les appels du Graphics dynamique : plafond
strict de 500, cas négatif à 501. Sur les trente niveaux et les trois phases,
avec quatre explosions, une caisse et une corde : ancien rendu 887 appels
maximum, nouveau rendu 79. Les trente rejeux vérifient aussi chaque image.

Le monde physique reste inchangé ; sa projection verticale est multipliée par
0,8 : le terrain et l’eau s’arrêtent à y=512, avant le panneau y=531–629.
Les corps et leurs vies sont projetés par la même transformation ; les entrées
tactiles utilisent son inverse. Les boîtes des personnages et des vies restent
hors du panneau sur les trente cartes à l’ouverture, pendant une chute creusée
et à chaque image des trente rejeux gagnants.

Pas fixe de 20 ms, reste conservé, gravité 125 unités/s². Sous-pas de deux
unités maximum pour les projectiles. La collision, le vent et la légère
poursuite sont partagés entre tir réel, prévisualisation et recherche de l’IA.
Les personnages reçoivent dégâts et poussée ; les chutes de plus de 45 unités
coûtent des vies ; l’eau tue au contact. Marche limitée à 48 unités par tour,
saut unique au sol, grappin accroché au masque, traction sans traverser les murs,
lâcher avec Saut ou Corde. L’accrochage coûte douze unités de déplacement ; le lâcher reste gratuit
même quand ce budget est épuisé.

Six armes : **Galet sonore** commun ; **Tige tonnante** de Boubou, grand disque ;
**Haleine braise** de Pestouille, forage local ; **Vœu comète** de Lumi, poursuite
légère ; **Salto vibrant** de Tutu, deux ricochets ; **Ronde rousse** de CaliRoux,
large dispersion et faible poursuite. L’inventaire associe le commun et la
signature de chaque membre, trois charges initiales, quatre dans le dernier
monde. Les caisses alternent soin et recharges, tombent tous les trois tours et
se ramassent au contact. Les projectiles et poussées restent actifs pendant la
résolution ; le tour ne change qu’après stabilisation, avec une limite de quatre
secondes. Une action de visée n’arrête pas le minuteur de 25 secondes.

Vent tiré à chaque tour, identique pour le joueur et l’IA. Trois degrés : recherche
angle/puissance par le vrai intégrateur, puis erreur déterministe de 0,19 / 0,065 /
0 radian et erreur de puissance proportionnelle. L’IA ne consomme pas le futur
aléatoire. Mort subite après 18, 14 ou 10 tours selon le monde : neuf unités
d’eau supplémentaires par tour. Les cibles d’entraînement ne tirent pas.
Les missions de survie exigent toutes leurs manches, même après élimination
adverse ; les missions de structure exigent de retirer 80 % de la tour en bois.

En mode deux joueurs, équipes de vies égales, objectifs remplacés par un duel,
aucune commande IA ; les deux équipes partagent le même écran et ses commandes,
le HUD annonce l’équipe active. Le bouton 1 / 2 recommence la carte dans le mode
choisi. Sous 380 px il reste dans le menu pour garder les cinq commandes
principales de 56 px à l’écran. Glisser depuis les 32 unités autour du héros :
angle de la direction, puissance de la longueur × 1,25, relâcher pour tirer.
Les relâchements d’un autre doigt, d’un tour précédent et les annulations ne
tirent pas. Le résultat du duel annonce explicitement l’équipe gagnante. Clavier :
flèches horizontales marche, verticales angle, W/S puissance, Espace tir, J saut,
G corde, X arme. Pause, niveaux, reprise, progression et son utilisent le socle.

### Cartes et mécaniques

| N | Nom | Forme / mécanique | Équipe | IA | Vent max |
| --- | --- | --- | --- | --- | --- |
| 1 | Premier pétard | Îles ; cible fixe | 1 | facile | 0 |
| 2 | Deux rives | Îles ; duel entre rives | 1 | facile | 8 |
| 3 | Passerelle verte | Pont en bois ; duel | 1 | facile | 12 |
| 4 | Sous les racines | Caverne ; plafond accrocheur | 1 | facile | 10 |
| 5 | Le belvédère | Falaises ; tour à détruire | 1 | facile | 16 |
| 6 | Trois îlots | Îles ; équipes doubles | 2 | facile | 18 |
| 7 | Le petit chantier | Ville ; hauteurs étagées | 2 | facile | 20 |
| 8 | Marée de jade | Pont ; survivre 4 manches | 1 | moyenne | 24 |
| 9 | La grande arche | Caverne ; duel sous voûte | 2 | moyenne | 26 |
| 10 | Bastion des roseaux | Falaises ; tour à détruire | 2 | moyenne | 28 |
| 11 | Premier souffle | Falaises ; cible et vent | 1 | moyenne | 24 |
| 12 | Terrasses dorées | Falaises ; duel vertical | 2 | moyenne | 30 |
| 13 | Le pont des brumes | Pont ; appuis fragiles | 2 | moyenne | 32 |
| 14 | Galerie ambrée | Caverne ; tirs sous plafond | 2 | moyenne | 36 |
| 15 | Le vieux moulin | Ville ; démolition | 2 | moyenne | 38 |
| 16 | Courants contraires | Îles ; vent renforcé | 2 | moyenne | 42 |
| 17 | Le rempart ocre | Ville ; équipes triples | 3 | difficile | 44 |
| 18 | Tenir la corniche | Falaises ; survivre 6 manches | 2 | difficile | 40 |
| 19 | Voûte de cuivre | Caverne ; duel rapproché | 3 | difficile | 46 |
| 20 | Le grand échafaud | Pont ; démolition | 3 | difficile | 48 |
| 21 | Étincelle de basalte | Cratère ; cible en cuvette | 1 | moyenne | 32 |
| 22 | Les dents noires | Falaises ; grandes marches | 3 | difficile | 48 |
| 23 | Passage incandescent | Pont ; duel exposé | 3 | difficile | 52 |
| 24 | Le ventre du mont | Caverne ; voûte basse | 3 | difficile | 54 |
| 25 | La forge déserte | Ville ; démolition | 3 | difficile | 56 |
| 26 | La caldeira | Cratère ; grande cuvette | 3 | difficile | 58 |
| 27 | Îles de cendre | Îles ; chutes et eau | 3 | difficile | 60 |
| 28 | Dernier refuge | Cratère ; survivre 8 manches | 3 | difficile | 54 |
| 29 | Les tours fumantes | Ville ; duel sur toits | 3 | difficile | 62 |
| 30 | Le cœur du fourneau | Cratère ; démolition finale | 3 | difficile | 64 |

### Preuves

`tests/artificiers-cases.ts` est partagé entre Vitest et
`validate-artificiers.js`, ajouté en fin de l’inventaire `test:node`.
Chaque cas, chaque rejeu et chaque pilote bruité est enveloppé par le même
budget déterministe : 50 000 images simulées, 40 millions de cellules consultées
ou écrites et 3 millions d’appels de simulation/dessin. Les trois plafonds ont
chacun un cas négatif. Le délai Vitest de 15 000 ms est uniquement un filet du
lanceur, jamais un oracle de comportement ; aucune assertion d’horloge.
Il couvre trajectoire calculée indépendamment, effet signé du vent, disque de
cratère, dureté, dégâts de chute, noyade, poussée, cinq signatures et munitions,
rebond, poursuite, marche, anti-double-saut, grappin, tours et minuteur, absence
d’IA en duo, caisses, montée d’eau, snapshot JSON et équivalence du découpage des
pas. La recherche ne modifie pas le snapshot ; ses trois erreurs sont comparées
sur une cible fixe que le niveau difficile élimine par des tirs ordinaires.
Sous vents −48 et +48, un oracle indépendant balaye angles et puissances :
projectiles construits directement puis intégrés sur le moteur réel, sans
`trace`, `launch` ni recherche IA. Il exige le meilleur score du balayage et
rejette la solution calculée en supposant le vent nul.

Diversité : six formes, quatre missions, distances entre équipes de 192 à
284 unités, surfaces de 7632 à 19581 cellules. Toutes les paires doivent différer
d’au moins 2,5 % de leur union solide. Une paire de mêmes forme, mission et
taille d’équipe doit différer de 6 % ou de 20 unités d’écartement. Aire,
centroïde, contour et distance sont calculés depuis les vrais masques et publiés
par le validateur. Aucun rang artificiel n’entre dans la mesure.

`tests/fixtures/artificiers-wins.json` conserve trente bandes : temps de simulation,
commandes de tir/saut, graine, compagnon et résultat. Le rejeu utilise uniquement
les commandes publiques et exige la victoire, l’équipe gagnante, le score, les vies, les positions,
l’empreinte du masque et le générateur finaux enregistrés. Chaque niveau a son propre test
borné en travail ; chaque transition vers une victoire de démolition exige
au moins 80 % de cellules retirées. Un cas moteur distinct élimine les adversaires
sans toucher la tour, puis vérifie exactement 79 % (refus) et 80 % (victoire)
sur chacune des six cartes de démolition. La recherche du pilote reste dans `record-artificiers.js`, hors tests.
Les niveaux 1 et 10 sont aussi gagnés par `AimDriver`, le même chemin d’entrée
que la scène : pressions, mouvements et relâchements différés de 150 ms, positions
bruitées de ±12 px CSS, converties par le FIT du portrait 390 × 844. Aucun test de correction n’utilise l’horloge de la machine.

`tests/e2e/artificiers.spec.ts`, écrit pour l’hôte autorisé, ouvre le jeu et
produit de vrais paquets tactiles CDP depuis le héros. Il attend phase et compteur
de tirs, et prévoit `artificiers-n1.png`, `artificiers-n10.png`,
`artificiers-w03.png` dans les sorties distinctes de chaque projet. Aucun navigateur,
Vitest ni Playwright exécuté sur la machine de développement. Contrôler sur les
captures : héros actif cerclé et vies lisibles, vent et jauge, points courts de
visée, deux rives/ponts, tour en bois, ciel et décor de chaque monde, projectile,
et absence de débordement des boutons. L’E2E exige aussi la visibilité du héros
actif, vérifie son point de contact sur le canvas et capture à l’ouverture les
niveaux 20, 22, 26 et 30, dont les personnages étaient précédemment sous le panneau.
Les captures ne sont pas fournies ici.

Les huit mutations de `scripts/audit-artificiers-mutations.js` sont exécutées
en processus Node isolés, avec sources remplacées en mémoire et ancrages uniques.
Une erreur de harnais ou un dépassement du filet de processus échoue l’audit ;
seule une assertion tuant le mutant compte.

| Mutation | Assertion qui la tue |
| --- | --- |
| Panneau remonté sur le terrain | `hudGeometry` |
| Vies toujours pleines | `hudGeometry` |
| Puissance toujours pleine | `hudGeometry` |
| Pointillés supprimés | `hudGeometry` |
| Corde réservée au déplacement intact | `movementAndRope` |
| Mauvaise équipe gagnante | `sceneChecks` |
| W diminue la puissance | `sceneChecks` |
| Démolition exigeant 81 % | `structureThreshold` |

Le harnais `scripts/artificiers-scene-checks.js` exécute les vrais écouteurs
livrés : transformation tactile, héros choisi et poses mises en cache, clavier
complet (marche, angle, W/S, saut, arme, tir Espace), victoire réelle de l’équipe 2
et annonce, duo, pause, régions sales, sons et nettoyage. L’enregistreur Graphics
vérifie les valeurs et coordonnées des vies, de la puissance, du vent signé et
de chacun des dix premiers points de visée, ainsi que la transformation du monde
et la séparation du panneau.

Validation finale : lint, typecheck et build réussis, puis **47 validateurs
Node réussis en 217,96 s**, dont **15,61 s pour Artificiers**, sous le verrou
commun et priorité réduite. Les 51 cas partagés (19 contrôles, 30 rejeux et deux
pilotes tactiles), le harnais de scène et les huit mutations passent. Les
37 842 images des trente bandes gagnantes culminent à 75 appels Graphics ;
le scénario chargé sur les trente cartes culmine à 79. Aucun navigateur,
Vitest ni Playwright lancé ; aucun commit.
