import assert from './bubble-assert';
import { Engine, type Cell } from '../src/engines/bubble/engine';
import { readSave, writeSave } from '../src/shell/storage';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
export function historicalLevels(): void {
    assert.equal(LEVELS.length, 30);
    const values = new Map([['bubble-lab:v1', '{"unlocked":10,"best":123}']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); } };
    assert.deepEqual(readSave(storage, 'bubble', 30), { unlocked: 10, best: 123 });
    writeSave(storage, { unlocked: 30, best: 456 });
    assert.deepEqual(readSave(storage, 'bubble', 30), { unlocked: 30, best: 456 });
    assert.deepEqual(LEVELS.slice(0, 10).map(l => [l.id, l.colors, l.rows, l.interval, l.pattern, l.seed]), [
        ['L1',4,5,0,'rubans',452], ['L2',4,5,12,'losange',453], ['L3',4,6,12,'damier',454],
        ['L4',4,6,10,'pyramide',455], ['L5',5,6,10,'colonnes',456], ['L6',5,7,9,'vagues',457],
        ['L7',5,7,8,'chevrons',458], ['L8',6,7,8,'spirale',459], ['L9',6,8,7,'cristal',460], ['L10',6,8,6,'prisme',461],
    ]);
    assert.deepEqual([0,4,9].map(i => generateLevel(i, LEVELS[i]?.seed ?? 0).slice(0, 3)), [
        [{row:0,col:0,color:3},{row:0,col:1,color:3},{row:0,col:2,color:3}],
        [{row:0,col:0,color:3},{row:0,col:1,color:1},{row:0,col:2,color:0}],
        [{row:0,col:0,color:4},{row:0,col:1,color:3},{row:0,col:2,color:5}],
    ]);
}
function resolve(e: Engine, target: Cell): void {
    assert.equal(e.shoot(), true);
    if (!e.flight) throw new Error('Missing flight');
    e.flight.trajectory = { target, length: 0, segments: [], struck: e.flight.trajectory.struck };
    e.advance(10000);
}
export function stone(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{row:0,col:4,color:0,kind:'stone'},{row:1,col:3,color:0},{row:1,col:4,color:0}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:4,color:0,kind:'stone'}]);
    assert.equal(e.last.popped.length,3);
    e.load([{row:0,col:4,color:0},{row:1,col:4,color:0},{row:1,col:5,color:1,kind:'stone'}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.last.fallen,[{row:1,col:5,color:1,kind:'stone'}]);
}
export function bomb(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{row:0,col:4,color:0,kind:'bomb'},{row:1,col:4,color:0},{row:0,col:5,color:1},{row:0,col:7,color:1}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:7,color:1}]);
    assert.equal(e.last.popped.length,4);
}
export function ice(EngineClass = Engine): void {
    const e = new EngineClass();
    const pair: Cell[] = [{row:0,col:4,color:0},{row:1,col:4,color:0}];
    e.load([...pair,{row:0,col:5,color:1,kind:'ice',ice:2}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:5,color:1,kind:'ice',ice:1}]);
    e.grid.push(...pair);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:5,color:1}]);
}
export function rainbow(): void {
    const e = new Engine(); e.loadLevel(16);
    e.load([{row:0,col:4,color:1},{row:1,col:4,color:1},{row:0,col:0,color:0}],0);
    resolve(e,{row:2,col:4,color:0});
    assert.equal(e.last.attached?.color,1);
    assert.equal(e.last.popped.length,3);
    assert.deepEqual(e.grid,[{row:0,col:0,color:0}]);
}
export function stars(): void {
    const e = new Engine(); e.loadLevel(24);
    e.load([{row:0,col:4,color:0},{row:1,col:4,color:0},{row:1,col:5,color:1,kind:'star'},{row:0,col:0,color:1}],0);
    e.resolved = 5; e.shots = 5;
    resolve(e,{row:2,col:4,color:0});
    assert.equal(e.status,'won');
    assert.equal(e.drops,0);
    assert.deepEqual(e.last.fallen,[{row:1,col:5,color:1,kind:'star'}]);
    assert.deepEqual(e.grid,[{row:0,col:0,color:1}]);
}
export function bumpers(): void {
    const e = new Engine(); e.loadLevel(25); e.load([]);
    const first = e.trace(-0.3).segments[0];
    assert.ok(first);
    assert.equal(first.bounce,true);
    assert.ok(Math.abs(first.to.x - 100) < 0.000001);
    assert.ok(Math.abs(first.to.y - (570 - 80 / Math.tan(0.3))) < 0.000001);
    const second = e.trace(-0.3).segments[1];
    assert.ok(second);
    assert.equal(second.direction.x,-first.direction.x);
    assert.equal(second.direction.y,first.direction.y);
}
