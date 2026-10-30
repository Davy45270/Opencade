import assert from 'node:assert/strict';
import { Engine } from '../src/engines/derapage/engine';
import { controller } from '../src/engines/derapage/ai';
import { nearest, shortcutAt, wrap } from '../src/engines/derapage/track';
import { Random } from '../src/engines/shared/random';
import { required } from '../src/engines/derapage/access';
export interface KartRecording {
    level: number; seed: number; mode: 'keyboard' | 'joystick'; shortcut: boolean; frames: number;
    inputs: number[][]; result: number[]; laps: number[]; score: number;
}
export function kartPilot(e: Engine, shortcut: boolean) {
    const k=required(e.karts[0]), t=e.track, n=nearest(t,k), route=t.circuit.shortcut;
    const input=controller(k,t);
    if (shortcut && route && n.index >= route.from-1 && n.index < route.to-1) {
        const branch=required(shortcutAt(t,k)), a=required(t.points[route.from]), b=required(t.points[route.to]);
        const u=Math.min(1,branch.u+8/branch.length), x=a.x+(b.x-a.x)*u, y=a.y+(b.y-a.y)*u;
        input.steer=Math.max(-1,Math.min(1,wrap(Math.atan2(y-k.y,x-k.x)-k.angle)*2.8));
    }
    return input;
}
export function kartWitness(e: Engine): number[] {
    const k=required(e.karts[0]);
    return [k.x,k.y,k.angle,k.vx,k.vy,k.lap,k.passed,k.hits,e.frames];
}
export const kartFrameBudget = 12000;
export function checkKartReplayBudget(tape: KartRecording): void {
    let constructed=0;
    class UnusedEngine extends Engine {
        constructor(level: number, seed: number) { super(level,seed); constructed++; }
    }
    assert.throws(()=>replayKart({...tape,frames:kartFrameBudget+1},UnusedEngine),
        {name:'AssertionError',message:'kart replay frame budget: 1 to 12000'});
    assert.throws(()=>replayKart({...tape,inputs:Array.from({length:tape.frames+1},()=>[0,0])},UnusedEngine),
        {name:'AssertionError',message:'kart replay input budget: at most one event per frame'});
    assert.equal(constructed,0,'over-budget tape refused before constructing the simulation');
}
export function replayKart(tape: KartRecording, EngineType: typeof Engine=Engine): Engine {
    assert(Number.isInteger(tape.frames) && tape.frames>0 && tape.frames<=kartFrameBudget,'kart replay frame budget: 1 to 12000');
    assert(tape.inputs.length>0 && tape.inputs.length<=tape.frames,'kart replay input budget: at most one event per frame');
    const e=new EngineType(tape.level,tape.seed);
    let cursor=0,pending=required(e.karts[0]).angle;
    const random=new Random(67);
    for (let frame=0;frame<tape.frames;frame++) {
        if (tape.inputs[cursor+1]?.[0] === frame) cursor++;
        const event=required(tape.inputs[cursor]);
        if(tape.mode==='joystick' && frame%9===0) {
            assert.equal(event[1],pending,'seeded delayed generator provenance, every observation');
            const k=required(e.karts[0]),n=nearest(e.track,k),target=required(e.track.points[(n.index+6)%96]);
            pending=Math.atan2(target.y-k.y,target.x-k.x)+(random.next()*2-1)*.35;
        }
        assert(e.status === 'playing', 'tape ends at the first result');
        e.input(tape.mode === 'joystick'
            ? { steer:0, drift:false, bonus:false, mode:'joystick', heading:required(event[1]), assist:true }
            : { steer:required(event[1]), drift:false, bonus:event[2] === 1 });
        e.step(1000/60);
    }
    assert.equal(e.status,'won'); assert.equal(required(e.karts[0]).lap,3);
    assert.deepEqual(kartWitness(e),tape.result); assert.deepEqual(e.lapTimesMs,tape.laps); assert.equal(e.score,tape.score);
    return e;
}
