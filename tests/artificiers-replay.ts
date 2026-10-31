import assert from 'node:assert/strict';
import { Engine, type Shot } from '../src/engines/artificiers/engine';
import type { CharacterId } from '../src/characters/model';
import { WORLD_SCALE, PANEL_TOP, countedGraphics, drawDynamic } from '../src/games/artificiers/art';
import type Phaser from 'phaser';
import { charge } from './artificiers-budget';
import recordings from './fixtures/artificiers-wins.json' with { type: 'json' };
export interface Command { at: number; kind: 'shot' | 'jump'; shot?: Shot }
export interface Recording { level: number; seed: number; hero: CharacterId; commands: Command[]; duration: number; final: ReturnType<typeof summary> }
export function summary(e: Engine) {
    let terrain = 0;
    charge('cells', e.terrain.mask.length);
    e.terrain.mask.forEach((n, i) => { terrain = (terrain + n * (i + 1)) % 1000000007; });
    return { status: e.status, winner: e.winner, turn: e.turn, shots: e.shots, score: e.score, terrain,
        units: e.units.map(u => [u.hp, Math.round(u.x * 1000), Math.round(u.y * 1000)]), water: e.water, rng: e.random.state };
}
export function execute(e: Engine, command: Command): void {
    assert.ok(command.at >= e.time);
    e.advance(command.at - e.time);
    assert.equal(e.phase, 'aim'); assert.equal(e.actor.team, 0);
    if (command.kind === 'jump') assert.ok(e.jump());
    else {
        assert.ok(command.shot); e.aim(command.shot.angle, command.shot.power);
        assert.ok(e.selectWeapon(command.shot.weapon)); assert.ok(e.shoot());
    }
}
export const wins = recordings as Recording[];
export const replayRender = { maximum: 0, frames: 0 };
export function replayWin(level: number): void {
    const r = wins[level]; assert.ok(r); assert.equal(r.level, level);
    const e = new Engine(level, r.seed, 'solo', r.hero);
    assert.ok(r.commands.length <= 65 && r.duration <= 1000000);
    // Inspect every simulated frame, including the exact transition to victory.
    const budget = { calls: 0, limit: 500 };
    const raw = new Proxy({}, { get: () => () => { charge('calls', 1); } }) as Phaser.GameObjects.Graphics;
    const graphics = countedGraphics(raw, budget);
    const advance = e.advance.bind(e);
    e.advance = ms => {
        assert.ok(ms >= 0 && ms <= 1000000);
        for (let left = ms; left > 0; left -= 20) {
            const wasPlaying = e.playing;
            advance(Math.min(20, left));
            for (const u of e.units.filter(u => u.hp > 0)) {
                assert.ok((u.y + 13) * WORLD_SCALE < PANEL_TOP, 'Personnage visible après chute');
                assert.ok((u.y - 30) * WORLD_SCALE < PANEL_TOP, 'Vie visible après chute');
            }
            budget.calls = 0; drawDynamic(graphics, e, true, true);
            assert.ok(budget.calls <= budget.limit, `Graphics N${String(level + 1)} : ${String(budget.calls)}`);
            replayRender.maximum = Math.max(replayRender.maximum, budget.calls); replayRender.frames++;
            if (e.config.mission === 'structure' && wasPlaying && e.status === 'won')
                assert.ok(e.terrain.structureCount() <= e.initialStructure * .2, 'Démolition : seuil de 80 %');
        }
    };
    for (const c of r.commands) execute(e, c);
    e.advance(r.duration - e.time);
    assert.equal(e.status, 'won', `Victoire ${String(level + 1)}`);
    assert.deepEqual(summary(e), r.final);
    if (e.config.mission === 'survive') assert.ok(e.turn >= e.config.goal * 2);
}

