/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import process from 'node:process';
const { engineCases } = await import('../tests/collier-cases.ts');
const { createC15 } = await import('../tests/collier-thumbnail.ts');
const { Engine, FIXED_MS } = await import('../src/engines/collier/engine.ts');
const { policy } = await import('../src/engines/collier/policy.ts');
const { levelAt } = await import('../src/engines/collier/levels.ts');
import { sceneCases } from './collier-scene-oracles.js';
import { measureDiversity } from './diversity-metrics.js';
const images = createC15();
const imageCases = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`C15.${i + 1}`, images]));
for (const [id, oracle] of Object.entries({
    ...engineCases,
    ...imageCases,
    ...sceneCases
}).sort()) {
    const start = performance.now();
    const cpu = process.cpuUsage();
    oracle();
    const usage = process.cpuUsage(cpu);
    const elapsed = (usage.user + usage.system) / 1000;
    const wall = performance.now() - start;
    assert.ok(elapsed < (id === 'C19' || id === 'C20' ? 400 : 2000), `${id} : ${elapsed} ms`);
    console.log(`${id}: PASS (${elapsed.toFixed(1)} ms CPU, ${wall.toFixed(1)} ms écoulées)`);
}
engineCases.C19(2000);
engineCases.C20(true);
const campaign = [];
for (let level = 0; level < 30; level++) {
    const player = new Engine(level, 300), idle = new Engine(level, 300), random = new Engine(level, 300);
    let state = 300;
    for (let n = 0; n < 30000 && player.status === 'playing'; n++) {
        if (n % 9 === 0)
            policy(player);
        player.step(FIXED_MS);
    }
    for (let n = 0; n < 30000 && idle.status === 'playing'; n++)
        idle.step(FIXED_MS);
    assert.equal(player.status, 'won', `Pilote niveau ${level + 1}`);
    assert.equal(idle.status, 'lost', `Inaction niveau ${level + 1}`);
    if (level >= 24) {
        for (let n = 0; n < 30000 && random.status === 'playing'; n++) {
            if (n % 9 === 0) {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                random.aim(state / 4294967296 * Math.PI * 2);
                random.shoot();
            }
            random.step(FIXED_MS);
        }
        assert.notEqual(random.status, 'won', `Tirs aléatoires niveau ${level + 1}`);
    }
    campaign.push({
        level: level + 1,
        shots: player.shots,
        ms: Math.round(player.time),
        idle: idle.status
    });
}
const diversity = measureDiversity(Array.from({ length: 30 }, (_, i) => {
    const l = levelAt(i);
    return {
        level: i + 1,
        parameters: {
            colors: l.colors,
            quota: l.quota,
            speed: l.speed,
            length: l.length,
            bonusEvery: l.bonusEvery
        },
        elements: l.mechanics,
        layout: l.paths.flatMap(p => p.samples.map(q => `${Math.round(q.x / 10)},${Math.round(q.y / 10)}`))
    };
}));
assert.equal(diversity.coverage, '30/30');
assert.ok(diversity.cloneShare < .1);
assert.ok(diversity.maxGapWithoutNovelty <= 3);
console.log(JSON.stringify({ campaign, diversity: {
        cloneShare: diversity.cloneShare,
        noveltyLevels: diversity.noveltyLevels,
        maxGap: diversity.maxGapWithoutNovelty
    } }, null, 2));
await import('./collier-driver-oracles.js');
console.log('Collier : C01–C30, 30 victoires, 30 inactions perdantes et six témoins aléatoires validés.');
