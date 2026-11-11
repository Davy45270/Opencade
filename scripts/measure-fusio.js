/* global console, performance, process */
// node --import ./scripts/ts-loader.js scripts/measure-fusio.js [--freeze]
// Offline: measures the empirical difficulty of the thirty Fusio challenges (expectimax agent, depth 1, three noise
// levels, 40 games each, on each challenge's own seed) and prints the table; with --freeze, writes the measured
// values into src/engines/fusio/challenges.ts. validate-fusio.js recomputes them in test:node.
import { readFileSync, writeFileSync } from 'node:fs';
import { CHALLENGES, challengeConfig } from '../src/engines/fusio/challenges.ts';
import { measure } from '../src/engines/fusio/solver.ts';
const found = [];
console.log('| Défi | Titre | Taille | Cible | Règle | Réussite ε=25/10/3 % | Coups moyens | Difficulté | ms |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [i, c] of CHALLENGES.entries()) {
    const t = performance.now(), m = measure(challengeConfig(i));
    found.push(m.difficulty);
    const rule = [c.p2 !== undefined ? `2 à ${String(c.p2)} %` : '', c.walls ? `${String(c.walls.length)} bloquée(s)` : '', c.moveLimit ? `${String(c.moveLimit)} coups` : '', c.start ? 'départ écrit' : '', c.undo === false ? 'sans annuler' : ''].filter(Boolean).join(', ') || '—';
    console.log(`| ${String(i + 1)} | ${c.name} | ${String(c.size)}×${String(c.size)} | ${String(c.target)} | ${rule} | ${m.rates.map(r => `${String(Math.round(100 * r))} %`).join(' / ')} | ${String(m.meanMoves)} | ${String(m.difficulty)} | ${String(Math.round(performance.now() - t))} |`);
}
if (process.argv.includes('--freeze')) {
    const file = 'src/engines/fusio/challenges.ts';
    let k = 0;
    const text = readFileSync(file, 'utf8').replace(/difficulty: [0-9.]+ \}/g, () => `difficulty: ${String(found[k++])} }`);
    if (k !== CHALLENGES.length) throw new Error(`${String(k)} difficultés remplacées`);
    writeFileSync(file, text);
    console.log('Difficultés figées.');
}
