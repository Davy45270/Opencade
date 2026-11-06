import type Phaser from 'phaser';
import type { Primitive } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
import { at, nearest, wrap, TREE_CLEARANCE, type Track, type Vec } from '../../engines/derapage/track';
import { DECOR_MARGIN, decorFootprint, decorReach, decorTop } from './decor-sprites';

export const sceneryKinds = ['building','lamp','crossing','fence','flowers','hay','rock','turn','arrow','stand','flag','banner','fir','stump','pond','bollard','cargo','anchor','cliff','bush','stones','pennant','mound','ribbon','tree','barrier','sign'] as const;
export type SceneryKind = typeof sceneryKinds[number];
/** `angle`: heading of the road at a drawn prop (barrier and crate lie along it, the sign faces the karts coming
 *  down it); `mirror`: a sign announcing a left bend. */
export interface Scenery extends Vec { kind: SceneryKind; radius: number; angle?: number; mirror?: boolean }
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
        const slot=(side: number): SceneryKind | undefined => sceneryKinds[theme*3+(i/4+(side===1?1:0))%3];
        const preferred=(i-4)/8%2 ? 1 : -1, barrierSide=slot(preferred)==='cargo' ? -preferred : preferred;
        for(const side of [-1,1]) {
            const kind=slot(side);
            // David's works barrier (Z47) takes one regular slot in eight points of the city circuits, on alternate
            // sides, at the kerb and along the road; never a crate's slot (the quays keep their crates).
            if(t.circuit.theme.urban && i%8===4 && side===barrierSide && kind!=='cargo') {
                const barrier=beside(t,t.distances[i] ?? 0,side,'barrier',3.2);
                if(clear(t,barrier)) { items.push(barrier); continue; }
            }
            // A fir is one of David's trees (Z46): its crown needs the trees' clearance.
            const radius=4, clearance=kind==='fir' ? TREE_CLEARANCE : radius+4, offset=(t.widths[i] ?? 28)/2+(kind==='fir' ? TREE_CLEARANCE+1 : radius+7);
            const q={x:p.x+n.nx*side*offset,y:p.y+n.ny*side*offset};
            const edge=nearest(t,q);
            // Check against every road section, including tight hairpins and shortcuts.
            if(edge.distance<(t.widths[edge.index] ?? 28)/2+clearance) continue;
            const shortcut=t.circuit.shortcut;
            if(shortcut) {
                const a=t.points[shortcut.from], b=t.points[shortcut.to];
                if(a && b) {
                    const dx=b.x-a.x,dy=b.y-a.y, u=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy)));
                    if(Math.hypot(q.x-a.x-u*dx,q.y-a.y-u*dy)<shortcut.width+clearance) continue;
                }
            }
            // The technical cup's yellow chevrons are David's direction signs now, set before the bends (below).
            if(kind && kind!=='turn' && kind!=='arrow') items.push({...q,kind,radius,angle:Math.atan2(-n.nx,n.ny)});
        }
    }
    if (!t.circuit.theme.kart && theme===2) items.push(...signs(t));
    // From above a barrier never lies over another prop (tight bends bring the other side's props close): the
    // prop's drawing (70 % of its box) stays clear of the bar; otherwise the slot stays empty.
    const half=decorTop({x:0,y:0,kind:'barrier',radius:0,angle:0}).width/2;
    const over=(b: Scenery): boolean => items.some(o => {
        if(o===b) return false;
        const c=Math.cos(b.angle ?? 0), sn=Math.sin(b.angle ?? 0), u=Math.max(-half,Math.min(half,(o.x-b.x)*c+(o.y-b.y)*sn));
        return Math.hypot(o.x-b.x-u*c,o.y-b.y-u*sn)<2+.7*o.radius;
    });
    const kept=items.filter(item => item.kind!=='barrier' || !over(item));
    cache.set(t,kept);return kept;
}
/** Off the road with DECOR_MARGIN at every point of its footprint, and off the shortcut. */
function clear(t: Track, item: Scenery): boolean {
    const shortcut=t.circuit.shortcut, a=shortcut && t.points[shortcut.from], b=shortcut && t.points[shortcut.to];
    return decorFootprint(item).every(q => {
        const n=nearest(t,q);
        if(n.distance<(t.widths[n.index] ?? 28)/2+DECOR_MARGIN) return false;
        if(!shortcut || !a || !b) return true;
        const dx=b.x-a.x,dy=b.y-a.y, u=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(q.x-a.x-u*dx,q.y-a.y-u*dy)>=shortcut.width+DECOR_MARGIN;
    });
}
/** A prop at `along` on the road, `side` = 1 to the right of the driver, -1 to the left, standing just off the edge. */
function beside(t: Track, along: number, side: number, kind: 'barrier' | 'sign', radius: number, mirror?: boolean): Scenery {
    const p=at(t,along), n=nearest(t,p), offset=(t.widths[n.index] ?? 28)/2+DECOR_MARGIN+decorReach(kind)+1;
    const q={x:p.x+n.nx*side*offset,y:p.y+n.ny*side*offset}, edge=nearest(t,q);
    // Square to the road section it stands beside (in a bend, the nearest one), not to the point it was measured from.
    return {...q,kind,radius,angle:Math.atan2(-edge.nx,edge.ny),...(mirror===undefined ? {} : {mirror})};
}
/** Heading change over the next 20 units of road, in radians: positive = a right bend (the y axis points down). */
export function turnAhead(t: Track, along: number): number {
    const heading=(s: number): number => { const a=at(t,s), b=at(t,s+2); return Math.atan2(b.y-a.y,b.x-a.x); };
    return wrap(heading(along+20)-heading(along));
}
/** Bends of the road: where the heading starts to change by more than 25° over 20 units (until it falls under 12°),
 *  with their direction (the strongest change in the bend). */
