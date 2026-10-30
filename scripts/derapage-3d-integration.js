/* global console, process */
import assert from 'node:assert/strict';
process.argv.push('--harness-only');
const {mount}=await import('./derapage-mobile-scene.js');
process.argv.pop();
const {controller}=await import('../src/engines/derapage/ai.ts');
// Full, normal-start scene race. Replay the exact timestamped engine input tape
// through both scene update paths. No finish scenario or kart state injection.
let tape,reference;
for(const view of [false,true]) {
    const h=await mount('derapage','dragon'); h.session.send('start');
    try {
        h.engine.loadLevel(0,28);h.scene.view3d=view;
        const input=h.engine.input.bind(h.engine),steps=[];
        let index=0,lap=-1,branches=0;
        h.engine.input=()=>{
            const value=tape ? tape[index] : controller(h.engine.karts[0],h.engine.track);
            assert.ok(value);steps.push(value);input(value);index++;
        };
        const draw=h.scene.draw.bind(h.scene);
        h.scene.draw=()=>{
            assert.equal(h.scene.active3d,view); branches++;
            // Render each completed lap and normal start; intermediate updates still
            // traverse production input, stepping, HUD, pause and result handling.
            if(h.engine.karts[0].lap!==lap) {lap=h.engine.karts[0].lap;draw();}
        };
        assert.equal(h.engine.karts[0].lap,0);
        for(let i=0;i<12000 && h.engine.status==='playing';i++) h.frame(1000/60);
        assert.equal(h.engine.karts[0].lap,3); assert.equal(h.engine.lapTimesMs.length,3);
        assert(branches>1000);
        const result=h.engine.snapshot();
        if(reference) {assert.deepEqual(result,reference);assert.deepEqual(steps,tape);}
        else {reference=result;tape=steps;}
    } finally {h.cleanup();}
}
console.log('Y02 production scene: normal start, three laps, identical timestamped input tape and final snapshot');
// The same absolute finger direction must also produce identical displayed
// race times and ranking. The short finish fixture belongs only to this HUD
// check; the full-race equivalence above always starts on the normal grid.
const {beginThumb,moveThumb}=await import('../src/games/derapage/joystick.ts');
let displayed;
for(const view of [false,true]) {
    const h=await mount('derapage','dragon');h.session.send('start');
    try {
        const api=globalThis.window.__DERAPAGE_TEST__;
        api.scenario('finish');h.scene.cameraFixed=true;h.scene.view3d=view;
        const world=h.engine.karts[0].angle+1.45;
        h.scene.thumb=beginThumb(1,0,0);
        for(let frame=0;frame<180 && h.engine.status==='playing';frame++) {
            const heading=view ? world-h.engine.karts[0].angle-Math.PI/2 : world;
            moveThumb(h.scene.thumb,Math.cos(heading)*50,Math.sin(heading)*50);
            api.advance(1000/60);
        }
        assert.equal(h.engine.status,'won');
        const state=h.engine.snapshot(),result={timing:state.timing,order:state.order,rows:h.scene.hud.children.map(row=>row.textContent)};
        assert(result.rows.some(row=>row.includes('COURSE')));
        assert(result.rows.some(row=>row.includes('PLACE 1/6')));
        if(displayed) assert.deepEqual(result,displayed,'Y07 identical displayed times and ranking');
        else displayed=result;
    } finally {h.cleanup();}
}
console.log('Y07 production HUD: identical displayed race time, best lap and ranking');
