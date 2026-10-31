# Changelog

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0-beta.3] — 2026-10-31

Preview build: new games Marmaille (lead a troop with roles, 30 levels), Bombercade (bombs and breakable mazes, 30 levels, thumb-playable) and Les Artificiers (turn-based artillery on destructible ground, 30 levels); new art for Ferraille, Briqueterie and Alunir; Gourmandises grows to 180 levels with a richer look; Dérapage karts drawn from the character sheets and themed scenery on every circuit; noisy-thumb checks now run on a stepped game clock and give the same result on every machine.

- Bombercade : recherche du pilote sur trois secondes, prévision des bombes glissantes, téléportation limitée à trois cases, engagement accru au niveau 19 et neuf mutations supplémentaires couvertes par les oracles.

- Bombercade : nouveau labyrinthe de bombes en solo, trente niveaux, quatre arènes, compagnons et commandes tactiles ; moteur déterministe et validation Node.
- Bombercade : fuite commune face aux bombes, collisions des glaçons, objectif doré partagé et oracles renforcés avec huit mutations exécutées.
- Bombercade : partie au doigt bruitée stable (niveaux 1 et 4 gagnés, zéro appui perdu) ; la croix est décollée du bas de l’écran et garde les appuis près de ses bords, que le navigateur détournait vers la zone de jeu ; arène statique cuite en textures.

## [0.4.0-beta.2] — 2026-10-31

Preview build: Dérapage is now playable on phones (all six reference circuits finish under a noisy thumb), the Kart catalogue circuits and an optional 3D view; new games Gourmandises (match-3, 120 levels) and Pépites (mine digger, 30 mines); Alunir rewritten. Known gaps: the noisy-finger end-to-end checks of a few games are still being rebuilt on a stepped clock; new art for Ferraille, Briqueterie and Alunir is still in progress.

### Dérapage — jouable au doigt

