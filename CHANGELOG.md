# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
le projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

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

[Non publié]: https://github.com/Davy45270/Opencade/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.1.0
