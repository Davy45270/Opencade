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
import { leaf, crystal, prism, catalogueBoards } from './bubble-catalogue';
test('B-CAT-01 feuille : balaie sa rangée, en chaîne', () => { leaf(); });
test('B-CAT-02 cristal : fixe, ancre, hors victoire et défaite', () => { crystal(); });
test('B-CAT-03 prisme : joker, réaction en chaîne, jamais distribué', () => { prism(); });
test('B-CAT-04 plateaux du catalogue P01–P03', () => { catalogueBoards(); });
