import assert from 'node:assert/strict';
import { Engine, STEP } from '../src/engines/briqueterie/engine.ts';
export function statistics() {
const brick = () => ({x:100,y:100,w:32,h:18,hp:1,solid:false});
    const counts = { wide: 0, multi: 0, life: 0 };
    const trials = 16 * 500;
    let invalidDestructions = 0;
    for (let seed = 1; seed <= 16; seed++) {
        const e = new Engine(0, seed);
        for (let i = 0; i < 500; i++) {
            e.loadState({ ...e.state, ready: false, bonuses: [], bricks: [brick(), { ...brick(), x: 250 }], balls: [{ x: 116, y: 92, vx: 0, vy: 4 }] });
            e.step(STEP);
            if (e.state.bricks.length !== 1) invalidDestructions++;
            for (const drop of e.state.bonuses) counts[drop.kind]++;
        }
    }
    // 22–26 % autour de 24 % : marge de plus de quatre écarts-types sur 8000 essais.
    assert.equal(invalidDestructions, 0);
    const proportion = (counts.wide + counts.multi + counts.life) / trials;
    assert.ok(proportion >= 0.22);
    assert.ok(proportion <= 0.26);
    for (const count of Object.values(counts)) assert.ok(count > 0);
}
