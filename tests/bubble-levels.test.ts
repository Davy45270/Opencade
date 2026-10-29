import { test } from 'vitest';
import assert from './bubble-assert';
import { historicalLevels, stone, bomb, ice, rainbow, stars, bumpers } from './bubble-cases';
import { levelDiversity, cloneDetection } from './bubble-diversity';
import { campaign, difficulty } from './bubble-campaign';
test('B-LVL-01 historique littéral',()=>{historicalLevels();});
for (const [name, oracle] of Object.entries({stone,bomb,ice,rainbow,stars,bumpers})) test(`B-LVL-02 ${name}`,()=>{oracle();});
test('B-LVL-03 diversité et cadence de l’extension',()=>{levelDiversity();});
test('B-LVL-03 clones réels',cloneDetection);
let fixedResults: ReturnType<typeof campaign> | undefined;
test('B-LVL-04 graine 28 : les trente niveaux',()=>{
    const started = performance.now();
    fixedResults = campaign();
    assert.ok(performance.now() - started < 5000);
}, 5000);

test('B-LVL-05 tirs moyens croissants et respirations',()=>{difficulty(fixedResults ?? campaign());});
