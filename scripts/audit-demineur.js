/* global console, process */
// node --import ./scripts/ts-loader.js scripts/audit-demineur.js [--fail]
// Démineur: replays the 130 progression grids with the independent checker (tests/demineur-oracles.ts, not the game's
// solver) from the real opening, and prints the hardest rule each needs. `--fail`: exit 1 when a grid needs a guess,
// runs out of budget, or needs more than two numbers compared (a whole-group placement or the mine counter).
import { LEVELS } from '../src/engines/demineur/levels.ts';
import { checkGrid } from '../tests/demineur-oracles.ts';
const bad = [], tally = {};
for (const [i, level] of LEVELS.entries()) {
    const v = checkGrid(level), label = v.status === 'solved' ? v.hardest : v.status;
    tally[label] = (tally[label] ?? 0) + 1;
    if (v.status !== 'solved' || v.hardest === 'local' || v.hardest === 'counter') bad.push(`${i + 1}:${label}`);
    console.log(`${String(i + 1).padStart(3)} ${level.name} ${level.width}×${level.height} ${level.mineCount} → ${label} ${JSON.stringify(v.uses)} ${v.revealed}/${v.safe}`);
}
console.log('Bilan :', JSON.stringify(tally), '· hors progression :', bad.length, bad.join(' '));
if (process.argv.includes('--fail') && bad.length) process.exit(1);
