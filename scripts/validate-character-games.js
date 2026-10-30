/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const checks = await import('../tests/character-games-checks.ts');
const { Engine: Caisses, LEVELS } = await import('../src/engines/caisses/engine.ts');
const { Engine: Traverse, difficulty } = await import('../src/engines/traverse/engine.ts');
const { Engine: Alunir } = await import('../src/engines/alunir/engine.ts');
const { pilot } = await import('../src/engines/alunir/engine.ts');
const { solve, solveWithBond } = await import('../src/engines/traverse/solver.ts');
const { crossingAction, landingControl } = await import('../tests/e2e/character-policy.ts');
const { pullRecords } = await import('../src/engines/caisses/records.ts');
// Pass 403: the workshops changed; their proofs live in their own fixture.
const fixtures = { ...JSON.parse(readFileSync('tests/fixtures/characters-campaigns.json', 'utf8')), ...JSON.parse(readFileSync('tests/fixtures/caisses-campaign.json', 'utf8')), ...JSON.parse(readFileSync('tests/fixtures/traverse-campaign.json', 'utf8')) };
Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
const timings = [];
function run(name, check) {
    const start = performance.now(); check(); const ms = performance.now() - start;
    timings.push({ name, ms: Math.round(ms) });
}
for (const game of ['caisses', 'traverse', 'alunir']) {
    run(`P-${game}-01`, () => {
        checks.rendered();
        const scene = readFileSync(`src/games/${game}/scene.ts`, 'utf8');
        assert.match(scene, /private hero = new GameCharacter\(\)/);
        assert.match(scene, /this.hero.draw\(g,/);
        assert.match(scene, /character: this.hero.snapshot\(\)/);
        assert.match(scene, new RegExp(`id: '${game}-special'.*size: 56`));
    });
    run(`P-${game}-02/03`, checks[`${game}Effect`]);
    run(`P-${game}-05`, checks.balance);
}
run('P-caisses-04 recorded campaigns and records', () => {
    for (const [i, proofs] of fixtures.caisses.entries()) {
        assert.equal(proofs.pushesSpecial.pushes, pullRecords[i].pushes);
        assert.equal(proofs.stepsSpecial.inputs.length, pullRecords[i].steps);
        assert.equal(proofs.pushes.pushes, LEVELS[i].minimumPushes);
        assert.equal(proofs.steps.inputs.length, LEVELS[i].minimumSteps);
        for (const [mode, proof] of Object.entries(proofs)) {
            const e = new Caisses(); e.loadLevel(i);
            for (const input of proof.inputs) {
                if (input.startsWith('pull-')) assert(e.special(input.slice(5)));
                else e.input(input);
            }
            // Pass 403 challenge rooms: a proof longer than the move budget is refused at the budget.
            if (LEVELS[i].budget && proof.inputs.length > LEVELS[i].budget) { assert.equal(e.status, 'lost'); assert.equal(e.state.moves, LEVELS[i].budget); continue; }
            assert.equal(e.status, 'won'); assert.equal(e.state.pushes, proof.pushes);
            assert.equal(e.state.moves, proof.inputs.length);
            if (!mode.includes('Special')) assert.equal(e.specialUses, 1);
        }
    }
});
run('P-traverse-04 recorded campaign without bond', () => {
    for (const [i, paths] of fixtures.traverse.entries()) {
        const e = new Traverse(i);
        for (const path of paths) for (const input of path) {
            if (input !== 'wait') e.input(input);
            e.advance(difficulty(i).flowFrames * 1000 / 60);
        }
        assert.equal(e.status, 'won'); assert.equal(e.state.lives, difficulty(i).lives); assert.equal(e.specialUses, 1);
    }
});
run('P-alunir-04 recorded campaign and scores without stabilisation', () => {
    for (const [i, proof] of fixtures.alunir.entries()) {
        const e = new Alunir(); e.loadLevel(i);
        for (const input of proof.inputs) {
            e.input({ thrust: Boolean(input & 1), left: Boolean(input & 2), right: Boolean(input & 4) });
            e.advance(1000 / 60);
        }
        assert.equal(e.status, 'won'); assert.equal(e.state.score, proof.score); assert.equal(e.specialUses, 2);
    }
});
// Pass 404: the second real-time crossing is 13 (crossed tides and a light); crossing 10 is now a one-life challenge.
run('P-traverse finger policy at 150 ms (engine only)', () => {
    for (const level of [0, 12]) {
        const e = new Traverse(level);
        for (const [i, target] of e.board.shelters.entries()) {
            const proof = i === 0 ? solveWithBond(level, 28, target, e.state.phase) : solve(level, 28, target, e.state.phase); assert(proof);
            for (const action of proof.path) {
                const phase = e.state.phase;
                if (action === 'bond') assert(e.special()); else if (action !== 'wait') e.input(action);
                do { e.advance(150); } while (e.state.phase === phase && e.status === 'playing');
            }
        }
        assert.equal(e.status, 'won'); assert.equal(e.state.lives, 3); assert.equal(e.specialUses, 0);
    }
});
run('P-alunir finger policy at 150 ms (engine only)', () => {
    for (const [level, expectedScore] of [[0, 1059], [9, 1207]]) {
        const e = new Alunir(); e.loadLevel(level);
        for (let tick = 0; tick < 180 && e.status === 'playing'; tick++) {
            if (e.terrain.pads[0].y - e.state.y < 40 && e.specialUses === 2) assert(e.special());
            e.input(pilot(e)); e.advance(150);
        }
        assert.equal(e.status, 'won'); assert.equal(e.state.score, expectedScore); assert.equal(e.specialUses, 1);
    }
});
run('shared live crossing policy replans from every observed state', () => {
    for (const level of [0, 12]) {
        const e = new Traverse(level);
        for (let i = 0; i < 160 && e.status === 'playing'; i++) {
            const action = crossingAction(e.snapshot());
            if (action === 'bond') assert(e.special()); else if (action !== 'wait') e.input(action);
            e.advance(difficulty(level).flowFrames * 1000 / 60);
        }
        assert.equal(e.status, 'won'); assert.equal(e.specialUses, 0);
    }
});
run('landing policy with controls held through 150 ms decision latency', () => {
    for (const level of [0, 9]) {
        const e = new Alunir(), model = new Alunir(); e.loadLevel(level);
        for (let observation = 0; observation < 600 && e.status === 'playing'; observation++) {
            const state = e.snapshot(); model.loadLevel(level, state.seed); model.loadState(state); model.input(state.controls); model.advance(150);
            const control = pilot(model); e.advance(150);
            if (state.terrain.pads[0].y - state.y < 40 && state.specialUses === 2) e.special();
            e.input(control);
        }
        assert.equal(e.status, 'won'); assert.equal(e.specialUses, 1); assert(e.state.ticks / 60 < 90);
    }
});
run('shared live landing policy tolerates transport overhead', () => {
    for (const level of [0, 9]) for (const delay of [150, 160, 170, 180]) {
        const e = new Alunir(), model = new Alunir(); e.loadLevel(level);
        for (let observation = 0; observation < 600 && e.status === 'playing'; observation++) {
            const state = e.snapshot(); model.loadLevel(level, state.seed); model.loadState(state); model.input(state.controls); model.advance(150);
            const control = landingControl(model); e.advance(delay);
            if (state.terrain.pads[0].y - state.y < 40 && state.specialUses > 0 && state.specialTicks === 0) e.special();
            e.input(control);
        }
        assert.equal(e.status, 'won'); assert(e.state.ticks / 60 < 90); assert(e.specialUses < 2);
    }
});
const mutations = [];
for (const [game, before, after] of [
    // Pass 403: the pull lives in rules.ts; the engine anchor swaps the pull for an ordinary push.
    ['caisses', 'const moved = pull(this.board, this.position(), direction);', 'const moved = push(this.board, this.position(), direction);'],
    ['caisses', 'this.specialUses === 0', 'this.specialUses < 0'],
    ['traverse', "bond: { x: 0, y: -2 }", "bond: { x: 0, y: 0 }"],
    ['traverse', 'this.specialUses === 0', 'this.specialUses < 0'],
    ['alunir', 'this.state.vx *= 0.5;', 'this.state.vx *= 1;'],
    ['alunir', 'this.specialUses === 0', 'this.specialUses < 0'],
]) {
    const file = `src/engines/${game}/engine.ts`, source = readFileSync(file, 'utf8');
    const { module } = await mutationModule('../' + file, before, after);
    run(`mutation ${game} ${before}`, () => assert.throws(() => checks[`${game}Effect`](module.Engine)));
    mutations.push({ file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: before, killed: true });
}
{
    const file = 'src/characters/game.ts', source = readFileSync(file, 'utf8');
    const before = 'readonly id: CharacterId = selectedCharacter();';
    const { module } = await mutationModule('../' + file, before, "readonly id: CharacterId = 'panda';");
    run('mutation default hero for all three games', () => assert.throws(() => checks.rendered(module.GameCharacter)));
    mutations.push({ file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: 'always panda (three games)', killed: true });
}
{
    const { module } = await mutationModule('../src/characters/game.ts',
        "this.moving = 240; this.animation = jump ? 'saut' : 'marche';",
        "this.moving = 240; this.animation = 'marche';");
    run('mutation jump replaced by walk', () => assert.throws(() => checks.rendered(module.GameCharacter)));
    mutations.push({ file: 'src/characters/game.ts', mutation: 'jump replaced by walk', killed: true });
}
console.log(JSON.stringify({ timings, mutations }, null, 2));
