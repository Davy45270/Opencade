/* global console, process, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vehicleLengthAt } from '../tests/arcade-art-checks.ts';
import { roadside } from '../src/games/derapage/scenery.ts';
import { graphicsFps } from './derapage-cadence-model.js';
process.argv.push('--harness-only');
const { mount, useSceneModule } = await import('./derapage-mobile-scene.js');
process.argv.pop();
const { render3dFrames } = await import('./derapage-graphics-checks.js');

// Reference maxima measured over all 96 centre-line positions with the old scene.
// Count every Graphics API call, including styles, clearing and transforms.
const circuits = [[0, 591], [1, 350], [9, 572], [26, 471]];
function withinBudget(calls, reference) {
    assert(calls <= Math.min(520, Math.floor(reference * 1.25)), `Graphics frame budget: ${calls} <= ${Math.min(520, Math.floor(reference * 1.25))}`);
}
let budgetChecks=0;
async function renderBudget() {
    for (const [level, reference] of circuits) {
        const h = await mount('derapage', 'dragon');
        h.session.send('start');
        try {
            h.engine.loadLevel(level, 28);
            h.baked.length = 0; h.removedTextures.length=0;
            h.frame(); // Cold road rasterization is charged once, separately.
            const rows = [...h.scene.hud.children];
            const writes=rows.map(row=>row.textWrites);
            h.frame();
            assert.deepEqual(rows.map(row=>row.textWrites),writes,'unchanged HUD has zero text assignments');
            assert.deepEqual(h.scene.hud.children, rows, 'unchanged HUD preserves its DOM nodes');

            assert.equal(h.baked.filter(c => c[0] === 'generateTexture').length, 1);
            const playerArt=h.images.find(i=>i.placements.setVisible?.[0] && i.texture.key.includes('-kart-'));
            assert(playerArt,'top vehicle atlas is used');
            assert(vehicleLengthAt('dragon',playerArt.placements.setDisplaySize[0])>=20,'vehicle silhouette at least twenty screen pixels long');
            if(roadside(h.engine.track).length) {
                assert(h.baked.some(c=>c[0]==='fillPoints'),'procedural roadside rasterized');
                assert(h.baked.some(c=>c[0]==='fillStyle' && c[2]===.12),'light ground texture baked');
            }
            const baked = h.baked.length;
            const removed=h.removedTextures.length;
            const image=h.images.find(image=>image.placements.setOrigin && !image.placements.destroy);
            assert.ok(image,'road image exists');
            assert.deepEqual(image.placements.setOrigin,[0,0]);
            assert.deepEqual(image.placements.setScale,[1]);
            assert.deepEqual(image.placements.setRotation,[0]);
            assert.deepEqual(image.placements.setVisible,[true]);
            const margin=Math.max(32,Math.max(...h.engine.track.widths)/2+20);
            const left=Math.min(...h.engine.track.points.map(p=>p.x))-margin;
            const top=Math.min(...h.engine.track.points.map(p=>p.y))-margin;
            const player=h.engine.karts[0];
            assert.deepEqual(image.placements.setPosition,[180+(left-player.x)*5,368+(top-player.y)*5]);
            assert(h.baked.filter(c=>c[0]==='fillCircle').every(c=>c[3]>0),'raster joins have positive radius');
            let maximum = 0;
            for (const p of h.engine.track.points) {
                Object.assign(h.engine.karts[0], p);
                h.frame();
                maximum = Math.max(maximum, h.calls.length);
                withinBudget(h.calls.length, reference);
                assert(!h.calls.some(c=>c[0]==='fillStyle' && c[2]===.12),'ground texture never resubmitted');
                if(budgetChecks===0) {
                    const length=h.calls.length;
                    h.calls.push(...Array.from({length:800},()=>['fillRect',0,0,1,1]));
                    assert.throws(()=>withinBudget(h.calls.length, reference),{name:'AssertionError'},'inflated actual Graphics recorder fails budget');
                    h.calls.length=length;
                }
                budgetChecks++;
            }
            assert.equal(h.baked.length, baked, 'moving the camera never rebuilds the road');
            render3dFrames(h,maximum,level);
            const previousText=rows.map(row=>row.textContent), previousWrites=rows.map(row=>row.textWrites);
            h.frame(250);
            rows.forEach((row,i)=>assert.equal(row.textWrites-previousWrites[i],Number(row.textContent!==previousText[i]),'only changed HUD text is assigned'));
            assert.deepEqual(h.scene.hud.children, rows, 'running timers update existing HUD rows');
            h.scene.cameraFixed = false;
            h.frame();
            assert.equal(h.baked.length, baked, 'rotating the camera reuses the road');
            const rotation=-h.engine.karts[0].angle-Math.PI/2;
            assert.deepEqual(image.placements.setRotation,[rotation]);
            assert.deepEqual(image.placements.setPosition,[180+((left-player.x)*Math.cos(rotation)-(top-player.y)*Math.sin(rotation))*5,466+((left-player.x)*Math.sin(rotation)+(top-player.y)*Math.cos(rotation))*5]);
            h.scene.view3d=true; h.frame();
            assert.deepEqual(image.placements.setVisible,[false],'road hidden in 3D');
            h.scene.view3d=false;
            h.scene.overviewMode = true;
            h.frame();
            assert.equal(h.baked.length, baked, 'overview reuses the road');
            h.engine.loadLevel(level, 29);
            h.frame();
            assert.equal(h.baked.filter(c => c[0] === 'generateTexture').length, 2, 'new track replaces the raster');
            assert.equal(h.removedTextures.filter(key=>key==='derapage-road').length,removed+1,'old road texture freed');
            console.log(`Graphics circuit ${level + 1}: max ${maximum}, reference ${reference}`);
        } finally { h.cleanup(); }
    }
}
// The complete 96-position sweep is reproducible with measure-derapage-all.js.
// Fast checks retain every circuit’s measured top and 3D maximum witnesses,
// avoiding 30 repeats of the expensive ground-grid sweep in test:node.
async function allCircuitBudgets() {
    const {after}=JSON.parse(readFileSync(new URL('../tests/derapage-graphics-budget.json',import.meta.url),'utf8'));
    assert.equal(after.length,30);
    assert(after.every(row=>row.top<=520 && row.view3d<=800),'all thirty reference budgets obey the absolute ceilings');
    let topMaximum=0, maximum3d=0;
    const h=await mount('derapage','dragon',false);h.session.send('start');
    try {for(const row of after) {
            h.scene.view3d=false;
            // Fresh renderer layers, shared immutable character atlases and DOM ports.
            // Match the standalone sweep's top-before-3D lifecycle exactly.
            h.scene.hud3d?.destroy();h.scene.hud3d=undefined;
            for(const prop of h.scene.props3d) prop.destroy();
            h.scene.props3d=[];h.scene.propCount=0;
            const start=h.baked.length;
            h.engine.loadLevel(row.level-1,28);h.frame();
            const baked=h.baked.length;
            if(h.engine.track.circuit.theme.urban) {
                for(const color of [0xbec5ca,0xf1f5f8,0x647583,0x65717a])
                    assert(h.baked.slice(start).some(c=>c[0]==='lineStyle' && c[2]===color),'rails, posts and paving baked for this circuit');
            }
            const staticColor = row.level===18 ? 0x79c63d : row.level===20 ? 0x613c2e : undefined;
            if (staticColor !== undefined) assert(h.baked.slice(start).some(c=>c[0]==='lineStyle' && c[2]===staticColor),'fixed kart trees are baked');
            for(const index of new Set([0,row.topIndex,95])) {
                Object.assign(h.engine.karts[0],h.engine.track.points[index]);h.frame();
                assert(h.calls.length<=Math.min(520,row.top),`top budget circuit ${row.level}: ${h.calls.length} <= ${row.top}`);
                topMaximum=Math.max(topMaximum,h.calls.length);
                if(staticColor!==undefined) assert(!h.calls.some(c=>c[0]==='lineStyle' && c[2]===staticColor),'fixed kart trees never resubmitted');
                assert(!h.calls.some(c=>c[0]==='lineStyle' && [0xbec5ca,0xf1f5f8,0x647583,0x65717a].includes(c[2])),'static urban geometry never submitted in warm frame');
            }
            assert.equal(h.baked.length,baked,'moving camera reuses texture');
            h.calls.push(...Array.from({length:row.top+1},()=>['fillRect',0,0,1,1]));
            assert.throws(()=>assert(h.calls.length<=Math.min(520,row.top)),{name:'AssertionError'},'inflated actual top recorder rejected on every circuit');
            h.scene.view3d=true;
            for(const index of row.view3dIndex>0 ? [row.view3dIndex-1,row.view3dIndex] : [0]) {
                Object.assign(h.engine.karts[0],h.engine.track.points[index]);h.frame();
            }
            assert(h.calls.length<=Math.min(800,row.view3d),`3D budget circuit ${row.level}: ${h.calls.length} <= ${row.view3d}`);
            maximum3d=Math.max(maximum3d,h.calls.length);
            h.calls.push(...Array.from({length:row.view3d+1},()=>['fillRect',0,0,1,1]));
            assert.throws(()=>assert(h.calls.length<=Math.min(800,row.view3d)),{name:'AssertionError'},'inflated actual 3D recorder rejected on every circuit');
    }} finally {h.cleanup();}
    assert.equal(topMaximum,Math.max(...after.map(r=>r.top)),'budget covers maximum of all thirty circuits');
    assert.equal(maximum3d,Math.max(...after.map(r=>r.view3d)),'3D maximum covers all thirty circuits');
    assert.equal(graphicsFps(400),11);
    assert.equal(graphicsFps(1850),4);
    assert.equal(graphicsFps(990),8);
    console.log(`All thirty Graphics budgets: top ${topMaximum}, 3D ${maximum3d}`);
}
async function clockChecks() {
    let reference;
    for (const fps of [4, 10, 60]) {
        const h = await mount('derapage', 'dragon');
        h.session.send('start');
        try {
            h.scene.draw = () => {};
            h.engine.loadLevel(0, 28);
            h.scene.previousFrame = undefined;
            h.scene.update(0, 1000 / 60);
            for (let frame = 1; frame <= fps * 10; frame++) h.scene.update(frame * 1000 / fps, 1000 / 60);
            assert(Math.abs(h.engine.time - 10000) <= 200, `${fps} fps: ten real seconds advance ten race seconds`);
            assert.equal(h.engine.frames, 600, 'same number of deterministic fixed steps');
            const state = h.engine.snapshot();
            if (reference) assert.deepEqual(state, reference, 'cadence leaves deterministic engine state unchanged');
            else reference = state;
        } finally { h.cleanup(); }
    }
    const h = await mount('derapage', 'dragon');
        h.session.send('start');
    try {
        h.scene.draw = () => {};
        h.scene.previousFrame = undefined;
        h.scene.update(0, 16);
        const before = h.engine.time;
        h.scene.update(2000, 16);
        assert(Math.abs(h.engine.time - before - 250) < 1e-8, 'hidden-tab interval is capped at 250 ms');
        assert.equal(h.engine.frames, 15);
        h.scene.updatePaused();
        h.scene.update(10000, 16);
        assert(Math.abs(h.engine.time - before - 250) < 1e-8, 'resume establishes a fresh timestamp');
        h.scene.view3d = true;
        for (let frame = 1; frame <= 8; frame++) h.scene.update(10000 + frame * 250, 16);
        assert.equal(h.scene.cadence.elapsed, 2000, '3D cadence uses the same true intervals');
        assert.equal(h.scene.cadence.fps, 4, '3D cadence ignores smoothed delta');
        for(let frame=9;frame<=20;frame++) h.scene.update(10000+frame*250,16);
        assert.equal(h.scene.cadence.fallback,true,'four real presentations per second cause fallback after five seconds');
        assert.equal(h.scene.active3d,false);
        // Very long frames remain real intervals for cadence, even though physics caps them.
        h.scene.cadence=new (await import('../src/games/derapage/view3d.ts')).Cadence();
        h.scene.update(16000,16);
        assert.equal(h.scene.cadence.elapsed,1000,'cadence is not capped with simulation');
    } finally { h.cleanup(); }
}
await renderBudget();
assert.equal(budgetChecks,384,'all real frame counts submitted');
assert.throws(() => withinBudget(521, 591), { name: 'AssertionError' }, 'negative budget boundary');
await clockChecks();
await allCircuitBudgets();
if(process.argv.includes('--audit-mutations')) {
const { mutationModule } = await import('./mutation-module.js');
// Execute actual scene mutations: an inflated render and a return to smoothed time.
for (const [name, before, after, check] of [
    ['road redrawn each frame', 'this.road?.draw(t,project,scale,this.overviewMode ? 0 : angle);', 'this.road?.destroy(); this.road?.draw(t,project,scale,this.overviewMode ? 0 : angle);', renderBudget],
    ['smoothed simulation delta', 'this.tick(this.manual ? 0 : delta);', 'this.tick(this.manual ? 0 : Number(arguments[1]));', clockChecks],
    ['uncapped hidden interval', 'Math.min(250, elapsed)', 'elapsed', clockChecks],
]) {
    useSceneModule((await mutationModule('../src/games/derapage/scene.ts', before, after, { phaser: 'phaser' })).module);
    await assert.rejects(check(), { name: 'AssertionError' }, name);
    console.log(`Mutation rejected: ${name}`);
}
for(const [name,file,before,after] of [
    ['jointures_raster_sans_disques','road','}), 5);','}), 0);'],
    ['origine_texture_centree','road','.setOrigin(0, 0);','.setOrigin(0.5, 0.5);'],
    ['route_retrecie','road','.setScale(scale / 5)','.setScale(scale / 10)'],
    ['rotation_route_figee','road','.setRotation(rotation)','.setRotation(0)'],
    ['route_decalee','road','.setPosition(origin.x, origin.y)','.setPosition(origin.x + 100, origin.y)'],
    ['route_visible_en_3d','road','hide(): void { this.image?.setVisible(false); }','hide(): void { this.image?.setVisible(true); }'],
    ['texture_non_liberee','road','if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);','this.scene.textures.exists(this.key);'],
    ['hud_reecrit_sans_changement','scene','if (changed) span.textContent = line;','span.textContent = line;'],
]) {
    const mutant=await mutationModule(`../src/games/derapage/${file}.ts`,before,after,{phaser:'phaser'});
    useSceneModule(file==='scene' ? mutant.module : (await mutationModule('../src/games/derapage/scene.ts',"from './road'","from './road'",{'./road':mutant.url,phaser:'phaser'})).module);
    await assert.rejects(renderBudget(),{name:'AssertionError'},name);
    console.log(`Mutation rejected: ${name}`);
}
useSceneModule(undefined);
// Exercise the validator mutation too: zeroing the actual counter must make the
// deliberately inflated real recorder survive, and therefore fail the negative test.
if (!process.env.OPENCADE_BUDGET_MUTANT) {
    const {readFileSync,writeFileSync,unlinkSync}=await import('node:fs');
    const {spawnSync}=await import('node:child_process');
    const file=`scripts/.cadence-budget-${process.pid}.js`;
    const source=readFileSync(import.meta.filename,'utf8');
    const anchor='withinBudget(h.calls.length, reference)';
    assert.equal(source.split(anchor).length,4); // actual count, inflated count and this literal
    writeFileSync(file,source.replaceAll(anchor,'withinBudget(0, reference)'));
    try {
        const result=spawnSync(process.execPath,['--import','./scripts/ts-loader.js',file],{encoding:'utf8',env:{...process.env,OPENCADE_BUDGET_MUTANT:'1'},timeout:30000});
        assert.equal(result.status,1);
        assert.match(result.stderr,/Missing expected exception.*inflated actual Graphics recorder/s);
        console.log('Mutation rejected: budget_debranche_du_compte_reel');
    } finally {unlinkSync(file);}
}

}
