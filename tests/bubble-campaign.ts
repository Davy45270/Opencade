import assert from './bubble-assert';
import { Engine } from '../src/engines/bubble/engine';
import { solutions } from './bubble-solutions';
export function campaign(EngineClass = Engine) {
    assert.equal(solutions.length, 30);
    return solutions.map((sequence, index) => {
        const engine = new EngineClass(28); engine.loadLevel(index, 28);
        for (const shot of sequence) {
            assert.equal(engine.status, 'playing', `L${String(index + 1)} premature end`);
            if (shot.swap) assert.equal(engine.swap(), true);
            engine.aim(shot.angle);
            assert.equal(engine.shoot(), true);
            engine.advance(10000);
        }
        assert.equal(engine.status, 'won', `L${String(index + 1)}`);
        assert.equal(engine.shots, sequence.length);
        return { level: index + 1, shots: engine.shots, won: engine.status === 'won' };
    });
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
