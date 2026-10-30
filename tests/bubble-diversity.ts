import assert from './bubble-assert';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
import { Engine } from '../src/engines/bubble/engine';
import { measureDiversity } from '../scripts/diversity-metrics.js';
export function diversityRows(indices = LEVELS.map((_,i)=>i), generate = generateLevel) {
    return indices.map((index, i) => {
        const l = LEVELS[index];
        assert.ok(l);
        const engine = new Engine(); engine.loadLevel(index,l.seed);
        const grid = generate(index,l.seed);
        return {level:i+1, parameters:{colors:l.colors, rows:l.rows, interval:l.interval, layoutCells:grid.length},
            elements:['bubble','match-three','detach',...(l.interval ? ['ceiling-drop'] : []),
                ...new Set(grid.flatMap(c=>c.kind ? [c.kind] : [])),
                ...(engine.rainbow ? ['rainbow'] : []),...(engine.bumpers.length ? ['bumper'] : [])],
            layout:grid.map(c=>`${String(c.row)},${String(c.col)}:${String(c.color)}:${c.kind ?? 'color'}`)};
    });
}
export function levelDiversity(indices = LEVELS.map((_,i)=>i), generate = generateLevel): void {
    const levels = indices.map(i=>LEVELS[i]);
    const rows = diversityRows(indices,generate);
    const result = measureDiversity(rows);
    assert.ok(result.cloneShare < 0.2);
    assert.ok(result.noveltyCount >= 6);
    // Six chapter mechanics plus catalogue leaf (P02, L20) and crystal/prism (P03, L26), on existing novelty levels.
    assert.equal(new Set(levels.flatMap(l=>l?.mechanics ?? [])).size,9);
    const added = result.noveltyLevels.filter(n=>n >=11);
    assert.equal(added.length,6);
    for(let i=1;i<added.length;i++) {
        const current=added[i], previous=added[i-1];
        assert.ok(current !== undefined && previous !== undefined);
        assert.ok(current-previous >=3 && current-previous <=5);
    }
    const introductions = result.noveltyLevels.filter(n=>n >= 11 && n <=25);
    assert.equal(introductions.length,5);
    let previous = 10;
    for (const level of introductions) { assert.ok(level - previous <=5); previous=level; }
    assert.ok(25 - previous <=5);
}

export function cloneDetection(): void {
    const rows = diversityRows(Array.from({length:30},()=>0));
    assert.equal(new Set(rows.map(r=>JSON.stringify(r.layout))).size,1);
    assert.equal(measureDiversity(rows).cloneShare,1);
}
