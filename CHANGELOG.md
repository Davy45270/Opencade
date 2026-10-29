# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

- Passe 34 : seuils littéraux d’Alunir, module agrandi et HUD dégagé ; puzzles Caisses compacts, minimums exacts en pas/poussées, virages, détours et effort contrôlés par script Node.

- Caisses : dixième jeu, 30 ateliers originaux, poussées, annulation illimitée, records prouvés par solveur, commandes tactiles et vignette animée.

### Ajouté — préparation de 0.3.0

- Alunir, neuvième jeu : trente terrains à graine, poussée, rotation, vent,
  carburant et collision continue ; commandes maintenues, vignette animée,
  progression et sons synthétisés. Oracle U01–U12 et parcours bureau/mobile.

- Huit vignettes Canvas animées et déterministes sur l’accueil, jouées par les
  moteurs purs ; suspension hors écran, en arrière-plan et pendant un jeu.
- Image fixe avec réduction des animations et grille à deux colonnes sur mobile.

## [0.2.0] - 2026-10-29

### Ajouté

- Installation PWA sur téléphone, manifeste et icônes originales ; les huit jeux
  et leurs sauvegardes locales restent accessibles hors connexion après chargement.
- Mise à jour au prochain lancement après fermeture des fenêtres, annoncée sans
  interrompre le jeu.
- Confort sur téléphone : écran allumé pendant le jeu actif, vibrations liées
  au son global et plein écran facultatif depuis le menu mobile.

### Modifié

- Titre visible « Opencade » ; clés de sauvegarde historiques conservées pour
  préserver les progrès existants.

## [0.1.0] - 2026-10-29

### Ajouté

- Arcade de 8 jeux originaux : Bubble Lab (10 niveaux), Serpentin, Briqueterie,
  Empilo, Orbite, Essaim, Dédale et Ferraille (30 niveaux chacun).
- Socle commun : accueil, pause, panneaux de résultat, choix des niveaux,
  sauvegarde locale facultative, son synthétisé global.
- Contrôles tactiles, souris et clavier ; mise en page plein écran sur téléphone.
- Moteurs purs à graine testés par Vitest ; parcours E2E Playwright bureau et
  mobile.
- CI GitHub Actions et déploiement sur GitHub Pages.

[Non publié]: https://github.com/Davy45270/Opencade/compare/v0.2.0...HEAD
[0.1.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.1.0
