[English](README.md) | Français

La spécification détaillée des jeux, [GAME_SPEC.md](GAME_SPEC.md), est en français.

# Opencade

Cinq compagnons récurrents originaux disposent désormais d’un choix mémorisé sur l’accueil et de dessins vectoriels procéduraux partagés ; leur intégration aux jeux viendra ensuite.

Ferraille propose 30 étapes avec six comportements ennemis, flammes/ricochets/grenades, wagonnet, otages et gardiens à faiblesse, dont un réacteur en trois phases.

[![CI](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml)
[![Pages](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Douze jeux originaux réunis dans une arcade pour navigateur. Opencade se joue
sur téléphone et ordinateur, au toucher, à la souris et au clavier, sans compte
ni serveur applicatif. Le projet utilise TypeScript strict, Phaser 3 et Vite.
**L’interface est en français.**

**[Jouer à la démo](https://davy45270.github.io/Opencade/)**

L’accueil présente douze vignettes Canvas animées par les moteurs purs des jeux.
Elles se suspendent hors écran, en arrière-plan et pendant une partie. La
réduction des animations les remplace par des images fixes. Sur téléphone,
la grille comporte deux colonnes.

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
| **Bubble Lab** | Former des groupes d’au moins trois bulles de même couleur avant que le plafond ne descende. | Souris : viser et tirer ; doigt : glisser puis relâcher ; flèches : viser ; Espace : tirer ; boutons tactiles : ajuster et tirer. |
| **Serpentin** | Allonger une traînée lumineuse en récoltant étincelles et cristaux, entre murs ou sur un tore. | Flèches, ZQSD ou WASD ; toucher : glisser ou croix directionnelle. |
| **Briqueterie** | 30 murs dessinés : coulisses, explosions, repousse, portails, chicanes, angles, clés, multi-balle, gravité inversée et suspensions. | Souris : guider ; Gauche/Droite ou A/D : déplacer ; Espace : lancer ; toucher : glisser en bas, tap ou bouton Lancer. |
| **Empilo** | Placer des pièces de cristal dans un puits de 9 × 16 et compléter des lignes, dont certaines sont scellées. | Gauche/Droite/Bas : déplacer ; X/W/Haut et Z/C : tourner ; Espace : chute ; toucher : glisser, tap pour tourner, glisser vite vers le bas pour lâcher. |
| **Orbite** | Défendre quatre boucliers érodables contre une flotte de sondes qui accélère. | Souris : guider ; Gauche/Droite ou A/D : déplacer ; Espace : tirer ; toucher : glisser en bas et maintenir Tir, ou activer Tir auto. |
| **Essaim** | Trente niveaux de formations tactiques, six armes ramassables, sauvetages et six boss. | Souris : guider et tirer ; Gauche/Droite ou A/D : déplacer ; Espace ou Tir : maintenir, relâcher pour la charge ; toucher : glisser en bas. |
| **Dédale** | Récolter les graines d’un labyrinthe en échappant à quatre follets, puis les rendre vulnérables avec un soleil. | Flèches ou ZQSD ; toucher : glisser ou croix directionnelle. |
| **Ferraille** | Traverser des ateliers en courant, sautant et tirant, avec un gardien à phases tous les cinq niveaux. | Gauche/Droite ou A/D : courir ; Haut/W et Bas/S : viser ou s’accroupir ; Espace/Z : saut ; X/J : tir ; toucher : joystick, Saut et Tir maintenus. |
| **Alunir** | Poser doucement un module lunaire en dosant rotation, poussée et carburant, entre relief et rafales. | Haut/W : poussée ; Gauche/Droite ou A/D : rotation ; toucher : maintenir les boutons de rotation et Poussée. |
| **Caisses** | Pousser une à six caisses sur leurs cibles, avec annulation illimitée et records prouvés par solveur. | Flèches ou Q/S/D et Maj+Z : déplacer ; Z/Retour arrière : annuler ; R : recommencer ; toucher : glisser ou croix, bouton Annuler. |
| **Traverse** | Rejoindre les abris entre trafic routier, rondins mobiles et flotteurs plongeants. | Flèches ou ZQSD : un pas ; clic souris ou tap : monter ; glisser ou croix : un pas. |
| **Dérapage** | Piloter un kart, charger les dérapages et viser le podium en sept coupes originales. | Gauche/Droite : braquer ; Espace/Maj : dérapage ; X/Ctrl : bonus ; toucher : glisser dans la moitié gauche pour braquer (zone morte 6 px, maximum à 60 px), relâcher pour centrer ; maintenir Dérapage (88 px), toucher Bonus (56 px) au-dessus ; inclinaison et souris en option. |

Dérapage propose 30 tracés dessinés à la main, des thèmes par coupe, un damier sur toute la largeur et une preuve de diversité géométrique.

Dérapage affiche les chronos de course et de tour en temps de simulation, le meilleur tour, les écarts colorés et les records par circuit conservés après rechargement. Le HUD mobile reste au-dessus de la piste ; le résultat récapitule temps et classement. Z28/Z29 couvrent le rejeu et la persistance tolérante aux erreurs.

Les noms, règles, niveaux, graphismes et sons sont originaux. Les graphismes et
sons synthétisés sont produits par le code, sans ressource de jeu externe,
police ni fichier audio. Les icônes PWA originales sont également produites par
code. Meilleurs scores, niveaux débloqués et préférences utilisent `localStorage`
quand il est disponible ; le jeu fonctionne sans. Les clés historiques
`arcade-lab:*` et `bubble-lab:*` préservent les progrès existants.

## Installer sur téléphone et jouer hors ligne

Ouvrir [la démo](https://davy45270.github.io/Opencade/) avec une connexion et
attendre le chargement complet de l’accueil pour mettre les douze jeux en cache.

- **Android / Chrome :** ouvrir le menu ⋮ et choisir « Installer l’application » ou « Ajouter à l’écran d’accueil ».
- **iOS / Safari :** ouvrir Partager, choisir « Sur l’écran d’accueil » et confirmer.

Relancer Opencade depuis la nouvelle icône. Les intitulés varient selon la
version du navigateur. Une fois le cache initial prêt, l’accueil et les douze
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

Utiliser **Node 22.12 ou plus** (voir `.nvmrc`).

```sh
npm ci
npm run dev        # serveur de développement
npm run lint       # ESLint, aucun avertissement toléré
npm run typecheck  # vérification TypeScript sans émission
npm test           # tests Vitest des moteurs et du socle
npm run build      # site statique dans dist/
npx playwright install --with-deps chromium
npm run test:e2e   # Playwright sur le build de production
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

Les moteurs sont du TypeScript pur, sans Phaser ni DOM. ESLint y interdit les
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

Dérapage ajoute les portes de slalom avec pénalités, la neige et la gravité en descente, les virages relevés et sauts BMX et les rails urbains continus.

Validation Essaim (armes, diversité, 60 victoires et mutations) : `nice -n 19 ionice -c3 node scripts/validate-essaim.js`. Les captures E2E sont réservées à l’hôte de test.

Dédale, passe 57 : clés/portes colorées, sens uniques, portails, interrupteurs, murs cycliques, glace et ombres dans cinq formes à graine. Trente solutions enregistrées et six mutations sont vérifiées par `nice -n 19 ionice -c3 node scripts/validate-dedale.js`. Répétitivité : 100 → 22,4, clones adjacents : 0 %. Voir [les trente niveaux](GAME_SPEC.md#dédale).

Briqueterie (passe 61) : campagnes enregistrées gagnantes sur les graines 455 et 28 ; validation sans navigateur avec `nice -n 19 ionice -c3 node scripts/validate-briqueterie.js`. Détails des trente formes dans `GAME_SPEC.md`, mesures dans `docs/diversity.md`.
