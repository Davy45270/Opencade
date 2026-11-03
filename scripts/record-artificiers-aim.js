/* global console, URL */
import './ts-loader.js';
import { writeFileSync } from 'node:fs';
const { Engine, searchShot } = await import('../src/engines/artificiers/engine.ts');
const { AIM_SEEDS } = await import('../tests/artificiers-accuracy.ts');
// Offline search cache only. Tests run dosed flight/damage live and revalidate
// one cached search per map; measure-artificiers always runs every search live.
const maps = [];
for (let level = 0; level < 30; level++) {
    const samples = [];
    for (const seed of AIM_SEEDS) {
        const e = new Engine(level, seed, 'duo');
        e.active = e.units.findIndex(u => u.team === 1);
        const target = e.units.find(u => u.team === 0);
        e.units = e.units.filter(u => u === target || u === e.actor);
        e.units.forEach((u, i) => { u.id = i; }); e.active = 1;
        const shots = [];
        for (let turn = 0; turn < 12; turn++) {
            e.turn = turn * 2 + 1;
            e.wind = Math.round((e.random.next() * 2 - 1) * e.config.wind);
            shots.push({ turn: e.turn, wind: e.wind, shot: searchShot(e, false) });
        }
        samples.push({ seed, shots });
    }
    maps.push(samples); console.log(`Recherches N${level + 1} enregistrées`);
}
writeFileSync(new URL('../tests/fixtures/artificiers-aim-search.json', import.meta.url), JSON.stringify(maps) + '\n');
