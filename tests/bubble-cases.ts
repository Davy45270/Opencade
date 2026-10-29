import assert from './bubble-assert';
import { HISTORICAL_ROWS } from './bubble-history';
import { Engine, type Cell, type Color } from '../src/engines/bubble/engine';
import { readSave, writeSave } from '../src/shell/storage';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
export function historicalLevels(generate = generateLevel): void {
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
    const expected = HISTORICAL_ROWS.map(rows=>rows.flatMap((line,row)=>Array.from(line).flatMap((token,col)=>
        token === '.' ? [] : [{row,col,color:Number(token) as Color}])));
    assert.deepEqual(LEVELS.slice(0,10).map((l,i)=>generate(i,l.seed)), expected);
    for (let i=0;i<30;i++) {
        assert.deepEqual(generate(i,10),generate(i,10));
        assert.ok(JSON.stringify(generate(i,10)) !== JSON.stringify(generate(i,11)));
    }
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
    e.load([{row:0,col:4,color:0,kind:'bomb'},{row:1,col:4,color:0},
        {row:0,col:5,color:1,kind:'bomb'},{row:0,col:6,color:2},
        {row:0,col:3,color:2,kind:'stone'},{row:0,col:8,color:2}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:3,color:2,kind:'stone'},{row:0,col:8,color:2}]);
    assert.equal(e.last.popped.length,5);
}
export function ice(EngineClass = Engine): void {
    const e = new EngineClass();
    const pair: Cell[] = [{row:0,col:4,color:0},{row:1,col:4,color:0}];
    e.load([...pair,{row:0,col:5,color:1,kind:'ice',ice:2},{row:0,col:0,color:1,kind:'ice',ice:2}]);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:5,color:1,kind:'ice',ice:1},{row:0,col:0,color:1,kind:'ice',ice:2}]);
    e.grid.push(...pair);
    resolve(e,{row:2,col:4,color:0});
    assert.deepEqual(e.grid,[{row:0,col:5,color:1},{row:0,col:0,color:1,kind:'ice',ice:2}]);
}
export function rainbow(EngineClass = Engine): void {
    const e = new EngineClass(); e.loadLevel(16);
    e.load([{row:0,col:4,color:1},{row:1,col:4,color:1},{row:0,col:0,color:0}],0);
    resolve(e,{row:2,col:4,color:0});
    assert.equal(e.last.attached?.color,1);
    assert.equal(e.last.popped.length,3);
    assert.deepEqual(e.grid,[{row:0,col:0,color:0}]);
    for (let shot=1;shot<=6;shot++) {
        assert.equal(e.rainbow,shot === 3 || shot === 6);
        e.grid = [{row:0,col:0,color:0},{row:0,col:8,color:1}];
        e.next = 0;
        resolve(e,{row:1,col:7,color:0});
        assert.equal(e.last.attached?.color,shot === 3 || shot === 6 ? 1 : 0);
    }
}
export function stars(EngineClass = Engine): void {
    const e = new EngineClass(); e.loadLevel(24);
    e.load([{row:0,col:4,color:0},{row:1,col:4,color:0},{row:1,col:5,color:1,kind:'star'},{row:0,col:0,color:1}],0);
    e.resolved = 5; e.shots = 5;
    resolve(e,{row:2,col:4,color:0});
    assert.equal(e.status,'won');
    assert.equal(e.drops,0);
    assert.deepEqual(e.last.fallen,[{row:1,col:5,color:1,kind:'star'}]);
    assert.deepEqual(e.grid,[{row:0,col:0,color:1}]);
    e.load([{row:0,col:4,color:0},{row:1,col:4,color:0},{row:1,col:5,color:1,kind:'star'},
        {row:0,col:0,color:1},{row:1,col:0,color:1,kind:'star'}],0);
    resolve(e,{row:2,col:4,color:0});
    assert.equal(e.status,'playing');
    assert.equal(e.grid.filter(c=>c.kind === 'star').length,1);
    e.next=1;
    resolve(e,{row:0,col:1,color:1});
    resolve(e,{row:0,col:2,color:1});
    assert.equal(e.status,'won');

}
export function bumpers(EngineClass = Engine): void {
    const e = new EngineClass(); e.loadLevel(25); e.load([]);
    const first = e.trace(-0.3).segments[0];
    assert.ok(first);
    assert.equal(first.bounce,true);
    assert.ok(Math.abs(first.to.x - 100) < 0.000001);
    assert.ok(Math.abs(first.to.y - (570 - 80 / Math.tan(0.3))) < 0.000001);
    const second = e.trace(-0.3).segments[1];
    assert.ok(second);
    assert.equal(second.direction.x,-first.direction.x);
    assert.equal(second.direction.y,first.direction.y);
    const right=e.trace(0.3).segments[0];
    assert.ok(right);
    assert.equal(right.bounce,true);
    assert.ok(Math.abs(right.to.x - 260) < 0.000001);
    assert.ok(Math.abs(right.to.y - (570 - 80 / Math.tan(0.3))) < 0.000001);
    assert.deepEqual(e.bumpers,[{x:100,top:290,bottom:380},{x:260,top:290,bottom:380}]);

}
export function trajectoryCopies(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{row:0,col:4,color:0}]);
    const first=e.trace(0.05);
    assert.deepEqual(first.target,{row:1,col:4,color:0});
    if(first.target) first.target.col=0;
    const segment=first.segments[0];
    assert.ok(segment); segment.to.x=-100;
    const again=e.trace(0.05);
    assert.deepEqual(again.target,{row:1,col:4,color:0});
    assert.ok((again.segments[0]?.to.x ?? 0) > 180);
    const other=new EngineClass();
    other.load([{row:0,col:4,color:1}],1);
    assert.deepEqual(other.trace(0.05).target,{row:1,col:4,color:1});
    assert.equal(other.trace(0.05).struck?.color,1);
    e.load([{row:0,col:0,color:0}]);
    assert.deepEqual(e.trace(0.05).target,{row:0,col:5,color:0});
    e.load([]);
    assert.ok(Math.abs((e.trace(-0.3).segments[0]?.to.x ?? 0)-20)<0.000001);
    other.loadLevel(25); other.load([]);
    assert.ok(Math.abs((other.trace(-0.3).segments[0]?.to.x ?? 0)-100)<0.000001);
}
