import { Engine } from '../src/engines/derapage/engine';
import { analogSteer, physics } from '../src/engines/derapage/physics';
import { boostStrip, onBoost, nearest, difficulty, distance } from '../src/engines/derapage/track';
import { required } from '../src/engines/derapage/access';
import { drawRoad } from '../src/games/derapage/road';
import { acceptsThumb, beginThumb, moveThumb, thumbDirection, thumbIntensity } from '../src/games/derapage/joystick';
type Check = (ok: boolean, message: string) => void;
export const mobileCases: { name: string; run(check: Check): void }[] = [
    { name:'Z40 route jointe et bords physiques', run(check) {
        for (const level of [0,4,9]) {
            const t=new Engine(level).track, polygons: {x:number;y:number}[][]=[], circles: number[][]=[];
            drawRoad({fillStyle(){return this;},fillPoints(points){polygons.push(points);return this;},fillCircle(x,y,r){circles.push([x,y,r]);return this;}},t,(x,y)=>({x:x*5,y:y*5}),5);
            check(polygons.length===192 && circles.length===384,'deux passes complètes et deux jointures par segment, aucun trait épais');
            for (let i=0;i<96;i++) {
                const a=required(t.points[i]),b=required(t.points[(i+1)%96]),len=distance(a,b),half=required(t.widths[i])/2;
                const polygon=required(polygons[96+i]);
                for (const [index,p,side] of [[0,a,1],[1,b,1],[2,b,-1],[3,a,-1]] as const) {
                    const q=required(polygon[index]);
                    check(Math.hypot(q.x/5-(p.x-(b.y-a.y)/len*half*side),q.y/5-(p.y+(b.x-a.x)/len*half*side))<1e-9,'bord dessiné = normale physique × widths/2');
                }
                check(Math.abs(required(required(circles[192+i*2])[2])-half*5)<1e-9,'rayon de jointure = demi-largeur physique');
            }
            // Only exposed capsule points form the silhouette: overlapping inner
            // offsets are road interior. Compare its visible edge to actual nearest.
            let exposed=0;
            for(let i=0;i<96;i++) for(let angle=0;angle<16;angle++) {
                const a=required(t.points[i]),half=required(t.widths[i])/2;
                const point={x:a.x+Math.cos(angle*Math.PI/8)*half,y:a.y+Math.sin(angle*Math.PI/8)*half};
                const covered=t.points.some((c,j)=>{
                    const d=required(t.points[(j+1)%96]),dx=d.x-c.x,dy=d.y-c.y;
                    const u=Math.max(0,Math.min(1,((point.x-c.x)*dx+(point.y-c.y)*dy)/(dx*dx+dy*dy)));
                    return Math.hypot(point.x-c.x-dx*u,point.y-c.y-dy*u)<required(t.widths[j])/2-1e-8;
                });
                if(!covered) {
                    const n=nearest(t,point);exposed++;
                    check(Math.abs(n.distance-required(t.widths[n.index])/2)*5<=1,'silhouette visible à moins de 1 px du bord physique');
                }
            }
            check(exposed>0,'des bords exposés sont effectivement mesurés');
            check(Math.abs(distance(t.finishLine.a,t.finishLine.b)-required(t.widths[0]))<1e-9,'damier arrivée exactement aussi large que la chaussée');
        }
    } },
    { name:'Z41 bandes : largeur entière, limites et dessin identiques', run(check) {
        for (let level=2;level<30;level++) {
            const t=new Engine(level).track;
            for (const b of t.boosts) {
                const strip=boostStrip(t,b);
                for(const u of [.01,strip.length*.5,strip.length*.9]) for(const side of [-1,1]) for(const offset of [-.02,.02]) {
                    const p=strip.point(u,side*(strip.half+offset)),n=nearest(t,p);
                    check(onBoost(t,b,p)===(n.distance<=required(t.widths[n.index])/2),'la section physique nearest décide au bord, même en fin de bande');
                }
                for (const fraction of [-.999,-.5,0,.5,.999]) check(onBoost(t,b,strip.point(strip.length/2,strip.half*fraction)),'toute la largeur déclenche');
                for (const side of [-1,1]) check(!onBoost(t,b,strip.point(strip.length/2,side*(strip.half+.001))),'rien en dehors des bords');
                for (const u of [-.001,strip.length+.001]) check(!onBoost(t,b,strip.point(u,0)),'rien avant ou après la bande');
                for(let index=0;index<t.points.length;index++) {
                    const gap=(index-b.index+t.points.length)%t.points.length;
                    if(gap>1 && gap<t.points.length-1) check(!onBoost(t,b,required(t.points[index])),'une autre portion de route ne déclenche pas la bande');
                }
                check(Math.abs(distance(required(strip.corners[0]),required(strip.corners[3]))-required(t.widths[b.index]))<1e-9,'largeur dessinée = chaussée');
                const k={...required(new Engine(level).karts[0]),...strip.point(strip.length/2,strip.half*.9),angle:0,vx:20,vy:0};
                physics(k,{steer:0,drift:false,bonus:false},t,1/60,.45);
                check(k.stripActive===true && k.boostMs>800,'le vrai moteur déclenche au bord de la bande');
            }
        }
    } },
    { name:'Z42 joystick relatif, zone morte, reprise et boutons', run(check) {
        check(analogSteer(6)===0 && analogSteer(23)===.5 && analogSteer(40)===1 && analogSteer(-40)===-1,'commande analogique : zone morte 6 px, pleine déflexion 40 px');
        for (const scale of [.5,.8,1.1]) for (const x of [20,180,340]) for (const y of [320,480,620]) {
            check(acceptsThumb(true,y*scale,0,640*scale,true),'pose partout dans la moitié basse');
            check(!acceptsThumb(false,y*scale,0,640*scale,true),'boutons exclus par la cible canvas');
            const thumb=beginThumb(9,x*scale,y*scale);
            moveThumb(thumb,thumb.x+10,thumb.y); check(thumbDirection(thumb)===undefined,'zone morte 10 px CSS');
            moveThumb(thumb,thumb.x,thumb.y-40); check(thumbDirection(thumb)===-Math.PI/2 && thumbIntensity(thumb)===1,'pleine déflexion à 40 px CSS');
            check(thumbDirection(null)===undefined,'relâché efface le cap');
            const resumed=beginThumb(11,thumb.x+20,thumb.y-10); check(thumbDirection(resumed)===undefined,'reprise après Élan : nouvelle origine');
            moveThumb(resumed,resumed.x+40,resumed.y); check(thumbDirection(resumed)===0,'aucun cap perdu après reprise');
        }
        check(!acceptsThumb(true,95,0,640,true),'HUD exclu');
    } },
    ...Array.from({length:30},(_,level)=>({ name:`Z43 plafond herbe circuit ${String(level+1)}`, run(check: Check) {
        const e=new Engine(level),t=e.track;
        if(t.circuit.theme.urban) { check(t.walls.every(Boolean),'urbain : rails continus'); return; }
        // Fixed local probes isolate surface speed from steering, trees and rails.
        t.trees=[];t.walls.fill(false);
        let found=false;
        for(let i=0;i<96 && !found;i++) {
            if(t.circuit.jumps.includes(i) || t.circuit.gap?.includes(i) || t.circuit.lava?.includes(i)) continue;
            const a=required(t.points[i]),b=required(t.points[(i+1)%96]),len=distance(a,b),half=required(t.widths[i])/2;
            const road={x:(a.x+b.x)/2,y:(a.y+b.y)/2},grass={x:road.x-(b.y-a.y)/len*(half+4),y:road.y+(b.x-a.x)/len*(half+4)};
            const n=nearest(t,grass);
            if(n.distance<=required(t.widths[n.index])/2 || t.boosts.some(boost=>onBoost(t,boost,road))) continue;
            const angle=Math.atan2(b.y-a.y,b.x-a.x),r={...required(e.karts[0]),...road,angle},g={...r,...grass};
            for(let frame=0;frame<240;frame++) {
                Object.assign(r,road);Object.assign(g,grass);
                physics(r,{steer:0,drift:false,bonus:false},t,1/60,difficulty(level).grassGrip);
                physics(g,{steer:0,drift:false,bonus:false},t,1/60,difficulty(level).grassGrip);
            }
            const rs=Math.hypot(r.vx,r.vy),gs=Math.hypot(g.vx,g.vy);
            check(rs>=20 && gs<=rs*.55,`route ${rs.toFixed(2)}, herbe ${gs.toFixed(2)} : plafond ≤55 %`);
            found=true;
        }
        check(found,'sondes route/herbe trouvées sur la géométrie actuelle');
    } })),
];