export function bends(t: Track): { along: number; right: boolean }[] {
    const step=2, count=Math.floor(t.length/step), turns=Array.from({length:count},(_,k)=>turnAhead(t,k*step));
    const quiet=Math.max(0,turns.findIndex(v=>Math.abs(v)<12*Math.PI/180));
    const found: { along: number; right: boolean }[]=[];
    let start=-1, peak=0;
    for(let j=0;j<=count;j++) {
        const k=(quiet+j)%count, v=turns[k] ?? 0;
        if(start<0 && Math.abs(v)>25*Math.PI/180) { start=k; peak=v; }
        else if(start>=0 && Math.abs(v)>Math.abs(peak) && Math.sign(v)===Math.sign(peak)) peak=v;
        if(start>=0 && (Math.abs(v)<12*Math.PI/180 || Math.sign(v)!==Math.sign(peak))) { found.push({along:start*step,right:peak>0}); start=-1; }
    }
    return found;
}
/** David's direction signs (7-2421): one before each bend of the technical cup, on its outside, arrows towards it
 *  (mirrored for a left bend). Not at a fixed interval: the first lead (15 units upstream, then 10 to 30) that clears the road. */
function signs(t: Track): Scenery[] {
    const items: Scenery[]=[];
    for(const bend of bends(t)) for(const lead of [15,20,10,25,30]) {
        const item=beside(t,bend.along-lead,bend.right ? -1 : 1,'sign',2,!bend.right);
        if(!clear(t,item) || items.some(o=>Math.hypot(o.x-item.x,o.y-item.y)<12)) continue;
        // A driver at the sign must meet this bend first, not the end of the previous one.
        const from=nearest(t,item).along;
        let first=0;
        for(let d=5;d<=55 && Math.abs(first)<25*Math.PI/180;d++) first=turnAhead(t,from+d);
        if(Math.abs(first)<25*Math.PI/180 || first>0!==bend.right) continue;
        items.push(item); break;
    }
    return items;
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
    } else if(kind==='barrier') {
        for(const x of [44,176]) {rect(x,96,20,110,'#8d96a0');oval(x+10,82,16,16,'#f6a73a');}
        for(const y of [112,160]) {rect(24,y,192,26,'#e4473f');for(let x=40;x<200;x+=48) poly([[x,y],[x+20,y],[x+8,y+26],[x-12,y+26]],'#f4efe6');}
    } else if(kind==='turn' || kind==='arrow' || kind==='sign') {
        if(kind!=='arrow') post();rect(24,45,192,95,'#f2cd61');poly([[60,63],[113,63],[164,93],[113,123],[60,123],[111,93]],'#384453');
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
