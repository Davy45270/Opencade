/* global console, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { Engine, chooseShot } = await import('../src/engines/artificiers/engine.ts');
const { summary } = await import('../tests/artificiers-replay.ts');
const records = [];
for (let level = 0; level < 30; level++) {
    let record;
    // Calibration is outside tests. All commands are saved, tests only replay them.
    for (const jump of [false, true]) {
        for (const hero of ['panda', 'dragon', 'licorne', 'pandaroux', 'singe']) {
            for (const seed of [220, 19, 37, 101]) {
                const e = new Engine(level, seed, 'solo', hero), commands = [];
                while (e.status === 'playing' && e.turn < 40 && commands.length < 65) {
                    if (e.phase === 'aim' && e.actor.team === 0 && (e.config.mission === 'structure' || e.units.some(u => u.team === 1 && u.hp > 0))) {
                        if (jump && e.jump()) { commands.push({ at: e.time, kind: 'jump' }); e.advance(440); }
                        if (e.status !== 'playing' || e.phase !== 'aim') break;
                        const shot = chooseShot(e);
                        commands.push({ at: e.time, kind: 'shot', shot });
                        e.aim(shot.angle, shot.power); e.selectWeapon(shot.weapon); e.shoot();
                    }
                    e.advance(200);
                }
                if (e.status === 'won') { record = { level, seed, hero, commands, duration: e.time, final: summary(e) }; break; }
            }
            if (record) break;
        }
        if (record) break;
    }
    assert.ok(record, `Niveau ${level + 1} sans victoire`); records.push(record);
    console.log(`N${level + 1}: ${record.hero}, graine ${record.seed}, ${record.commands.length} commandes`);
    writeFileSync(new URL('../tests/fixtures/artificiers-wins.json', import.meta.url), JSON.stringify(records, null, 2) + '\n');
}
