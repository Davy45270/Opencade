import type Phaser from 'phaser';
import { kartFootprint, nearest, shortcutAt, type Track, type Vec } from '../../engines/derapage/track';
import { required } from '../../engines/derapage/access';
import { inView } from './road';
type Project = (x: number, y: number) => Vec;
/** All movement here is scene-time decoration, never simulation state. */
export function kartLandscape(g: Phaser.GameObjects.Graphics, t: Track, project: Project, scale: number, time: number, baked = false): void {
    const theme = t.circuit.theme.kart;
    if (!theme || (!baked && theme !== 'volcano')) return;
    for (const [i, tree] of t.trees.entries()) {
        const p = project(tree.x,tree.y);
        if (!baked && (p.y < 110 || p.y > 620 || !inView([p], 16*scale))) continue;
        if (theme === 'bamboo' && baked) {
            g.fillStyle(0x247eac,.8); g.fillEllipse(p.x,p.y,12*scale,5*scale);
            g.fillStyle(0x718b80); g.fillEllipse(p.x+4*scale,p.y,4*scale,3*scale);
        } else if (theme === 'volcano' && !baked) {
            g.fillStyle(0xe64d22); g.fillEllipse(p.x,p.y,10*scale,4*scale);
            g.lineStyle(scale,0xffbb36);
            g.lineBetween(p.x-4*scale,p.y,p.x+3*scale,p.y+Math.sin(time/430+i)*scale);
        }
    }
    const route = shortcutAt(t, required(t.points[t.circuit.shortcut?.from ?? 0]));
    if (route && baked) {
        const a = project(route.x,route.y), b = project(required(t.points[required(t.circuit.shortcut).to]).x,required(t.points[required(t.circuit.shortcut).to]).y);
        g.lineStyle(13*scale,0x247ca2); g.lineBetween(a.x,a.y,b.x,b.y);
        g.lineStyle(8*scale,0x4dc8ca); g.lineBetween(a.x,a.y,b.x,b.y);
    }
}
export function kartRoadArt(g: Phaser.GameObjects.Graphics, t: Track, project: Project, scale: number, time: number, baked = false): void {
    const theme = t.circuit.theme.kart;
    if (!theme) return;
    const stroke = (a: Vec,b: Vec,width: number,color: number,alpha = 1): void => {
        const p=project(a.x,a.y),q=project(b.x,b.y);
        g.lineStyle(width*scale,color,alpha); g.lineBetween(p.x,p.y,q.x,q.y);
    };
    const route = t.circuit.shortcut;
    if (route) {
        const a=required(t.points[route.from]),b=required(t.points[route.to]);
        if (baked) { stroke(a,b,route.width+1.2,0x5e4935); stroke(a,b,route.width,0xd0a267); }
        // A translucent curtain leaves the narrow road legible behind the water.
        const x=(a.x+b.x)/2,y=(a.y+b.y)/2, n=nearest(t,{x,y});
        const p=project(x+n.nx*4,y+n.ny*4);
        if (baked) { g.fillStyle(0x5ddaff,.55); g.fillRect(p.x-4*scale,p.y-10*scale,8*scale,12*scale); }
        if (!baked && inView([p], 12*scale)) for (let j=0;j<7;j++) {
            g.lineStyle(.3*scale,0xe2ffff,.8);
            const phase=(time/450+j*.37)%1;
            g.lineBetween(p.x+(j-3)*scale,p.y-(10-phase*3)*scale,p.x+(j-3)*scale,p.y+scale);
        }
        if (baked) { g.fillStyle(0xdcffff,.75); g.fillEllipse(p.x,p.y+2*scale,10*scale,2*scale); }
    }
    for (let i=0;i<96;i++) {
        if (!baked && !t.circuit.leaves?.includes(i) && !t.circuit.lava?.includes(i)) continue;
        const a=required(t.points[i]),b=required(t.points[(i+1)%96]);
        if (!baked && !inView([project(a.x,a.y),project(b.x,b.y)], (required(t.widths[i])/2+4)*scale)) continue;
        const n=kartFootprint(t,i,'ramp'),half=n.half;
        if (baked && ((theme === 'bamboo' && i>=27 && i<=30) || (theme === 'autumn' && i>=78 && i<=81))) {
            stroke(a,b,half*2,0x845934);
            for (let j=0;j<4;j++) {
                const x=a.x+(b.x-a.x)*j/4,y=a.y+(b.y-a.y)*j/4;
                stroke({x:x+n.nx*half,y:y+n.ny*half},{x:x-n.nx*half,y:y-n.ny*half},.4,0xdab582);
            }
        }
        if (t.circuit.leaves?.includes(i)) {
            const heap=kartFootprint(t,i,'leaves');
            for (let j=0;j<15;j++) {
                const u=(j*.37)%1,side=Math.sin(j*8+i)*Math.max(0,heap.half-.8),p=project(heap.a.x+(heap.b.x-heap.a.x)*u+n.nx*side,heap.a.y+(heap.b.y-heap.a.y)*u+n.ny*side);
                if (baked) { g.fillStyle(j%2 ? 0xeeb83b : 0xa83821); g.fillEllipse(p.x,p.y,1.6*scale,.8*scale); }
                const phase=time/1100+j;
                if (!baked && inView([p], 3*scale)) { g.fillStyle(0xffcc64,.8); g.fillEllipse(p.x+Math.sin(phase)*scale,p.y-(1+Math.cos(phase))*.8*scale,scale,.4*scale); }
            }
        }
        if (!baked && t.circuit.lava?.includes(i)) {
            const plate=kartFootprint(t,i,'lava');
            stroke(plate.a,plate.b,plate.half*2,0xb92f22);
            for (let j=0;j<4;j++) {
                const side=(j-1.5)*plate.half/2;
                stroke({x:plate.a.x+n.nx*side,y:plate.a.y+n.ny*side},{x:plate.b.x+n.nx*(side+Math.sin(time/500+i+j)*.3),y:plate.b.y+n.ny*(side+Math.sin(time/500+i+j)*.3)},.6,0xffb62e);
            }
        }
        if (baked && t.circuit.gap?.includes(i)) {
            // Side planks remain a continuous, slower route around the missing deck.
            stroke(a,b,half*2,0x856044);
            const hole=kartFootprint(t,i,'gap');
            stroke(hole.a,hole.b,hole.half*2,0x211b2b);
            const p=project(a.x,a.y); g.fillStyle(0xf35b24); g.fillTriangle(p.x-2*scale,p.y,p.x+2*scale,p.y,p.x,p.y-3*scale);
        }
        if (baked && t.circuit.jumps.includes(i)) {
            const ramp=kartFootprint(t,i,'ramp');
            stroke(ramp.a,ramp.b,ramp.half*2,0xdbaa55);
            for (let j=0;j<3;j++) {
                const u=j/3,p={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
                stroke({x:p.x+n.nx*half,y:p.y+n.ny*half},{x:p.x-n.nx*half,y:p.y-n.ny*half},.5,0xfff0b0);
            }
        }
        if (baked && i%12===5 && !t.circuit.gap?.includes(i)) {
            const p=project(a.x,a.y),q=project(b.x,b.y),angle=Math.atan2(q.y-p.y,q.x-p.x);
            g.lineStyle(.5*scale,0xffe1a3,.8);
            for (const side of [-1,1]) g.lineBetween(p.x,p.y,p.x-Math.cos(angle+side*.65)*2*scale,p.y-Math.sin(angle+side*.65)*2*scale);
        }
    }
}
export function kartTree(g: Phaser.GameObjects.Graphics, theme: NonNullable<Track['circuit']['theme']['kart']>, p: Vec, radius: number, scale: number, time: number, baked = false): void {
    if (theme === 'bamboo' && baked) {
        for (let j=-1;j<=1;j++) {
            g.lineStyle(.75*scale,0x79c63d); g.lineBetween(p.x+j*scale,p.y,p.x+j*scale,p.y-(5+j)*scale);
            for (let h=1;h<5;h++) {
                g.lineStyle(.2*scale,0xd8e98d); g.lineBetween(p.x+(j-.4)*scale,p.y-h*scale,p.x+(j+.4)*scale,p.y-h*scale);
                g.fillStyle(0x40a749); g.fillEllipse(p.x+(j+1)*scale,p.y-h*scale,2*scale,.6*scale);
            }
        }
    } else if (theme === 'autumn' && baked) {
        g.lineStyle(scale,0x613c2e); g.lineBetween(p.x,p.y,p.x,p.y-4*scale);
        for (let j=0;j<5;j++) { g.fillStyle(j%2 ? 0xf6ab32 : 0xc9472b); g.fillCircle(p.x+Math.sin(j*3)*radius*scale,p.y-(3+Math.cos(j*3))*scale,radius*scale); }
    } else if (theme === 'volcano') {
        if (baked) { g.fillStyle(0x686170); g.fillTriangle(p.x-3*scale,p.y,p.x+3*scale,p.y,p.x-scale,p.y-4*scale); return; }
        const pulse=Math.sin(time/210+p.x)*.5+.5;
        g.fillStyle(0xf57325); g.fillTriangle(p.x-scale,p.y,p.x+scale,p.y,p.x,p.y-(2+pulse*2)*scale);
        g.fillStyle(0xffd46a); g.fillTriangle(p.x-.5*scale,p.y,p.x+.5*scale,p.y,p.x,p.y-2*scale);
        g.fillStyle(0x9a8798,.28); g.fillCircle(p.x+Math.sin(time/1100)*scale,p.y-(5+pulse)*scale,2*scale);
    }
}
