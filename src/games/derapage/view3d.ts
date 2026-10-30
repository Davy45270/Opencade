import type Phaser from 'phaser';
import type { Engine } from '../../engines/derapage/engine';
import { nearest, onBoost, kartFootprint, onShortcut, type Vec } from '../../engines/derapage/track';
export const HORIZON = 212;
export const FAR = 180;
export const BAND = 4;
export const COLUMN = 12;
const FOCAL = 220, HEIGHT = 7, BEHIND = 6;
export interface Camera extends Vec { angle: number }
export function groundDistance(y: number): number { return Math.min(FAR, HEIGHT * FOCAL / Math.max(1, y-HORIZON)); }
export function projectPoint(point: Vec, camera: Camera): { x: number; y: number; scale: number; depth: number } | null {
    const dx=point.x-camera.x, dy=point.y-camera.y;
    const depth=dx*Math.cos(camera.angle)+dy*Math.sin(camera.angle)+BEHIND;
    if (depth<2 || depth>FAR) return null;
    const scale=FOCAL/depth;
    return { x:180+(-dx*Math.sin(camera.angle)+dy*Math.cos(camera.angle))*scale, y:HORIZON+HEIGHT*scale, scale, depth };
}
/** Inverse of projectPoint on the ground plane, using the same capped depth. */
export function groundPoint(x: number, y: number, camera: Camera): Vec {
    const depth=groundDistance(y), forward=depth-BEHIND, side=(x-180)*depth/FOCAL;
    return {x:camera.x+Math.cos(camera.angle)*forward-Math.sin(camera.angle)*side,
        y:camera.y+Math.sin(camera.angle)*forward+Math.cos(camera.angle)*side};
}
/** Screen up is the current heading. Undefined retains the joystick dead zone. */
export function screenHeading(heading: number | undefined, angle: number): number | undefined {
    return heading === undefined ? undefined : angle+heading+Math.PI/2;
}
/** Raw frame intervals supplied by the scene; independent of simulation steps. */
export class Cadence {
    private samples: number[] = [];
    private sum = 0;
    private low = 0;
    private wasLow = false;
    elapsed = 0;
    fps = 60;
    fallback = false;
    add(delta: number): void {
        if (!Number.isFinite(delta) || delta<=0 || this.fallback) return;
        this.elapsed+=delta; this.samples.push(delta); this.sum+=delta;
        while (this.samples.length>1 && this.sum-(this.samples[0] ?? 0)>=2000) this.sum-=this.samples.shift() ?? 0;
        this.fps=this.samples.length*1000/this.sum;
        const below=this.sum>=2000 && this.fps<30-1e-9;
        if (below && this.wasLow) this.low+=delta;
        else this.low=0;
        this.wasLow=below;
        this.fallback=this.low>=3000;
    }
}
export interface RenderCost { lines: number; samples: number; segmentChecks: number; boostChecks: number; sprites: number }
/** Fixed grid: 107 lines × 30 samples. Each sample visits the 96 segments plus the initial hint. */
export function draw3d(graphics: Phaser.GameObjects.Graphics, e: ReturnType<Engine['snapshot']>, kart: (id: number, x: number, y: number, size: number, rotation: number, depth: number) => void, layer?: (depth: number) => Phaser.GameObjects.Graphics): RenderCost {
    const g=graphics;
    const p=e.karts[0];
    const cost={lines:0,samples:0,segmentChecks:0,boostChecks:0,sprites:0};
    if (!p) return cost;
    const t=e.track, theme=t.circuit.theme, c=Math.cos(p.angle), s=Math.sin(p.angle);
    g.fillStyle(0x8ac7dd); g.fillRect(0,96,360,HORIZON-96);
    g.fillStyle(theme.ground); g.fillRect(0,HORIZON,360,640-HORIZON);
    const rectangles: {x:number;y:number;width:number;height:number;color:number}[]=[];
    let previous=new Map<string,typeof rectangles[number]>();
    const finish=t.finishLine, vx=finish.b.x-finish.a.x, vy=finish.b.y-finish.a.y, finishLength=Math.hypot(vx,vy);
    // Keep query identity so the exact search can start from its preceding hint.
    const q={x:0,y:0};
    for(let y=HORIZON;y<640;y+=BAND) {
        cost.lines++;
        const depth=groundDistance(y+2), forward=depth-BEHIND;
        let runStart=0,runColor=-1;
        const current=new Map<string,typeof rectangles[number]>();
        const run=(end:number):void=>{
            const key=`${String(runStart)}/${String(end)}/${String(runColor)}`, old=previous.get(key);
            if(old) { old.height+=BAND; current.set(key,old); }
            else { const rect={x:runStart,y,width:end-runStart,height:BAND,color:runColor}; rectangles.push(rect); current.set(key,rect); }
        };
        for(let x=0;x<360;x+=COLUMN) {
            const side=(x+COLUMN/2-180)*depth/FOCAL;
            q.x=p.x+c*forward-s*side; q.y=p.y+s*forward+c*side;
            const n=nearest(t,q), half=(t.widths[n.index] ?? 16)/2;
            cost.samples++; cost.segmentChecks+=t.points.length+1;
            let color=theme.ground;
            if(n.distance<half+.7) color=n.distance>half ? theme.border : theme.road ?? 0x38434d;
            if(onShortcut(t,q)) color=0xd0a267;
            if(n.distance<half && t.boosts.some(b=>{ cost.boostChecks++; return onBoost(t,b,q,n); })) color=0x64edbd;
            const a=finish.a;
            const along=((q.x-a.x)*vx+(q.y-a.y)*vy)/finishLength, across=((q.x-a.x)*-vy+(q.y-a.y)*vx)/finishLength;
            if(along>=0 && along<=finishLength && Math.abs(across)<1) color=(Math.floor(along*2)+Math.floor(across+1))%2 ? 0xffffff : 0x101827;
            if(color!==runColor) {
                if(x>runStart) run(x);
                runStart=x; runColor=color;
            }
        }
        run(360); previous=current;
    }
    // Merge identical runs vertically, then submit one style per ground colour.
    for(const color of new Set(rectangles.map(r=>r.color))) {
        g.fillStyle(color);
        for(const r of rectangles) if(r.color===color) g.fillRect(r.x,r.y,r.width,r.height);
    }
    for(const kind of ['ramp','leaves','lava','gap'] as const) {
        const indices=kind==='ramp' ? t.circuit.jumps : t.circuit[kind] ?? [];
        for(const index of indices) {
            const f=kartFootprint(t,index,kind);
            const polygon=[{x:f.a.x+f.nx*f.half,y:f.a.y+f.ny*f.half},{x:f.b.x+f.nx*f.half,y:f.b.y+f.ny*f.half},
                {x:f.b.x-f.nx*f.half,y:f.b.y-f.ny*f.half},{x:f.a.x-f.nx*f.half,y:f.a.y-f.ny*f.half}].map(q=>projectPoint(q,p));
            if(polygon.some(q=>!q) || !polygon.some(q=>q && q.x>=0 && q.x<=360 && q.y<=640)) continue;
            g.fillStyle({ramp:0xdbaa55,leaves:0xeeb83b,lava:0xb92f22,gap:0x211b2b}[kind]);
            g.fillPoints(polygon as Vec[],true);
        }
    }
    for(const [i,gate] of t.slalom.entries()) {
        const ends=[-1,1].map(side=>projectPoint({x:gate.x+gate.nx*gate.half*side,y:gate.y+gate.ny*gate.half*side},p));
        const a=ends[0],b=ends[1];
        if(!a || !b || Math.max(a.x,b.x)<0 || Math.min(a.x,b.x)>360 || Math.min(a.y,b.y)>640) continue;
        const color=p.slalomMissed?.[i]===p.lap ? 0xe64049 : p.slalomPassed?.[i]===p.lap ? 0x49e087 : i%2 ? 0x3285e8 : 0xe64049;
        g.lineStyle(Math.max(2,a.scale*.7),color);
        g.lineBetween(a.x,a.y,a.x,a.y-7*a.scale); g.lineBetween(b.x,b.y,b.x,b.y-7*b.scale);
        g.lineBetween(a.x,a.y-7*a.scale,b.x,b.y-7*b.scale);
    }
    const sprites=[...t.trees.map(tree=>({...tree,kind:'tree' as const})),...e.karts.map(k=>({...k,kind:'kart' as const})),...e.crates.filter(c=>c.cooldown===0).map(c=>({...c,kind:'crate' as const})),...e.puddles.map(c=>({...c,kind:'puddle' as const}))]
        .map(item=>({item,screen:projectPoint(item,p)})).filter(v=>v.screen!==null).sort((a,b)=>(b.screen?.depth ?? 0)-(a.screen?.depth ?? 0));
    for(const {item,screen:a} of sprites) {
        if(!a) continue;
        const half=item.kind==='kart' ? Math.min(90,4*a.scale)/2 : item.kind==='tree' ? item.radius*a.scale : 1.5*a.scale;
        const height=item.kind==='kart' ? Math.min(90,4*a.scale) : item.kind==='tree' ? (5+item.radius)*a.scale : item.kind==='crate' ? 3*a.scale : a.scale;
        if(a.x+half<0 || a.x-half>360 || a.y<96 || a.y-height>640) continue;
        cost.sprites++;
        if(item.kind==='kart') { kart(item.id,a.x,a.y-(item.jumpHeight ?? 0)*a.scale,Math.min(90,4*a.scale),item.angle-p.angle,FAR-a.depth+2); }
        else {
        const g=layer?.(FAR-a.depth+2) ?? graphics;
        if(item.kind==='tree') {
            g.fillStyle(0x664730); g.fillRect(a.x-a.scale/2,a.y-5*a.scale,a.scale,5*a.scale); g.fillStyle(theme.decor); g.fillCircle(a.x,a.y-5*a.scale,item.radius*a.scale);
        } else if(item.kind==='crate') {
            g.fillStyle(0xffd166); g.fillRect(a.x-1.5*a.scale,a.y-3*a.scale,3*a.scale,3*a.scale);
            g.lineStyle(Math.max(1,a.scale*.25),0x533946); g.lineBetween(a.x-a.scale,a.y-1.5*a.scale,a.x+a.scale,a.y-1.5*a.scale);
            g.lineBetween(a.x,a.y-2.5*a.scale,a.x,a.y-.5*a.scale);
        } else { g.fillStyle(0x302842); g.fillEllipse(a.x,a.y,3*a.scale,a.scale); }
        }
    }
    const a=projectPoint(t.finishLine.a,p),b=projectPoint(t.finishLine.b,p);
    if(a && b) {
        const g=layer?.(FAR-(a.depth+b.depth)/2+2) ?? graphics;
        g.lineStyle(Math.max(1,a.scale*.6),0xf4e6b1); g.lineBetween(a.x,a.y,a.x,a.y-8*a.scale); g.lineBetween(b.x,b.y,b.x,b.y-8*b.scale);
        for(let i=0;i<12;i++) { const u=i/12,v=(i+1)/12; g.lineStyle(6,i%2 ? 0xffffff : 0x101827); g.lineBetween(a.x+(b.x-a.x)*u,a.y-8*a.scale+(b.y-a.y-8*(b.scale-a.scale))*u,a.x+(b.x-a.x)*v,a.y-8*a.scale+(b.y-a.y-8*(b.scale-a.scale))*v); }
    }
    return cost;
}
