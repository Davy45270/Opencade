/* global console */
import assert from 'node:assert/strict';
import { FAR, projectPoint } from '../src/games/derapage/view3d.ts';
export function graphicsBudget(actual,reference) {
    assert(actual<=Math.min(800,Math.floor(reference*1.5)),`3D Graphics budget: ${actual} <= ${Math.min(800,Math.floor(reference*1.5))}`);
}
// Top-down counts come from cadence's same 96 positions, before any physics step.
export function render3dFrames(h, topMaximum, level) {
    h.scene.view3d=true;
    let maximum=0, inflatedMaximum=0;
    for(const p of h.engine.track.points) {
        Object.assign(h.engine.karts[0],p);h.frame();
        maximum=Math.max(maximum,h.calls.length);
        assert(h.graphicsObjects.some(g=>g.depth===1000),'HUD stays above 3D props');
        const images=h.images.filter(i=>i.placements.setVisible?.[0] && i.texture.key.includes('-rear-'));
        for(const image of images) {
            const [x,y]=image.placements.setPosition;
            const kart=h.engine.karts.find(k=>{
                const q=projectPoint(k,h.engine.karts[0]);
                return q && Math.abs(q.x-x)<1e-7 && Math.abs(q.y-(k.jumpHeight??0)*q.scale-Math.min(90,4*q.scale)/2-y)<1e-7;
            });
            assert(kart,'rear sprite position follows projection');
            const q=projectPoint(kart,h.engine.karts[0]);
            assert.equal(image.placements.setDepth[0],FAR-q.depth+2,'depth shared by images and Graphics props');
        }
        assert.equal(images.length,h.engine.karts.filter(k=>{
            const q=projectPoint(k,h.engine.karts[0]);if(!q || k.id>h.scene.rivals.length)return false;
            const size=Math.min(90,4*q.scale);
            return q.x+size/2>=0 && q.x-size/2<=360 && q.y>=96 && q.y-size<=640;
        }).length,'only visible karts submitted');
        h.calls.push(...Array.from({length:1000},()=>['fillRect',0,0,1,1]));
        inflatedMaximum=Math.max(inflatedMaximum,h.calls.length);
    }
    graphicsBudget(maximum,topMaximum);
    assert.throws(()=>graphicsBudget(inflatedMaximum,topMaximum),{name:'AssertionError'},'inflated real 3D Graphics calls fail');
    h.scene.view3d=false;
    console.log(`Graphics ${level===26?'K03':level+1}: top ${topMaximum}, 3D ${maximum}, limit ${Math.floor(topMaximum*1.5)}`);
}
