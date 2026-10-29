# Opencade

[![CI](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml)
[![Pages](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Une petite arcade de **9 jeux originaux** dans le navigateur, sans serveur ni
compte : TypeScript strict, [Phaser 3](https://phaser.io/), Vite. Tout se joue
au doigt, à la souris ou au clavier, sur téléphone comme sur ordinateur.

**▶ Jouer : <https://davy45270.github.io/Opencade/>**

> **English summary** — Opencade is a small browser arcade of nine original
> games (bubble shooter, snake-like, brick breaker, falling blocks, fixed
> shooter, wave shooter, maze chase, run-and-gun, lunar lander), built with TypeScript,
> Phaser 3 and Vite. Each game's rules live in a pure, seeded engine that is
> unit-tested with Vitest without a browser; Phaser scenes only draw and read
> input. End-to-end tests (Playwright, desktop and mobile Chromium) drive the
> real inputs and use an `advance(ms)` hook so that results do not depend on
> CPU speed. Touch, mouse and keyboard are supported. The interface is in
> French. MIT licensed. Play it at <https://davy45270.github.io/Opencade/>.

L’accueil présente neuf vignettes Canvas animées par les moteurs purs, suspendues hors écran et fixes si la réduction des animations est demandée.

## Les jeux

| Jeu | En une ligne | Niveaux |
|---|---|---|
| **Bubble Lab** | Viser et tirer des bulles pour former des groupes de trois couleurs identiques avant que le plafond ne descende. | 10 |
| **Serpentin** | Guider une tête lumineuse qui s'allonge vers les étincelles et les cristaux, entre murs ou sur un tore. | 30 |
| **Briqueterie** | Casser des briques à la balle avec une raquette, des bonus et des briques à plusieurs points de vie. | 30 |
| **Empilo** | Empiler des pièces de cristal dans un puits de 9 × 16 et compléter des lignes, dont certaines sont scellées. | 30 |
| **Orbite** | Défendre quatre boucliers érodables contre une flotte de sondes qui accélère. | 30 |
| **Essaim** | Abattre des vagues aux trajectoires déterministes, avec piqués, blindés, scindeurs et nacelle à double canon. | 30 |
| **Dédale** | Récolter les graines d'un labyrinthe en échappant à quatre follets, qui deviennent vulnérables après un soleil. | 30 |
| **Alunir** | Poser un module lunaire en dosant rotation, poussée et carburant, entre relief et rafales. | 30 |
| **Ferraille** | Traverser des ateliers en courant, sautant et tirant, avec un gardien à phases tous les cinq niveaux. | 30 |

Les noms, règles, niveaux, formes et sons sont originaux : tout est dessiné et
synthétisé par le code, sans ressource de jeu externe, police ni fichier audio. Les icônes PWA sont des PNG originaux produits par code. Le meilleur score,
les niveaux débloqués et les préférences sont gardés dans `localStorage` quand il
est disponible ; le jeu fonctionne sans.

## Installer sur son téléphone et jouer hors ligne

Ouvrir **https://davy45270.github.io/Opencade/** avec une connexion et attendre
le chargement complet de l’accueil : les neuf jeux sont alors précachés.
Sur **Android (Chrome)**, ouvrir le menu ⋮ puis « Installer l’application »
ou « Ajouter à l’écran d’accueil ». Sur **iOS (Safari)**, ouvrir Partager puis
« Sur l’écran d’accueil » et confirmer l’ajout. Relancer depuis cette icône.
Les intitulés peuvent varier selon la version du navigateur.

Après ce premier chargement, l’accueil et les neuf jeux fonctionnent sans
connexion. Scores, niveaux débloqués et préférences restent dans le stockage
local du navigateur ou de l’application installée ; leur effacement supprime
ces données et peut imposer un nouveau chargement en ligne.

Une mise à jour trouvée en ligne est annoncée discrètement, sans interrompre
le jeu. Fermer toutes les fenêtres Opencade puis relancer pour l’appliquer.
Le mode `prompt` conserve le nouveau service worker en attente : aucune
activation forcée au milieu d’une partie. Aucun serveur tiers, police distante
ou cache de données externes n’est utilisé.

Le manifeste et le service worker emploient des chemins relatifs : `./`
désigne la racine locale ou `/Opencade/` sur Pages. Le workflow Pages publie
tout `dist/` et conserve `base: './'`. Les trois PNG livrés (192, 512 et
512 maskable) dessinent une borne lumineuse originale, produite par code :
ils ne nécessitent aucun outil graphique ni dépendance au build. Le fond est
opaque et le motif central reste dans le cercle de sûreté de l’icône maskable.
Tous les fichiers HTML, JS, CSS et icônes du build sont précachés, Phaser compris.

Les clés historiques `arcade-lab:*` et `bubble-lab:*` sont conservées malgré
le nom affiché « Opencade », pour préserver les progrès existants, hors ligne
comme en ligne.

## Confort sur téléphone

Quand le navigateur le permet, l’écran reste allumé pendant une partie active,
puis est libéré en pause, en arrière-plan ou à la fin du niveau. Des vibrations
accompagnent perte de vie, victoire et défaite si le son global est activé.
Le menu mobile propose « Plein écran » sur les appareils compatibles et tente
l’orientation portrait. Ces fonctions facultatives restent silencieuses si
elles sont indisponibles ou refusées ; voir la section Appareil de
[GAME_SPEC.md](GAME_SPEC.md).

## Contrôles

- **Tactile** : boutons et zones de glisser sous le canevas (croix, joystick,
  boutons Tir et Saut de 56 à 64 px). Sur téléphone, ☰ ouvre le statut, l'aide,
  les niveaux et « Recommencer », et met le jeu en pause.
- **Souris** : viser, guider, cliquer pour tirer ou lancer selon le jeu.
- **Clavier** : flèches, ZQSD ou WASD ; Espace pour l'action principale ;
  **P** ou **Échap** pour la pause.

L'aide propre à chaque jeu s'affiche dans le jeu. Les règles détaillées sont dans
[GAME_SPEC.md](GAME_SPEC.md).

## Architecture

```
src/
  engines/<jeu>/   moteurs purs : règles, collisions, niveaux, score
  engines/shared/  PRNG à graine partagé
  games/<jeu>/     scène Phaser (dessin, animations, entrées) et sons synthétisés
  games/registry.ts  liste des jeux, aides et contrôles déclarés
  shell/           socle commun : entrées, pause, menus, niveaux, son, sauvegarde
tests/             Vitest (moteurs et socle)
tests/e2e/         Playwright (parcours réels, bureau et mobile)
```

- **Moteurs purs.** Chaque moteur est du TypeScript sans Phaser ni DOM. ESLint
  y interdit les imports de Phaser, les globales du navigateur et
  `Math.random`. Le hasard passe par un **PRNG à graine** : une même graine et
  les mêmes entrées donnent exactement la même partie, ce qui rend les niveaux et
  les tests reproductibles.
- **Scènes Phaser.** Elles dessinent l'état du moteur et lui transmettent les
  entrées. Le socle recrée Phaser proprement à chaque changement de jeu et libère
  les écouteurs à la fermeture.
- **Ajouter un jeu** : un moteur et une scène originaux, puis une entrée dans
  `src/games/registry.ts`.

## Lancer en local

Node **22.12 ou plus** (voir `.nvmrc`).

```sh
npm ci
npm run dev        # serveur de développement
npm run build      # site statique dans dist/
npm run preview    # sert dist/ sur http://127.0.0.1:4173
```

`dist/` est un site statique autonome. Le build utilise `base: './'` : il se sert
tel quel depuis un sous-répertoire (c'est le cas de GitHub Pages, sous
`/Opencade/`). Ouvrir par HTTP, pas par `file://`.

## Tests

```sh
npm run lint         # ESLint strict, 0 avertissement toléré
npm run typecheck    # tsc --noEmit
npm test             # Vitest : moteurs et socle, sans navigateur
npx playwright install --with-deps chromium
npm run test:e2e     # Playwright sur le build de production
```

- **Vitest** vérifie l'oracle de chaque jeu (identifiants `T01`, `N01`, `K01`…
  repris dans [GAME_SPEC.md](GAME_SPEC.md)) sur des grilles et des graines fixées.
- **Playwright** lance `vite preview` sur `127.0.0.1:4173` et joue le build de
  production en Chromium bureau (1280 × 900) et mobile (390 × 844, tactile). Les
  tirs, sauts et glisser passent par les vraies entrées. La fixture commune fait
  échouer un test à la moindre erreur de page ou de console.
- **Crochet de test.** Avec `?test=1` dans l'URL seulement, la page expose
  `window.__ARCADE_TEST__` (et `window.__BUBBLE_TEST__`) : lecture de l'état,
  chargement d'un niveau ou d'une graine, scénarios, et `advance(ms)` qui fait
  avancer la simulation sans attendre le rendu. Les E2E restent ainsi
  indépendants de la vitesse du CPU. Sans ce paramètre, rien n'est exposé. Le
  crochet reste volontairement dans le build publié pour que les tests portent
  sur le produit livré ; ce n'est pas une frontière de sécurité, le jeu n'ayant
  ni serveur ni données à protéger.

La CI GitHub Actions rejoue lint, typecheck, Vitest, build et E2E à chaque push
et pull request ; le rapport Playwright est joint en artefact en cas d'échec.

## Limites connues

- Pas de classement en ligne ni de sauvegarde de partie en cours.
- Le canevas n'offre pas une représentation complète aux lecteurs d'écran ; le
  score, le statut et les boutons sont en HTML.
- Seul Chromium est couvert par les tests automatiques.
- Vite signale la taille du paquet Phaser ; cet avertissement est attendu.

## Comment ce projet a été fait

Le code a été écrit par l'agent de programmation Codex (OpenAI), relu et vérifié
par Claude (Anthropic), sous la direction de David Sevin.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md), le [code de conduite](CODE_OF_CONDUCT.md)
et la [politique de sécurité](SECURITY.md).

## Licence

[MIT](LICENSE) © 2026 David Sevin. Phaser est distribué sous licence MIT.
