import assert from './bubble-assert';
import { solveLevel } from '../src/engines/bubble/solver';
export function campaign(solve = solveLevel) {
    const results = Array.from({length:30},(_,index)=>({level:index+1,...solve(index,28,160)}));
    for (const result of results) assert.equal(result.won,true,`L${String(result.level)}`);
    return results;
}
export function difficulty(results: {level:number;shots:number;won:boolean}[]) {
    assert.equal(results.length,30);
    const bands=Array.from({length:6},(_,i)=>results.slice(i*5,i*5+5).reduce((sum,r)=>sum+r.shots,0)/5);
    assert.ok((bands[2] ?? 0) < (bands[3] ?? 0));
    assert.ok((bands[3] ?? 0) < (bands[4] ?? 0));
    assert.ok((bands[4] ?? 0) < (bands[5] ?? 0));
    assert.ok((bands[5] ?? 0) >= (bands[0] ?? 0) * 1.5);
    for (const level of [13,16,19,22,28]) assert.ok((results[level-1]?.shots ?? 0) >= (results[4]?.shots ?? 0));
    return bands;
}
