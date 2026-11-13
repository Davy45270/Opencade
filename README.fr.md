<h1 align="center"><a href="https://davy45270.github.io/Opencade/">▶ Play / Jouer</a></h1>

Petits Pompiers : cinq mascottes pompiers, secours, commandes tactiles et modes détente ou défi.

<p align="center"><a href="https://davy45270.github.io/Opencade/"><img src="docs/screenshots/home-desktop.webp" alt="Accueil d’Opencade sur ordinateur : cartes de jeux avec aperçus animés" width="100%"></a></p>

[English](README.md) | Français

Alunir propose 30 situations écrites et 12 mécaniques, du cargo aux grottes et aux quais mobiles, vérifiées par 180 vols déterministes (passe 106).

Ferraille propose 30 parcours écrits et 16 modules physiques, avec mesure de répétition ordonnée et 900 rejeux gagnants pour les cinq personnages (passe 103).

La passe 101 enrichit Essaim de cinq signatures mécaniquement distinctes, de grands vaisseaux procéduraux, de sept silhouettes ennemies et de trois décors spatiaux, avec rejeux historiques préservés.

La passe 84 ajoute les spéciaux des compagnons à Ferraille, Briqueterie et Essaim, avec contrôles aux deux pouces et tir automatique mémorisé dans Essaim.

Passe 82 : le compagnon choisi explore Dédale, pilote Orbite et guide Empilo, avec Lueur, Rafale et Mise de côté, vérifiés par rejeux Node déterministes.

La spécification détaillée des jeux, [GAME_SPEC.md](GAME_SPEC.md), est en français.

# Opencade

Le compagnon choisi joue dans Caisses, Traverse, Alunir, Pistouille, Bubble Lab et Serpentin, avec dessins procéduraux partagés, réactions et spéciaux tactiques de même puissance.

Ferraille propose 30 étapes avec six comportements ennemis, flammes/ricochets/grenades, wagonnet, otages et gardiens à faiblesse, dont un réacteur en trois phases.

