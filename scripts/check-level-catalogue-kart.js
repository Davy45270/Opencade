/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(name, context, next) {
    if (name==='phaser') return {shortCircuit:true,url:'data:text/javascript,export default {Scene:class {}}'};
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return {shortCircuit:true,url:'data:text/javascript,export const sound={};'};
    return next(name,context);
} });
const { kartFootprint }=await import('../src/engines/derapage/track.ts');
const { Engine }=await import('../src/engines/derapage/engine.ts');
const { DerapageScene }=await import('../src/games/derapage/scene.ts');
const { RoadLayer }=await import('../src/games/derapage/road.ts');
const { kartRoadArt }=await import('../src/games/derapage/kart-art.ts');
const { recordKart }=await import('./record-level-catalogue-kart.js');
const { kartRecords }=await import('../tests/level-catalogue-kart-recordings.ts');

const graphicsFrameBudget=4, graphicsCallBudget=20000;
export function graphicsChecks(times=[0,713,713,713]) {
    assert(times.length<=graphicsFrameBudget,'Graphics replay frame budget: at most four images');
    assert.deepEqual(times,[0,713,713,713],'complete Graphics replay plan');
    globalThis.window={matchMedia:()=>({matches:false})};
    globalThis.document={querySelector:()=>null};
    for(const [level,colors] of [[17,[0x5ddaff]],[19,[0xeeb83b,0xa83821,0x19212d,0xd69d58]],[26,[0xb92f22,0xffb62e,0xdbaa55,0x211b2b]]]) {
        const scene=Object.create(DerapageScene.prototype),calls=[],baked=[];
        const graphics=new Proxy({}, {get:(_,method)=>(...args)=>{assert(calls.length<graphicsCallBudget,'Graphics call budget per image');calls.push([method,...args]);return graphics;}});
        Object.assign(scene,{engine:new Engine(level),graphics,background:graphics,overviewMode:true,cameraFixed:true,sceneTime:0,traces:[],rivals:[],kartTextures:new Map(),emblemTextures:new Map()});
        const raster=new Proxy({}, {get:(_,method)=>(...args)=>{baked.push([method,...args]);return raster;}});
        const image=new Proxy({}, {get:()=>()=>image});
        Object.assign(scene,{make:{graphics:()=>raster},add:{image:()=>image},textures:{exists:()=>false}});
        scene.road=new RoadLayer(scene);
        let frames=0;
        const render=()=>{const time=times[frames++];scene.sceneTime=time;calls.length=0;scene.draw();return calls.map(c=>[...c]);};
        const first=render();
        if(level===19 || level===26) {
            calls.length=0;
            // Fit the entire physical circuit inside the actual culling viewport.
            kartRoadArt(graphics,scene.engine.track,(x,y)=>({x:x+180,y:y+368}),1,0,level===19);
            for (const call of calls) {
                if (call[0]==='fillEllipse') { call[1]-=180; call[2]-=368; }
            }
            const t=scene.engine.track;
            const expected=level===19 ? [19,20,21,43,44,45,67,68] : [20,21,22,60,61];
            if(level===19) {
                const heaps=calls.filter((c,i)=>c[0]==='fillEllipse' && calls[i-1]?.[0]==='fillStyle' && [0xeeb83b,0xa83821].includes(calls[i-1][1]));
                assert.equal(heaps.length,120,'eight heaps, fifteen ground leaves each');
                const coordinates=(c,index)=>{
                    const a=t.points[index],b=t.points[index+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
                    return {u:((c[1]-a.x)*dx+(c[2]-a.y)*dy)/(length*length),side:Math.abs((c[2]-a.y)*dx-(c[1]-a.x)*dy)/length};
                };
                for(const leaf of heaps) assert(expected.some(i=>{const p=coordinates(leaf,i);return p.u>=-1e-8 && p.u<1 && p.side<t.widths[i]/2;}),'leaf lies in independently specified road intervals');
                for(const i of expected) {
                    const points=heaps.map(c=>coordinates(c,i)).filter(p=>p.u>=-1e-8 && p.u<1 && p.side<t.widths[i]/2);
                    assert(points.length>=15 && Math.min(...points.map(p=>p.u))<.1 && Math.max(...points.map(p=>p.u))>.8,'heap covers the segment length');
                    assert(Math.max(...points.map(p=>p.side))>t.widths[i]*.25,'heap has lateral extent');
                }
            } else {
                const plates=calls.flatMap((c,i)=>c[0]==='lineStyle' && c[2]===0xb92f22 ? [[c,calls[i+1]]] : []);
                assert.equal(plates.length,5);
                for(const [j,index] of expected.entries()) {
                    const [style,line]=plates[j];
                    const plate=kartFootprint(t,index,'lava');
                    assert.deepEqual(style,['lineStyle',plate.half*2,0xb92f22,1]);
                    assert.deepEqual(line,['lineBetween',plate.a.x+180,plate.a.y+368,plate.b.x+180,plate.b.y+368],'lava interval endpoints');
                }
            }
        }
        const complete=[...baked,...first];
        for(const color of colors) {
            const styles=complete.map((c,i)=>c[0]==='fillStyle' && c[1]===color || c[0]==='lineStyle' && c[2]===color ? i : -1).filter(i=>i>=0);
            assert(styles.length>0,`visible Graphics style ${level}/${color}`);
            assert(styles.some(i=>['fillEllipse','fillRect','lineBetween'].includes(complete[i+1]?.[0])),`style must produce geometry ${level}/${color}`);
        }
        // Compare only animated surface geometry, with identical camera and engine state.
        const animated=(list,color)=>list.flatMap((c,i)=>c[0]==='fillStyle' && c[1]===color || c[0]==='lineStyle' && c[2]===color ? [list[i+1]] : []);
        const color=level===19 ? 0xffcc64 : level===26 ? 0xffb62e : 0xe2ffff;
        assert.notDeepEqual(animated(first,color),animated(render(),color),`scene time animates ${level}`);
        assert.deepEqual(render(),render(),'same scene time is deterministic');
        assert.equal(frames,graphicsFrameBudget,'four Graphics images per circuit');
        assert.equal(baked.filter(c=>c[0]==='generateTexture').length,1,'fixed catalogue art shares one rasterization');
        scene.road.destroy();
    }
}
export function provenanceChecks() {
    // Full provenance is checked during the single complete catalogue replay.
    // Here only validate the event envelope; never generate then replay it again.
    const tape=kartRecords.find(r=>r.level===19 && r.mode==='joystick');
    assert(tape);

    assert.deepEqual(recordKart(19,'joystick',18).inputs,tape.inputs.filter(event=>event[0]<18),'actual generator seam: delayed rather than next observation');
    const {inputs}=tape;
    assert(inputs.length>100 && inputs.slice(1).every(event=>event[0]%9===0),'150 ms command cadence');
}
assert.throws(()=>graphicsChecks([0,713,713,713,713]),
    {name:'AssertionError',message:'Graphics replay frame budget: at most four images'});
for(const [name,check] of [['Graphics catalogue Kart',graphicsChecks],['provenance joystick',provenanceChecks]]) {
    const start=performance.now();check();const ms=performance.now()-start;
    console.log(`${name}: OK (${ms.toFixed(1)} ms)`);
}
