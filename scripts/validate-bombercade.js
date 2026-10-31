/* global console, performance, URL */
import process from 'node:process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { ids } from '../src/characters/model.ts';
import { oracles } from '../tests/bombercade-oracles.ts';
import { Random } from '../src/engines/shared/random.ts';
import { Pilot } from '../src/engines/bombercade/pilot.ts';
import { durationFailures } from './bombercade-budget.ts';
import { checkBombercadeScene } from './bombercade-scene-oracle.js';
import { checkBombercadeMutations } from './bombercade-mutations.js';
import { Engine, FIXED, directions } from '../src/engines/bombercade/engine.ts';
const validationStarted = performance.now();
const measuring = process.argv.includes('--measure');
const reportRequested = process.argv.includes('--report');
const recordRequested = process.argv.includes('--record');
const recordingURL = new URL('../tests/fixtures/bombercade-inputs.json', import.meta.url);
const recordings = measuring ? [] : JSON.parse(readFileSync(recordingURL, 'utf8'));
const digest = engine => createHash('sha256').update(JSON.stringify(engine.snapshot())).digest('base64');
function game(level, seed, character = 'panda') {
    const engine = new Engine(character), pilot = new Pilot(); engine.loadLevel(level, seed);
    if (measuring) {
        const inputs = [];
        while (engine.status === 'playing' && engine.time < 180000) {
            const action = pilot.play(engine);
            if (action) inputs.push([engine.ticks, action.direction, Number(action.bomb), Number(Boolean(action.special))]);
            engine.step(FIXED);
        }
        recordings.push({ level, seed, character, inputs, status: engine.status, digest: digest(engine), specials: pilot.specials });
        if (recordRequested) writeFileSync(recordingURL, JSON.stringify(recordings) + '\n');
    } else {
        const record = recordings.find(r => r.level === level && r.seed === seed && r.character === character);
        assert.ok(record, `Enregistrement absent ${level}/${seed}/${character}`);
        let cursor = 0;
        while (engine.status === 'playing' && engine.time < 180000) {
            const action = record.inputs[cursor];
            if (action && action[0] === engine.ticks) {
                engine.input(action[1]); if (action[3] && engine.special()) pilot.specials++; if (action[2]) engine.place(); cursor++;
            }
            engine.step(FIXED);
        }
        assert.equal(cursor, record.inputs.length, 'Toutes les entrées doivent être consommées');
        assert.equal(digest(engine), record.digest, `Rejeu divergent ${level}/${seed}/${character}`);
        assert.equal(engine.status, record.status);
        assert.equal(pilot.specials, record.specials, 'Nombre de pouvoirs réellement utilisés');
    }
    return { engine, pilot };
}
function saveReport(report) {
    if (reportRequested) writeFileSync(new URL('../docs/bombercade-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
for (const [id, run] of oracles) { const start = performance.now(); try { run(); } catch (error) { console.log(id, String(error)); throw error; } assert(performance.now() - start < 2000, id); console.log(id); }
try { await checkBombercadeScene(); } catch (error) { console.log('B scène', String(error)); throw error; }
console.log('B scène : arène cuite, budget dynamique et libération des textures');
const mutations = await checkBombercadeMutations();
const failures = [];
const report = { complete: false, mode: measuring ? 'search' : 'replay', campaignSeed: 28, balanceLevels: [4, 12, 20, 30], balanceSeeds: [6, 16, 28], campaign: [], balance: [], balanceGames: [], selfDeaths: [], latency: [], randomBombs: [], mutations };
for (let seed = 0; seed < 20; seed++) {
    const e = new Engine(); e.loadLevel(29, seed); const rival = e.actors[1];
    while (e.status === 'playing' && rival.hearts > 0) {
        e.step(FIXED);
        if (rival.hearts === 0) {
            const hit = e.fires.find(f => f.at === rival.at || rival.travel > .5 && f.at === rival.from);
            if (hit?.owner === rival.id) report.selfDeaths.push({ seed, time: e.time, at: rival.at });
        }
    }
}
if (report.selfDeaths.length > 1) failures.push(`B10 : ${report.selfDeaths.length} suicides sur 20 parties ordinaires`);
console.log('B10 parties ordinaires', JSON.stringify(report.selfDeaths));
const campaignStart = performance.now();
for (let level = 0; level < 30; level++) {
    const { engine: active, pilot } = game(level, 28);
    if (active.status !== 'won') failures.push(`Pilote niveau ${level + 1}: ${active.status}`);
    const idle = new Engine(); idle.loadLevel(level, 28); idle.step(180000); if (idle.status !== 'lost') failures.push(`Inaction niveau ${level + 1}: ${idle.status}`);
    report.campaign.push({ level: level + 1, pilot: active.status, idle: idle.status, time: active.time, at: active.player.at, rivals: active.actors.slice(1).filter(a => a.hearts).map(a => a.at), blocks: active.board.blocks.length, specials: pilot.specials });
    saveReport(report);
    console.log(`Niveau ${level + 1} : pilote ${active.status} ${Math.round(active.time)} ms, inaction ${idle.status}`);
}
report.campaignSeconds = (performance.now() - campaignStart) / 1000;
if (report.campaignSeconds >= 120) failures.push(`Campagne trop lente : ${report.campaignSeconds} s`);
saveReport(report);
for (const level of [0, 3]) {
    const engine = new Engine(), pilot = new Pilot(false); engine.loadLevel(level, 28);
    while (engine.status === 'playing' && engine.time < 54000) {
        const before = engine.snapshot(), intent = pilot.readAction(engine);
        assert.deepEqual(engine.snapshot(), before, 'Lecture du pilote sans modification de la partie');
        engine.step(150); engine.input(intent.direction); if (intent.bomb) engine.requestBomb(); if (intent.special) engine.special();
    }
    report.latency.push({ level: level + 1, status: engine.status, time: engine.time });
    if (engine.status !== 'won') failures.push(`Latence tactile niveau ${level + 1}: ${engine.status}`);
}
console.log('B doigt latence 150 ms', JSON.stringify(report.latency));
for (let level = 25; level < 30; level++) {
    const engine = new Engine(), random = new Random(100 + level); engine.loadLevel(level, 28);
    while (engine.status === 'playing' && engine.time < 180000) {
        engine.input(directions[Math.floor(random.next() * 4)] ?? null);
        if (random.next() < .45) engine.requestBomb(); engine.step(150);
    }
    report.randomBombs.push({ level: level + 1, status: engine.status });
    if (engine.status !== 'lost') failures.push(`Bombes sans stratégie niveau ${level + 1}: ${engine.status}`);
}

for (const character of ids) {
    let wins = 0, specials = 0;
    for (const level of [3, 11, 19, 29]) for (const seed of [6, 16, 28]) {
        // These four identical panda trials already ran in the campaign.
        const campaign = character === 'panda' && seed === 28 ? report.campaign.find(game => game.level === level + 1) : undefined;
        if (campaign) {
            if (campaign.pilot === 'won') wins++;
            specials += campaign.specials;
            report.balanceGames.push({ character, level: level + 1, seed, status: campaign.pilot, time: campaign.time, seconds: 0, reusedCampaign: true });
            continue;
        }
        const started = performance.now();
        const { engine: e, pilot } = game(level, seed, character);
        if (e.status === 'won') wins++; specials += pilot.specials;
        report.balanceGames.push({ character, level: level + 1, seed, status: e.status, time: e.time, seconds: (performance.now() - started) / 1000 });
        saveReport(report);
    }
    if (!specials) failures.push(`B09 ${character}: aucun pouvoir exercé`);
    report.balance.push({ character, wins, games: 12, rate: wins / 12, specials });
    saveReport(report);
}
const average = report.balance.reduce((sum, entry) => sum + entry.rate, 0) / ids.length;
for (const entry of report.balance) if (Math.abs(entry.rate - average) > .15 + .000001) failures.push(`B09 ${entry.character}: ${entry.rate}, moyenne ${average}`);
console.log('B09 équilibre', JSON.stringify(report.balance));
report.validationSeconds = (performance.now() - validationStarted) / 1000;
failures.push(...durationFailures(report));
console.log('Durée du validateur', report.validationSeconds, 's');
report.complete = true; report.passed = failures.length === 0; report.failures = failures;
saveReport(report);
assert.deepEqual(failures, []);
