import { test } from 'vitest';
import assert from './bubble-assert';
import { historicalLevels, stone, bomb, ice, rainbow, stars, bumpers } from './bubble-cases';
import { levelDiversity } from './bubble-diversity';
import { greedyLevel } from '../src/engines/bubble/solver';
test('B-LVL-01 historique littéral',historicalLevels);
for (const [name, oracle] of Object.entries({stone,bomb,ice,rainbow,stars,bumpers})) test(`B-LVL-02 ${name}`,()=>{oracle();});
test('B-LVL-03 diversité et cadence de l’extension',()=>{levelDiversity();});
// Representative campaign checkpoints; the full beam search belongs to the bounded Node audit.
test('B-LVL-04 graine 28 : niveaux 1, 5, 10, 15, 20, 25, 30',()=>{
    const started = performance.now();
    const results = [1,5,10,15,20,25,30].map(level => ({level, ...greedyLevel(level-1,28,160)}));
    assert.ok(performance.now() - started < 10000);
    for (const result of results) assert.equal(result.won,true,`L${String(result.level)}`);
}, 10000);
