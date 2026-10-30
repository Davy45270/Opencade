import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import { Engine } from '../src/engines/derapage/engine';
import { controller } from '../src/engines/derapage/ai';
import { beginThumb, moveThumb, thumbDirection, thumbIntensity } from '../src/games/derapage/joystick';
import { required } from '../src/engines/derapage/access';
import * as view from '../src/games/derapage/view3d';
import { boostStrip, kartFootprint, onShortcut as moduleGroundShortcut } from '../src/engines/derapage/track';
import { readSave, writeSave, type StoragePort } from '../src/shell/storage';
const noop = (): void => {};
const graphicMethods = { fillPoints:noop, fillStyle:noop,fillRect:noop,fillEllipse:noop,fillCircle:noop,fillTriangle:noop,lineStyle:noop,lineBetween:noop };
const graphics=graphicMethods as unknown as Phaser.GameObjects.Graphics;
function deepFreeze(value: unknown): void {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) deepFreeze(child);
        Object.freeze(value);
    }
}
export function createViewCases(module: typeof view = view) {
const {Cadence,draw3d,groundPoint,groundDistance,HORIZON,projectPoint,screenHeading}=module;
return [
    { name:'Y01 rendu 3D sur snapshots profondément gelés, sans mutation', run() {
        for (const level of [0,17,19,26,29]) {
            const engine=new Engine(level,28);
            for (let frame=0;frame<3;frame++) {
                engine.step(1000/60);
                const snapshot=engine.snapshot(),before=structuredClone(snapshot);
                deepFreeze(snapshot);
                for (let image=0;image<3;image++) {
                    assert.doesNotThrow(()=>draw3d(graphics,snapshot,noop));
                    assert.deepStrictEqual(snapshot,before);
                    assert.deepStrictEqual(engine.snapshot(),before);
                }
            }
        }
    }},
    { name:'Y02 même course et entrées horodatées, rendu branché jusqu’à la fin', run() {
        const a=new Engine(0,28),b=new Engine(0,28);
        assert.equal(a.karts[0]?.lap,0);
        for(let frame=0;frame<12000 && a.status==='playing';frame++) {
            const k=a.karts[0]; assert.ok(k);
            const input=controller(k,a.track);
            a.input(input); b.input(input); a.step(1000/60); b.step(1000/60);
            // Render the normal start and regularly during all three laps.
            if(frame%2000===0) {
                const before=b.snapshot(false);
                draw3d(graphics,before,noop);
                assert.deepEqual(b.snapshot(false),before,'render is read only');
            }
            assert.deepEqual(a.karts,b.karts);
            assert.equal(a.time,b.time);
        }
        assert.equal(required(a.karts[0]).lap,3);
        assert.equal(a.lapTimesMs.length,3);
        assert.deepEqual(a.snapshot(),b.snapshot());
        assert.notEqual(a.status,'playing');
        assert.equal(a.time,b.time); assert.deepEqual(a.snapshot().order,b.snapshot().order);
    }},
    { name:'Y03 projection finie, monotonie, cap et budget déterministe', run() {
        const camera={x:0,y:0,angle:0};
        const near=projectPoint({x:10,y:0},camera),far=projectPoint({x:50,y:0},camera);
        assert.ok(near && far); assert.ok(far.y<near.y && far.scale<near.scale);
        for(const angle of [-2,-.5,0,1,Math.PI]) {
            const c={x:12,y:-8,angle};
            const right={x:c.x+Math.cos(angle)*20-Math.sin(angle)*3,y:c.y+Math.sin(angle)*20+Math.cos(angle)*3};
            assert.ok((projectPoint(right,c)?.x ?? 0)>180,'right stays on the right');
            for(const [x,y] of [[30,260],[180,400],[320,600]]) {
                assert.ok(x!==undefined && y!==undefined);
                const q=projectPoint(groundPoint(x,y,c),c); assert.ok(q);
                assert.ok(Math.abs(q.x-x)<1e-8 && Math.abs(q.y-y)<1e-8,'ground round trip');
            }
        }
        assert.equal(near.x,180); assert.equal(projectPoint({x:-20,y:0},camera),null);
        assert.equal(projectPoint({x:200,y:0},camera),null);
        assert.ok(Number.isFinite(groundDistance(HORIZON)));
        assert.ok(groundDistance(300)>groundDistance(500));
        const e=new Engine(29,28),before=e.snapshot();
        const cost=draw3d(graphics,before,noop);
        assert.equal(cost.lines,107); assert.equal(cost.samples,3210);
        assert.equal(cost.segmentChecks,3210*97);
        assert.ok(cost.boostChecks<=3210*before.track.boosts.length);
        assert.deepEqual(draw3d(graphics,before,noop),cost);
        assert.deepEqual(e.snapshot(),before);
    }},
    { name:'décors et couleurs des trois circuits kart, karts triés et réduits avec la distance', run() {
        for(const level of [17,19,26]) {
            const e=new Engine(level,28),colors=new Set<number>();
            const painter={...graphicMethods,fillStyle:(color:number)=>{colors.add(color);}} as unknown as Phaser.GameObjects.Graphics;
            const p=e.karts[0]; assert.ok(p);
            const c=Math.cos(p.angle),s=Math.sin(p.angle);
            for(const [i,k] of e.karts.entries()) Object.assign(k,{x:p.x+c*i*12,y:p.y+s*i*12,jumpHeight:0});
            const positions: {y:number;size:number}[]=[];
            draw3d(painter,e.snapshot(),(_id,_x,y,size)=>{positions.push({y,size});});
            assert.ok(colors.has(e.track.circuit.theme.ground));
            assert.ok(colors.has(e.track.circuit.theme.road ?? 0));
            assert.ok(positions.length>=2);
            for(let i=1;i<positions.length;i++) {
                const previous=positions[i-1],next=positions[i]; assert.ok(previous && next);
                assert.ok(next.y>=previous.y); assert.ok(next.size>=previous.size);
            }
        }
    }},
    { name:'Graphics : chaque catégorie conserve couleur et position projetée', run() {
        type Call={method:string;args:unknown[];color:number};
        let color=0;
        const calls:Call[]=[];
        const recorder=new Proxy({}, {get:(_target,method:string)=>(...args:unknown[])=>{
            if(method==='fillStyle' || method==='lineStyle') color=Number(args[method==='fillStyle' ? 0 : 1]);
            calls.push({method,args,color});
        }}) as Phaser.GameObjects.Graphics;
        const aim=(e:Engine,q:{x:number;y:number},angle=.35):void=>{
            Object.assign(required(e.karts[0]),{x:q.x-Math.cos(angle)*24,y:q.y-Math.sin(angle)*24,angle});
        };
        const render=(e:Engine):void=>{calls.length=0;draw3d(recorder,e.snapshot(),noop);};
        const close=(a:unknown,b:number):boolean=>typeof a==='number' && Math.abs(a-b)<1e-7;
        const has=(method:string,expectedColor:number,x:number,y:number):boolean=>calls.some(c=>c.method===method && c.color===expectedColor && close(c.args[0],x) && close(c.args[1],y));
        for(const [kind,level,expectedColor] of [['ramp',29,0xdbaa55],['gap',26,0x211b2b],['leaves',19,0xeeb83b],['lava',26,0xb92f22]] as const) {
            const e=new Engine(level,28),indices=kind==='ramp' ? e.track.circuit.jumps : e.track.circuit[kind];
            assert.ok(indices?.length,kind);
            const f=kartFootprint(e.track,required(indices[0]),kind); aim(e,f.a); render(e);
            const expected=projectPoint({x:f.a.x+f.nx*f.half,y:f.a.y+f.ny*f.half},required(e.karts[0])); assert.ok(expected);
            assert.ok(calls.some(c=>c.method==='fillPoints' && c.color===expectedColor && close((c.args[0] as {x:number}[])[0]?.x,expected.x) && close((c.args[0] as {y:number}[])[0]?.y,expected.y)),kind);
        }
        const e=new Engine(0,28),tree=e.track.trees[0];assert.ok(tree);aim(e,tree);render(e);
        let q=projectPoint(tree,required(e.karts[0]));assert.ok(q);
        assert.ok(has('fillCircle',e.track.circuit.theme.decor,q.x,q.y-5*q.scale),'tree');
        const crate=e.crates[0];assert.ok(crate);aim(e,crate);render(e);q=projectPoint(crate,required(e.karts[0]));assert.ok(q);
        assert.ok(has('fillRect',0xffd166,q.x-1.5*q.scale,q.y-3*q.scale),'crate');
        e.puddles.push({x:crate.x,y:crate.y,remaining:1000,owner:1});render(e);
        assert.ok(has('fillEllipse',0x302842,q.x,q.y),'puddle');
        const gateEngine=new Engine(28,28),gate=gateEngine.track.slalom[0];assert.ok(gate);aim(gateEngine,gate);render(gateEngine);
        q=projectPoint({x:gate.x-gate.nx*gate.half,y:gate.y-gate.ny*gate.half},required(gateEngine.karts[0]));assert.ok(q);
        assert.ok(has('lineBetween',0xe64049,q.x,q.y),'slalom');
        // Each sampled ground cell must retain its world-space meaning after run merging.
        for(const category of ['boost','finish','shortcut'] as const) {
            const ground=new Engine(category==='shortcut' ? 17 : 9,28),t=ground.track;
            const strip=boostStrip(t,required(t.boosts[0]));
            const target=category==='boost' ? strip.point(strip.length/2,0) : category==='finish' ? required(t.points[0]) : required(t.points[required(t.circuit.shortcut).from]);
            aim(ground,target,Math.atan2(required(t.points[1]).y-required(t.points[0]).y,required(t.points[1]).x-required(t.points[0]).x));render(ground);
            let checked=0;
            for(let y=HORIZON;y<640;y+=view.BAND) for(let x=0;x<360;x+=view.COLUMN) {
                const point=groundPoint(x+view.COLUMN/2,y+2,required(ground.karts[0]));
                const f=t.finishLine,dx=f.b.x-f.a.x,dy=f.b.y-f.a.y,len=Math.hypot(dx,dy);
                const along=((point.x-f.a.x)*dx+(point.y-f.a.y)*dy)/len,across=((point.x-f.a.x)*-dy+(point.y-f.a.y)*dx)/len;
                const isFinish=along>=0 && along<=len && Math.abs(across)<1;
                const valid=category==='boost' ? strip.contains(point) && !isFinish : category==='finish' ? isFinish : moduleGroundShortcut(t,point);
                if(!valid) continue;
                const expectedColor=category==='boost' ? 0x64edbd : category==='shortcut' ? 0xd0a267 : (Math.floor(along*2)+Math.floor(across+1))%2 ? 0xffffff : 0x101827;
                assert.ok(calls.some(c=>c.method==='fillRect' && c.color===expectedColor && Number(c.args[0])<=x && Number(c.args[0])+Number(c.args[2])>x && Number(c.args[1])<=y && Number(c.args[1])+Number(c.args[3])>y),category);
                checked++;
            }
            assert.ok(checked>0,category+' visible samples');
        }
        aim(e,required(e.track.points[0]));render(e);
        const a=projectPoint(e.track.finishLine.a,required(e.karts[0]));assert.ok(a);
        assert.ok(has('lineBetween',0xf4e6b1,a.x,a.y),'gantry');
    }},
    { name:'Y04 moyenne sur deux secondes, trois secondes basses et chute brève', run() {
        for(const fps of [4,28,30,32]) {
            const cadence=new Cadence();
            for(let i=0;i<fps*5;i++) cadence.add(1000/fps);
            assert.equal(cadence.fallback,fps<30,`${String(fps)} frames per second for five seconds`);
        }
        const slow=new Cadence();
        for(let i=0;i<48;i++) slow.add(100);
        assert.equal(slow.fallback,false); slow.add(100); assert.equal(slow.fallback,false);
        slow.add(100); assert.equal(slow.fallback,true);
        const brief=new Cadence();
        for(let i=0;i<120;i++) brief.add(1000/60);
        for(let i=0;i<10;i++) brief.add(100);
        for(let i=0;i<240;i++) brief.add(1000/60);
        assert.equal(brief.fallback,false); assert.ok(brief.fps>=30);
        for(const delta of [0,-1,NaN,Infinity]) brief.add(delta);
        assert.equal(brief.fallback,false);
        const healthy=new Cadence(); for(let i=0;i<600;i++) healthy.add(1000/60);
        assert.equal(healthy.fallback,false);
    }},
    { name:'commandes écran : haut garde le cap, droite relative, zone morte et intensité', run() {
        for(const angle of [-2,0,1,Math.PI]) {
            const thumb=beginThumb(1,100,100); moveThumb(thumb,100,60);
            assert.equal(screenHeading(thumbDirection(thumb),angle),angle);
            assert.equal(thumbIntensity(thumb),1);
            moveThumb(thumb,140,100);
            assert.equal(screenHeading(thumbDirection(thumb),angle),angle+Math.PI/2);
            moveThumb(thumb,104,100); assert.equal(screenHeading(thumbDirection(thumb),angle),undefined);
            assert.equal(thumbIntensity(thumb),0);
        }
    }},
    { name:'sauvegarde rétrocompatible, préférence conservée avec records et progression', run() {
        let raw=JSON.stringify({unlocked:3,best:10});
        const storage: StoragePort={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
        const save=readSave(storage,'derapage',30); assert.equal(save.view,undefined);
        save.view='3d'; writeSave(storage,save,'derapage');
        assert.deepEqual(readSave(storage,'derapage',30),save);
        raw=JSON.stringify({...save,view:'invalid'}); assert.equal(readSave(storage,'derapage',30).view,undefined);
    }},
];
}
export const viewCases=createViewCases();
