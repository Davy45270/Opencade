/* global EventTarget, console, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mutationModule } from './mutation-module.js';
registerHooks({ resolve(name, context, next) {
    if (name === 'phaser') return { shortCircuit: true, url: 'data:text/javascript,export default {Scene:class{}};' };
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return { shortCircuit: true, url: 'data:text/javascript,export const sound={playEffect(){},stop(){}};' };
    return next(name, context);
} });
const { selectCharacter } = await import('../src/characters/selection.ts');
const { PlaySession } = await import('../src/shell/pause.ts');
// Actual portrait FIT: 16px side gutters, 44px header, 64px controls.
const scale = Math.min((390 - 32) / 360, (844 - 44 - 64) / 640);
assert.match(readFileSync('src/style.css', 'utf8'), /padding-left: max\(16px/);
class Element extends EventTarget {
    style = {}; children = []; classList = { add() {}, remove() {}, contains() { return false; } };
    setAttribute() {} setPointerCapture() {} remove() {} matches() { return false; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 358, height: 640 * scale }; }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; }
}
const identity = () => [1, 0, 0, 1, 0, 0];
// Graphics method calls and drawing paths measured on unmodified HEAD (passes 112–116).
const headFrameCosts = {"briqueterie":{"panda":{"1":{"graphics":766,"paths":477,"textures":0},"6":{"graphics":824,"paths":509,"textures":0},"18":{"graphics":965,"paths":585,"textures":0},"15":{"graphics":677,"paths":368,"textures":0}},"pandaroux":{"1":{"graphics":766,"paths":477,"textures":0},"6":{"graphics":940,"paths":567,"textures":0},"18":{"graphics":965,"paths":585,"textures":0},"15":{"graphics":677,"paths":368,"textures":0}},"dragon":{"1":{"graphics":558,"paths":268,"textures":0},"6":{"graphics":520,"paths":252,"textures":0},"18":{"graphics":965,"paths":585,"textures":0},"15":{"graphics":677,"paths":368,"textures":0}},"singe":{"1":{"graphics":577,"paths":288,"textures":0},"6":{"graphics":635,"paths":320,"textures":0},"18":{"graphics":965,"paths":585,"textures":0},"15":{"graphics":677,"paths":368,"textures":0}},"licorne":{"1":{"graphics":577,"paths":288,"textures":0},"6":{"graphics":563,"paths":284,"textures":0},"18":{"graphics":965,"paths":585,"textures":0},"15":{"graphics":677,"paths":368,"textures":0}}},"alunir":{"panda":{"1":{"graphics":693,"paths":355,"textures":0},"3":{"graphics":682,"paths":347,"textures":0},"5":{"graphics":703,"paths":360,"textures":0},"9":{"graphics":721,"paths":367,"textures":0},"17":{"graphics":731,"paths":373,"textures":0}},"pandaroux":{"1":{"graphics":653,"paths":335,"textures":0},"3":{"graphics":642,"paths":327,"textures":0},"5":{"graphics":663,"paths":340,"textures":0},"9":{"graphics":681,"paths":347,"textures":0},"17":{"graphics":691,"paths":353,"textures":0}},"dragon":{"1":{"graphics":681,"paths":349,"textures":0},"3":{"graphics":670,"paths":341,"textures":0},"5":{"graphics":691,"paths":354,"textures":0},"9":{"graphics":709,"paths":361,"textures":0},"17":{"graphics":719,"paths":367,"textures":0}},"singe":{"1":{"graphics":679,"paths":348,"textures":0},"3":{"graphics":668,"paths":340,"textures":0},"5":{"graphics":689,"paths":353,"textures":0},"9":{"graphics":707,"paths":360,"textures":0},"17":{"graphics":717,"paths":366,"textures":0}},"licorne":{"1":{"graphics":721,"paths":369,"textures":0},"3":{"graphics":710,"paths":361,"textures":0},"5":{"graphics":731,"paths":374,"textures":0},"9":{"graphics":749,"paths":381,"textures":0},"17":{"graphics":759,"paths":387,"textures":0}}}};
const renderCost = { graphics: 0, paths: 0, textures: 0 };
function graphicsPort() {
    let matrix = identity(), stack = [], alpha = 1, color = 0, width = 1, shapes = [];
    const point = (x, y) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });
    const polygon = (vertices, method, raw) => {
        if (alpha < .04) return;
        const points = vertices.map(p => point(p.x, p.y));
        shapes.push({ points, method, raw, alpha, color, matrix: [...matrix] });
    };
    const ellipse = (x, y, rx, ry) => Array.from({ length: 32 }, (_, i) => ({ x: x + rx * Math.cos(i * Math.PI / 16), y: y + ry * Math.sin(i * Math.PI / 16) }));
    const line = (a, b, method, raw) => {
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1, dx = -(b.y - a.y) / length * width / 2, dy = (b.x - a.x) / length * width / 2;
        polygon([{x:a.x+dx,y:a.y+dy},{x:b.x+dx,y:b.y+dy},{x:b.x-dx,y:b.y-dy},{x:a.x-dx,y:a.y-dy}], method, raw);
    };
    const target = { get shapes() { return shapes; } };
    const g = new Proxy(target, { get(t, method) {
        if (method === 'shapes') return [...(t.extraShapes?.() ?? []), ...shapes];
        if (method === 'extraShapes') return t.extraShapes;
        return (...args) => {
            renderCost.graphics++;
            if (/^(fill|stroke)(Rect|RoundedRect|Circle|Ellipse|Triangle|Points)$|^lineBetween$/.test(method)) renderCost.paths++;
            const [a,b,c,d] = args;
            if (method === 'clear') { shapes = []; matrix = identity(); stack = []; }
            else if (method === 'fillStyle') { color = a; alpha = b ?? 1; }
            else if (method === 'lineStyle') { width = a; color = b; alpha = c ?? 1; }
            else if (method === 'save') stack.push([...matrix]);
            else if (method === 'restore') matrix = stack.pop() ?? identity();
            else if (method === 'translateCanvas') { matrix[4] += matrix[0]*a+matrix[2]*b; matrix[5] += matrix[1]*a+matrix[3]*b; }
            else if (method === 'scaleCanvas') { matrix[0]*=a; matrix[1]*=a; matrix[2]*=b; matrix[3]*=b; }
            else if (method === 'rotateCanvas') { const [m,n,o,p] = matrix, cos=Math.cos(a), sin=Math.sin(a); matrix[0]=m*cos+o*sin; matrix[1]=n*cos+p*sin; matrix[2]=o*cos-m*sin; matrix[3]=p*cos-n*sin; }
            else if (['fillRect','fillRoundedRect','strokeRect','strokeRoundedRect'].includes(method)) {
                const v = [{x:a,y:b},{x:a+c,y:b},{x:a+c,y:b+d},{x:a,y:b+d}];
                if (String(method).startsWith('fill')) polygon(v, method, args);
                else v.forEach((p,i) => line(p,v[(i+1)%4],method,args));
            } else if (method === 'fillTriangle') polygon([{x:a,y:b},{x:c,y:d},{x:args[4],y:args[5]}],method,args);
            else if (['fillCircle','fillEllipse','strokeCircle','strokeEllipse'].includes(method)) {
                const v = ellipse(a,b,method.endsWith('Circle') ? c : c/2,method.endsWith('Circle') ? c : d/2);
                if (String(method).startsWith('fill')) polygon(v,method,args); else v.forEach((p,i) => line(p,v[(i+1)%v.length],method,args));
            } else if (method === 'fillPoints') polygon(a,method,args);
            else if (method === 'strokePoints') { for(let i=1;i<a.length;i++) line(a[i-1],a[i],method,args); if(b) line(a.at(-1),a[0],method,args); }
            else if (method === 'lineBetween') line({x:a,y:b},{x:c,y:d},method,args);
            return g;
        };
    } });
    return g;
}
// A generated canvas clips vectors to its bounds, including shapes crossing tile seams.
function textureShapes(shapes,width,height) {
    return shapes.flatMap(shape=>{
        let points=shape.points;
        for(const [axis,edge,sign] of [['x',0,1],['x',width,-1],['y',0,1],['y',height,-1]]) {
            const output=[];
            for(let i=0;i<points.length;i++) {
                const a=points[i], b=points[(i+1)%points.length], inside=p=>(p[axis]-edge)*sign>=0;
                if(inside(a)) output.push(a);
                if(inside(a)!==inside(b)) {
                    const t=(edge-a[axis])/(b[axis]-a[axis]);
                    output.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
                }
            }
            points=output;
        }
        return points.length>=3?[{...shape,points}]:[];
    });
}
function bounds(shapes) {
    const points = shapes.flatMap(s => s.points);
    return { x: Math.min(...points.map(p=>p.x)), y: Math.min(...points.map(p=>p.y)), width: Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)), height: Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)) };
}
// Union raster, 2 logical px sampling; overlapping draws never add coverage twice.
function coverage(shapes) {
    const mask = new Uint8Array(180*320);
    for (const shape of shapes) {
        const p = shape.points, box = bounds([shape]);
        if (box.width >= 359 && box.height >= 639) continue; // flat canvas colour
        for(let y=Math.max(0,Math.floor(box.y/2));y<Math.min(320,Math.ceil((box.y+box.height)/2));y++) for(let x=Math.max(0,Math.floor(box.x/2));x<Math.min(180,Math.ceil((box.x+box.width)/2));x++) {
            if(mask[y*180+x]) continue;
            let inside=false; const px=x*2+1, py=y*2+1;
            for(let i=0,j=p.length-1;i<p.length;j=i++) if((p[i].y>py)!==(p[j].y>py) && px<(p[j].x-p[i].x)*(py-p[i].y)/(p[j].y-p[i].y)+p[i].x) inside=!inside;
            if(inside) mask[y*180+x]=1;
        }
    }
    return mask.reduce((sum,v)=>sum+v,0)/mask.length;
}
function modulePresent(shapes,e) {
    return shapes.some(p=>p.method==='fillRoundedRect'&&p.raw[0]===-25&&p.raw[1]===-11&&p.raw[2]===50&&p.raw[3]===27&&Math.abs(p.matrix[4]-e.state.x)<.01);
}
function drawnPads(shapes,e) {
    return e.terrain.pads.filter(p=>shapes.some(s=>s.method==='fillRoundedRect'&&s.raw[0]===p.x&&s.raw[1]===p.y+3&&s.raw[2]===p.width&&s.raw[3]===22));
}
function checkLunar(shapes,e,hero,flame=false) {
    assert(modulePresent(shapes,e),'module hull painted at craft position');
    assert.equal(drawnPads(shapes,e).length,e.terrain.pads.length,'every pad actually painted');
    const pilot=bounds(hero);assert(pilot.width>=20&&pilot.height>=20,'pilot visible inside canopy');
    assert(pilot.x>=e.state.x-25&&pilot.x+pilot.width<=e.state.x+25&&pilot.y>=(e.state.y-55)*.88&&pilot.y+pilot.height<=(e.state.y+2)*.88,'pilot located in canopy');
    assert(shapes.some(p=>p.method==='fillRoundedRect'&&p.raw[0]===-11&&p.raw[1]===9&&p.raw[2]===22&&p.raw[3]===12),'reactor has nonzero body');
    assert(shapes.some(p=>p.method==='fillCircle'&&p.raw[0]===0&&p.raw[1]===-12&&p.raw[2]===22),'canopy');
    for(const x of [-35,22]) assert(shapes.some(p=>p.method==='lineBetween'&&p.raw[0]===x&&p.raw[1]===30),'landing feet');
    const flames=shapes.filter(p=>p.method==='fillTriangle'&&p.raw[1]===15&&p.raw[3]===15&&p.raw[5]>=45);
    assert.equal(flames.length,flame?1:0,'thrust flame follows thrust and fuel');
    const strata=shapes.filter(p=>p.method==='fillPoints'&&p.raw[0].some(v=>v.y===728));
    assert.equal(strata.length,5,'five filled regolith strata');
    for(let i=0;i<5;i++) {
        assert.deepEqual(strata[i].raw[0].slice(0,-2),e.terrain.points.map(p=>({x:p.x,y:p.y+i*28})),'stratum follows terrain');
        assert(coverage([strata[i]])>.03,'stratum visible in viewport');
    }
    assert.equal(new Set(strata.map(p=>p.color)).size,5,'distinct regolith colours');
}
export async function sceneMeasurements(game, baseline = false, override) {
    let Scene = override ?? (await import(`../src/games/${game}/scene.ts`))[game === 'alunir' ? 'AlunirScene' : 'BriqueterieScene'];
    if (baseline) {
        const head = async (path,imports={}) => {
            const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
            const original=execFileSync('git',['show',`HEAD:${path}`],{encoding:'utf8'});
            return mutationModule('../'+path,source,original,imports);
        };
        const imports={phaser:'data:text/javascript,export default {Scene:class{}};'};
        if(game==='briqueterie') {
            const levels=await head('src/engines/briqueterie/levels.ts');
            const engine=await head('src/engines/briqueterie/engine.ts',{'./levels':levels.url});
            const presentation=await head('src/games/briqueterie/presentation.ts',{'../../engines/briqueterie/levels':levels.url});
            imports['../../engines/briqueterie/engine']=engine.url;imports['./presentation']=presentation.url;
        }
        if(game==='alunir') imports['./presentation']=(await head('src/games/alunir/presentation.ts')).url;
        Scene=(await head(`src/games/${game}/scene.ts`,imports)).module[game==='alunir'?'AlunirScene':'BriqueterieScene'];
    }
    const result = [];
    for (const id of override ? ['panda'] : ['panda','pandaroux','dragon','singe','licorne']) {
        const doc=new Element(); doc.body=new Element(); doc.querySelector=()=>null; doc.createElement=()=>new Element();
        globalThis.document=doc; globalThis.window=new Element(); globalThis.location={search:'?test=1'}; globalThis.matchMedia=()=>Object.assign(new EventTarget(),{matches:false}); globalThis.window.matchMedia=globalThis.matchMedia;
        const platform=new EventTarget(); globalThis.addEventListener=platform.addEventListener.bind(platform); globalThis.removeEventListener=platform.removeEventListener.bind(platform);
        selectCharacter(id,undefined);
        const session=new PlaySession(true); session.send('start'); const scene=new Scene(session);
        const textures=new Map(), images=[]; let generations=0, objects=0;
        const image=()=>{ const sprite={visible:false,depth:0,alpha:1,rotation:0,key:'',setTexture(v){this.key=v;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setDisplaySize(w,h){this.w=w;this.h=h;return this;},setRotation(v){this.rotation=v;return this;},setAlpha(v){this.alpha=v;return this;},setDepth(v){this.depth=v;return this;},setVisible(v){this.visible=v;return this;},destroy(){}};images.push(sprite);return sprite; };
        scene.add={graphics:()=>{objects++;return graphicsPort();},image,text:()=>{objects++;const t={text:'',setText(v){this.text=v;return this;},setOrigin(){return this;},setDepth(){return this;},setY(){return this;},getBounds(){return{x:0,y:0,width:340,height:50};}};return t;}};
        scene.make={graphics:()=>{const port=graphicsPort();return new Proxy(port,{get(t,key){if(key==='generateTexture')return (name,width,height)=>{assert(!textures.has(name)); const shapes=textureShapes(t.shapes,width,height); shapes.width=width; shapes.height=height; textures.set(name,shapes); generations++;renderCost.textures++;};return t[key];}});}};
        scene.textures={exists:key=>textures.has(key)}; const cleanup=new Map(); scene.events={once:(name,fn)=>cleanup.set(name,fn)}; scene.scale={refresh(){}};scene.game={canvas:new Element()};
        const creationBefore={...renderCost};
        scene.create(); const g=scene.graphics;
        const creationCost=Object.fromEntries(Object.keys(renderCost).map(k=>[k,renderCost[k]-creationBefore[k]]));
        const decorShapes=()=>images.filter(i=>i.visible&&/^(brick-body|brick|garden|lunar|crater|ferraille)-118-/.test(i.key)).sort((a,b)=>a.depth-b.depth).flatMap(sprite=>{
            const original=textures.get(sprite.key)??[];
            return original.map(s=>{
                const tx=sprite.x-sprite.w/2, ty=sprite.y-sprite.h/2, raw=globalThis.structuredClone(s.raw);
                if(sprite.key.startsWith('brick-body-')) {
                    if(s.method==='fillPoints') raw[0]=raw[0].map(p=>({x:p.x+tx,y:p.y+ty}));
                    else for(let i=0;i<(s.method==='lineBetween'?4:s.method==='fillTriangle'?6:2);i++) raw[i]+=i%2?ty:tx;
                }
                return {...s,raw,points:s.points.map(p=>({x:tx+p.x/original.width*sprite.w,y:ty+p.y/original.height*sprite.h})),matrix:[sprite.w/original.width,0,0,sprite.h/original.height,tx,ty]};
            });
        });
        g.extraShapes=()=>{const decor=decorShapes();return [...decor.filter(s=>s.matrix[3]===1),...(scene.groundGraphics?.shapes??[]),...decor.filter(s=>s.matrix[3]!==1)];};
        let heroFrame=[];
        const originalHeroDraw=scene.hero.draw.bind(scene.hero);
        scene.hero.draw=(...args)=>{const before=g.shapes.length;originalHeroDraw(...args);heroFrame=g.shapes.slice(before);};
        const initial=generations, capacity=images.length, objectCount=objects;
        const hook=globalThis.window[`__${game.toUpperCase()}_TEST__`];
        for(const level of game==='alunir' ? [0,2,4,8,16] : [0,5,17,14]) {
            hook.loadLevel(level,28); const frozen=hook.read(); const costBefore={...renderCost}; scene.draw(); const frameCost=Object.fromEntries(Object.keys(renderCost).map(k=>[k,renderCost[k]-costBefore[k]])); assert.deepEqual(hook.read(),frozen,'drawing preserves complete engine snapshot');
            const shapes=[...g.shapes];
            for(const sprite of images.filter(i=>i.visible&&!/^(brick-body|brick|garden|lunar|crater|ferraille)-118-/.test(i.key))) {
                const original=textures.get(sprite.key)??[];
                // Atlas resolutions are 192 for crafts, 64 for emblems/balls.
                const resolution=sprite.key.includes('emblem-')||sprite.key.includes('-ball-') ? 64 : 192;
                for(const s of original) shapes.push({...s,imageKey:sprite.key,points:s.points.map(p=>{const x=(p.x/resolution-.5)*sprite.w,y=(p.y/resolution-.5)*sprite.h;return{x:sprite.x+x*Math.cos(sprite.rotation)-y*Math.sin(sprite.rotation),y:sprite.y+x*Math.sin(sprite.rotation)+y*Math.cos(sprite.rotation)};})});
            }
            let heroHeight, wall=0, wallInk=0, brickWidth=0, ground=0;
            if(game==='alunir') {
                const s=scene.engine.state;
                const module=g.shapes.filter(p=>Math.abs(p.matrix[4]-s.x)<.01 && p.matrix[5]!==0 && p.points.every(v=>v.x>=s.x-45&&v.x<=s.x+45));
                heroHeight=bounds(module).height*scale;
                // First filled terrain polygon follows the authored collision points.
                const terrain=g.shapes.find(p=>p.method==='fillPoints'&&p.raw[0].some(v=>v.y===728));
                ground=terrain?coverage([terrain]):0;
            } else {
                const bricks=g.shapes.filter(p=>p.method==='fillRoundedRect'&&p.raw[4]===4&&p.raw[2]>20&&p.raw[3]>20&&p.raw[1]>=70&&p.raw[1]<400);
                assert.equal(bricks.length,scene.engine.state.bricks.length,'one painted body per playable brick');
                // Visible horizontal span on each brick's centre line, clipped to the
                // viewport and with every later brick subtracted (painter ordering).
                brickWidth=Math.min(...bricks.map((brick,i)=>{
                    const box=bounds([brick]), y=box.y+box.height/2;
                    let spans=[[Math.max(0,box.x),Math.min(360,box.x+box.width)]];
                    for(const later of bricks.slice(i+1)) {
                        const b=bounds([later]); if(y<b.y||y>b.y+b.height) continue;
                        spans=spans.flatMap(([l,r])=>b.x>=r||b.x+b.width<=l?[[l,r]]:[[l,Math.min(r,b.x)],[Math.max(l,b.x+b.width),r]].filter(([a,z])=>z>a));
                    }
                    return spans.reduce((sum,[l,r])=>sum+Math.max(0,r-l),0);
                }))*scale;
                if(!baseline) {
                    for(const [i,a] of bricks.entries()) for(const b of bricks.slice(i+1)) {
                        const x=bounds([a]), y=bounds([b]);
                        assert(!(Math.min(x.x+x.width,y.x+y.width)-Math.max(x.x,y.x)>0.01 && Math.min(x.y+x.height,y.y+y.height)-Math.max(x.y,y.y)>0.01),'brick bodies must not overlap');
                    }
                    if(level===0) assert.equal(new Set(bricks.filter((_,i)=>scene.engine.state.bricks[i].kind==='plain').map(p=>p.color)).size,4,'A01 four food colours');
                    if(level===14) for(const source of scene.engine.state.bricks.filter(b=>!b.solid&&b.kind==='plain'&&Math.floor(b.x/34)%2)) {
                        const {brickView}=await import('../src/games/briqueterie/presentation.ts'), v=brickView(level,scene.engine.state.paddle);
                        const cx=v.x(source.x-2)+v.width/2, cy=(v.y(source.y)+v.y(source.y+source.h))/2;
                        assert(g.shapes.some(p=>p.method==='fillPoints'&&p.color===0x79e9ff&&p.points.length===4&&Math.abs(bounds([p]).x-(cx-13))<.01&&Math.abs(bounds([p]).y-(cy-18))<.01),'A03 crystal at each alternating plain tile');
                    }
                }
                wallInk=coverage(bricks);const box=bounds(bricks);wall=box.width*box.height/(360*640);
                heroHeight=bounds(shapes.filter(s=>s.imageKey?.includes('-paddles-'))).height*scale;
            }
            const ballHeight=game==='briqueterie' ? Math.max(...images.filter(i=>i.visible&&i.key.includes('emblem-')&&i.x===scene.engine.state.balls[0].x&&i.alpha===1).map(i=>i.h))*scale : 0;
            const row={game,id,frameCost,creationCost,textureGenerations:generations,imagePool:capacity,ballHeight:+ballHeight.toFixed(2),level:level+1,heroHeight:+heroHeight.toFixed(2),coverage:+coverage(shapes).toFixed(4),elements:game==='alunir'
                ? g.shapes.filter(s=>s.method==='fillCircle' && [1,1.5,2].includes(s.raw[2]) && s.matrix[4]===0).length + g.shapes.filter(s=>s.method==='fillEllipse' && s.raw[2]>=15 && s.raw[2]<=30 && s.matrix[3]===.88 && bounds([s]).y<640 && bounds([s]).y+bounds([s]).height>0).length + drawnPads(g.shapes,scene.engine).length + Number(modulePresent(g.shapes,scene.engine)) + Number(g.shapes.some(s=>s.method==='fillCircle' && s.raw[2]===43))
                : scene.engine.state.bricks.length + images.filter(i=>i.visible && i.alpha>=.4).length,
                primitives:shapes.filter(s=>s.method.startsWith('fill')&&bounds([s]).width<359).length,brickWidth:+brickWidth.toFixed(2),wallEnvelope:+wall.toFixed(4),ground:+ground.toFixed(4),wallCoverage:+wallInk.toFixed(4),solidWallTargetMet:game!=='briqueterie'||wallInk>=.30};
            if(!baseline) {
                const reference=headFrameCosts[game][id][row.level];
                assert(row.frameCost.graphics <= reference.graphics * .4, `${game}/${id}/${row.level}: frame Graphics budget <= 40% of HEAD`);
                assert(row.frameCost.paths <= reference.paths * .4, `${game}/${id}/${row.level}: frame path budget <= 40% of HEAD`);
                assert.equal(row.frameCost.textures,0,'no texture generation during play');
                assert(Number.isFinite(row.heroHeight)); assert(Number.isFinite(row.coverage));
                if(game==='alunir'){checkLunar(g.shapes,scene.engine,heroFrame);assert(row.heroHeight>=56,JSON.stringify(row));assert(row.ground>=.20,JSON.stringify(row));assert(row.elements>=10);}
                else {assert(Number.isFinite(row.brickWidth));assert(Number.isFinite(row.wallEnvelope));assert(row.brickWidth>=40,JSON.stringify(row));assert(row.wallCoverage>=.30,JSON.stringify(row));}
            }
            if (game === 'briqueterie' && !baseline) {
                const motif = { panda:'bao', pandaroux:'feuille', dragon:'feu', singe:'coeur', licorne:'etoile' }[id];
                const heads = images.filter(i=>i.visible && i.w===24 && i.key.endsWith('emblem-'+motif));
                assert.equal(heads.length,scene.engine.state.balls.length,'actual distinct ball motif');
                for (const ball of scene.engine.state.balls) assert(heads.some(i=>Math.abs(i.x-ball.x)<.01),'motif follows the physical ball');
            }
            if(game==='alunir'&&!baseline) {
                const e=scene.engine, savedFuel=e.state.fuel, savedThrust=e.controls.thrust;
                e.controls.thrust=true; scene.draw(); checkLunar(g.shapes,e,heroFrame,true);
                e.state.fuel=0; scene.draw(); checkLunar(g.shapes,e,heroFrame,false);
                e.state.fuel=savedFuel;e.controls.thrust=savedThrust;
            }
            result.push(row);
            if(!baseline&&!override) {
                if(game==='briqueterie') scene.engine.launch();
                for(let frame=0;frame<12;frame++) {
                    scene.engine.step(1000/60);const before={...renderCost};scene.draw();
                    assert(renderCost.graphics-before.graphics<=headFrameCosts[game][id][row.level].graphics * .4,'playing frame Graphics budget <= 40% of HEAD');
                    assert(renderCost.paths-before.paths<=headFrameCosts[game][id][row.level].paths * .4,'playing frame path budget <= 40% of HEAD');
                    assert.equal(renderCost.textures,before.textures);
                }
            }
            scene.draw();scene.draw(); assert.equal(generations,initial);assert.equal(images.length,capacity);assert.equal(objects,objectCount);
        }
        // Recreating the scene against the same texture manager must hit the cache too.
        cleanup.get('shutdown')(); scene.create(); assert.equal(generations,initial); cleanup.get('shutdown')();
    }
    if (game === 'alunir' && !baseline) {
        const { lunarSky } = await import('../src/games/alunir/presentation.ts');
        const e = new (await import('../src/engines/alunir/engine.ts')).Engine();
        const first=graphicsPort(), second=graphicsPort(); lunarSky(first,e,true);
        e.state.ticks=180; e.state.x+=100; lunarSky(second,e,true);
        assert.deepEqual(first.shapes,second.shapes,'reduced motion freezes decorative parallax');
        const moving=graphicsPort();lunarSky(moving,e,false);assert.notDeepEqual(moving.shapes,first.shapes);
    }
    if(game==='briqueterie'&&!baseline&&!override) {
        const {brickView}=await import('../src/games/briqueterie/presentation.ts');
        for(let level=0;level<30;level++) for(const focus of [6,180,354]) {
            const view=brickView(level,focus);
            for(const x of [0,80,180,280,360]) assert.equal(view.x(x,574),x,'paddle lane has no crop or pointer remapping');
            for(const y of [64,200,400,574]) {
                assert(view.x(80,y)<view.x(280,y),'horizontal ordering preserved');
                assert(view.x(focus,y)>=0&&view.x(focus,y)<=360,'lead ball stays on screen');
            }
        }
    }
    if(game==='briqueterie'&&!baseline&&!override) assert.equal(new Set(result.filter(r=>r.level===1).map(r=>r.id)).size,5);
    if(!override) console.log(JSON.stringify({baseline,scale,measurements:result}));

    if(!baseline&&!override) await graphicMutations(game);
    return result;
}

async function graphicMutations(game) {
    const scenePath=`../src/games/${game}/scene.ts`, presentationPath=`../src/games/${game}/presentation.ts`;
    const phaser='data:text/javascript,export default {Scene:class{}};';
    const cases=game==='briqueterie' ? [
        ['repas_monochrome',presentationPath,'[0xffd65c, 0x7be84b, 0xff9a52, 0xff729a]','[0xffd65c, 0xffd65c, 0xffd65c, 0xffd65c]'],
        ['cristaux_absents',presentationPath,"if (catalogue === 'stars' && Math.floor(source.x / 34) % 2) {","if (catalogue === 'stars' && Math.floor(source.x / 34) % 2 && b.w < 0) {"],
        ['briques_recouvertes',presentationPath,'width: 32 * zoom','width: 42 * zoom'],
        ['zoom_absent',presentationPath,'const zoom = 1.3','const zoom = 1'],
        ['mur_ajoure','../src/engines/briqueterie/levels.ts',"['.xxxxxxxx.', '.xxxxxxxx.', '.xxxxxxxx.', '.xxxxxxxx.', '.xxx..xxx.']","['.xx....xx.', '.xx....xx.', '.xx.xx.xx.', '.x.xxxx.x.', '.x..xx..x.']"],
    ] : [
        ['pilote_absent',presentationPath,'hero.draw(g, -20, -33, 40);','hero.draw(g, -20, -33, 0);'],
        ['flamme_absente',presentationPath,"if (e.controls.thrust && s.fuel > 0 && e.status === 'playing') {","if (e.controls.thrust && s.fuel < 0 && e.status === 'playing') {"],
        ['reacteur_absent',presentationPath,'g.fillRoundedRect(-11, 9, 22, 12, 3);','g.fillRoundedRect(-11, 9, 0, 0, 3);'],
        ['strates_absentes',presentationPath,'for (let layer = 1; layer < 5; layer++) {','for (let layer = 1; layer < 1; layer++) {'],
        ['coque_absente',presentationPath,'g.fillRoundedRect(-25, -11, 50, 27, 9);','g.fillRoundedRect(-25, -11, 0, 0, 9);'],
        ['quais_absents',scenePath,'g.fillRoundedRect(p.x, p.y + 3, p.width, 22, 4);','g.fillRoundedRect(p.x, p.y + 3, 0, 0, 4);'],
    ];
    // Prove the narrowed mutation harness accepts an intact scene first.
    const Base=(await import(`../src/games/${game}/scene.ts`))[game==='alunir'?'AlunirScene':'BriqueterieScene'];
    await sceneMeasurements(game,false,Base);
    const reasons={repas_monochrome:'A01 four food colours',cristaux_absents:'A03 crystal',briques_recouvertes:'brick bodies must not overlap',pilote_absent:'pilot visible',flamme_absente:'thrust flame',reacteur_absent:'reactor',strates_absentes:'five filled regolith',coque_absente:'module hull',quais_absents:'every pad'};
    for(const [name,path,before,after] of cases) {
        assert.equal(readFileSync(new URL(path,import.meta.url),'utf8').split(before).length,2,name);
        const changed=await mutationModule(path,before,after,{phaser});
        let Scene;
        if(path===scenePath) Scene=changed.module[game==='alunir'?'AlunirScene':'BriqueterieScene'];
        else if(path.endsWith('/levels.ts')) {
            const enginePath='../src/engines/briqueterie/engine.ts';
            const engine=await mutationModule(enginePath,"from './levels'","from './levels'",{'./levels':changed.url});
            const presentation=await mutationModule(presentationPath,"from '../../engines/briqueterie/levels'","from '../../engines/briqueterie/levels'",{'../../engines/briqueterie/levels':changed.url});
            const rebound=await mutationModule(scenePath,"from './presentation'","from './presentation'",{phaser,'./presentation':presentation.url,'../../engines/briqueterie/engine':engine.url});
            Scene=rebound.module.BriqueterieScene;
        } else {
            const source=readFileSync(new URL(scenePath,import.meta.url),'utf8');
            const line=source.split('\n').find(l=>l.includes("from './presentation'"));
            const rebound=await mutationModule(scenePath,line,line,{phaser,'./presentation':changed.url});
            Scene=rebound.module[game==='alunir'?'AlunirScene':'BriqueterieScene'];
        }
        await assert.rejects(()=>sceneMeasurements(game,false,Scene),error=>{
            if(error.code!=='ERR_ASSERTION') return false;
            if(name==='zoom_absent') return JSON.parse(error.message).brickWidth<40;
            if(name==='mur_ajoure') { const row=JSON.parse(error.message);return row.wallCoverage<.30&&row.wallEnvelope>=.35; }
            return error.message.includes(reasons[name]);
        },name);
        console.log(`${game}: mutation ${name} rejetée`);
    }
}


export async function ferrailleRenderChecks(baseline = false) {
    let { FerrailleScene: Scene }=await import('../src/games/ferraille/scene.ts');
    if(baseline) {
        const path='../src/games/ferraille/scene.ts';
        const original=execFileSync('git',['show','HEAD:src/games/ferraille/scene.ts'],{encoding:'utf8'});
        Scene=(await mutationModule(path,readFileSync(new URL(path,import.meta.url),'utf8'),original,{phaser:'data:text/javascript,export default {Scene:class{}};'})).module.FerrailleScene;
    }
    const rows=[];
    const reference={panda:[1071,1060,1103],dragon:[1071,1060,1103],licorne:[1065,1054,1097]};
    for(const id of ['panda','dragon','licorne']) {
        const doc=new Element(); doc.body=new Element(); doc.querySelector=()=>null; doc.createElement=()=>new Element();
        globalThis.document=doc; globalThis.window=new Element(); globalThis.location={search:'?test=1'}; globalThis.matchMedia=()=>Object.assign(new EventTarget(),{matches:false}); globalThis.window.matchMedia=globalThis.matchMedia;
        const platform=new EventTarget(); globalThis.addEventListener=platform.addEventListener.bind(platform); globalThis.removeEventListener=platform.removeEventListener.bind(platform);
        selectCharacter(id,undefined);
        const session=new PlaySession(true); session.send('start'); const scene=new Scene(session);
        const textures=new Map(), images=[]; let generations=0, objects=0;
        const image=()=>{ const sprite={visible:false,depth:0,alpha:1,rotation:0,key:'',setTexture(v){this.key=v;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setDisplaySize(w,h){this.w=w;this.h=h;return this;},setRotation(v){this.rotation=v;return this;},setAlpha(v){this.alpha=v;return this;},setDepth(v){this.depth=v;return this;},setVisible(v){this.visible=v;return this;},destroy(){}};images.push(sprite);return sprite; };
        scene.add={graphics:()=>{objects++;return graphicsPort();},image,text:()=>{objects++;const t={text:'',setText(v){this.text=v;return this;},setOrigin(){return this;},setDepth(){return this;},setY(){return this;},getBounds(){return{x:0,y:0,width:340,height:50};}};return t;}};
        scene.make={graphics:()=>{const port=graphicsPort();return new Proxy(port,{get(t,key){if(key==='generateTexture')return (name,width,height)=>{assert(!textures.has(name)); const shapes=textureShapes(t.shapes,width,height); shapes.width=width; shapes.height=height; textures.set(name,shapes); generations++;renderCost.textures++;};return t[key];}});}};
        scene.textures={exists:key=>textures.has(key)}; const cleanup=new Map(); scene.events={once:(name,fn)=>cleanup.set(name,fn)}; scene.scale={refresh(){}};scene.game={canvas:new Element()};
        const creationBefore={...renderCost};
        scene.create(); const g=scene.graphics;
        const creationCost=Object.fromEntries(Object.keys(renderCost).map(k=>[k,renderCost[k]-creationBefore[k]]));
        const decorShapes=()=>images.filter(i=>i.visible&&/^(brick-body|brick|garden|lunar|crater|ferraille)-118-/.test(i.key)).sort((a,b)=>a.depth-b.depth).flatMap(sprite=>{
            const original=textures.get(sprite.key)??[];
            return original.map(s=>{
                const tx=sprite.x-sprite.w/2, ty=sprite.y-sprite.h/2, raw=globalThis.structuredClone(s.raw);
                if(sprite.key.startsWith('brick-body-')) {
                    if(s.method==='fillPoints') raw[0]=raw[0].map(p=>({x:p.x+tx,y:p.y+ty}));
                    else for(let i=0;i<(s.method==='lineBetween'?4:s.method==='fillTriangle'?6:2);i++) raw[i]+=i%2?ty:tx;
                }
                return {...s,raw,points:s.points.map(p=>({x:tx+p.x/original.width*sprite.w,y:ty+p.y/original.height*sprite.h})),matrix:[sprite.w/original.width,0,0,sprite.h/original.height,tx,ty]};
            });
        });
        g.extraShapes=()=>{const decor=decorShapes();return [...decor.filter(s=>s.matrix[3]===1),...(scene.groundGraphics?.shapes??[]),...decor.filter(s=>s.matrix[3]!==1)];};

        const hook=globalThis.window.__FERRAILLE_TEST__, initial=generations, capacity=images.length, objectCount=objects;
        for(const level of [0,2,29]) {
            hook.loadLevel(level,28);
            const before={...renderCost}; scene.draw();
            const frameCost=Object.fromEntries(Object.keys(renderCost).map(k=>[k,renderCost[k]-before[k]]));
            const ink=g.shapes.filter(s=>!(bounds([s]).width>=359&&bounds([s]).height>=527)).map(s=>({...s,points:s.points.map(p=>({x:p.x,y:p.y-112}))}));
            const decoration=coverage(textureShapes(ink,360,528))/(528/640);
            rows.push({game:'ferraille',id,level:level+1,frameCost,creationCost,decoration});
            if(!baseline) assert(decoration>=.6,'cached Ferraille scenery retains coverage');
            if(!baseline) {
                assert(frameCost.graphics <= reference[id][[0,2,29].indexOf(level)] * .4,'Ferraille frame Graphics budget <= 40% of HEAD');
                assert.equal(frameCost.textures,0);
                for(const [width,height] of [[390,844],[360,640],[1280,720]]) for(const heroY of [234,340]) {
                    scene.engine.state.vehicle=false; scene.engine.state.hero.y=heroY; scene.draw();
                    const view=hook.layout(), fit=Math.min(width/360,height/640);
                    assert(view.ground.y>=view.world.y);
                    assert((view.ground.y+view.ground.height)*fit<=(view.world.y+view.world.height)*fit,'visible ground clipped to world');
                    assert(view.hud.y+view.hud.height<=view.ground.y);
                    assert(view.visibleWorldBottom>=362,'F08 camera reaches standing body at fall threshold');
                    if(heroY===340) {
                        const top=Math.max(88,heroY-146);
                        assert((heroY-top)*2.6+112>=112);
                        assert((heroY+22-top)*2.6+112<=640,'full standing body actually visible at fall threshold');
                        const fighter=images.find(i=>i.visible&&i.key.includes('-fighter-'));
                        assert(fighter,'standing fighter submitted at fall threshold');
                        assert((fighter.y-fighter.h/2)*fit>=view.world.y*fit);
                        assert((fighter.y+fighter.h/2)*fit<=(view.world.y+view.world.height)*fit,'full rendered fighter visible in every requested viewport');
                    }
                }
                assert.equal(generations,initial); assert.equal(images.length,capacity); assert.equal(objects,objectCount);
            }
        }
        cleanup.get('shutdown')();
        scene.create(); assert.equal(generations,initial,'restart reuses all textures'); cleanup.get('shutdown')();
    }
    console.log(JSON.stringify({baseline,measurements:rows}));
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const baseline = process.argv.includes('--baseline');
    await ferrailleRenderChecks(baseline);
    await sceneMeasurements('briqueterie', baseline);
    await sceneMeasurements('alunir', baseline);
}
