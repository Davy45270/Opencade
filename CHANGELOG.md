# Changelog

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Bandeau du haut sur téléphone : les compteurs de gauche ne passent plus sous le compteur du centre. Dans Marmaille, « 🚪0/6 » chevauchait le minuteur « ⏱120 » de 360 à 390 px de large. Les côtés gardent toujours au moins la place de leur contenu, avec 12 px entre les colonnes. Un test vérifie, pour chaque jeu et dans les trois tailles de téléphone, que deux éléments voisins du bandeau gardent au moins 6 px entre eux.
- Marmaille : le niveau 4 « Le pont » n’est plus une copie du niveau 1 avec trois cases d’eau. La troupe part de la droite et marche vers la gauche, l’eau fait quatre cases de large, et la porte est en haut d’une berge de deux marches, de l’autre côté. La leçon ne change pas : un bâtisseur pose cinq marches au-dessus du vide. Sans lui, toute la troupe se noie. Un test refuse désormais deux plateaux qui ont le même départ, la même sortie et le même sens et qui diffèrent de moins de quatre cases.
- Outillage : la relecture du code passe d’ESLint et typescript-eslint, qui n’acceptent pas TypeScript 7, à oxlint et son module typé `oxlint-tsgolint`. `.oxlintrc.json` reprend les règles qu’ESLint appliquait réellement : 118 des 119 règles des fichiers TypeScript, dont les 42 règles typées (promesses oubliées, `any` qui se propage, opérandes de gabarit et de `+`…) ; 89 des 91 règles des scripts JavaScript ; et la règle de pureté des moteurs (`src/engines` et `src/characters/model.ts` : ni Phaser, ni globales du navigateur, ni `Math.random`). Seules `no-octal` et `no-dupe-args` disparaissent, deux erreurs de syntaxe en module ES. oxlint ignore les commentaires `/* global */` : les 16 noms qu’ils déclaraient dans les scripts sont déclarés une fois pour tous les `.js`. `npm run lint` passe de 92 s à 6 s.
- Outillage : TypeScript 7.0.2 (au lieu de 6.0.3), sans aucune nouvelle erreur ; `npm run typecheck` reste `tsc --noEmit`. TypeScript 7 n’expose plus l’API du compilateur : les neuf outils qui s’en servaient sont réécrits sur Oxc (`rolldown/utils`), le transformateur que Vite utilise déjà pour le build. Repli de `scripts/transpile.js` pour les propriétés de constructeur, `diversity-report`, `measure-pass56`, `record-derapage-historical`, nouveau `scripts/to-commonjs.js` pour les harnais PWA (`test-pwa`, `pwa-harness`, `check-pwa-mutations`), et lecture de l’arbre syntaxique dans `tests/e2e/touch-contract.node.ts` et `tests/derapage-3d-source.ts`. Leurs sorties sont identiques à celles d’avant. Le jeu ne change pas.
- Caisses : la vignette du catalogue montre aussi la caisse de David vue de dessus, teintée comme dans le jeu (rouge pour une caisse rouge, verte une fois rangée). Le dessin (le même WebP de 5 ko) est demandé une fois par l’accueil ; d’ici là, la vignette garde l’ancienne caisse.
- Bombercade : la vignette du catalogue montre aussi la caisse « ? » de David, à la place de la caisse dessinée par le programme. Le dessin (le même WebP de 3 ko) est demandé une fois par l’accueil ; d’ici là, la vignette garde l’ancienne caisse.
- Petits Pompiers : dans les niveaux du centre-ville, les rues sont dessinées comme des rues, sans toucher aux cartes. Sur l’asphalte de David, là où la rue tourne (deux côtés voisins hors de la rue, bord de la carte compris), l’angle de trottoir qu’il a dessiné arrondit le coin ; devant chaque porte qui donne sur la rue, un passage piéton est peint, dans le sens où l’on entre. Les cases, les collisions et les règles ne changent pas. Les six tuiles font 12 Ko en WebP.
- Petits Pompiers : un niveau sur trois (3, 6, 9, 12 et 15), l’animal à secourir est le lapin gris dessiné par David, collier rouge et médaille : il remplace le chaton des niveaux 3, 6 et 9 et le chiot des niveaux 12 et 15 (les chats vivent dans les niveaux 1 à 9, les chiens dans les niveaux 10 à 15, d’où trois et deux). Même case, mêmes règles : il est porté. Debout, il se tourne vers le pompier ; dans ses bras, il regarde où l’on va ; il est aussi sur le compteur des animaux. Seul le dessin change : les bandes, les délais et les 150 victoires enregistrées sont inchangés. Les trois vues (10 Ko en WebP) rejoignent le module des sprites.
- Petits Pompiers : le décor autour de la carte est dessiné par David. Derrière la carte, sa caserne, sa maison, son commerce, son école et son immeuble remplacent les bâtiments dessinés par le programme ; chacun est vu de ¾, la façade tournée vers la carte. Le quartier gagne l’école et le centre-ville le commerce. Dans ces deux mondes, le bord sud mêle son banc, sa jardinière et sa poubelle aux buissons. Forêt, montagne et port gardent cabane, chalet et hangar, faute de dessin. Les images (82 Ko en WebP) rejoignent le module des sprites ; les règles ne changent pas.
- Petits Pompiers : les sols sont les tuiles de David, posées en losange : herbe, sable, asphalte de la route, pavés, béton des quais et planches de bois des intérieurs. La neige et l’eau gardent leurs tuiles, faute de dessin. Les six tuiles font 12 Ko en WebP ; les règles ne changent pas.
- Petits Pompiers : le camion de la sortie est celui que David a dessiné, vu de ¾ avant gauche : long, rouge à bandes jaunes, gyrophares bleus et échelle sur le toit. Il garde la place et la largeur de l’ancien (10 Ko en WebP) ; les règles ne changent pas.
- Caisses : les caisses à pousser sont celle que David a dessinée, vue de dessus. On les reconnaît comme avant : une caisse rouge est teintée de rouge (elle va sur une cible rouge), une caisse rangée sur sa cible devient verte. Les règles ne changent pas. Le dessin (WebP de 5 ko) arrive dans son propre morceau de code, mis en cache pour jouer hors ligne ; d’ici là, la caisse dessinée par le programme s’affiche. Le personnage reste dessiné par-dessus les caisses.
- Petits Pompiers : les outils posés au sol sont ceux que David a dessinés : la hache, la trousse de secours, le mégaphone et l’extincteur à mousse (il remplaçait la lance). La borne où l’on remplit le réservoir est sa bouche d’incendie rouge. L’échelle garde son icône dessinée par le programme, faute de dessin. Les images (12 Ko en WebP) rejoignent le module des sprites ; les règles ne changent pas.
- Bombercade : les blocs à casser sont la caisse « ? » dessinée par David. Chaque sorte de bloc reste reconnaissable : la glace est teintée de bleu pâle, l’or est doré et garde son étoile, le bloc renforcé est barré de bandes d’acier, plus épaisses tant qu’il lui reste deux coups. Les règles ne changent pas. Le dessin (WebP de 3 ko) arrive dans son propre morceau de code, mis en cache pour jouer hors ligne ; d’ici là, la caisse dessinée par le programme s’affiche.
- Petits Pompiers : le chien à secourir est le chiot dessiné par David, au pelage roux et blanc et au collier rouge. Debout, il se tourne vers le pompier pendant qu’il attend (de face, de profil ou de dos selon où il se trouve) ; dans les bras du pompier, il regarde où l’on va. Il est aussi sur le compteur des animaux des niveaux sans chat. Les trois vues (9 Ko en WebP) remplacent l’ancien chien dans le module des sprites ; les règles ne changent pas.
- Petits Pompiers : les personnes à secourir sont les enfants dessinés par David, Emma, Noé, Inès, Chloé et Lucas, et on ne les porte plus : elles suivent le pompier (arbitrage de David). Au contact, l’appui leur prend la main ; une blessée suit une fois soignée, une personne à la fenêtre suit depuis le pied de l’échelle ; le mégaphone et le halo de Lumi font toujours suivre de loin, quatre au plus. Seuls les animaux restent portés, un à la fois, et on peut prendre un enfant par la main en portant le chat. Un enfant par personne du niveau, la distribution changeant d’un niveau à l’autre ; il attend debout, face à nous, puis marche de profil derrière le pompier, au rythme de ses pas ; Inès suit en roulant dans son fauteuil. Il est aussi sur le compteur des personnes. Les bandes des pilotes sont réenregistrées et les délais du mode défi recalés par leur règle (3 × le pilote le plus lent) : niveau 4 de 60 à 70 s, niveau 13 de 90 à 110 s, les autres inchangés. Les dessins (45 images, 161 Ko en WebP) rejoignent le module des sprites, chargé à part.
- Pistouille : trois nouveaux dessins de David. Le long de l’extérieur des virages serrés, des murs de pneus : des piles de trois pneus côte à côte, hors de la piste (environ 150 piles sur les circuits). Les bandes d’accélération vertes sont remplacées par sa rampe d’accélération, à plat sur la route, chevrons vers l’avant : mêmes zones, même effet, seul le dessin change ; en 3D, chaque rampe est posée sur le sol en quatre morceaux pour que la perspective tienne. Sur la coupe technique, un panneau de virage sur deux est son panneau bleu et jaune, pour varier ; il n’est dessiné que vu de dessus, donc en 3D sa place montre le premier panneau en attendant ses autres vues. Les dessins (31 Ko en WebP) arrivent avec les autres décors, gardés hors ligne ; d’ici là, les décors d’avant restent affichés.
- Pistouille : trois décors dessinés par David bordent la route. Sur les 8 circuits de ville, des barrières de chantier sont posées au bord du trottoir, le long de la route ; en 3D, on les voit de face, de ¾ ou de profil selon l’angle, comme les karts. Sur les 4 circuits de quais, la caisse en bois sans « ? » remplace la caisse dessinée par le programme. Sur la coupe technique, les panneaux jaunes posés à intervalle fixe laissent la place au panneau directionnel de David : un par virage, juste avant, à l’extérieur, flèches vers le virage (retourné pour la gauche). La barrière fait la hauteur d’un kart, le panneau 1,6 kart. Aucun décor ne mord sur la route ni ne cache le kart ou la route devant lui. Les dessins (98 Ko en WebP) arrivent dans un module à part, chargé à l’ouverture du jeu et gardé hors ligne ; d’ici là, les décors d’avant restent affichés. Les rails et les collisions ne changent pas.
- Petits Pompiers : le chat à secourir est le chaton gris tigré dessiné par David. Il appelle à l’aide en attendant, a l’air soulagé dans les bras du pompier et reste assis, heureux, près du point de secours une fois sauvé ; il remplace aussi le chat orange du compteur. La porte bloquée est la barrière rouge et blanche de David, posée dans l’embrasure le long du mur. Le niveau 4 en a une à la place de la caisse qui bouchait la porte : il se joue exactement pareil (mêmes bandes enregistrées, mêmes durées). Le chien et les personnes ne changent pas.
- Pistouille : les arbres sont à l’échelle des karts. Ils avaient l’air de fleurs : un arbre faisait à peine la hauteur d’un kart en 3D, et une couronne la moitié de sa longueur vue de dessus. En 3D, un arbre mesure maintenant environ 3,5 hauteurs de kart, et vu de dessus une couronne fait environ 2,75 longueurs de kart. Les arbres sont écartés de la route pour qu’aucune couronne ne la couvre et qu’ils ne cachent ni le kart ni la route devant. Les dessins sont refaits plus grands pour rester nets (105 Ko au lieu de 53). La collision reste celle du tronc ; plus loin de la route, on tape moins souvent un arbre.
- Pistouille : en vue 3D, le ciel n’est plus un aplat bleu. Chaque coupe a son horizon dessiné par David (Paris, vallée printanière, désert, galaxie, forêt des Ardennes, Évian, Bénodet, montagnes givrées, jardin zen, manoir hanté, volcan), qui défile quand la caméra tourne. Les horizons se raccordent sans couture : le cadre des bords est retiré et la jointure se cache derrière un arbre, un cristal ou un panache de fumée du même décor. Chaque horizon arrive dans son propre module, chargé seulement pour la coupe courue et gardé hors ligne ; l’aplat bleu reste affiché en attendant.
- Pistouille : les arbres du décor sont ceux que David a dessinés, vus de dessus en vue de dessus et de côté en 3D. Les essences suivent l’ambiance du circuit : palmiers sur la côte des falaises, sapins en montagne (slalom et BMX), sapins et feuillus dans la forêt des Ardennes, feuillus et cerisiers dans les prés, érables et pommiers sur les circuits techniques, cerisiers et pommiers sur les ovales, érables à Feuilles Folles, et en 3D le bambou de la planche de référence à Bambou Express (vu de dessus, il garde son bambou dessiné par code). Le feuillu est la version V3 sans faux damier. Les dessins (53 Ko en WebP) arrivent dans un module à part, chargé à l’ouverture du jeu et gardé hors ligne ; d’ici là, les arbres d’avant restent affichés. Les collisions avec les arbres ne changent pas.
- Pistouille : les bonus sont ceux que David a dessinés. La boîte « ? » devient la capsule de malice, posée sur la piste en vue de dessus et dressée face à la caméra en 3D. Le bonus en main a enfin une icône par bonus, la même pour les cinq mascottes : comète filante pour le turbo, tornade confettis pour le ressort, nuage farceur pour la flaque, bulle rebond pour la bulle. Avant, l’icône changeait selon la mascotte, et chez Pestouille le turbo, le ressort et la flaque montraient tous le même feu. La flaque posée est le nuage farceur, de dessus comme en 3D. Les petites tailles (20 px et moins) ont leur propre réduction, plus nette et cernée d’un contour sombre. Les dessins (31 Ko en WebP) arrivent dans un module à part, chargé à l’ouverture du jeu et gardé hors ligne ; les règles des bonus ne changent pas.
- Pistouille : le kart gris au pilote neutre est retiré. On court désormais à cinq, un kart par mascotte (Boubou, CaliRoux, Pestouille, Tutu, Lumi) : la place s’affiche sur 5, la coupe compte cinq karts (10, 8, 6, 5 et 4 points) et le podium reste les trois premiers. Les bandes enregistrées et les budgets de dessin sont regénérés ; les preuves historiques, courues à six, restent rejouées à six par un moteur de test.
- Pistouille : en vue 3D, on voit enfin son kart tourner. La caméra suit le cap du joueur, donc son kart montrait toujours la vue arrière. Il prend maintenant la vue ¾ arrière du côté du virage dès qu’on braque franchement, qu’on dérape ou que le kart glisse de travers, et la garde sans clignoter tant que le virage dure (seuil avec hystérésis). Un tête-à-queue montre toujours le profil ou la face. Les autres karts n’ont pas changé.
- Bubble : un tir arc-en-ciel ne gâche plus le groupe visé. Il prenait toujours la couleur de la bille touchée, même quand sa propre couleur complétait déjà un groupe de trois : la bille changeait de couleur en se collant et rien n’éclatait. Il garde maintenant la couleur tirée (celle vue pendant le vol) quand elle fait éclater un groupe, et ne prend la couleur touchée que sinon. Les parties enregistrées par le solveur sont rejouées avec la nouvelle règle (19 niveaux sur 130 réenregistrés ; les niveaux eux-mêmes ne changent pas).
- Pistouille : un kart perdu loin de la piste n’y reste plus. Au-delà de 30 m du bord pendant 1,5 s, bien plus loin que toutes les trajectoires des courses enregistrées (25 m au plus) : il est remis au milieu de la route, arrêté, dans le sens de la course, sans sauter de porte. Dès qu’il sort de la route, une flèche jaune montre le chemin du retour, en vue de dessus comme en vue 3D. Avant, un kart lâché pouvait rouler jusqu’à 466 m de la piste sans jamais revenir.
- Pistouille : sur la mini-carte, on se retrouve d’un coup d’œil. Le joueur y est une flèche orientée selon sa direction, trois fois plus grande que les points des rivaux, et un chevron près de l’arrivée montre le sens de la course. Le bonus en main s’affiche avec son emblème, dans un cadre doré sous la mini-carte, en vue de dessus comme en vue 3D. Avant, le joueur était un point de 2 px comme les autres, et rien ne disait quel bonus on portait. Coût : 4 appels de dessin par image, budgets regénérés (457 et 781 au plus, sous les plafonds de 520 et 800).
- Pistouille : l’Élan se fait entendre. Le mini turbo lançait son impulsion en silence, parce que le son n’écoutait que les turbos des bandes et des bonus. Il joue maintenant le même son de turbo, une fois par tour, au moment où on appuie.
- Bubble : les billes sont désormais celles que David a dessinées : dragon vert, monstre orange, sorcier violet, étoile jaune, bleu, et rose uni. Le prisme devient sa bille arc-en-ciel et garde son étincelle sombre cerclée de blanc ; les autres billes spéciales gardent leur symbole cerné par-dessus. Les dessins (56 Ko en WebP) arrivent dans un module à part, chargé à l’ouverture du jeu et gardé hors ligne.
- Bubble : la liste des 130 niveaux est rangée en treize paliers de dix, nommés par thème (Atelier, Lucioles… Ciel profond). Elle s’ouvre sur le palier du prochain niveau à jouer. Les onglets et les niveaux font au moins 44 px, et les flèches du clavier passent d’un palier à l’autre.
- Petits Pompiers a son propre site : `/pompiers/`, avec son appli installable (nom, icône, portée et service worker à lui), jouable hors connexion après une première visite, et rien d’autre que son jeu à télécharger. La carte du catalogue y mène, l’ancienne adresse `#/petits-pompiers` y redirige, et la progression est conservée. Le menu du jeu propose « Tous les jeux » pour revenir au catalogue.
- Téléphone : la liste des niveaux défile de nouveau au doigt, dans tous les jeux, en portrait comme en paysage. Jusqu’ici, la zone de jeu bloquait tout glissé, y compris dans cette liste : au-delà d’un écran, les niveaux suivants restaient hors d’atteinte. En partie, un glissé sur le jeu ne fait toujours pas défiler la page.
- Bubble : 100 niveaux de plus (31 à 130), en dix paliers de dix. Chaque palier s’ouvre sur un niveau plus facile pour souffler, a son décor (jungle, automne, volcan, cirque, ciel) et ajoute une mécanique déjà connue. Un solveur gagne chaque niveau avec sa vraie donne, et le regagne quand le plafond descend 20 % plus souvent ; ces parties sont rejouées par les tests.
- Bubble : le niveau 9 « Cristal » devient plus abordable. Son plafond descend tous les 8 tirs au lieu de 7, et son dessin ne change pas.
- Bubble : les billes spéciales se reconnaissent au premier coup d’œil, même sans distinguer les couleurs. Chacune a son symbole cerné, et la bombe comme le tir arc-en-ciel sont animés. Une bulle d’une ligne présente chaque effet la première fois qu’il apparaît, et la pause en donne la légende.
- Jeu au doigt sur téléphone : plus de barre de commandes. Le ⏸ reste fixé en haut à droite ; une seule page de pause regroupe les réglages et les aides. Sur un écran court et large (paysage), les commandes passent dans les bandes latérales.
- Commandes tactiles allégées jeu par jeu : gestes plutôt que flèches (Caisses, Empilo, Serpentin, Dédale, Pépites, Briqueterie), une seule icône en jeu (Bubble, Orbite, Briqueterie, Serpentin), Collier sans commande (on touche le tireur pour échanger), compteurs dans la rangée du haut (Alunir, Marmaille, Gourmandises, Pépites, Bubble), saut de Ferraille à 72 px sous le pouce, Bombercade et Artificiers réorganisés, Petits Pompiers en plein écran au-dessus de sa barre.
- Traverse revient au catalogue, avec un pas au doigt plus franc. Un toucher fait un pas en avant au relâcher, ou au plus tard 90 ms après l’appui si le doigt reste posé : il n’attend plus qu’on lève le doigt. Un glissé de plus de 10 px sur le côté (ou vers le bas) avant ce délai annule le pas en avant : il donne un pas de côté (ou en arrière) dès 20 px, jamais un pas en avant par erreur. Les quatre flèches ne reviennent pas ; Bond reste un bouton.
- Bubble : le niveau 10 « Prisme » redevient gagnable (motif apparié) ; un test vérifie désormais que chaque niveau est gagnable.
- Menu ☰ de l’accueil : nouvelle entrée « Donner mon avis ». Un simple lien ouvre, dans un nouvel onglet (`rel="noopener"`), les formulaires publics du dépôt. Le jeu n’envoie rien et n’embarque aucun traceur.
- Deux formulaires courts en français (« Quelque chose ne marche pas », « J'ai une idée ») remplacent les anciens, plus techniques ; le ticket vierge est désactivé. `CONTRIBUTING.md` explique comment signaler.
- Petits Pompiers : scène jouable, commandes tactiles, mascottes en tenue, sons synthétisés, vignette et preuves de scène.
- Le jeu de kart Dérapage s’appelle désormais « Pistouille ». Seul le nom affiché change : l’adresse `#/derapage`, les records et la progression sont conservés.

## [0.5.1] — 2026-11-04

- Accueil : chaque vignette du catalogue montre le jeu tel qu’il est aujourd’hui — mêmes décors, mêmes sprites, même palette et le personnage choisi — au lieu des anciennes formes simples. Les vignettes appellent le code de dessin de leur jeu (décors, véhicules, perles, briques, labyrinthes…) ; les calques fixes sont cuits une fois en image, si bien qu’une image de vignette ne coûte que quelques copies d’image.
- Vignette du Collier du Singe : tout le chapiteau et une chaîne de 9 à 13 perles qui avance, tirée à un rythme lisible. Vignette de Dédale : le premier labyrinthe.
- Contrôle `check-thumbnail-art` dans `test:node` : une vignette qui n’utilise aucune ressource de dessin de son jeu, ou qui recopie ses couleurs, fait échouer les tests.
- Le Collier du Singe : quand il reste moins de trois perles sur le collier alors que la partie continue, la chaîne prend de l’élan, en douceur, pour amener vite les perles suivantes. Elle ralentit de même dès qu’il y en a cinq. Un souffle sonore, des traînées et l’aide « Élan ! » le signalent. L’élan ne pousse jamais les dernières perles vers le trou : les 30 niveaux restent gagnables.

## [0.5.0] — 2026-11-04

- Menu ☰ de l’accueil : nouvelle entrée « Mes autres jeux ». Elle déplie les trois autres jeux de l’auteur (Opencadkid, TicTac, Petit Astronome), chacun avec son icône et une phrase. Un toucher ouvre le jeu dans le même onglet.
- La liste et ses icônes sont livrées avec l’arcade : elles s’affichent aussi hors ligne, sans aucune requête réseau.

## [0.4.0] — 2026-11-03

First stable release of the 0.4 series: everything from the three preview builds (Marmaille, Bombercade, Les Artificiers, Gourmandises, Pépites, Dérapage on phones, new art across the arcade), plus the changes below.

- Marmaille : la troupe avance deux fois moins vite (un pas toutes les 250 ms) ; le bouton « » » (touche V) double toujours la vitesse. Les temps limites sont doublés, si bien que chaque niveau garde exactement le même nombre de pas et reste gagnable avec les mêmes solutions.
- Contrôles Node des scènes alignés sur le décor cuit en texture et les pièces en images réutilisées ; Serpentin vérifie que le décor est cuit une fois par niveau.
- Bubble : le niveau 9 « Cristal » redevient faisable — même losange et mêmes réglages, mais des couleurs voisines qui se répondent ; le solveur le gagne sur 20 graines sur 20, et aucun des trente niveaux ne descend sous 13 sur 20.
- Bubble : murs et linteau de pierre, terrasse et bandeau de jeu cuits avec le décor du monde ; le bandeau ne passe plus sous le lanceur.
- Traverse : les repères de rochers comptent les rochers peints dans le décor cuit.
- Intégration continue : les contrôles ne dépendent plus de l’historique de travail, et les tests de bout en bout sont répartis en quatre lots parallèles.
- Bombercade : nouvel habillage d’après les planches — arènes en relief (jungle, château à torches, volcan fendu de lave, damier sucré et bonbons), bombes et flammes propres à chaque personnage, bonus en icônes, bandeau de jeu dessiné, bouton bombe rond, vignette assortie ; débris seulement sur une vraie casse.
- Passe 121 : reçus tactiles séparés de `read()` via `fingerReceipts()` dans les 18 scènes ; empreintes des parties limitées aux entrées et à l’état final. Sonde CDP des quatre bords des commandes et contrôles Node du contrat des scènes et des cibles cliquables ; joystick partagé déclaré bouton avec écouteur click. Les durées Gourmandises et Bombercade restent indicatives sur CPU partagé.

- Aide doigt : preuves de réception déclarées par les scènes de quatorze jeux, sans branche par jeu dans l’aide ; reçus par événement et sortie de pause conservés.

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

[Unreleased]: https://github.com/Davy45270/Opencade/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.4.0
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
