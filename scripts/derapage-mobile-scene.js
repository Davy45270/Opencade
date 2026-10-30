/* global console, Event, EventTarget, URLSearchParams, URL, process, performance */
import './ts-loader.js';
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graphicsFps } from './derapage-cadence-model.js';
const graphicsProfile=JSON.parse(readFileSync(new URL('../tests/derapage-graphics-budget.json',import.meta.url),'utf8'));
import { Script } from 'node:vm';
import { transpile } from './transpile.js';

// Only platform ports are doubled: scene, inputs, actor, engines and session are real.
const phaser = `export default { Scene: class {}, Math: { Distance: { BetweenPoints: (a,b) => Math.hypot(a.x-b.x,a.y-b.y) } } };`;
const services = `export const sound = { playEffect(){}, stop(){} }; export const device = { setFinished(){} };`;
registerHooks({
    resolve(name, context, next) {
        if (name === 'phaser') return { url: 'data:text/javascript,' + encodeURIComponent(phaser), shortCircuit: true };
        if (name.endsWith('/shell/services.ts') || name.endsWith('/shell/services') || name === './services') return { url: 'data:text/javascript,' + encodeURIComponent(services), shortCircuit: true };
        return next(name, context);
    },
});
const { PlaySession, setupPause } = await import('../src/shell/pause.ts');
const { Inputs } = await import('../src/shell/input.ts');
const { bindSessionUpdate } = await import('../src/shell/scene-update.ts');
const { selectCharacter } = await import('../src/characters/selection.ts');
const { renderCharacter } = await import('../src/characters/phaser.ts');
const { drawList } = await import('../src/characters/model.ts');
class Element extends EventTarget {
    dataset = {}; style = {}; classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; textWrites = 0; _text = ''; children = [];
    get textContent() { return this._text; }
    set textContent(value) { this.textWrites++; this._text = value; }
    getContext() { return null; }
    setAttribute() {} setPointerCapture() {} remove() {} closest() { return null; }
    getBoundingClientRect() {
        const font=Number.parseFloat(this.style.fontSize);
        return { x:0,y:0,left:0,top:0,width:font ? this.textContent.length*font*.55 : 360,height:font ? font*1.1 : 640 };
    }
    get firstElementChild() { return this.children[0]; }
    append(child) { this.children.push(child); if (child.id) elements.set('#' + child.id, child); }
    replaceChildren() { this.children = []; }
}
// Execute main's production route/update installation with platform ports supplied.
const mainSource = transpile(readFileSync('src/main.ts', 'utf8'))
    .replace(/^import .*;$/gm, '').replace(/export \{\};?/g, '');
