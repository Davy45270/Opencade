import assert from 'node:assert/strict';
import { Engine } from '../src/engines/derapage/engine';
import { required } from '../src/engines/derapage/access';
import { physics, jumpDuration, type Kart } from '../src/engines/derapage/physics';
import { checkpoint } from '../src/engines/derapage/race';
import { at, distance, inKartHole, kartFootprint, nearest, onShortcut, shortcutAt, wrap } from '../src/engines/derapage/track';
import { circuitKey, legacyCircuits } from '../src/engines/derapage/circuits';
import { readSave, recordCircuitLap } from '../src/shell/storage';
import { kartRecords } from './level-catalogue-kart-recordings';
import { kartPilot, replayKart, checkKartReplayBudget } from './level-catalogue-kart-replay';
const neutral = { steer:0, drift:false, bonus:false };
function actor(e: Engine, index: number, speed=24, lateral=0): Kart {
    const p=at(e.track,required(e.track.distances[index])+.1),q=required(e.track.points[(index+1)%96]),angle=Math.atan2(q.y-p.y,q.x-p.x);
    return { ...required(e.karts[0]), ...p, angle, vx:Math.cos(angle)*speed-Math.sin(angle)*lateral, vy:Math.sin(angle)*speed+Math.cos(angle)*lateral };
}
function surfaceActor(e: Engine,index: number,speed=24,lateral=0): Kart {
    const kind=e.track.circuit.leaves?.includes(index) ? 'leaves' : 'lava';
    const patch=kartFootprint(e.track,index,kind);
    // Start near entry: the twelve-step grip probe must stay on this heap,
    // rather than crossing into the next section's opposite-side heap.
    const u=kind==='leaves' ? .05 : .5;
    return {...actor(e,index,speed,lateral),x:patch.a.x+(patch.b.x-patch.a.x)*u,y:patch.a.y+(patch.b.y-patch.a.y)*u};
}
function recordIdentity(level: number): void {
    const old=required(legacyCircuits[level]).name;
    let raw=JSON.stringify({unlocked:30,best:0,circuitRecords:{[old]:1400,[String(level)]:1234}});
    const storage={ getItem:()=>raw, setItem:(_key: string,value: string)=>{raw=value;} };
    const save=readSave(storage,'derapage',30);
    assert.equal(save.circuitRecords?.[circuitKey(level)],undefined);
    recordCircuitLap(storage,save,level,2345);
    assert.equal(readSave(storage,'derapage',30).circuitRecords?.[old],1234);
    assert.equal(readSave(storage,'derapage',30).circuitRecords?.[circuitKey(level)],2345);
}
export function kartMechanic(code: string, level: number, shortcutLap?: number): void {
    const e=new Engine(level),t=e.track;
    recordIdentity(level);
    if (code==='K01') {
        const route=required(t.circuit.shortcut),a=required(t.points[route.from]),b=required(t.points[route.to]);
        const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2},branch=required(shortcutAt(t,midpoint));
        assert(branch.length < required(t.distances[route.to])-required(t.distances[route.from]));
        assert(route.width < Math.min(...t.widths)); assert(onShortcut(t,midpoint));
        const n=nearest(t,midpoint); assert(n.distance>required(t.widths[n.index])/2,'second road must leave the main road');
        assert(t.trees.every(tree=>required(shortcutAt(t,tree)).distance>route.width/2+tree.radius+1.2),'shortcut has clearance');
        const k={...actor(e,route.from),...midpoint,angle:Math.atan2(b.y-a.y,b.x-a.x),vx:0,vy:0};
        k.vx=Math.cos(k.angle)*24; k.vy=Math.sin(k.angle)*24;
        physics(k,neutral,t,1/60,.43); assert(Math.hypot(k.vx,k.vy)>23,'branch is road, not grass');
        // Compare the verified shortcut replay's opening lap with the same pilot
        // driving the ordinary route in a fresh six-kart engine.
        const normal=new Engine(level);
        for (let frame=0;frame<3000 && required(normal.karts[0]).lap===0;frame++) {
            normal.input(kartPilot(normal,false)); normal.step(1000/60);
        }
        assert.equal(normal.lapTimesMs.length,1);
        assert(shortcutLap !== undefined && shortcutLap < required(normal.lapTimesMs[0]),'shortcut must reduce actual lap time');
        // The branch crosses gate 72. Omitting it never authorizes gate 80 or finish.
        const missed=actor(e,79); missed.gate=9; missed.lap=0;
        checkpoint(missed,required(t.points[78]),t,1000);
        Object.assign(missed,at(t,t.length+1)); checkpoint(missed,at(t,t.length-1),t,2000);
        assert.equal(missed.lap,0); assert.equal(missed.gate,9);
        // Positive gate crossing in the middle of the branch, outside the old road.
        const p=required(t.points[72]),before=required(t.points[71]),after=required(t.points[73]);
        const dx=b.x-a.x,dy=b.y-a.y,tx=after.x-before.x,ty=after.y-before.y;
        const u=((p.x-a.x)*tx+(p.y-a.y)*ty)/(dx*tx+dy*ty);
        const gateKart={...actor(e,65),x:a.x+dx*(u+.001),y:a.y+dy*(u+.001),gate:9};
        checkpoint(gateKart,{x:a.x+dx*(u-.001),y:a.y+dy*(u-.001)},t,500);
        assert.equal(gateKart.gate,10); assert.equal(gateKart.passed,1);
    } else if (code==='K02') {
        assert(t.circuit.tunnel.length>0);
        surfaceReference(e,'leaves',[19,20,21,43,44,45,67,68]);
        const leaf=surfaceActor(e,19,20,6),clean={...leaf},air={...leaf,jumpMs:1000,jumpDurationMs:1000};
        // Isolate grip from pads: the new layout places a boost in this section.
        const gripTrack={...t,boosts:[]}, dry={...gripTrack,circuit:{...t.circuit,leaves:[]}};
        const forward=(k: Kart)=>k.vx*Math.cos(k.angle)+k.vy*Math.sin(k.angle);
        const lateral=(k: Kart)=>Math.abs(-k.vx*Math.sin(k.angle)+k.vy*Math.cos(k.angle));
        for(let frame=0;frame<12;frame++) {
            assert(kartFootprint(t,19,'leaves').contains(leaf),'grip probe remains on the real heap');
            physics(leaf,neutral,gripTrack,1/60,.43); physics(clean,neutral,dry,1/60,.43); physics(air,neutral,gripTrack,1/60,.43);
        }
        assert(lateral(leaf)>lateral(clean)*3,'leaves prolong lateral sliding');
        assert(Math.abs(forward(leaf)-forward(clean))<.000001,'leaves do not impose a grass speed cap');
        // Counterproof: leaf grip must not affect a kart above the heaps.
        const dryAir={...surfaceActor(e,19,20,6),jumpMs:1000,jumpDurationMs:1000};
        for(let frame=0;frame<12;frame++) physics(dryAir,neutral,dry,1/60,.43);
        assert.equal(lateral(air),lateral(dryAir));
        const commanded=surfaceActor(e,19,20,6), commandedDry={...commanded};
        for(let frame=0;frame<12;frame++) {
            const input={...neutral,steer:.2,drift:true};
            physics(commanded,input,gripTrack,1/60,.43); physics(commandedDry,input,dry,1/60,.43);
        }
        assert(commanded.driftMs>=199 && commandedDry.driftMs>=199,'commanded drift is active');
        assert(lateral(commanded)>lateral(commandedDry)*1.15,'leaf grip remains reduced during commanded drift');
    } else {
        surfaceReference(e,'lava',[20,21,22,60,61]);
        const hot={...surfaceActor(e,20),boostMs:900,specialMs:700,driftMs:800,item:'turbo' as const},road=surfaceActor(e,20);
        const cool={...t,circuit:{...t.circuit,lava:[]}};
        physics(hot,neutral,t,1/60,.43); physics(road,neutral,cool,1/60,.43);
        assert(Math.hypot(hot.vx,hot.vy)<Math.hypot(road.vx,road.vy)*.5);
        assert.equal(hot.boostMs,0); assert.equal(hot.specialMs,0); assert.equal(hot.item,null); assert.equal(hot.driftMs,0);
        const airborne={...surfaceActor(e,20),jumpMs:300,jumpDurationMs:400,boostMs:900,item:'turbo' as const};
        physics(airborne,neutral,t,1/60,.43); assert(airborne.boostMs>0); assert.equal(airborne.item,'turbo');
        const ramp=required(t.circuit.jumps[0]),gap=required(t.circuit.gap?.[0]); assert(ramp<gap);
        rampAndBypass(e);
        const launch=required(t.distances[ramp])+(required(t.distances[ramp+1])-required(t.distances[ramp]))*.7;
        const jump={...actor(e,ramp),...at(t,launch)};
        let crossed=false,launched=false;
        for(let frame=0;frame<45;frame++) {
            physics(jump,neutral,t,1/60,.43);
            if(jump.jumpMs>0) { launched=true; assert((jump.jumpDurationMs ?? 0)<=jumpDuration(32)); }
            const section=nearest(t,jump);
            if(section.index===gap && section.along < required(t.distances[gap])+(required(t.distances[gap+1])-required(t.distances[gap]))*(t.circuit.gapEnd ?? 1)) { assert(jump.jumpMs>0,'jump covers the missing deck'); crossed=true; }
        }
        assert(launched&&crossed); assert(nearest(t,jump).index>gap); assert.equal(jump.jumpMs,0);
        // Missed ramp: actual moving kart traverses the outer deck and regains control.
        const slow={...actor(e,ramp,12),...at(t,launch)};
        let used=false,stop=0,longest=0,side=0;
        for(let frame=0;frame<600;frame++) {
            physics(slow,kartPilotInput(slow,t),t,1/60,.43);
            used ||= slow.bypassIndex!==undefined;
            if(slow.bypassIndex!==undefined) side=Math.max(side,nearest(t,slow).distance);
            stop=Math.hypot(slow.vx,slow.vy)<2 ? stop+1 : 0; longest=Math.max(longest,stop);
            if(used && slow.bypassIndex===undefined) break;
        }
        assert(used); assert(side>required(t.widths[gap])*.3,'fallback actually follows the side deck');
        assert.equal(slow.bypassIndex,undefined); assert(longest/60<.5); assert(nearest(t,slow).index>=gap+1);
        assert(distance(slow,required(t.points[ramp]))>5);
        const crowd=new Engine(level), start=at(t,required(t.distances[ramp])+(required(t.distances[ramp+1])-required(t.distances[ramp]))*.85);
        for(const kart of crowd.karts) Object.assign(kart,actor(crowd,ramp,12),start,{id:kart.id});
        let routed=false,stalled=0,maxStalled=0;
        for(let frame=0;frame<600;frame++) {
            const kart=required(crowd.karts[0]);
            crowd.input(kartPilotInput(kart,t)); crowd.step(1000/60);
            routed ||= kart.bypassIndex!==undefined;
            stalled=Math.hypot(kart.vx,kart.vy)<2 ? stalled+1 : 0; maxStalled=Math.max(maxStalled,stalled);
            if(routed && kart.bypassIndex===undefined) break;
        }
        assert(routed); assert.equal(required(crowd.karts[0]).bypassIndex,undefined); assert(maxStalled/60<.5,'six queued karts cannot block the fallback');
    }
}
function kartPilotInput(k: Kart,t: Engine['track']) {
    const p=at(t,nearest(t,k).along+8);
    return {...neutral,mode:'joystick' as const,heading:Math.atan2(p.y-k.y,p.x-k.x)};
}
export function kartCatalogue(code: string, level: number, run: (name: string,check: ()=>void)=>void=(_name,check)=>{check();}): void {
    const tapes=kartRecords.filter(r=>r.level===level); assert.equal(tapes.length,2);
    assert(tapes.some(r=>r.mode==='joystick'));
    for(const tape of tapes) checkKartReplayBudget(tape);
    for(const tape of tapes) run(`${code} ${tape.mode}`,()=>{replayKart(tape);});
    run(`${code} mécanique`,()=>{kartMechanic(code,level,tapes.find(t=>t.shortcut)?.laps[0]);});
}