- Route continue (plus de dents dans les virages), bandes d'accélération sur toute la largeur, grand chrono du tour et meilleur tour, portique d'arrivée, état du pouce et poussière dans l'herbe.
- Rendu mis en cache : chaque circuit reste sous 520 appels de dessin par image (800 en 3D), et la course suit le temps réel même quand l'image ralentit (jusqu'à 4 images/s).
- Trois circuits du catalogue Kart : Bambou Express (raccourci derrière la cascade), Feuilles Folles (feuilles glissantes, tunnel) et Volcan Turbo (lave, tremplin au-dessus d'un pont effondré).
- Vue pseudo-3D en option, sur le même moteur, avec repli automatique en vue de dessus sous 30 images/s.
- Volcan Turbo : tremplin déplacé sur la ligne droite, réception élargie, contournement pris dans le sens de course et karts IA écartés autour du saut ; il n'y a plus de kart retourné à contresens.
- Partie au doigt bruitée en navigateur mobile : les six circuits mesurés se terminent (1, 5, 10, Bambou Express, Feuilles Folles, Volcan Turbo), de 0 à 7 % hors piste, sans arrêt.
- Partie au doigt bruitée en navigateur mobile : circuits 1, 5, 10, Bambou Express et Feuilles Folles gagnés, de 0 à 4 % hors piste, sans arrêt.
- Connu : Volcan Turbo — course non terminée au doigt, correction en cours.
- Gourmandises : transport du tapis découpé sur chaque bande, puis chutes des cascades séquencées avec les pièces des événements. Oracles des quatre directions, du bouclage et des spéciaux ; terrains 121–180, fleurs et château verrouillés, scénario tactile renforcé et treize mutations supplémentaires.
### Passe 118 — Ferraille, Briqueterie et Alunir

- Ferraille : `layout()` utilise la caméra verticale réelle et rapporte l’intersection visible du sol avec le monde, au lieu des quatre rangées intégrales après zoom 2,6. Le corps debout de 22 unités reste entièrement visible au seuil de chute ; contrôle Node des niveaux 1, 3 et 30 en 390×844, 360×640 et 1280×720.
- Décors précalculés en textures réutilisées, avec pools d’images fixes : profondeurs parallaxes de Ferraille et Briqueterie, jardin et surfaces des briques, ciel et cratères d’Alunir. Les petits effets animés restent vivants ; les strates suivent toujours le terrain physique, y compris les quais mobiles. Aucune génération de texture pendant le jeu ni au changement de niveau, et réutilisation au redémarrage.
- Mesure déterministe, panda au niveau 1 (HEAD → passe 118) : Ferraille 1 071 → 322 appels Graphics et 649 → 161 chemins ; Briqueterie 766 → 44 et 477 → 21 ; Alunir 693 → 214 et 355 → 107. Zéro texture générée par image. À la création : respectivement 10 442/5 658/84, 6 529/3 927/153 et 566/280/18 appels/chemins/textures ; coût initial amorti et réutilisé ensuite.
- Validateur Node : compteurs de création et d’image (appels Graphics, chemins, textures), références HEAD et plafond littéral de 40 % par image pour les trois jeux ; raster des textures réellement soumises avec découpe aux limites du canvas. Seuils visuels et mutations des passes précédentes conservés.

- Suite Node sous verrou : 42/43 validateurs réussis (inventaire actuel : 43). L’unique échec hors périmètre est `validate-character-scenes-2.js` : Bubble importe le registre, puis le CSS de Gourmandises, non chargeable par Node. Le port CSS vide testé isolément rend ce validateur vert ; aucun fichier de ces jeux ni leur validateur n’a été modifié. Typecheck réussi ; lint et build finaux non achevés avant le plafond, leurs créneaux du verrou commun restant occupés.

## [0.4.0-beta.1] — 2026-10-30

Preview build so the new art and levels can be played on a phone tonight. Known gaps: some noisy-finger end-to-end checks are still being rebuilt on a stepped clock; Ferraille, Briqueterie and Alunir art passes are still in progress.
### Ferraille — passe 115

- Tourelle physique visible dès l’entrée des niveaux 1–30, à x=108 : première salve à 2 s, un point de vie, détruite par une réponse frontale. Seule cette entité échappe au gel d’introduction et à celui du projecteur ; marqueur optionnel compatible avec les sauvegardes anciennes.
- 180 rejeux de niveaux et six rejeux R01–R03 réenregistrés ; témoins Ferraille communs actualisés. Contrôle des 900 parties avec cinq personnages, trois graines et deux modes de spécial.
- Répétition verte sur 435 paires : 16 modules rencontrés, similarité maximale de modules 50 % pour chacune des six campagnes graine/spécial ; mesure historique 0 (plafond 11,2).
- Contrôle Node de 90 entrées : ennemi à ses coordonnées physiques, trois projectiles visibles à la frame 120, délai de réaction et réponse sans perte de vie ; anciens états non marqués toujours gelés. Quatre mutations supplémentaires couvrent présence, exception sélective et tirs visibles.

- Validation finale sous verrou commun : lint, typecheck, build et quatre validateurs Node verts (Ferraille moteur/niveaux, catalogue, campagnes communes), 68,97 s avec un seul validateur à la fois. Mutations des passes 103, 104 et 114 toujours tuées ; sauvegarde historique rechargée. Aucun commit, navigateur ni Vitest.

### Ferraille — passe 114 (correction partielle)

- Suppression de l’aperçu ennemi sans interaction et de son étincelle périodique ; dessin aux coordonnées physiques uniquement.
- Arme et flamme orientées selon la visée réelle ; suppression du canon horizontal intégré aux textures ; course avec tir combinant jambes animées et haut du corps de tir.
- Contrôles Node des géométries de course, coordonnées ennemies, canon/flamme, directions des projectiles, identité des robots et états visuels des modules. Les huit mutations de relecture sont tuées ; couverture calculée après les recouvrements opaques (83,8–88,5 %, 61–112 silhouettes visibles).
- Reste bloqué : ennemi actif au départ et réenregistrement des rejeux. `startingEnemyChecks` échoue au niveau 1 ; le gel global d’IA avant x=256 nécessite une exception dans `engine.ts`, hors périmètre moteur autorisé. Aucun niveau ni témoin moteur modifié.

### Ferraille — passe 112

- Cadrage 2,6 avec suivi vertical, héros équipé agrandi (85,1 px mesurés par Node en 390×844), armes renforcées, quatre phases de course par direction et véhicules agrandis.
- Seize mécanismes dessinés sans cadre vide ; trois plans opaques et lumineux dans tous les thèmes, caisses et machine en feu, portes de forteresse, presse et lave de l’usine. Ennemis détaillés et aperçu de la menace lointaine sur une passerelle arrière, sans déplacer les collisions.
- Validation Node des entrées : couverture 83,8–88,5 %, 62–152 silhouettes majeures sur les six niveaux demandés, ennemis, cache stable, mouvement réduit et quatre mutations visuelles. Moteur, témoins et solveurs inchangés ; aucun navigateur utilisé.
### Briqueterie et Alunir — passe 116

- Briqueterie : corps de 32 unités sans recouvrement, zoom 1,3 du mur et retour progressif au cadrage normal vers la raquette ; 41,37 px réellement visibles contre 33,81 px auparavant, après occultation et découpe au canevas.
- Grilles jouables 1/A01, 6, 18/A02 et 15/A03 densifiées : surfaces 32,55 %, 31,30 %, 32,65 % et 34,30 %. Les mécaniques restent présentes, 60 campagnes gagnantes avec le pilote inchangé ; huit rejeux réenregistrés.
- Validateurs : seuil de surface `wallCoverage >= .30`, occultation, absence de recouvrement, quatre couleurs A01 et cristaux A03 ; module Alunir identifié par composant, flamme en poussée/à sec, cinq strates visibles, chiffres des quais et jets du geyser aux frontières de phase. Quais et module comptés seulement s'ils sont peints. Les huit mutations adverses sont exécutées et rejetées, avec cinq mutations supplémentaires (recouvrement, zoom, grille ajourée, coque et quais).
- Aucun asset, dépendance, commit, navigateur ni Vitest. Le rendu et le moteur d'Alunir restent inchangés.

### Briqueterie et Alunir — passe 113

- Briqueterie : cadrage vertical des rangées, habillage de briques de 41,77 px sur téléphone, blocs alimentaires colorés A01, feuilles A02, cristaux/étoiles A03, portails à anneaux et indestructibles rivetés. Cinq balles signatures avec motifs dans un cadre de 23,87 px ; raquettes conservées.
- Alunir : module complet de 59,06 px avec pilote sous verrière, pieds, tuyère et flamme ; Terre, trois plans étoilés, montagnes, régolithe stratifié et cratères. Sol plein 21,04 %, mécaniques illustrées et multiplicateurs vectoriels sur les quais.
- Validateur Node des vraies scènes pour les cinq compagnons et les niveaux demandés : union raster, bornes, éléments, motifs de balle, cache des textures, réserve fixe, snapshots et mouvement réduit. Aucun moteur, niveau, solveur ou rejeu modifié ; aucun asset image ni dépendance.
- Écart conservé avec la planche : les grilles ajourées ne sont pas des murs pleins. Enveloppe 35,23–49,84 %, mais briques seules 9,47–19,13 % ; le seuil de 35 % de surface pleine reste non atteint, notamment les dix briques du niveau 6. Mesures avant/après détaillées dans GAME_SPEC.

### Alunir et Essaim — passe 110

- Migration explicite des snapshots de passe 107 avec mission : catalogue historique, objectifs, amplitude mobile et issue conservés. Témoin Node produit directement depuis les deux modules de `eecddb7`, continuations des trente niveaux et cas adverse gagnant.
- Secours imposé latéralement : |vx|≥0,1 et |vx|>|vy|, consigne cohérente et pilote avec approche latérale ; 180 vols gagnants régénérés. Commandes : 0/435 paires >50 %, maximum 46,3077 % (7/22), maximum global 50 %, douze mécaniques.
- Prérequis des cercles testés négativement ; vrai dessin Graphics contrôlé pour rayon, croix, couleurs et coordonnées. Les douze mutations historiques et les huit de relecture sont exécutées et rejetées ; correspondance détaillée dans GAME_SPEC.
- Essaim : bouton « Écu », nom accessible « Bouclier », toujours 16 px et 56 px. Le logement paysage exclut 72 px ; contrôle Node du budget de texte, de la rangée ≤64 px, des marges et du desktop, sans navigateur.

- Validation passe 110 : lint, typecheck et build verts via le verrou commun ; `npm run test:node` : **40/40 validateurs verts**, un seul à la fois, 146,27 s. Aucun commit, navigateur ni Vitest.

### Alunir — passe 108

- Trente géométries écrites : départs et vitesses variés, quais suspendus, pleins aux extrémités, cargo à remonter depuis le fond de la grotte, secours latéraux et balises décentrées. Cercles de transit visibles, ordonnés et sauvegardés ; passage du geyser pendant son repos. Navettes sur 48 px avec quais de 46 px (64 sur glace).
- Pilote corrigé pour le dégagement au décollage, les remontées, le suivi de phase et les météores à la montée. Contrôleur tactile initial conservé ; 180 vols gagnants réenregistrés, trois graines et deux modes.
- Mesure inchangée : 64 → 0 paires de commandes au-dessus de 50 % ; maximum 95,1168 % (4/5) → 46,3077 % (7/22). Maximum global 50 %, douze mécaniques rencontrées et vedettes distinctes des deux précédentes.
- A-niv-05 : témoins de départs, remontées cargo, ordre/rayon/phase des passages, arrivée directe refusée et reprise sérialisée. Douze mutations de passe 107 toujours rejetées ; migrations historiques et U06/U07 conservés. Aucun commit, navigateur ni Vitest.

- Validation passe 108 : lint, typecheck et build verts sous verrou commun ; `npm run test:node` : **40/40 validateurs verts**, un seul à la fois, 166,26 s.

### Alunir — passe 107

- Migration : activation du catalogue avant le placement en grotte ; une sauvegarde historique remplace la mission courante après amarrage et élimine les indices de plateforme invalides.
- Mesure corrigée : commandes réelles comparées pas à pas, indépendamment des étiquettes ; suppression des pseudo-actions automatiques du moteur. Même campagne : 50 % annoncés → 95,1168 % réellement mesurés (niveaux 4/5), donc porte de diversité rouge, conservée explicitement dans les tests et le rapport.
- Bornes hautes et rayons exacts, secours absent, nom et idée aux pas 0/1/119 puis retrait aux pas 120/121 ; restauration après service, grotte suivante et véritable témoin historique avec rafales. Douze mutations exécutées par les corps de test sous Node.
- Guide initial décrit comme une référence verticale sans effet physique ; pilote tactile simulé gagnant au niveau 1 avec 150 ms de latence, sans puis avec spécial. U06/U07 inchangés. Aucun navigateur ni Vitest exécuté.
- Validation passe 107 : lint, typecheck et build verts ; `test:node` termine avec 39/40 validateurs verts, seul Alunir échoue sur les 64 paires dépassant 50 %, après ses douze mutations rejetées et ses 180 vols gagnants.

### Alunir — passe 106

- Trente situations nommées et écrites, douze mécaniques présentées puis combinées : quais à score, grotte, navette, plein, cargo, météores, gravité locale, tunnel de vent, geyser, balise, secours en vol et glace.
- Nom et idée affichés deux secondes de jeu ; décors et objectifs visibles. Pilote multi-étapes, 180 vols enregistrés aux graines 28, 1, 2026 avec/sans stabilisation.
- Similarité maximale de mission 100 % → 50 %, douze règles effectivement rencontrées et aucune vedette répétée parmi les deux précédentes ; négatifs et quatre mutations.
- Reprise d’un véritable état de HEAD et formats de progression/records préservés ; seuils U06/U07 inchangés, aide initiale uniquement visuelle, cinq personnages et spécial inchangés.
- E2E mobile écrit (sept captures, doigt bruité aux niveaux 1 et 10), exécution réservée à l’orchestrateur.
### Gourmandises

- Mondes 7 à 9 : 180 niveaux, chocolat solide qui s’étend, fleurs à libérer et tapis bouclés après les cascades ; trois finales à deux objectifs.
- Château et fontaine de chocolat, prairie fleurie et canyon ocre dessinés par le code ; flèches animées avec respect du mouvement réduit.
- Équilibre des 60 nouveaux niveaux mesuré sur cinq graines, empreinte des états 1–120 conservée, G26–G29 et six mutations supplémentaires ; E2E niveau 180 et tapis écrits.

- Pictogrammes et compteurs contenus dans les trois boutons tactiles, avec police commune de 16 px.
- Objets livrés animés jusqu’à la sortie malgré le remplissage de leur destination.
- Pilote glouton donnant strictement priorité à l’objectif ; monde de la rivière recalibré sur cinq graines.
- Oracles Node renforcés pour les silhouettes, les couches de glace, les sorties et les éléments des décors ; mutations vérifiées en mémoire.
### Corrections du doigt piloté — passe 111

- Preuve de réception nouvelle pour chaque événement et chaque doigt : relevé pointeur en lecture seule dans les douze scènes, contrôlé avec les effets de commande existants ; détection des touchers et relâchements perdus même après une commande identique réussie.
- Latence de 150 ms de jeu avant les relâchements décidés séparément, y compris le tir de Bubble (les paires tap et les remplacements déjà différés partagent leur décision) ; `until()` observe aussi la condition après son dernier pas autorisé.
- Empilo : ratio de performance fondé sur le temps de jeu cumulé de la scène, indépendant du chronomètre facultatif du niveau. Ratio et avertissement sous 30 i/s calculés par une fonction pure commune au spec et au test Node.
- Test Node de l'aide ajouté à `test:node` : pertes partielles en multitouch, glissement et relâchement, bruit X/Y, ratés du rapport, empreinte sensible à l'état final et à chaque entrée, protocole d'horloge et bornes. Les huit mutations de la relecture sont tuées par ce test, sans navigateur.

### Tests au doigt — passe 109

- Aide commune `finger-stepped.ts` : horloge A11 manuelle, latence de 150 ms de jeu, vrais touchers CDP multitouch, bruit de ±12 px à graine fixe et vérification de réception par la scène.
- Parties des douze jeux en temps piloté, niveaux 1 et 10 et ateliers supplémentaires conservés ; rapports JSON avec pas, positions voulues et réelles, bruit, ratés, issue et empreinte décimale. Les répétitions de boutons du navigateur sont figées pendant les parties pilotées.
- Performance séparée : cinq secondes réelles par jeu, images/s, ratio jeu/réel, machine et rendu ; avertissement sous 30 i/s, bloquant seulement avec `PERF=1`.
- Test Node sans navigateur : répétabilité des entrées et de l'empreinte, latence simulée et rejet d'un toucher perdu (`node --import ./scripts/ts-loader.js --test tests/e2e/finger-stepped.node.ts`).

### Corrections E2E — passe 105

- Pause : pose endormie synchronisée avant toute lecture, puis état figé pour tous les jeux.
- Essaim : clavier actif après la case de tir automatique ; budget vertical desktop corrigé et rangée tactile de 64 px. Police des spéciaux commune à 16 px.
- Pilotes au doigt : échéances en temps de jeu, horizon issu du retard réellement observé et attentes explicites de 30 s ; latence de 150 ms et bruit de ±12 px conservés.
- Briqueterie : suppression du redimensionnement à chaque image ; K02 vérifie la pause avec le temps simulé.
- Ferraille : 30 rejeux échantillonnés par la graine fixe 105 (niveaux, personnages et graines listés dans le rapport), rencontres mises en cache et divergence du premier module détectée immédiatement ; onze mutations conservées.
- Régressions Node : pause immédiate, clavier après focus, toucher du spécial, contrôles K02, budgets CSS et retard de lecture de 450 ms.

### Ferraille — passe 104

- Bonus secret accordé une seule fois ; collision du piston limitée à sa boîte dessinée sur les deux axes.
- Introductions jouables : ascenseur, chaîne, otage et plafond construits, pont qui s’effondre sur un fond sûr, cibles inertes ; pilote adapté aux introductions.
- Mesure sur les rencontres et gestes effectivement rejoués : 16 modules, similarité maximale 50 %, distance moyenne consécutive 0,8413 (publication 103 : 0,8057 sur modules générés). Score historique maintenu à 0.
- Fixture authentique de `dab7aed`, cas négatifs isolés et distances littérales ; scène contrôlée sous Node (annonce 120 pas, checkpoints, démonstrations, cinq personnages et 900 victoires). Les 11 mutations sont exécutées et tuées par assertions ; rejeux Ferraille régénérés.

### Ferraille — passe 103

- Trente parcours écrits, seize modules physiques, démonstrations sûres, drapeaux médians et six arènes à module vedette ; R01–R03 conservent leurs noms et décors.
- Répétition mesurée sur les séquences et gestes : 435 paires, plafond 50 %, vedette distincte des deux précédentes. Score historique 11,2 → 0.
- F-niv-01…04 : effets littéraux, 900 victoires enregistrées (cinq personnages, trois graines, deux modes), anciens états compatibles et quatre mutations rejetées. E2E tactiles et huit captures écrits pour l'orchestrateur, non exécutés localement.

### Essaim — passe 102

- Étoiles : réattribution après destruction et collisions ignorant les cadavres du même pas ; projectiles et budget supprimés à chaque nouvelle vague ; traînées masquées en mouvement réduit.
- Banc d'équilibre étalé à 100 PV par cible, sans saturation : dégâts 2,10–2,80 PV, écart maximal 10,26 % ; paramètres propres aux armes ajustés et tableau détaillé dans GAME_SPEC.
- Assertions exactes sur fragments, montée et répétition 17/18, recharge complète, rebond droit, durée de vie, transition de vague et expiration visuelle. Seize mutations exécutées sous Node, dont les huit de la relecture adverse.
- Cadence du pilote avec signature adaptée au nouvel équilibre ; pilote historique, rejeux et records sans signature inchangés.

### Essaim — passe 101

- Cinq signatures déterministes : bao fragmenté, spirale de feuilles, feu traversant et explosion, bananes à rebonds ralentissants, étoiles guidées ; charge manuelle et recharge commune de 8 s.
- Vaisseaux à visage agrandis de 58 à 84 px, tirs contrastés, sept contours ennemis et trois décors en parallaxe ; pool de 96 particules conservé.
- Équilibre mesuré sur trois formations, campagnes avec les cinq personnages, 60 rejeux historiques inchangés, budgets de rendu sur 2000 pas et quatre mutations détectées sous Node.
- E2E mobiles écrits pour armes en vol, décors et victoire au doigt bruité ; aucun navigateur ni Vitest exécuté.

### Corrections des spéciaux — passe 100

- Balle forte conserve la téléportation et la temporisation des portails ; tests
  littéraux de tous les types de briques et reprise après contact traversant.
- Super-tir : 20 points par PV de boss effectivement retiré ; ouverture des cages
  et protection du Bouclier lors de la perte d'escorte verrouillées sous Node.
- Validation par événement clavier C des trois jeux, HUD prêt/utilisé/recharge
  et durée réelle des effets ; compteur E2E fondé sur l'activation moteur.
- Délais E2E de l'habillage portés à 15 s pour le démarrage mobile.
- Gourmandises : 120 niveaux, objets dorés à faire sortir, glace double et trois nouveaux décors ; finales à deux objectifs, équilibre mesuré sur cinq graines, empreinte inchangée des 60 premiers niveaux et 26 mutations vérifiées en mémoire. Parcours de sortie et captures du palais écrits pour bureau et mobile.

- Gourmandises : trois décors dessinés, plateau agrandi, HUD illustré, outils avec compteurs et raccourcis synchronisés pendant les chutes ; cinq mutations visuelles supplémentaires.

- Gourmandises : campagne recalibrée sur cinq graines, combinaisons et glace corrigées, compartiments reliés, difficulté physique et 16 mutations tuées en mémoire.

- Gourmandises : 60 niveaux, modes Découverte/Arcade, cascades, spéciaux, obstacles, outils et compagnon choisi ; moteur et mutations validés sous Node, parcours tactiles écrits pour l’hôte.

### Personnages dans les jeux, partie 4 — passe 84

- Ferraille : Super-tir frontal de courte portée, recharge de dix secondes.
- Briqueterie : Balle forte traverse trois briques, une fois par vie.
- Essaim : Bouclier de deux secondes par vague ; glisser au pouce gauche,
  tir/charge et spécial à droite, champ réservé en portrait et paysage ; tir
  automatique actif par défaut, préférence mémorisée dans ☰.
- Effets procéduraux du compagnon choisi via le rendu commun ; mêmes règles
  pour Boubou, CaliRoux, Pestouille, Tutu et Lumi, anciens records conservés.
- Alunir : l'alignement ne corrige plus l'angle sur le pas de collision ; corps
  inchangés de U06/U07 exécutés sous Node.
- Traverse : trafic continu renforcé, 2000 dessins raster sans fenêtre figée
  de 600 ms à 15 Hz.
- 180 campagnes enregistrées avec/sans spécial, sept mutations rejetées ;
  E2E CDP bruités et deux pouces écrits pour l'hôte, sans exécution locale.
### Le Collier du Singe — correction passe 302

- Tir orienté vers la position finale du relâchement au doigt et à la souris.
- Avertissement de danger également déclenché par une insertion au-delà de 85 %.
- Oracles Node renforcés : limites du tap, excursion puis retour, reprise après
  annulation/sortie et transmission des événements au service sonore (C23).
- Huit mutations ajoutées aux onze précédentes, avec ancres uniques et
  vérification des substitutions en mémoire.

### Le Collier du Singe — correction passe 301

- Émissions au départ après éclatement, couleurs à graine par séries de 1 à 3,
  bombe résolue sur les positions à l’impact avant insertion.
- Courbes arrondies avec table fine, longueurs tronquées sans agrandissement,
  contrôles de champ, de courbure et de séparation sur les trente niveaux.
- C01–C22, contrôles et dessin de la scène exécutés en Node, onze mutations
  tuées en mémoire ; E2E préparés pour glissé, tap réserve et clavier réels.
- Code Collier remis en forme et oracles documentés.

### Le Collier du Singe — passe 300

- Treizième jeu : 30 parcours à perles, recul aimanté, combos, quatre bonus,
  tunnels et deux colliers finaux ; tireur choisi et meneur dansant de la troupe.
- Visée au doigt partout, tir au relâcher, échange tactile de 56 px, vignette
  procédurale animée et progression du socle.
- Oracles C01–C17 et campagne Node : 30 victoires et 30 inactions perdantes ;
  E2E desktop/mobile et doigt CDP bruité écrits pour exécution externe.

### Personnages dans les jeux, partie 3 — passe 82

- Dédale : héros choisi à la place de la luciole, Lueur de trois secondes vers le
  soleil le plus proche, une fois par niveau ; les follets restent distincts.
- Orbite : compagnon dans la tourelle, Rafale de 1,5 seconde une fois par vague.
- Empilo : mascotte à côté du puits, réserve classique une fois par pièce posée,
  six boutons principaux sur une seule rangée tactile.
- Réactions issues des vrais événements, dodo en pause, motifs procéduraux des
  cinq compagnons ; sauvegardes, barèmes et témoins ordinaires conservés.
- Rejeux Node de 180 victoires, états littéraux, vrais appels Graphics des cinq
  identités, sept mutations rejetées et répétition des pilotes avec latence.
- E2E CDP mobiles bruités écrits pour les niveaux 1 et 10 et un cas où la réserve
  change la défaite en victoire ; captures seulement après la conduite.
- Vignette Traverse : rondins et véhicules en mouvement continu, test raster
  sur 2 000 dessins interdisant 36 pas consécutifs identiques.

### Habillages d'action et catalogue catalogue — passe 77

- Ferraille : cinq aventuriers équipés, huit poses chacun, projectiles thématiques
  et cinq véhicules distincts, dessinés par les primitives vectorielles communes.
- Briqueterie : raquettes à quatre vues, balles à visage/emblème, traînées,
  bonus illustrés et décors par compagnon et tranche de niveaux.
- Essaim : cinq vaisseaux à quatre vues, habillage des six armes, menaces
  contrastées et décors spatiaux du catalogue. Hitboxes et règles des armes conservées.
- Neuf niveaux réels : Jungle mécanique, Forteresse oubliée, Usine infernale,
  Festin de Boubou, Tourbillon d'automne, Constellations, Ceinture de bambou,
  Nébuleuse écarlate, Royaume des étoiles. Ascenseur et convoyeurs utilisables,
  nouvelles grilles et formation en anneau ; autres règles conservées.
- Cache de textures vectorielles de la passe 75 réutilisé ; réserves d'images
  bornées à 224/160/256, sans génération pendant le jeu. Références hors dépôt.
- Pilotes et rejeux gagnants sur deux graines ; scores de diversité inchangés
  (11,2/18,1/16,4). Nouveaux contrôles Node sous 2 s par cas, scènes réelles avec
  ports simulés et nettoyage vérifié. Rapports de validation actualisés.
- Bundle principal : 1 522,46 → 1 538,63 kB ; gzip 421,44 → 427,12 kB.
- 29 E2E de captures préparés, sans exécution de navigateur ni Vitest : quinze
  habillages, cinq véhicules et neuf niveaux catalogue.

### Habillages de Dérapage et Bubble Lab — passe 75

- Cinq véhicules vectoriels distincts avec pilote visible, cinq vues chacun,
  accessoires propres et illustration en action sur le résultat de Dérapage.
- Cinq lanceurs avec cinq vues, canon articulé, bulles thématiques lisibles par
  six couleurs et six motifs contrastés, et cinq effets visuels de Joker.
- Bonus et Élan habillés selon le pilote, sans modification des moteurs ; décors
  jungle, automne, volcan, cirque et ciel par groupes de six niveaux de Bubble Lab.
- Galerie des équipements sur les cartes de personnages ; textures procédurales
  mises en cache, réserves fixes et expressions des pilotes conservées.
- Contrôles purs Node des vues, motifs, contraste et budgets ; contrôles de scènes
  adaptés et dix E2E de capture écrits, sans lancer navigateur ni Vitest.
- Les références restent hors dépôt ; aucun fichier image ajouté, aucun commit.
- Bundle principal : 1 506 147 → 1 522 011 octets ; gzip 415 559 → 421 301
  octets (+15 864 / +5 742). CSS inchangé : 12 386 octets, gzip 2 993.

### Characters enter the games — pass 72

- Selected companion drives Dérapage, holds Bubble Lab's launcher and leads
  Serpentin; the other four companions drive rival karts, with one neutral driver.
- Deterministic optional specials: additive 800 ms Élan once per lap for every
  kart, one next-shot colour Joker per level, and one body-contact Esquive per level.
- Shared pass-71 Graphics rendering, reactions and paused redraws; mobile special
  buttons, preserved saves/scores and recorded 30-level campaign witnesses.
- Continuous Traverse thumbnail traffic with a 2000-step drawing oracle; pure
  Node scene/mutation checks and three written mobile CDP noisy-touch scenarios.

### Characters enter the games — pass 70

- The home companion is now the playable hero in Caisses and Traverse and the
  pilot visible in Alunir's cockpit, with procedural poses, reactions and specials.
- Equal rules for all five companions: one crate pull per level, one two-cell
  bond per life, or two fuel-consuming one-second stabilisations per level.
- Exact Caisses records with/without pull, preserved ordinary solvers and saves,
  recorded campaign replays and Node mutation checks. Three noisy-finger mobile
  CDP touch scenarios are written for execution on the test host.

## [0.3.2] - 2026-10-30

### Dérapage: playable by touch

- New default touch control: an absolute 360° thumb joystick with a fixed, north-up camera.
  Put your thumb anywhere and the kart turns towards where it points, with a visible ring,
  thumb dot and heading arrow. The rotating camera with relative steering stays available in
  the ☰ menu and is remembered.
- Gentle, switchable line assist; kerbs and rails push the kart back onto the track instead
  of trapping it; an easy, wide first track (the seaside street circuit moves to track 5).
  Per-track records follow their track, and old saves are migrated.

### App updates

- Version and build date on the home screen and in the ☰ menu; an active update check at launch,
  every 30 minutes and when the app returns to the foreground; a "New version" banner and a
  "Force update" button that keeps every save.

### Less repetitive games

A measured repetitiveness score (`docs/diversity.md`, lower is more varied):

- Ferraille 84.5 → 11.2: six enemy behaviours, flamethrower, ricochet and grenade pickups,
  wagons, hostages, a guardian every five stages, a three-phase reactor and four themes.
- Essaim 81.9 → 15.5: six weapons (overheating beam, bouncing shots, drones, slow-down wave,
  magnet, charged shot), directional shields, typed waves, guardians, a two-phase command ship,
  and new rounded ships, particles and parallax.
- Dédale 100 → 22.4: keys and doors, one-way passages, portals, switches, cycling walls, ice,
  darkness and three wisp behaviours, woven into corridor, room, ring, spiral and mirror mazes.
- Briqueterie 79.3 → 18.1: moving, explosive, regrowing, portal, angled and key bricks,
  multi-ball and gravity zones on drawn layouts.
- Orbite 78.4 → 18.1: new probe behaviours, hazards, an ally to protect, guardians and a
  two-phase finale.

### Characters (first part)

- Five recurring characters drawn in code: a greedy panda, a playful red panda, a studious
  dragon, a monkey in a tutu and a playful unicorn. Each has three poses, five expressions,
  animations and a special move. A picker on the home screen remembers your choice. Their
  integration into the games comes next.

## [0.3.1] - 2026-10-30

### Dérapage

- Thirty hand-drawn tracks instead of one deformed loop: urban, fast, technical, banked and
  nature families, with cup themes. Among them a slow seaside street circuit, a circuit
  around a Paris esplanade, a fast forest hill circuit, a downhill slalom and a BMX track.
  A scale- and rotation-invariant shape signature proves the tracks differ (Z26).
- Full-width chequered finish line drawn from the engine's lap gate (Z27), a starting grid,
  lap messages and a mini-map marker.
- Race and lap timers (mm:ss.cc) on simulation time, best lap, gap at the line, and a
  per-track record kept in the existing save (Z28, Z29).
- Slalom gates with a 2 s time penalty, snow with reduced grip, downhill gravity, BMX
  berms and speed-dependent jumps with a shadow, and continuous urban kerbs and rails with
  collision (Z30–Z35).
- After play-testing: continuous thumb steering with a dead zone, a held Drift button,
  grass capped at 45% of road speed, seeded boost strips from level 3, and roadside trees
  with collisions.
- The home preview finishes real races; faster track lookup (about 2.5× per step).

### Bubble Lab

- Strict hex grid, snapping to the free socket nearest the contact point, a slightly
  reduced collision radius so gap shots pass, exact wall reflections, falling detached
  groups with a bonus, drag-and-release aiming with a one-bounce guide, optional tap
  firing and next-bubble swapping (B-HEX tests).
- Thirty levels instead of ten. The first ten are unchanged. New mechanics arrive every
  few levels: stone, bomb, rainbow, ice, star rescue and bumpers, with breathing levels,
  challenges every five levels and a final level that combines them.
- The difficulty curve rises, and recorded winning solutions for all 30 levels are
  replayed in the tests (B-LVL tests).

### Other

- A measured level-diversity report for the twelve games (`docs/diversity.md`,
  `scripts/diversity-report.js`).

## [0.3.0] - 2026-10-29

### Added

- Twelve animated, deterministic Canvas previews on the home screen, driven by
  pure game engines. Previews pause off screen, in the background and during
  play. Reduced-motion preferences show still images; mobile uses two columns.
  Previews cover all twelve games.
- Alunir, the ninth game: 30 seeded landscapes, thrust, rotation, wind, fuel and
  continuous collision detection; held controls, animated preview, progression
  and synthesized sounds. U01–U12 rule tests and desktop/mobile journeys.
- Caisses, the tenth game: 30 original workshops, crate pushing, unlimited undo,
  solver-proven records, touch controls and an animated preview.
- Traverse, the eleventh game: 30 seeded crossings, three to five shelters,
  traffic, a river and diving floats. Pure engine, replayed BFS solutions,
  touch controls, demo, sounds and R01–R12 tests; no shared shell changes.
- Dérapage, the twelfth game: a pure racing engine in world coordinates,
  30 tracks, seven cups, five AI opponents, drifting and four original bonuses.
  Rotating camera, minimap, a single row of 64 px controls, synthesized sounds,
  preview and demo; Z01–Z16 tests and Node validation. No shared shell changes,
  new dependencies or binary assets.
- English primary README and matching French README, with language links,
  current game controls, offline installation and development guidance.

### Changed

- Alunir uses explicit landing thresholds, a larger module and an unobstructed
  HUD. Caisses has compact puzzles with exact minimum move/push counts; turns,
  detours and required effort are checked by a Node script.
- Contribution and security guidance, changelog, issue forms and pull request
  template are now in English. Game names and the French interface are unchanged.

### Fixed

- Guidance assertions in Essaim, Orbite, Briqueterie and Ferraille E2E tests now
  advance engine time after real input, avoiding dependence on rendering speed
  without loosening position tolerances.

## [0.2.0] - 2026-10-29

### Added

- Phone installation as a PWA, with a manifest and original icons. All eight
  games and their local progress remain available offline after loading.
- Updates announced without interrupting play and applied on the next launch
  after all windows have closed.
- Phone comfort features: screen wake lock during active play, vibrations tied
  to global sound and optional fullscreen from the mobile menu.

### Changed

- Visible title changed to “Opencade”; historical storage keys preserved to
  retain existing progress.

## [0.1.0] - 2026-10-29

### Added

- Eight original games: Bubble Lab (10 levels), Serpentin, Briqueterie, Empilo,
  Orbite, Essaim, Dédale and Ferraille (30 levels each).
- Shared shell: home screen, pause, result panels, level selection, optional
  local storage and global synthesized sound.
- Touch, mouse and keyboard controls; fullscreen layout on phones.
- Pure seeded engines tested with Vitest; desktop and mobile Playwright E2E journeys.
- GitHub Actions CI and GitHub Pages deployment.

[Unreleased]: https://github.com/Davy45270/Opencade/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/Davy45270/Opencade/releases/tag/v0.3.1
[0.3.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.3.0
[0.2.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.2.0
[0.1.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.1.0

### Les Artificiers

- Nouveau jeu `artificiers` : trente cartes originales, terrain destructible,
  six armes, compagnons, vent, grappin, caisses, eau montante et duel local.
- Moteur déterministe, trente victoires enregistrées, contrôles tactiles bruités,
  tests partagés Node/Vitest et scénario E2E à exécuter sur l’hôte navigateur.
- Missions de démolition verrouillées à 80 %, lâcher de corde gratuit,
  panneau hors du terrain ; décors et poses en cache, plafond de 500 appels
  Graphics, budgets de travail comptés et huit mutations vérifiées en Node.