const mainScript = new Script(mainSource);
let elements;
let sceneModule;
export function useSceneModule(module) { sceneModule = module; }
function emit(target, type, fields = {}) { const e = new Event(type, { cancelable: true }); for (const [key,value] of Object.entries(fields)) Object.defineProperty(e,key,{value}); target.dispatchEvent(e); }
function tap(id) { const node = elements.get('#' + id); assert(node, id); emit(node, 'pointerdown', { pointerId: 1, pointerType: 'touch' }); emit(node, 'pointerup', { pointerId: 1 }); }
export async function mount(game, id, verifyActors=true) {
    elements = new Map();
    for (const name of ['game', 'touch-controls', 'touch-controls .left', 'play-area', 'pause', 'resume', 'restart', 'retry-level', 'replay-level', 'status']) elements.set('#' + name, new Element());
    const doc = new Element(); doc.querySelector = selector => elements.get(selector) ?? null; doc.createElement = () => new Element(); doc.body = new Element();
    doc.querySelectorAll = () => [];
    globalThis.document = doc; globalThis.window = new Element(); globalThis.HTMLElement = Element; globalThis.window.matchMedia = () => ({ matches: false }); globalThis.location = { search: '?test=1' }; globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: false });
    selectCharacter(id, undefined);
    const module = game==='derapage' && sceneModule ? sceneModule : await import(`../src/games/${game}/scene.ts`);
    const Scene = module[game === 'bubble' ? 'LabScene' : `${game[0].toUpperCase()}${game.slice(1)}Scene`];
    const session = new PlaySession(game !== 'bubble'); session.send('start');
    const inputs = new Inputs(); setupPause(inputs, session);
    const scene = new Scene(session), calls = [];
    const baked = [];
    const graphicsObjects=[];
    const newGraphics=()=>{
        const state={depth:0,visible:true};graphicsObjects.push(state);
        const methods=new Map();
        const port=new Proxy({}, {get:(_,method)=>{
            if(methods.has(method)) return methods.get(method);
            const record=(...args)=>{
            calls.push([method,...args]);
            if(method==='setDepth') state.depth=args[0];
            if(method==='setVisible') state.visible=args[0];
            return port;
            };
            methods.set(method,record);
            return record;
        }});
        return port;
    };
    const g=newGraphics();
    const textures = new Set(), removedTextures = [], images = [];
    scene.textures = { exists: key => textures.has(key), remove: key => { removedTextures.push(key); return textures.delete(key); } };
    scene.make = { graphics: () => new Proxy({}, { get: (_, method) => (...args) => {
        if (method === 'generateTexture') textures.add(args[0]);
        if (scene.road) baked.push([method, ...args]);
        return g;
    } }) };
    const image = () => {
        const sprite = { texture: { key: '' }, placements: {} }; images.push(sprite);
        for (const method of ['setTexture', 'setPosition', 'setDisplaySize', 'setRotation', 'setAlpha', 'setDepth', 'setVisible', 'setOrigin', 'setScale', 'destroy']) sprite[method] = (...args) => {
            sprite.placements[method] = args;
            if (method === 'setTexture') sprite.texture.key = args[0];
            return sprite;
        };
        return sprite;
    };
    scene.add = { graphics: newGraphics, image, text: () => ({ text: '', setText(text) { this.text = text; }, setY() {}, setDepth() { return this; } }) };
    scene.events = { once() {} }; scene.scale = { refresh() {} }; scene.game = { canvas: new Element() };
    scene.input = { handlers: new Map(), on(name, callback) { this.handlers.set(name, callback); } }; scene.create(); inputs.dispose();
    mainScript.runInNewContext({
        document: doc, window: globalThis.window, location: { search: '?test=1', hash: '#/' + game },
        URLSearchParams, matchMedia: globalThis.matchMedia, Inputs, PlaySession, setupPause, bindSessionUpdate,
        setupSound() {}, setupGameMenu() {}, setupCharacters() {}, startThumbnail() {}, browserThumbnailPorts() {},
        browserStorage: () => undefined, readSave() {}, sound: {}, device: { setFinished() {}, setVisible() {}, setPlaying() {} },
        games: [{ id: game, name: game, realtime: game !== 'bubble', createScene(value) { scene.session = value; return scene; } }],
        Phaser: { AUTO: 0, Scale: { FIT: 0, CENTER_BOTH: 0 }, Game: class { scale = { getParentBounds() {}, refresh() {} }; destroy() {} } },
        ResizeObserver: class { observe() {} disconnect() {} },
    });
    const draws = [], actors = [], drawOffsets = [];
    for (const actor of verifyActors ? [scene.hero, ...(scene.rivals ?? [])] : []) {
        const draw = actor.draw.bind(actor);
        actor.draw = (...args) => {
            drawOffsets.push(calls.length); actors.push(actor.id); if (actor === scene.hero) draws.push(args.slice(1));
            const begin = calls.length; draw(...args); const actual = calls.slice(begin), expected = [];
            const port = new Proxy({}, { get: (_, method) => (...values) => { expected.push([method, ...values]); return port; } });
            renderCharacter(port, drawList(actor.id, actor.pose, actor.expression, actor.animation, actor.time), ...args.slice(1, 4), actor.flip, args[4] ?? 0);
            assert.deepEqual(actual, expected, 'Scene submits each actor own geometry');
        };
    }
    let timestamp = 0;
    scene.update(0, 0);
    const frame = (ms = 0) => { timestamp += ms; calls.length = 0; draws.length = 0; actors.length = 0; drawOffsets.length = 0; scene.update(timestamp, ms); };
    const cleanup = () => { scene.road?.destroy(); scene.paint?.destroy(); scene.inputs.dispose(); inputs.dispose(); };
    return { scene, session: scene.session, frame, draws, actors, drawOffsets, calls, baked, graphicsObjects, images, removedTextures, textures, cleanup, engine: scene.engine, hero: scene.hero };
}