/** Expected intervals and lateral coverage are independent of generated surface points. */
function surfaceReference(e: Engine, kind: 'leaves' | 'lava', expected: number[]): void {
    const t=e.track;
    assert.deepEqual(t.circuit[kind],expected);
    for(const [j,index] of expected.entries()) {
        const patch=kartFootprint(t,index,kind),a=required(t.points[index]),b=required(t.points[index+1]),len=distance(a,b);
        const signed=((patch.a.y-a.y)*(b.x-a.x)-(patch.a.x-a.x)*(b.y-a.y))/len;
        assert.equal(Math.sign(signed),j%2 ? -1 : 1,'hazards alternate sides');
        assert(required(t.widths[index])-patch.half*2>=4.8,'two kart widths remain free');
        assert(!patch.contains(at(t,(required(t.distances[index])+required(t.distances[index+1]))/2)),'centre stays clear');
    }
    for(let index=0;index<96;index++) for(const u of [.05,.5,.95]) for(const fraction of [-.55,-.49,0,.49,.55]) {
        const a=required(t.points[index]),b=required(t.points[(index+1)%96]);
        const length=Math.hypot(b.x-a.x,b.y-a.y),width=required(t.widths[index]);
        const p={x:a.x+(b.x-a.x)*u-(b.y-a.y)/length*width*fraction,y:a.y+(b.y-a.y)*u+(b.x-a.x)/length*width*fraction};
        assert.equal(expected.includes(index) && (expected.indexOf(index)%2 ? fraction<-.3 && fraction>-.5 : fraction>.3 && fraction<.5),
            (t.circuit[kind] ?? []).includes(index) && kartFootprint(t,index,kind).contains(p),`${kind}/${String(index)}/${String(u)}/${String(fraction)}`);
    }
    for(let index=0;index<96;index++) {
        const k=actor(e,index,20,6),clean={...k},dry={...t,circuit:{...t.circuit,[kind]:[]}};
        // Mid-segment probe independent of the surface's own generated geometry.
        const mid=at(t,(required(t.distances[index])+required(t.distances[index+1]))/2),a=required(t.points[index]),b=required(t.points[(index+1)%96]),len=distance(a,b);
        const side=(expected.indexOf(index)%2 ? -1 : 1)*required(t.widths[index])*.4;
        Object.assign(k,{x:mid.x-(b.y-a.y)/len*side,y:mid.y+(b.x-a.x)/len*side});
        Object.assign(clean,{x:k.x,y:k.y});
        physics(k,neutral,t,1/60,.43);physics(clean,neutral,dry,1/60,.43);
        const changed=Math.hypot(k.vx-clean.vx,k.vy-clean.vy)>.01;
        assert.equal(changed,expected.includes(index),`engine ${kind} segment ${String(index)}`);
    }
}
export function rampAndBypass(e=new Engine(26)): void {
    const t=e.track,ramp=required(t.circuit.jumps[0]),gap=required(t.circuit.gap?.[0]);
    const place=(index: number,u: number,side: number,speed: number): Kart=>{
        const a=required(t.points[index]),b=required(t.points[index+1]),length=distance(a,b);
        return {...actor(e,index,speed),x:a.x+(b.x-a.x)*u-(b.y-a.y)/length*side,y:a.y+(b.y-a.y)*u+(b.x-a.x)/length*side};
    };
    for(const side of [-1,1]) {
        const width=required(t.widths[ramp]);
        const outside=place(ramp,.9,side*(width/2+.2),24);
        physics(outside,neutral,t,1/60,.43); assert.equal(outside.jumpMs,0,'grass cannot launch');
        const edge=place(ramp,.9,side*(width/2-.08),24);
        physics(edge,neutral,t,1/60,.43); assert(edge.jumpMs>0,'both inner ramp edges launch');
    }
    for(const side of [-1,1]) {
        assert(inKartHole(t,place(gap,.3,side*required(t.widths[gap])*.28,0)));
        assert(!inKartHole(t,place(gap,.3,side*required(t.widths[gap])*.30,0)));
    }
    assert(!inKartHole(t,place(gap,.66,0,0)),'hole ends at 65 percent');
    for(const speed of [0,6,12,15,24,32]) for(const side of [-1,0,1]) for(const index of side===0 ? [ramp] : [ramp,gap]) {
        // Approach from either deck or the centre; also reproduce the adverse
        // starting position inside the missing section on the opposite planks.
        const u=index===ramp ? .7 : .3;
        const k=place(index,u,side*required(t.widths[index])*.43,speed);
        let used=false,launched=false,stop=0,longest=0,reverse=0;
        const initialSide=side;
        for(let frame=0;frame<600;frame++) {
            physics(k,kartPilotInput(k,t),t,1/60,.43);
            used ||= k.bypassIndex!==undefined; launched ||= k.jumpMs>0;
            const section=nearest(t,k);
            reverse=Math.abs(wrap(k.angle-Math.atan2(-section.nx,section.ny)))>Math.PI/2 ? reverse+1 : 0;
            assert(reverse<=30,`bypass reverse ${String(speed)}/${String(side)}/${String(index)} at ${String(section.index)} route ${String(k.bypassIndex)}`);
            assert(k.jumpMs>0 || !inKartHole(t,k),`ground hole frame ${String(frame)}, side ${String(side)}, speed ${String(speed)}`);
            if(used && initialSide) assert.equal(k.bypassSide,initialSide,'closest side deck');
            stop=Math.hypot(k.vx,k.vy)<2 ? stop+1 : 0; longest=Math.max(longest,stop);
            if((used || launched) && k.bypassIndex===undefined && nearest(t,k).index>gap) break;
        }
        assert(used || launched,`route or jump: ${String(side)}/${String(speed)}`); assert(nearest(t,k).index>gap,'exits the collapsed section'); assert.equal(k.bypassIndex,undefined); assert(longest<30,'no half-second stop');
    }
}
