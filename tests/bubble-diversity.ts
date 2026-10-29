import assert from './bubble-assert';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
import { measureDiversity } from '../scripts/diversity-metrics.js';
export function levelDiversity(levels = LEVELS): void {
    const rows = levels.map((l, i) => ({level:i+1, parameters:{colors:l.colors, rows:l.rows, interval:l.interval, layoutCells:generateLevel(i,l.seed).length},
        elements:['bubble','match-three','detach',...(l.interval ? ['ceiling-drop'] : []),...(l.mechanics ?? [])],
        layout:generateLevel(i,l.seed).map(c=>`${String(c.row)},${String(c.col)}:${String(c.color)}:${c.kind ?? 'color'}`)}));
    const result = measureDiversity(rows);
    assert.ok(result.noveltyCount >= 6);
    assert.equal(new Set(levels.flatMap(l=>l.mechanics ?? [])).size,6);
    const added = result.noveltyLevels.filter(n=>n >=11);
    assert.equal(added.length,6);
    for(let i=1;i<added.length;i++) {
        const current=added[i], previous=added[i-1];
        assert.ok(current !== undefined && previous !== undefined);
        assert.ok(current-previous >=3 && current-previous <=5);
    }
    assert.ok(result.cloneShare < 0.2);
    const introductions = result.noveltyLevels.filter(n=>n >= 11 && n <=25);
    assert.equal(introductions.length,5);
    let previous = 10;
    for (const level of introductions) { assert.ok(level - previous <=5); previous=level; }
    assert.ok(25 - previous <=5);
}
