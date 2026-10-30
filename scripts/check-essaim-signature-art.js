/* global console, EventTarget */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(name,context,next) {
    if(name==='phaser') return {shortCircuit:true,url:'data:text/javascript,export default {Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},Display:{Color:{ValueToColor:v=>({r:v>>16&255,g:v>>8&255,b:v&255}),Interpolate:{ColorWithColor:a=>a},GetColor:(r,g,b)=>(r<<16)|(g<<8)|b}}}'};
    return next(name,context);
}});
const { EssaimArt }=await import('../src/games/essaim/art.ts');
const { Engine,TICK }=await import('../src/engines/essaim/engine.ts');
const { pilotWithSignature }=await import('../src/engines/essaim/pilot.ts');
const { selectCharacter }=await import('../src/characters/selection.ts');
let reduced=false;
globalThis.matchMedia=()=>Object.defineProperty(new EventTarget(),'matches',{get:()=>reduced});
let signatureTrails=0, blastRings=0;
const textures=new Set(); let generations=0,images=0,graphics=0;
function graphic() {
    graphics++;
    const object={active:true,visible:true,destroy(){ graphics--; }};
    let width=0;
    const g=new Proxy(object,{get:(target,key)=>target[key] ?? ((...args)=>{
        if(key==='lineStyle') width=args[0];
        if(key==='lineBetween' && width===12) signatureTrails++;
        if(key==='strokeCircle' && width===4) blastRings++;
        if(key==='generateTexture'){ assert(!textures.has(args[0])); textures.add(args[0]); generations++; }
        return g;
    })}); return g;
}
function image() {
    images++;
    const object={active:true,visible:true,setVisible(v){this.visible=v;return this;},destroy(){images--;}};
    const i=new Proxy(object,{get:(target,key)=>target[key] ?? (()=>i)}); return i;
}
const scene={add:{graphics:graphic,image},make:{graphics:graphic},textures:{exists:key=>textures.has(key)},cameras:{main:{shake(){},shakeEffect:{reset(){}}}}};
export const artMeasurements=[];
for(const id of ['panda','pandaroux','dragon','singe','licorne']) {
    selectCharacter(id,undefined); const art=new EssaimArt(scene),e=new Engine(0,458); e.enableSignature(id);
    const initial=generations,slots=[...art.pool.particles]; let peak=0,used=0;
    assert.equal(graphics,3); assert.equal(images,258);
    for(let frame=0;frame<2000;frame++) {
        if(e.status!=='playing'){e.loadLevel(frame%30,458);e.enableSignature(id);art.reset();}
        pilotWithSignature(e,frame);e.step(TICK);art.update(e.state,TICK,e.events);
        if(frame%9===0) art.pool.burst(180,240,false,true);
        art.draw(e.state,e.level,e.dronePositions());
        const stats=art.stats();peak=Math.max(peak,stats.particles);used=Math.max(used,stats.livery.used);
        assert(stats.particles<=96);assert(stats.livery.used<256);assert.equal(stats.activeGraphics,5);
        assert.equal(generations,initial);assert.equal(graphics,3);assert.equal(images,258);
        assert(art.pool.particles.every((p,index)=>p===slots[index]));
    }
    artMeasurements.push({id,steps:2000,peakParticles:peak,particleCapacity:96,peakImagesUsed:used,imageCapacity:256,retainedObjects:261,textureGenerationsDuringPlay:generations-initial});
    art.destroy();assert.equal(images,2); // The scene owns the two cloud images and three Graphics.
    images=0;graphics=0;
}
console.log(JSON.stringify(artMeasurements,null,2));

// Render actual scene calls in both motion modes, with each signature in isolation.
for (const id of ['panda','pandaroux','dragon','singe','licorne']) {
    selectCharacter(id,undefined); const art=new EssaimArt(scene), e=new Engine(); e.enableSignature(id);
    const s=e.state.signature;
    s.held=true; s.charge=1; e.holdSignature(false);
    for (const mode of [false,true]) {
        reduced=mode; signatureTrails=0;
        art.draw(e.state,0,[]);
        assert.equal(signatureTrails,mode ? 0 : s.projectiles.length, 'signature trails respect reduced motion');
    }
    art.destroy(); images=0; graphics=0;
}
reduced=false;
const art=new EssaimArt(scene), e=new Engine(); e.enableSignature('dragon');
e.state.signature.held=true; e.state.signature.charge=1; e.holdSignature(false);
const projectile=e.state.signature.projectiles[0]; projectile.y=211; projectile.terminal=210;
const {stepSignature}=await import('../src/engines/essaim/signature.ts');
for(let tick=0;tick<=20;tick++) {
    stepSignature(e.state.signature,[],tick,()=>0); blastRings=0; art.draw(e.state,0,[]);
    assert.equal(blastRings,tick<20 ? 1 : 0, 'blast remains visible through age 19 then disappears');
}
art.destroy();
