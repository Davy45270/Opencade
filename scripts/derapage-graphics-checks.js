/* global console */
import assert from 'node:assert/strict';
import { scenerySprites } from '../src/games/derapage/scenery.ts';
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
        const decor=h.images.filter(i=>i.placements.setVisible?.[0] && i.texture.key.includes('-roadside-'));
        const visible=scenerySprites(h.engine.track).map(item=>({item,q:projectPoint(item,h.engine.karts[0])})).filter(({item,q})=>q && q.x+item.radius*q.scale>=0 && q.x-item.radius*q.scale<=360 && q.y>=96 && q.y-(5+item.radius)*q.scale<=640);
        assert.equal(decor.length,visible.length,'only visible roadside sprites submitted');
        assert(h.scene.paint.stats().used<h.scene.paint.stats().capacity,'sprite pool has room');
        for(const {item,q} of visible) {
            const sprite=decor.find(i=>i.texture.key.endsWith(`-roadside-${item.kind}`) && Math.abs(i.placements.setPosition[0]-q.x)<1e-7 && Math.abs(i.placements.setPosition[1]-(q.y-item.radius*q.scale))<1e-7);
            assert(sprite,'theme art sprite follows perspective projection');
            assert.deepEqual(sprite.placements.setDisplaySize,[item.radius*2*q.scale,item.radius*2*q.scale]);
            assert.deepEqual(sprite.placements.setDepth,[FAR-q.depth+2],'roadside and karts share depth order');
        }
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