const { collisionCounts } = await import('../src/engines/derapage/physics.ts');
const { nearest, wrap, inKartHole, kartFootprint } = await import('../src/engines/derapage/track.ts');
const { racingHeading } = await import('../tests/e2e/character-policy-2.ts');
// Upper frame bound: 250 synthetic seconds at the fastest table cadence (13 Hz).
const mobileFrameBudget=3251;
export async function sceneFingerRun(level, mode='play', period=150, initialSeed=72, frameLimit=mobileFrameBudget, graphicsCalls=graphicsProfile.after[level].top, presentationFps, collisionProbe=false) {
    assert(Number.isInteger(frameLimit) && frameLimit>0 && frameLimit<=mobileFrameBudget,'mobile replay frame budget: 1 to 3251');
    const h=await mount('derapage','dragon',false),{scene,engine}=h;
    engine.loadLevel(level,28);h.session.send('start');scene.draw=()=>{};
    const diagnostics=[];
    for(const k of engine.karts) collisionCounts.set(k,{kart:0,rail:0});
    let reverseMs=0, reverseMaximum=0, collisionInjected=false;
    const step=engine.step.bind(engine);
    engine.step=ms=>{
        while(ms>1e-8 && engine.status==='playing') {
            const slice=Math.min(ms,1000/60-engine.remainder);
            const k=engine.karts[0], n=nearest(engine.track,k), lap=k.lap;
            const row=diagnostics[lap] ??= {kart:0,rail:0,tree:0,holeEdge:0,backwardRailRebounds:0,launches:[],landings:0,missed:0,failedLaunches:0,bypassExits:0,bypasses:[],reverseMs:0,maxReverseMs:0,off:0,steps:0,hitSections:{},reverseSections:{},rivalRampHits:0,rivalLaunches:0,rivalLandings:0,skippedFinish:0,lavaBeforeRamp:0};
            if(collisionProbe && !collisionInjected && n.index===engine.track.circuit.jumps[0]) {
                // Adverse oblique impact on the real approach rail, with delayed
                // thumb commands still queued by the same realistic pilot.
                k.x=n.x+n.nx*(engine.track.widths[n.index]/2+3.2);
                k.y=n.y+n.ny*(engine.track.widths[n.index]/2+3.2);
                k.angle=Math.atan2(-n.nx,n.ny)+2.2;
                k.vx=Math.cos(k.angle)*20;k.vy=Math.sin(k.angle)*20;
                collisionInjected=true;
            }
            const rivals=(engine.track.circuit.gap ? engine.karts.slice(1) : []).map(k=>({hits:collisionCounts.get(k).kart,jump:k.jumpMs,index:nearest(engine.track,k).index}));
            const before={hits:k.hits,kart:collisionCounts.get(k).kart,rail:collisionCounts.get(k).rail,tree:k.treeHits??0,jump:k.jumpMs,bypass:k.bypassIndex,frame:engine.frames,gate:k.gate,passed:k.passed,x:k.x,y:k.y};
            const speed=Math.hypot(k.vx,k.vy);
            const ramp=engine.track.circuit.jumps[0] ?? -20;
            if(n.index>=ramp-10 && n.index<=ramp && engine.track.circuit.lava?.some(i=>kartFootprint(engine.track,i,'lava').contains(k))) row.lavaBeforeRamp++;
            step(slice);ms-=slice;
            if(engine.frames===before.frame) continue;
            const after=nearest(engine.track,k);
            for(const [i,b] of rivals.entries()) {
                const rival=engine.karts[i+1];
                if(b.index>=ramp-2 && b.index<=ramp+5) {
                    row.rivalRampHits+=(collisionCounts.get(rival).kart)-b.hits;
                    row.rivalLaunches+=Number(b.jump===0 && rival.jumpMs>0);
                    row.rivalLandings+=Number(b.jump>0 && rival.jumpMs===0);
                }
            }
            const finish=engine.track.points[0], previous=engine.track.points[95], next=engine.track.points[1];
            const dot=p=>(p.x-finish.x)*(next.x-previous.x)+(p.y-finish.y)*(next.y-previous.y);
            if(dot(before)<0 && dot(k)>=0 && after.index<2 && before.gate!==0 && before.passed>0) row.skippedFinish++;
            row.steps++;row.off+=Number(after.distance>engine.track.widths[after.index]/2);
            row.kart+=(collisionCounts.get(k).kart)-before.kart;row.rail+=(collisionCounts.get(k).rail)-before.rail;row.tree+=(k.treeHits??0)-before.tree;
            assert.equal(k.hits-before.hits,(collisionCounts.get(k).kart)-before.kart+(collisionCounts.get(k).rail)-before.rail+(k.treeHits??0)-before.tree,'every impact has a measured source');
            if(k.hits>before.hits) row.hitSections[after.index]=(row.hitSections[after.index]??0)+k.hits-before.hits;
            if(before.jump===0 && k.jumpMs>0) row.launches.push({index:n.index,speed});
            if(before.jump>0 && k.jumpMs===0) {row.landings++;if(inKartHole(engine.track,k) || k.bypassIndex!==undefined) row.missed++;}
            if(before.bypass===undefined && k.bypassIndex!==undefined) {
                row.bypasses.push({index:n.index,side:k.bypassSide,speed,entry:k.bypassEntry});
                if(n.index===ramp) row.failedLaunches++;
            }
            if(before.bypass!==undefined && k.bypassIndex===undefined) row.bypassExits++;
            const error=Math.abs(wrap(k.angle-Math.atan2(-after.nx,after.ny)));
            if((collisionCounts.get(k).rail)>before.rail && error>Math.PI/2) row.backwardRailRebounds++;
            reverseMs=error>Math.PI/2 ? reverseMs+1000/60 : 0;
            if(error>Math.PI/2) row.reverseSections[after.index]=(row.reverseSections[after.index]??0)+1;
            row.reverseMs+=error>Math.PI/2 ? 1000/60 : 0;
            row.maxReverseMs=Math.max(row.maxReverseMs,reverseMs);reverseMaximum=Math.max(reverseMaximum,reverseMs);
        }
    };
    const canvas=scene.game.canvas, area=elements.get('#game'), scale=358/360;
    const left=16,top=44;
    canvas.getBoundingClientRect=()=>({x:left,y:top,left,top,width:360*scale,height:640*scale});
    const fps=presentationFps ?? (mode==='play'?graphicsFps(graphicsCalls):13), frameMs=1000/fps;
    let pending, specialAt;
    const commands=[], observations=[], applied=[];
    let seed=mode==='play'?7:initialSeed, down=false, special=false, next=0, wall=0, moves=0, off=0, samples=0, stop=0, maxStop=0;
    const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    const noise=()=>{random();return seed%25-12;};
    const touch=(type,x,y)=>emit(area,type,{target:canvas,pointerType:'touch',pointerId:9,clientX:left+x*scale+(mode==='play'?0:noise()),clientY:top+y*scale+(mode==='play'?0:noise())});
    const release=()=>{if(down)emit(area,'pointerup',{pointerId:9,pointerType:'touch'});down=false;};
    try {
        // Observations occur on displayed frames; physics retains its real 60 Hz accumulator.
        for(;wall<250000 && samples<frameLimit && engine.status==='playing';wall+=frameMs) {
            if(mode==='play' && commands.length && wall+1e-8>=commands[0].at) {
                const command=commands.shift();
                if(applied.length<3) applied.push(wall);
                if(!down) {touch('pointerdown',180,480);down=true;}
                const radius=45/scale;
                touch('pointermove',180+Math.cos(command.heading)*radius,480+Math.sin(command.heading)*radius);moves++;
            }
            if(specialAt!==undefined && wall>=specialAt) {tap('derapage-special');specialAt=undefined;}
            if(pending && wall>=pending.at) {
                if(!down) {touch('pointerdown',180,480);down=true;}
                touch('pointermove',180+Math.cos(pending.heading)*80,480+Math.sin(pending.heading)*80);moves++;pending=undefined;
            }
            if(wall+1e-8>=next) {
                const k=engine.karts[0], n=nearest(engine.track,k);
                const target=engine.track.points[(n.index+6)%96];
                const heading=mode==='play' ? Math.atan2(target.y-k.y,target.x-k.x)+(random()*2-1)*.35 : racingHeading(engine.snapshot(false));
                if(mode==='e2e') {
                    if(!special && Math.hypot(k.vx,k.vy)>16) {release();specialAt=wall+150;special=true;}
                    else pending={at:wall+150,heading};
                } else {
                    // Observation/evaluation consumes 150 ms plus one presentation;
                    // the resulting command is consumed on the following presentation.
                    commands.push({at:wall+150+2*frameMs,heading});
                    if(observations.length<3) observations.push(wall);
                }
                next=mode==='play'?wall+period+frameMs:next+period;
            }
            h.frame(frameMs);
            const k=engine.karts[0],n=nearest(engine.track,k);
            off+=n.distance>engine.track.widths[n.index]/2?1:0;samples++;
            stop=Math.hypot(k.vx,k.vy)<2?stop+frameMs:0;maxStop=Math.max(maxStop,stop);
        }
        const s=engine.snapshot(false);
        return {diagnostics,collisionInjected,maxReverseMs:reverseMaximum,level:level+1,mode,period,fps,graphicsCalls,observations,applied,hits:engine.karts[0].hits,lapTimesMs:engine.lapTimesMs,frames:samples,raceMs:engine.time,laps:engine.karts[0].lap,place:s.order.indexOf(0)+1,status:s.status,moves,special,off:off/samples,maxStopMs:maxStop,noiseSeed:seed};
    } finally {release();h.cleanup();}
}
export async function mobileSceneChecks() {
    let bambooMs;
    await assert.rejects(sceneFingerRun(0,'play',150,72,mobileFrameBudget+1),
        {name:'AssertionError',message:'mobile replay frame budget: 1 to 3251'});
    for(const [mode,period,levels] of [['play',150,[0,4,9,17,19,26]],['e2e',400,[0,9]]]) {
        if(process.argv.includes('--e2e-only') && mode!=='e2e' || process.argv.includes('--play-only') && mode!=='play') continue;
        assert(levels.length<=6,'mobile case budget: at most six races');
        const started=performance.now();let noiseSeed=72,frames=0,cases=0,podiums=0,kartReferenceMs;
        for(const level of levels) {
            const result=await sceneFingerRun(level,mode,period,noiseSeed);noiseSeed=result.noiseSeed;frames+=result.frames;cases++;
            console.log('Mobile oracle',JSON.stringify(result));
            if(process.argv.includes('--measure-only')) continue;
            if(level===17) {kartReferenceMs=result.raceMs;bambooMs=result.raceMs;}
            if(level===26 && mode==='play') {
                assert(result.raceMs<1.5*kartReferenceMs,'volcano under 1.5 times bamboo');
                assert(result.hits<=150,'volcano at most 150 collisions');
                assert(result.maxReverseMs<=500,'no heading against the road for over half a second');
            }
            assert.equal(result.laps,3,'real finger completes three laps');
            assert(result.raceMs<150000,'race under 150 seconds');
            assert(result.off<.15,'off road below 15 percent');
            assert(result.maxStopMs<500,'no half-second stop');
            if(mode==='play') {
                assert.equal(result.fps,graphicsFps(graphicsProfile.after[level].top),'cadence derives from counted frame budget');
                assert(result.applied[0]>=150+2000/result.fps,'observation delay plus following presentation');
                assert(result.observations[1]>=150+1000/result.fps,'observations include evaluation latency');
                if(result.place<=3) podiums++;
            }
            if(mode==='e2e') {assert(result.special);if(level===0) assert.equal(result.place,1,'level 1 victory');}
        }
        if(mode==='play' && !process.argv.includes('--measure-only')) assert(podiums>=4,'at least four podiums in six races');
        const elapsed=performance.now()-started;
        console.log(`Mobile ${mode} oracle: ${elapsed.toFixed(0)} ms`);
        assert.equal(cases,levels.length,'all mobile cases simulated');
        assert(frames<=levels.length*mobileFrameBudget,'mobile batch frame budget');
    }
    return bambooMs;
}
export async function volcanoCollisionChecks(bambooMs) {
    for(const [fps,probe] of [[12,false],[20,false],[12,true]]) {
        const result=await sceneFingerRun(26,'play',150,72,mobileFrameBudget,400,fps,probe);
        assert.equal(result.laps,3,'volcano completes at adverse presentation cadence');
        assert(result.raceMs<1.5*bambooMs,'volcano under 1.5 times reference bamboo');
        if(!probe) assert(result.hits<=150,'volcano at most 150 collisions');
        assert(result.off<.15,'volcano off road below 15 percent');
        assert(result.maxStopMs<500,'volcano no half-second stop');
        assert(result.maxReverseMs<=500,'collision never leaves the player facing backwards over half a second');
        if(probe) {
            assert(result.collisionInjected,'oblique rail collision was exercised');
            assert(result.diagnostics.some(row=>row.rail>0),'real physics resolved the approach rail');
            assert(result.diagnostics.every(row=>row.backwardRailRebounds===0),'rail rebounds point along the one-way track');
        }
        console.log('Volcano collision oracle',JSON.stringify(result));
    }
}
async function renderingChecks() {
    const h=await mount('derapage','dragon'),{scene,engine}=h;
    h.session.send('start');
    try {
        engine.loadLevel(14,28);h.frame();
        const rows=scene.hud.children;
        assert.equal(Number.parseFloat(rows[0].style.fontSize),24,'large current lap timer');
        assert.equal(Number.parseFloat(rows[1].style.fontSize),12,'best lap just below');
        assert(6+rows.reduce((height,row)=>height+Number.parseFloat(row.style.fontSize)*1.1,0)<=96,'HUD stays inside reserved band');
        const line=engine.track.finishLine,kart=engine.karts[0],fw=Math.hypot(line.b.x-line.a.x,line.b.y-line.a.y);
        const nx=(line.b.x-line.a.x)/fw,ny=(line.b.y-line.a.y)/fw;
        const groundCells=h.calls.flatMap((call,i)=>{
            if(call[0]!=='fillPoints' || call[1].length!==4 || h.calls[i-1]?.[0]!=='fillStyle' || ![0xffffff,0x080b10].includes(h.calls[i-1][1])) return [];
            const local=call[1].map(p=>{const x=(p.x-180)/5+kart.x-line.a.x,y=(p.y-368)/5+kart.y-line.a.y;return {u:x*nx+y*ny,v:-x*ny+y*nx};});
            return local.every(p=>p.u>=-1e-8 && p.u<=fw+1e-8 && p.v>=-1-1e-8 && p.v<=1+1e-8) ? [local] : [];
        });
        assert.equal(groundCells.length,24,'two complete checker rows recorded from the real scene');
        const across=groundCells.flat().map(p=>p.u);
        assert(Math.abs(Math.max(...across)-Math.min(...across)-engine.track.widths[0])<1e-8,'drawn checker width equals physical road width');
        // The raised banner must be opaque and both posts must have visible strokes.
        const banners=h.calls.filter((call,i)=>call[0]==='fillPoints' && call[1].length===4 && ['fillStyle'].includes(h.calls[i-1]?.[0]) && [0xffffff,0x080b10].includes(h.calls[i-1][1]));
        assert.equal(banners.length,48,'ground and raised checker cells');
        for(const call of banners) {const style=h.calls[h.calls.indexOf(call)-1];assert((style[2]??1)>0,'banner opacity');}
        const posts=h.calls.flatMap((c,i)=>c[0]==='lineStyle' && c[2]===0xf4e6b1 ? [[c,h.calls[i+1]]] : []);
        assert.equal(posts.length,2,'two finish posts');
        for(const [style,line] of posts) {assert(style[1]>=3,'visible post width');assert(line[0]==='lineBetween' && line[2]-line[4]>=24,'posts rise above road');}
        const chevrons=()=>h.calls.flatMap((call,i)=>call[0]==='fillStyle' && call[1]===0xb5ffe4 ? [h.calls[i+1]] : []);
        const render=time=>{h.calls.length=0;scene.sceneTime=time;scene.draw();return chevrons();};
        const still=render(0);
        // Compare scene chevrons with independently projected physical road widths.
        const t=engine.track;
        const { boostStrip }=await import('../src/engines/derapage/track.ts');
        const visibleBoosts=t.boosts.filter(b=>{
            const points=boostStrip(t,b).corners.map(q=>({x:180+(q.x-kart.x)*5,y:368+(q.y-kart.y)*5}));
            return Math.max(...points.map(p=>p.x))>=0 && Math.min(...points.map(p=>p.x))<=360 && Math.max(...points.map(p=>p.y))>=96 && Math.min(...points.map(p=>p.y))<=640;
        });
        const polygons=still.filter(c=>c?.[0]==='fillPoints').map(c=>c[1]);
        assert(visibleBoosts.length>0,'a strip is visible');
        assert.equal(polygons.length,visibleBoosts.length*3,'three chevrons per visible strip');
        for(const [j,b] of visibleBoosts.entries()) {
            const polygon=polygons[j*3],a=t.points[b.index],next=t.points[(b.index+1)%96],len=Math.hypot(next.x-a.x,next.y-a.y);
            const lateral=polygon.map(q=>{const x=(q.x-180)/5+kart.x-a.x,y=(q.y-368)/5+kart.y-a.y;return (-x*(next.y-a.y)+y*(next.x-a.x))/len;});
            assert(Math.abs(Math.max(...lateral)-Math.min(...lateral)-t.widths[b.index])<.2,'scene chevrons span road');
        }
        assert.notDeepEqual(still,render(713),'scene time scrolls chevrons');
        assert.deepEqual(render(713),render(713),'deterministic chevrons');
        globalThis.window.matchMedia=()=>({matches:true});assert.deepEqual(render(0),render(713),'reduced motion freezes chevrons');
        globalThis.window.matchMedia=()=>({matches:false});
        const area=elements.get('#game'),canvas=scene.game.canvas;
        emit(area,'pointerdown',{target:canvas,pointerId:9,pointerType:'touch',clientX:180,clientY:480});
        emit(area,'pointermove',{target:canvas,pointerId:9,pointerType:'touch',clientX:180,clientY:440});h.frame();
        assert.match(elements.get('#derapage-steering').textContent,/Direction ✓ 100 %/);
        assert(h.calls.some(c=>c[0]==='strokeCircle' && c[3]===40),'visible thumb ring');
        assert(h.calls.some((c,i)=>c[0]==='fillCircle' && c[1]===180 && c[2]===440 && c[3]===7 && h.calls[i-1]?.[1]===0x80efac && h.calls[i-1]?.[2]>0),'visible moving thumb dot at actual displacement');
        emit(area,'pointerup',{pointerId:9,pointerType:'touch'});h.frame();
        assert.match(elements.get('#derapage-steering').textContent,/Posez le pouce/);
        // Real finish crossings drive engine timing, scene flash and HUD together.
        const finish=engine.track.points[0],before=engine.track.points[95],after=engine.track.points[1];
        const angle=Math.atan2(after.y-before.y,after.x-before.x);
        let raceFrames=0;
        for(const [lapFrames,time,color] of [[1200,1000,'#80efac'],[1194,4000,'#80efac'],[1206,7000,'#ff9b9b']]) {
            raceFrames+=lapFrames;engine.frames=raceFrames-1;
            Object.assign(kart,{x:finish.x-Math.cos(angle)*.1,y:finish.y-Math.sin(angle)*.1,angle,vx:Math.cos(angle)*24,vy:Math.sin(angle)*24,gate:0});
            scene.previousFrame=time-1000/60;
            scene.update(time,0);
            assert.equal(engine.lapTimesMs.at(-1),lapFrames*1000/60,'actual crossing lap time');
            assert.equal(scene.hud.children[0].textContent,'TOUR 00:00.00','timer restarts at line');
            assert.equal(scene.hud.children[1].textContent,`MEILLEUR ${engine.bestLapMs===20000?'00:20.00':'00:19.90'}`,'best timer follows engine minimum');
            assert.equal(scene.hud.children[2].style.color,color,'actual lap delta colour');
            assert.match(scene.hud.children[2].textContent,/Écart/);
            const flash=()=>h.calls.some((c,i)=>c[0]==='fillRect' && c[1]===0 && c[2]===96 && c[3]===360 && h.calls[i-1]?.[1]===0xffffff && h.calls[i-1]?.[2]>0);
            assert(flash(),'visible flash on real crossing');render(time+199);assert(flash(),'flash lasts until 200 ms');
            render(time+200);assert(!flash(),'flash expires');
            render(time+1999);assert.match(scene.hud.children[2].textContent,/Écart/);
            render(time+2000);assert.equal(scene.hud.children[2].textContent,'','delta expires at two seconds');
        }
        engine.loadLevel(14,28);scene.recordedLaps=0;
        scene.update(10000,1234);
        const { formatTime }=await import('../src/games/derapage/scene.ts');
        assert.equal(scene.hud.children[0].textContent,`TOUR ${formatTime(engine.snapshot(false).timing.currentLapMs)}`,'large clock advances with real simulation');
        const k=engine.karts[0],p=engine.track.points[10];
        Object.assign(k,{x:p.x+1000,y:p.y+1000,jumpMs:0});
        const particles=time=>{render(time);return h.calls.flatMap((c,i)=>c[0]==='fillStyle' && c[1]===0xc2b477 ? [[c,h.calls[i+1]]] : []);};
        const firstParticles=particles(200);
        assert.equal(firstParticles.length,7,'seven grass particles');
        for(const [style,circle] of firstParticles) {
            assert(style[2]>0 && circle[0]==='fillCircle' && circle[3]>0,'visible grass particle');
            const dx=(circle[1]-180)/5,dy=(circle[2]-368)/5;
            assert(dx*Math.cos(k.angle)+dy*Math.sin(k.angle)<-1.9,'particle behind kart');
        }
        assert.notDeepEqual(firstParticles,particles(413),'grass particle positions evolve with scene time');
        console.log('Z44 HUD, chevrons, reduced motion, thumb state, delta and grass Graphics: OK');
    } finally {h.cleanup();}
}
if(!process.argv.includes('--harness-only') && !process.argv.includes('--measure-only')) {
    await renderingChecks();
    if(process.argv.includes('--audit-mutations')) {
        const { mutationModule }=await import('./mutation-module.js');
        const { mobileMutations }=await import('./derapage-mobile-mutations.js');
        for(const [name,file,before,after] of mobileMutations) {
            sceneModule=(await mutationModule('../'+file,before,after,{'phaser':'data:text/javascript,'+encodeURIComponent(phaser)})).module;
            await assert.rejects(renderingChecks(),{name:'AssertionError'},name);
            console.log(`Mutation ${name}: killed by real scene Graphics`);
        }
        sceneModule=undefined;
    }
}
if(!process.argv.includes('--harness-only') && !process.argv.includes('--render-only')) {
    const bambooMs=await mobileSceneChecks();
    if(!process.argv.includes('--measure-only') && !process.argv.includes('--e2e-only')) await volcanoCollisionChecks(bambooMs);
}
