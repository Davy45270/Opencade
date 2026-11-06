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
// Z38: on the mini-map the player is an arrow along its heading, larger than the rival dots,
// and the bonus in hand is shown as its emblem, in both views.
async function miniMapAndHeldBonus() {
    const { bonusEmblem } = await import('../src/characters/arcade-art.ts');
    const h = await mount('derapage', 'dragon', false); h.session.send('start');
    try {
        h.engine.loadLevel(0, 28);
        for (const view3d of [false, true]) {
            h.scene.view3d = view3d; const p = h.engine.karts[0];
            for (const angle of [0, 1.2, -2.5]) {
                p.angle = angle; p.item = null; h.frame();
                const mark = h.scene.miniPlayer;
                assert(mark && mark.size >= 7, 'player marker on the mini-map, larger than the rival dots (2.5 px)');
                const tri = h.calls.filter(c => c[0] === 'fillTriangle').at(-1);
                assert(tri, 'player marker is drawn as an arrow');
                const heading = Math.atan2(tri[2] - mark.y, tri[1] - mark.x);
                assert(Math.abs(Math.atan2(Math.sin(heading - angle), Math.cos(heading - angle))) < 1e-6, 'arrow points along the kart heading');
                assert.equal(h.scene.heldBonus, null, 'no emblem without a bonus');
            }
            for (const item of ['turbo', 'ressort', 'flaque', 'bulle']) {
                p.item = item; h.frame();
                const kind = bonusEmblem(h.hero.id, item);
                assert.equal(h.scene.heldBonus, kind, `bonus in hand shown (${item})`);
                assert(h.images.some(i => i.placements.setVisible?.at(-1) && i.texture.key.includes(`emblem-${kind}`)), `emblem drawn for ${item}`);
                const box = h.calls.filter(c => c[0] === 'fillRoundedRect' && c[3] === 44 && c[4] === 44).at(-1);
                assert(box && box[2] >= 96 && box[1] + 44 <= 360, 'bonus frame inside the canvas, below the HUD band where the DOM chronos sit');
            }
            p.item = null; h.frame(); assert.equal(h.scene.heldBonus, null, 'emblem leaves with the bonus');
        }
    } finally { h.cleanup(); }
    console.log('Mini-map arrow and bonus in hand: both views');
}
// Z43: David's drawn bonuses. Once their chunk is loaded, the bonus in hand shows the same icon for every mascot
// (comet, tornado, cloud, bubble), the item box is the capsule of mischief, and the puddle is the prankster cloud,
// in the top view and in the 3D view.
async function drawnBonuses() {
    const keys = ['icon_turbo', 'icon_ressort', 'icon_flaque', 'icon_bulle', 'icon_turbo_small', 'icon_ressort_small', 'icon_flaque_small', 'icon_bulle_small', 'capsule_top', 'capsule', 'capsule_far', 'cloud_top'];
    const shown = (h, key) => h.images.some(i => i.placements.setVisible?.at(-1) && i.texture.key === `derapage-bonus-${key}`);
    const held = {};
    for (const id of ['dragon', 'singe', 'licorne']) {
        const h = await mount('derapage', id, false); h.session.send('start');
        try {
            for (const key of keys) h.textures.add(`derapage-bonus-${key}`);
            h.engine.loadLevel(0, 28);
            const p = h.engine.karts[0], crate = h.engine.crates[0];
            assert(crate, 'circuit 1 has item boxes');
            for (const view3d of [false, true]) {
                h.scene.view3d = view3d;
                // Behind the box, facing it: visible in both views.
                Object.assign(p, { x: crate.x - Math.cos(.35) * 6, y: crate.y - Math.sin(.35) * 6, angle: .35, vx: 0, vy: 0 });
                for (const item of ['turbo', 'ressort', 'flaque', 'bulle']) {
                    p.item = item; h.frame();
                    assert.equal(h.scene.heldBonus, `icon_${item}`, `${id}: the bonus in hand is the common drawn icon (${item}, ${view3d ? '3D' : 'top'})`);
                    assert(shown(h, `icon_${item}`), `${id}: drawn icon of ${item} on screen`);
                    (held[item] ??= new Set()).add(h.scene.heldBonus);
                }
                p.item = null; h.frame();
                assert(shown(h, view3d ? 'capsule' : 'capsule_top') || (view3d && shown(h, 'capsule_far')), `${id}: the item box is the capsule of mischief (${view3d ? '3D' : 'top'})`);
                h.engine.puddles.push({ x: crate.x, y: crate.y, owner: 1, remaining: 1000 }); h.engine.crates.forEach(c => { c.cooldown = 5000; }); h.frame();
                assert(shown(h, view3d ? 'icon_flaque' : 'cloud_top') || (view3d && shown(h, 'icon_flaque_small')), `${id}: the puddle is the prankster cloud (${view3d ? '3D' : 'top'})`);
                h.engine.puddles.length = 0; h.engine.crates.forEach(c => { c.cooldown = 0; });
            }
        } finally { h.cleanup(); }
    }
    for (const [item, kinds] of Object.entries(held)) assert.equal(kinds.size, 1, `one icon for ${item} whatever the mascot`);
    console.log('Drawn bonuses: common icons, capsule box, cloud puddle, both views');
}
// Z44: David's drawn trees. Once their chunk is loaded, the trees are his drawings, the essences follow the ambiance
// of the circuit (palm on the coast, fir in the mountains...), top view from above and side view as a 3D panel,
// and the vector tree is neither baked into the road nor drawn as a 3D panel.
async function drawnTreesInScene() {
    const { TREE_SPRITES, drawnTrees, ambiance } = await import('../src/games/derapage/tree-sprites.ts');
    // Circuit index -> essences expected: meadows, Ardennes, coast, frozen mountains, Feuilles Folles, Bambou Express (3D).
    const cases = [[5, ['feuillu', 'cerisier']], [16, ['sapin', 'feuillu']], [27, ['palmier']], [28, ['sapin']], [19, ['erable']], [17, ['bambou']]];
    const shownTrees = h => h.images.filter(i => i.placements.setVisible?.at(-1) && i.texture.key.startsWith('derapage-tree-')).map(i => i.texture.key.slice(14));
    const h = await mount('derapage', 'dragon', false); h.session.send('start');
    try {
        for (const key of Object.keys(TREE_SPRITES)) h.textures.add(`derapage-tree-${key}`);
        for (const [level, expected] of cases) {
            h.engine.loadLevel(level, 28);
            const t = h.engine.track;
            assert.deepEqual([...ambiance(t)].sort(), [...expected].sort(), `circuit ${level + 1}: essences of its ambiance`);
            const trees = drawnTrees(t);
            assert(trees.length > 0, `circuit ${level + 1} has trees`);
            const tree = trees[Math.floor(trees.length / 2)];
            for (const view3d of [false, true]) {
                h.scene.view3d = view3d;
                h.baked.length = 0;
                // 14 units before the tree, facing it: in view from above and in front of the camera in 3D.
                Object.assign(h.engine.karts[0], { x: tree.x - 14, y: tree.y, angle: 0, vx: 0, vy: 0 });
                h.frame();
                const keys = shownTrees(h), essences = new Set(keys.map(k => k.replace(/_(side|side_far|top)$/, '')));
                const topless = expected.every(e => e === 'bambou');
                if (!view3d && topless) { assert.equal(keys.length, 0, `circuit ${level + 1}: no top view drawn for bamboo, the vector bamboo stays`); continue; }
                assert(keys.length > 0, `circuit ${level + 1}: the trees are David's drawings (${view3d ? '3D' : 'top'})`);
                assert(keys.every(k => view3d ? /_side(_far)?$/.test(k) : k.endsWith('_top')), `circuit ${level + 1}: ${view3d ? 'side views in 3D' : 'top views from above'} (${keys})`);
                assert([...essences].every(e => expected.includes(e)), `circuit ${level + 1}: only the essences of its ambiance (${[...essences]})`);
                if (view3d) assert(!h.images.some(i => i.placements.setVisible?.at(-1) && /roadside-(tree|fir)$/.test(i.texture.key)), `circuit ${level + 1}: no vector tree panel in 3D`);
            }
            h.scene.view3d = false;
        }
        // Without the chunk, the vector trees stay: the road is baked with them and no drawn tree is shown.
        h.baked.length = 0; h.engine.loadLevel(16, 28); h.frame();
        const bakedDrawn = h.baked.length;
        for (const key of Object.keys(TREE_SPRITES)) h.textures.delete(`derapage-tree-${key}`);
        h.baked.length = 0; h.engine.loadLevel(16, 28); h.frame();
        assert.equal(shownTrees(h).length, 0, 'vector fallback until the chunk arrives');
        assert(h.baked.length > bakedDrawn, `the vector trees are baked only without the chunk (${h.baked.length} > ${bakedDrawn})`);
    } finally { h.cleanup(); }
    console.log('Drawn trees: essences by ambiance, top view from above, side panels in 3D, vector fallback');
}
// Z45: David's horizons in the 3D sky. One per cup; once its chunk is loaded the flat blue sky is covered by two
// abutting copies of the horizon, 116 px high, that scroll with the heading of the camera (two copies per turn).
async function horizonSky() {
    const cases = [[1, 'urbaine'], [5, 'rapide'], [8, 'technique'], [12, 'ovales'], [16, 'nature'], [20, 'quais'], [24, 'falaises'], [28, 'slalom'], [17, 'bambou'], [19, 'feuilles'], [26, 'volcan']];
    const sky = h => h.images.filter(i => i.placements.setVisible?.at(-1) && i.texture.key.startsWith('derapage-horizon-'));
    const left = h => Math.min(...sky(h).map(i => i.placements.setPosition[0]));
    const h = await mount('derapage', 'dragon', false); h.session.send('start');
    try {
        for (const [, key] of cases) h.textures.add(`derapage-horizon-${key}`);
        h.scene.view3d = true;
        for (const [level, key] of cases) {
            h.engine.loadLevel(level, 28); h.frame();
            const s = sky(h);
            assert.equal(s.length, 2, `circuit ${level + 1}: the 3D sky draws the horizon of its cup (${key}), two copies`);
            assert(s.every(i => i.texture.key === `derapage-horizon-${key}`), `circuit ${level + 1}: horizon ${key} (${s.map(i => i.texture.key)})`);
            const [w, height] = s[0].placements.setDisplaySize, xs = s.map(i => i.placements.setPosition[0]).sort((a, b) => a - b);
            assert.equal(height, 116, 'the horizon fills the sky band, 116 px high');
            assert(s.every(i => i.placements.setPosition[1] === 96 && i.placements.setOrigin?.[0] === 0 && i.placements.setOrigin?.[1] === 0), 'from the top of the sky band');
            assert.equal(xs[1] - xs[0], w, 'the two copies abut: the join is seamless');
            assert(xs[0] <= 0 && xs[0] + 2 * w >= 360, `the sky is covered from edge to edge (${xs}, ${w})`);
            assert(!h.calls.some(c => c[0] === 'fillStyle' && c[1] === 0x8ac7dd), 'no flat sky drawn under the horizon');
        }
        // It scrolls with the heading: 0.1 rad to the right moves it left by 0.1 × turn / 2π; a full turn shows the same sky.
        h.engine.loadLevel(5, 28);
        const p = h.engine.karts[0], at = angle => { Object.assign(p, { angle, vx: 0, vy: 0 }); h.frame(); return left(h); };
        const w = 928, a = at(.3), b = at(.4), shift = ((a - b) % w + w) % w;
        assert(Math.abs(shift - .1 * 2 * w / (2 * Math.PI)) < 1e-6, `the sky scrolls with the heading (${shift} px for 0.1 rad)`);
        assert(Math.abs(at(.3 + 2 * Math.PI) - a) < 1e-6, 'a full turn shows the same sky');
        // Along a whole turn the join crosses the screen and the copies stay abutting.
        for (let i = 0; i < 64; i++) { at(i * Math.PI / 32); const xs = sky(h).map(s => s.placements.setPosition[0]).sort((m, n) => m - n); assert(xs[0] <= 0 && xs[1] - xs[0] === w && xs[0] + 2 * w >= 360, `turn step ${i}`); }
        // Top view: no sky image. Without the chunk: the flat sky stays.
        h.scene.view3d = false; h.frame(); assert.equal(sky(h).length, 0, 'no horizon in the top view');
        h.scene.view3d = true; for (const [, key] of cases) h.textures.delete(`derapage-horizon-${key}`); h.frame();
        assert.equal(sky(h).length, 0, 'flat sky until the chunk arrives');
        assert(h.calls.some(c => c[0] === 'fillStyle' && c[1] === 0x8ac7dd), 'the flat blue sky is the fallback');
    } finally { h.cleanup(); }
    console.log('Horizons: one per cup in the 3D sky, seamless, scrolling with the heading, flat sky fallback');
}
// Z46: David's trees at the scale of the karts (his feedback: "they look like flowers"). With the drawn karts and
// trees loaded: in 3D, at equal distance, a tree stands 3 to 4 kart heights tall; from above, a crown is 2.5 to 3
// kart lengths across. Neither ever covers the road: the crown from above and the 3D panel stay off the track.
async function treeSizes() {
    const { TREE_SPRITES, drawnTrees } = await import('../src/games/derapage/tree-sprites.ts');
    const { KART_SPRITES } = await import('../src/games/derapage/kart-sprites.ts');
    const { nearest } = await import('../src/engines/derapage/track.ts');
    const visible = (h, prefix) => h.images.filter(i => i.placements.setVisible?.at(-1) && i.texture.key.startsWith(prefix));
    const h = await mount('derapage', 'dragon', false); h.session.send('start');
    try {
        for (const key of Object.keys(TREE_SPRITES)) h.textures.add(`derapage-tree-${key}`);
        for (const key of Object.keys(KART_SPRITES)) h.textures.add(`derapage-kart-${key}`);
        const ratios = { side: [], top: [] };
        for (const level of [5, 16, 27, 28, 19]) {
            h.engine.loadLevel(level, 28);
            const t = h.engine.track, trees = drawnTrees(t).filter(tree => !tree.kart || t.circuit.theme.kart === 'autumn');
            const tree = trees[Math.floor(trees.length / 2)];
            // 3D: a rival kart beside the tree, at the same depth, the player 24 units behind both.
            h.scene.view3d = true;
            Object.assign(h.engine.karts[0], { x: tree.x - 24, y: tree.y, angle: 0, vx: 0, vy: 0 });
            Object.assign(h.engine.karts[1], { x: tree.x, y: tree.y + 1, angle: 0, vx: 0, vy: 0 });
            h.frame();
            // The rival is the farther kart (higher on screen); the panel is the tree drawn closest to it.
            const rival = visible(h, 'derapage-kart-').reduce((m, k) => k.placements.setPosition[1] < m.placements.setPosition[1] ? k : m);
            const panel = visible(h, 'derapage-tree-').reduce((m, i) => !m || Math.abs(i.placements.setPosition[0] - rival.placements.setPosition[0]) < Math.abs(m.placements.setPosition[0] - rival.placements.setPosition[0]) ? i : m, null);
            assert(panel && rival, `circuit ${level + 1}: a tree panel and a kart at the same depth`);
            ratios.side.push(panel.placements.setDisplaySize[1] / rival.placements.setDisplaySize[1]);
            // Top view: the crown against the player's kart, nose to tail.
            h.scene.view3d = false;
            Object.assign(h.engine.karts[1], { x: tree.x + 400, y: tree.y });
            Object.assign(h.engine.karts[0], { x: tree.x - 14, y: tree.y });
            h.frame();
            const crown = visible(h, 'derapage-tree-').find(i => i.texture.key.endsWith('_top'));
            const kart = visible(h, 'derapage-kart-').find(i => i.texture.key.endsWith('_top'));
            assert(crown && kart, `circuit ${level + 1}: a crown and the player's kart from above`);
            ratios.top.push(crown.placements.setDisplaySize[0] / kart.placements.setDisplaySize[1]);
        }
        console.log(`Tree sizes measured: 3D ${ratios.side.map(r => r.toFixed(2))} kart heights, top ${ratios.top.map(r => r.toFixed(2))} kart lengths`);
        const range = (list, low, high, name) => assert(list.every(r => r >= low && r <= high), `${name}: ${list.map(r => r.toFixed(2))} within [${low}, ${high}]`);
        range(ratios.side, 3, 4, 'tree height / kart height at equal depth (3D)');
        range(ratios.top, 2.5, 3, 'crown / kart length (top view)');
        // Off the road: every drawn crown (world diameter from treeCrown) clears the edge of the nearest road section.
        const { treeCrown } = await import('../src/games/derapage/tree-sprites.ts');
        for (let level = 0; level < 30; level++) {
            h.engine.loadLevel(level, 28);
            const t = h.engine.track;
            for (const q of drawnTrees(t)) {
                const n = nearest(t, q);
                assert(n.distance >= (t.widths[n.index] ?? 28) / 2 + treeCrown(q) / 2, `circuit ${level + 1}: crown off the road (${n.distance.toFixed(1)} < ${((t.widths[n.index] ?? 28) / 2 + treeCrown(q) / 2).toFixed(1)})`);
            }
        }
        // Driving on the centre line in 3D, no tree panel covers the player's kart, nor the road 12, 18 or 24 units
        // ahead; witness: a tree put on the road 18 units ahead is caught.
        const { projectPoint, FAR } = await import('../src/games/derapage/view3d.ts');
        const { at } = await import('../src/engines/derapage/track.ts');
        const look = (t, i) => {
            const p = t.points[i], q = t.points[(i + 1) % 96];
            Object.assign(h.engine.karts[0], { x: p.x, y: p.y, angle: Math.atan2(q.y - p.y, q.x - p.x), vx: 0, vy: 0 });
            for (const k of h.engine.karts.slice(1)) Object.assign(k, { x: 9999, y: 9999 });
            h.frame();
            const panels = visible(h, 'derapage-tree-').map(im => { const [x, y] = im.placements.setPosition, [w, ht] = im.placements.setDisplaySize; return { x0: x - w / 2, x1: x + w / 2, y0: y - ht / 2, y1: y + ht / 2, depth: im.placements.setDepth[0] }; });
            const kart = visible(h, 'derapage-kart-')[0], [kx, ky] = kart.placements.setPosition, [kw, kh] = kart.placements.setDisplaySize;
            if (panels.some(r => r.depth > kart.placements.setDepth[0] && r.x1 > kx - kw / 2 && r.x0 < kx + kw / 2 && r.y1 > ky - kh && r.y0 < ky)) return 'kart';
            const camera = { x: p.x, y: p.y, angle: h.engine.karts[0].angle };
            for (const ahead of [12, 18, 24]) {
                const a = projectPoint(at(t, t.distances[i] + ahead), camera);
                if (a && panels.some(r => r.depth >= FAR - a.depth + 2 - 1e-6 && r.x0 < a.x && r.x1 > a.x && r.y0 < a.y && r.y1 > a.y)) return `road ${ahead} ahead`;
            }
            return null;
        };
        h.scene.view3d = true;
        for (const level of [5, 16, 27, 28, 19]) {
            h.engine.loadLevel(level, 28);
            for (let i = 0; i < 96; i++) { const hidden = look(h.engine.track, i); assert.equal(hidden, null, `circuit ${level + 1}, position ${i}: a tree hides the ${hidden}`); }
        }
        h.engine.loadLevel(16, 28);
        const t16 = h.engine.track, w = at(t16, t16.distances[10] + 18); t16.trees.push({ x: w.x, y: w.y, radius: 2 });
        assert.match(look(t16, 10) ?? '', /^road /, 'witness: a tree on the road ahead is caught');
        console.log(`Tree sizes: 3D ${ratios.side.map(r => r.toFixed(2))} kart heights, top ${ratios.top.map(r => r.toFixed(2))} kart lengths`);
    } finally { h.cleanup(); }
}
await renderBudget();
assert.equal(budgetChecks,384,'all real frame counts submitted');
assert.throws(() => withinBudget(521, 591), { name: 'AssertionError' }, 'negative budget boundary');
await clockChecks();
await allCircuitBudgets();
await miniMapAndHeldBonus();
await drawnBonuses();
await drawnTreesInScene();
await horizonSky();
await treeSizes();
if(process.argv.includes('--audit-mutations')) {
const { mutationModule } = await import('./mutation-module.js');
// Execute actual scene mutations: an inflated render and a return to smoothed time.
for (const [name, before, after, check] of [
    ['road redrawn each frame', 'this.road?.draw(t,project,scale,this.overviewMode ? 0 : angle,treesReady);', 'this.road?.destroy(); this.road?.draw(t,project,scale,this.overviewMode ? 0 : angle,treesReady);', renderBudget],
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
