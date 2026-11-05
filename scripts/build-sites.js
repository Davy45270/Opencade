// Builds every single-game site into dist/<site>/, after the catalogue build (which empties dist/).
//   node scripts/build-sites.js [site…]    default: every site of scripts/sites.js
import process from 'node:process';
import { build } from 'vite';
import { SITES } from './sites.js';

const wanted = process.argv.slice(2);
const unknown = wanted.filter(site => !SITES[site]);
if (unknown.length) throw new Error(`sites inconnus : ${unknown.join(', ')}`);
for (const site of wanted.length ? wanted : Object.keys(SITES)) {
    process.env.OPENCADE_SITE = site;
    await build({ logLevel: 'warn' });
    process.stdout.write(`site ${site} : dist/${site}/\n`);
}
delete process.env.OPENCADE_SITE;
