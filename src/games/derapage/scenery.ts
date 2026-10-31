import type Phaser from 'phaser';
import type { Primitive } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
import { nearest, type Track, type Vec } from '../../engines/derapage/track';

export const sceneryKinds = ['building','lamp','crossing','fence','flowers','hay','rock','turn','arrow','stand','flag','banner','fir','stump','pond','bollard','cargo','anchor','cliff','bush','stones','pennant','mound','ribbon','tree'] as const;
export type SceneryKind = typeof sceneryKinds[number];
export interface Scenery extends Vec { kind: SceneryKind; radius: number }
const cache = new WeakMap<Track, readonly Scenery[]>();
/** Theme colours identify the existing eight palettes without changing engine data. */
export function sceneryTheme(t: Track): number {
    return [0x686b70,0x597b49,0x826b54,0x675a80,0x244d3d,0x756b61,0x4e6574,0x88734e].indexOf(t.circuit.theme.ground);
}
export function roadside(t: Track): readonly Scenery[] {
    const old=cache.get(t); if(old) return old;
    const items: Scenery[]=[], theme=sceneryTheme(t);
    if (!t.circuit.theme.kart && theme>=0) for(let i=0;i<t.points.length;i+=4) {
        const p=t.points[i]; if(!p) continue;
        const n=nearest(t,p);
        for(const side of [-1,1]) {
            const radius=4, offset=(t.widths[i] ?? 28)/2+radius+7;
            const q={x:p.x+n.nx*side*offset,y:p.y+n.ny*side*offset};
            const edge=nearest(t,q);
            // Check against every road section, including tight hairpins and shortcuts.
            if(edge.distance<(t.widths[edge.index] ?? 28)/2+radius+4) continue;
            const shortcut=t.circuit.shortcut;
            if(shortcut) {
                const a=t.points[shortcut.from], b=t.points[shortcut.to];
                if(a && b) {
                    const dx=b.x-a.x,dy=b.y-a.y, u=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy)));
                    if(Math.hypot(q.x-a.x-u*dx,q.y-a.y-u*dy)<shortcut.width+radius+4) continue;
                }
            }
            const kind=sceneryKinds[theme*3+(i/4+(side===1?1:0))%3];
            if(kind) items.push({...q,kind,radius});
        }
    }
    cache.set(t,items);return items;
}
const spriteCache = new WeakMap<Track, readonly Scenery[]>();
/** Existing trees remain visible because they already have engine collisions. */
export function scenerySprites(t: Track): readonly Scenery[] {
    const old=spriteCache.get(t);if(old) return old;
    const items=[...roadside(t)];
    if(!t.circuit.theme.kart && !t.circuit.theme.urban)
        for(const tree of t.trees) items.push({...tree,kind:'tree'});
    spriteCache.set(t,items);return items;
}
/** Shared silhouettes: top-view raster and perspective sprite use the same code art. */
export function sceneryDrawing(kind: SceneryKind): Primitive[] {
    const list: Primitive[]=[];
    const poly=(points: [number,number][],fill:string):void=>{list.push({kind:'polygon',points,fill,stroke:'#354350',width:3});};
    const rect=(x:number,y:number,w:number,h:number,c:string):void=>{poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],c);};
    const oval=(x:number,y:number,rx:number,ry:number,fill:string):void=>{list.push({kind:'ellipse',x,y,rx,ry,fill,stroke:'#354350',width:3,rotation:0});};
    const post=():void=>{rect(111,65,14,150,'#d8d4be');};
    if(kind==='tree') {
        rect(108,150,24,85,'#886343');oval(120,113,115,106,'#398255');oval(88,77,49,43,'#69a865');
    } else if(kind==='building') {
        rect(40,28,160,188,'#718595');rect(33,20,174,24,'#b5c4cd');
        for(let y=56;y<190;y+=40) for(let x=60;x<190;x+=40) rect(x,y,19,24,'#ffe2a1');
    } else if(kind==='lamp') {post();poly([[115,70],[115,35],[187,35],[187,58]],'#445668');oval(183,66,26,15,'#fff0ac');
    } else if(kind==='crossing') {
        rect(24,54,192,132,'#727b82');for(let x=35;x<210;x+=35) rect(x,66,20,108,'#f0ebdc');
    } else if(kind==='fence') {
        for(const x of [30,110,190]) rect(x,70,16,130,'#e3ce9e');rect(24,95,190,16,'#f4dfae');rect(24,151,190,16,'#f4dfae');
    } else if(kind==='flowers') {
        for(const x of [54,120,183]) {rect(x,112,7,90,'#45814e');for(let i=0;i<5;i++) oval(x+Math.cos(i*1.26)*18,95+Math.sin(i*1.26)*18,14,14,x===120?'#fff0b0':'#f4a4b2');oval(x,95,11,11,'#efc342');}
    } else if(kind==='hay') {oval(120,137,89,66,'#e5bd61');oval(120,137,54,46,'#bf8f43');oval(120,137,24,24,'#e5bd61');
    } else if(kind==='rock' || kind==='cliff' || kind==='stones') {
        poly([[24,190],[40,77],[96,37],[173,55],[213,190]],kind==='cliff'?'#758b98':'#a79c89');poly([[40,77],[96,37],[115,120],[24,190]],'#677783');
    } else if(kind==='turn' || kind==='arrow') {
        if(kind==='turn') post();rect(24,45,192,95,'#f2cd61');poly([[60,63],[113,63],[164,93],[113,123],[60,123],[111,93]],'#384453');
    } else if(kind==='stand') {
        for(let i=0;i<4;i++) {rect(25,60+i*38,190,30,'#b6a2cb');for(let j=0;j<6;j++) oval(40+j*30,65+i*38,8,9,j%2?'#e5c979':'#775a9e');}
    } else if(kind==='flag' || kind==='banner' || kind==='pennant' || kind==='ribbon') {
        post();poly([[125,42],[218,65],[125,112]],kind==='pennant'?'#e79a56':'#d98bc3');rect(108,34,20,14,'#f2d783');
        if(kind==='banner' || kind==='ribbon') {rect(24,55,12,160,'#d8d4be');poly([[36,55],[108,55],[108,110],[36,90]],'#8baddd');}
    } else if(kind==='fir') {
        rect(106,143,28,75,'#886343');for(let i=0;i<3;i++) poly([[30+i*13,175-i*48],[210-i*13,175-i*48],[120,30-i*8]],i%2?'#46956b':'#286047');
    } else if(kind==='stump') {rect(57,107,126,105,'#886343');oval(120,106,63,33,'#e1bf82');oval(120,106,36,17,'#af8755');
    } else if(kind==='pond') {oval(120,135,101,68,'#7db6a4');oval(120,135,84,51,'#62a3bc');oval(108,124,47,25,'#9acbd5');
    } else if(kind==='bollard') {rect(84,79,72,125,'#a8b4b6');oval(120,78,36,20,'#ecdfb8');rect(76,103,88,20,'#5c747c');
    } else if(kind==='cargo') {rect(36,50,168,158,'#b68c59');rect(45,61,150,15,'#e6bb79');poly([[45,194],[58,199],[194,70],[180,61]],'#e6bb79');rect(36,188,168,20,'#795e49');
    } else if(kind==='anchor') {post();oval(119,54,25,25,'#b8c8cc');poly([[35,128],[70,155],[109,155],[109,94],[130,94],[130,155],[169,155],[205,128],[184,191],[58,191]],'#b8c8cc');
    } else if(kind==='bush') {for(const x of [65,120,174]) oval(x,145-Math.abs(x-120)/3,49,50,'#51836b');
    } else {oval(120,163,100,46,'#bb965e');oval(114,147,74,29,'#dec18a');}
    return list;
}
export function drawScenery(g: Phaser.GameObjects.Graphics, item: Scenery, p: Vec, scale: number): void {
    const size=item.radius*2*scale;
    renderCharacter(g,sceneryDrawing(item.kind),p.x-size/2,p.y-size/2,size);
}
/** Sparse low-contrast marks are baked beneath the road, once per track. */
export function groundTexture(g: Phaser.GameObjects.Graphics,t:Track,project:(x:number,y:number)=>Vec): void {
    if(t.circuit.theme.kart) return;
    const xs=t.points.map(p=>p.x), ys=t.points.map(p=>p.y);
    g.fillStyle(t.circuit.theme.border,.12);
    for(let y=Math.min(...ys)-32;y<Math.max(...ys)+32;y+=7) for(let x=Math.min(...xs)-32;x<Math.max(...xs)+32;x+=7) {
        const p=project(x+Math.sin(y)*2,y);
        g.fillRect(p.x,p.y,t.circuit.theme.urban?9:3,t.circuit.theme.urban?3:6);
    }
}
