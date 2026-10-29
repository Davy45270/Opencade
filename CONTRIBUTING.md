# Contribuer à Opencade

Merci de votre intérêt ! Les issues et pull requests sont les bienvenues, en
français ou en anglais.

## Avant de commencer

- Pour une correction simple, ouvrez directement une pull request.
- Pour un nouveau jeu ou un changement de règles, ouvrez d'abord une issue pour
  en discuter.
- Les jeux doivent rester **originaux** : pas de nom, personnage, graphisme, son
  ou niveau repris d'un jeu existant, et pas de ressource dont la licence n'est
  pas compatible MIT. Les formes et les sons sont produits par le code.

## Mettre en place

```sh
npm ci
npx playwright install --with-deps chromium
npm run dev
```

## Règles du code

- Les règles d'un jeu vivent dans `src/engines/<jeu>/` : pas de Phaser, pas de
  DOM, pas de `Math.random` (utiliser le PRNG de `src/engines/shared/random.ts`).
  ESLint le vérifie.
- La scène Phaser (`src/games/<jeu>/`) dessine et transmet les entrées ; elle
  libère ses écouteurs à la fermeture.
- Toute règle nouvelle s'accompagne d'un test Vitest ; tout parcours visible
  d'un test Playwright passant par de vraies entrées.
- Aucune nouvelle dépendance sans discussion préalable.

## Avant d'envoyer

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/)
(`feat:`, `fix:`, `docs:`, `test:`, `chore:`…). Notez les changements visibles
dans `CHANGELOG.md`.

En contribuant, vous acceptez que votre contribution soit publiée sous
[licence MIT](LICENSE) et vous vous engagez à respecter le
[code de conduite](CODE_OF_CONDUCT.md).
