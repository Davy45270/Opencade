/* global console */
import './ts-loader.js';
const { bounded } = await import('../tests/artificiers-budget.ts');
const { cases, fingerWin, diversityMetrics, graphicsCosts } = await import('../tests/artificiers-cases.ts');
const { replayWin, wins, replayRender } = await import('../tests/artificiers-replay.ts');
for (const [name, check] of Object.entries(cases)) { const work = bounded(check); console.log(`Artificiers ${name}: PASS ${JSON.stringify(work)}`); }
for (let level = 0; level < 30; level++) { bounded(() => replayWin(level)); console.log(`Artificiers N${level + 1}: victoire rejouée`); }
for (const level of [0, 9]) { bounded(() => fingerWin(level)); console.log(`Artificiers doigt N${level + 1}: PASS, latence 150 ms, bruit ±12 px`); }
if (wins.length !== 30) throw new Error('Trente bandes requises');
console.log(JSON.stringify(diversityMetrics()));

const { sceneChecks } = await import('./artificiers-scene-checks.js');
bounded(sceneChecks); console.log('Artificiers scène livrée : entrées, régions sales, duo, pause et nettoyage PASS');

console.log(`Graphics maximum 30 niveaux (aim/flight/settle): avant ${graphicsCosts.before}, après ${graphicsCosts.after}, plafond 500`);
const { auditMutations } = await import('./audit-artificiers-mutations.js');
auditMutations();

console.log(`Graphics rejeux: maximum ${replayRender.maximum}, ${replayRender.frames} images simulées, 30 niveaux`);