[![CI](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml)
[![Pages](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Des jeux originaux réunis dans une arcade pour navigateur. Opencade se joue
sur téléphone et ordinateur, au toucher, à la souris et au clavier, sans compte
ni serveur applicatif. Le projet utilise TypeScript strict, Phaser 4 et Vite.
**L’interface est en français.**

**[Jouer à la démo](https://davy45270.github.io/Opencade/)**

Chaque carte de l’accueil présente une vignette Canvas animée par les moteurs purs des jeux.
Elles se suspendent hors écran, en arrière-plan et pendant une partie. La
réduction des animations les remplace par des images fixes. Sur téléphone,
la grille comporte deux colonnes.

## Captures d’écran

Captures en portrait sur téléphone, prises en cours de partie (`node scripts/screenshots.js` les régénère après `npm run build`).

<table>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-bubble.webp" alt="Bubble Lab" width="240"><br><b>Bubble Lab</b><br>Éclater des groupes de trois bulles avant que le plafond ne descende.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-serpentin.webp" alt="Serpentin" width="240"><br><b>Serpentin</b><br>Allonger une traînée lumineuse en récoltant étincelles et cristaux.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-briqueterie.webp" alt="Briqueterie" width="240"><br><b>Briqueterie</b><br>Casser 30 murs dessinés, avec portails, clés et multibille.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-empilo.webp" alt="Empilo" width="240"><br><b>Empilo</b><br>Caser des pièces de cristal dans le puits et compléter les lignes.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-orbite.webp" alt="Orbite" width="240"><br><b>Orbite</b><br>Repousser trente formations et six gardiens depuis l’orbite.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-essaim.webp" alt="Essaim" width="240"><br><b>Essaim</b><br>Traverser des étapes tactiques avec six armes et des vaisseaux à sauver.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-dedale.webp" alt="Dédale" width="240"><br><b>Dédale</b><br>Ramasser les graines du labyrinthe, puis chasser les feux follets.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-ferraille.webp" alt="Ferraille" width="240"><br><b>Ferraille</b><br>Courir, sauter et tirer à travers les ateliers et leurs gardiens.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-alunir.webp" alt="Alunir" width="240"><br><b>Alunir</b><br>Poser le module en douceur malgré les rafales et le peu de carburant.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-caisses.webp" alt="Caisses" width="240"><br><b>Caisses</b><br>Pousser les caisses sur leurs cibles, avec annulation illimitée.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-traverse.webp" alt="Traverse" width="240"><br><b>Traverse</b><br>Rejoindre les abris à travers la circulation, les troncs et les flotteurs.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-derapage.webp" alt="Pistouille" width="240"><br><b>Pistouille</b><br>Faire déraper un kart sur 30 circuits et viser le podium.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-pepites.webp" alt="Pépites" width="240"><br><b>Pépites</b><br>Creuser la mine, esquiver les rochers qui tombent et ramasser chaque pépite.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-gourmandises.webp" alt="Gourmandises" width="240"><br><b>Gourmandises</b><br>Échanger les friandises pour en aligner trois, sur 240 niveaux et douze mondes.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-collier.webp" alt="Le Collier du Singe" width="240"><br><b>Le Collier du Singe</b><br>Tirer des perles dans le collier avant qu’il n’atteigne le panier.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-bombercade.webp" alt="Bombercade" width="240"><br><b>Bombercade</b><br>Poser des bombes, faire sauter les caisses et survivre aux rivaux dans quatre arènes.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-marmaille.webp" alt="Marmaille" width="240"><br><b>Marmaille</b><br>Distribuer des rôles à une troupe d’enfants et la mener saine et sauve à la sortie.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-artificiers.webp" alt="Les Artificiers" width="240"><br><b>Les Artificiers</b><br>Artillerie au tour par tour sur un terrain destructible, avec vent et grappin.</td>
</tr>
</table>

## Jeux et contrôles

Bubble Lab propose un accrochage hexagonal précis, des tirs dans les trous, des bonus de chute et la visée par glisser-relâcher ; ⇄ ou X échange la prochaine bulle.

Bubble Lab propose désormais 30 niveaux sculptés avec pierres, bombes, tirs arc-en-ciel, glace, étoiles à libérer et butoirs internes. Le tableau
indique les commandes clavier et tactiles de chaque jeu, ainsi que les commandes
souris disponibles. Les boutons à l’écran sont également cliquables. P ou Échap
met les jeux en temps réel en pause. Chaque jeu possède son aide ; sur téléphone,
le menu ☰ ouvre le statut, l’aide, les niveaux et le redémarrage en mettant la
partie en pause.

| Jeu | Principe | Contrôles |
|---|---|---|
| **Le Collier du Singe** | 30 niveaux de perles en chaîne, reculs aimantés et combos. | Viser partout puis relâcher ; tap tireur ou ⇄/X : échanger ; flèches/Espace : viser/tirer ; P/Échap : pause. |
| **Bombercade** | Trente labyrinthes de bombes en solo, blocs cassables, quatre arènes et compagnon choisi. | Flèches / ZQSD : marcher ; Espace : bombe ; X : pouvoir ; pavé tactile et boutons. |
| **Bubble Lab** | Former des groupes d’au moins trois bulles de même couleur avant que le plafond ne descende. | Souris : viser et tirer ; doigt : glisser puis relâcher ; flèches : viser ; Espace : tirer ; boutons tactiles : ajuster et tirer. |
| **Serpentin** | Allonger une traînée lumineuse en récoltant étincelles et cristaux, entre murs ou sur un tore. | Flèches, ZQSD ou WASD ; toucher : glisser ou croix directionnelle. |
| **Briqueterie** | 30 murs dessinés : coulisses, explosions, repousse, portails, chicanes, angles, clés, multi-balle, gravité inversée et suspensions. | Souris : guider ; Gauche/Droite ou A/D : déplacer ; Espace : lancer ; toucher : glisser en bas, tap ou bouton Lancer. |
| **Empilo** | Placer des pièces de cristal dans un puits de 9 × 16 et compléter des lignes, dont certaines sont scellées. | Gauche/Droite/Bas : déplacer ; X/W/Haut et Z/C : tourner ; Espace : chute ; toucher : glisser, tap pour tourner, glisser vite vers le bas pour lâcher. |
| **Orbite** | Trente formations : rotors, sondes scindées, astéroïdes, gravité, furtives, réparateurs, satellite et essaim coordonné ; six gardiens et un final en deux phases. | Souris : guider ; Gauche/Droite ou A/D : déplacer ; Espace : tirer ; toucher : glisser en bas et maintenir Tir, ou activer Tir auto. |
| **Essaim** | Trente niveaux de formations tactiques, six armes ramassables, sauvetages et six boss. | Souris : guider et tirer ; Gauche/Droite ou A/D : déplacer ; Espace ou Tir : maintenir, relâcher pour la charge ; toucher : glisser en bas. |
| **Dédale** | Récolter les graines d’un labyrinthe en échappant à quatre follets, puis les rendre vulnérables avec un soleil. | Flèches ou ZQSD ; toucher : glisser ou croix directionnelle. |
| **Ferraille** | Traverser des ateliers en courant, sautant et tirant, avec un gardien à phases tous les cinq niveaux. | Gauche/Droite ou A/D : courir ; Haut/W et Bas/S : viser ou s’accroupir ; Espace/Z : saut ; X/J : tir ; toucher : joystick, Saut et Tir maintenus. |
| **Alunir** | Poser doucement un module lunaire en dosant rotation, poussée et carburant, entre relief et rafales. | Haut/W : poussée ; Gauche/Droite ou A/D : rotation ; toucher : maintenir les boutons de rotation et Poussée. |
| **Caisses** | Pousser une à six caisses sur leurs cibles, avec annulation illimitée et records prouvés par solveur. | Flèches ou Q/S/D et Maj+Z : déplacer ; Z/Retour arrière : annuler ; R : recommencer ; toucher : glisser ou croix, bouton Annuler. |
| **Dévisso** | Démonter trente assemblages tenus par des vis : une vis libre file dans la boîte de sa couleur ou dans une réserve de cinq places, une plaque vide tombe ; cadenas, caisses, chaînes, arc-en-ciel, or, TNT, engrenages, téléporteurs et glace. | Toucher une vis libre ; bonus sous le plateau (annuler, indice, marteau, explosion, perçage) ; Entrée : vis proposée ; 1 à 5 : bonus ; Z : annuler ; H : indice ; R : recommencer. |
| **Traverse** | Rejoindre les abris entre trafic routier, rondins mobiles et flotteurs plongeants. | Flèches ou ZQSD : un pas ; clic souris ou tap : monter ; glisser ou croix : un pas. |
| **Pistouille** (anciennement Dérapage) | Piloter un kart, charger les dérapages et viser le podium en sept coupes originales. | Flèches : direction absolue et diagonales ; Espace/Maj : dérapage ; X/Ctrl : bonus ; toucher : poser le joystick 360° partout sur la vue de piste (zone morte 10 px), pointer où aller, relâcher pour garder le cap ; Dérapage 88 px et Bonus 56 px ; caméra tournante et braquage relatif disponibles dans ☰. |
| **Sudoku** | Placer chaque chiffre une fois par ligne, colonne et bloc : 30 grilles classiques 9 × 9, des plus riches en données jusqu'aux croix, puis une grille du jour et une série infinie. | Toucher une case puis un chiffre du pavé ; crayon : notes ; ↶ : annuler ; ampoule : indice expliqué ; flèches, 1–9, Maj+chiffre : note, N, Suppr/0, Ctrl+Z, H. |
| **Fusio** | Faire glisser des tuiles numérotées pour fusionner les égales : une partie classique 4 × 4 vers 2048 qu’on peut poursuivre après la victoire, puis 30 défis à graine fixe (plateaux 5 × 5 et 6 × 6, pierres, limites de coups, départs écrits) dont la difficulté est mesurée par un agent expectimax. | Glisser, ou les quatre boutons fléchés ; annuler ; ampoule : indice expliqué ; flèches ou WASD, U/Retour arrière/Ctrl+Z, H, R. |
| **Démineur** | Ouvrir toutes les cases sûres d’un champ de mines : 130 grilles du 6 × 6 au 16 × 24, chacune prouvée sans devinette (certaines mines dessinent une image), puis Débutant, Intermédiaire, Expert et un défi du jour. | Toucher : creuser ou poser un drapeau selon la bascule Creuser/Drapeau ; appui long : l’autre outil ; toucher un chiffre complet : ouvrir ses voisines ; glisser : déplacer une grande grille ; loupe : vue d’ensemble ; ampoule : indice expliqué ; flèches, Espace/Entrée, F, clic droit, T, H, Z, R. |
| **Bus en folie** | Vider une cour de bus encombrée : faire glisser chaque bus sur sa voie jusqu’à une sortie, dans l’ordre de la file de passagers ; 30 cours du 6 × 6 au 8 × 8 avec voitures garées, plots, cars, sorties de couleur et sens uniques, chacune résolue par le solveur et dotée d’un vrai piège. | Glisser un bus le long de sa voie (au-delà du bord : il part) ; ou toucher un bus puis une case libre de sa voie ; annuler, ampoule : indice expliqué, recommencer ; Tab/N, flèches, Z, H, R, Échap. |

Pistouille propose 30 tracés dessinés à la main, des thèmes par coupe, un damier sur toute la largeur et une preuve de diversité géométrique.

Pistouille affiche les chronos de course et de tour en temps de simulation, le meilleur tour, les écarts colorés et les records par circuit conservés après rechargement. Le HUD mobile reste au-dessus de la piste ; le résultat récapitule temps et classement. Z28/Z29 couvrent le rejeu et la persistance tolérante aux erreurs.

Les noms, règles, niveaux, graphismes et sons sont originaux. Les graphismes et
sons synthétisés sont produits par le code, sans ressource de jeu externe,
police ni fichier audio. Les icônes PWA originales sont également produites par
code. Meilleurs scores, niveaux débloqués et préférences utilisent `localStorage`
quand il est disponible ; le jeu fonctionne sans. Les clés historiques
`arcade-lab:*` et `bubble-lab:*` préservent les progrès existants.

## Installer sur téléphone et jouer hors ligne

<img src="docs/screenshots/home-phone.webp" alt="Accueil d’Opencade sur téléphone" width="240" align="right">

Ouvrir [la démo](https://davy45270.github.io/Opencade/) avec une connexion et
attendre le chargement complet de l’accueil pour mettre tous les jeux en cache.

- **Android / Chrome :** ouvrir le menu ⋮ et choisir « Installer l’application » ou « Ajouter à l’écran d’accueil ».
- **iOS / Safari :** ouvrir Partager, choisir « Sur l’écran d’accueil » et confirmer.

Relancer Opencade depuis la nouvelle icône. Les intitulés varient selon la
version du navigateur. Une fois le cache initial prêt, l’accueil et tous les
jeux fonctionnent hors ligne. Scores, niveaux débloqués et préférences restent
dans le stockage local du navigateur ou de l’application installée. Effacer ce
stockage supprime les progrès et peut imposer un nouveau chargement en ligne.

Les mises à jour sont annoncées sans interrompre la partie. Fermer toutes les
fenêtres Opencade puis relancer pour appliquer une mise à jour disponible. Le
service worker attend le prochain lancement sans forcer son activation pendant
le jeu. Tous les fichiers HTML, JavaScript, CSS et icônes du build sont
précachés, Phaser compris ; aucune police distante, aucun serveur tiers ni cache
de données externes n’est utilisé.

## Confort sur téléphone

Quand le navigateur le permet, l’écran reste allumé pendant le jeu actif et est
libéré en pause, en arrière-plan ou à la fin du niveau. Des vibrations signalent
perte de vie, victoire et défaite si le son global est activé. Le menu mobile
propose le plein écran et tente l’orientation portrait. Ces fonctions facultatives
restent silencieuses si elles sont indisponibles ou refusées. Voir la section
Appareil de [GAME_SPEC.md](GAME_SPEC.md).

## Développement

Utiliser **Node 26** (voir `.nvmrc`), la version de la CI.

```sh
npm ci
npm run dev        # serveur de développement
npm run lint       # oxlint avec règles typées, aucun avertissement toléré
npm run typecheck  # vérification TypeScript sans émission
npm test           # tests Vitest des moteurs et du socle
npm run build      # site statique dans dist/
npx playwright install --with-deps chromium
npm run test:e2e   # Playwright sur le build de production
node scripts/check-pwa-mutations.js # assertions PWA + huit mutations, sans navigateur ni Vitest
npm run preview    # aperçu de dist/ par HTTP
```

Le build est un site statique autonome. Les chemins relatifs (`base: './'`)
permettent de le servir à la racine ou dans un sous-répertoire comme `/Opencade/`.
Utiliser HTTP, sans ouvrir directement les fichiers. Le manifeste et le service
worker utilisent aussi des chemins relatifs. Les trois icônes livrées (192, 512
et 512 maskable) ont un fond opaque et un motif central dans la zone de sûreté
maskable ; le build ne nécessite aucun outil graphique.

Vitest vérifie les règles sur des grilles et graines fixées, selon les
identifiants de [GAME_SPEC.md](GAME_SPEC.md). Playwright couvre Chromium bureau
et mobile tactile, utilise de vraies entrées et échoue à la moindre erreur de
page ou de console. Le paramètre d’URL de test `?test=1` expose
`window.__ARCADE_TEST__` et les crochets propres aux jeux : état, niveaux,
scénarios et `advance(ms)`. Avancer le temps du moteur rend les assertions de jeu
indépendantes de la vitesse de rendu. Sans ce paramètre, les crochets sont
absents. Ils restent volontairement dans le build publié pour tester le produit
livré ; modifier l’état d’une partie locale n’est pas une frontière de sécurité.

GitHub Actions exécute lint, typecheck, tests unitaires, build et E2E sur les push
et pull requests, et joint le rapport Playwright en cas d’échec.

## Architecture

```text
src/
  engines/<jeu>/    règles, collisions, niveaux et score purs
  engines/shared/   générateur pseudo-aléatoire à graine
  games/<jeu>/      scène Phaser, animation, entrées et sons synthétisés
  games/registry.ts liste des jeux, aides et contrôles déclarés
  shell/            entrées, pause, menus, niveaux, son et stockage partagés
tests/              tests unitaires des moteurs et du socle
tests/e2e/          parcours navigateur bureau et mobile
```

Les moteurs sont du TypeScript pur, sans Phaser ni DOM. oxlint y interdit les
globales du navigateur et `Math.random`. Un générateur pseudo-aléatoire à graine
reproduit exactement la même partie pour les mêmes entrées et la même graine.
Les scènes Phaser dessinent l’état du moteur et lui transmettent les entrées.
Le socle recrée Phaser lors des changements de jeu et libère les écouteurs à la
fermeture. Pour ajouter un jeu, créer un moteur et une scène originaux, puis les
déclarer dans `src/games/registry.ts`.

## Limites connues

- Pas de classement en ligne ni de sauvegarde de partie en cours.
- Le canevas n’offre pas une représentation complète aux lecteurs d’écran ; score, statut et boutons sont en HTML.
- Les tests navigateur automatiques couvrent uniquement Chromium.
- Vite signale la taille du paquet Phaser ; cet avertissement est attendu.

## Crédits

Code écrit par Codex (OpenAI), relu et vérifié par Claude (Anthropic), sous la
direction de David Sevin.

## Contribuer

Les signalements et pull requests sont les bienvenus en anglais ou en français.
Consulter [CONTRIBUTING.md](CONTRIBUTING.md), le [code de conduite](CODE_OF_CONDUCT.md)
et la [politique de sécurité](SECURITY.md) avant de contribuer.

## Licence

[MIT](LICENSE) © 2026 David Sevin. Phaser est également distribué sous licence MIT.

Pistouille ajoute les portes de slalom avec pénalités, la neige et la gravité en descente, les virages relevés et sauts BMX et les rails urbains continus.

Validation Essaim (armes, diversité, 60 victoires et mutations) : `nice -n 19 ionice -c3 node scripts/validate-essaim.js`. Les captures E2E sont réservées à l’hôte de test.

Dédale, passe 57 : clés/portes colorées, sens uniques, portails, interrupteurs, murs cycliques, glace et ombres dans cinq formes à graine. Trente solutions enregistrées et six mutations sont vérifiées par `nice -n 19 ionice -c3 node scripts/validate-dedale.js`. Répétitivité : 100 → 22,4, clones adjacents : 0 %. Voir [les trente niveaux](GAME_SPEC.md#dédale).

Briqueterie (passe 61) : campagnes enregistrées gagnantes sur les graines 455 et 28 ; validation sans navigateur avec `nice -n 19 ionice -c3 node scripts/validate-briqueterie.js`. Détails des trente formes dans `GAME_SPEC.md`, mesures dans `docs/diversity.md`.

Orbite (passe 64) : régénérer/vérifier les 60 victoires par commandes normales avec
`nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-orbite.js`
(`--record` pour régénérer). Chaque test rejoue un enregistrement court ; les campagnes longues restent dans Node.

Pistouille (passe 67) propose par défaut un joystick au nord fixe avec cap visible, aide légère désactivable, rails sans collage et premier circuit large ; les records migrent par nom de circuit.

Le compagnon choisi sur l'accueil joue désormais dans Caisses, Traverse et Alunir, avec un spécial tactique et des animations dessinées par le code.

### Personnages

| Identifiant | Nom et sous-titre | Devise |
| --- | --- | --- |
| `panda` | **Boubou** — Panda glouton | « Manger, foncer, recommencer ! » |
| `pandaroux` | **CaliRoux** — Panda roux joueur et câlin | « Des câlins et des dérapages ! » |
| `dragon` | **Pestouille** — Dragon assidu | « Toujours plus loin, toujours plus fort ! » |
| `singe` | **Tutu** — Singe en tutu | « Des pirouettes plein la piste ! » |
| `licorne` | **Lumi** — Licorne joueuse | « La magie au service de la victoire ! » |

Le choix du personnage affiche son nom, son sous-titre et sa devise.

**Le Collier du Singe** (`collier`) : 30 niveaux de perles en chaîne ; viser partout et relâcher pour tirer, tap sur le tireur ou ⇄/X pour échanger. Validation Node : `npm run test:node -- --only=validate-collier.js`.

Gourmandises ajoute 240 niveaux à graine, deux modes, des spéciaux, des objets dorés, de la glace double, du chocolat qui s’étend, des fleurs prisonnières, des tapis bouclés, des portails arc-en-ciel entre deux plateaux, des fraises à descendre des îles suspendues et des bombes rayées d’atelier ; équilibre sur cinq graines, états inchangés des niveaux 1–180 et 87 mutations en mémoire.

**Les Artificiers** (`artificiers`) : trente duels au tour par tour, cibles
d’entraînement et missions de survie ou de démolition, dans un archipel vert,
des falaises automnales et une cuvette volcanique. Glisser depuis le compagnon
actif, relâcher pour tirer. Marche courte, saut, grappin, six armes à munitions
limitées, vent visible et eau montante ; solo contre trois degrés d’IA ou deux
joueurs sur le même téléphone. Node rejoue trente victoires enregistrées et
les victoires tactiles bruitées des niveaux 1 et 10. Dessins et sons en code.

**Dévisso** (`devisso`) : trente assemblages dessinés à la main (voiture, fusée,
hibou, château, bonhomme de neige…) sur trois couches de plaques au plus, en six
thèmes. Une vis ne sort que si aucune plaque du dessus ne la recouvre ; elle file
dans la boîte ouverte de sa couleur, sinon dans la réserve (cinq places, une
sixième ouverte par une vis dorée). « Aucun coup possible ! » quand plus rien ne
rentre : un cœur reprend les trois derniers coups. Chaque mécanique arrive seule,
puis se combine. Chaque niveau est gagné par le solveur sans bonus ; sa ligne
enregistrée et une vraie impasse sont rejouées par le moteur :
`npm run test:node -- --only=validate-devisso.js`. Dessins et sons en code.

**Sudoku** (`sudoku`) : 30 grilles originales en 9 × 9 classique, des grilles riches en données (place unique seule) aux croix, chaque technique introduite seule, chacune prouvée unique par le solveur et résolue par les seuls indices expliqués ; la difficulté est mesurée par la technique la plus dure nécessaire et n'est jamais plus faible que trois niveaux avant. Les grilles du jour et infinies sont générées depuis une graine et gardées seulement si leur unicité est prouvée. Notes, annulation illimitée, conflits hachurés avec un badge « ! », et un compagnon qui explique la déduction suivante. Le chrono est affiché mais ne compte pas ; les étoiles dépendent des erreurs et des indices. Validation Node : `npm run test:node -- --only=validate-sudoku.js`.

**Fusio** (`fusio`) : moteur pur d’après le dossier de spécifications reçu pour un jeu de fusion de tuiles (une seule fusion par tuile et par coup, apparition 2/4 à 90/10 par le générateur seedé partagé et seulement si le plateau change, événements, une action refusée ne modifie rien, l’annulation restaure aussi le générateur et peut être désactivée par défi). La partie classique 4 × 4 vise 2048 et peut continuer après la victoire. Trente défis écrits font varier une règle à la fois (taille, poids d’apparition, pierres, limite de coups, départ écrit) ; leur difficulté est la part de parties perdues par un agent expectimax bruité sur 120 parties, figée et remesurée en CI, jamais présentée comme gagnable à coup sûr. L’indice donne le coup de l’agent et l’explique en une phrase. Les tuiles se distinguent par la couleur et par un emblème ; « réduire les animations » les supprime. Validation Node : `npm run test:node -- --only=validate-fusio.js`.

**Démineur** (`demineur`) : moteur pur d’après le dossier de spécifications reçu (huit voisines, cascade en largeur, drapeaux, « ? » optionnel, accord, une action refusée ne modifie rien, la première case est toujours sûre grâce au placement différé et seedé). Cent trente grilles de progression du 6 × 6 au 16 × 24 (onglets de dix dans la liste des niveaux), en six thèmes, partent d’une ouverture et sont prouvées sans devinette par un solveur de frontière (un chiffre, deux chiffres comparés, énumération bornée, compte global ; « inconnu » sur limite, jamais d’affirmation fausse) ; quarante cachent un dessin fait de mines, montré à la victoire. Les modes classiques Débutant 9 × 9, Intermédiaire 16 × 16 et Expert 30 × 16 peuvent demander de deviner et le disent ; le défi du jour est prouvé comme la progression. L’indice donne une déduction certaine et l’explique, ou dit honnêtement qu’il n’y en a pas. Sur téléphone, l’Expert est affiché pivoté (16 × 30) et zoomé à 38 px par case, avec glisser et loupe de vue d’ensemble. Validation Node : `npm run test:node -- --only=validate-demineur.js`.

**Bus en folie** (`busfolie`) : moteur pur d’après le dossier de spécifications reçu (bus de deux ou trois cases qui ne glissent que sur leur axe, voitures grises garées, plots fixes, sorties de bord neutres ou de couleur, file de passagers figée et visible qui monte toute seule selon la couleur et les places, bus à sens unique ; une action refusée ne modifie rien). Trente cours figées du 6 × 6 au 8 × 8, cherchées hors ligne par un générateur seedé et une recherche locale sur une difficulté mesurée, amènent une mécanique à la fois jusqu’au niveau 19 ; de 20 à 30, aucune mécanique nouvelle, la progression se fait par montée en charge (plus de voitures, de bus, une cour plus pleine). Un solveur en largeur prouve chaque cour (résolue, impossible, ou inconnu sur limite, jamais d’affirmation fausse), donne son par et un piège sur la ligne la plus courte, dès le niveau 1. Après un coup irréversible, le jeu prouve s’il reste une suite gagnante et n’affiche « Bloqué ! » que sur preuve. L’indice donne le prochain coup d’une ligne la plus courte et l’explique. Validation Node : `npm run test:node -- --only=validate-busfolie.js`.
